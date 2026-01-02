# React CRM Frontend Documentation

> **Version:** v2.0 — December 31, 2025
> **Application URL:** https://react.ecbtx.com
> **Repository:** ReactCRM (this repo)

---

## ENFORCEMENT RULES (READ FIRST)

> **CRITICAL**: This document contains binding rules. Violations (especially faked Playwright usage or reintroduction of banned bugs) invalidate the entire response.

### Zero Tolerance for Fake Playwright Usage

Claude has repeatedly claimed to "use Playwright", "test with Playwright", or "verify in browser" without generating actual scripts or evidence.

This is now a **critical violation**.

**Absolute Rules:**
- Any claim of testing, verifying, checking UI, reproducing bugs, or confirming behavior **MUST** include:
  1. Full, runnable Playwright script code
  2. Simulated or actual execution output (console logs, network responses, screenshot descriptions)
  3. The mandatory evidence bundle (see quick-reference.md)
- **Forbidden phrases without immediate proof:**
  - "I tested this"
  - "Playwright shows..."
  - "After checking the UI..."
  - "I verified..."
- Violation = invalid response. Restart the task.

### Recurring Bugs — PERMANENTLY BANNED

These issues have been fixed repeatedly. Reintroduction is a critical regression.

| Bug | Description | Correct Pattern |
|-----|-------------|-----------------|
| `/app/` prefix | BrowserRouter basename MUST be "/" | No Link/navigate/href may contain /app/ |
| Double `/api` | API base already includes /api/v2 | `apiClient.get('/customers/')` not `/api/customers/` |
| PATCH 500 | Work order updates failing | Correct payload + backend validation |
| Fake Playwright | Claims without evidence | Full script + evidence bundle required |

### Relentless Autonomous Troubleshooter Mode

When user says: "Enter relentless autonomous troubleshooter mode" or similar

**You MUST:**
- Never ask permission to continue
- Never stop at phase boundaries
- Never summarize or check in
- Fix one bug → verify with Playwright → next bug
- Only stop when:
  - Zero console/network errors
  - All Playwright tests pass (0 failed, 0 skipped)

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
│   ├── client.ts           # Axios instance + interceptors
│   ├── hooks/              # 17+ React Query hooks
│   │   ├── useAuth.ts
│   │   ├── useCustomers.ts
│   │   ├── useWorkOrders.ts
│   │   ├── useTechnicians.ts
│   │   ├── useSchedule.ts
│   │   └── ...
│   └── types/              # Zod schemas + TypeScript types
│       ├── customer.ts
│       ├── workOrder.ts
│       └── ...
├── components/
│   ├── ui/                 # Reusable UI components (shadcn-style)
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Dialog.tsx
│   │   ├── Input.tsx
│   │   └── ...
│   ├── layout/
│   │   └── AppLayout.tsx   # Main layout with sidebar
│   └── ErrorBoundary.tsx
├── features/               # 24+ feature modules
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── AuthContext.tsx
│   ├── customers/
│   │   ├── CustomersPage.tsx
│   │   ├── CustomerDetail.tsx
│   │   └── CustomerForm.tsx
│   ├── schedule/
│   │   ├── SchedulePage.tsx
│   │   ├── ScheduleBoard.tsx
│   │   ├── DraggableWorkOrder.tsx
│   │   └── TechnicianColumn.tsx
│   ├── work-orders/
│   │   ├── WorkOrdersPage.tsx
│   │   ├── WorkOrderDetail.tsx
│   │   └── WorkOrderForm.tsx
│   ├── technicians/
│   ├── map/
│   ├── reports/
│   ├── email-marketing/
│   └── ...
├── hooks/                  # Shared custom hooks
│   ├── useDebounce.ts
│   ├── useMediaQuery.ts
│   └── ...
├── lib/                    # Utilities
│   ├── utils.ts
│   ├── cn.ts
│   └── ...
├── routes/                 # Route definitions
│   └── index.tsx
├── main.tsx               # Entry point
└── App.tsx                # Root component
```

### Deployment

| Environment | URL |
|-------------|-----|
| Production Frontend | https://react.ecbtx.com |
| Production API | https://react-crm-api-production.up.railway.app/api/v2 |
| Local Dev | http://localhost:5173 |

---

## CRITICAL RULES

### 1. NO `/app/` PREFIX IN ROUTES

```tsx
// CORRECT
<BrowserRouter basename="/">
<Link to="/customers">Customers</Link>
navigate('/schedule')

