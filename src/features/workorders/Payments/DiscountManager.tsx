/**
 * DiscountManager Component
 *
 * Apply coupon codes, percentage or fixed discounts, and loyalty discounts.
 */

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { cn } from '@/lib/utils.ts';
import {
  type Discount,
  formatCurrency,
  isValidCouponFormat,
  applyDiscount,
} from './utils/pricingEngine.ts';
import { useApplyDiscount } from './hooks/usePayments.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface DiscountManagerProps {
  /** Current subtotal to calculate discount on */
  subtotal: number;
  /** Current applied discount */
  appliedDiscount?: Discount | null;
  /** Customer loyalty tier for auto-discounts */
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
  /** Callback when discount is applied */
  onDiscountApplied: (discount: Discount | null) => void;
  /** Additional CSS classes */
  className?: string;
}

// Loyalty discount mapping
const LOYALTY_DISCOUNTS: Record<string, Discount> = {
  bronze: { code: 'LOYALTY_BRONZE', type: 'percentage', value: 5, description: 'Bronze Member - 5% off' },
  silver: { code: 'LOYALTY_SILVER', type: 'percentage', value: 10, description: 'Silver Member - 10% off' },
  gold: { code: 'LOYALTY_GOLD', type: 'percentage', value: 15, description: 'Gold Member - 15% off' },
  platinum: { code: 'LOYALTY_PLATINUM', type: 'percentage', value: 20, description: 'Platinum Member - 20% off' },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function DiscountManager({
  subtotal,
  appliedDiscount,
  loyaltyTier,
  onDiscountApplied,
  className,
}: DiscountManagerProps) {
  const [couponCode, setCouponCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showLoyaltyOption, setShowLoyaltyOption] = useState(false);

  const applyDiscountMutation = useApplyDiscount();

  // Check for loyalty discount availability
  useEffect(() => {
    if (loyaltyTier && !appliedDiscount) {
      setShowLoyaltyOption(true);
    }
  }, [loyaltyTier, appliedDiscount]);

  // Handle coupon code submission
  const handleApplyCoupon = async () => {
    setError(null);

    if (!couponCode.trim()) {
      setError('Please enter a coupon code');
      return;
    }

    if (!isValidCouponFormat(couponCode)) {
      setError('Invalid coupon code format');
      return;
    }

    try {
      const result = await applyDiscountMutation.mutateAsync(couponCode);

      if (result.isValid && result.discount) {
        // Validate against current subtotal
        const discountResult = applyDiscount(subtotal, result.discount);
        if (!discountResult.isValid) {
          setError(discountResult.message || 'Discount cannot be applied');
          return;
        }

        onDiscountApplied(result.discount);
        setCouponCode('');
      } else {
        setError(result.message || 'Invalid coupon code');
      }
    } catch {
      setError('Failed to validate coupon code');
    }
  };

  // Apply loyalty discount
  const handleApplyLoyalty = () => {
    if (loyaltyTier && LOYALTY_DISCOUNTS[loyaltyTier]) {
      onDiscountApplied(LOYALTY_DISCOUNTS[loyaltyTier]);
      setShowLoyaltyOption(false);
    }
  };

  // Remove applied discount
  const handleRemoveDiscount = () => {
    onDiscountApplied(null);
    setCouponCode('');
    setError(null);
    if (loyaltyTier) {
      setShowLoyaltyOption(true);
    }
  };

  // Calculate savings display
  const savingsAmount = appliedDiscount
    ? applyDiscount(subtotal, appliedDiscount).discountAmount
    : 0;

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
            <path d="M21.41 11.58l-9-9A2 2 0 0011 2H4a2 2 0 00-2 2v7a2 2 0 00.59 1.42l9 9A2 2 0 0013 22a2 2 0 001.41-.59l7-7a2 2 0 000-2.83z" />
            <circle cx="7.5" cy="7.5" r="1.5" />
          </svg>
          Discounts & Coupons
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Applied Discount Display */}
        {appliedDiscount && (
          <div className="mb-4 p-4 bg-success/10 border border-success/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/20 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-success"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22,4 12,14.01 9,11.01" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-success">{appliedDiscount.description}</p>
                  <p className="text-sm text-text-secondary">
                    Code: <span className="font-mono">{appliedDiscount.code}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-success">-{formatCurrency(savingsAmount)}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveDiscount}
                  className="text-text-muted hover:text-danger mt-1"
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Loyalty Discount Auto-Apply */}
        {showLoyaltyOption && loyaltyTier && !appliedDiscount && (
          <div className="mb-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-primary"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-primary">
                    {LOYALTY_DISCOUNTS[loyaltyTier].description}
                  </p>
                  <p className="text-sm text-text-secondary">Loyalty discount available</p>
                </div>
              </div>
              <Button variant="primary" size="sm" onClick={handleApplyLoyalty}>
                Apply
              </Button>
            </div>
          </div>
        )}

        {/* Coupon Code Input */}
        {!appliedDiscount && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  placeholder="Enter coupon code"
                  className={cn('uppercase', error && 'border-danger')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleApplyCoupon();
                    }
                  }}
                />
              </div>
              <Button
                variant="secondary"
                onClick={handleApplyCoupon}
                disabled={applyDiscountMutation.isPending}
              >
                {applyDiscountMutation.isPending ? (
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
                    Checking...
                  </span>
                ) : (
                  'Apply'
                )}
              </Button>
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-danger flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </p>
            )}

            {/* Coupon Hints */}
            <div className="text-xs text-text-muted">
              <p>Have a coupon code? Enter it above to save on your order.</p>
            </div>
          </div>
        )}

        {/* Savings Summary */}
        {appliedDiscount && savingsAmount > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Your Savings</span>
              <span className="text-xl font-bold text-success">{formatCurrency(savingsAmount)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DiscountManager;
