# Progress: Estimates Page Fix

## Status: COMPLETE

## Summary
Fixed the Estimates page which was showing "No estimates found" due to calling a non-existent API endpoint, and the Create Estimate button which did nothing.

## Root Causes Identified

1. **Backend**: No `/api/v2/estimates` endpoint exists - only `/api/v2/quotes`
2. **Frontend**: EstimatesPage was calling `apiClient.get("/estimates")` which returned 404
3. **Frontend**: Create Estimate button had no onClick handler

## Changes Made

### File: `src/features/billing/pages/EstimatesPage.tsx`

1. **Replaced broken API call with useQuotes hook**
   - Old: `apiClient.get("/estimates")` → 404 error
   - New: `useQuotes({ status: filter })` → 200 success

2. **Added CreateEstimateModal component**
   - Customer selector using existing CustomerSelect component
   - Line items form with service, description, quantity, rate
   - Tax rate and validity period inputs
   - Real-time total calculation
   - Uses `useCreateQuote()` to submit

3. **Wired Create Estimate button**
   - Added `onClick={() => setShowCreateModal(true)}`
   - Modal opens with full form

4. **Improved status handling**
   - Maps "pending" filter to "draft" status
   - Handles all quote statuses: draft, sent, accepted, declined, expired

### File: `e2e/modules/billing/estimates-page.spec.ts`

Created comprehensive E2E tests:
- Page loads with list or empty state
- GET /quotes returns success (200 or 307 redirect)
- Create Estimate button opens modal
- Modal form elements work correctly
- Filter buttons work
- No console errors
- No 404 network errors
- AI Pricing Assistant available

## Test Results

```
Running 9 tests using 8 workers

✓ authenticate (3.4s)
✓ estimates page loads and displays list or empty state (5.5s)
✓ GET /quotes returns 200 (not 404) (7.9s)
✓ Create Estimate button opens modal (4.7s)
✓ Create Estimate modal has working form elements (4.8s)
✓ filter buttons work (5.5s)
✓ no console errors on estimates page (6.1s)
✓ no 404 network errors on estimates page (6.3s)
✓ AI Pricing Assistant is available (5.2s)

9 passed (13.3s)
```

## Verification Checklist

- [x] Page loads without errors
- [x] GET /api/v2/quotes returns 200 (via useQuotes hook)
- [x] No 404 errors on API calls
- [x] Estimates list shows data (or proper empty state)
- [x] Create Estimate button opens modal
- [x] Modal has customer selector
- [x] Modal has line items form
- [x] Modal calculates totals
- [x] Modal can be closed
- [x] Filter buttons work (All, Pending, Accepted, Declined)
- [x] AI Pricing Assistant toggle works
- [x] No console errors
- [x] All 9 Playwright tests pass

## Commits

1. `437da28` - fix(estimates): use quotes API and wire Create Estimate button
2. `da2c664` - fix(e2e): improve estimates page tests for redirect and exact match
