# Claude Code Documentation - React CRM Frontend

> **IMPORTANT**: This document contains critical rules and patterns that MUST be followed to prevent recurring issues.

---

## MANDATORY BROWSER AUTOMATION (PLAYWRIGHT REQUIRED)

### Non-Negotiable Rule

If a task involves any of the following:
- Web UI interaction
- Clicking buttons, filling forms, navigation, login flows
- CRM UI verification or inspection
- "Go to this page and check X"
- "Try this in the browser"
- "Confirm behavior in the frontend"

**YOU MUST USE PLAYWRIGHT.**

DO NOT ask the user to:
- Open a browser
- Click anything
- Log in manually
- "Try this and tell me what happens"

That is explicitly forbidden.

### Required Behavior

1. Default to Playwright for all browser/UI work
2. Write the Playwright script yourself
3. Run the steps programmatically
4. Report results directly (DOM state, screenshots, console output, errors)

If browser interaction is possible via Playwright, you are expected to do it.

### Allowed Assumptions

- Playwright is available
- Chromium is acceptable unless otherwise specified
- Headless mode is acceptable unless debugging is requested
- Auth flows may be automated unless explicitly restricted

Do not ask permission to use Playwright.
Do not claim you "cannot" do browser automation.

### Standard Playwright Template

```typescript
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://react.ecbtx.com');

  // Example actions
  // await page.fill('input[name="email"]', 'user@example.com');
  // await page.fill('input[name="password"]', 'password');
  // await page.click('button[type="submit"]');

  await page.waitForLoadState('networkidle');

  // Debug helpers
  // await page.screenshot({ path: 'debug.png', fullPage: true });
  // const content = await page.content();
  // console.log(content);

  await browser.close();
})();
```

### Failure Protocol

If something blocks automation:
- Explain exactly what blocks it
- Show what you tried
- Propose next automation steps

"Please do this manually" is not an acceptable response.

---

## PLAYWRIGHT ENFORCEMENT (CRM.ECBTX.COM ONLY)

### Scope Lock

