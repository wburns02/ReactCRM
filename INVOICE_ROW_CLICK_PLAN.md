# Invoice Row Click Implementation Plan

## Goal
Make entire invoice row clickable to navigate to details, with 2026 best practices.

## Changes to InvoicesList.tsx

### 1. Add useNavigate Import
```tsx
import { Link, useNavigate } from "react-router-dom";
```

### 2. Add Navigate Hook in Component
```tsx
export function InvoicesList({ ... }) {
  const navigate = useNavigate();
  // ...
}
```

### 3. Update `<tr>` Element
```tsx
<tr
  key={invoice.id}
  className="hover:bg-bg-hover transition-colors cursor-pointer group"
  tabIndex={0}
  onClick={() => navigate(`/invoices/${invoice.id}`)}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(`/invoices/${invoice.id}`);
    }
  }}
  role="row"
  aria-label={`Invoice ${invoice.invoice_number || invoice.id.slice(0, 8)} for ${invoice.customer_name}`}
>
```

### 4. Stop Propagation on Action Buttons
Edit button:
```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={(e) => {
    e.stopPropagation();
    onEdit(invoice);
  }}
  aria-label="Edit invoice"
>
  Edit
</Button>
```

Delete button:
```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={(e) => {
    e.stopPropagation();
    onDelete(invoice);
  }}
  aria-label="Delete invoice"
  className="text-danger hover:text-danger"
>
  Delete
</Button>
```

### 5. Optional: Hide Actions Until Hover (2026 Polish)
```tsx
<div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
```

### 6. Status Badge Already Good
InvoiceStatusBadge.tsx already has proper color coding:
- paid: success (green)
- sent: default (gray)
- draft: warning (yellow/orange)
- overdue: danger (red)
- void: danger (red)

## Accessibility Considerations
- `role="row"` already implied by `<tr>`
- `tabIndex={0}` already present
- Add `aria-label` with invoice context
- `onKeyDown` for Enter/Space navigation
- Focus styles via Tailwind defaults

## Mobile Considerations
- `cursor-pointer` works on touch
- Larger touch targets from full row
- Actions should remain visible on mobile (no hover)

## Files to Modify
1. `/src/features/invoicing/components/InvoicesList.tsx` - Main changes

## Verification Steps
1. Login with will@macseptic.com / #Espn2025
2. Go to /invoices
3. Click invoice number - navigates ✓
4. Click customer name - navigates ✓
5. Click amount - navigates ✓
6. Click status badge - navigates ✓
7. Click empty space - navigates ✓
8. Click Edit button - opens modal, does NOT navigate ✓
9. Click Delete button - opens confirm, does NOT navigate ✓
10. Press Enter on focused row - navigates ✓
11. Hover shows cursor pointer ✓

