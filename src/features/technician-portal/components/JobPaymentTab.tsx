import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { formatCurrency } from "@/lib/utils.ts";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", emoji: "💵" },
  { value: "check", label: "Check", emoji: "📝" },
  { value: "card", label: "Card", emoji: "💳" },
  { value: "clover", label: "Clover POS", emoji: "☘️" },
  { value: "ach", label: "ACH / Bank", emoji: "🏦" },
  { value: "other", label: "Other", emoji: "📋" },
] as const;

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  payment_date: string | null;
  description: string | null;
}

export interface JobPaymentTabProps {
  payments: Payment[];
  paymentMethod: string;
  paymentAmount: string;
  checkNumber: string;
  paymentNotes: string;
  paymentRecorded: boolean;
  totalPaid: number;
  estimatedAmount: number;
  isSubmitting: boolean;
  setPaymentMethod: (v: string) => void;
  setPaymentAmount: (v: string) => void;
  setCheckNumber: (v: string) => void;
  setPaymentNotes: (v: string) => void;
  onSubmit: () => void;
}

export function JobPaymentTab({
  payments,
  paymentMethod,
  paymentAmount,
  checkNumber,
  paymentNotes,
  paymentRecorded,
  totalPaid,
  estimatedAmount,
  isSubmitting,
  setPaymentMethod,
  setPaymentAmount,
  setCheckNumber,
  setPaymentNotes,
  onSubmit,
}: JobPaymentTabProps) {
  return (
    <>
      {/* Payment History */}
      {payments.length > 0 && (
        <Card>
          <CardContent className="pt-5 pb-5">
            <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
              <span className="text-xl">✅</span> Payments Recorded
            </h2>
            <div className="space-y-2">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-green-50 rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium text-green-800">
                      {formatCurrency(p.amount)} via{" "}
                      {PAYMENT_METHODS.find((m) => m.value === p.payment_method)?.label || p.payment_method}
                    </p>
                    {p.payment_date && (
                      <p className="text-xs text-green-600">
                        {new Date(p.payment_date).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </p>
                    )}
                    {p.description && (
                      <p className="text-xs text-green-600 mt-1">{p.description}</p>
                    )}
                  </div>
                  <span className="text-green-500 text-2xl">✅</span>
                </div>
              ))}
              <div className="text-right font-bold text-green-700 pt-2">
                Total: {formatCurrency(totalPaid)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Record New Payment */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <h2 className="text-lg font-bold text-text-primary mb-1 flex items-center gap-2">
            <span className="text-xl">💰</span> Record Payment
          </h2>
          <p className="text-sm text-text-muted mb-4">
            {paymentRecorded
              ? "Add another payment or adjust the amount."
              : "REQUIRED — Record how payment was received."}
          </p>

          {/* Payment Method Selection */}
          <div className="mb-4">
            <label className="text-sm font-medium text-text-secondary mb-2 block">
              How was payment received? *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  onClick={() => setPaymentMethod(method.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                    paymentMethod === method.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-bg-surface text-text-secondary hover:border-primary/40"
                  }`}
                >
                  <span className="text-2xl">{method.emoji}</span>
                  <span className="text-xs font-medium">{method.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="mb-4">
            <label className="text-sm font-medium text-text-secondary mb-2 block">
              Amount Received *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-text-muted">
                $
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder={estimatedAmount > 0 ? String(estimatedAmount) : "0.00"}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full h-14 pl-10 pr-4 text-xl font-bold rounded-xl border border-border bg-bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            {estimatedAmount > 0 && (
              <button
                onClick={() => setPaymentAmount(String(estimatedAmount))}
                className="text-sm text-primary mt-1 hover:underline"
              >
                Use estimated amount: {formatCurrency(estimatedAmount)}
              </button>
            )}
          </div>

          {/* Check Number (conditional) */}
          {paymentMethod === "check" && (
            <div className="mb-4">
              <label className="text-sm font-medium text-text-secondary mb-2 block">
                Check Number
              </label>
              <input
                type="text"
                placeholder="Enter check number"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-border bg-bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          )}

          {/* Notes */}
          <div className="mb-4">
            <label className="text-sm font-medium text-text-secondary mb-2 block">
              Notes (optional)
            </label>
            <textarea
              placeholder="Any payment notes..."
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-border bg-bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
            />
          </div>

          {/* Submit */}
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !paymentMethod || !paymentAmount}
            className="w-full h-14 text-lg font-bold rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span> Recording...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-xl">💰</span> Record Payment
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Payment status */}
      <div
        className={`p-3 rounded-lg text-center text-sm font-medium ${
          paymentRecorded ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}
      >
        {paymentRecorded
          ? `Payment recorded: ${formatCurrency(totalPaid)} ✓`
          : "No payment recorded yet — REQUIRED before completion"}
      </div>
    </>
  );
}
