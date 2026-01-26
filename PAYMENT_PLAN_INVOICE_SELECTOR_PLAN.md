# Payment Plan Invoice Selector - Fix Plan

## Date: 2026-01-26

## Objective

Make the invoice selector in Create Payment Plan modal load and display all available invoices correctly.

## Root Cause (Confirmed)

The filter `inv.total > 0` excludes all invoices because they all have $0.00 total.

## Solution

### Step 1: Relax the invoice filter

**File:** `src/features/billing/pages/PaymentPlansPage.tsx`

**Change line 100-103 from:**
```tsx
.filter((inv) => inv.total > 0 && inv.status !== "paid" && inv.status !== "void");
```

**To:**
```tsx
.filter((inv) => inv.status !== "paid" && inv.status !== "void");
```

This allows:
- Draft invoices (can be financed before sending)
- Sent invoices (awaiting payment)
- Overdue invoices (past due, need payment plan)

And excludes:
- Paid invoices (already paid, no plan needed)
- Void invoices (cancelled, not valid)

### Step 2: Update the balance_due calculation

Currently using fallback chain that might result in $0:
```tsx
balance_due: inv.balance_due ?? inv.amount_due ?? inv.total ?? 0,
```

Keep this as-is since the display should show the actual balance.

### Step 3: Update the "No invoices" message

Current message says "No unpaid invoices available" - this is correct.

### Testing Criteria

1. Open Create Payment Plan modal
2. Invoice dropdown shows all non-paid, non-void invoices
3. Can select an invoice
4. Invoice details display correctly
5. Can submit payment plan (if API supports)

## Files to Modify

1. `src/features/billing/pages/PaymentPlansPage.tsx` - Line 100-103

## Commits

1. "fix(payment-plans): Show all non-paid invoices in dropdown selector"
