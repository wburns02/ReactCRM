# Work Order Row Click Implementation Plan

## Date: 2026-01-25

## Objective
Make the entire work order row/card clickable to navigate to the detail view, matching the pattern used in CustomersList.tsx.

## Implementation Steps

### 1. Update TableWorkOrderRow Component

**File**: `/src/features/workorders/WorkOrdersList.tsx`

Changes:
- Add `useNavigate` import from react-router-dom
- Add `handleRowClick` function with interactive element check
- Add `handleKeyDown` function for keyboard navigation
- Add `onClick`, `onKeyDown`, `role`, and `aria-label` to `<tr>`
- Add `cursor-pointer` class

```tsx
const TableWorkOrderRow = memo(function TableWorkOrderRow({
  wo,
  onEdit,
  onDelete,
}: WorkOrderRowProps) {
  const navigate = useNavigate();

  const handleRowClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) {
      return;
    }
    navigate(`/work-orders/${wo.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/work-orders/${wo.id}`);
    }
  };

  return (
    <tr
      className="hover:bg-bg-hover transition-colors cursor-pointer"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      role="row"
      aria-label={`View work order for ${customerName}`}
    >
      // ... existing cells ...
    </tr>
  );
});
```

### 2. Update MobileWorkOrderCard Component

Same changes for mobile card:
- Add `useNavigate`
- Add click/keyboard handlers
- Add `cursor-pointer` class
- Add accessibility attributes

```tsx
const MobileWorkOrderCard = memo(function MobileWorkOrderCard({
  wo,
  onEdit,
  onDelete,
}: WorkOrderRowProps) {
  const navigate = useNavigate();

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) {
      return;
    }
    navigate(`/work-orders/${wo.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/work-orders/${wo.id}`);
    }
  };

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`Work order for ${customerName}`}
    >
      // ... existing content ...
    </Card>
  );
});
```

### 3. UX Enhancements

- `cursor-pointer`: Visual indicator that row is clickable
- `hover:shadow-md` on cards: Feedback for hover state
- Keyboard navigation: Enter and Space keys trigger navigation
- ARIA labels: Screen reader accessibility

### 4. Preserve Existing Behavior

- View button still works (not blocked by handler)
- Edit button still works (closest check bypasses row click)
- Delete button still works (closest check bypasses row click)
- Email/phone links (if any) still work

## Testing Checklist

After implementation:
1. [ ] Click customer name - navigates to detail
2. [ ] Click address - navigates to detail
3. [ ] Click service type/job type - navigates to detail
4. [ ] Click date column - navigates to detail
5. [ ] Click status badge - navigates to detail
6. [ ] Click empty space in row - navigates to detail
7. [ ] Click View button - navigates to detail
8. [ ] Click Edit button - opens edit modal (no navigation)
9. [ ] Click Delete button - opens delete dialog (no navigation)
10. [ ] Press Enter on focused row - navigates to detail
11. [ ] Press Space on focused row - navigates to detail
12. [ ] Test on mobile view (card layout)
13. [ ] Cursor changes to pointer on hover
14. [ ] Row has hover background effect

## Consistency Notes

This implementation matches:
- CustomersList.tsx (fully implemented)
- Future updates to TechniciansList.tsx (also needs same fix)
