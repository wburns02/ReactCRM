import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { apiClient } from "@/api/client";
import { useMutation, useQuery } from "@tanstack/react-query";

interface CloverCheckoutProps {
  invoiceId: string;
  amount: number; // in dollars
  customerEmail?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface CloverConfig {
  merchant_id: string;
  environment: string;
  is_configured: boolean;
}

/**
 * Hook to get Clover config
 */
function useCloverConfig() {
  return useQuery({
    queryKey: ["clover-config"],
    queryFn: async () => {
      const { data } = await apiClient.get<CloverConfig>("/payments/clover/config");
      return data;
    },
    retry: false,
  });
}

/**
 * Hook to charge via Clover
 */
function useCloverCharge() {
  return useMutation({
    mutationFn: async (params: {
      invoice_id: string;
      amount: number;
      token: string;
      customer_email?: string;
    }) => {
      const { data } = await apiClient.post("/payments/clover/charge", params);
      return data;
    },
  });
}

/**
 * Clover Checkout Component
 *
 * Uses Clover's hosted iframe for secure card entry.
 * See: https://docs.clover.com/docs/using-the-clover-hosted-iframe
 */
export function CloverCheckout({
  invoiceId,
  amount,
  customerEmail,
  onSuccess,
  onCancel,
}: CloverCheckoutProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardToken, setCardToken] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cloverInstanceRef = useRef<any>(null);

  const { data: config, isLoading: configLoading, error: configError } = useCloverConfig();
  const chargePayment = useCloverCharge();

  // Initialize Clover SDK
  useEffect(() => {
    if (!config?.is_configured) return;

    // Load Clover SDK script
    const script = document.createElement("script");
    script.src = config.environment === "production"
      ? "https://checkout.clover.com/sdk.js"
      : "https://checkout.sandbox.dev.clover.com/sdk.js";
    script.async = true;

    script.onload = () => {
      // Initialize Clover
      const clover = new (window as any).Clover(config.merchant_id, {
        // Elements options
      });
      cloverInstanceRef.current = clover;

      // Mount card input
      const elements = clover.elements();
      const cardElement = elements.create("CARD");

      const cardContainer = document.getElementById("clover-card-element");
      if (cardContainer) {
        cardElement.mount("#clover-card-element");
      }

      // Store reference for tokenization
      (window as any).__cloverCardElement = cardElement;
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    try {
      const clover = cloverInstanceRef.current;
      const cardElement = (window as any).__cloverCardElement;

      if (!clover || !cardElement) {
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
      const chargeResult = await chargePayment.mutateAsync({
        invoice_id: invoiceId,
        amount: Math.round(amount * 100), // Convert to cents
        token: result.token,
        customer_email: customerEmail,
      });

      if (chargeResult.success) {
        onSuccess();
      } else {
        throw new Error(chargeResult.error_message || "Payment failed");
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Show loading state
  if (configLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error if Clover not configured
  if (configError || !config?.is_configured) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-red-500 mb-4 text-4xl">⚠️</div>
          <p className="text-red-700 mb-4">
            Payment system is not configured. Please contact support.
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
          <div className="p-4 bg-bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Amount Due</span>
              <span className="text-2xl font-bold text-text-primary">
                ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Clover Card Element Container */}
          <div className="border border-border-default rounded-lg p-4 bg-white min-h-[100px]">
            <div id="clover-card-element" className="w-full" />
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
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
            </Button>
          </div>

          <p className="text-xs text-center text-text-muted">
            Payments are securely processed by Clover
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
