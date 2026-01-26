# Payment Plan Invoice Selector - Diagnosis

## Date: 2026-01-26

## Issue Summary

The "Select Invoice" dropdown in the Create Payment Plan modal shows only a placeholder with no invoices available. The message "No unpaid invoices available" is displayed.

## Reproduction Steps

1. Login with will@macseptic.com / #Espn2025
2. Navigate to /billing/payment-plans
3. Click "Create Payment Plan" button
4. Modal opens with empty invoice dropdown
5. Only "Select an invoice" placeholder visible
6. "No unpaid invoices available" message shown

## Test Results

| Check | Result |
|-------|--------|
| Dropdown options count | 1 (placeholder only) |
| "No unpaid invoices" message | VISIBLE |
| Invoices exist in system | YES - 7 invoices on /invoices page |
| API request status | 307 (redirect) - may need investigation |

## Root Cause Analysis

### Current Filter Logic (PaymentPlansPage.tsx lines 100-103)

```tsx
.filter((inv) => inv.total > 0 && inv.status !== "paid" && inv.status !== "void");
```

The filter requires:
1. `inv.total > 0` - Invoice must have positive total
2. `inv.status !== "paid"` - Not paid
3. `inv.status !== "void"` - Not voided

### The Problem

Looking at the Invoices page, all 7 invoices show **$0.00 total**. This means:
- The `inv.total > 0` condition fails for ALL invoices
- Therefore, ZERO invoices pass the filter
- The dropdown is empty

### Invoice Data Example (from Invoices page)

| Invoice | Status | Total |
|---------|--------|-------|
| INV-20260126-0396 | Sent | $0.00 |
| INV-20260126-C4F9 | Draft | $0.00 |
| INV-20260125-4DC5 | Draft | $0.00 |
| ... | ... | $0.00 |

All invoices have $0.00 total - likely test/demo data without line items.

## Solution Options

### Option 1: Remove or relax the total > 0 filter
Allow invoices with $0 total for testing purposes. Risk: Users could create payment plans for $0 invoices.

### Option 2: Allow invoices with balance_due > 0 OR total > 0
More permissive filter that checks either field.

### Option 3: Allow ALL non-paid, non-void invoices
Remove the total check entirely and rely only on status.

### Recommendation

For a functional system, use Option 3 - allow all invoices that aren't paid or voided. The user can always choose not to create a payment plan for a $0 invoice. Better to show invoices and let users decide than to hide them.

## Fix Required

Change line 103 in PaymentPlansPage.tsx from:

```tsx
.filter((inv) => inv.total > 0 && inv.status !== "paid" && inv.status !== "void");
```

To:

```tsx
.filter((inv) => inv.status !== "paid" && inv.status !== "void");
```

This will show all Draft, Sent, and Overdue invoices in the dropdown, regardless of their total amount.
