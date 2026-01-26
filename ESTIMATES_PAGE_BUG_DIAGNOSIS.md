# Estimates Page Bug Diagnosis

## Date: January 25, 2026

## Summary
The Estimates page loads but shows "No estimates found" and the Create Estimate button does nothing.

## Root Causes Identified

### 1. Backend: No `/api/v2/estimates` Endpoint
- **Finding**: The backend (`react-crm-api`) has NO `/api/v2/estimates` route
- **What exists**: Only `/api/v2/quotes` endpoint for quote/estimate management
- **File**: `/home/will/projects/react-crm-api/app/api/v2/quotes.py`
- **Router registration**: `api_router.include_router(quotes.router, prefix="/quotes", tags=["quotes"])`

### 2. Frontend: Wrong API Endpoint
- **File**: `/home/will/projects/ReactCRM/src/features/billing/pages/EstimatesPage.tsx`
- **Line 289**: `apiClient.get("/estimates")` - This endpoint doesn't exist!
- **Result**: Returns 404, catch block returns empty array `[]`

```typescript
// Current broken code (line 285-297)
const { data: estimates, isLoading } = useQuery({
  queryKey: ["estimates", filter],
  queryFn: async () => {
    try {
      const response = await apiClient.get("/estimates", {  // <-- 404!
        params: { status: filter !== "all" ? filter : undefined },
      });
      return response.data.items || response.data || [];
    } catch {
      return [];  // <-- Silently fails, shows empty
    }
  },
});
```

### 3. Frontend: Create Button Not Wired
- **Lines 325-327**: Create Estimate button has NO onClick handler

```tsx
// Current broken code
<button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
  Create Estimate
</button>
// ^^ No onClick! Does nothing when clicked
```

## Solution Architecture

The app treats "Estimates" and "Quotes" as the same concept:
- Backend: `/api/v2/quotes` handles all quote/estimate operations
- Frontend: `useQuotes` hook exists with full CRUD operations

### Fix Plan
1. **Change EstimatesPage to use `/quotes` endpoint** via existing `useQuotes` hook
2. **Wire Create Estimate button** to open a create modal or navigate to create page
3. **Map quote data to estimate display** (quote_number → estimate number, etc.)

## Existing Assets to Reuse
- `useQuotes()` hook - fetch quotes list
- `useCreateQuote()` hook - create new quote
- `Quote` type and `QuoteFormData` type
- `quoteStatusSchema` - draft, sent, accepted, declined, expired

## Files to Modify
1. `/home/will/projects/ReactCRM/src/features/billing/pages/EstimatesPage.tsx`

## Verification
After fix:
- GET `/api/v2/quotes` should return 200
- Estimates list should display quote data
- Create Estimate button should open form/modal
- No console errors
