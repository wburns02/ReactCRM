# Invoice Row Click Diagnosis

## Problem Statement
On the Invoices list page, clicking anywhere on an invoice row (except the Invoice # link or View button) does NOT navigate to invoice details. Users expect the entire row to be clickable.

## Current Implementation Analysis

### File: `/src/features/invoicing/components/InvoicesList.tsx`

### Row Structure (Lines 106-188)
```tsx
<tr
  key={invoice.id}
  className="hover:bg-bg-hover transition-colors"
  tabIndex={0}
>
  {/* 7 table cells */}
</tr>
```

### Current Navigation Points
Only 2 elements navigate to invoice details:

1. **Invoice # Link (Lines 112-117)**
   ```tsx
   <Link to={`/invoices/${invoice.id}`} className="...">
     {invoice.invoice_number || invoice.id.slice(0, 8)}
   </Link>
   ```

2. **View Button (Lines 156-164)**
   ```tsx
   <Link to={`/invoices/${invoice.id}`}>
     <Button variant="ghost" size="sm">View</Button>
   </Link>
   ```

### Non-Navigating Elements
- Customer name cell (td) - no onClick
- Status badge cell - no onClick
- Total amount cell - no onClick
- Due Date cell - no onClick
- Created date cell - no onClick
- Empty space in any cell - no onClick
- The `<tr>` element itself - no onClick

## Root Cause

**The `<tr>` element has NO onClick handler.**

The row has:
- `hover:bg-bg-hover` - visual feedback on hover (good)
- `tabIndex={0}` - keyboard focusable (good)
- NO `onClick` handler - clicking does nothing
- NO `cursor-pointer` - no visual affordance that row is clickable
- NO `onKeyDown` handler for Enter/Space keyboard navigation

## Required Fix

1. Add `onClick={() => navigate(`/invoices/${invoice.id}`)}` to `<tr>`
2. Add `cursor-pointer` class for visual affordance
3. Add `onKeyDown` handler for Enter/Space key navigation
4. Stop propagation on Edit/Delete buttons to prevent navigation when clicking them
5. Consider: stop propagation on View button (already navigates, but double navigation)

## Other Observations

### Good Existing Features
- Hover effect already exists (`hover:bg-bg-hover`)
- `tabIndex={0}` already makes rows keyboard focusable
- Status badges with color coding already implemented

### Missing 2026 Best Practices
- No quick actions on hover (pay, send reminder, download)
- No keyboard navigation (Enter to open)
- Action buttons always visible (could hide and show on hover)
- Mobile responsiveness could be improved

## Confirmed Root Cause
**Missing onClick handler on the `<tr>` element**

The fix requires adding:
1. `useNavigate` hook import
2. `onClick` handler on `<tr>` that calls `navigate(`/invoices/${id}`)`
3. `cursor-pointer` class
4. `onKeyDown` for keyboard Enter/Space
5. `e.stopPropagation()` on Edit/Delete button clicks

