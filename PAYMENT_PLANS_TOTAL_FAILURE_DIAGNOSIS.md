# Payment Plans Total Failure Diagnosis

## Date: 2026-01-26

## Summary
Payment Plans page has data loading but **row click and View button do NOT navigate**.

## Test Results

| Feature | Status | Details |
|---------|--------|---------|
| Page loads | ✅ WORKS | Data displays in table |
| Create button | ✅ WORKS | Opens modal dialog |
| Row click | ❌ BROKEN | No onClick handler on `<tr>` |
| View button | ❌ BROKEN | No onClick handler on button |
| Detail page | ❌ MISSING | No route for `/billing/payment-plans/:id` |

## Root Causes

### 1. Row is NOT clickable (Line 501)
```tsx
<tr key={plan.id} className="hover:bg-bg-hover">
```
**Missing:** `onClick`, `cursor-pointer`, `tabIndex`, `onKeyDown`

### 2. View button has NO onClick (Lines 533-535)
```tsx
<button className="text-primary hover:underline text-sm">
  View
</button>
```
**Missing:** onClick handler

### 3. No detail page route exists
Only this route exists:
```tsx
path="billing/payment-plans"
```
**Missing:** `billing/payment-plans/:id` route

### 4. No detail page component
There's no `PaymentPlanDetailPage.tsx` component.

## Fix Required

1. Add onClick handler to `<tr>` that navigates to detail
2. Add cursor-pointer and keyboard navigation to rows
3. Add onClick to View button OR convert to Link
4. Create PaymentPlanDetailPage component
5. Add route for `/billing/payment-plans/:id`

## Files to modify:
- `src/features/billing/pages/PaymentPlansPage.tsx` - add row onClick, fix View button
- `src/routes/index.tsx` - add detail route
- NEW: `src/features/billing/pages/PaymentPlanDetailPage.tsx` - create detail component