// WRONG — BANNED
<BrowserRouter basename="/app">
<Link to="/app/customers">
navigate('/app/schedule')
```

### 2. API Base URL Handling

The environment variable `VITE_API_URL` already includes `/api/v2`. Never add `/api` manually.

```typescript
// CORRECT
apiClient.get('/customers/')
apiClient.patch('/work-orders/123', data)

// WRONG — BANNED
apiClient.get('/api/customers/')
apiClient.patch('/api/v2/work-orders/123', data)
```

### 3. Handle Both Array and Paginated Responses

```typescript
// API may return array or paginated object
const response = await apiClient.get('/customers/');
const items = Array.isArray(response.data)
  ? response.data
  : response.data.items;
```

### 4. Customer ID Coercion

```typescript
// Zod schema with transform
const CustomerSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  // ...
});
```

---

## AUTHENTICATION

### Token Storage

```typescript
// Token stored in localStorage
const token = localStorage.getItem('auth_token');

// Set on login
localStorage.setItem('auth_token', response.data.access_token);

// Clear on logout
localStorage.removeItem('auth_token');
```

### Axios Interceptor

```typescript
// src/api/client.ts
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## ENVIRONMENT VARIABLES

```env
# .env.local (development)
VITE_API_URL=http://localhost:5001/api/v2

# .env.production
VITE_API_URL=https://react-crm-api-production.up.railway.app/api/v2
```

**Rules:**
- No trailing slash
- Includes `/api/v2` — never add manually in code

---

## PERFORMANCE OPTIMIZATIONS

### React Query Configuration

```typescript
// src/api/queryClient.ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,        // 5 minutes
      cacheTime: 10 * 60_000,       // 10 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => failureCount < 2,
    },
  },
});
```

### Select to Reduce Re-renders

```typescript
useQuery({
  queryKey: workOrderKeys.detail(id),
  select: (data) => ({
    id: data.id,
    customerName: data.customer.name,
    status: data.status,
  }),
});
```

### Component Memoization

```typescript
const WorkOrderCard = React.memo(({ workOrder }) => {
  // ...expensive render
});

// Use useMemo for derived data
const sortedOrders = useMemo(
  () => orders.sort((a, b) => a.priority - b.priority),
  [orders]
);

// Use useCallback for handlers
const handleDrag = useCallback((id: string) => {
  // ...
}, [dependency]);
```

### Virtualization for Large Lists

```typescript
// For lists > 50 items
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => containerRef.current,
  estimateSize: () => 50,
});
```

### Lazy Loading Routes

```typescript
// src/routes/index.tsx
const SchedulePage = lazy(() => import('@/features/schedule/SchedulePage'));
const CustomersPage = lazy(() => import('@/features/customers/CustomersPage'));

// Usage
<Suspense fallback={<PageLoader />}>
  <SchedulePage />
</Suspense>
```

### Vite Optimizations

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          tanstack: ['@tanstack/react-query'],
          ui: ['@/components/ui'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    hmr: { overlay: true },
  },
});
```

---

## TESTING

### Playwright E2E Tests

```typescript
// e2e/schedule.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Schedule Page', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('drag work order to technician @critical', async ({ page }) => {
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');

    // Drag operation
    const workOrder = page.locator('[data-testid="work-order-123"]');
    const techColumn = page.locator('[data-testid="tech-column-john"]');
    await workOrder.dragTo(techColumn);

    // Verify
    await expect(page.locator('.toast-success')).toBeVisible();
  });
});
```

### Reuse Auth State

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    storageState: 'playwright/.auth/user.json',
  },
});
```

