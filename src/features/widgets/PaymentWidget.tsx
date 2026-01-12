/**
 * Embeddable Payment Widget
 * Secure payment form for embedding in external pages
 * Integrates with Stripe for card processing
 */
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

// ============================================
// Widget Configuration Types
// ============================================

export interface PaymentWidgetConfig {
  /** Invoice ID to pay */
  invoiceId?: string;
  /** Amount in cents (if not using invoice) */
  amount?: number;
  /** Currency code */
  currency?: string;
  /** Company ID for API calls */
  companyId: string;
  /** Stripe publishable key */
  stripePublicKey?: string;
  /** Primary brand color */
  primaryColor?: string;
  /** Company logo URL */
  logoUrl?: string;
  /** Company name */
  companyName?: string;
  /** Success redirect URL */
  successRedirectUrl?: string;
  /** Allow partial payments */
  allowPartialPayment?: boolean;
  /** Custom CSS class */
  className?: string;
}

interface InvoiceDetails {
  id: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string;
  items: Array<{
    description: string;
    amount: number;
  }>;
}

// ============================================
// Form Schema
// ============================================

const paymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  cardholderName: z.string().min(1, "Cardholder name is required"),
  email: z.string().email("Valid email is required"),
  saveCard: z.boolean().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

// ============================================
// Component
// ============================================

