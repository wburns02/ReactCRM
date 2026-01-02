# Quick Reference — ECBTX CRM

> **Version:** v2.0 — December 31, 2025
> **READ THIS FILE FIRST** before any task

---

## MOST IMPORTANT RULES

Break any of these = **invalid response**:

| # | Rule | Violation |
|---|------|-----------|
| 1 | **NEVER fake Playwright** | Claiming to test without full script + evidence bundle |
| 2 | **NO /app/ routes** | `basename="/"`, no `/app` in any Link/navigate/href |
| 3 | **NO double /api** | API calls use `/customers/`, not `/api/customers/` |
| 4 | **Drag mutations must succeed** | PATCH work-orders must return 200, not 500 |
| 5 | **Relentless mode = no stopping** | Never ask to continue, just keep fixing |

---

## ACTIVATION COMMANDS

### Relentless Autonomous Troubleshooter Mode

**Trigger phrases:**
```
"Enter relentless autonomous troubleshooter mode"
"Fix until all tests pass and zero console errors"
"Autonomous fix mode"
"Keep going until everything works"
```

**Behavior when activated:**
- Never ask permission to continue
- Never stop at phase boundaries
- Never summarize or check in
- Loop: Fix bug → Playwright verify → Next bug
- Only stop when: Zero console errors AND all tests pass

---

## PLAYWRIGHT REQUIREMENTS

### When Playwright is REQUIRED

Any task involving:
- Web UI interaction
- Navigation, clicking, forms, drag-and-drop
- Verifying page state, errors, behavior
- Reproducing console/network issues
- "Check the page", "try this", "confirm X"

### Forbidden Actions

- Asking user to manually test in browser
- Guessing behavior without Playwright proof
- Claiming "I tested" without evidence bundle

### Target URLs

| Application | URL |
|-------------|-----|
| React CRM | https://react.ecbtx.com |
| Legacy Flask | https://crm.ecbtx.com |
| API | https://react-crm-api-production.up.railway.app/api/v2 |

---

## MANDATORY EVIDENCE BUNDLE

Every Playwright verification **MUST** include this exact format:

```
PLAYWRIGHT RUN RESULTS:
Timestamp: 2025-12-31T14:30:00Z
Target URL: https://react.ecbtx.com/schedule
Actions Performed:
  1. Navigated to /schedule
  2. Waited for networkidle
  3. Dragged work order WO-123 to technician slot
  4. Verified PATCH response
Console Logs: [none or errors listed]
Network Failures/Status:
  • GET /api/v2/work-orders → 200
  • GET /api/v2/technicians → 200
  • PATCH /api/v2/work-orders/123 → 200
Screenshot Description:
  • Schedule board shows WO-123 in John Smith's column
  • No error toasts visible
  • Console tab clear
Test Outcome: PASS
```

**Missing bundle = invalid response**

---

## BANNED BUGS (NEVER REINTRODUCE)

### 1. `/app/` Route Prefix

**Wrong:**
```tsx
<BrowserRouter basename="/app">
<Link to="/app/customers">
navigate('/app/schedule')
```

**Correct:**
```tsx
<BrowserRouter basename="/">
<Link to="/customers">
navigate('/schedule')
```

### 2. Double `/api` in API Calls

**Wrong:**
```ts
apiClient.get('/api/customers/')
apiClient.patch('/api/work-orders/123')
```

**Correct:**
```ts
apiClient.get('/customers/')
apiClient.patch('/work-orders/123')
```

### 3. PATCH Work Orders 500 Error

**Required:**
- Frontend: Send correct payload with only mutable fields
- Backend: try/except with proper validation response
- Always verify with Playwright after changes

### 4. Fake Playwright Testing

**Forbidden phrases without immediate proof:**
- "I tested this"
- "Playwright shows..."
- "After checking the UI..."
- "I verified..."
- "The page displays..."

---

## STANDARD PLAYWRIGHT TEMPLATE

```typescript
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console logs
  page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));

  // Capture network failures
  page.on('response', response => {
    if (!response.ok()) {
      console.log(`[NETWORK] ${response.url()} → ${response.status()}`);
    }
  });

  await page.goto('https://react.ecbtx.com/schedule');
  await page.waitForLoadState('networkidle');

  // Your actions here

  await browser.close();
})();
```

---

## COMMON PAGES & ROUTES

| Route | Purpose |
|-------|---------|
| `/` | Dashboard |
| `/login` | Authentication |
| `/schedule` | Drag-and-drop scheduling |
| `/customers` | Customer list |
| `/customers/:id` | Customer detail |
| `/work-orders` | Work order list |
| `/work-orders/:id` | Work order detail |
| `/technicians` | Technician management |
| `/map` | Service area map |
| `/reports` | Analytics & reports |

---

## API PATTERNS

### Base URL
```
VITE_API_URL=https://react-crm-api-production.up.railway.app/api/v2
```

### Authentication
```typescript
// Token stored in localStorage
localStorage.getItem('auth_token')

// Interceptor adds Bearer header automatically
Authorization: Bearer <token>

// 401 → clear token → redirect to /login
```

### Pagination Response
```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "page_size": 50,
  "pages": 3
}
```

---

## CRITICAL REMINDERS

1. **Read files before editing** — never guess at code structure
2. **Test with Playwright** — all UI changes require verification
3. **Check banned bugs** — every commit should avoid these patterns
4. **Use evidence bundles** — no testing claims without proof
5. **Relentless mode** — when activated, never stop until done

---

## FILE REFERENCES

| File | Contains |
|------|----------|
| `frontend.md` | Full React architecture, components, hooks |
| `backend.md` | API endpoints, models, database schema |
| `README.md` | System overview, deployment info |
