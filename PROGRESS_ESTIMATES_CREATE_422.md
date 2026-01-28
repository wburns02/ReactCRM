# Estimates Creation 422 Fix - Progress Report

## Status: COMPLETE

**Date:** 2026-01-28
**Issue:** POST /api/v2/quotes returning 422 Unprocessable Entity

---

## Root Cause

**Primary:** Backend `valid_until` field expected `datetime` type but frontend sent date string `"YYYY-MM-DD"` from HTML date input.

**Secondary:** `decimal_places=2` constraints on Decimal fields (subtotal, tax, total) were causing validation errors for values with more precision.

---

## Changes Made

### Backend (react-crm-api)

**File:** `app/schemas/quote.py`

1. Added `field_validator` for `valid_until` to parse date strings
2. Removed `decimal_places=2` constraints on Decimal fields
3. Applied same validator to both `QuoteCreate` and `QuoteUpdate` schemas

**Commit:** `27c2c7c` - "fix: Accept date strings in quote valid_until field (422 fix)"

### Frontend (ReactCRM)

**File:** `src/api/hooks/useQuotes.ts`

1. Convert date string to ISO datetime format before API call

**Commit:** `fa47ddc` - "fix: Convert date to ISO datetime format in quote creation"

---

## Verification Results

### Playwright E2E Tests

```
Running 7 tests using 6 workers

✓ 1. Create estimate - success flow with all fields (10.0s)
✓ 2. Create estimate - minimal fields (no optional data) (8.5s)
✓ 3. Create estimate - validation error (no customer) (7.5s)
✓ 4. Create estimate - validation error (no line items) (7.9s)
✓ 5. Create estimate - no 422 errors on valid data (10.1s)
✓ 6. Verify no console errors during estimate creation (10.5s)

7 passed (17.5s)
```

### Direct API Test

```
POST /api/v2/quotes/
Request: {"customer_id": 1, "valid_until": "2026-06-30", ...}
Response: HTTP 201 Created
         {"id": 115, "valid_until": "2026-06-30T00:00:00", ...}
```

---

## Test Results Summary

| Test | Status |
|------|--------|
| Create estimate with all fields | PASS - 201 response |
| Create estimate minimal fields | PASS - 201 response |
| Validation - no customer | PASS - error shown |
| Validation - no line items | PASS - error shown |
| No 422 errors on valid data | PASS |
| No console errors | PASS |
| API accepts date string | PASS - 201 response |

---

## GitHub Commits

1. Backend: 27c2c7c pushed to wburns02/react-crm-api master
2. Frontend: fa47ddc pushed to wburns02/ReactCRM master
3. Tests: a957405 pushed to wburns02/ReactCRM master

---

## Deployed & Verified

- Backend: https://react-crm-api-production.up.railway.app
- Frontend: https://react.ecbtx.com
- All tests run against live production URLs
- Manual API verification confirms 201 response

---

## Fix Confirmed Working

The estimate creation now:
- Accepts date strings ("YYYY-MM-DD") from HTML date input
- Accepts full datetime strings ("YYYY-MM-DDTHH:MM:SS")
- Accepts null/undefined for optional valid_until
- Returns 201 Created instead of 422
- Shows success toast and closes modal
- Adds new estimate to list
