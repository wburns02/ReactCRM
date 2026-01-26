# Invoice Detail Page - Current State Analysis

## Date: 2026-01-26

## Overview

The Invoice Detail Page (`/src/features/invoicing/InvoiceDetailPage.tsx`) is a 608-line React component that displays invoice information. This document maps the current state to identify gaps for the 2026 enhancement.

## Current Features

### 1. Header Section
- **Back navigation** to invoices list
- **Invoice number** display (`INV-XXXX`)
- **Customer name** as subtitle
- **Action buttons**: Print, Download PDF (links to InvoiceGenerator), Pay Invoice (if pending)

### 2. Status Display
- Status badge with color coding (Draft, Sent, Paid, Overdue, Void)
- Due date display
- AI Payment Prediction widget (shows confidence % for payment likelihood)

### 3. Customer Information Card
- Customer name, email, phone
- Address fields
- Link to view customer profile

### 4. Line Items Table
- Service/Description columns
- Quantity, Rate, Amount
- Proper formatting

### 5. Totals Section
- Subtotal
- Tax (with rate %)
- Total amount
- Balance Due (for partial payments)

### 6. Notes & Terms
- Internal notes
- Customer-visible terms

### 7. Related Work Order
- Link to associated work order if exists

### 8. Financing Options
- Wisetack integration for customer financing

### 9. Quick Actions
- Mark as Paid button
- Send Invoice button (uses useSendInvoice hook)
- Edit Invoice link

## Existing Hooks Used

| Hook | Purpose |
|------|---------|
| `useInvoice(id)` | Fetch single invoice data |
| `useSendInvoice()` | Send invoice via email |
| `useMarkInvoicePaid()` | Mark invoice as paid |
| `useNavigate()` | Navigation |

## Related Components with Reusable Patterns

### InvoiceGenerator.tsx
Located at `/src/features/workorders/Payments/InvoiceGenerator.tsx`

**Features:**
- PDF preview in iframe
- Email compose modal
- `useGenerateInvoicePDF()` hook
- `useSendInvoiceEmail()` hook with recipient, subject, message

**Key Code:**
```tsx
const pdfMutation = useGenerateInvoicePDF();
const emailMutation = useSendInvoiceEmail();

// PDF generation
pdfMutation.mutate(invoiceId, {
  onSuccess: (data) => {
    // data.pdf_url for preview
  }
});

// Email send
emailMutation.mutate({
  invoiceId,
  recipient: email,
  subject: `Invoice ${invoiceNumber}`,
  message: customMessage
});
```

### useStripe.ts
Located at `/src/api/hooks/useStripe.ts`

**Available Hooks:**
- `useStripeConfig()` - Get Stripe publishable key
- `useCreatePaymentIntent()` - Create payment intent for amount
- `useConfirmPayment()` - Confirm payment with method
- `useCustomerPaymentMethods()` - Get saved payment methods

## Gaps Identified for 2026 Enhancement

### Missing: PDF Download Button
- Current: "Download PDF" links to InvoiceGenerator page
- Need: Direct download button on detail page

### Missing: Inline Email Compose
- Current: "Send Invoice" triggers basic mutation
- Need: Email compose modal with recipient, subject, message editing

### Missing: Online Payment Button
- Current: "Pay Invoice" text but no Stripe integration on this page
- Need: "Pay Now" button triggering Stripe checkout

### Missing: Attachments Section
- Current: No attachment display or upload
- Need: View/download attachments, photo gallery

### Missing: Activity Timeline
- Current: No history/audit trail
- Need: Timeline showing: Created, Sent, Viewed, Paid, etc.

### Missing: Print-Optimized Mode
- Current: Basic print styles
- Need: Clean branded print layout with @media print

### Missing: Mobile Optimizations
- Current: Basic responsive
- Need: Collapsible sections, swipe actions, touch-friendly buttons

## File Structure Recommendation

```
/src/features/invoicing/
├── InvoiceDetailPage.tsx        # Main page (enhance)
├── components/
│   ├── InvoiceHeader.tsx        # New: Header with actions
│   ├── InvoiceStatusCard.tsx    # New: Status + AI prediction
│   ├── InvoiceLineItems.tsx     # New: Line items table
│   ├── InvoiceTotals.tsx        # New: Totals section
│   ├── InvoiceTimeline.tsx      # New: Activity timeline
│   ├── InvoiceAttachments.tsx   # New: Attachments section
│   ├── InvoicePaymentModal.tsx  # New: Stripe payment modal
│   └── InvoiceEmailModal.tsx    # New: Email compose modal
```

## API Endpoints Needed

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/invoices/{id}` | GET | Fetch invoice | EXISTS |
| `/invoices/{id}/send` | POST | Send via email | EXISTS |
| `/invoices/{id}/pdf` | GET | Generate PDF | EXISTS |
| `/invoices/{id}/mark-paid` | POST | Mark as paid | EXISTS |
| `/invoices/{id}/timeline` | GET | Activity history | UNKNOWN |
| `/invoices/{id}/attachments` | GET | List attachments | UNKNOWN |
| `/payments/create-intent` | POST | Stripe payment intent | EXISTS |

## Priority Order for Enhancement

1. **High**: PDF Download Button (direct download)
2. **High**: Email Compose Modal (inline on page)
3. **High**: Online Payment Button (Stripe integration)
4. **Medium**: Improved Totals Display (visual hierarchy)
5. **Medium**: Print-Friendly Mode (@media print styles)
6. **Medium**: Activity Timeline (if API exists)
7. **Low**: Attachments Section (if API exists)
8. **Low**: Mobile Optimizations (responsive improvements)

## Conclusion

The current InvoiceDetailPage has solid foundations but needs enhancement for 2026 standards:
- Action buttons exist but need better implementation (direct PDF, email modal, Stripe payment)
- Visual hierarchy could be improved
- Timeline and attachments depend on backend support
- Print and mobile modes need attention

Ready for Phase 2: Implementation Plan
