# React Migration Work Prompt for Sonnet

## Context

The Mac Septic CRM is undergoing a React migration. We've successfully built:

### Already Completed
1. **Foundation** - React 19 + TypeScript + Vite + Tailwind v4 + TanStack Query v5
2. **Auth** - `useAuth` hook, `RequireAuth` wrapper, session-based auth with HTTP-only cookies
3. **UI Components** - Button, Input, Select, Badge, Card, Label, Textarea, Dialog/Modal, ApiError
4. **Prospects Module (COMPLETE)**
   - ProspectsPage with List/Pipeline toggle
   - ProspectsList with table view, pagination, search, filters
   - PipelineView with Kanban drag-drop using @dnd-kit
   - ProspectForm with React Hook Form + Zod validation
   - ProspectDetailPage with quick actions
   - All CRUD operations (create, read, update, delete, stage updates)
5. **Customers Module (PARTIAL)**
   - CustomersPage with basic layout
   - CustomersList with table view
   - CustomerFilters component
   - API hooks: useCustomers, useCustomer, useCreateCustomer, useUpdateCustomer, useDeleteCustomer

### Tech Stack Reference
- React 19 with TypeScript
- Vite 7 for build
- TanStack Query v5 for server state
- React Hook Form + Zod for forms
- @dnd-kit for drag-drop
- Tailwind CSS v4 with custom design tokens
- React Router v7

### Directory Structure
```
frontend-react/src/
├── api/
│   ├── client.ts              # Axios instance with credentials
│   ├── hooks/
│   │   ├── useProspects.ts    # ✓ Complete
│   │   └── useCustomers.ts    # ✓ Complete
│   └── types/
│       ├── common.ts          # Shared enums, pagination types
│       ├── prospect.ts        # ✓ Complete
│       └── customer.ts        # ✓ Complete
├── components/
│   ├── ui/                    # Shared UI primitives
│   ├── layout/
│   │   └── AppLayout.tsx      # Sidebar + main content
│   └── ErrorBoundary.tsx
├── features/
│   ├── auth/                  # ✓ Complete
│   ├── prospects/             # ✓ Complete
│   │   ├── ProspectsPage.tsx
│   │   ├── ProspectsList.tsx
│   │   ├── ProspectDetailPage.tsx
│   │   └── components/
│   │       ├── ProspectFilters.tsx
│   │       ├── ProspectForm.tsx
│   │       └── PipelineView.tsx
│   └── customers/             # IN PROGRESS
│       ├── CustomersPage.tsx
│       ├── CustomersList.tsx
│       └── components/
│           └── CustomerFilters.tsx
├── hooks/
│   └── useDebounce.ts         # ✓ Complete
├── lib/
│   ├── utils.ts               # cn() helper
│   └── feature-flags.ts       # Legacy URL fallbacks
└── routes/
    └── index.tsx              # Route definitions
```

---

## YOUR TASK: Complete Customers Module + Dashboard

### Phase 1: Customer Detail Page (Priority 1)

Create `CustomerDetailPage.tsx` following the Prospects pattern:

**Requirements:**
1. Route: `/app/customers/:id`
2. Fetch single customer via `useCustomer(id)` hook
3. Display all customer fields in organized sections:
   - Contact Info (name, email, phone, company)
   - Address (address_line1, city, state, postal_code)
   - Service Info (service_type, service_frequency, tank_size, num_bedrooms, last_service_date, next_service_due)
   - System Info (system_type, installation_date, access_notes)
   - Billing (billing_type, preferred_payment)
   - Notes (notes field)
4. Actions:
   - Edit button → opens CustomerForm modal
   - Delete button → confirm dialog
   - "View Work Orders" link (placeholder for now)
   - "Convert from Prospect" indicator if applicable
5. Breadcrumb: Customers > Customer Name

**Files to create:**
- `src/features/customers/CustomerDetailPage.tsx`
- Update `src/routes/index.tsx` to add route

### Phase 2: Customer Form (Priority 1)

Create `CustomerForm.tsx` for create/edit:

**Requirements:**
1. Use React Hook Form + Zod validation
2. Mirror the prospect form pattern with Dialog modal
3. Sections:
   - Contact Info: first_name*, last_name*, email, phone, company_name
   - Address: address_line1, city, state (2-char), postal_code
   - Service: service_type (select), service_frequency, tank_size, num_bedrooms
   - System: system_type, installation_date (date picker), access_notes
   - Billing: billing_type, preferred_payment
   - Notes: notes (textarea)
