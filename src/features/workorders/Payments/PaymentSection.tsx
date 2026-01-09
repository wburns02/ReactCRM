/**
 * PaymentSection Component
 *
 * Combines invoice preview and payment buttons matching the legacy UI.
 * Displays invoice details with line items and provides multiple payment processing options.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/Button.tsx';
import { Card } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog.tsx';
import { useMutation } from '@tanstack/react-query';
import { toastSuccess, toastError } from '@/components/ui/Toast.tsx';
import { formatCurrency } from './utils/pricingEngine.ts';
import {
  useProcessPayment,
  useCreateInvoice,
  useGeneratePaymentLink,
  type ProcessPaymentParams,
} from './hooks/usePayments.ts';

// ============================================================================
// TYPES
// ============================================================================

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface PaymentSectionProps {
  workOrderId: string;
  customerId: string;
  lineItems?: LineItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  amountPaid?: number;
  invoiceId?: string;
  onPaymentSuccess?: (transactionId: string) => void;
  onInvoiceGenerated?: (invoiceId: string) => void;
}

type PaymentMethod = 'card' | 'link' | 'financing' | 'cash';

// ============================================================================
// COMPONENT
// ============================================================================

export function PaymentSection({
  workOrderId,
  customerId,
  lineItems = [],
  subtotal = 0,
  tax = 0,
  total = 0,
  paymentStatus,
  amountPaid = 0,
  invoiceId,
  onPaymentSuccess,
  onInvoiceGenerated,
}: PaymentSectionProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string | undefined>(invoiceId);

  // Mutations
  const processPaymentMutation = useProcessPayment();
  const createInvoiceMutation = useCreateInvoice();
  const generatePaymentLinkMutation = useGeneratePaymentLink();

  // Process payment mutation wrapper
  const processPayment = useMutation({
    mutationFn: async (method: PaymentMethod) => {
      const params: ProcessPaymentParams = {
        workOrderId,
        amount: total - amountPaid,
        method: method === 'link' || method === 'financing' ? 'card' : method,
        invoiceId: currentInvoiceId,
      };
      return processPaymentMutation.mutateAsync(params);
    },
    onSuccess: (data) => {
      if (data.success && data.transactionId) {
        toastSuccess('Payment processed successfully');
        onPaymentSuccess?.(data.transactionId);
      } else {
        toastError(data.error || 'Payment processing failed');
      }
      setPaymentMethod(null);
    },
    onError: () => {
      toastError('Payment processing failed');
    },
  });

  // Generate invoice mutation
  const generateInvoice = useMutation({
    mutationFn: async () => {
      const invoice = await createInvoiceMutation.mutateAsync({
        workOrderId,
        customerId,
        lineItems: lineItems.map((item, index) => ({
          id: `item-${index}`,
          service: item.description,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxable: true,
        })),
      });
      return invoice;
    },
    onSuccess: (data) => {
      setCurrentInvoiceId(data.id);
      toastSuccess('Invoice generated successfully');
      onInvoiceGenerated?.(data.id);
    },
    onError: () => {
      toastError('Failed to generate invoice');
    },
  });

  // Send payment link handler
  const handleSendPaymentLink = async () => {
    if (!currentInvoiceId) {
      toastError('Please generate an invoice first');
      return;
    }

    try {
      const result = await generatePaymentLinkMutation.mutateAsync(currentInvoiceId);
      // Copy link to clipboard
      await navigator.clipboard.writeText(result.url);
      toastSuccess('Payment link copied to clipboard');
      setPaymentMethod(null);
    } catch {
      toastError('Failed to generate payment link');
    }
  };

  // Get status badge variant
  const statusVariant = {
    unpaid: 'danger',
    partial: 'warning',
    paid: 'success',
  }[paymentStatus] as 'danger' | 'warning' | 'success';

  // Get status display text
  const statusText = {
    unpaid: 'Unpaid',
    partial: 'Partial',
    paid: 'Paid',
  }[paymentStatus];

  // Amount due calculation
  const amountDue = total - amountPaid;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Invoice Preview */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Invoice Details</h3>
        <Card className="p-4">
          {lineItems.length === 0 ? (
            <p className="text-center text-text-muted py-4">No invoice generated</p>
          ) : (
            <div className="space-y-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-text-secondary font-medium">Description</th>
                    <th className="text-right py-2 text-text-secondary font-medium">Qty</th>
                    <th className="text-right py-2 text-text-secondary font-medium">Price</th>
                    <th className="text-right py-2 text-text-secondary font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="py-2 text-text-primary">{item.description}</td>
                      <td className="text-right py-2 text-text-secondary">{item.quantity}</td>
                      <td className="text-right py-2 text-text-secondary">{formatCurrency(item.unitPrice)}</td>
                      <td className="text-right py-2 text-text-primary font-medium">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-border pt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Subtotal</span>
                  <span className="text-text-primary">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Tax</span>
                  <span className="text-text-primary">{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                  <span className="text-text-primary">Total</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Button
          className="w-full"
          onClick={() => generateInvoice.mutate()}
          disabled={generateInvoice.isPending || lineItems.length === 0}
        >
          {generateInvoice.isPending ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  opacity="0.25"
                />
                <path
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Generating...
            </span>
          ) : (
            <>
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Generate Invoice
            </>
          )}
        </Button>

        {currentInvoiceId && (
          <p className="text-sm text-success text-center">
            Invoice #{currentInvoiceId} generated
          </p>
        )}
      </div>

      {/* Payment Processing */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Payment Processing</h3>

        <div className="grid gap-2">
          {/* Card Payment - Green */}
          <Button
            className="w-full justify-start bg-success hover:bg-success/90 text-white"
            onClick={() => setPaymentMethod('card')}
            disabled={paymentStatus === 'paid'}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            Card Payment
          </Button>

          {/* Send Payment Link - Blue (Primary) */}
          <Button
            className="w-full justify-start"
            onClick={() => setPaymentMethod('link')}
            disabled={paymentStatus === 'paid'}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            Send Payment Link
          </Button>

          {/* Offer Financing - Yellow/Warning */}
          <Button
            variant="secondary"
            className="w-full justify-start border-warning text-warning hover:bg-warning/10"
            onClick={() => setPaymentMethod('financing')}
            disabled={paymentStatus === 'paid'}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Offer Financing
          </Button>

          {/* Cash/Check - Ghost/Gray */}
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setPaymentMethod('cash')}
            disabled={paymentStatus === 'paid'}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Cash/Check
          </Button>
        </div>

        {/* Payment Status */}
        <Card className="p-4">
          <h4 className="font-medium mb-3 text-text-primary">Payment Status</h4>
          <div className="space-y-3">
            <div>
              <Badge variant={statusVariant} size="lg">
                {statusText}
              </Badge>
            </div>
            <div className="text-sm text-text-secondary space-y-1">
              <div className="flex justify-between">
                <span>Amount Due:</span>
                <span className="font-medium text-text-primary">{formatCurrency(amountDue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount Paid:</span>
                <span className="font-medium text-success">{formatCurrency(amountPaid)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 mt-2">
                <span>Total:</span>
                <span className="font-bold text-text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Card Payment Modal */}
      <Dialog open={paymentMethod === 'card'} onClose={() => setPaymentMethod(null)}>
        <DialogContent size="sm">
          <DialogHeader onClose={() => setPaymentMethod(null)}>
            Process Card Payment
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <p className="text-text-secondary">
                Process card payment for the outstanding balance.
              </p>
              <div className="p-4 bg-bg-hover rounded-lg">
                <div className="flex justify-between text-lg">
                  <span className="font-medium">Amount:</span>
                  <span className="font-bold text-primary">{formatCurrency(amountDue)}</span>
                </div>
              </div>
              <p className="text-sm text-text-muted">
                In production, this would open a secure Stripe payment form.
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPaymentMethod(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => processPayment.mutate('card')}
              disabled={processPayment.isPending}
            >
              {processPayment.isPending ? 'Processing...' : 'Process Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Link Modal */}
      <Dialog open={paymentMethod === 'link'} onClose={() => setPaymentMethod(null)}>
        <DialogContent size="sm">
          <DialogHeader onClose={() => setPaymentMethod(null)}>
            Send Payment Link
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <p className="text-text-secondary">
                Generate a payment link that can be sent to the customer via email or SMS.
              </p>
              <div className="p-4 bg-bg-hover rounded-lg">
                <div className="flex justify-between text-lg">
                  <span className="font-medium">Amount:</span>
                  <span className="font-bold text-primary">{formatCurrency(amountDue)}</span>
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPaymentMethod(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendPaymentLink}
              disabled={generatePaymentLinkMutation.isPending || !currentInvoiceId}
            >
              {generatePaymentLinkMutation.isPending ? 'Generating...' : 'Generate & Copy Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Financing Modal */}
      <Dialog open={paymentMethod === 'financing'} onClose={() => setPaymentMethod(null)}>
        <DialogContent size="sm">
          <DialogHeader onClose={() => setPaymentMethod(null)}>
            Offer Financing
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <p className="text-text-secondary">
                Offer financing options to the customer for larger purchases.
              </p>
              <div className="p-4 bg-bg-hover rounded-lg">
                <div className="flex justify-between text-lg">
                  <span className="font-medium">Total Amount:</span>
                  <span className="font-bold text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-text-primary">Available Plans:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-bg-hover/50 rounded">
                    <span>6 months @ 0% APR</span>
                    <span className="font-medium">{formatCurrency(total / 6)}/mo</span>
                  </div>
                  <div className="flex justify-between p-2 bg-bg-hover/50 rounded">
                    <span>12 months @ 9.99% APR</span>
                    <span className="font-medium">{formatCurrency((total * 1.0999) / 12)}/mo</span>
                  </div>
                  <div className="flex justify-between p-2 bg-bg-hover/50 rounded">
                    <span>24 months @ 14.99% APR</span>
                    <span className="font-medium">{formatCurrency((total * 1.1499) / 24)}/mo</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPaymentMethod(null)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toastSuccess('Financing application would be initiated');
              setPaymentMethod(null);
            }}>
              Start Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cash/Check Modal */}
      <Dialog open={paymentMethod === 'cash'} onClose={() => setPaymentMethod(null)}>
        <DialogContent size="sm">
          <DialogHeader onClose={() => setPaymentMethod(null)}>
            Record Cash/Check Payment
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <p className="text-text-secondary">
                Record a cash or check payment received from the customer.
              </p>
              <div className="p-4 bg-bg-hover rounded-lg">
                <div className="flex justify-between text-lg">
                  <span className="font-medium">Amount Due:</span>
                  <span className="font-bold text-primary">{formatCurrency(amountDue)}</span>
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPaymentMethod(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => processPayment.mutate('cash')}
              disabled={processPayment.isPending}
            >
              {processPayment.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PaymentSection;
