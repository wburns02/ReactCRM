import { z } from "zod";

export const ExecutiveKPIsSchema = z.object({
  revenue_today: z.number(),
  revenue_mtd: z.number(),
  revenue_last_month: z.number(),
  revenue_change_pct: z.number(),
  jobs_today: z.number(),
  jobs_completed_today: z.number(),
  jobs_mtd: z.number(),
  avg_job_value: z.number(),
  avg_job_value_change_pct: z.number(),
  outstanding_invoices: z.number(),
  outstanding_amount: z.number(),
  overdue_invoices: z.number(),
  overdue_amount: z.number(),
  active_customers: z.number(),
  new_customers_mtd: z.number(),
  customer_churn_rate: z.number(),
  nps_score: z.number(),
  first_time_fix_rate: z.number(),
  avg_response_time_hours: z.number(),
  tech_utilization_pct: z.number(),
  on_duty_technicians: z.number(),
  total_technicians: z.number(),
  open_estimates: z.number(),
  estimate_conversion_rate: z.number(),
  active_contracts: z.number(),
  contracts_expiring_30d: z.number(),
});

export type ExecutiveKPIs = z.infer<typeof ExecutiveKPIsSchema>;

export const RevenueTrendPointSchema = z.object({
  date: z.string(),
  revenue: z.number(),
  job_count: z.number(),
  avg_value: z.number(),
});

export type RevenueTrendPoint = z.infer<typeof RevenueTrendPointSchema>;

export const RevenueTrendResponseSchema = z.object({
  period: z.string(),
  data: z.array(RevenueTrendPointSchema),
  comparison: z.array(RevenueTrendPointSchema),
});

export type RevenueTrendResponse = z.infer<typeof RevenueTrendResponseSchema>;

export const ServiceMixItemSchema = z.object({
  type: z.string(),
  revenue: z.number(),
  count: z.number(),
  pct: z.number(),
});

export type ServiceMixItem = z.infer<typeof ServiceMixItemSchema>;

export const ServiceMixResponseSchema = z.object({
  data: z.array(ServiceMixItemSchema),
});

export type ServiceMixResponse = z.infer<typeof ServiceMixResponseSchema>;

export const TechLeaderboardItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar_url: z.string().nullable().optional(),
  jobs_completed: z.number(),
  revenue: z.number(),
  avg_rating: z.number(),
  ftfr: z.number(),
  utilization: z.number(),
  on_time_pct: z.number(),
});

export type TechLeaderboardItem = z.infer<typeof TechLeaderboardItemSchema>;

export const TechLeaderboardResponseSchema = z.object({
  data: z.array(TechLeaderboardItemSchema),
});

export type TechLeaderboardResponse = z.infer<typeof TechLeaderboardResponseSchema>;

export const PipelineStageSchema = z.object({
  name: z.string(),
  count: z.number(),
  value: z.number(),
});

export type PipelineStage = z.infer<typeof PipelineStageSchema>;

export const PipelineFunnelResponseSchema = z.object({
  stages: z.array(PipelineStageSchema),
  conversion_rates: z.array(z.number()),
});

export type PipelineFunnelResponse = z.infer<typeof PipelineFunnelResponseSchema>;

export const ActivityEventSchema = z.object({
  type: z.string(),
  message: z.string(),
  timestamp: z.string(),
  icon: z.string(),
  color: z.string(),
});

export type ActivityEvent = z.infer<typeof ActivityEventSchema>;

export const RecentActivityResponseSchema = z.object({
  events: z.array(ActivityEventSchema),
});

export type RecentActivityResponse = z.infer<typeof RecentActivityResponseSchema>;
