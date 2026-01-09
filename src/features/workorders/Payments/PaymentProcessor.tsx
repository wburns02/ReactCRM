/**
 * PaymentProcessor Component
 *
 * Payment collection with multiple payment method tabs (Card, ACH, Cash, Check).
 */

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Label } from '@/components/ui/Label.tsx';
import { Tabs, TabList, TabTrigger, TabContent } from '@/components/ui/Tabs.tsx';
import { cn } from '@/lib/utils.ts';
import { formatCurrency } from './utils/pricingEngine.ts';
import { useProcessPayment, type ProcessPaymentParams } from './hooks/usePayments.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface PaymentProcessorProps {
  /** Work order ID to attach payment to */
  workOrderId: string;
  /** Invoice ID if paying an invoice */
  invoiceId?: string;
  /** Amount to charge */
  amount: number;
  /** Customer name for display */
  customerName?: string;
  /** Callback on successful payment */
  onSuccess?: (transactionId: string) => void;
  /** Callback on payment failure */
  onError?: (error: string) => void;
  /** Additional CSS classes */
  className?: string;
}

type PaymentMethod = 'card' | 'ach' | 'cash' | 'check';

// ============================================================================
// COMPONENT
// ============================================================================

export function PaymentProcessor({
  workOrderId,
  invoiceId,
  amount,
  customerName,
  onSuccess,
  onError,
  className,
}: PaymentProcessorProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [customAmount, setCustomAmount] = useState<number>(amount);
  const [isCustomAmount, setIsCustomAmount] = useState(false);

  // Card payment state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');

  // ACH payment state
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking');

  // Check payment state
  const [checkNumber, setCheckNumber] = useState('');
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);

  // Cash payment state
  const [cashReceived, setCashReceived] = useState<number>(0);

  // Notes
  const [notes, setNotes] = useState('');

  // Success/Error state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processPaymentMutation = useProcessPayment();

  // Get payment amount
  const paymentAmount = isCustomAmount ? customAmount : amount;

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  // Format expiry date
  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.slice(0, 2) + (v.length > 2 ? '/' + v.slice(2, 4) : '');
    }
    return v;
  };

  // Validate card form
  const isCardValid = () => {
    return (
      cardNumber.replace(/\s/g, '').length >= 13 &&
      cardExpiry.length === 5 &&
      cardCvc.length >= 3 &&
      cardName.trim().length > 0
    );
  };

  // Validate ACH form
  const isAchValid = () => {
    return routingNumber.length === 9 && accountNumber.length >= 4;
  };

  // Validate check form
  const isCheckValid = () => {
    return checkNumber.trim().length > 0;
  };

  // Validate cash form
  const isCashValid = () => {
    return cashReceived >= paymentAmount;
  };

  // Check if current form is valid
  const isFormValid = () => {
    switch (selectedMethod) {
      case 'card':
        return isCardValid();
      case 'ach':
        return isAchValid();
      case 'check':
        return isCheckValid();
      case 'cash':
        return isCashValid();
      default:
        return false;
    }
  };

  // Process payment
  const handleProcessPayment = async () => {
    setSuccessMessage(null);
    setErrorMessage(null);

    const paymentParams: ProcessPaymentParams = {
      workOrderId,
      amount: paymentAmount,
      method: selectedMethod,
      invoiceId,
      notes,
      details: {},
    };

    // Add method-specific details
    switch (selectedMethod) {
      case 'card':
        paymentParams.details = {
          cardLast4: cardNumber.replace(/\s/g, '').slice(-4),
          cardBrand: getCardBrand(cardNumber),
        };
        break;
      case 'ach':
        paymentParams.details = {
          achAccountLast4: accountNumber.slice(-4),
        };
        break;
      case 'check':
        paymentParams.details = {
          checkNumber,
        };
        break;
    }

    try {
      const result = await processPaymentMutation.mutateAsync(paymentParams);

      if (result.success && result.transactionId) {
        setSuccessMessage(`Payment processed successfully! Transaction ID: ${result.transactionId}`);
        onSuccess?.(result.transactionId);

        // Reset form
        resetForm();
      } else {
        setErrorMessage(result.error || 'Payment failed. Please try again.');
        onError?.(result.error || 'Payment failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Payment processing failed';
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
    }
  };

  // Detect card brand
  const getCardBrand = (number: string): string => {
    const cleanNumber = number.replace(/\s/g, '');
    if (/^4/.test(cleanNumber)) return 'Visa';
    if (/^5[1-5]/.test(cleanNumber)) return 'Mastercard';
    if (/^3[47]/.test(cleanNumber)) return 'American Express';
    if (/^6(?:011|5)/.test(cleanNumber)) return 'Discover';
    return 'Card';
  };

  // Reset form
  const resetForm = () => {
    setCardNumber('');
    setCardExpiry('');
    setCardCvc('');
    setCardName('');
    setRoutingNumber('');
    setAccountNumber('');
    setCheckNumber('');
    setCashReceived(0);
    setNotes('');
  };

  // Calculate change for cash
  const changeAmount = selectedMethod === 'cash' ? Math.max(0, cashReceived - paymentAmount) : 0;

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
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          Process Payment
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

        {/* Amount Display */}
        <div className="mb-6 p-4 bg-bg-hover/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              {customerName && (
                <p className="text-sm text-text-secondary">Customer: {customerName}</p>
              )}
              <p className="text-sm text-text-secondary">Work Order: #{workOrderId}</p>
              {invoiceId && (
                <p className="text-sm text-text-secondary">Invoice: #{invoiceId}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{formatCurrency(paymentAmount)}</p>
              <button
                type="button"
                className="text-xs text-text-muted hover:text-primary underline"
                onClick={() => setIsCustomAmount(!isCustomAmount)}
              >
                {isCustomAmount ? 'Use full amount' : 'Enter custom amount'}
              </button>
            </div>
          </div>

          {/* Custom Amount Input */}
          {isCustomAmount && (
            <div className="mt-4">
              <Label htmlFor="custom-amount">Payment Amount</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                <Input
                  id="custom-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(parseFloat(e.target.value) || 0)}
                  className="pl-7"
                />
              </div>
            </div>
          )}
        </div>

        {/* Payment Method Tabs */}
        <Tabs value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as PaymentMethod)}>
          <TabList className="mb-6">
            <TabTrigger value="card">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              Card
            </TabTrigger>
            <TabTrigger value="ach">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9,22 9,12 15,12 15,22" />
              </svg>
              ACH
            </TabTrigger>
            <TabTrigger value="cash">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
              Cash
            </TabTrigger>
            <TabTrigger value="check">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Check
            </TabTrigger>
          </TabList>

          {/* Card Payment Form */}
          <TabContent value="card">
            <div className="space-y-4">
              <div>
                <Label htmlFor="card-name">Cardholder Name</Label>
                <Input
                  id="card-name"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Name on card"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="card-number">Card Number</Label>
                <Input
                  id="card-number"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  className="mt-1 font-mono"
                />
                {cardNumber && (
                  <p className="text-xs text-text-muted mt-1">
                    {getCardBrand(cardNumber)}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="card-expiry">Expiration</Label>
                  <Input
                    id="card-expiry"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/YY"
                    maxLength={5}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="card-cvc">CVC</Label>
                  <Input
                    id="card-cvc"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    maxLength={4}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Stripe Elements placeholder notice */}
              <div className="p-3 bg-bg-hover/50 rounded-lg">
                <p className="text-xs text-text-muted">
                  Card payments are processed securely through Stripe. In production, this form
                  would be replaced with Stripe Elements for PCI compliance.
                </p>
              </div>
            </div>
          </TabContent>

          {/* ACH Payment Form */}
          <TabContent value="ach">
            <div className="space-y-4">
              <div>
                <Label htmlFor="routing-number">Routing Number</Label>
                <Input
                  id="routing-number"
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="123456789"
                  maxLength={9}
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label htmlFor="account-number">Account Number</Label>
                <Input
                  id="account-number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 17))}
                  placeholder="Account number"
                  maxLength={17}
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label>Account Type</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="account-type"
                      checked={accountType === 'checking'}
                      onChange={() => setAccountType('checking')}
                      className="h-4 w-4 text-primary"
                    />
                    <span className="text-sm">Checking</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="account-type"
                      checked={accountType === 'savings'}
                      onChange={() => setAccountType('savings')}
                      className="h-4 w-4 text-primary"
                    />
                    <span className="text-sm">Savings</span>
                  </label>
                </div>
              </div>
            </div>
          </TabContent>

          {/* Cash Payment Form */}
          <TabContent value="cash">
            <div className="space-y-4">
              <div>
                <Label htmlFor="cash-received">Cash Received</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                  <Input
                    id="cash-received"
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashReceived || ''}
                    onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                    className="pl-7"
                  />
                </div>
              </div>

              {/* Change calculation */}
              {cashReceived > 0 && (
                <div className="p-4 bg-bg-hover/50 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Amount Due</span>
                    <span className="font-medium">{formatCurrency(paymentAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Cash Received</span>
                    <span className="font-medium">{formatCurrency(cashReceived)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border mt-2 pt-2">
                    <span className="font-semibold">Change Due</span>
                    <span className="font-bold text-lg text-success">
                      {formatCurrency(changeAmount)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </TabContent>

          {/* Check Payment Form */}
          <TabContent value="check">
            <div className="space-y-4">
              <div>
                <Label htmlFor="check-number">Check Number</Label>
                <Input
                  id="check-number"
                  value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)}
                  placeholder="1234"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="check-date">Check Date</Label>
                <Input
                  id="check-date"
                  type="date"
                  value={checkDate}
                  onChange={(e) => setCheckDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </TabContent>
        </Tabs>

        {/* Notes */}
        <div className="mt-6">
          <Label htmlFor="payment-notes">Notes (Optional)</Label>
          <Input
            id="payment-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this payment..."
            className="mt-1"
          />
        </div>

        {/* Process Button */}
        <div className="mt-6">
          <Button
            variant="primary"
            size="lg"
            onClick={handleProcessPayment}
            disabled={!isFormValid() || processPaymentMutation.isPending || paymentAmount <= 0}
            className="w-full"
          >
            {processPaymentMutation.isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22,4 12,14.01 9,11.01" />
                </svg>
                Process {formatCurrency(paymentAmount)}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default PaymentProcessor;
