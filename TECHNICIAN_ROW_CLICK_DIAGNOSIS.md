# Technician Row Click Diagnosis

## Issue Summary
On the Technicians list page, clicking anywhere on a technician row (name, phone, email, skills, status, empty space) does nothing. Only the small "View" text in the Actions column navigates to the technician detail page.

## Root Cause Analysis

### Location
`/home/will/projects/ReactCRM/src/features/technicians/TechniciansList.tsx`

### Component: `TableTechnicianRow` (lines 20-124)

### Current Implementation (PROBLEMATIC)
```tsx
<tr className="hover:bg-bg-hover transition-colors" tabIndex={0}>
  {/* ... row content ... */}
  <td className="px-4 py-3 text-right">
    <div className="flex justify-end gap-2">
      <Link to={`/technicians/${technician.id}`}>
        <Button variant="ghost" size="sm">View</Button>
      </Link>
      {/* Edit and Delete buttons */}
    </div>
  </td>
</tr>
```

### Missing Elements
1. **No `onClick` handler on `<tr>`** - The row element has no click handler
2. **No `onKeyDown` handler** - No keyboard navigation support
3. **Missing `cursor-pointer` class** - No visual cue that the row is clickable
4. **Missing `role="row"`** - Accessibility attribute missing
5. **Missing `aria-label`** - Screen reader description missing

## Comparison with Working Pages

### CustomersList.tsx and WorkOrdersList.tsx Pattern (CORRECT)
Both use this consistent pattern:

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

return (
  <tr
    className="hover:bg-bg-hover transition-colors cursor-pointer"
    tabIndex={0}
    onClick={handleRowClick}
    onKeyDown={handleKeyDown}
    role="row"
    aria-label={`View ${customer.first_name} ${customer.last_name}`}
  >
```

## Technical Details

### Why Event Delegation Pattern
- `.closest('a, button')` check prevents double navigation when clicking the View/Edit/Delete buttons
- The email `<a>` link also needs to work independently (mailto:)
- This pattern lets interactive child elements function normally

### Keyboard Accessibility
- `tabIndex={0}` makes the row focusable (already present but useless without handlers)
- `onKeyDown` with Enter/Space triggers navigation for keyboard users

### Visual Affordance
- `cursor-pointer` tells users the row is clickable
- `hover:bg-bg-hover` provides hover feedback (already present)

## Confirmed Behavior (Manual Testing Required)
1. Login with will@macseptic.com / #Espn2025
2. Navigate to https://react.ecbtx.com/technicians
3. Click technician name - **EXPECTED: nothing happens** (row click missing)
4. Click phone number - **EXPECTED: nothing happens**
5. Click email - **EXPECTED: opens mailto** (this is the email link, not row navigation)
6. Click skills badge - **EXPECTED: nothing happens**
7. Click status badge - **EXPECTED: nothing happens**
8. Click empty space - **EXPECTED: nothing happens**
9. Click "View" text - **EXPECTED: navigates to detail page** (this works)

## Root Cause Verdict
**MISSING onClick HANDLER** - The `<tr>` element in TechniciansList.tsx never had row-level click navigation implemented. The feature was simply not built to match the CustomersList and WorkOrdersList patterns.

---
Diagnosis completed: 2026-01-25
