/**
 * Payment and Invoicing Components
 *
 * This module exports all payment-related components, hooks, and utilities
 * for work order invoicing and payment processing.
 */

// Components
export {
  InvoiceGenerator,
  type InvoiceGeneratorProps,
  type CustomerInfo,
  type WorkOrderReference,
} from "./InvoiceGenerator.tsx";
export {
  PaymentProcessor,
  type PaymentProcessorProps,
} from "./PaymentProcessor.tsx";
export { PaymentSection, type PaymentSectionProps } from "./PaymentSection.tsx";
export {
  PaymentLinkGenerator,
  type PaymentLinkGeneratorProps,
} from "./PaymentLinkGenerator.tsx";
export {
  PriceCalculator,
  type PriceCalculatorProps,
} from "./PriceCalculator.tsx";
export {
  DiscountManager,
  type DiscountManagerProps,
} from "./DiscountManager.tsx";
export {
  RefundProcessor,
  type RefundProcessorProps,
} from "./RefundProcessor.tsx";
export { PaymentHistory, type PaymentHistoryProps } from "./PaymentHistory.tsx";
export {
  FinancingOptions,
  type FinancingOptionsProps,
} from "./FinancingOptions.tsx";

// Hooks
export {
  useProcessPayment,
  usePaymentHistory,
  useCreateInvoice,
  useApplyDiscount,
  useGeneratePaymentLink,
  useProcessRefund,
  useSendInvoiceEmail,
  useSendPaymentLinkSMS,
  useWorkOrderInvoice,
  useApplyForFinancing,
  useDownloadReceipt,
  useGenerateInvoicePDF,
  workOrderPaymentKeys,
  type ProcessPaymentParams,
  type ProcessPaymentResult,
  type RefundParams,
  type RefundResult,
  type PaymentLinkResult,
  type DiscountValidationResult,
  type CreateInvoiceParams,
} from "./hooks/usePayments.ts";

// Utilities
export {
  // Tax calculations
  calculateTax,
  getTaxRate,
  STATE_TAX_RATES,
  // Discount handling
  applyDiscount,
  isValidCouponFormat,
  type Discount,
  type DiscountType,
  // Currency formatting
  formatCurrency,
  parseCurrency,
  // Line item calculations
  calculateLineItemTotal,
  calculateSubtotal,
  calculateTaxableSubtotal,
  calculateInvoiceTotals,
  generateLineItemId,
  type PricingLineItem,
  // Service catalog
  getServicePrice,
  getServiceDetails,
  SERVICE_PRICES,
  // Financing
  calculateMonthlyPayment,
  isEligibleForFinancing,
  FINANCING_PLANS,
  FINANCING_MIN_AMOUNT,
  FINANCING_MAX_AMOUNT,
} from "./utils/pricingEngine.ts";
