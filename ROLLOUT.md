# React Prospects Rollout Guide

## Overview

This document describes the feature flag system, cookie configuration, and rollback procedures for the React migration.

## Feature Flags

### Flag Names and Defaults

| Flag | Default | Description |
|------|---------|-------------|
| `VITE_FEATURE_REACT_PROSPECTS` | `false` | Enable React `/app/prospects` |
| `VITE_FEATURE_REACT_CUSTOMERS` | `false` | Enable React `/app/customers` (future) |
| `VITE_FEATURE_REACT_WORK_ORDERS` | `false` | Enable React `/app/work-orders` (future) |

### How Flags Are Read

1. **React App (Build-time)**:
   - Set in `.env.local` or CI environment
   - Read via `import.meta.env.VITE_FEATURE_*`
   - Compiled into the build

2. **Flask Backend (Runtime)**:
   - Set in environment: `FEATURE_REACT_PROSPECTS=true`
   - Read in `routes/react_app.py`
   - Controls server-side redirects

### Route Behavior

| Flag State | `/app/prospects` | Legacy `/prospects.html` |
|------------|------------------|--------------------------|
| `true` | Serves React SPA | Still accessible |
| `false` | Redirects to legacy | Primary experience |

## Static File Serving

### React Build Output

```
frontend-react/dist/
├── index.html         # SPA entry point
└── assets/
    ├── index-*.js     # Main app bundle (~85KB gzip)
    ├── vendor-*.js    # React, TanStack Query, etc.
    └── index-*.css    # Tailwind styles (~5KB gzip)
```

### Flask Mount Configuration

```python
# routes/react_app.py
REACT_DIST_PATH = '../frontend-react/dist'

@bp.route('/app/')
@bp.route('/app/<path:path>')
def serve_react_app(path=''):
    # Check auth, feature flags, then serve SPA
    return send_from_directory(REACT_DIST_PATH, 'index.html')
```

## Cookie Configuration

### Session Cookie Settings

```python
# application/config.py
SESSION_COOKIE_HTTPONLY = True      # No JS access
SESSION_COOKIE_SAMESITE = 'Lax'     # Allow same-site requests
SESSION_COOKIE_SECURE = True        # HTTPS only (production)
SESSION_COOKIE_PATH = '/'           # Available to all routes
```

### React API Client

```typescript
// api/client.ts
const apiClient = axios.create({
  withCredentials: true,  // Send session cookies
});
```

## Rollback Procedures

### Instant Rollback (No Redeploy)

1. Set Flask environment variable:
   ```bash
   FEATURE_REACT_PROSPECTS=false
   ```
2. Restart Flask app
3. All `/app/prospects` requests redirect to `/prospects.html`

### Full Rollback (Redeploy)

1. Set in React build environment:
   ```bash
   VITE_FEATURE_REACT_PROSPECTS=false
   ```
2. Rebuild and deploy: `npm run build`
3. React routes won't be accessible

### User-Initiated Fallback

- "Classic View" link always visible on React pages
- Links directly to `/prospects.html`
- No flag changes needed

## Error Handling

### React Error States

| Error Type | User Experience |
|------------|-----------------|
| Network error | Retry button + Classic View link |
| 500 Server error | Error message + Classic View link |
| 401 Unauthorized | Redirect to `/login.html` |
| React crash | ErrorBoundary with Classic View option |

### Monitoring

- Console errors logged in development
- ErrorBoundary catches React crashes
- API client dispatches `auth:expired` event for logging

## Testing

### Unit & Contract Tests (CI)

```bash
npm run test:ci          # 19 tests (contracts + a11y)
npm run test:contracts   # Zod schema validation only
```

### E2E Smoke Tests (Staging)

```bash
BASE_URL=https://staging.example.com npx playwright test
```

### Local Development

```bash
npm run dev              # Start Vite dev server
npm run test:e2e:ui      # Playwright with UI
```

## Deployment Checklist

### Pre-Launch

- [ ] Feature flag set to `false` in production
- [ ] Flask `FEATURE_REACT_PROSPECTS=false` in env
- [ ] Legacy `/prospects.html` tested and working
- [ ] Session cookies verified with `/app/*` routes
- [ ] Error states tested (500, network, auth)

### Gradual Rollout

