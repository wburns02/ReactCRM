/**
 * Payment Plan Calculator Component
 * Interactive calculator showing monthly payment options
 */
import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface PaymentPlanCalculatorProps {
  defaultAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  onSelectPlan?: (plan: SelectedPlan) => void;
  className?: string;
}

interface SelectedPlan {
  amount: number;
  termMonths: number;
  apr: number;
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
}

// Standard financing terms (these would come from provider in production)
const FINANCING_TERMS = [
  { termMonths: 6, apr: 0, label: '6 months', promo: true },
  { termMonths: 12, apr: 9.99, label: '12 months' },
  { termMonths: 24, apr: 12.99, label: '24 months' },
  { termMonths: 36, apr: 14.99, label: '36 months' },
  { termMonths: 48, apr: 17.99, label: '48 months' },
  { termMonths: 60, apr: 19.99, label: '60 months' },
];

function calculateMonthlyPayment(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) {
    return principal / months;
  }
  const monthlyRate = annualRate / 100 / 12;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
}

export function PaymentPlanCalculator({
  defaultAmount = 5000,
  minAmount = 500,
  maxAmount = 50000,
  onSelectPlan,
  className,
}: PaymentPlanCalculatorProps) {
  const [amount, setAmount] = useState(defaultAmount);
  const [selectedTermIndex, setSelectedTermIndex] = useState(1); // Default to 12 months

  const selectedTerm = FINANCING_TERMS[selectedTermIndex];

  const calculations = useMemo(() => {
    return FINANCING_TERMS.map(term => {
      const monthlyPayment = calculateMonthlyPayment(amount, term.apr, term.termMonths);
      const totalPayment = monthlyPayment * term.termMonths;
      const totalInterest = totalPayment - amount;
      return {
        ...term,
        monthlyPayment,
        totalPayment,
        totalInterest,
      };
    });
  }, [amount]);

  const selectedCalculation = calculations[selectedTermIndex];

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
    setAmount(Math.min(Math.max(value, minAmount), maxAmount));
  };

  const handleSelectPlan = () => {
    if (onSelectPlan) {
      onSelectPlan({
        amount,
        termMonths: selectedTerm.termMonths,
        apr: selectedTerm.apr,
        monthlyPayment: selectedCalculation.monthlyPayment,
        totalInterest: selectedCalculation.totalInterest,
        totalPayment: selectedCalculation.totalPayment,
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">💳</span>
          Payment Plan Calculator
        </CardTitle>
        <p className="text-sm text-text-secondary">
          Calculate your monthly payments with flexible financing
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Amount Input */}
        <div>
          <Label htmlFor="finance-amount">Finance Amount</Label>
          <div className="mt-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
            <Input
              id="finance-amount"
              type="text"
              value={amount.toLocaleString()}
              onChange={handleAmountChange}
              className="pl-7 text-lg font-semibold"
            />
          </div>
          <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>Min: {formatCurrency(minAmount)}</span>
            <span>Max: {formatCurrency(maxAmount)}</span>
          </div>
        </div>

        {/* Amount Slider */}
        <div>
          <input
            type="range"
            min={minAmount}
            max={maxAmount}
            step={100}
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value))}
            className="w-full h-2 bg-bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>

        {/* Term Options */}
        <div>
          <Label>Select Term Length</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {calculations.map((calc, index) => (
              <button
                key={calc.termMonths}
                onClick={() => setSelectedTermIndex(index)}
                className={cn(
                  'relative p-3 rounded-lg border-2 text-left transition-all',
                  selectedTermIndex === index
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                {calc.promo && (
                  <span className="absolute -top-2 -right-2 bg-success text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    0% APR
                  </span>
                )}
                <div className="font-medium text-sm">{calc.label}</div>
                <div className="text-lg font-bold text-primary">
                  {formatCurrency(calc.monthlyPayment)}
                  <span className="text-xs font-normal text-text-muted">/mo</span>
                </div>
                <div className="text-xs text-text-muted">{calc.apr}% APR</div>
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-bg-muted rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Monthly Payment</span>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(selectedCalculation.monthlyPayment)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-muted">Term Length</span>
            <span className="font-medium">{selectedTerm.termMonths} months</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-muted">Interest Rate (APR)</span>
            <span className="font-medium">
              {selectedTerm.apr === 0 ? (
                <span className="text-success">0% Promotional</span>
              ) : (
                `${selectedTerm.apr}%`
              )}
            </span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between items-center text-sm">
            <span className="text-text-muted">Total Interest</span>
            <span className="font-medium">
              {selectedCalculation.totalInterest <= 0 ? (
                <span className="text-success">$0.00</span>
              ) : (
                formatCurrency(selectedCalculation.totalInterest)
              )}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-muted">Total Payment</span>
            <span className="font-semibold">{formatCurrency(selectedCalculation.totalPayment)}</span>
          </div>
        </div>

        {/* CTA */}
        {onSelectPlan && (
          <button
            onClick={handleSelectPlan}
            className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
          >
            Apply for This Plan
          </button>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-text-muted text-center">
          * Rates shown are estimates. Actual rates depend on credit approval.
          No impact to your credit score for checking rates.
        </p>
      </CardContent>
    </Card>
  );
}

export default PaymentPlanCalculator;
