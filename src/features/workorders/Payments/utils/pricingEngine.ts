/**
 * Pricing Engine Utilities
 *
 * Core pricing calculations for invoicing, taxes, discounts, and financing.
 */

/**
 * Tax rates by state (sample rates - should be loaded from config/API in production)
 */
export const STATE_TAX_RATES: Record<string, number> = {
  TX: 0.0825, // Texas sales tax
  CA: 0.0725,
  NY: 0.08,
  FL: 0.06,
  // Default rate
  DEFAULT: 0.0825,
};

/**
 * Service pricing catalog (sample - should come from API in production)
 */
export const SERVICE_PRICES: Record<string, { name: string; basePrice: number; unit: string }> = {
  pumping: { name: 'Septic Pumping', basePrice: 350, unit: 'service' },
  inspection: { name: 'System Inspection', basePrice: 175, unit: 'service' },
  repair: { name: 'Repair Service', basePrice: 150, unit: 'hour' },
  installation: { name: 'System Installation', basePrice: 8500, unit: 'project' },
  emergency: { name: 'Emergency Service', basePrice: 500, unit: 'call' },
  maintenance: { name: 'Maintenance Service', basePrice: 200, unit: 'service' },
  grease_trap: { name: 'Grease Trap Cleaning', basePrice: 275, unit: 'service' },
  camera_inspection: { name: 'Camera Inspection', basePrice: 350, unit: 'service' },
  riser_install: { name: 'Riser Installation', basePrice: 450, unit: 'each' },
  filter_replace: { name: 'Filter Replacement', basePrice: 85, unit: 'each' },
  line_cleaning: { name: 'Line Cleaning', basePrice: 225, unit: 'service' },
};

/**
 * Discount types
 */
export type DiscountType = 'percentage' | 'fixed';

export interface Discount {
  code: string;
  type: DiscountType;
  value: number;
  description: string;
  minPurchase?: number;
  maxDiscount?: number;
  expiresAt?: string;
}

/**
 * Line item for calculations
 */
export interface PricingLineItem {
  id: string;
  service: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
}

/**
 * Calculate tax amount on subtotal
 */
export function calculateTax(subtotal: number, rate: number): number {
  if (subtotal <= 0 || rate < 0) return 0;
  return Math.round(subtotal * rate * 100) / 100;
}

/**
 * Get tax rate for a state
 */
export function getTaxRate(stateCode: string): number {
  return STATE_TAX_RATES[stateCode.toUpperCase()] ?? STATE_TAX_RATES.DEFAULT;
}

/**
 * Apply a discount to a total amount
 */
export function applyDiscount(
  total: number,
  discount: Discount
): { discountedTotal: number; discountAmount: number; isValid: boolean; message?: string } {
  // Check minimum purchase
  if (discount.minPurchase && total < discount.minPurchase) {
    return {
      discountedTotal: total,
      discountAmount: 0,
      isValid: false,
      message: `Minimum purchase of $${discount.minPurchase.toFixed(2)} required`,
    };
  }

  // Check expiration
  if (discount.expiresAt) {
    const expirationDate = new Date(discount.expiresAt);
    if (new Date() > expirationDate) {
      return {
        discountedTotal: total,
        discountAmount: 0,
        isValid: false,
        message: 'This discount code has expired',
      };
    }
  }

  let discountAmount: number;

  if (discount.type === 'percentage') {
    discountAmount = total * (discount.value / 100);
  } else {
    discountAmount = discount.value;
  }

  // Apply max discount cap
  if (discount.maxDiscount && discountAmount > discount.maxDiscount) {
    discountAmount = discount.maxDiscount;
  }

  // Ensure discount doesn't exceed total
  discountAmount = Math.min(discountAmount, total);
  discountAmount = Math.round(discountAmount * 100) / 100;

  return {
    discountedTotal: Math.round((total - discountAmount) * 100) / 100,
    discountAmount,
    isValid: true,
  };
}

/**
 * Format a number as currency (USD)
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Parse a currency string to number
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Calculate monthly payment for financing
 */
