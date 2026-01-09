/**
 * FinancingOptions Component
 *
 * Payment plan calculator with monthly payment options and financing application.
 */

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Label } from '@/components/ui/Label.tsx';
import { Checkbox } from '@/components/ui/Checkbox.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog.tsx';
import { cn } from '@/lib/utils.ts';
import {
  formatCurrency,
  calculateMonthlyPayment,
  FINANCING_PLANS,
  FINANCING_MIN_AMOUNT,
  FINANCING_MAX_AMOUNT,
  isEligibleForFinancing,
} from './utils/pricingEngine.ts';
import { useApplyForFinancing } from './hooks/usePayments.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface FinancingOptionsProps {
  /** Invoice ID for financing application */
  invoiceId: string;
  /** Customer ID for financing application */
  customerId: string;
  /** Total amount to finance */
  amount: number;
  /** Customer name for display */
  customerName?: string;
  /** Callback when financing is approved */
  onApproved?: (planMonths: number, monthlyPayment: number) => void;
  /** Callback when financing is declined */
  onDeclined?: (reason: string) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FinancingOptions({
  invoiceId,
  customerId,
  amount,
  customerName,
  onApproved,
  onDeclined,
  className,
}: FinancingOptionsProps) {
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [applicationStep, setApplicationStep] = useState<'info' | 'consent' | 'processing' | 'result'>(
    'info'
  );

  // Application form state
  const [ssn4, setSsn4] = useState('');
  const [dob, setDob] = useState('');
  const [income, setIncome] = useState<number | ''>('');
  const [consent, setConsent] = useState(false);

  // Result state
  const [applicationResult, setApplicationResult] = useState<{
    approved: boolean;
    message: string;
  } | null>(null);

  const applyMutation = useApplyForFinancing();

  // Check if amount is eligible
  const isEligible = isEligibleForFinancing(amount);

  // Calculate plan options
  const planOptions = useMemo(() => {
    return FINANCING_PLANS.map((plan) => {
      const calculation = calculateMonthlyPayment(amount, plan.months, plan.rate);
      return {
        ...plan,
        ...calculation,
      };
    });
  }, [amount]);

  // Get selected plan details
  const selectedPlanDetails = useMemo(() => {
    if (selectedPlan === null) return null;
    return planOptions.find((p) => p.months === selectedPlan) || null;
  }, [selectedPlan, planOptions]);

  // Validate application form
  const isFormValid = useMemo(() => {
    if (applicationStep === 'info') {
      return ssn4.length === 4 && dob && income;
    }
    if (applicationStep === 'consent') {
      return consent;
    }
    return false;
  }, [applicationStep, ssn4, dob, income, consent]);

  // Handle application submission
  const handleSubmitApplication = async () => {
    if (!selectedPlanDetails) return;

    setApplicationStep('processing');

    try {
      const result = await applyMutation.mutateAsync({
        invoiceId,
        customerId,
        planMonths: selectedPlanDetails.months,
        applicationData: {
          ssn_last4: ssn4,
          dob,
          income: income as number,
          consent,
        },
      });

      if (result.approved) {
        setApplicationResult({
          approved: true,
          message: 'Congratulations! Your financing application has been approved.',
        });
        onApproved?.(selectedPlanDetails.months, selectedPlanDetails.monthlyPayment);
      } else {
        setApplicationResult({
          approved: false,
          message: result.message || 'We were unable to approve your application at this time.',
        });
        onDeclined?.(result.message || 'Application declined');
      }
    } catch (error) {
      setApplicationResult({
        approved: false,
        message: 'An error occurred while processing your application. Please try again.',
      });
    }

    setApplicationStep('result');
  };

  // Reset application
  const resetApplication = () => {
    setShowApplicationDialog(false);
    setApplicationStep('info');
    setSsn4('');
    setDob('');
    setIncome('');
    setConsent(false);
    setApplicationResult(null);
  };

  // Format APR for display
  const formatAPR = (rate: number) => {
    if (rate === 0) return '0%';
    return `${(rate * 100).toFixed(2)}%`;
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
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
          </svg>
          Financing Options
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Eligibility Check */}
        {!isEligible ? (
          <div className="text-center py-8">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto text-text-muted mb-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-text-secondary mb-2">Financing not available</p>
            <p className="text-sm text-text-muted">
              Financing is available for amounts between {formatCurrency(FINANCING_MIN_AMOUNT)} and{' '}
              {formatCurrency(FINANCING_MAX_AMOUNT)}.
            </p>
          </div>
        ) : (
          <>
            {/* Amount Display */}
            <div className="mb-6 p-4 bg-bg-hover/50 rounded-lg text-center">
              <p className="text-sm text-text-secondary">Amount to Finance</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(amount)}</p>
              {customerName && (
                <p className="text-sm text-text-muted mt-1">for {customerName}</p>
              )}
            </div>

            {/* Plan Options */}
            <div className="space-y-3 mb-6">
              <p className="text-sm font-medium text-text-secondary">Choose a payment plan:</p>

              {planOptions.map((plan) => (
                <button
                  key={plan.months}
                  type="button"
                  onClick={() => setSelectedPlan(plan.months)}
                  className={cn(
                    'w-full p-4 rounded-lg border-2 text-left transition-all',
                    selectedPlan === plan.months
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                          selectedPlan === plan.months ? 'border-primary' : 'border-border'
                        )}
                      >
                        {selectedPlan === plan.months && (
                          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{plan.label}</p>
                        {plan.rate === 0 && (
                          <span className="inline-block px-2 py-0.5 bg-success/10 text-success text-xs rounded-full mt-1">
                            No Interest
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">
                        {formatCurrency(plan.monthlyPayment)}
                        <span className="text-sm font-normal text-text-secondary">/mo</span>
                      </p>
                      {plan.totalInterest > 0 && (
                        <p className="text-xs text-text-muted">
                          Total: {formatCurrency(plan.totalPayment)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Selected Plan Details */}
            {selectedPlanDetails && (
              <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="font-medium mb-3">Payment Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Financed Amount</span>
                    <span>{formatCurrency(amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Term</span>
                    <span>{selectedPlanDetails.months} months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">APR</span>
                    <span>{formatAPR(selectedPlanDetails.rate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Monthly Payment</span>
                    <span className="font-bold">{formatCurrency(selectedPlanDetails.monthlyPayment)}</span>
                  </div>
                  {selectedPlanDetails.totalInterest > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Total Interest</span>
                        <span>{formatCurrency(selectedPlanDetails.totalInterest)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-2">
                        <span className="font-medium">Total Amount</span>
                        <span className="font-bold">{formatCurrency(selectedPlanDetails.totalPayment)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Apply Button */}
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowApplicationDialog(true)}
              disabled={!selectedPlan}
              className="w-full"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10,9 9,9 8,9" />
              </svg>
              Apply for Financing
            </Button>

            {/* Disclaimer */}
            <p className="text-xs text-text-muted mt-4 text-center">
              Subject to credit approval. Terms and conditions apply. Rates may vary based on
              creditworthiness.
            </p>
          </>
        )}

        {/* Application Dialog */}
        <Dialog open={showApplicationDialog} onClose={resetApplication}>
          <DialogContent size="md">
            <DialogHeader onClose={resetApplication}>
              {applicationStep === 'result' ? (
                applicationResult?.approved ? 'Application Approved!' : 'Application Result'
              ) : (
                'Financing Application'
              )}
            </DialogHeader>
            <DialogBody>
              {/* Step: Info */}
              {applicationStep === 'info' && (
                <div className="space-y-4">
                  <p className="text-text-secondary">
                    Please provide the following information to complete your financing application.
                  </p>

                  <div>
                    <Label htmlFor="ssn4">Last 4 digits of SSN</Label>
                    <Input
                      id="ssn4"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={ssn4}
                      onChange={(e) => setSsn4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="****"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="income">Annual Income</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                      <Input
                        id="income"
                        type="number"
                        min="0"
                        value={income}
                        onChange={(e) => setIncome(e.target.value ? parseInt(e.target.value) : '')}
                        placeholder="50000"
                        className="pl-7"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step: Consent */}
              {applicationStep === 'consent' && (
                <div className="space-y-4">
                  <div className="p-4 bg-bg-hover/50 rounded-lg max-h-48 overflow-y-auto text-sm">
                    <h4 className="font-medium mb-2">Terms and Conditions</h4>
                    <p className="text-text-secondary mb-2">
                      By submitting this application, you authorize us to:
                    </p>
                    <ul className="list-disc pl-5 text-text-secondary space-y-1">
                      <li>
                        Obtain a consumer credit report for the purpose of evaluating your
                        creditworthiness
                      </li>
                      <li>Share your information with our financing partners</li>
                      <li>
                        Contact you regarding your application via phone, email, or text message
                      </li>
                      <li>Verify the information provided in this application</li>
                    </ul>
                    <p className="text-text-secondary mt-2">
                      The financing terms shown are estimates and may vary based on your credit
                      profile. Final terms will be provided upon approval.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="consent-check"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <label htmlFor="consent-check" className="text-sm text-text-secondary">
                      I have read and agree to the terms and conditions. I authorize a credit check
                      and understand this may affect my credit score.
                    </label>
                  </div>
                </div>
              )}

              {/* Step: Processing */}
              {applicationStep === 'processing' && (
                <div className="text-center py-8">
                  <svg className="animate-spin h-12 w-12 mx-auto text-primary mb-4" viewBox="0 0 24 24">
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
                  <p className="text-lg font-medium">Processing your application...</p>
                  <p className="text-text-secondary mt-1">This usually takes just a few seconds.</p>
                </div>
              )}

              {/* Step: Result */}
              {applicationStep === 'result' && applicationResult && (
                <div className="text-center py-4">
                  {applicationResult.approved ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8 text-success"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                          <polyline points="22,4 12,14.01 9,11.01" />
                        </svg>
                      </div>
                      <p className="text-lg font-medium text-success mb-2">
                        {applicationResult.message}
                      </p>
                      {selectedPlanDetails && (
                        <div className="mt-4 p-4 bg-bg-hover/50 rounded-lg">
                          <p className="text-2xl font-bold text-primary">
                            {formatCurrency(selectedPlanDetails.monthlyPayment)}
                            <span className="text-sm font-normal text-text-secondary">/month</span>
                          </p>
                          <p className="text-sm text-text-muted mt-1">
                            for {selectedPlanDetails.months} months at{' '}
                            {formatAPR(selectedPlanDetails.rate)} APR
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8 text-danger"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                      </div>
                      <p className="text-lg font-medium mb-2">{applicationResult.message}</p>
                      <p className="text-text-secondary text-sm">
                        You may still pay for your service using other payment methods, or you can
                        try applying again later.
                      </p>
                    </>
                  )}
                </div>
              )}
            </DialogBody>
            <DialogFooter>
              {applicationStep === 'info' && (
                <>
                  <Button variant="secondary" onClick={resetApplication}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setApplicationStep('consent')}
                    disabled={!isFormValid}
                  >
                    Continue
                  </Button>
                </>
              )}
              {applicationStep === 'consent' && (
                <>
                  <Button variant="secondary" onClick={() => setApplicationStep('info')}>
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSubmitApplication}
                    disabled={!consent}
                  >
                    Submit Application
                  </Button>
                </>
              )}
              {applicationStep === 'result' && (
                <Button variant="primary" onClick={resetApplication} className="w-full">
                  {applicationResult?.approved ? 'Done' : 'Close'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default FinancingOptions;
