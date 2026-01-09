/**
 * RefundProcessor Component
 *
 * Issue full or partial refunds with reason selection and confirmation.
 */

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Label } from '@/components/ui/Label.tsx';
import { Select } from '@/components/ui/Select.tsx';
import { Textarea } from '@/components/ui/Textarea.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog.tsx';
import { cn } from '@/lib/utils.ts';
import { formatCurrency } from './utils/pricingEngine.ts';
import { useProcessRefund } from './hooks/usePayments.ts';
import type { Payment } from '@/api/types/payment.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface RefundProcessorProps {
  /** Original payment to refund */
  payment: Payment;
  /** Callback on successful refund */
  onSuccess?: (refundId: string, refundedAmount: number) => void;
  /** Callback on refund failure */
  onError?: (error: string) => void;
  /** Callback when cancelled */
  onCancel?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// Refund reason options
const REFUND_REASONS = [
  { value: 'customer_request', label: 'Customer Request' },
  { value: 'duplicate_charge', label: 'Duplicate Charge' },
  { value: 'service_issue', label: 'Service Issue' },
  { value: 'billing_error', label: 'Billing Error' },
  { value: 'cancelled_service', label: 'Cancelled Service' },
  { value: 'pricing_dispute', label: 'Pricing Dispute' },
  { value: 'other', label: 'Other' },
] as const;

// ============================================================================
// COMPONENT
// ============================================================================

