import { z } from 'zod';

/**
 * Date range for reports
 */
export interface DateRange {
  start_date: string; // ISO 8601 date
  end_date: string; // ISO 8601 date
}

/**
 * Revenue metrics schema
 */
export const revenueMetricsSchema = z.object({
  total_revenue: z.number(),
  total_revenue_change_percent: z.number().nullable(),
  work_orders_completed: z.number(),
  work_orders_completed_change_percent: z.number().nullable(),
  average_job_value: z.number(),
  average_job_value_change_percent: z.number().nullable(),
  new_customers: z.number(),
  new_customers_change_percent: z.number().nullable(),
  repeat_customer_rate: z.number(),
  repeat_customer_rate_change_percent: z.number().nullable(),
  customer_satisfaction_score: z.number().nullable(),
  customer_satisfaction_score_change_percent: z.number().nullable(),
});

export type RevenueMetrics = z.infer<typeof revenueMetricsSchema>;

/**
 * Revenue over time data point
 */
export const revenueDataPointSchema = z.object({
  date: z.string(),
  revenue: z.number(),
  work_orders: z.number(),
});

export type RevenueDataPoint = z.infer<typeof revenueDataPointSchema>;

/**
 * Service type breakdown
 */
export const serviceBreakdownSchema = z.object({
  service_type: z.string(),
  count: z.number(),
  revenue: z.number(),
  percentage: z.number(),
});

export type ServiceBreakdown = z.infer<typeof serviceBreakdownSchema>;

/**
 * Revenue report response
 */
export const revenueReportSchema = z.object({
  metrics: revenueMetricsSchema,
  revenue_over_time: z.array(revenueDataPointSchema),
  service_breakdown: z.array(serviceBreakdownSchema),
  date_range: z.object({
    start_date: z.string(),
    end_date: z.string(),
  }),
});

export type RevenueReport = z.infer<typeof revenueReportSchema>;

/**
 * Technician performance metrics
 */
export const technicianMetricsSchema = z.object({
  technician_id: z.string(),
  technician_name: z.string(),
  jobs_completed: z.number(),
  total_revenue: z.number(),
  average_job_duration_hours: z.number().nullable(),
  customer_satisfaction: z.number().nullable(),
  on_time_completion_rate: z.number(),
});

export type TechnicianMetrics = z.infer<typeof technicianMetricsSchema>;

/**
 * Technician performance report response
 */
export const technicianReportSchema = z.object({
  technicians: z.array(technicianMetricsSchema),
  date_range: z.object({
    start_date: z.string(),
    end_date: z.string(),
  }),
});

export type TechnicianReport = z.infer<typeof technicianReportSchema>;

/**
 * Customer metrics
 */
export const customerMetricsSchema = z.object({
  total_customers: z.number(),
  total_customers_change_percent: z.number().nullable(),
  active_customers: z.number(),
  active_customers_change_percent: z.number().nullable(),
  new_customers_this_month: z.number(),
  churn_rate: z.number().nullable(),
  average_customer_lifetime_value: z.number().nullable(),
});

export type CustomerMetrics = z.infer<typeof customerMetricsSchema>;

/**
 * Customer growth over time
 */
export const customerGrowthDataPointSchema = z.object({
  date: z.string(),
  total_customers: z.number(),
  new_customers: z.number(),
  active_customers: z.number(),
});

export type CustomerGrowthDataPoint = z.infer<typeof customerGrowthDataPointSchema>;

/**
 * Customer report response
 */
export const customerReportSchema = z.object({
  metrics: customerMetricsSchema,
  growth_over_time: z.array(customerGrowthDataPointSchema),
  date_range: z.object({
    start_date: z.string(),
    end_date: z.string(),
  }),
});

export type CustomerReport = z.infer<typeof customerReportSchema>;

/**
 * Work order trends
 */
export const workOrderTrendsDataPointSchema = z.object({
  date: z.string(),
  total: z.number(),
  completed: z.number(),
  in_progress: z.number(),
  scheduled: z.number(),
});

export type WorkOrderTrendsDataPoint = z.infer<typeof workOrderTrendsDataPointSchema>;

/**
 * Pipeline metrics (for prospects/leads)
 */
export const pipelineMetricsSchema = z.object({
  total_pipeline_value: z.number(),
  total_prospects: z.number(),
  prospects_by_stage: z.array(
    z.object({
      stage: z.string(),
      count: z.number(),
      total_value: z.number(),
    })
  ),
  conversion_rate: z.number().nullable(),
  average_deal_size: z.number().nullable(),
});

export type PipelineMetrics = z.infer<typeof pipelineMetricsSchema>;

/**
 * Conversion funnel data
 */
export const conversionFunnelSchema = z.object({
  stage: z.string(),
  count: z.number(),
  conversion_rate: z.number().nullable(),
});

export type ConversionFunnel = z.infer<typeof conversionFunnelSchema>;

/**
 * Export format options
 */
export type ExportFormat = 'csv' | 'pdf' | 'excel';

/**
 * Report type enum
 */
export type ReportType = 'revenue' | 'technician' | 'customer' | 'work_orders' | 'pipeline';

/**
 * Time period preset
 */
export type TimePeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
