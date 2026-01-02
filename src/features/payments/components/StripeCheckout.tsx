import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  useStripeConfig,
  useCreatePaymentIntent,
  useConfirmPayment,
} from '@/api/hooks/useStripe';

interface StripeCheckoutProps {
  invoiceId: string;
  amount: number; // in dollars
  customerEmail?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Inner checkout form component (must be inside Elements)
 */
function CheckoutForm({
  invoiceId,
  amount,
  onSuccess,
  onCancel,
}: {
  invoiceId: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmPayment = useConfirmPayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (submitError) {
        setError(submitError.message || 'Payment failed');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm with backend
        await confirmPayment.mutateAsync({
          payment_intent_id: paymentIntent.id,
          invoice_id: invoiceId,
        });
        onSuccess();
      } else if (paymentIntent && paymentIntent.status === 'processing') {
        setError('Payment is processing. Please check back later.');
      } else {
        setError('Payment was not successful. Please try again.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-bg-muted rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Amount Due</span>
          <span className="text-2xl font-bold text-text-primary">
            ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

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
          disabled={!stripe || isProcessing}
          className="flex-1"
        >
          {isProcessing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
        </Button>
      </div>

      <p className="text-xs text-center text-text-muted">
        Payments are securely processed by Stripe
      </p>
    </form>
  );
}

/**
 * Main Stripe Checkout Component
 */
export function StripeCheckout({
  invoiceId,
  amount,
  customerEmail,
  onSuccess,
  onCancel,
}: StripeCheckoutProps) {
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: config, isLoading: configLoading } = useStripeConfig();
  const createIntent = useCreatePaymentIntent();

  // Load Stripe when config is available
  useEffect(() => {
    if (config?.publishable_key) {
      setStripePromise(loadStripe(config.publishable_key));
    }
  }, [config?.publishable_key]);

  // Create payment intent when component mounts
  useEffect(() => {
    if (!config?.publishable_key) return;

    const createPaymentIntent = async () => {
      try {
        const result = await createIntent.mutateAsync({
          invoice_id: invoiceId,
          amount: Math.round(amount * 100), // Convert to cents
          customer_email: customerEmail,
        });
        setClientSecret(result.client_secret);
      } catch (err) {
        console.error('Failed to create payment intent:', err);
        setError('Failed to initialize payment. Please try again.');
      }
    };

    createPaymentIntent();
  }, [invoiceId, amount, customerEmail, config?.publishable_key]);

  if (configLoading || !stripePromise) {
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

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <p className="text-red-700 mb-4">{error}</p>
          <Button onClick={onCancel} variant="secondary">
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            <span className="text-text-secondary">Preparing payment...</span>
          </div>
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
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#1e3a5f',
              },
            },
          }}
        >
          <CheckoutForm
            invoiceId={invoiceId}
            amount={amount}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      </CardContent>
    </Card>
  );
}
