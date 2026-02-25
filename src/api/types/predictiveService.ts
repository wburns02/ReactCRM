export interface PredictiveScore {
  customer_id: string;
  customer_name: string;
  phone: string | null;
  email: string | null;
  address: string;
  system_type: string;
  manufacturer: string;
  tank_size_gallons: number | null;
  risk_score: number;
  risk_level: "critical" | "high" | "medium" | "low";
  factors: string[];
  last_pump_date: string | null;
  last_service_date: string | null;
  predicted_due_date: string | null;
  days_until_due: number | null;
  expected_interval_days: number;
  emergency_count: number;
  total_services: number;
  recommended_action: string;
  service_history?: ServiceHistoryItem[];
}

export interface ServiceHistoryItem {
  id: string;
  job_type: string;
  date: string | null;
  system_type: string | null;
  amount: number | null;
}

export interface ScoreSummary {
  total_scored: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  revenue_opportunity: number;
  actionable_customers: number;
}

export interface PredictiveScoresResponse {
  scores: PredictiveScore[];
  summary: ScoreSummary;
  pagination: { total: number; limit: number; offset: number };
}

export interface CampaignPreview {
  name: string;
  target_count: number;
  estimated_revenue: number;
  message_template: string;
  targets: PredictiveScore[];
  breakdown: { critical: number; high: number; medium: number };
}

export interface DashboardStats {
  total_active_customers: number;
  overdue_schedules: number;
  no_recent_service: number;
  aerobic_systems: number;
  jobs_this_month: number;
  estimated_pipeline_revenue: number;
}
