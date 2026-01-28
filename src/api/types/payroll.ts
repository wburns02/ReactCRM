/**
 * Payroll types for admin management
 */

export interface PayrollPeriod {
  id: string;
  start_date: string;
  end_date: string;
  status: "draft" | "processing" | "approved" | "paid" | "void";
  total_hours: number;
  total_overtime_hours: number;
  total_gross_pay: number;
  total_commissions: number;
  total_deductions: number;
  total_net_pay: number;
  technician_count: number;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
  paid_at?: string;
}

export interface TimeEntry {
  id: string;
  technician_id: string;
  technician_name?: string;
  payroll_period_id?: string;
  work_order_id?: string;
  work_order_number?: string;
  date: string;
  clock_in: string;
  clock_out?: string;
  regular_hours: number;
  overtime_hours: number;
  break_minutes: number;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  clock_in_latitude?: number;
  clock_in_longitude?: number;
  clock_out_latitude?: number;
  clock_out_longitude?: number;
  created_at: string;
}

export interface Commission {
  id: string;
  technician_id: string;
  technician_name?: string;
  work_order_id?: string;
  work_order_number?: string;
  invoice_id?: string;
  payroll_period_id?: string;
  commission_type?: "job_completion" | "upsell" | "referral" | "bonus";
  base_amount: number; // Job total or amount commission is based on
  rate: number; // Commission rate as decimal (0.05 = 5%)
  rate_type?: "percent" | "fixed";
  commission_amount: number;
  status: "pending" | "approved" | "paid";
  description?: string;
  earned_date?: string;
  created_at?: string;
  // Legacy compatibility aliases
  job_total?: number; // Alias for base_amount
  commission_rate?: number; // Alias for rate
  notes?: string; // Alias for description
}

export interface TechnicianPayRate {
  id: string;
  technician_id: string;
  technician_name?: string;
  hourly_rate: number;
  overtime_rate: number;
  commission_rate: number;
  effective_date: string;
  end_date?: string;
  is_active: boolean;
}

export interface PayrollSummary {
  technician_id: string;
  technician_name: string;
  regular_hours: number;
  overtime_hours: number;
  regular_pay: number;
  overtime_pay: number;
  total_commissions: number;
  gross_pay: number;
  deductions: number;
  net_pay: number;
  jobs_completed: number;
}

export interface CreatePayrollPeriodInput {
  start_date: string;
  end_date: string;
}

export interface UpdatePayrollPeriodInput {
  start_date?: string;
  end_date?: string;
}

export interface UpdateTimeEntryInput {
  status?: "pending" | "approved" | "rejected";
  regular_hours?: number;
  overtime_hours?: number;
  notes?: string;
}

export interface CreateCommissionInput {
  technician_id: string;
  work_order_id?: string;
  invoice_id?: string;
  commission_type?: "job_completion" | "upsell" | "referral" | "bonus";
  base_amount: number;
  rate: number;
  rate_type?: "percent" | "fixed";
  commission_amount?: number; // If not provided, calculated from base_amount * rate
  earned_date?: string;
  description?: string;
}

export interface UpdateCommissionInput {
  status?: "pending" | "approved" | "paid";
  base_amount?: number;
  rate?: number;
  commission_amount?: number;
  description?: string;
  commission_type?: "job_completion" | "upsell" | "referral" | "bonus";
}

export interface UpdatePayRateInput {
  hourly_rate?: number;
  overtime_rate?: number;
  commission_rate?: number;
  effective_date?: string;
  end_date?: string;
  is_active?: boolean;
}

/**
 * Commission Dashboard Types
 */

export interface CommissionStats {
  total_commissions: number;
  pending_count: number;
  pending_amount: number;
  approved_count: number;
  approved_amount: number;
  paid_count: number;
  paid_amount: number;
  average_per_job: number;
  total_jobs: number;
  comparison_to_last_period: {
    total_change_pct: number;
    average_change_pct: number;
  };
}

export interface CommissionInsight {
  id: string;
  type: "trend" | "alert" | "opportunity";
  severity: "info" | "warning" | "success";
  title: string;
  description: string;
  metric?: {
    label: string;
    value: string;
    change?: string;
  };
  action?: {
    label: string;
    callback_type: string;
    entity_id?: string;
  };
}

export interface CommissionLeaderboardEntry {
  technician_id: string;
  technician_name: string;
  rank: number;
  rank_change: number;
  total_earned: number;
  jobs_completed: number;
  average_commission: number;
  commission_rate: number;
  trend: "up" | "down" | "neutral";
  trend_percentage: number;
}

export interface CommissionFilters {
  status?: "all" | "pending" | "approved" | "paid";
  technician_id?: string;
  commission_type?: "job_completion" | "upsell" | "referral" | "all";
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface CommissionListResponse {
  commissions: Commission[];
  total: number;
  page: number;
  page_size: number;
}