### Run Tests in Parallel

```bash
npm run test:e2e -- --workers=4
npx playwright test --grep @critical
```

### Vitest Unit Tests

```typescript
// tests/utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency } from '@/lib/utils';

describe('formatCurrency', () => {
  it('formats dollars correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });
});
```

---

## ROUTES

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Dashboard | Home page |
| `/login` | LoginPage | Authentication |
| `/schedule` | SchedulePage | Drag-and-drop scheduling |
| `/customers` | CustomersPage | Customer list |
| `/customers/:id` | CustomerDetail | Customer detail view |
| `/work-orders` | WorkOrdersPage | Work order list |
| `/work-orders/:id` | WorkOrderDetail | Work order detail |
| `/technicians` | TechniciansPage | Technician management |
| `/map` | MapPage | Service area map |
| `/reports` | ReportsPage | Analytics |
| `/email-marketing` | EmailMarketingPage | Campaign management |
| `/settings` | SettingsPage | App settings |

---

## DRAG AND DROP (SCHEDULE)

### @dnd-kit Setup

```typescript
// ScheduleBoard.tsx
import { DndContext, DragEndEvent } from '@dnd-kit/core';

function ScheduleBoard() {
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const workOrderId = active.id;
    const technicianId = over.id;

    // Optimistic update
    queryClient.setQueryData(['work-orders'], (old) => {
      // Update locally
    });

    // API call
    try {
      await apiClient.patch(`/work-orders/${workOrderId}`, {
        assigned_technician_id: technicianId,
        scheduled_date: selectedDate,
      });
    } catch (error) {
      // Rollback on failure
      queryClient.invalidateQueries(['work-orders']);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      {/* Technician columns */}
    </DndContext>
  );
}
```

---

## KNOWN INCOMPLETE FEATURES

- Offline Sync
- Route Optimization
- Full Work Order Detail Navigation

---

## GIT WORKFLOW

### Commit Conventions

```
feat: add inline scheduling to map popup
fix: resolve PATCH /work-orders 500 error
chore: update dependencies
refactor: extract drag logic to hook
test: add Playwright drag-to-unschedule test
docs: update claude.md with performance rules
```

### Branch Naming

```
feature/schedule-map-edits
fix/workorder-patch-500
hotfix/critical-500-error
```

### PR Requirements

1. Title follows Conventional Commits
2. Description includes:
   - What changed
   - Why (link to issue)
   - Playwright verification proof
3. All checks pass: lint, TypeScript, Vitest, Playwright

---

## PLAYWRIGHT ENFORCEMENT

**All UI, navigation, interaction, mutation, and error reproduction tasks require Playwright with evidence bundle.**

### Target URLs

- https://react.ecbtx.com (React CRM)
- https://crm.ecbtx.com (Legacy Flask)

### Standard Template

```typescript
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));
  page.on('response', response => {
    if (!response.ok()) {
      console.log(`[NETWORK] ${response.url()} → ${response.status()}`);
    }
  });

  await page.goto('https://react.ecbtx.com/schedule');
  await page.waitForLoadState('networkidle');

  // Actions here

  await browser.close();
})();
```

### Evidence Bundle Format

```
PLAYWRIGHT RUN RESULTS:
Timestamp: [ISO timestamp]
Target URL: https://react.ecbtx.com/[path]
Actions Performed:
  1. [action]
  2. [action]
Console Logs: [output]
Network Failures/Status:
  • GET /api/v2/... → 200
  • PATCH /api/v2/... → [status]
Screenshot Description:
  • [visual state]
Test Outcome: PASS / FAIL
```

**Missing bundle = invalid response**
