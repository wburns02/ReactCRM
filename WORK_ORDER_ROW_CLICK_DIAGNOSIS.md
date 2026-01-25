# Work Order Row Click Diagnosis

## Date: 2026-01-25

## Problem Statement
On the Work Orders list page, only the small "View" text/button opens work order details. Clicking anywhere else on the work order row or card (customer name, address, service type, date, status, etc.) does nothing.

User expectation in 2025-2026: The entire work order row should be clickable to navigate to details.

## Root Cause Analysis

### Files Analyzed
1. `/src/features/workorders/WorkOrdersList.tsx` - Main list component
2. `/src/features/workorders/components/WorkOrderCard.tsx` - Card component (for Kanban view)
3. `/src/features/workorders/WorkOrdersPage.tsx` - Page container

### Finding: Missing onClick Handlers

#### TableWorkOrderRow (lines 195-282 in WorkOrdersList.tsx)
```tsx
<tr className="hover:bg-bg-hover transition-colors" tabIndex={0}>
  // ... cells with data ...
  <td className="px-4 py-3 text-right">
    <Link to={`/work-orders/${wo.id}`}>
      <Button variant="ghost" size="sm">View</Button>
    </Link>
  </td>
</tr>
```

**Issue**: The `<tr>` has `tabIndex={0}` but NO `onClick` or `onKeyDown` handlers. Only the "View" button inside the Link navigates.

#### MobileWorkOrderCard (lines 84-190)
```tsx
<Card className="p-4">
  // ... card content ...
  <Link to={`/work-orders/${wo.id}`} className="flex-1">
    <Button variant="primary" size="sm" className="w-full">View</Button>
  </Link>
</Card>
```

**Issue**: The Card component has NO `onClick` handler. Only the "View" button navigates.

### Comparison with CustomersList.tsx (Working Implementation)

The CustomersList.tsx correctly implements row navigation:

```tsx
const handleRowClick = (e: React.MouseEvent) => {
  // Don't navigate if clicking interactive elements
  if ((e.target as HTMLElement).closest('a, button')) {
    return;
  }
  navigate(`/customers/${customer.id}`);
};

const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    navigate(`/customers/${customer.id}`);
  }
};

<tr
  className="hover:bg-bg-hover transition-colors cursor-pointer"
  tabIndex={0}
  onClick={handleRowClick}
  onKeyDown={handleKeyDown}
  role="row"
  aria-label={`View ${customer.first_name} ${customer.last_name}`}
>
```

Key differences:
- Has `onClick={handleRowClick}`
- Has `onKeyDown={handleKeyDown}` for keyboard navigation
- Has `cursor-pointer` class
- Uses `useNavigate()` hook
- Has proper ARIA attributes

## Root Cause Summary

The WorkOrdersList.tsx component is missing:
1. `useNavigate` hook import and usage
2. `onClick` handler on `<tr>` element
3. `onKeyDown` handler for keyboard navigation (Enter/Space)
4. `cursor-pointer` CSS class for visual affordance
5. Proper ARIA attributes for accessibility

The same issues exist in MobileWorkOrderCard.

## Fix Required

1. Import `useNavigate` from react-router-dom
2. Add `handleRowClick` function that:
   - Checks if click target is an interactive element (a, button)
   - If not, navigates to `/work-orders/${wo.id}`
3. Add `handleKeyDown` for Enter/Space key navigation
4. Add `cursor-pointer` class to row
5. Add `role="row"` and `aria-label` for accessibility

## Impact
- Desktop table view: All 7 columns plus empty space will navigate
- Mobile card view: Full card will navigate
- View button: Still works (stopPropagation not needed, closest check prevents double nav)
- Edit/Delete buttons: Still work (closest check prevents nav on button clicks)
