# Estimates and Payment Plans Diagnosis

## Date: 2026-01-26

## Summary
Both Estimates and Payment Plans pages return 404 errors due to endpoint mismatches.

## Root Causes

### 1. Estimates Page - GET /estimates returns 404

**Problem**: Frontend calls `/estimates` but backend uses `/quotes`

**Evidence**:
```bash
# Frontend calls (EstimatesPage.tsx line 289):
GET /api/v2/estimates -> 404 Not Found

# Backend has (quotes.py):
GET /api/v2/quotes/ -> 200 OK (returns {"items":[], "total":0, ...})
```

**Fix**: Change frontend to use `/quotes` instead of `/estimates`

### 2. Payment Plans Page - GET /payment-plans returns 404

**Problem**: No `/payment-plans` endpoint exists in backend

**Evidence**:
```bash
# Frontend calls (PaymentPlansPage.tsx line 30):
GET /api/v2/payment-plans -> 404 Not Found

# No payment-plans router exists in backend
# Related endpoints that DO exist:
- /api/v2/financing/applications (financing applications, not payment plans)
- /api/v2/payments/ (payment records, not payment plans)
```

**Fix Options**:
1. Create backend endpoint for payment plans (requires backend changes)
2. Use demo data in frontend until backend is implemented
3. Redirect to financing applications (different data structure)

**Recommended Fix**: Use demo data gracefully when endpoint returns 404, similar to how other features handle missing data.

## Files to Fix

### Frontend Changes:
1. `/src/features/billing/pages/EstimatesPage.tsx` - Change `/estimates` to `/quotes`
2. `/src/features/billing/pages/PaymentPlansPage.tsx` - Handle 404 gracefully with demo data

## API Endpoint Mapping

| Frontend Expects | Backend Has | Action |
|------------------|-------------|--------|
| `/estimates` | `/quotes/` | Change frontend path |
| `/payment-plans` | None | Add demo data fallback |

## Test Verification

After fix:
- Estimates page should load quotes from `/quotes/` endpoint
- Payment Plans page should show demo data or empty state cleanly
- No 404 errors in network tab
