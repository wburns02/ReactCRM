# Customer Row Click Implementation Plan

## Goal
Make the entire customer row/card clickable to navigate to customer details, matching modern 2025-2026 UX patterns.

## Changes Required

### 1. Add useNavigate hook
Import `useNavigate` from react-router-dom and create navigation handler.

### 2. TableCustomerRow Changes
```tsx
const TableCustomerRow = memo(function TableCustomerRow({
  customer,
  onEdit,
  onDelete,
}: CustomerRowProps) {
  const navigate = useNavigate();

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

  return (
    <tr
      className="hover:bg-bg-hover transition-colors cursor-pointer"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      role="row"
      aria-label={`View ${customer.first_name} ${customer.last_name}`}
    >
      // ... existing content ...
    </tr>
  );
});
```

### 3. MobileCustomerCard Changes
```tsx
const MobileCustomerCard = memo(function MobileCustomerCard({
  customer,
  onEdit,
  onDelete,
}: CustomerRowProps) {
  const navigate = useNavigate();

  const handleCardClick = (e: React.MouseEvent) => {
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

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`Customer: ${customer.first_name} ${customer.last_name}`}
    >
      // ... existing content ...
    </Card>
  );
});
```

### 4. Accessibility Enhancements
- `tabIndex={0}` for keyboard focus (already on tr, add to Card)
- `role` attributes for semantic meaning
- `aria-label` for screen readers
- Keyboard navigation with Enter/Space

### 5. Visual Feedback
- `cursor-pointer` on both row and card
- Hover effect already exists on row, add subtle shadow on card

## Implementation Order
1. Add useNavigate import
2. Update TableCustomerRow with click/keyboard handlers
3. Update MobileCustomerCard with click/keyboard handlers
4. Test all interactive elements still work
5. Verify navigation works from all areas

## Testing Checklist
- [ ] Click customer name - navigates
- [ ] Click phone number area - navigates
- [ ] Click address area - navigates
- [ ] Click empty space - navigates
- [ ] Click email link - opens email (no navigation)
- [ ] Click phone link - opens dialer (no navigation)
- [ ] Click Edit button - opens edit modal
- [ ] Click Delete button - opens delete confirmation
- [ ] Click View button - navigates
- [ ] Press Enter on focused row - navigates
- [ ] Press Space on focused row - navigates
- [ ] Multiple rows work correctly
