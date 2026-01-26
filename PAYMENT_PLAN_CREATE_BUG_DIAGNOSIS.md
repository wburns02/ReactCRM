# Payment Plan Create Bug Diagnosis

## Date: 2026-01-26

## Summary
The "Create Payment Plan" button on the Payment Plans page does absolutely nothing when clicked because it has no onClick handler.

## Root Cause

**Location**: `/src/features/billing/pages/PaymentPlansPage.tsx` lines 92-94

**Problem**: The button is a plain HTML button with no onClick handler:
```tsx
<button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
  Create Payment Plan
</button>
```

**Missing Components**:
1. No onClick handler on the button
2. No modal state management
3. No create payment plan modal/form component
4. No mutation hook for creating payment plans
5. No backend POST endpoint integration

## Fix Required

1. Add state for modal visibility: `const [showCreateModal, setShowCreateModal] = useState(false)`
2. Add onClick to button: `onClick={() => setShowCreateModal(true)}`
3. Create a `CreatePaymentPlanModal` component with:
   - Customer selection (or invoice selection)
   - Total amount input
   - Installments input
   - Frequency selection (weekly, biweekly, monthly)
   - Submit button that calls mutation
4. Add mutation hook using `useMutation` from react-query
5. Wire to backend POST `/payment-plans/` endpoint
6. Add success toast and list refresh on success
7. Add error handling with user feedback

## Backend Verification

The POST `/payment-plans/` endpoint already exists (created earlier) and accepts:
```json
{
  "customer_id": 123,
  "invoice_id": 456,
  "total_amount": 1000.00,
  "installments": 4,
  "frequency": "monthly"
}
```

## Conclusion

This is a simple case of an incomplete implementation - the button exists but has no functionality wired up.
