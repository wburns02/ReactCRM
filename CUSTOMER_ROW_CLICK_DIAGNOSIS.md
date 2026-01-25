# Customer Row Click Diagnosis

## Summary
**Root Cause:** Neither the desktop table row nor mobile card has an onClick handler. Only the "View" button navigates.

## File Location
`/home/will/projects/ReactCRM/src/features/customers/CustomersList.tsx`

## Desktop View - TableCustomerRow (lines 128-229)

### Current State:
```tsx
<tr className="hover:bg-bg-hover transition-colors" tabIndex={0}>
  // ... content ...
  <Link to={`/customers/${customer.id}`}>
    <Button variant="ghost" size="sm">View</Button>
  </Link>
</tr>
```

### Problems:
1. `<tr>` has NO `onClick` handler
2. Only the View button has navigation via `<Link>`
3. Has `tabIndex={0}` but no keyboard handler
4. No `cursor-pointer` to indicate clickability

## Mobile View - MobileCustomerCard (lines 24-123)

### Current State:
```tsx
<Card className="p-4">
  // ... content ...
  <Link to={`/customers/${customer.id}`} className="flex-1">
    <Button variant="primary" size="sm">View</Button>
  </Link>
</Card>
```

### Problems:
1. `<Card>` has NO `onClick` handler
2. Only the View button has navigation
3. No keyboard navigation support
4. No cursor pointer

## Interactive Elements That Need Event Propagation Stop
- Email links (`<a href="mailto:...">`)
- Phone links (`<a href="tel:...">`)
- Edit button
- Delete button
- View button (to avoid double navigation)

## Fix Required
1. Add `onClick` with `useNavigate()` to both components
2. Add `cursor-pointer` class
3. Add `onKeyDown` for Enter/Space keyboard navigation
4. Add `e.stopPropagation()` on all interactive child elements
5. Add proper ARIA attributes for accessibility
