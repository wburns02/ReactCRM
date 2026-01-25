# Technician Row Click Implementation Plan

## Objective
Make the entire technician row clickable to navigate to technician details, consistent with Customers and Work Orders pages.

## Implementation Steps

### Step 1: Add useNavigate Import
Add React Router's `useNavigate` hook to the imports:
```tsx
import { Link, useNavigate } from "react-router-dom";
```

### Step 2: Create Row Click Handler
Inside `TableTechnicianRow` component, add:
```tsx
const navigate = useNavigate();

const handleRowClick = (e: React.MouseEvent) => {
  // Don't navigate if clicking interactive elements (links, buttons)
  if ((e.target as HTMLElement).closest('a, button')) {
    return;
  }
  navigate(`/technicians/${technician.id}`);
};
```

### Step 3: Create Keyboard Handler
Add keyboard navigation support:
```tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    navigate(`/technicians/${technician.id}`);
  }
};
```

### Step 4: Update TR Element
Modify the `<tr>` element to include:
- `onClick={handleRowClick}`
- `onKeyDown={handleKeyDown}`
- `cursor-pointer` class
- `role="row"` attribute
- `aria-label` attribute

```tsx
<tr
  className="hover:bg-bg-hover transition-colors cursor-pointer"
  tabIndex={0}
  onClick={handleRowClick}
  onKeyDown={handleKeyDown}
  role="row"
  aria-label={`View ${technician.first_name} ${technician.last_name}`}
>
```

## Interactive Elements That Must Still Work
1. **Email link** (`<a href="mailto:...">`) - Opens email client
2. **View button** - Navigates to detail (redundant but preserved)
3. **Edit button** - Opens edit modal/form
4. **Delete button** - Opens delete confirmation

All these are covered by the `.closest('a, button')` check.

## Accessibility Considerations
- `tabIndex={0}` - Row is focusable with Tab key
- `role="row"` - Semantic role for assistive technology
- `aria-label` - Descriptive label for screen readers
- Keyboard navigation - Enter/Space triggers navigation
- Focus visible state - Already handled by global styles

## Visual Affordance
- `cursor-pointer` - Pointer cursor indicates clickability
- `hover:bg-bg-hover` - Already present, provides hover feedback

## Consistency Check
This implementation matches exactly:
- `/src/features/customers/CustomersList.tsx` - TableCustomerRow
- `/src/features/workorders/WorkOrdersList.tsx` - TableWorkOrderRow

## Testing Checklist
After implementation, verify:
1. [ ] Click technician name - navigates to detail
2. [ ] Click phone number - navigates to detail
3. [ ] Click skills badge - navigates to detail
4. [ ] Click status badge - navigates to detail
5. [ ] Click empty space in row - navigates to detail
6. [ ] Click email link - opens mailto (does NOT navigate)
7. [ ] Click View button - navigates to detail
8. [ ] Click Edit button - opens edit (does NOT navigate)
9. [ ] Click Delete button - opens delete (does NOT navigate)
10. [ ] Press Tab to focus row, then Enter - navigates
11. [ ] Press Tab to focus row, then Space - navigates
12. [ ] Works for multiple technicians

## Rollback Plan
If issues arise, revert to original `<tr>` without handlers.

---
Plan created: 2026-01-25
