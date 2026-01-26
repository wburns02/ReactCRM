# Estimates Page Fix Plan

## Overview
Fix the Estimates page to load data from `/api/v2/quotes` and wire the Create Estimate button.

## Changes

### 1. EstimatesPage.tsx - Use Quotes API

**Replace** direct API call with `useQuotes` hook:

```typescript
// OLD (broken)
const { data: estimates, isLoading } = useQuery({
  queryKey: ["estimates", filter],
  queryFn: async () => {
    const response = await apiClient.get("/estimates", {...});
    return response.data.items || response.data || [];
  },
});

// NEW (fixed)
import { useQuotes, useCreateQuote } from "@/api/hooks/useQuotes";
import type { Quote, QuoteFormData } from "@/api/types/quote";

const { data: quotesData, isLoading } = useQuotes({
  status: filter !== "all" ? filter : undefined,
});
const estimates = quotesData?.items || [];
```

### 2. Create Estimate Modal

Add state and modal for creating estimates:

```typescript
const [showCreateModal, setShowCreateModal] = useState(false);
const createQuote = useCreateQuote();

// Button onClick
<Button onClick={() => setShowCreateModal(true)}>
  Create Estimate
</Button>

// Modal with form
{showCreateModal && (
  <EstimateFormModal
    onClose={() => setShowCreateModal(false)}
    onSubmit={async (data) => {
      await createQuote.mutateAsync(data);
      setShowCreateModal(false);
    }}
  />
)}
```

### 3. Estimate Form Modal Component

Create inline modal with:
- Customer selector
- Line items (service, description, quantity, rate)
- Tax rate
- Valid until date
- Notes

### 4. Type Mapping

Map Quote fields to Estimate display:
- `quote_number` → displayed as estimate number
- `customer_name` → from nested `customer` object or `customer_name` field
- `status` → same statuses work (draft, sent, accepted, declined)
- `total` → same
- `created_at`, `valid_until` → same

### 5. Update Detail Link

Change link from `/estimates/{id}` to handle quote IDs properly.

## Implementation Order

1. Add imports for useQuotes, Quote types
2. Replace useQuery with useQuotes hook
3. Add showCreateModal state
4. Wire Create Estimate button onClick
5. Create inline EstimateFormModal
6. Test list loading
7. Test create flow
8. Add error handling/loading states

## Files Modified
- `src/features/billing/pages/EstimatesPage.tsx`

## Verification Checklist
- [ ] Page loads without 404 errors
- [ ] Estimates list shows data (or proper empty state)
- [ ] Create Estimate button opens modal
- [ ] Form submits and creates quote
- [ ] New estimate appears in list
- [ ] Filter buttons work
- [ ] No console errors