export function RefundProcessor({
  payment,
  onSuccess,
  onError,
  onCancel,
  className,
}: RefundProcessorProps) {
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [partialAmount, setPartialAmount] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processRefundMutation = useProcessRefund();

  // Calculate refund amount
  const refundAmount = useMemo(() => {
    if (refundType === 'full') {
      return payment.amount;
    }
    return Math.min(partialAmount, payment.amount);
  }, [refundType, partialAmount, payment.amount]);

  // Validate form
  const isFormValid = useMemo(() => {
    if (!reason) return false;
    if (refundType === 'partial' && (partialAmount <= 0 || partialAmount > payment.amount)) {
      return false;
    }
    return true;
  }, [reason, refundType, partialAmount, payment.amount]);

  // Handle refund submission
  const handleSubmitRefund = async () => {
    setShowConfirmDialog(false);
    setSuccessMessage(null);
    setErrorMessage(null);

    const reasonLabel = REFUND_REASONS.find((r) => r.value === reason)?.label || reason;
    const fullReason = notes ? `${reasonLabel}: ${notes}` : reasonLabel;

    try {
      const result = await processRefundMutation.mutateAsync({
        paymentId: payment.id,
        amount: refundAmount,
        reason: fullReason,
        fullRefund: refundType === 'full',
      });

      if (result.success && result.refundId) {
        setSuccessMessage(
          `Refund of ${formatCurrency(result.refundedAmount || refundAmount)} processed successfully`
        );
        onSuccess?.(result.refundId, result.refundedAmount || refundAmount);
      } else {
        setErrorMessage(result.error || 'Refund processing failed');
        onError?.(result.error || 'Refund processing failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Refund processing failed';
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
    }
  };

  // Get payment method display
  const getPaymentMethodDisplay = () => {
    switch (payment.payment_method) {
      case 'card':
        return 'Credit/Debit Card';
      case 'cash':
        return 'Cash';
      case 'check':
        return 'Check';
      case 'bank_transfer':
        return 'ACH/Bank Transfer';
      case 'payment_link':
        return 'Payment Link';
      default:
        return 'Other';
    }
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="3,11 3,3 11,3" />
            <polyline points="21,13 21,21 13,21" />
            <line x1="3" y1="3" x2="9" y2="9" />
            <line x1="15" y1="15" x2="21" y2="21" />
          </svg>
          Process Refund
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-success/10 border border-success/30 rounded-lg">
            <p className="text-success flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22,4 12,14.01 9,11.01" />
              </svg>
              {successMessage}
            </p>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-4 p-4 bg-danger/10 border border-danger/30 rounded-lg">
            <p className="text-danger flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {errorMessage}
            </p>
          </div>
        )}

        {/* Original Payment Details */}
        <div className="mb-6 p-4 bg-bg-hover/50 rounded-lg">
          <h4 className="text-sm font-medium text-text-secondary mb-3">Original Payment</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-muted">Transaction ID</p>
              <p className="font-mono text-sm">{payment.transaction_id || payment.id}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Amount</p>
              <p className="text-lg font-bold">{formatCurrency(payment.amount)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Payment Method</p>
              <p className="text-sm">{getPaymentMethodDisplay()}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Date</p>
              <p className="text-sm">{new Date(payment.payment_date).toLocaleDateString()}</p>
            </div>
          </div>
          {payment.customer_name && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-text-muted">Customer</p>
              <p className="text-sm">{payment.customer_name}</p>
            </div>
          )}
        </div>

        {/* Refund Type Selection */}
        <div className="mb-6">
          <Label className="mb-3 block">Refund Type</Label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setRefundType('full')}
              className={cn(
                'p-4 rounded-lg border-2 text-left transition-all',
                refundType === 'full'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    refundType === 'full' ? 'border-primary' : 'border-border'
                  )}
                >
                  {refundType === 'full' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Full Refund</p>
                  <p className="text-sm text-text-secondary">{formatCurrency(payment.amount)}</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRefundType('partial')}
              className={cn(
                'p-4 rounded-lg border-2 text-left transition-all',
                refundType === 'partial'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    refundType === 'partial' ? 'border-primary' : 'border-border'
                  )}
                >
                  {refundType === 'partial' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Partial Refund</p>
                  <p className="text-sm text-text-secondary">Custom amount</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Partial Amount Input */}
        {refundType === 'partial' && (
          <div className="mb-6">
            <Label htmlFor="partial-amount">Refund Amount</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
              <Input
                id="partial-amount"
                type="number"
                min="0.01"
                max={payment.amount}
                step="0.01"
                value={partialAmount || ''}
                onChange={(e) => setPartialAmount(parseFloat(e.target.value) || 0)}
                className="pl-7"
                error={partialAmount > payment.amount}
              />
            </div>
            {partialAmount > payment.amount && (
              <p className="text-sm text-danger mt-1">
                Amount cannot exceed original payment ({formatCurrency(payment.amount)})
              </p>
            )}
          </div>
        )}

        {/* Reason Selection */}
        <div className="mb-6">
          <Label htmlFor="refund-reason">Reason for Refund</Label>
          <Select
            id="refund-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1"
          >
            <option value="">Select a reason...</option>
            {REFUND_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Additional Notes */}
        <div className="mb-6">
          <Label htmlFor="refund-notes">Additional Notes (Optional)</Label>
          <Textarea
            id="refund-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional details..."
            rows={3}
            className="mt-1"
          />
        </div>

        {/* Refund Summary */}
        <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-warning mt-0.5 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <p className="font-medium text-warning">Refund Summary</p>
              <p className="text-sm text-text-secondary mt-1">
                You are about to refund{' '}
                <span className="font-bold">{formatCurrency(refundAmount)}</span>
                {refundType === 'full' ? ' (full refund)' : ' (partial refund)'}. This action
                cannot be undone.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowConfirmDialog(true)}
            disabled={!isFormValid || processRefundMutation.isPending}
            className="flex-1"
          >
            {processRefundMutation.isPending ? (
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
                Processing...
              </span>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="3,11 3,3 11,3" />
                  <polyline points="21,13 21,21 13,21" />
                  <line x1="3" y1="3" x2="9" y2="9" />
                  <line x1="15" y1="15" x2="21" y2="21" />
                </svg>
                Process Refund
              </>
            )}
          </Button>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
          <DialogContent size="sm">
            <DialogHeader onClose={() => setShowConfirmDialog(false)}>Confirm Refund</DialogHeader>
            <DialogBody>
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-danger"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <p className="text-lg font-semibold mb-2">
                  Refund {formatCurrency(refundAmount)}?
                </p>
                <p className="text-text-secondary">
                  This will issue a {refundType} refund to the customer. This action cannot be
                  undone.
                </p>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleSubmitRefund}>
                Confirm Refund
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default RefundProcessor;