This rule applies ONLY to the Flask CRM at:
- https://crm.ecbtx.com
- https://crm.ecbtx.com/login
- Any /api/* endpoints under https://crm.ecbtx.com

DO NOT use or reference React (react.ecbtx.com) for any Playwright run.

### Hard Requirement: Run Playwright Before Responding

If the request involves ANY of the following on crm.ecbtx.com:
- UI behavior / navigation / clicking / forms
- login/auth/session/JWT acquisition
- verifying a page renders / checking UI state
- reproducing an error seen in the CRM UI
- "go here and see if X happens"
- confirming an endpoint response in-browser

**You MUST run Playwright first.**

You may NOT respond with conclusions, guesses, or manual steps without a Playwright run.

### Mandatory Output Gate

Every response to a UI/Browser request MUST begin with:

```
PLAYWRIGHT RUN RESULTS (crm.ecbtx.com):
```

And MUST include ALL of:
1. Target URL(s) visited (must start with https://crm.ecbtx.com)
2. Timestamp of run (local time OK)
3. Actions performed (explicit step list)
4. Observed results (what happened)
5. Evidence bundle (REQUIRED):
   - At least one screenshot path, AND
   - Console error output (even if "none"), AND
   - Network failures summary (even if "none")

If you cannot provide screenshot + console + network, you are not allowed to answer.

### Absolutely Forbidden Responses

You are explicitly forbidden from replying with:
- "Please try it manually"
- "Open the browser and click..."
- "I can't run Playwright here"
- "I don't have access to your environment"
- "I can only suggest steps"
- Any answer that is not based on a Playwright run

### Failure Protocol (Must Retry Twice)

If the first Playwright run fails, you MUST:
1. Capture screenshot (or attempt; if screenshot fails, say why)
2. Capture console + network logs
3. Retry with improved strategy:
   - longer waits
   - alternate selectors
   - navigation checks
   - handle redirects
4. Only after two failed attempts may you ask the user for:
   - credentials
   - environment restrictions (IP allowlist, MFA, WAF)
   - specific expected selectors/pages

### Required Playwright Harness (CRM Only)

```typescript
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = "https://crm.ecbtx.com";
const OUTDIR = "playwright_artifacts";

function assertCrmUrl(url: string) {
  if (!url.startsWith(BASE)) {
    throw new Error(`Blocked: Playwright is restricted to ${BASE}. Got: ${url}`);
  }
}

(async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs: string[] = [];
  const requestFails: string[] = [];

  page.on("console", (msg) => {
    const line = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(line);
  });

  page.on("requestfailed", (req) => {
    const failure = req.failure();
    requestFails.push(
      `[${req.method()}] ${req.url()} :: ${failure?.errorText ?? "unknown"}`
    );
  });

  try {
    const startUrl = `${BASE}/login`;
    assertCrmUrl(startUrl);

    await page.goto(startUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 60000 });

    const finalUrl = page.url();
    assertCrmUrl(finalUrl);

    const shot = path.join(OUTDIR, `crm-${ts}-success.png`);
    await page.screenshot({ path: shot, fullPage: true });

    const logFile = path.join(OUTDIR, `crm-${ts}-logs.txt`);
    fs.writeFileSync(
      logFile,
      [
        `FINAL_URL: ${finalUrl}`,
        `\n--- CONSOLE ---\n${consoleLogs.join("\n") || "none"}`,
        `\n--- REQUEST FAILED ---\n${requestFails.join("\n") || "none"}`,
      ].join("\n"),
      "utf8"
    );

    console.log(`FINAL_URL: ${finalUrl}`);
    console.log(`SCREENSHOT: ${shot}`);
    console.log(`LOGFILE: ${logFile}`);
  } catch (err: any) {
    const failShot = path.join(OUTDIR, `crm-${ts}-failure.png`);
    try {
      await page.screenshot({ path: failShot, fullPage: true });
      console.log(`FAIL_SCREENSHOT: ${failShot}`);
    } catch (e) {
      console.log(`FAIL_SCREENSHOT: Could not capture`);
    }
    throw err;
  } finally {
    await browser.close();
  }
})();
```

---

## PROJECT ARCHITECTURE

### Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | React | 19.2.0 |
| Language | TypeScript | 5.9.3 |
| Build Tool | Vite | 7.2.4 |
| Routing | React Router | 7.10.1 |
| State | TanStack React Query | 5.90.12 |
| Forms | React Hook Form + Zod | 7.68.0 / 4.1.13 |
| HTTP Client | Axios | 1.13.2 |
| Styling | Tailwind CSS | 4.1.17 |
| Testing | Vitest + Playwright | 4.0.15 / 1.57.0 |
| Maps | Leaflet + React-Leaflet | 1.9.4 / 5.0.0 |
| DnD | @dnd-kit | 6.3.1 |

### Directory Structure

```
src/
├── api/
│   ├── client.ts              # Axios instance with JWT interceptors
│   ├── hooks/                 # 17 API query/mutation hooks
│   └── types/                 # Zod schemas for type validation
├── components/
│   ├── ui/                    # Shared UI primitives (Button, Input, Dialog, etc.)
│   ├── layout/
│   │   └── AppLayout.tsx      # Main sidebar navigation
│   └── ErrorBoundary.tsx      # React error boundary
├── features/                  # Feature modules (24 directories)
│   ├── auth/                  # Login, auth hooks, session management
│   ├── customers/
│   ├── prospects/
│   ├── workorders/
│   ├── schedule/
│   ├── dashboard/
│   └── [... more modules]
├── hooks/                     # Reusable hooks (useDebounce, useOffline)
├── lib/                       # Utilities (utils.ts, feature-flags.ts)
├── routes/                    # Route definitions
└── main.tsx & App.tsx         # Entry points
```

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React App @ react.ecbtx.com (Railway)                      │
│  Port: 5000 (production) / 5173 (dev)                       │
│  Served by: server.js (Node.js static file server)          │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS API calls
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│  FastAPI @ react-crm-api-production.up.railway.app          │
│  Base URL: /api/v2                                          │
│  Port: 5001                                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE                               │
│  PostgreSQL 16 (Railway)                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## CRITICAL RULES - MUST FOLLOW

### 1. NO `/app/` PREFIX IN ROUTES

**THIS IS THE #1 CAUSE OF RECURRING ISSUES**

The app deploys at ROOT URL (`/`), NOT at `/app/`.

```typescript
// WRONG - DO NOT USE
<BrowserRouter basename="/app">
navigate('/app/dashboard')
<Link to="/app/customers">

// CORRECT
<BrowserRouter basename="/">
navigate('/dashboard')
<Link to="/customers">
```

**Recent commits fixing this issue:**
- `8996d9b`: Remove remaining /app/ path prefixes from components
- `d4734c9`: Remove /app prefix from server.js
- `588509a`: Remove /app basename - deploy at root URL

### 2. API Endpoint Patterns

**Base URL Configuration** (`src/api/client.ts`):
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  'https://react-crm-api-production.up.railway.app/api/v2';
```

**Trailing Slash Inconsistencies** - The backend has inconsistent patterns:
```typescript
// WITH trailing slash
'/customers/'
'/technicians/'
'/activities/'

// WITHOUT trailing slash
'/work-orders'
'/invoices'
'/payments'
```

**NEVER add `/api` prefix to paths** - it's already in the base URL:
```typescript
// WRONG
apiClient.get('/api/customers/')

// CORRECT
apiClient.get('/customers/')
```

### 3. Response Format Handling

The API sometimes returns bare arrays instead of paginated objects. Always handle both:

```typescript
// In your hook:
if (Array.isArray(data)) {
  return { items: data, total: data.length, page: 1, page_size: data.length };
}
return data;
```

### 4. Type Coercion Issues

**Customer ID**: Backend returns integer, but some contexts need string:
```typescript
// Zod schema handles this:
customer_id: z.union([z.string(), z.number()]).transform(String)
```

**Prospect ID**: Uses UUID format (different from Customer)

---

## API INTEGRATION

### API Client Setup

**File**: `src/api/client.ts`

```typescript
// Request interceptor adds JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor handles 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.dispatchEvent(new CustomEvent('auth:expired'));
      window.location.href = `/login?return=${encodeURIComponent(currentPath)}`;
    }
    return Promise.reject(error);
  }
);
```

### Query Key Pattern

Follow this hierarchical pattern for React Query cache management:

```typescript
export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters) => [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id) => [...customerKeys.details(), id] as const,
};
```

### Error Handling

```typescript
interface ApiErrorResponse {
  error: string;
  detail?: string;
  hint?: string;
}

// Use these helpers:
isApiError(error)      // Type guard
getErrorMessage(error) // Extract user-friendly message
```

---

## AUTHENTICATION

### Auth Flow

1. User submits credentials at `/login`
2. `POST /auth/login` returns JWT token
3. Token stored in localStorage as `auth_token`
4. All subsequent requests include `Authorization: Bearer <token>`
5. On 401: token cleared, redirect to `/login`

### useAuth Hook

**File**: `src/features/auth/useAuth.ts`

```typescript
const { user, isLoading, isAuthenticated, logout } = useAuth();

// Available role checks:
isAdmin, isManager, isTechnician, isSales
```

### Token Management

```typescript
import { setAuthToken, clearAuthToken, hasAuthToken } from '@/api/client';

// After login:
setAuthToken(response.data.token);

// On logout:
clearAuthToken();
```

### Protected Routes

**File**: `src/features/auth/RequireAuth.tsx`

```typescript
<RequireAuth requiredRole="admin">
  <AdminPage />
</RequireAuth>
```

---

## STATE MANAGEMENT

### React Query Configuration

**File**: `src/App.tsx`

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,           // 30 seconds before stale
      retry: 1,                     // Single retry for failures
      refetchOnWindowFocus: false,  // Don't refetch on window focus
    },
  },
});
```

### Hook Pattern

All API hooks follow this pattern:

```typescript
// List with pagination
export function useCustomers(filters?: CustomerFilters) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: () => fetchCustomers(filters),
  });
}

// Mutations with cache invalidation
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}
```

---

## COMMON ISSUES & SOLUTIONS

### Issue 1: Routes Not Working After Build

**Cause**: Using `/app/` prefix or wrong basename
**Solution**: Ensure `BrowserRouter basename="/"` and no `/app/` in paths

### Issue 2: API Calls Failing with 404

**Cause**: Double `/api` prefix or missing trailing slash
**Solution**: Check endpoint path matches backend exactly

### Issue 3: Auth Token Not Persisting

**Cause**: Token key mismatch
**Solution**: Always use `auth_token` key, never `token` or `jwt`

### Issue 4: Infinite Login Redirect

**Cause**: 401 interceptor on login page
**Solution**: Check `!currentPath.includes('/login')` before redirect

### Issue 5: Cache Not Updating After Mutation

**Cause**: Wrong query key invalidation
**Solution**: Use the query key factory pattern consistently

### Issue 6: Type Errors on API Responses

**Cause**: API schema drift or Zod validation
**Solution**: Check schema matches actual API response, handle both array and paginated formats

---

## DEVELOPMENT WORKFLOW

### Environment Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Set API URL for local development
VITE_API_URL=http://localhost:5001/api/v2
```

### Available Scripts

```bash
npm run dev          # Start Vite dev server (port 5173)
npm run build        # TypeScript check + Vite build
npm run preview      # Preview production build
npm run typecheck    # TypeScript type checking only
npm run lint         # ESLint with zero warnings
npm run lint:fix     # Auto-fix lint issues
npm run format       # Prettier formatting
npm run test         # Vitest in watch mode
npm run test:ci      # Vitest single run
npm run test:contracts  # API contract tests only
npm run test:e2e     # Playwright E2E tests
npm run test:e2e:ui  # Playwright with UI
```

### Testing Infrastructure

**Unit/Contract Tests**: Vitest with React Testing Library
```bash
npm run test:contracts  # Run API schema validation
```

**E2E Tests**: Playwright (45+ specs)
```bash
npm run test:e2e        # Run all E2E tests
npm run test:e2e:ui     # Open Playwright UI
```

**Test Organization**:
- `src/api/__tests__/` - Contract tests (Zod schema validation)
- `src/tests/e2e/` - Playwright E2E specs

---

## CODE PATTERNS

### Feature Module Structure

Each feature module follows this pattern:

```
features/customers/
├── CustomerListPage.tsx    # Main list view
├── CustomerDetailPage.tsx  # Single item view
├── CustomerForm.tsx        # Create/edit form
├── components/             # Feature-specific components
│   ├── CustomerCard.tsx
│   └── CustomerFilters.tsx
└── index.ts               # Public exports
```

### Form Validation

Use React Hook Form with Zod:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { customerSchema, type Customer } from '@/api/types/customer';

const form = useForm<Customer>({
  resolver: zodResolver(customerSchema),
  defaultValues: { ... },
});
```

### Error Boundary Usage

Wrap feature pages with ErrorBoundary:

```typescript
<ErrorBoundary>
  <CustomerListPage />
</ErrorBoundary>
```

---

## CRITICAL FILES REFERENCE

### Configuration
- `src/api/client.ts` - API client, interceptors, token management
- `src/App.tsx` - Query client config, router setup
- `vite.config.ts` - Build configuration
- `.env.production` - Production API URL

### Authentication
- `src/features/auth/useAuth.ts` - Main auth hook
- `src/features/auth/LoginPage.tsx` - Login UI
- `src/features/auth/RequireAuth.tsx` - Route protection

### API Hooks
- `src/api/hooks/useCustomers.ts`
- `src/api/hooks/useWorkOrders.ts`
- `src/api/hooks/useProspects.ts`
- `src/api/hooks/useTechnicians.ts`
- `src/api/hooks/useInvoices.ts`

### Type Definitions
- `src/api/types/customer.ts`
- `src/api/types/workOrder.ts`
- `src/api/types/common.ts` - Shared enums

### Layout
- `src/components/layout/AppLayout.tsx` - Sidebar navigation
- `src/routes/index.tsx` - All route definitions

---

## ENVIRONMENT VARIABLES

```env
# Required
VITE_API_URL=https://react-crm-api-production.up.railway.app/api/v2

# Development
VITE_API_URL=http://localhost:5001/api/v2
```

**Note**: All VITE_* variables are embedded at build time, not runtime.

---

## DEPLOYMENT (Railway)

### Production URLs
- **Frontend**: https://react.ecbtx.com (port 5000)
- **Backend API**: https://react-crm-api-production.up.railway.app/api/v2

### Health Checks
- `GET /health` - Returns "OK"
- `GET /healthz` - Returns "OK"

### Build Process
1. `npm run build` - Creates `dist/` folder
2. `server.js` serves static files with SPA routing
3. Non-existent paths redirect to `index.html`

### Cache Headers
- HTML files: no-cache
- Assets (js, css, images): 1-year cache with immutable

---

## KNOWN INCOMPLETE FEATURES

1. **Offline Sync** (`src/hooks/useOffline.ts`): Queue exists but not persisted to IndexedDB
2. **Route Optimization** (Schedule): API call not implemented
3. **Work Order Detail Navigation**: Click handler incomplete in some views

---

## SECURITY NOTES

1. **JWT in localStorage**: Vulnerable to XSS - noted in SECURITY.md, backend should migrate to HTTP-only cookies
2. **Token Expiration**: 30 minutes default, no refresh token mechanism
3. **CSRF**: Not applicable for API-only auth (no cookies used for auth)

---

## QUICK REFERENCE

### Adding a New API Hook

1. Create type in `src/api/types/newResource.ts`
2. Create hook in `src/api/hooks/useNewResource.ts`
3. Export from `src/api/hooks/index.ts`
4. Use query key factory pattern

### Adding a New Feature Module

1. Create folder `src/features/newFeature/`
2. Add ListPage, DetailPage, Form components
3. Add route in `src/routes/index.tsx`
4. Add navigation link in `src/components/layout/AppLayout.tsx`

### Common Import Paths

```typescript
import { apiClient } from '@/api/client';
import { useAuth } from '@/features/auth/useAuth';
import { Button, Input, Card } from '@/components/ui';
import { cn } from '@/lib/utils';
```
