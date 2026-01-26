# Estimates Bugs Diagnosis

## Bug 1: POST /api/v2/quotes/ returns 422 Unprocessable Content

### Root Cause
The frontend payload doesn't match what the backend expects:

1. **`valid_until` format mismatch**:
   - Frontend sends: `"2026-02-25"` (date string)
   - Backend expects: `datetime` object or ISO datetime string `"2026-02-25T00:00:00"`

2. **`line_items.amount` calculation**:
   - Backend `QuoteLineItem` requires `amount: float`
   - Frontend does calculate it in `useCreateQuote` (line 94-97)
   - But potential type issues with Decimal vs float

### Payload sent by frontend (useQuotes.ts:104-110):
```javascript
{
  customer_id: 123,
  status: "draft",
  line_items: [{ service, description, quantity, rate, amount }],
  subtotal: number,
  tax: number,
  total: number,
  tax_rate: 8.25,
  valid_until: "2026-02-25",  // <-- Date string, not datetime
  notes: "..."
}
```

### Backend expects (quote.py QuoteCreate):
```python
customer_id: int
line_items: List[Any]
subtotal: Decimal
tax_rate: Decimal
tax: Decimal
total: Decimal
valid_until: datetime  # <-- Expects datetime
```

### Fix Required
Change `valid_until` to include time: `"2026-02-25T00:00:00"` or use `toISOString()`.

---

## Bug 2: Estimate rows only clickable on "View" link

### Root Cause
Table rows use plain `<tr>` elements with no click handlers.

**Current code (EstimatesPage.tsx:768-812):**
```tsx
<tr key={estimate.id} className="hover:bg-bg-hover">
  <td>...</td>
  // Only View link is clickable:
  <td className="text-right">
    <Link to={`/estimates/${estimate.id}`}>View</Link>
  </td>
</tr>
```

### Expected Behavior (2026 best practices)
- Full row should be clickable to navigate to detail
- Hover should show cursor-pointer
- Click on any part of row navigates to `/estimates/{id}`
- Stop propagation on action buttons (View, Edit, Delete) if separate actions needed

### Fix Required
1. Add `onClick={() => navigate(\`/estimates/${estimate.id}\`)}` to `<tr>`
2. Add `cursor-pointer` class
3. Use `useNavigate` hook from react-router-dom
4. Stop propagation on action buttons if needed

---

## Summary

| Bug | Root Cause | Fix |
|-----|------------|-----|
| 422 on create | `valid_until` date format | Use `.toISOString()` |
| Row not clickable | No onClick on `<tr>` | Add onClick + cursor-pointer |

