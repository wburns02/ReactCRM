# Payment Plans Root Cause Analysis

## Summary

The Payment Plans page had missing interactivity due to incomplete event handlers in the local codebase.

## Root Cause

The `PaymentPlansPage.tsx` component was missing:

1. **Create Button Handler**
   - Button had no `onClick` handler
   - No modal state management
   - No form for creating payment plans

2. **Table Row Click Navigation**
   - Rows had `hover:bg-bg-hover` but no `cursor-pointer`
   - No `onClick` handler to navigate to detail page
   - No keyboard accessibility (tabIndex, onKeyDown)

3. **View Button Handler**
   - View button was a plain `<button>` with no `onClick`
   - Should use `e.stopPropagation()` to prevent row click
   - Missing Link or navigation logic

4. **Stats Display**
   - Stats cards showed static `--` placeholders
   - No query to fetch `/payment-plans/stats/summary`

5. **Missing Detail Route**
   - No route defined for `/billing/payment-plans/:id`
   - No `PaymentPlanDetailPage` component

## Production vs Local Discrepancy

**Interesting Finding**: The production deployment at https://react.ecbtx.com HAD working functionality:
- Modal appeared on Create button click
- Row clicks navigated to detail page
- Rows had `cursor-pointer` class

This suggests:
- The local codebase is outdated
- Production was deployed from a different source (possibly GitHub)
- The local folder lacks `.git` version control

## Code Analysis

### Before (Broken)
```tsx
// Create button - no handler
<button className="...">Create Payment Plan</button>

// Table row - no click handler
<tr key={plan.id} className="hover:bg-bg-hover">

// View button - no handler
<button className="text-primary hover:underline text-sm">View</button>

// Stats - static placeholders
<p className="text-2xl font-bold text-success">--</p>
```

### After (Fixed)
```tsx
// Create button - with modal handler
<Button onClick={() => setShowCreateModal(true)}>Create Payment Plan</Button>

// Table row - with navigation
<tr
  key={plan.id}
  onClick={() => handleRowClick(plan.id)}
  className="hover:bg-bg-hover cursor-pointer transition-colors"
  tabIndex={0}
  role="button"
>

// View button - with navigation
<button onClick={(e) => handleViewClick(e, plan.id)}>View</button>

// Stats - fetched from API
<p className="text-2xl font-bold text-success">
  {stats?.active_plans ?? "--"}
</p>
```

## Fix Applied

1. Added `useState` for modal state and form data
2. Added `useNavigate` for navigation
3. Added `useMutation` for create operation
4. Added stats query to fetch summary data
5. Added `handleRowClick` and `handleViewClick` callbacks
6. Added Create Payment Plan modal with form
7. Created `PaymentPlanDetailPage` component
8. Added route for `/billing/payment-plans/:id`

## Files Changed

1. `/src/features/billing/pages/PaymentPlansPage.tsx` - Main fixes
2. `/src/features/billing/pages/PaymentPlanDetailPage.tsx` - New file
3. `/src/features/billing/index.ts` - Added export
4. `/src/routes/index.tsx` - Added detail route

## Verification

Build passes with no TypeScript errors.