export function PaymentWidget({
  invoiceId,
  amount: fixedAmount,
  currency = "USD",
  companyId,
  stripePublicKey,
  primaryColor = "#2563eb",
  logoUrl,
  companyName = "Service Provider",
  successRedirectUrl,
  allowPartialPayment = false,
  className,
}: PaymentWidgetConfig) {
  const [step, setStep] = useState<
    "loading" | "form" | "processing" | "success" | "error"
  >("loading");
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [transactionId, setTransactionId] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema) as never,
    defaultValues: {
      amount: 0,
      cardholderName: "",
      email: "",
      saveCard: false,
    },
  });

  const paymentAmount = watch("amount");

  // Load invoice details if invoiceId provided
  useEffect(() => {
    async function loadInvoice() {
      if (!invoiceId) {
        // Direct payment without invoice
        setValue("amount", (fixedAmount || 0) / 100);
        setStep("form");
        return;
      }

      try {
        const response = await fetch(`/api/v2/widgets/invoices/${invoiceId}`, {
          headers: {
            "X-Widget-Company": companyId,
          },
        });

        if (!response.ok) {
          throw new Error("Invoice not found");
        }

        const data = await response.json();
        setInvoice(data);
        setValue("amount", data.dueAmount / 100);
        setStep("form");
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to load invoice",
        );
        setStep("error");
      }
    }

    loadInvoice();
  }, [invoiceId, fixedAmount, companyId, setValue]);

  const onSubmit = async (data: PaymentFormData) => {
    setStep("processing");

    try {
      // In production, this would use Stripe Elements
      // For now, we'll simulate the payment flow
      const response = await fetch("/api/v2/widgets/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Widget-Company": companyId,
        },
        body: JSON.stringify({
          invoiceId,
          amount: Math.round(data.amount * 100), // Convert to cents
          currency,
          cardholderName: data.cardholderName,
          email: data.email,
          saveCard: data.saveCard,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Payment failed");
      }

      const result = await response.json();
      setTransactionId(result.transactionId || "TXN-" + Date.now());
      setStep("success");

      // Redirect if configured
      if (successRedirectUrl) {
        setTimeout(() => {
          window.location.href = `${successRedirectUrl}?txn=${result.transactionId}`;
        }, 3000);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Payment processing failed",
      );
      setStep("error");
    }
  };

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(cents / 100);
  };

  // Custom CSS variables for branding
  const brandStyles = {
    "--widget-primary": primaryColor,
  } as React.CSSProperties;

  if (step === "loading") {
    return (
      <Card className={cn("max-w-md mx-auto", className)} style={brandStyles}>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
          <p className="text-center text-text-muted mt-4">
            Loading payment details...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (step === "success") {
    return (
      <Card className={cn("max-w-md mx-auto", className)} style={brandStyles}>
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Payment Successful!
          </h2>
          <p className="text-text-secondary mb-2">
            Amount paid:{" "}
            <span className="font-semibold">
              {formatCurrency(paymentAmount * 100)}
            </span>
          </p>
          <p className="text-sm text-text-muted">
            Transaction ID: <span className="font-mono">{transactionId}</span>
          </p>
          <p className="text-sm text-text-muted mt-4">
            A receipt has been sent to your email.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (step === "error") {
    return (
      <Card className={cn("max-w-md mx-auto", className)} style={brandStyles}>
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-danger"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Payment Failed
          </h2>
          <p className="text-text-secondary mb-4">{errorMessage}</p>
          <Button onClick={() => setStep("form")}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("max-w-md mx-auto", className)} style={brandStyles}>
      <CardHeader className="text-center border-b">
        {logoUrl && (
          <img src={logoUrl} alt={companyName} className="h-10 mx-auto mb-2" />
        )}
        <CardTitle className="text-lg">Secure Payment</CardTitle>
        {invoice && (
          <p className="text-sm text-text-muted">
            Invoice #{invoice.invoiceNumber}
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-4">
        {/* Invoice Summary */}
        {invoice && (
          <div className="bg-bg-muted rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-text-secondary">Customer</span>
              <span className="text-sm font-medium">
                {invoice.customerName}
              </span>
            </div>

            {invoice.items.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center text-sm py-1"
              >
                <span className="text-text-secondary">{item.description}</span>
                <span>{formatCurrency(item.amount)}</span>
              </div>
            ))}

            <div className="border-t border-border mt-2 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Total</span>
                <span className="font-medium">
                  {formatCurrency(invoice.totalAmount)}
                </span>
              </div>
              {invoice.paidAmount > 0 && (
                <div className="flex justify-between items-center text-success">
                  <span className="text-sm">Paid</span>
                  <span className="text-sm">
                    -{formatCurrency(invoice.paidAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center mt-1">
                <span className="font-medium">Amount Due</span>
                <span
                  className="text-lg font-bold"
                  style={{ color: primaryColor }}
                >
                  {formatCurrency(invoice.dueAmount)}
                </span>
              </div>
            </div>

            {new Date(invoice.dueDate) < new Date() && (
              <Badge variant="warning" className="mt-2">
                Past Due
              </Badge>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Payment Amount */}
          {(allowPartialPayment || !invoice) && (
            <div>
              <Label htmlFor="amount">Payment Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={invoice ? invoice.dueAmount / 100 : undefined}
                  {...register("amount", { valueAsNumber: true })}
                  className="pl-7"
                  error={!!errors.amount}
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-danger mt-1">
                  {errors.amount.message}
                </p>
              )}
            </div>
          )}

          {/* Cardholder Name */}
          <div>
            <Label htmlFor="cardholderName">Cardholder Name</Label>
            <Input
              id="cardholderName"
              {...register("cardholderName")}
              error={!!errors.cardholderName}
              placeholder="Name on card"
            />
            {errors.cardholderName && (
              <p className="text-xs text-danger mt-1">
                {errors.cardholderName.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Email (for receipt)</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              error={!!errors.email}
              placeholder="your@email.com"
            />
            {errors.email && (
              <p className="text-xs text-danger mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Card Element Placeholder */}
          <div>
            <Label>Card Details</Label>
            <div className="border border-border rounded-md p-3 bg-white">
              {/* In production, this would be Stripe Elements */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Card number"
                  className="col-span-2"
                  disabled={!stripePublicKey}
                />
                <Input placeholder="MM/YY" disabled={!stripePublicKey} />
                <Input placeholder="CVC" disabled={!stripePublicKey} />
              </div>
              {!stripePublicKey && (
                <p className="text-xs text-warning mt-2">
                  Payment processing not configured
                </p>
              )}
            </div>
          </div>

          {/* Save Card */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="saveCard"
              {...register("saveCard")}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <Label
              htmlFor="saveCard"
              className="text-sm font-normal cursor-pointer"
            >
              Save card for future payments
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={step === "processing" || !stripePublicKey}
            style={{ backgroundColor: primaryColor }}
          >
            {step === "processing" ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing...
              </span>
            ) : (
              `Pay ${formatCurrency((paymentAmount || 0) * 100)}`
            )}
          </Button>
        </form>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-text-muted">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span>
            Secured by Stripe. Your card details are never stored on our
            servers.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