1. [ ] Enable for internal users (beta flag)
2. [ ] Monitor errors and performance
3. [ ] Enable for 10% of users
4. [ ] Monitor for 24 hours
5. [ ] Enable for 50% of users
6. [ ] Monitor for 48 hours
7. [ ] Enable for 100% of users

### Rollback Triggers

- Error rate > 1%
- Load time > 3s (P95)
- User complaints about data issues
- Any data integrity problems

## Production Rollout

### Phase 1: Runtime Flag Trial (24 hours)

**Environment Setup:**
```bash
# Railway Production → Variables
FEATURE_REACT_PROSPECTS=true

# Build flag remains OFF
VITE_FEATURE_REACT_PROSPECTS=false
```

**Monitoring Cadence:**

| Window | Frequency | Actions |
|--------|-----------|---------|
| Hour 0–1 | Every 15 min | Check logs, verify routing, spot-check UI |
| Hour 1–4 | Hourly | Check error rates, auth redirects |
| Hour 4–24 | 3x (morning/midday/evening) | Review metrics, check user reports |

**Success Criteria:**
- [ ] 5xx error rate < 0.5%
- [ ] No auth redirect loops
- [ ] No user-reported issues
- [ ] `/prospects.html` remains functional

**Rollback:** `FEATURE_REACT_PROSPECTS=false` (immediate, no redeploy)

---

### Phase 2: Build Flag Trial (48 hours)

**Environment Setup:**
```bash
# Railway Production → Variables
FEATURE_REACT_PROSPECTS=true

# Railway Build Environment
VITE_FEATURE_REACT_PROSPECTS=true

# Trigger redeploy after setting build flag
```

**Monitoring Cadence:**

| Window | Frequency | Actions |
|--------|-----------|---------|
| Hour 0–1 | Every 15 min | Active monitoring, check logs |
| Hour 1–4 | Hourly | Check error rates, performance |
| Hour 4–48 | 3x daily | Review metrics, E2E tests |

**Success Criteria:**
- [ ] 5xx error rate < 0.5%
- [ ] No auth redirect loops
- [ ] No user-reported issues
- [ ] `/prospects.html` remains functional
- [ ] Full React functionality verified
- [ ] E2E tests passing against production

**Rollback:** `FEATURE_REACT_PROSPECTS=false` (immediate, no redeploy)

---

### Permanent Status (After 48h Stable)

After Phase 2 success:
1. Remove "trial" status from internal tracking
2. Keep rollback procedure documented and tested
3. Monitor weekly for 1 month post-launch
4. Document any issues in post-mortem if needed

---

### Quick Health Checks

```bash
# Verify React route responding (not redirecting)
curl -s -o /dev/null -w "%{http_code}" \
  -H "Cookie: session=<valid>" \
  https://app.macseptic.com/app/prospects
# Expected: 200

# Verify legacy still works
curl -s -o /dev/null -w "%{http_code}" \
  https://app.macseptic.com/prospects.html
# Expected: 200

# Check API responds
curl -s -H "Cookie: session=<valid>" \
  https://app.macseptic.com/api/prospects/ | jq '.total'
# Expected: number
```

### Rollback Triggers

Rollback immediately if:
- 5xx rate exceeds 1% for 5+ minutes
- Auth redirect loops detected
- Data not loading for multiple users
- Any data corruption or incorrect display
- User reports of lost work/sessions

---

### Production Flag Values (Final State)

| Variable | Value | Location | Status |
|----------|-------|----------|--------|
| `FEATURE_REACT_PROSPECTS` | `true` | Railway Prod env | Active |
| `VITE_FEATURE_REACT_PROSPECTS` | `true` | Railway Build env | Active |
| `FEATURE_REACT_CUSTOMERS` | `false` | Railway Prod env | Future |
| `VITE_FEATURE_REACT_CUSTOMERS` | `false` | Railway Build env | Future |
| `FEATURE_REACT_WORK_ORDERS` | `false` | Railway Prod env | Future |
| `VITE_FEATURE_REACT_WORK_ORDERS` | `false` | Railway Build env | Future |

---

### Sign-Off

**Phase 1 (Runtime Flag):**
- Date completed: ___________
- Verified by: ___________
- Issues: ___________

**Phase 2 (Build Flag):**
- Date completed: ___________
- Verified by: ___________
- Issues: ___________

**Permanent Status:**
- Date achieved: ___________
- Signed off by: ___________
