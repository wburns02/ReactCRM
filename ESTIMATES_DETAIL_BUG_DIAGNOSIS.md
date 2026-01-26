# Estimates Detail Bug Diagnosis

## Bug 1: GET /api/v2/estimates/{id} returns 404

### Root Cause
The **EstimateDetailPage.tsx** uses a direct API call to `/estimates/${id}` (line 15):
```typescript
const response = await apiClient.get(`/estimates/${id}`);
```

But the backend only has `/quotes/` endpoint:
```python
# router.py line 122
api_router.include_router(quotes.router, prefix="/quotes", tags=["quotes"])
```

There is NO `/estimates/` route in the backend - only `/quotes/`.

### Solution
Use the existing `useQuote` hook from `useQuotes.ts` which correctly calls `/quotes/${id}`.

---

## Bug 2: Detail page shows N/A everywhere, no line items

### Root Cause
Since the API call fails with 404, `estimate` is `undefined`, causing all fields to show fallback values ("N/A") and `line_items` to be empty.

Also, the page displays `estimate?.customer_name` but the Quote API returns:
- `customer.first_name`, `customer.last_name` (not `customer_name`)
- Need to properly map customer data

### Solution
1. Use `useQuote` hook instead of direct API call
2. Map customer fields correctly from the nested `customer` object

---

## Bug 3: Download PDF button does nothing

### Root Cause
The button (lines 100-102) has no `onClick` handler:
```tsx
<button className="px-4 py-2 border...">
  Download PDF
</button>
```

### Solution
Add client-side PDF generation using browser print API or a library like jsPDF/html2pdf.

---

## Summary of Fixes Needed

| Bug | Root Cause | Fix |
|-----|------------|-----|
| 404 on detail | Calls `/estimates/` but backend only has `/quotes/` | Use `useQuote` hook |
| N/A everywhere | API fails, wrong field mappings | Fix hook + map customer object |
| PDF does nothing | No onClick handler | Add PDF generation |

