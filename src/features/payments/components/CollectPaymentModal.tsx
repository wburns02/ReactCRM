import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/Dialog.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";
import { formatCurrency } from "@/lib/utils.ts";
import { useCollectPayment, useRecordFieldPayment } from "@/api/hooks/useCollectPayment.ts";

// ─── Types ─────────────────────────────────────────────────

export interface CollectPaymentModalProps {
  open: boolean;
  onClose: () => void;
  /** Work order ID (for field payments tied to a job) */
  workOrderId?: string;
  /** Invoice ID (for invoice-based payments) */
  invoiceId?: string;
  /** Customer ID */
  customerId?: string;
  /** Customer name for display */
  customerName?: string;
  /** Suggested amount (from invoice or work order estimate) */
  suggestedAmount?: number | null;
  /** Whether this is a technician in the field (uses simplified endpoint) */
  isTechnician?: boolean;
  /** Callback after successful payment */
  onSuccess?: (result: { paymentId: string; amount: number; method: string }) => void;
}

// ─── Payment Methods ───────────────────────────────────────

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", emoji: "💵", desc: "Cash collected" },
  { value: "check", label: "Check", emoji: "📋", desc: "Personal or business check" },
  { value: "card", label: "Card", emoji: "💳", desc: "Card on POS terminal" },
  { value: "clover", label: "Clover POS", emoji: "☘️", desc: "Clover terminal payment" },
  { value: "ach", label: "ACH/Bank", emoji: "🏦", desc: "Bank transfer" },
  { value: "other", label: "Other", emoji: "📎", desc: "Other payment method" },
] as const;

// ─── Component ─────────────────────────────────────────────

