# Customer & Technician Click Fix Plan

## Overview
Add full-row click navigation to customer and technician list rows.

## Components to Modify

### 1. CustomersList.tsx
- **TableCustomerRow**: Add onClick to `<tr>` with useNavigate
- **MobileCustomerCard**: Add onClick to `<Card>` wrapper

### 2. TechniciansList.tsx
- **TableTechnicianRow**: Add onClick to `<tr>` with useNavigate

## Implementation Details

### Step 1: Add useNavigate hook
```tsx
import { Link, useNavigate } from "react-router-dom";
```

### Step 2: Add onClick to table rows
```tsx
const navigate = useNavigate();

<tr
  className="hover:bg-bg-hover transition-colors cursor-pointer"
  tabIndex={0}
  onClick={() => navigate(`/customers/${customer.id}`)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      navigate(`/customers/${customer.id}`);
    }
  }}
>
```

### Step 3: Prevent double-navigation on action buttons
Add `e.stopPropagation()` to all button onClick handlers:
```tsx
<Button onClick={(e) => { e.stopPropagation(); onEdit(customer); }}>
  Edit
</Button>
```

### Step 4: Prevent navigation when clicking links (email/phone)
Add stopPropagation to anchor tags:
```tsx
<a href={`mailto:${email}`} onClick={(e) => e.stopPropagation()}>
```

## Accessibility Considerations
- Keep `tabIndex={0}` on rows for keyboard navigation
- Add `onKeyDown` handler for Enter/Space to navigate
- Add `role="button"` or use proper ARIA for clickable rows
- Ensure focus styles are visible

## Styling
- Add `cursor-pointer` class to rows
- Keep existing hover effects

## Files Changed
1. src/features/customers/CustomersList.tsx
2. src/features/technicians/TechniciansList.tsx

## Testing Checklist
- [ ] Click customer name → navigates to detail
- [ ] Click customer phone → navigates to detail
- [ ] Click customer email → opens mail client (NOT navigate)
- [ ] Click empty space on row → navigates to detail
- [ ] Click View button → navigates to detail
- [ ] Click Edit button → opens edit modal (no navigation)
- [ ] Click Delete button → shows delete confirm (no navigation)
- [ ] Press Enter on focused row → navigates to detail
- [ ] Same tests for Technicians page
