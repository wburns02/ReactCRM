import { z } from "zod";

export const PnLDataPointSchema = z.object({
  date: z.string(),
  revenue: z.number(),
  labor_cost: z.number(),
  material_cost: z.number(),
  gross_profit: z.number(),
  margin_pct: z.number(),
});

export const PnLResponseSchema = z.object({
  revenue: z.number(),
  cost_of_labor: z.number(),
  material_cost: z.number(),
  gross_profit: z.number(),
  gross_margin_pct: z.number(),
  data: z.array(PnLDataPointSchema),
});

export type PnLResponse = z.infer<typeof PnLResponseSchema>;
export type PnLDataPoint = z.infer<typeof PnLDataPointSchema>;

export const CashFlowPointSchema = z.object({
  date: z.string(),
  projected_inflow: z.number(),
  projected_outflow: z.number(),
  cumulative_balance: z.number(),
});

export const CashFlowForecastSchema = z.object({
  data: z.array(CashFlowPointSchema),
  starting_balance: z.number(),
});

export type CashFlowForecast = z.infer<typeof CashFlowForecastSchema>;
export type CashFlowPoint = z.infer<typeof CashFlowPointSchema>;

export const ARBucketSchema = z.object({
  count: z.number(),
  amount: z.number(),
});

export const ARAgingResponseSchema = z.object({
  current: ARBucketSchema,
  days_30: ARBucketSchema,
  days_60: ARBucketSchema,
  days_90: ARBucketSchema,
  days_90_plus: ARBucketSchema,
  total: ARBucketSchema,
  top_outstanding: z.array(z.object({
    invoice_id: z.string(),
    customer_name: z.string(),
    amount: z.number(),
    days_outstanding: z.number(),
  })),
});

export type ARAgingResponse = z.infer<typeof ARAgingResponseSchema>;

export const MarginByTypeItemSchema = z.object({
  job_type: z.string(),
  revenue: z.number(),
  estimated_cost: z.number(),
  margin: z.number(),
  margin_pct: z.number(),
  job_count: z.number(),
  avg_revenue_per_job: z.number(),
});

export const MarginsByTypeResponseSchema = z.object({
  data: z.array(MarginByTypeItemSchema),
});

export type MarginsByTypeResponse = z.infer<typeof MarginsByTypeResponseSchema>;
export type MarginByTypeItem = z.infer<typeof MarginByTypeItemSchema>;

export const TechProfitItemSchema = z.object({
  tech_id: z.string(),
  name: z.string(),
  revenue: z.number(),
  estimated_cost: z.number(),
  margin: z.number(),
  margin_pct: z.number(),
  jobs: z.number(),
  avg_job_value: z.number(),
  revenue_per_hour: z.number(),
});

export const TechProfitabilityResponseSchema = z.object({
  data: z.array(TechProfitItemSchema),
});

export type TechProfitabilityResponse = z.infer<typeof TechProfitabilityResponseSchema>;
export type TechProfitItem = z.infer<typeof TechProfitItemSchema>;

export const MRRDataPointSchema = z.object({
  month: z.string(),
  mrr: z.number(),
  new_mrr: z.number(),
  churned_mrr: z.number(),
});

export const ContractRevenueResponseSchema = z.object({
  mrr: z.number(),
  arr: z.number(),
  active_contracts: z.number(),
  avg_contract_value: z.number(),
  contracts_expiring_30d: z.number(),
  renewal_rate: z.number(),
  data: z.array(MRRDataPointSchema),
});

export type ContractRevenueResponse = z.infer<typeof ContractRevenueResponseSchema>;
export type MRRDataPoint = z.infer<typeof MRRDataPointSchema>;