export function calculateMonthlyPayment(
  principal: number,
  months: number,
  annualRate: number
): { monthlyPayment: number; totalPayment: number; totalInterest: number } {
  if (principal <= 0 || months <= 0) {
    return { monthlyPayment: 0, totalPayment: 0, totalInterest: 0 };
  }

  // If 0% interest
  if (annualRate === 0) {
    const monthlyPayment = principal / months;
    return {
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalPayment: principal,
      totalInterest: 0,
    };
  }

  const monthlyRate = annualRate / 12;

  // Standard amortization formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
  const factor = Math.pow(1 + monthlyRate, months);
  const monthlyPayment = principal * ((monthlyRate * factor) / (factor - 1));
  const totalPayment = monthlyPayment * months;
  const totalInterest = totalPayment - principal;

  return {
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalPayment: Math.round(totalPayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
  };
}

/**
 * Calculate line item total
 */
export function calculateLineItemTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

/**
 * Calculate subtotal from line items
 */
export function calculateSubtotal(items: PricingLineItem[]): number {
  return items.reduce((sum, item) => {
    return sum + calculateLineItemTotal(item.quantity, item.unitPrice);
  }, 0);
}

/**
 * Calculate taxable subtotal from line items
 */
export function calculateTaxableSubtotal(items: PricingLineItem[]): number {
  return items.reduce((sum, item) => {
    if (item.taxable) {
      return sum + calculateLineItemTotal(item.quantity, item.unitPrice);
    }
    return sum;
  }, 0);
}

/**
 * Calculate full invoice totals
 */
export function calculateInvoiceTotals(
  items: PricingLineItem[],
  taxRate: number,
  discount?: Discount
): {
  subtotal: number;
  taxableSubtotal: number;
  discountAmount: number;
  subtotalAfterDiscount: number;
  tax: number;
  total: number;
} {
  const subtotal = calculateSubtotal(items);
  const taxableSubtotal = calculateTaxableSubtotal(items);

  let discountAmount = 0;
  let subtotalAfterDiscount = subtotal;

  if (discount) {
    const discountResult = applyDiscount(subtotal, discount);
    if (discountResult.isValid) {
      discountAmount = discountResult.discountAmount;
      subtotalAfterDiscount = discountResult.discountedTotal;
    }
  }

  // Calculate tax on taxable portion after proportional discount
  const discountRatio = subtotal > 0 ? subtotalAfterDiscount / subtotal : 1;
  const taxableAfterDiscount = taxableSubtotal * discountRatio;
  const tax = calculateTax(taxableAfterDiscount, taxRate);

  const total = Math.round((subtotalAfterDiscount + tax) * 100) / 100;

  return {
    subtotal,
    taxableSubtotal,
    discountAmount,
    subtotalAfterDiscount,
    tax,
    total,
  };
}

/**
 * Get service price from catalog
 */
export function getServicePrice(serviceCode: string): number {
  return SERVICE_PRICES[serviceCode]?.basePrice ?? 0;
}

/**
 * Get service details from catalog
 */
export function getServiceDetails(serviceCode: string): { name: string; basePrice: number; unit: string } | null {
  return SERVICE_PRICES[serviceCode] ?? null;
}

/**
 * Validate coupon code format
 */
export function isValidCouponFormat(code: string): boolean {
  // Coupon codes should be 4-20 alphanumeric characters
  const pattern = /^[A-Z0-9]{4,20}$/i;
  return pattern.test(code.trim());
}

/**
 * Generate a unique line item ID
 */
export function generateLineItemId(): string {
  return `li_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Financing plan options
 */
export const FINANCING_PLANS = [
  { months: 3, rate: 0, label: '3 months - 0% APR' },
  { months: 6, rate: 0, label: '6 months - 0% APR' },
  { months: 12, rate: 0.0599, label: '12 months - 5.99% APR' },
  { months: 18, rate: 0.0899, label: '18 months - 8.99% APR' },
  { months: 24, rate: 0.0999, label: '24 months - 9.99% APR' },
] as const;

/**
 * Minimum amount for financing
 */
export const FINANCING_MIN_AMOUNT = 500;

/**
 * Maximum amount for financing
 */
export const FINANCING_MAX_AMOUNT = 50000;

/**
 * Check if amount qualifies for financing
 */
export function isEligibleForFinancing(amount: number): boolean {
  return amount >= FINANCING_MIN_AMOUNT && amount <= FINANCING_MAX_AMOUNT;
}
