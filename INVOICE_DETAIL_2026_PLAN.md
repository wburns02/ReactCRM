# Invoice Detail Page 2026 - Implementation Plan

## Date: 2026-01-26

## Goal
Transform the Invoice Detail Page into a premium 2026 experience with enhanced actions, better visual hierarchy, and modern UX patterns.

## Existing Resources to Leverage

### Available Hooks (from usePayments.ts)
- `useGenerateInvoicePDF()` - Returns blob URL for PDF download
- `useSendInvoiceEmail()` - Send with email, includePaymentLink option
- `useGeneratePaymentLink()` - Returns URL + QR code for online payment
- `useDownloadReceipt()` - Download payment receipts

### Existing UI Patterns
- InvoiceGenerator.tsx has email send dialog pattern
- Dialog component supports sm/md/lg/xl/2xl sizes
- Button component has primary/secondary/danger/ghost/outline variants

## Implementation Plan

### Phase 1: Add Action Bar with PDF/Email/Pay Buttons

**Goal**: Replace current action buttons with a premium action bar

**Changes to InvoiceDetailPage.tsx:**

1. Add imports for payment hooks:
```tsx
import {
  useGenerateInvoicePDF,
  useSendInvoiceEmail,
  useGeneratePaymentLink,
} from "@/features/workorders/Payments/hooks/usePayments.ts";
```

2. Add state for modals:
```tsx
const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
const [sendEmail, setSendEmail] = useState("");
const [emailMessage, setEmailMessage] = useState("");
```

3. Add mutation hooks:
```tsx
const pdfMutation = useGenerateInvoicePDF();
const emailMutation = useSendInvoiceEmail();
const paymentLinkMutation = useGeneratePaymentLink();
```

4. Create action handlers:
```tsx
const handleDownloadPDF = async () => {
  if (!id) return;
  const result = await pdfMutation.mutateAsync(id);
  // Create download link
  const link = document.createElement("a");
  link.href = result.url;
  link.download = `Invoice-${invoice?.invoice_number || id}.pdf`;
  link.click();
  window.URL.revokeObjectURL(result.url);
};

const handleSendEmail = async () => {
  if (!id || !sendEmail) return;
  await emailMutation.mutateAsync({
    invoiceId: id,
    email: sendEmail,
    includePaymentLink: true,
  });
  setIsEmailModalOpen(false);
};

const handlePayOnline = async () => {
  if (!id) return;
  const result = await paymentLinkMutation.mutateAsync(id);
  // Open payment page in new tab
  window.open(result.url, "_blank");
};
```

5. Create new action bar component (inline):
```tsx
{/* Premium Action Bar */}
<div className="flex flex-wrap items-center gap-3">
  {/* Download PDF */}
  <Button
    variant="outline"
    onClick={handleDownloadPDF}
    disabled={pdfMutation.isPending}
  >
    <DownloadIcon className="h-4 w-4 mr-2" />
    {pdfMutation.isPending ? "Generating..." : "Download PDF"}
  </Button>

  {/* Send Email */}
  <Button
    variant="outline"
    onClick={() => {
      setSendEmail(invoice?.customer?.email || "");
      setIsEmailModalOpen(true);
    }}
  >
    <MailIcon className="h-4 w-4 mr-2" />
    Send Email
  </Button>

  {/* Pay Online - only for unpaid */}
  {invoice?.status !== "paid" && invoice?.status !== "void" && (
    <Button
      variant="primary"
      onClick={handlePayOnline}
      disabled={paymentLinkMutation.isPending}
    >
      <CreditCardIcon className="h-4 w-4 mr-2" />
      {paymentLinkMutation.isPending ? "Loading..." : "Pay Online"}
    </Button>
  )}

  {/* Existing buttons */}
  <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
    Edit
  </Button>
  <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
    Delete
  </Button>
</div>
```

### Phase 2: Email Compose Modal

Add a proper email compose modal with subject/message editing:

