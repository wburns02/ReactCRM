/**
 * Financing Eligibility Widget
 * Quick check for customer financing eligibility
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

interface FinancingEligibilityWidgetProps {
  customerName?: string;
  amount?: number;
  onCheckEligibility?: (eligible: boolean, maxAmount: number) => void;
  onApplyNow?: () => void;
  className?: string;
  compact?: boolean;
}

interface EligibilityResult {
  eligible: boolean;
  maxAmount: number;
  reason?: string;
  prequalified?: boolean;
  offers?: number;
}

export function FinancingEligibilityWidget({
  customerName,
  amount = 0,
  onCheckEligibility,
  onApplyNow,
  className,
  compact = false,
}: FinancingEligibilityWidgetProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [checkAmount, setCheckAmount] = useState(amount || 1000);

  const handleCheckEligibility = async () => {
    setIsChecking(true);

    // Simulate API call - in production, this would call the actual API
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock result - in production this would come from the API
    const mockResult: EligibilityResult = {
      eligible: true,
      maxAmount: Math.min(checkAmount * 2, 50000),
      prequalified: checkAmount <= 5000,
      offers: 4,
    };

    setResult(mockResult);
    setIsChecking(false);
    onCheckEligibility?.(mockResult.eligible, mockResult.maxAmount);
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 p-3 bg-success/10 rounded-lg border border-success/20', className)}>
        <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
          <span className="text-success text-lg">✓</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-success">Financing Available</p>
          <p className="text-sm text-text-secondary">0% APR for 6 months available</p>
        </div>
        {onApplyNow && (
          <Button size="sm" onClick={onApplyNow}>
            Apply
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
            result?.eligible ? 'bg-success/20' : 'bg-primary/20'
          )}>
            {result?.eligible ? (
              <span className="text-success text-xl">✓</span>
            ) : (
              <span className="text-primary text-xl">💳</span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-text-primary">
                {result?.eligible ? 'Pre-Qualified!' : 'Check Financing Eligibility'}
              </h4>
              {result?.prequalified && (
                <Badge className="bg-success/10 text-success text-xs">Pre-Approved</Badge>
              )}
            </div>

            {!result ? (
              // Not checked yet
              <>
                <p className="text-sm text-text-secondary mb-3">
                  {customerName ? `Check if ${customerName} qualifies` : 'See if you qualify'} for financing with no impact to credit score.
                </p>

                {/* Quick check form */}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label htmlFor="check-amount" className="text-xs">Amount</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
                      <Input
                        id="check-amount"
                        type="number"
                        value={checkAmount}
                        onChange={(e) => setCheckAmount(parseFloat(e.target.value) || 0)}
                        className="pl-6 h-9"
                        min={500}
                        max={50000}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleCheckEligibility}
                    disabled={isChecking || checkAmount < 500}
                    className="h-9"
                  >
                    {isChecking ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Checking...
                      </span>
                    ) : (
                      'Check Now'
                    )}
                  </Button>
                </div>
              </>
            ) : result.eligible ? (
              // Eligible
              <>
                <p className="text-sm text-text-secondary mb-2">
                  {customerName || 'You'} qualified for up to{' '}
                  <span className="font-semibold text-success">{formatCurrency(result.maxAmount)}</span> in financing!
                </p>
                <div className="flex items-center gap-4 text-sm mb-3">
                  <span className="text-text-muted">
                    <span className="font-medium text-text-primary">{result.offers}</span> offers available
                  </span>
                  <span className="text-success font-medium">0% APR options</span>
                </div>
                {onApplyNow && (
                  <Button onClick={onApplyNow} className="w-full sm:w-auto">
                    Apply for Financing
                  </Button>
                )}
              </>
            ) : (
              // Not eligible
              <>
                <p className="text-sm text-warning mb-2">
                  {result.reason || 'Unable to pre-qualify at this time.'}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setResult(null)}
                >
                  Try Different Amount
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Trust badges */}
        {!result && (
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-center gap-6 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <span>🔒</span> Secure
            </span>
            <span className="flex items-center gap-1">
              <span>📊</span> No Credit Impact
            </span>
            <span className="flex items-center gap-1">
              <span>⚡</span> Instant Decision
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FinancingEligibilityWidget;
