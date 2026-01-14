/**
 * Fintech Types for CRM
 * Customer financing, technician payouts, cash flow intelligence
 */
import { z } from "zod";

/**
 * Financing Provider enum
 */
export const financingProviderSchema = z.enum([
  "wisetack",
  "affirm",
  "greensky",
  "internal",
]);
export type FinancingProvider = z.infer<typeof financingProviderSchema>;

export const FINANCING_PROVIDER_LABELS: Record<FinancingProvider, string> = {
  wisetack: "Wisetack",
  affirm: "Affirm",
  greensky: "GreenSky",
  internal: "In-House Financing",
};

/**
 * Financing Application Status
 */
export const financingStatusSchema = z.enum([
  "pending",
  "prequalified",
  "approved",
  "funded",
  "declined",
  "expired",
  "cancelled",
]);
export type FinancingStatus = z.infer<typeof financingStatusSchema>;

/**
 * Financing Application schema
 */
export const financingApplicationSchema = z.object({
  id: z.string(),
  customer_id: z.union([z.string(), z.number()]).transform(String),
  customer_name: z.string().optional(),
  invoice_id: z.string().optional().nullable(),
  work_order_id: z.string().optional().nullable(),
  provider: financingProviderSchema,
  status: financingStatusSchema,
  requested_amount: z.number(),
  approved_amount: z.number().optional().nullable(),
  term_months: z.number().optional().nullable(),
  apr: z.number().optional().nullable(), // Annual percentage rate
  monthly_payment: z.number().optional().nullable(),
  external_application_id: z.string().optional().nullable(),
  prequalification_link: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  funded_at: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string().optional().nullable(),
});

export type FinancingApplication = z.infer<typeof financingApplicationSchema>;

/**
 * Financing offer from provider
 */
export const financingOfferSchema = z.object({
  id: z.string(),
  provider: financingProviderSchema,
  min_amount: z.number(),
  max_amount: z.number(),
  terms: z.array(
    z.object({
      term_months: z.number(),
      apr: z.number(),
      monthly_payment_per_1000: z.number(), // Monthly payment per $1000 financed
    }),
  ),
  promo_apr: z.number().optional().nullable(), // Promotional APR if available
  promo_term_months: z.number().optional().nullable(),
  expires_at: z.string().optional().nullable(),
});

export type FinancingOffer = z.infer<typeof financingOfferSchema>;

/**
 * Request financing prequalification
 */
export interface FinancingPrequalRequest {
  customer_id: string;
  amount: number;
  invoice_id?: string;
  work_order_id?: string;
  provider?: FinancingProvider;
}

/**
 * Technician Payout types
 */
export const payoutStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);
export type PayoutStatus = z.infer<typeof payoutStatusSchema>;

export const payoutTypeSchema = z.enum([
  "standard", // Next business day
  "instant", // Same day (higher fee)
  "scheduled", // Weekly/bi-weekly
]);
export type PayoutType = z.infer<typeof payoutTypeSchema>;

export const technicianPayoutSchema = z.object({
  id: z.string(),
  technician_id: z.string(),
  technician_name: z.string().optional(),
  type: payoutTypeSchema,
  status: payoutStatusSchema,
  amount: z.number(),
  fee: z.number(), // Service fee for instant payouts
  net_amount: z.number(), // Amount after fee
  work_order_ids: z.array(z.string()).optional(),
  pay_period_start: z.string().optional().nullable(),
  pay_period_end: z.string().optional().nullable(),
  external_transfer_id: z.string().optional().nullable(),
  completed_at: z.string().optional().nullable(),
  created_at: z.string(),
});

export type TechnicianPayout = z.infer<typeof technicianPayoutSchema>;

/**
 * Technician earnings summary
 */
export const technicianEarningsSchema = z.object({
  technician_id: z.string(),
  period_start: z.string(),
  period_end: z.string(),
  total_jobs: z.number(),
  total_hours: z.number(),
  base_pay: z.number(),
  commission: z.number(),
  bonuses: z.number(),
  deductions: z.number(),
  gross_earnings: z.number(),
  available_for_instant_payout: z.number(),
  pending_payout: z.number(),
  jobs: z.array(
    z.object({
      work_order_id: z.string(),
      customer_name: z.string(),
      job_type: z.string(),
      completed_at: z.string(),
      duration_hours: z.number(),
      earnings: z.number(),
    }),
  ),
});

export type TechnicianEarnings = z.infer<typeof technicianEarningsSchema>;

/**
 * Instant payout request
 */
export interface InstantPayoutRequest {
  technician_id: string;
  amount: number;
  work_order_ids?: string[];
}

/**
 * Cash Flow Types
 */
export const cashFlowPeriodSchema = z.enum(["daily", "weekly", "monthly"]);
export type CashFlowPeriod = z.infer<typeof cashFlowPeriodSchema>;

export const cashFlowForecastSchema = z.object({
  period: cashFlowPeriodSchema,
  start_date: z.string(),
  end_date: z.string(),
  forecasts: z.array(
    z.object({
      date: z.string(),
      projected_revenue: z.number(),
      projected_expenses: z.number(),
      projected_cash_flow: z.number(),
      confidence: z.number(), // 0-1 confidence score
      factors: z.array(z.string()), // What factors influenced this forecast
    }),
  ),
  current_cash: z.number(),
  projected_ending_cash: z.number(),
  alerts: z.array(
    z.object({
      type: z.enum(["low_cash", "high_ar", "late_payments", "seasonal_dip"]),
      severity: z.enum(["info", "warning", "critical"]),
      message: z.string(),
      recommended_action: z.string().optional(),
    }),
  ),
});

export type CashFlowForecast = z.infer<typeof cashFlowForecastSchema>;

/**
 * Accounts Receivable aging
 */
export const arAgingSchema = z.object({
  total_outstanding: z.number(),
  current: z.number(), // 0-30 days
  days_31_60: z.number(),
  days_61_90: z.number(),
  over_90: z.number(),
  customers_at_risk: z.array(
    z.object({
      customer_id: z.string(),
      customer_name: z.string(),
      total_outstanding: z.number(),
      oldest_invoice_days: z.number(),
      payment_history_score: z.number(), // 0-100
      recommended_action: z.string(),
    }),
  ),
  collection_rate: z.number(), // Percentage collected on time
});

export type ARAgingReport = z.infer<typeof arAgingSchema>;

/**
 * Revenue intelligence
 */
export const revenueIntelligenceSchema = z.object({
  period_start: z.string(),
  period_end: z.string(),
  total_revenue: z.number(),
  recurring_revenue: z.number(),
  one_time_revenue: z.number(),
  average_invoice_value: z.number(),
  revenue_by_service: z.array(
    z.object({
      service_type: z.string(),
      revenue: z.number(),
      percentage: z.number(),
      trend: z.enum(["up", "down", "stable"]),
    }),
  ),
  top_customers: z.array(
    z.object({
      customer_id: z.string(),
      customer_name: z.string(),
      lifetime_value: z.number(),
      ytd_revenue: z.number(),
    }),
  ),
  seasonal_trend: z.object({
    is_peak_season: z.boolean(),
    expected_change_pct: z.number(),
    historical_avg_this_period: z.number(),
  }),
});

export type RevenueIntelligence = z.infer<typeof revenueIntelligenceSchema>;