```tsx
{/* Email Compose Modal */}
<Dialog open={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)}>
  <DialogContent size="md">
    <DialogHeader onClose={() => setIsEmailModalOpen(false)}>
      Send Invoice via Email
    </DialogHeader>
    <DialogBody>
      <div className="space-y-4">
        <div>
          <Label htmlFor="email-to">Recipient Email</Label>
          <Input
            id="email-to"
            type="email"
            value={sendEmail}
            onChange={(e) => setSendEmail(e.target.value)}
            placeholder="customer@example.com"
          />
        </div>
        <div>
          <Label htmlFor="email-message">Message (optional)</Label>
          <Textarea
            id="email-message"
            value={emailMessage}
            onChange={(e) => setEmailMessage(e.target.value)}
            placeholder="Add a personal message..."
            rows={4}
          />
        </div>
        <p className="text-sm text-text-muted">
          A payment link will be included in the email.
        </p>
      </div>
    </DialogBody>
    <DialogFooter>
      <Button variant="secondary" onClick={() => setIsEmailModalOpen(false)}>
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handleSendEmail}
        disabled={!sendEmail || emailMutation.isPending}
      >
        {emailMutation.isPending ? "Sending..." : "Send Invoice"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Phase 3: Improved Totals Display

Replace the basic totals with a premium breakdown:

```tsx
{/* Premium Totals Card */}
<Card>
  <CardContent className="py-6">
    <div className="space-y-3">
      <div className="flex justify-between text-base text-text-secondary">
        <span>Subtotal</span>
        <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
      </div>

      {invoice.tax > 0 && (
        <div className="flex justify-between text-base text-text-secondary">
          <span>Tax ({invoice.tax_rate}%)</span>
          <span className="font-medium">{formatCurrency(invoice.tax)}</span>
        </div>
      )}

      <div className="border-t border-border my-3" />

      <div className="flex justify-between text-xl font-bold">
        <span className="text-text-primary">Total</span>
        <span className="text-primary">{formatCurrency(invoice.total)}</span>
      </div>

      {/* Balance Due for partial payments */}
      {invoice.status === "partial" && (
        <>
          <div className="flex justify-between text-base text-success">
            <span>Paid</span>
            <span>-{formatCurrency(invoice.amount_paid || 0)}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold text-danger">
            <span>Balance Due</span>
            <span>{formatCurrency(invoice.total - (invoice.amount_paid || 0))}</span>
          </div>
        </>
      )}
    </div>
  </CardContent>
</Card>
```

### Phase 4: Print-Friendly Styles

Add print media queries for clean printing:

```tsx
{/* Add to main container */}
<div className="p-6 print:p-0 print:bg-white">

  {/* Hide non-printable elements */}
  <div className="print:hidden">
    {/* Action buttons, edit/delete, etc */}
  </div>

  {/* Printable content */}
  <div className="print:max-w-none">
    {/* Invoice content with print styles */}
  </div>
</div>
```

Add a Print button:
```tsx
<Button variant="ghost" onClick={() => window.print()}>
  <PrinterIcon className="h-4 w-4 mr-2" />
  Print
</Button>
```

### Phase 5: Mobile Optimizations

1. Stack action buttons on mobile:
```tsx
<div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
```

2. Make totals full-width on mobile:
```tsx
<div className="w-full sm:w-72 ml-auto">
```

3. Ensure touch-friendly button sizes:
```tsx
<Button className="min-h-[44px] sm:min-h-0">
```

## Files to Modify

| File | Changes |
|------|---------|
| `/src/features/invoicing/InvoiceDetailPage.tsx` | Main enhancements |

## Success Criteria

1. Download PDF button works - downloads `Invoice-{number}.pdf`
2. Send Email button opens compose modal
3. Pay Online button opens payment link in new tab
4. Print button triggers clean print dialog
5. Totals display shows subtotal/tax/total with visual hierarchy
6. Mobile layout works with stacked buttons
7. All E2E tests pass

## E2E Test Plan

Create `/e2e/tests/invoice-detail-2026.e2e.spec.ts`:

1. Navigate to invoice detail page
2. Verify Download PDF button visible
3. Verify Send Email button visible
4. Verify Pay Online button visible (for unpaid invoices)
5. Click Send Email - verify modal opens
6. Verify totals display correctly
7. Test print button (triggers window.print)
8. No console errors

## Implementation Order

1. Add PDF download button (simple, high impact)
2. Add email compose modal
3. Add Pay Online button with payment link
4. Update totals display
5. Add print button and print styles
6. Mobile responsive adjustments
7. Write E2E tests
8. Deploy and verify
