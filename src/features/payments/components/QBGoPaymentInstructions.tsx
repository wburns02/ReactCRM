import { useState } from "react";
import { Button } from "@/components/ui/Button.tsx";
import { toastSuccess, toastError, toastInfo } from "@/components/ui/Toast.tsx";
import { formatCurrency } from "@/lib/utils.ts";
import { useQBReferenceCode, useQBRecordPending } from "@/api/hooks/useQuickBooks.ts";

export interface QBGoPaymentInstructionsProps {
  invoiceId?: string;
  customerId?: string;
  amount: number;
  onSuccess?: (result: { paymentId: string; amount: number; referenceCode: string }) => void;
  onCancel?: () => void;
}

/**
 * Field-tech instructions for taking a card payment via the QuickBooks GoPayment
 * mobile app. The physical card reader is driven by GoPayment on the tech's phone;
 * the CRM auto-matches the transaction back via a reference code in the memo.
 */
export function QBGoPaymentInstructions({
  invoiceId,
  customerId,
  amount,
  onSuccess,
  onCancel,
}: QBGoPaymentInstructionsProps) {
  const { data: refData, isLoading } = useQBReferenceCode(invoiceId);
  const recordPending = useQBRecordPending();
  const [copied, setCopied] = useState(false);

  const referenceCode = refData?.reference_code || (invoiceId ? invoiceId.slice(0, 8).toUpperCase() : "");

  const handleCopy = async () => {
    if (!referenceCode) return;
    try {
      await navigator.clipboard.writeText(referenceCode);
      setCopied(true);
      toastInfo("Copied", `${referenceCode} copied to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleMarkCollected = async () => {
    if (!invoiceId) {
      toastError("Missing invoice", "Cannot record a GoPayment without an invoice.");
      return;
    }
    if (!referenceCode) {
      toastError("No reference code", "Reference code unavailable — try again.");
      return;
    }
    try {
      const result = await recordPending.mutateAsync({
        invoice_id: invoiceId,
        customer_id: customerId,
        amount,
        reference_code: referenceCode,
      });
      toastSuccess(
        "Payment recorded (pending)",
        `${formatCurrency(amount)} awaiting QuickBooks sync confirmation`,
      );
      onSuccess?.({
        paymentId: result.payment_id,
        amount,
        referenceCode,
      });
    } catch {
      toastError("Could not record payment", "Try again or record manually.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-text-secondary mb-2">Reference code — type into GoPayment memo</p>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold font-mono tracking-wider text-blue-700">
            {isLoading ? "…" : referenceCode || "?"}
          </span>
          <Button variant="secondary" size="sm" onClick={handleCopy} disabled={!referenceCode}>
            {copied ? "Copied ✓" : "Copy"}
          </Button>
        </div>
      </div>

      <ol className="space-y-2 text-sm text-text-secondary list-decimal list-inside">
        <li>Open <strong>GoPayment</strong> on your phone</li>
        <li>Enter <strong>{formatCurrency(amount)}</strong> and swipe/tap the customer's card</li>
        <li>Paste <code className="bg-bg-muted px-1.5 py-0.5 rounded">{referenceCode}</code> into the memo field</li>
        <li>Complete the sale in GoPayment</li>
        <li>Tap <strong>Mark as Collected</strong> below — we'll auto-match it within ~5 minutes</li>
      </ol>

      <div className="flex gap-3 pt-1">
        <Button
          variant="secondary"
          onClick={onCancel}
          className="flex-1 h-14 text-base rounded-xl"
          disabled={recordPending.isPending}
        >
          Back
        </Button>
        <Button
          onClick={handleMarkCollected}
          disabled={recordPending.isPending || !invoiceId}
          className="flex-1 h-14 text-base font-bold rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg disabled:opacity-50"
        >
          {recordPending.isPending ? "Recording…" : "Mark as Collected"}
        </Button>
      </div>

      {!invoiceId && (
        <p className="text-xs text-amber-600 text-center">
          This flow requires an invoice. Create the invoice first, then collect payment.
        </p>
      )}
    </div>
  );
}
