import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/Dialog.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";
import { formatCurrency } from "@/lib/utils.ts";
import { useCollectPayment, useRecordFieldPayment } from "@/api/hooks/useCollectPayment.ts";
import { CloverCheckout } from "./CloverCheckout.tsx";
import { QBGoPaymentInstructions } from "./QBGoPaymentInstructions.tsx";
import { useQBPrimaryProcessor } from "@/api/hooks/useQuickBooks.ts";

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
  /** Customer email for Clover receipts */
  customerEmail?: string;
  /** Suggested amount (from invoice or work order estimate) */
  suggestedAmount?: number | null;
  /** Whether this is a technician in the field (uses simplified endpoint) */
  isTechnician?: boolean;
  /** Callback after successful payment */
  onSuccess?: (result: { paymentId: string; amount: number; method: string }) => void;
}

// ─── Payment Methods ───────────────────────────────────────

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", emoji: "\u{1F4B5}", desc: "Cash collected" },
  { value: "check", label: "Check", emoji: "\u{1F4CB}", desc: "Personal or business check" },
  { value: "card", label: "Card", emoji: "\u{1F4B3}", desc: "Card on POS terminal" },
  { value: "clover", label: "Clover POS", emoji: "\u2618\uFE0F", desc: "Charge via Clover" },
  { value: "quickbooks_gopayment", label: "QB GoPayment", emoji: "\u{1F4B3}", desc: "QuickBooks GoPayment card reader" },
  { value: "ach", label: "ACH/Bank", emoji: "\u{1F3E6}", desc: "Bank transfer" },
  { value: "other", label: "Other", emoji: "\u{1F4CE}", desc: "Other payment method" },
] as const;

// ─── Component ─────────────────────────────────────────────

