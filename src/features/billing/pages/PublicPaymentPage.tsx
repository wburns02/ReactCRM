import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/**
 * Public Payment Page - No Authentication Required
 * Accessed via /pay/:token
 */
export function PublicPaymentPage() {
  const { token } = useParams<{ token: string }>();
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: paymentLink, isLoading, error } = useQuery({
    queryKey: ['payment-link', token],
    queryFn: async () => {
      const response = await apiClient.get(`/pay/${token}`);
      return response.data;
    },
    enabled: !!token,
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      await apiClient.post(`/pay/${token}/process`, {
        billing_email: email,
        // Payment method would be handled by Stripe/payment processor
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-body flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !paymentLink) {
    return (
      <div className="min-h-screen bg-bg-body flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-bg-card border border-border rounded-lg p-8 text-center">
          <span className="text-5xl block mb-4">❌</span>
          <h1 className="text-xl font-semibold text-text-primary mb-2">Invalid Payment Link</h1>
          <p className="text-text-muted">
            This payment link is invalid or has expired. Please contact the business for a new link.
          </p>
        </div>
      </div>
    );
  }

  if (paymentLink.status === 'paid') {
    return (
      <div className="min-h-screen bg-bg-body flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-bg-card border border-border rounded-lg p-8 text-center">
          <span className="text-5xl block mb-4">✅</span>
          <h1 className="text-xl font-semibold text-success mb-2">Payment Complete</h1>
          <p className="text-text-muted mb-4">
            Thank you! Your payment has been processed successfully.
          </p>
          <p className="text-sm text-text-muted">
            A receipt has been sent to your email.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-body flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Company Header */}
        <div className="text-center mb-6">
          <span className="text-4xl block mb-2">🚽</span>
          <h1 className="text-xl font-semibold text-text-primary">MAC Septic</h1>
          <p className="text-text-muted">Secure Online Payment</p>
        </div>

        {/* Payment Card */}
        <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
          {/* Invoice Summary */}
          <div className="p-6 border-b border-border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-text-muted">Invoice</p>
                <p className="font-medium text-text-primary">#{paymentLink.invoice_number}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-text-muted">Amount Due</p>
                <p className="text-2xl font-bold text-primary">
                  ${paymentLink.amount?.toLocaleString() || '0'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Customer</span>
                <span className="text-text-primary">{paymentLink.customer_name}</span>
              </div>
              {paymentLink.description && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Description</span>
                  <span className="text-text-primary">{paymentLink.description}</span>
                </div>
              )}
              {paymentLink.expires_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Expires</span>
                  <span className="text-text-primary">{paymentLink.expires_at}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Form */}
          <div className="p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Email for Receipt
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-border rounded-lg bg-bg-body text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Stripe Card Element would go here */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Card Details
              </label>
              <div className="border border-border rounded-lg p-4 bg-bg-hover text-center text-text-muted">
                Payment form integration required
              </div>
            </div>

            <button
              onClick={() => payMutation.mutate()}
              disabled={isProcessing || !email}
              className="w-full py-3 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : `Pay $${paymentLink.amount?.toLocaleString() || '0'}`}
            </button>

            <p className="text-xs text-text-muted text-center mt-4">
              <span className="mr-1">🔒</span>
              Payments are securely processed. Your card information is never stored.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-text-muted">
          <p>Questions? Contact us at support@macseptic.com</p>
        </div>
      </div>
    </div>
  );
}
