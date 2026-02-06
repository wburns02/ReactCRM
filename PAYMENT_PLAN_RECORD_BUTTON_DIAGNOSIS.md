# Payment Plan Record Payment Button - Diagnosis

## Bug Description
The "Record Payment" button on the Payment Plan detail page does nothing when clicked. No form opens, no network request, no console error - silent failure.

## Root Cause
**Issue 1: Button Has No onClick Handler**

Looking at `PaymentPlanDetailPage.tsx` lines 237-239:
```tsx
<Button className="w-full" variant="primary">
  Record Payment
</Button>
```

The button had **NO onClick handler** - it was completely inert.

**Issue 2: No Modal State or Form Component**

The component:
- Had no `useState` for controlling a modal
- Didn't import any payment recording modal/form
- Had no logic to handle payment recording

**Issue 3: Backend Missing Payment Recording Endpoint**

The backend had no endpoint for recording payments against plans:
- POST /payment-plans/{plan_id}/payments - did not exist

## Fix Applied

### Frontend Changes (ReactCRM)
1. Created `src/api/hooks/usePaymentPlans.ts` with `useRecordPaymentPlanPayment` mutation
2. Updated `PaymentPlanDetailPage.tsx`:
   - Added `useState` for modal visibility
   - Added `useRecordPaymentPlanPayment` hook
   - Wired `onClick` handler to button
   - Added `PaymentForm` component
   - Added success/error toasts

### Backend Changes (react-crm-api)
1. Added `RecordPaymentRequest` Pydantic schema
2. Added `POST /{plan_id}/payments` endpoint that:
   - Accepts amount, payment_method, payment_date, notes
   - Updates amount_paid and remaining balance
   - Auto-completes plan if fully paid
   - Reverts overdue status to active on payment

## Commits
- Frontend: `feat: Wire Record Payment button on Payment Plan detail page`
- Backend: `feat: Add POST /payment-plans/{plan_id}/payments endpoint`

## Status
FIXED - Changes pushed to GitHub and deploying to Railway.