export function CollectPaymentModal({
  open,
  onClose,
  workOrderId,
  invoiceId,
  customerId,
  customerName,
  customerEmail,
  suggestedAmount,
  isTechnician = false,
  onSuccess,
}: CollectPaymentModalProps) {
  // Primary processor driven ordering (admin setting)
  const { data: primaryProcessor } = useQBPrimaryProcessor();
  const orderedMethods = (() => {
    if (primaryProcessor?.primary_payment_processor === "quickbooks_gopayment") {
      // Hoist QB GoPayment ahead of Clover
      const qb = PAYMENT_METHODS.find((m) => m.value === "quickbooks_gopayment");
      const rest = PAYMENT_METHODS.filter((m) => m.value !== "quickbooks_gopayment");
      return qb ? [qb, ...rest] : [...PAYMENT_METHODS];
    }
    return [...PAYMENT_METHODS];
  })();

  // State
  const [step, setStep] = useState<"form" | "clover" | "qb_gopayment" | "success">("form");
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

  // Handle Clover payment method selection
  const handleMethodSelect = useCallback((method: string) => {
    setPaymentMethod(method);
    // Pre-fill amount from suggested if not already set
    if (method === "clover" && !amount && suggestedAmount) {
      setAmount(String(suggestedAmount));
    }
  }, [amount, suggestedAmount]);

  // Proceed to Clover checkout
  const handleCloverProceed = useCallback(() => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toastError("Invalid amount", "Please enter an amount to charge.");
      return;
    }
    setStep("clover");
  }, [amount]);

  // Proceed to QB GoPayment instructions
  const handleQBGoPaymentProceed = useCallback(() => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toastError("Invalid amount", "Please enter an amount to charge.");
      return;
    }
    setStep("qb_gopayment");
  }, [amount]);

  // Handle QB GoPayment "Mark as Collected" success
  const handleQBGoPaymentSuccess = useCallback(
    (result: { paymentId: string; amount: number; referenceCode: string }) => {
      setSuccessResult({
        paymentId: result.paymentId,
        amount: result.amount,
        method: "QB GoPayment",
        customerName: customerName || "Customer",
        invoiceId: invoiceId,
      });
      setStep("success");
      onSuccess?.({
        paymentId: result.paymentId,
        amount: result.amount,
        method: "quickbooks_gopayment",
      });
    },
    [customerName, invoiceId, onSuccess],
  );

  // Handle Clover checkout success
  const handleCloverSuccess = useCallback((result: { paymentId: string; chargeId: string }) => {
    const parsedAmount = parseFloat(amount);
    setSuccessResult({
      paymentId: result.paymentId,
      amount: parsedAmount,
      method: "Clover POS",
      customerName: customerName || "Customer",
      invoiceId: invoiceId,
    });
    setStep("success");

    toastSuccess(
      "Payment processed!",
      `${formatCurrency(parsedAmount)} charged via Clover`,
    );

    onSuccess?.({
      paymentId: result.paymentId,
      amount: parsedAmount,
      method: "clover",
    });
  }, [amount, customerName, invoiceId, onSuccess]);

  // Submit manual payment (non-Clover methods)
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
      <DialogContent size={step === "clover" ? "md" : "sm"}>
        <DialogHeader>
          <DialogTitle>
            {step === "success"
              ? "Payment Recorded"
              : step === "clover"
                ? "Clover Card Payment"
                : step === "qb_gopayment"
                  ? "QuickBooks GoPayment"
                  : "Collect Payment"}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {step === "form" ? (
            <div className="space-y-5">
              {/* Customer info */}
              {customerName && (
                <div className="bg-bg-muted rounded-xl p-3 flex items-center gap-3">
                  <span className="text-2xl">{"\u{1F464}"}</span>
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
                  {orderedMethods.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => handleMethodSelect(method.value)}
                      className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all min-h-[72px] ${
                        paymentMethod === method.value
                          ? method.value === "clover" || method.value === "quickbooks_gopayment"
                            ? "border-green-500 bg-green-50 text-green-700 shadow-sm"
                            : "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
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

              {/* Reference number (admin only, non-Clover/non-QB) */}
              {!isTechnician && paymentMethod && paymentMethod !== "cash" && paymentMethod !== "clover" && paymentMethod !== "quickbooks_gopayment" && (
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

              {/* Notes (non-Clover/non-QB only — those have their own flows) */}
              {paymentMethod !== "clover" && paymentMethod !== "quickbooks_gopayment" && (
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
              )}

              {/* Summary bar */}
              {parsedAmount > 0 && paymentMethod && (
                <div className={`rounded-xl p-3 flex items-center justify-between ${
                  paymentMethod === "clover"
                    ? "bg-green-50 border border-green-200"
                    : "bg-green-50 border border-green-200"
                }`}>
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
                {paymentMethod === "clover" ? (
                  <Button
                    type="button"
                    onClick={handleCloverProceed}
                    disabled={parsedAmount <= 0}
                    className="flex-1 h-14 text-base font-bold rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <span>{"\u2618\uFE0F"}</span> Charge with Clover
                    </span>
                  </Button>
                ) : paymentMethod === "quickbooks_gopayment" ? (
                  <Button
                    type="button"
                    onClick={handleQBGoPaymentProceed}
                    disabled={parsedAmount <= 0}
                    className="flex-1 h-14 text-base font-bold rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <span>{"\u{1F4B3}"}</span> Charge with QB GoPayment
                    </span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !paymentMethod || parsedAmount <= 0}
                    className="flex-1 h-14 text-base font-bold rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">{"\u23F3"}</span> Processing...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>{"\u{1F4B0}"}</span> Record Payment
                      </span>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ) : step === "clover" ? (
            /* ─── Clover Checkout Step ─────────────────────────── */
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setStep("form")}
                className="text-sm text-blue-600 hover:underline font-medium flex items-center gap-1"
              >
                {"\u2190"} Back to payment methods
              </button>
              <CloverCheckout
                invoiceId={invoiceId}
                workOrderId={workOrderId}
                amount={parsedAmount}
                customerEmail={customerEmail}
                customerName={customerName}
                onSuccess={handleCloverSuccess}
                onCancel={() => setStep("form")}
              />
            </div>
          ) : step === "qb_gopayment" ? (
            /* ─── QB GoPayment Instructions Step ──────────────── */
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setStep("form")}
                className="text-sm text-blue-600 hover:underline font-medium flex items-center gap-1"
              >
                {"\u2190"} Back to payment methods
              </button>
              <QBGoPaymentInstructions
                invoiceId={invoiceId}
                customerId={customerId}
                amount={parsedAmount}
                onSuccess={handleQBGoPaymentSuccess}
                onCancel={() => setStep("form")}
              />
            </div>
          ) : (
            /* ─── Success State ─────────────────────────────────── */
            <div className="text-center space-y-4 py-4">
              <div className="text-6xl">{"\u2705"}</div>
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
