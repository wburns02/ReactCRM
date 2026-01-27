# Estimates Creation 422 Bug - Diagnosis Report

**Date**: 2026-01-27
**Status**: ✅ FULLY FIXED AND VERIFIED

## Problem Statement (Original)
Create Estimate modal opens but submission fails silently. POST /api/v2/quotes returns 422 Unprocessable Content. No success, no error toast, estimate not created.

## Resolution Summary

The 422 bug was fixed in commit `fee671a`:
```
fix: Round decimal values to 2 places in useCreateQuote to prevent 422
```

## Root Cause Analysis

### Issue
The backend Pydantic schema expects `Decimal` types with `decimal_places=2` for financial fields:
```python
subtotal: Optional[Decimal] = Field(None, decimal_places=2)
tax_rate: Optional[Decimal] = Field(None, decimal_places=2)
tax: Optional[Decimal] = Field(None, decimal_places=2)
total: Optional[Decimal] = Field(None, decimal_places=2)
```

JavaScript floating-point arithmetic could produce values like `199.99000000000001` which fail Pydantic's decimal validation, causing 422 errors.

### Fix Applied (useQuotes.ts:99-102)
```typescript
// Calculate totals - round to 2 decimal places for API compatibility
const subtotal = Math.round(lineItems.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
const tax = Math.round(subtotal * (data.tax_rate / 100) * 100) / 100;
const total = Math.round((subtotal + tax) * 100) / 100;
```

## Verification Results

### Playwright E2E Tests (8/8 Pass)
```
✓ Create Estimate button opens modal
✓ Can fill estimate form
✓ Create Estimate form submission works (POST /quotes → 201)
✓ Shows success toast on estimate creation
✓ Modal closes after successful creation
✓ Shows validation error when customer not selected
✓ No 422 errors in network
✓ authenticate
```

### API Health Check
- Backend: https://react-crm-api-production.up.railway.app
- Version: 2.6.6
- Status: healthy

### Deployed Endpoints Working
- `POST /api/v2/quotes` → 201 Created
- `GET /api/v2/estimates/` → 200 OK

## Conclusion

The estimate creation functionality is fully operational:
1. ✅ Form submits successfully
2. ✅ POST /api/v2/quotes returns 201
3. ✅ Success toast appears
4. ✅ Modal closes after creation
5. ✅ Estimate appears in list
6. ✅ No 422 errors
7. ✅ Error handling for validation issues

---
*Verified: 2026-01-27*
*Tests: e2e/modules/estimates-creation.spec.ts*
