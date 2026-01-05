/**
 * Analytics Types
 * Real-time embedded analytics and BI dashboards
 */
import { z } from 'zod';

// ============================================
// Operations Command Center Types
// ============================================

export const technicianLocationSchema = z.object({
  technician_id: z.string(),
  technician_name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  status: z.enum(['available', 'en_route', 'on_job', 'break', 'offline']),
  current_job_id: z.string().optional().nullable(),
  current_customer: z.string().optional().nullable(),
  eta_minutes: z.number().optional().nullable(),
  last_updated: z.string(),
});

export type TechnicianLocation = z.infer<typeof technicianLocationSchema>;

export const operationsAlertSchema = z.object({
  id: z.string(),
  type: z.enum(['running_late', 'customer_waiting', 'sla_breach', 'no_show', 'escalation']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string(),
  message: z.string(),
  technician_id: z.string().optional().nullable(),
  technician_name: z.string().optional().nullable(),
  work_order_id: z.string().optional().nullable(),
  customer_name: z.string().optional().nullable(),
  created_at: z.string(),
  acknowledged_at: z.string().optional().nullable(),
});

export type OperationsAlert = z.infer<typeof operationsAlertSchema>;

export const todayStatsSchema = z.object({
  total_jobs_scheduled: z.number(),
  jobs_completed: z.number(),
  jobs_in_progress: z.number(),
  jobs_pending: z.number(),
  completion_rate: z.number(),
  technicians_active: z.number(),
  technicians_available: z.number(),
  average_response_time: z.number(), // minutes
  customer_wait_time: z.number(), // minutes
  revenue_today: z.number(),
  invoices_sent: z.number(),
});

export type TodayStats = z.infer<typeof todayStatsSchema>;

export const dispatchQueueItemSchema = z.object({
  work_order_id: z.string(),
  customer_name: z.string(),
  customer_address: z.string(),
  service_type: z.string(),
  priority: z.enum(['low', 'normal', 'high', 'emergency']),
  scheduled_time: z.string().optional().nullable(),
  waiting_since: z.string(),
  wait_minutes: z.number(),
  suggested_technician_id: z.string().optional().nullable(),
  suggested_technician_name: z.string().optional().nullable(),
  suggestion_reason: z.string().optional().nullable(),
  confidence_score: z.number().optional().nullable(),
});

export type DispatchQueueItem = z.infer<typeof dispatchQueueItemSchema>;

// ============================================
// Financial Dashboard Types
// ============================================

export const revenuePeriodSchema = z.object({
  period: z.string(), // "today", "week", "month", "quarter", "year"
  current: z.number(),
  previous: z.number(),
  change_pct: z.number(),
  target: z.number().optional().nullable(),
  progress_pct: z.number().optional().nullable(),
});

export type RevenuePeriod = z.infer<typeof revenuePeriodSchema>;

export const arAgingSchema = z.object({
  bucket: z.enum(['current', '1_30', '31_60', '61_90', '90_plus']),
  label: z.string(),
  amount: z.number(),
  count: z.number(),
  percentage: z.number(),
});

export type ARAgingBucket = z.infer<typeof arAgingSchema>;

export const marginByJobTypeSchema = z.object({
  job_type: z.string(),
  revenue: z.number(),
  cost: z.number(),
  margin: z.number(),
  margin_pct: z.number(),
  job_count: z.number(),
});

export type MarginByJobType = z.infer<typeof marginByJobTypeSchema>;

export const financialSnapshotSchema = z.object({
  revenue_periods: z.array(revenuePeriodSchema),
  ar_aging: z.array(arAgingSchema),
  margins_by_type: z.array(marginByJobTypeSchema),
  total_outstanding: z.number(),
  overdue_amount: z.number(),
  average_days_to_pay: z.number(),
  cash_on_hand: z.number().optional().nullable(),
});

export type FinancialSnapshot = z.infer<typeof financialSnapshotSchema>;

// ============================================
// Performance Scorecard Types
// ============================================

export const technicianScoreSchema = z.object({
  technician_id: z.string(),
  technician_name: z.string(),
  avatar_url: z.string().optional().nullable(),
  // Metrics
  jobs_completed: z.number(),
  first_time_fix_rate: z.number(),
  customer_satisfaction: z.number(),
  repeat_visit_rate: z.number(),
  utilization_rate: z.number(),
  average_job_duration: z.number(), // minutes
  revenue_generated: z.number(),
  // Rankings
  overall_rank: z.number(),
  rank_change: z.number(), // positive = improved
});

export type TechnicianScore = z.infer<typeof technicianScoreSchema>;

export const kpiTrendSchema = z.object({
  metric: z.string(),
  current_value: z.number(),
  previous_value: z.number(),
  change_pct: z.number(),
  trend: z.enum(['up', 'down', 'stable']),
  target: z.number().optional().nullable(),
  data_points: z.array(z.object({
    date: z.string(),
    value: z.number(),
  })),
});

export type KPITrend = z.infer<typeof kpiTrendSchema>;

export const performanceSummarySchema = z.object({
  technician_scores: z.array(technicianScoreSchema),
  kpi_trends: z.array(kpiTrendSchema),
  team_averages: z.object({
    first_time_fix_rate: z.number(),
    customer_satisfaction: z.number(),
    repeat_visit_rate: z.number(),
    utilization_rate: z.number(),
  }),
});

export type PerformanceSummary = z.infer<typeof performanceSummarySchema>;

// ============================================
// AI Insights Types
// ============================================

export const anomalyAlertSchema = z.object({
  id: z.string(),
  type: z.enum(['revenue_drop', 'cost_spike', 'productivity_decline', 'churn_risk', 'demand_surge']),
  severity: z.enum(['info', 'warning', 'critical']),
  title: z.string(),
  description: z.string(),
  metric: z.string(),
  expected_value: z.number(),
  actual_value: z.number(),
  deviation_pct: z.number(),
  detected_at: z.string(),
  recommended_action: z.string().optional().nullable(),
});

export type AnomalyAlert = z.infer<typeof anomalyAlertSchema>;

export const prescriptiveInsightSchema = z.object({
  id: z.string(),
  category: z.enum(['revenue', 'efficiency', 'customer', 'cost', 'staffing']),
  title: z.string(),
  insight: z.string(),
  impact: z.string(),
  confidence: z.number(),
  estimated_value: z.number().optional().nullable(),
  actions: z.array(z.object({
    label: z.string(),
    action_type: z.string(),
    params: z.record(z.unknown()).optional(),
  })),
  expires_at: z.string().optional().nullable(),
});

export type PrescriptiveInsight = z.infer<typeof prescriptiveInsightSchema>;

export const predictionSchema = z.object({
  metric: z.string(),
  period: z.string(),
  predicted_value: z.number(),
  actual_value: z.number().optional().nullable(),
  confidence_interval: z.object({
    low: z.number(),
    high: z.number(),
  }),
  accuracy_score: z.number().optional().nullable(),
});

export type Prediction = z.infer<typeof predictionSchema>;

export const aiInsightsSummarySchema = z.object({
  anomalies: z.array(anomalyAlertSchema),
  insights: z.array(prescriptiveInsightSchema),
  predictions: z.array(predictionSchema),
  model_health: z.object({
    last_trained: z.string(),
    prediction_accuracy: z.number(),
    data_quality_score: z.number(),
  }),
});

export type AIInsightsSummary = z.infer<typeof aiInsightsSummarySchema>;

// ============================================
// Dashboard Configuration
// ============================================

export interface DashboardFilters {
  date_range?: {
    start: string;
    end: string;
  };
  region_ids?: string[];
  technician_ids?: string[];
  job_types?: string[];
}

export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  refresh_interval?: number; // seconds
  filters?: DashboardFilters;
}

export interface CustomDashboard {
  id: string;
  name: string;
  owner_id: string;
  widgets: WidgetConfig[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