export function CollectPaymentModal({
  open,
  onClose,
  workOrderId,
  invoiceId,
  customerId,
  customerName,
  suggestedAmount,
  isTechnician = false,
  onSuccess,
}: CollectPaymentModalProps) {
  // State
  const [step, setStep] = useState<"form" | "success">("form");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [successResult, setSuccessResult] = useState<{
    paymentId: string;
    amount: number;
    method: string;
    customerName: string;
    invoiceId?: string;
  } | null>(null);

  // Mutations
  const collectMutation = useCollectPayment();
  const fieldMutation = useRecordFieldPayment();
  const isSubmitting = collectMutation.isPending || fieldMutation.isPending;

  // Reset form when modal opens/closes
  const resetForm = useCallback(() => {
    setStep("form");
    setPaymentMethod("");
    setAmount("");
    setCheckNumber("");
    setReferenceNumber("");
    setNotes("");
    setSuccessResult(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // Submit payment
  const handleSubmit = useCallback(async () => {
    const parsedAmount = parseFloat(amount);
    if (!paymentMethod || isNaN(parsedAmount) || parsedAmount <= 0) {
      toastError("Invalid payment", "Please select a method and enter an amount.");
      return;
    }

    try {
      let result;

      if (isTechnician && workOrderId) {
        // Use field payment endpoint
        result = await fieldMutation.mutateAsync({
          workOrderId,
          payment_method: paymentMethod,
          amount: parsedAmount,
          check_number: paymentMethod === "check" ? checkNumber : undefined,
          notes: notes || undefined,
        });
      } else {
        // Use admin collect endpoint
        result = await collectMutation.mutateAsync({
          work_order_id: workOrderId,
          invoice_id: invoiceId,
          customer_id: customerId,
          amount: parsedAmount,
          payment_method: paymentMethod,
          check_number: paymentMethod === "check" ? checkNumber : undefined,
          reference_number: referenceNumber || undefined,
          notes: notes || undefined,
          auto_create_invoice: true,
        });
      }

      const methodLabel = PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label || paymentMethod;

      setSuccessResult({
        paymentId: result.payment_id,
        amount: parsedAmount,
        method: methodLabel,
        customerName: result.customer_name || customerName || "Customer",
        invoiceId: result.invoice_id,
      });
      setStep("success");

      toastSuccess(
        "Payment recorded!",
        `${formatCurrency(parsedAmount)} via ${methodLabel}`,
      );

      onSuccess?.({
        paymentId: result.payment_id,
        amount: parsedAmount,
        method: paymentMethod,
      });
    } catch (err: unknown) {
      const apiErr = err as Error & { response?: { data?: { detail?: string } } };
      toastError(
        "Payment failed",
        apiErr?.response?.data?.detail || apiErr?.message || "Could not record payment",
      );
    }
  }, [
    amount, paymentMethod, checkNumber, referenceNumber, notes,
    workOrderId, invoiceId, customerId, customerName, isTechnician,
    collectMutation, fieldMutation, onSuccess,
  ]);

  const parsedAmount = parseFloat(amount) || 0;

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>
            {step === "success" ? "Payment Recorded" : "Collect Payment"}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {step === "form" ? (
            <div className="space-y-5">
              {/* Customer info */}
              {customerName && (
                <div className="bg-bg-muted rounded-xl p-3 flex items-center gap-3">
                  <span className="text-2xl">👤</span>
                  <div>
                    <p className="font-semibold text-text-primary">{customerName}</p>
                    {suggestedAmount != null && suggestedAmount > 0 && (
                      <p className="text-sm text-text-secondary">
                        Job total: {formatCurrency(suggestedAmount)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Payment method selection - big touch targets */}
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Payment Method *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all min-h-[72px] ${
                        paymentMethod === method.value
                          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                          : "border-border bg-bg-surface text-text-secondary hover:border-blue-300 active:bg-blue-50"
                      }`}
                    >
                      <span className="text-2xl">{method.emoji}</span>
                      <span className="text-xs font-semibold">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-text-muted font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-16 pl-10 pr-4 text-2xl font-bold rounded-xl border border-border bg-bg-surface focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    autoFocus
                  />
                </div>
                {suggestedAmount != null && suggestedAmount > 0 && amount !== String(suggestedAmount) && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(suggestedAmount))}
                    className="text-sm text-blue-600 mt-1 hover:underline font-medium"
                  >
                    Use job total: {formatCurrency(suggestedAmount)}
                  </button>
                )}
              </div>

              {/* Check number (conditional) */}
              {paymentMethod === "check" && (
                <div>
                  <label className="text-sm font-medium text-text-secondary mb-2 block">
                    Check Number
                  </label>
                  <input
                    type="text"
                    placeholder="Enter check number"
                    value={checkNumber}
                    onChange={(e) => setCheckNumber(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-border bg-bg-surface focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                </div>
              )}

              {/* Reference number (admin only) */}
              {!isTechnician && paymentMethod && paymentMethod !== "cash" && (
                <div>
                  <label className="text-sm font-medium text-text-secondary mb-2 block">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    placeholder="Transaction ID, confirmation #, etc."
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-border bg-bg-surface focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Notes (optional)
                </label>
                <textarea
                  placeholder="Payment notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-bg-surface focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none text-sm"
                />
              </div>

              {/* Summary bar */}
              {parsedAmount > 0 && paymentMethod && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-sm text-green-700 font-medium">
                    {PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.emoji}{" "}
                    {PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label}
                  </span>
                  <span className="text-lg font-bold text-green-700">
                    {formatCurrency(parsedAmount)}
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 h-14 text-base rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !paymentMethod || parsedAmount <= 0}
                  className="flex-1 h-14 text-base font-bold rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span> Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span>💰</span> Record Payment
                    </span>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* ─── Success State ─────────────────────────────────── */
            <div className="text-center space-y-4 py-4">
              <div className="text-6xl">✅</div>
              <div>
                <h3 className="text-xl font-bold text-text-primary">
                  Payment Recorded!
                </h3>
                <p className="text-text-secondary mt-1">
                  {formatCurrency(successResult?.amount || 0)} via {successResult?.method}
                </p>
              </div>

              {/* Receipt summary */}
              <div className="bg-bg-muted rounded-xl p-4 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Customer</span>
                  <span className="font-medium text-text-primary">{successResult?.customerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Amount</span>
                  <span className="font-bold text-green-600">{formatCurrency(successResult?.amount || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Method</span>
                  <span className="font-medium text-text-primary">{successResult?.method}</span>
                </div>
                {successResult?.invoiceId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Invoice</span>
                    <span className="font-medium text-text-primary">Auto-created</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Date</span>
                  <span className="font-medium text-text-primary">
                    {new Date().toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleClose}
                className="w-full h-14 text-base font-bold rounded-xl"
              >
                Done
              </Button>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
