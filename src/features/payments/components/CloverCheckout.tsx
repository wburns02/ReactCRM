import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { toastSuccess, toastError } from "@/components/ui/Toast";
import { useCloverConfig, useCloverCharge } from "@/api/hooks/useClover";

interface CloverInstance {
  elements(): { create(type: string): CloverCardElement };
  createToken(): Promise<{ token?: string; errors?: Record<string, string> }>;
}

interface CloverCardElement {
  mount(selector: string): void;
}

interface CloverCheckoutProps {
  invoiceId: string;
  amount: number; // in dollars
  customerEmail?: string;
  customerName?: string;
  invoiceNumber?: string;
  onSuccess: (result: { paymentId: string; chargeId: string }) => void;
  onCancel: () => void;
}

/**
 * Clover Checkout Component
 *
 * Uses Clover's hosted iframe for PCI-compliant card entry.
 * Processes payment via backend /payments/clover/charge endpoint.
 */
export function CloverCheckout({
  invoiceId,
  amount,
  customerEmail,
  customerName,
  invoiceNumber,
  onSuccess,
  onCancel,
}: CloverCheckoutProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const cloverInstanceRef = useRef<CloverInstance | null>(null);
  const cardElementRef = useRef<CloverCardElement | null>(null);

  const { data: config, isLoading: configLoading, error: configError } = useCloverConfig();
  const chargeMutation = useCloverCharge();

  // Initialize Clover SDK
  useEffect(() => {
    if (!config?.is_configured || !config?.ecommerce_available) return;

    const existingScript = document.querySelector('script[src*="clover.com/sdk"]');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.src = config.environment === "production"
      ? "https://checkout.clover.com/sdk.js"
      : "https://checkout.sandbox.dev.clover.com/sdk.js";
    script.async = true;

    script.onload = () => {
      try {
        const CloverSDK = (window as unknown as Record<string, new (id: string) => CloverInstance>).Clover;
        const clover = new CloverSDK(config.merchant_id);
        cloverInstanceRef.current = clover;

        const elements = clover.elements();
        const cardElement = elements.create("CARD");
        cardElementRef.current = cardElement;

        const cardContainer = document.getElementById("clover-card-element");
        if (cardContainer) {
          cardElement.mount("#clover-card-element");
          setSdkReady(true);
        }
      } catch (err) {
        setError("Failed to initialize payment form. Please refresh and try again.");
      }
    };

    script.onerror = () => {
      setError("Failed to load payment SDK. Please check your connection.");
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      cloverInstanceRef.current = null;
      cardElementRef.current = null;
      setSdkReady(false);
    };
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    try {
      const clover = cloverInstanceRef.current;

      if (!clover) {
        throw new Error("Payment form not ready. Please try again.");
      }

      // Create token from card element
      const result = await clover.createToken();

      if (result.errors) {
        const errorMessage = Object.values(result.errors).join(", ");
        throw new Error(errorMessage || "Invalid card details");
      }

      if (!result.token) {
        throw new Error("Failed to tokenize card. Please try again.");
      }

      // Charge via backend
      const chargeResult = await chargeMutation.mutateAsync({
        invoice_id: invoiceId,
        amount: Math.round(amount * 100), // Convert to cents
        token: result.token,
        customer_email: customerEmail,
      });

      if (chargeResult.success) {
        toastSuccess(
          "Payment Successful!",
          `$${amount.toFixed(2)} charged${customerName ? ` for ${customerName}` : ""}`,
        );
        onSuccess({
          paymentId: chargeResult.payment_id || "",
          chargeId: chargeResult.charge_id || "",
        });
      } else {
        throw new Error(chargeResult.error_message || "Payment failed");
      }
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : null) || "An unexpected error occurred. Please try again.";
      setError(msg);
      toastError("Payment Failed", msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading state
  if (configLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="text-text-secondary">Loading payment form...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not configured
  if (configError || !config?.is_configured) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-red-500 mb-4 text-4xl">☘️</div>
          <p className="text-text-secondary mb-4">
            Payment system is not configured. Please connect Clover in Integrations.
          </p>
          <Button onClick={onCancel} variant="secondary">
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Ecommerce not available
  if (!config.ecommerce_available) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-amber-500 mb-4 text-4xl">☘️</div>
          <p className="text-text-secondary mb-4">
            Online card payments are not yet enabled. Clover ecommerce API access is required.
          </p>
          <p className="text-xs text-text-muted mb-4">
            Contact your Clover representative to enable ecommerce API access.
          </p>
          <Button onClick={onCancel} variant="secondary">
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Summary */}
          <div className="p-4 bg-bg-muted rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Amount Due</span>
              <span className="text-2xl font-bold text-text-primary">
                ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {invoiceNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Invoice</span>
                <span className="text-text-secondary">{invoiceNumber}</span>
              </div>
            )}
            {customerName && (
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Customer</span>
                <span className="text-text-secondary">{customerName}</span>
              </div>
            )}
          </div>

          {/* Clover Card Element Container */}
          <div>
            <label className="text-sm font-medium text-text-secondary mb-2 block">
              Card Details
            </label>
            <div className="border border-border-default rounded-lg p-4 bg-white min-h-[100px]">
              <div id="clover-card-element" className="w-full" />
              {!sdkReady && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                  <span className="ml-2 text-sm text-text-muted">Loading card form...</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isProcessing || !sdkReady}
              className="flex-1"
            >
              {isProcessing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
            </Button>
          </div>

          <p className="text-xs text-center text-text-muted">
            Payments are securely processed by Clover. Card details never touch our servers.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
