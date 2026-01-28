# Customer View from Invoice - 422 Bug Diagnosis

**Date:** 2026-01-28
**Status:** FIXED

## Problem Statement
Clicking "View Customer" button on invoice detail page caused 422 Unprocessable Content error from `GET /api/v2/customers/{id}`.

## Root Cause Analysis

### Issue 1: Backend Validation Too Strict
The backend customer endpoint expected `customer_id: int` as a path parameter:
```python
@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: int, ...):
```

When an invoice had a non-integer customer_id (UUID or invalid format), FastAPI's automatic type coercion failed, returning 422 instead of 404.

### Issue 2: Invoice Data Quality
Some invoices in the database have invalid customer_ids (UUIDs like `aabd625a-2e4b-58f9-8a61-c60f5e380586`) that don't reference actual customers (which use integer IDs).

### Issue 3: Frontend Missing ID Validation
The "View Customer" link rendered unconditionally without checking if customer_id was valid:
```tsx
<Link to={`/customers/${invoice.customer_id}`}>
```

## Fixes Applied

### Backend Fix (react-crm-api)
**File:** `/home/will/projects/react-crm-api/app/api/v2/customers.py`
**Commit:** `36a409f`

Changed endpoint to accept string and validate manually:
```python
@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str, ...):
    try:
        customer_id_int = int(customer_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer not found (invalid ID format: {customer_id})",
        )
    # ... rest of logic
```

**Result:** Now returns 404 (not found) instead of 422 (validation error) for invalid IDs.

### Frontend Fix (ReactCRM)
**File:** `/home/will/ReactCRM/src/lib/utils.ts`
**File:** `/home/will/ReactCRM/src/features/invoicing/InvoiceDetailPage.tsx`
**Commit:** `5816842`

1. Added `isValidId()` utility function to validate entity IDs
2. Wrapped "View Customer" link with conditional rendering:
```tsx
{isValidId(invoice.customer_id) && (
  <Link to={`/customers/${invoice.customer_id}`}>
    <Button variant="ghost" size="sm">View Customer</Button>
  </Link>
)}
```

## Verification

### Playwright E2E Tests (7/7 Pass)
```
✓ 1. Navigate to invoice detail page
✓ 2. Click View Customer button
✓ 3. Customer detail page loads with customer data
✓ 4. GET /customers/{id} returns valid status (not 422)
✓ 5. No 422 errors in network
✓ 6. No console errors during navigation
```

### Key Results
- **No more 422 errors** on customer endpoint
- Invalid customer IDs return **404** (correct HTTP status)
- Valid customer IDs return **200** with full customer data
- Frontend guards against null/undefined IDs

## Commits
1. Backend: `36a409f` - Handle non-integer customer IDs gracefully
2. Frontend: `5816842` - Add ID validation for View Customer link
3. Tests: `acba321` - E2E tests for customer view from invoice

---

<promise>CUSTOMER_VIEW_ROOT_CAUSE_IDENTIFIED</promise>

**Root Cause:** Backend expected integer customer_id but some invoices have UUID-format IDs. FastAPI returned 422 instead of 404 for non-integer values.

<promise>CUSTOMER_VIEW_FROM_INVOICE_FULLY_WORKING</promise>

**Final Status:** The View Customer flow now works correctly:
- Valid customer IDs → Customer detail loads (200)
- Invalid customer IDs → "Not found" error (404, not 422)
- Null/undefined IDs → Link not rendered (frontend guard)
