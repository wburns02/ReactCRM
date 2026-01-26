# Invoices Filter Clarity Implementation Plan

## Goal
Make the current filter clearly visible at all times so users know exactly what invoices they're viewing.

## Changes to InvoicesPage.tsx

### 1. Create a Helper Function for Filter Label
```tsx
const getFilterLabel = (status: string, count: number): string => {
  const statusLabel = status ? INVOICE_STATUS_LABELS[status as InvoiceStatus] : "";
  const countText = count === 1 ? "invoice" : "invoices";

  if (status && statusLabel) {
    return `${count} ${statusLabel} ${countText}`;
  }
  return `${count} ${countText}`;
};
```

### 2. Update CardTitle to Show Current Filter
Replace current CardTitle:
```tsx
<CardTitle>
  {data?.total
    ? `${data.total} invoice${data.total !== 1 ? "s" : ""}`
    : "Invoices"}
</CardTitle>
```

With:
```tsx
<CardTitle>
  {data?.total !== undefined
    ? getFilterLabel(filters.status || "", data.total)
    : "Invoices"}
</CardTitle>
```

### 3. Add Active Filter Badge (Optional Enhancement)
Add a visible badge when filter is active:
```tsx
{filters.status && (
  <span className="ml-2 px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
    {INVOICE_STATUS_LABELS[filters.status as InvoiceStatus]}
  </span>
)}
```

## Expected Results

| Filter Selected | CardTitle Display |
|-----------------|-------------------|
| All Statuses    | "7 invoices"      |
| Draft           | "3 Draft invoices" |
| Sent            | "2 Sent invoices"  |
| Paid            | "1 Paid invoice"   |
| Overdue         | "0 Overdue invoices" |
| Void            | "0 Void invoices"  |

## Files to Modify

1. `/src/features/invoicing/InvoicesPage.tsx` - Update CardTitle

## Verification Steps

1. Go to /invoices
2. Default shows "X invoices" (no filter label)
3. Select "Draft" → shows "X Draft invoices"
4. Select "Sent" → shows "X Sent invoices"
5. Select "Paid" → shows "X Paid invoices"
6. Clear filters → back to "X invoices"
