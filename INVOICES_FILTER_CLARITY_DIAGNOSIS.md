# Invoices Filter Clarity - Diagnosis

## Date: 2026-01-26

## Issue Summary

When selecting status filters on the Invoices page (Draft, Sent, Paid, etc.), the card title label does NOT update to show the current filter status.

## Expected Behavior

- Default (All): "7 invoices"
- Draft filter: "6 Draft invoices"
- Sent filter: "1 Sent invoice"
- Paid filter: "0 Paid invoices"

## Actual Behavior (CONFIRMED BUG)

- Default (All): "7 invoices" (correct)
- Draft filter: "6 invoices" (MISSING "Draft")
- Sent filter: "1 invoice" (MISSING "Sent")
- Paid filter: "Invoices" (MISSING count AND status)

## Root Cause Analysis

### Code Review: src/features/invoicing/InvoicesPage.tsx

The `getFilterLabel` function (lines 39-47) appears correctly implemented:

\`\`\`tsx
function getFilterLabel(status: string, count: number): string {
  const statusLabel = status ? INVOICE_STATUS_LABELS[status as InvoiceStatus] : "";
  const countText = count === 1 ? "invoice" : "invoices";

  if (status && statusLabel) {
    return \`\${count} \${statusLabel} \${countText}\`;
  }
  return \`\${count} \${countText}\`;
}
\`\`\`

Called in CardTitle (lines 227-231):

\`\`\`tsx
<CardTitle>
  {data?.total !== undefined
    ? getFilterLabel(filters.status || "", data.total)
    : "Invoices"}
</CardTitle>
\`\`\`

### Root Cause

The deployed version may not include this getFilterLabel function, OR there's a build/deployment caching issue. The test results show:
- "Paid filter title: Invoices" - this means data.total is undefined (falls back to "Invoices")
- "Draft filter title: 6 invoices" - shows count but NOT "Draft"

This indicates the code is NOT running the branch that includes the status label.

## Files to Modify

- `src/features/invoicing/InvoicesPage.tsx` - Verify and fix label display logic

## Test Results (Current State)

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Default shows count | "X invoices" | "7 invoices" | PASS |
| Draft shows status | "X Draft invoices" | "6 invoices" | FAIL |
| Sent shows status | "X Sent invoices" | "1 invoice" | FAIL |
| Paid shows status | "X Paid invoices" | "Invoices" | FAIL |
| Clear filters button works | Shows/hides correctly | Works | PASS |
| No console errors | No errors | No errors | PASS |
