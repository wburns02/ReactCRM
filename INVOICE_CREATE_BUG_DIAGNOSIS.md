# Invoice Creation Bug Diagnosis

## Bug Summary
On the Create Invoice page, two critical issues prevent invoice creation:
1. **Quantity and Rate fields are unreadable** - font size is 12.25px (too small)
2. **Clicking Create Invoice fails with 422 Unprocessable Content** from POST /api/v2/invoices/

## Root Causes Identified

<promise>INVOICE_CREATE_ROOT_CAUSES_IDENTIFIED</promise>

### Issue 1: Field Readability (UI)

**Location:** `/src/features/invoicing/InvoiceCreatePage.tsx` (lines 166, 182)

**Problem:**
- Quantity input: `text-sm` class = 12.25px font size (should be >= 14px)
- Rate input: `text-sm` class = 12.25px font size (should be >= 14px)
- Width constraints: `w-20` (70px) for qty, `w-28` (98px) for rate - too narrow

**Measured Styles:**
```
Quantity: fontSize: '12.25px', width: '70px'
Rate: fontSize: '12.25px', width: '98px'
```

### Issue 2: 422 Validation Error (Data Structure Mismatch)

**422 Response Body:**
```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "line_items", 0, "service"],
      "msg": "Field required"
    },
    {
      "type": "missing",
      "loc": ["body", "line_items", 0, "amount"],
      "msg": "Field required"
    },
    {
      "type": "date_from_datetime_parsing",
      "loc": ["body", "due_date"],
      "msg": "Input should be a valid date or datetime, input is too short",
      "input": ""
    }
  ]
}
```

**Frontend Sends (WRONG):**
```json
{
  "customer_id": "",
  "customer_name": "Test Customer",
  "due_date": "",
  "notes": "",
  "line_items": [
    {
      "description": "Test Service",
      "quantity": 2,
      "rate": 100
    }
  ]
}
```

**Backend Expects (InvoiceCreate schema):**
```python
customer_id: str  # MUST be valid UUID, not empty string
line_items: [
  {
    "service": str,      # REQUIRED - frontend uses "description" instead!
    "description": str,  # Optional
    "quantity": float,   # Required
    "rate": float,       # Required
    "amount": float      # REQUIRED - frontend doesn't send this!
  }
]
due_date: Optional[date]  # Must be valid date or omitted, NOT empty string
```

### Root Cause Analysis

| Issue | Frontend Code | Backend Expectation | Fix Required |
|-------|---------------|---------------------|--------------|
| `service` missing | Uses `description` for service name | `service` is required field | Rename field |
| `amount` missing | Not calculated | `amount = quantity * rate` required | Calculate & send |
| `due_date` empty string | Sends `""` when empty | Expects date or null/undefined | Convert to null |
| `customer_id` empty | Sends `""` | Expects valid UUID | Add customer selector |

## Files to Modify

### Frontend (`/home/will/projects/ReactCRM`)

1. **`/src/features/invoicing/InvoiceCreatePage.tsx`**
   - Change `text-sm` to `text-base` for quantity and rate inputs
   - Increase input widths
   - Rename `description` to `service` in LineItem interface
   - Calculate `amount` for each line item before submit
   - Convert empty `due_date` to undefined/null
   - Add customer selection (dropdown or search)

2. **`/src/api/hooks/useInvoices.ts`** (reference for proper data structure)
   - Already has correct `useCreateInvoice` hook with amount calculation

## Verification Results

| Check | Status | Details |
|-------|--------|---------|
| Font size (qty) | ❌ FAIL | 12.25px (need >= 14px) |
| Font size (rate) | ❌ FAIL | 12.25px (need >= 14px) |
| Field `service` | ❌ FAIL | Missing, sends `description` |
| Field `amount` | ❌ FAIL | Missing |
| `due_date` format | ❌ FAIL | Sends "" instead of null |
| `customer_id` | ❌ FAIL | Empty string, needs UUID |
| POST /invoices/ | ❌ FAIL | Returns 422 |

## Next Steps

1. **Phase 2:** Create comprehensive fix plan in INVOICE_CREATE_PLAN.md
2. **Phase 3:** Implement fixes incrementally with manual verification
3. **Phase 4:** Write Playwright E2E tests to prevent regression

## Pattern to Follow

The codebase has a proper pattern in `useCreateInvoice` hook:
```typescript
// From /src/api/hooks/useInvoices.ts
const lineItems = data.line_items.map((item) => ({
  ...item,
  amount: item.quantity * item.rate,  // Calculate amount
}));

const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
const tax = subtotal * (data.tax_rate / 100);
const total = subtotal + tax;
```

The `InvoiceCreatePage.tsx` should use this hook instead of its own inline mutation.
