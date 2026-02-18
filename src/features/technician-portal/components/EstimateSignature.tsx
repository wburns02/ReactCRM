import { useState } from "react";
import { useQuote, useAcceptQuote } from "@/api/hooks/useQuotes.ts";
import { useCloverCharge } from "@/api/hooks/useClover.ts";
import { SignaturePad } from "@/components/SignaturePad.tsx";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";

interface Props {
  quoteId: string;
  onClose: () => void;
  onComplete?: () => void;
}

type ViewState = "review" | "signing" | "signed" | "paying" | "done";

export function EstimateSignature({ quoteId, onClose, onComplete }: Props) {
  const { data: quote, isLoading } = useQuote(quoteId);
  const acceptMutation = useAcceptQuote();
  const cloverCharge = useCloverCharge();

  const [view, setView] = useState<ViewState>("review");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [consent, setConsent] = useState(false);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-bg-primary rounded-xl p-8 flex items-center gap-3">
          <div className="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full" />
          <span className="text-text-secondary">Loading estimate...</span>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-bg-primary rounded-xl p-8 text-center">
          <p className="text-text-primary font-medium">Estimate not found</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg">Close</button>
        </div>
      </div>
    );
  }

  const lineItems = quote.line_items || [];
  const customerName = quote.customer_name || quote.customer
    ? `${quote.customer?.first_name || ""} ${quote.customer?.last_name || ""}`.trim()
    : "Customer";

  const handleSignature = (base64: string) => {
    setSignatureData(base64);
  };

  const handleAccept = async () => {
    if (!signatureData || !signerName || !consent) return;
    setView("signing");
    try {
      await acceptMutation.mutateAsync({
        id: quoteId,
        signatureData,
        signedBy: signerName,
      } as never);
      toastSuccess("Estimate accepted and signed!");
      setView("signed");
    } catch {
      toastError("Failed to accept estimate");
      setView("review");
    }
  };

  const handlePayNow = async () => {
    setView("paying");
    try {
      await cloverCharge.mutateAsync({
        amount: Number(quote.total) * 100, // cents
        description: `Estimate ${quote.quote_number}`,
      } as never);
      toastSuccess("Payment processed!");
      setView("done");
      onComplete?.();
    } catch {
      toastError("Payment failed — try again or choose Invoice Later");
      setView("signed");
    }
  };

  const handleInvoiceLater = () => {
    toastSuccess("An invoice will be sent to you. Thank you!");
    setView("done");
    onComplete?.();
  };

  // ─── Done view ───
  if (view === "done") {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-bg-primary rounded-xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-text-primary mb-2">All Done!</h2>
          <p className="text-text-secondary mb-6">Thank you for choosing MAC Septic Services.</p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-primary text-white rounded-lg font-semibold text-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // ─── Signed — payment options ───
  if (view === "signed") {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-bg-primary rounded-xl max-w-md w-full overflow-hidden">
          <div className="bg-green-600 text-white p-4 text-center">
            <div className="text-3xl mb-1">✅</div>
            <h2 className="text-lg font-bold">Estimate Accepted</h2>
            <p className="text-green-100 text-sm">Signed by {signerName}</p>
          </div>
          <div className="p-6">
            <div className="text-center mb-6">
              <p className="text-text-secondary text-sm">Total Amount</p>
              <p className="text-3xl font-bold text-text-primary">${Number(quote.total).toFixed(2)}</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handlePayNow}
                disabled={cloverCharge.isPending}
                className="w-full py-4 bg-green-600 text-white rounded-lg font-semibold text-lg hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {cloverCharge.isPending ? "Processing..." : "💳 Pay Now"}
              </button>
              <button
                onClick={handleInvoiceLater}
                className="w-full py-3 border border-border text-text-primary rounded-lg font-medium hover:bg-bg-hover active:scale-[0.98] transition-all"
              >
                📧 Invoice Me Later
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 text-text-tertiary text-sm hover:text-text-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Review + Sign view ───
  return (
    <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 pt-8 pb-8">
        <div className="bg-bg-primary rounded-xl max-w-lg w-full overflow-hidden shadow-xl">

          {/* Header */}
          <div className="bg-[#1e40af] text-white p-5 text-center">
            <h1 className="text-lg font-bold">MAC Septic Services</h1>
            <p className="text-blue-200 text-sm mt-1">Repair Estimate</p>
          </div>

          <div className="p-5 space-y-5">

            {/* Customer + Estimate info */}
            <div className="flex justify-between items-start">
              <div>
                <p className="text-text-secondary text-xs">Prepared for</p>
                <p className="font-semibold text-text-primary">{customerName}</p>
              </div>
              <div className="text-right">
                <p className="text-text-secondary text-xs">Estimate #</p>
                <p className="font-mono text-sm text-text-primary">{quote.quote_number}</p>
              </div>
            </div>

            {/* Line Items */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-[#1e40af] text-white px-3 py-2 flex justify-between text-xs font-semibold">
                <span>Service / Part</span>
                <span>Amount</span>
              </div>
              {lineItems.map((item, i) => (
                <div
                  key={i}
                  className={`px-3 py-2 flex justify-between text-sm ${i % 2 === 0 ? "bg-bg-primary" : "bg-bg-secondary/50"}`}
                >
                  <div className="flex-1 pr-3">
                    <p className="font-medium text-text-primary">{item.service}</p>
                    {item.description && (
                      <p className="text-xs text-text-secondary">{item.description}</p>
                    )}
                  </div>
                  <span className="font-medium text-text-primary whitespace-nowrap">
                    ${Number(item.amount || item.quantity * item.rate).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border border-border rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm text-text-secondary">
                <span>Subtotal</span>
                <span>${Number(quote.subtotal).toFixed(2)}</span>
              </div>
              {Number(quote.tax) > 0 && (
                <div className="flex justify-between text-sm text-text-secondary">
                  <span>Tax ({Number(quote.tax_rate)}%)</span>
                  <span>${Number(quote.tax).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-bold text-text-primary text-lg">Total</span>
                <span className="font-bold text-primary text-lg">${Number(quote.total).toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            {quote.notes && (
              <div className="text-sm text-text-secondary bg-bg-secondary/50 rounded-lg p-3">
                <p className="font-medium text-text-primary text-xs mb-1">Notes:</p>
                {quote.notes}
              </div>
            )}

            {/* Signature Section */}
            <div className="border-t border-border pt-4">
              <h3 className="font-semibold text-text-primary mb-3">Customer Approval</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Your Name</label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2 border border-border rounded-lg text-text-primary bg-bg-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-1">Your Signature</label>
                  <SignaturePad onSignature={handleSignature} />
                  {signatureData && (
                    <p className="text-xs text-green-600 mt-1">Signature captured</p>
                  )}
                </div>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-primary"
                  />
                  <span className="text-sm text-text-secondary">
                    I agree to the services and estimated costs described above.
                    Final costs may vary based on actual conditions found during repair.
                  </span>
                </label>
              </div>

              <button
                onClick={handleAccept}
                disabled={!signatureData || !signerName || !consent || acceptMutation.isPending}
                className="w-full mt-4 py-4 bg-green-600 text-white rounded-lg font-semibold text-lg hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-40"
              >
                {acceptMutation.isPending ? "Processing..." : "✍️ Sign & Accept Estimate"}
              </button>
            </div>

            {/* Cancel */}
            <button
              onClick={onClose}
              className="w-full py-2 text-text-tertiary text-sm hover:text-text-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
