/**
 * Apply For Financing Wizard
 * Multi-step financing application flow
 */
import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useRequestFinancing, useFinancingOffers } from '@/api/hooks/useFintech';
import { FINANCING_PROVIDER_LABELS } from '@/api/types/fintech';
import type { FinancingProvider } from '@/api/types/fintech';

interface ApplyForFinancingWizardProps {
  open: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  invoiceId?: string;
  amount: number;
  onSuccess?: (applicationId: string) => void;
}

type WizardStep = 'amount' | 'offers' | 'details' | 'review' | 'processing' | 'complete';

interface ApplicationData {
  amount: number;
  provider: FinancingProvider | null;
  termMonths: number;
  apr: number;
  monthlyPayment: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ssn: string;
  dob: string;
  annualIncome: string;
  employmentStatus: string;
}

const STEPS: { key: WizardStep; title: string }[] = [
  { key: 'amount', title: 'Amount' },
  { key: 'offers', title: 'Select Offer' },
  { key: 'details', title: 'Your Info' },
  { key: 'review', title: 'Review' },
];

export function ApplyForFinancingWizard({
  open,
  onClose,
  customerId,
  customerName = '',
  customerEmail = '',
  customerPhone = '',
  invoiceId,
  amount,
  onSuccess,
}: ApplyForFinancingWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('amount');
  const [data, setData] = useState<ApplicationData>(() => {
    const [firstName = '', lastName = ''] = customerName.split(' ');
    return {
      amount,
      provider: null,
      termMonths: 12,
      apr: 9.99,
      monthlyPayment: 0,
      firstName,
      lastName,
      email: customerEmail,
      phone: customerPhone,
      ssn: '',
      dob: '',
      annualIncome: '',
      employmentStatus: 'employed',
    };
  });
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const { data: offers, isLoading: offersLoading } = useFinancingOffers(data.amount);
  const requestFinancing = useRequestFinancing();

  const updateData = useCallback((updates: Partial<ApplicationData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleNext = () => {
    const stepOrder: WizardStep[] = ['amount', 'offers', 'details', 'review', 'processing', 'complete'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const stepOrder: WizardStep[] = ['amount', 'offers', 'details', 'review'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    setCurrentStep('processing');

    try {
      const result = await requestFinancing.mutateAsync({
        customer_id: customerId,
        amount: data.amount,
        invoice_id: invoiceId,
        provider: data.provider || 'wisetack',
      });

      setApplicationId(result.id);
      setCurrentStep('complete');
      onSuccess?.(result.id);
    } catch (error) {
      console.error('Financing application error:', error);
      setCurrentStep('review');
    }
  };

  const selectOffer = (provider: FinancingProvider, termMonths: number, apr: number) => {
    const monthlyPayment = calculateMonthlyPayment(data.amount, apr, termMonths);
    updateData({ provider, termMonths, apr, monthlyPayment });
    handleNext();
  };

  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply for Financing</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        {currentStep !== 'processing' && currentStep !== 'complete' && (
          <div className="flex items-center justify-between mb-6 px-4">
            {STEPS.map((step, index) => (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    index <= currentStepIndex
                      ? 'bg-primary text-white'
                      : 'bg-bg-muted text-text-muted'
                  )}>
                    {index < currentStepIndex ? '✓' : index + 1}
                  </div>
                  <span className="text-xs mt-1 text-text-muted">{step.title}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    'w-16 h-0.5 mx-2 mb-5',
                    index < currentStepIndex ? 'bg-primary' : 'bg-bg-muted'
                  )} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step Content */}
        <div className="py-4">
          {/* Step 1: Amount */}
          {currentStep === 'amount' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">How much do you need to finance?</h3>
                <p className="text-text-secondary">Enter the amount you'd like to finance</p>
              </div>

              <div className="max-w-xs mx-auto">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-text-muted">$</span>
                  <Input
                    type="number"
                    value={data.amount}
                    onChange={(e) => updateData({ amount: parseFloat(e.target.value) || 0 })}
                    className="pl-10 text-3xl font-bold text-center h-16"
                    min={500}
                    max={50000}
                  />
                </div>
                <p className="text-center text-sm text-text-muted mt-2">
                  Min: $500 | Max: $50,000
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={handleNext} disabled={data.amount < 500}>
                  See Offers →
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Select Offer */}
          {currentStep === 'offers' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Choose a Payment Plan</h3>
                <p className="text-text-secondary">
                  Financing {formatCurrency(data.amount)}
                </p>
              </div>

              {offersLoading ? (
                <div className="text-center py-8">Loading offers...</div>
              ) : !offers?.length ? (
                <div className="text-center py-8 text-text-secondary">
                  No offers available for this amount
                </div>
              ) : (
                <div className="space-y-3">
                  {offers.map((offer) => (
                    <Card key={offer.id} className="hover:border-primary transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{FINANCING_PROVIDER_LABELS[offer.provider]}</h4>
                            {offer.promo_apr === 0 && (
                              <Badge className="bg-success/10 text-success text-xs mt-1">
                                0% APR Promotion
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {offer.terms.slice(0, 3).map((term) => {
                            const monthly = (data.amount / 1000) * term.monthly_payment_per_1000;
                            return (
                              <button
                                key={term.term_months}
                                onClick={() => selectOffer(offer.provider, term.term_months, term.apr)}
                                className="p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                              >
                                <div className="text-lg font-bold text-primary">
                                  {formatCurrency(monthly)}
                                </div>
                                <div className="text-xs text-text-muted">
                                  {term.term_months} mo @ {term.apr}% APR
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex justify-between gap-2 pt-4">
                <Button variant="secondary" onClick={handleBack}>← Back</Button>
              </div>
            </div>
          )}

          {/* Step 3: Personal Details */}
          {currentStep === 'details' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Your Information</h3>
                <p className="text-text-secondary">Required for credit application</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={data.firstName}
                    onChange={(e) => updateData({ firstName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={data.lastName}
                    onChange={(e) => updateData({ lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={data.email}
                    onChange={(e) => updateData({ email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={data.phone}
                    onChange={(e) => updateData({ phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={data.dob}
                    onChange={(e) => updateData({ dob: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ssn">Last 4 of SSN</Label>
                  <Input
                    id="ssn"
                    type="password"
                    maxLength={4}
                    value={data.ssn}
                    onChange={(e) => updateData({ ssn: e.target.value.replace(/\D/g, '') })}
                    placeholder="••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="income">Annual Income</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                    <Input
                      id="income"
                      type="text"
                      value={data.annualIncome}
                      onChange={(e) => updateData({ annualIncome: e.target.value })}
                      className="pl-7"
                      placeholder="60,000"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="employment">Employment Status</Label>
                  <select
                    id="employment"
                    value={data.employmentStatus}
                    onChange={(e) => updateData({ employmentStatus: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-border bg-white"
                  >
                    <option value="employed">Employed</option>
                    <option value="self-employed">Self-Employed</option>
                    <option value="retired">Retired</option>
                    <option value="student">Student</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between gap-2 pt-4">
                <Button variant="secondary" onClick={handleBack}>← Back</Button>
                <Button onClick={handleNext}>Review Application →</Button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Review Your Application</h3>
              </div>

              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-border">
                    <span className="text-text-secondary">Finance Amount</span>
                    <span className="font-bold text-lg">{formatCurrency(data.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Monthly Payment</span>
                    <span className="font-bold text-primary">{formatCurrency(data.monthlyPayment)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Term</span>
                    <span className="font-medium">{data.termMonths} months</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">APR</span>
                    <span className="font-medium">{data.apr}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Provider</span>
                    <span className="font-medium">
                      {data.provider ? FINANCING_PROVIDER_LABELS[data.provider] : 'Wisetack'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <div className="text-xs text-text-muted text-center p-3 bg-bg-muted rounded-lg">
                By clicking "Submit Application", you agree to the terms and conditions
                and authorize a credit check. This may affect your credit score.
              </div>

              <div className="flex justify-between gap-2 pt-4">
                <Button variant="secondary" onClick={handleBack}>← Back</Button>
                <Button onClick={handleSubmit} disabled={requestFinancing.isPending}>
                  {requestFinancing.isPending ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </div>
          )}

          {/* Processing */}
          {currentStep === 'processing' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Processing Your Application</h3>
              <p className="text-text-secondary">This usually takes just a few seconds...</p>
            </div>
          )}

          {/* Complete */}
          {currentStep === 'complete' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-success text-3xl">✓</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-success">Application Submitted!</h3>
              <p className="text-text-secondary mb-4">
                Your financing application has been submitted successfully.
                You'll receive a decision shortly.
              </p>
              {applicationId && (
                <p className="text-sm text-text-muted mb-6">
                  Application ID: {applicationId}
                </p>
              )}
              <Button onClick={onClose}>Done</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function
function calculateMonthlyPayment(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) return principal / months;
  const monthlyRate = annualRate / 100 / 12;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
}

export default ApplyForFinancingWizard;