4. Props: `open`, `onClose`, `onSubmit`, `customer?` (for edit mode), `isLoading`

**Files to create:**
- `src/features/customers/components/CustomerForm.tsx`
- `src/api/types/customer.ts` - add `customerFormSchema` if not present

### Phase 3: Wire Up CustomersPage CRUD (Priority 1)

Update `CustomersPage.tsx` to match ProspectsPage functionality:

**Requirements:**
1. Add "Create Customer" button
2. Add create/edit modal using CustomerForm
3. Add delete confirmation dialog
4. Wire up mutations: useCreateCustomer, useUpdateCustomer, useDeleteCustomer
5. Add onEdit/onDelete handlers to CustomersList

### Phase 4: Dashboard Page (Priority 2)

Create a simple dashboard at `/app` or `/app/dashboard`:

**Requirements:**
1. Summary cards:
   - Total Prospects (count)
   - Total Customers (count)
   - Pipeline Value (sum of prospect estimated_value)
   - Upcoming Follow-ups (prospects with next_follow_up_date in next 7 days)
2. Recent Activity section:
   - Last 5 created/updated prospects
   - Last 5 created/updated customers
3. Quick actions:
   - "Add Prospect" button
   - "Add Customer" button
4. Use TanStack Query to fetch stats (may need new API endpoints or calculate from list data)

**Files to create:**
- `src/features/dashboard/DashboardPage.tsx`
- `src/api/hooks/useDashboardStats.ts` (if needed)
- Update routes

### Phase 5: Navigation Improvements (Priority 2)

Update `AppLayout.tsx` sidebar:
1. Add Dashboard link as first item
2. Add Customers link (currently only has Prospects)
3. Style active state correctly for all routes
4. Consider adding icons using standard Unicode or simple SVG

---

## Code Patterns to Follow

### Form Pattern (from ProspectForm.tsx)
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const { register, handleSubmit, formState: { errors, isDirty }, reset } = useForm<FormData>({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolver: zodResolver(formSchema) as any, // Zod v4 compatibility
  defaultValues: { ... }
});
```

### Type-only imports (TypeScript strict mode)
```tsx
import { type DragEndEvent } from '@dnd-kit/core'; // Use 'type' for type-only imports
```

### Dialog/Modal Pattern
```tsx
<Dialog open={isOpen} onClose={handleClose}>
  <DialogContent className="max-w-2xl">
    <DialogHeader title="Create Customer" />
    <DialogBody>
      {/* Form content */}
    </DialogBody>
    <DialogFooter>
      <Button variant="outline" onClick={handleClose}>Cancel</Button>
      <Button type="submit" isLoading={isLoading}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### API Hook Pattern
```tsx
export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: customerKeys.detail(id!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/customers/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
```

---

## Important Notes

1. **Test as you go**: Run `npm run build` after each major change to catch TypeScript errors
2. **Use existing components**: Check `src/components/ui/` before creating new ones
3. **Match existing styles**: Use the same Tailwind classes as ProspectsPage/ProspectDetailPage
4. **Handle loading/error states**: Always show loading spinners and error messages
5. **Keep legacy fallback**: Include "Classic View" links to legacy HTML pages

---

## API Endpoints Reference

### Customers API
- `GET /api/customers/` - List with pagination, search
- `GET /api/customers/:id` - Single customer
- `POST /api/customers/` - Create customer
- `PATCH /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Prospects API (reference)
- `GET /api/prospects/` - List with pagination, search, stage filter
- `GET /api/prospects/:id` - Single prospect
- `POST /api/prospects/` - Create
- `PATCH /api/prospects/:id` - Update
- `PATCH /api/prospects/:id/stage` - Update stage only
- `DELETE /api/prospects/:id` - Delete

---

## Verification Checklist

Before considering each phase complete:
- [ ] `npm run build` passes with no errors
- [ ] `npm test` passes all tests
- [ ] Page loads without console errors
- [ ] CRUD operations work (create, read, update, delete)
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Mobile responsive (basic)

---

## Start Here

1. Read the existing CustomersList.tsx and CustomersPage.tsx to understand current state
2. Read ProspectDetailPage.tsx as the pattern to follow
3. Start with Phase 1: CustomerDetailPage
4. Build iteratively, testing each component

Good luck!
