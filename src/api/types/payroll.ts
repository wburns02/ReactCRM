/**
 * Payroll types for admin management
 */

export interface PayrollPeriod {
  id: string;
  start_date: string;
  end_date: string;
  status: "draft" | "processing" | "approved" | "paid" | "void";
  period_type?: "weekly" | "biweekly" | "monthly";
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
  commission_type?: "job_completion" | "upsell" | "referral" | "bonus" | "pump_out" | "service";
  base_amount: number; // Job total or amount commission is based on
  rate: number; // Commission rate as decimal (0.05 = 5%)
  rate_type?: "percent" | "fixed";
  commission_amount: number;
  status: "pending" | "approved" | "paid";
  description?: string;
  earned_date?: string;
  created_at?: string;
  // Auto-calc fields
  job_type?: string;
  gallons_pumped?: number;
  dump_site_id?: string;
  dump_fee_per_gallon?: number;
  dump_fee_amount?: number;
  commissionable_amount?: number;
  // Legacy compatibility aliases
  job_total?: number; // Alias for base_amount
  commission_rate?: number; // Alias for rate
  notes?: string; // Alias for description
}

export interface TechnicianPayRate {
  id: string;
  technician_id: string;
  technician_name?: string;
  pay_type: "hourly" | "salary";
  hourly_rate: number | null | undefined;
  overtime_rate: number | null | undefined;
  salary_amount: number | null | undefined;
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
  // Backboard guarantee fields (100% commission model)
  commission_pay: number;        // Actual commission pay (0 if backboard applies)
  backboard_applied: boolean;    // True if commissions below threshold
  backboard_amount: number;      // Backboard amount paid (0 if above threshold)
  backboard_threshold: number;   // Biweekly threshold ($2,307.69 for $60K annual)
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
  clock_in?: string;
  clock_out?: string;
}

export interface CreateCommissionInput {
  technician_id: string;
  work_order_id?: string;
  invoice_id?: string;
  commission_type?: "job_completion" | "upsell" | "referral" | "bonus" | "pump_out" | "service";
  base_amount: number;
  rate: number;
  rate_type?: "percent" | "fixed";
  commission_amount?: number; // If not provided, calculated from base_amount * rate
  earned_date?: string;
  description?: string;
  // Auto-calc fields
  dump_site_id?: string;
  job_type?: string;
  gallons_pumped?: number;
  dump_fee_per_gallon?: number;
  dump_fee_amount?: number;
  commissionable_amount?: number;
}

export interface UpdateCommissionInput {
  status?: "pending" | "approved" | "paid";
  base_amount?: number;
  rate?: number;
  commission_amount?: number;
  description?: string;
  commission_type?: "job_completion" | "upsell" | "referral" | "bonus" | "pump_out" | "service";
}

export interface UpdatePayRateInput {
  technician_id?: string;
  pay_type?: "hourly" | "salary";
  hourly_rate?: number | null;
  overtime_rate?: number | null;
  salary_amount?: number | null;
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
  commission_type?: "job_completion" | "upsell" | "referral" | "bonus" | "pump_out" | "service" | "all";
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

/**
 * Commission Auto-Calculation Types
 */

export interface WorkOrderForCommission {
  id: string;
  job_type: string;
  total_amount: number;
  estimated_gallons?: number;
  technician_id?: string;
  technician_name?: string;
  scheduled_date?: string;
  service_address?: string;
  commission_rate: number;
  requires_dump_site: boolean;
}

export interface CommissionCalculation {
  work_order_id: string;
  technician_id?: string;
  technician_name?: string;
  job_type: string;
  job_total: number;
  gallons?: number;
  dump_site_id?: string;
  dump_site_name?: string;
  dump_fee_per_gallon?: number;
  dump_fee_total?: number;
  commissionable_amount: number;
  commission_rate: number;
  commission_amount: number;
  breakdown: {
    formula: string;
    calculation: string;
    steps: string[];
  };
  warning?: string; // Warning message when dump fees exceed job total
}

// =============================================
// ZOD SCHEMAS FOR API RESPONSE VALIDATION
// =============================================

import { z } from "zod";

export const payrollPeriodSchema = z.object({
  id: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  status: z.enum(["draft", "processing", "approved", "paid", "void"]),
  period_type: z.enum(["weekly", "biweekly", "monthly"]).optional(),
  total_hours: z.number(),
  total_overtime_hours: z.number(),
  total_gross_pay: z.number(),
  total_commissions: z.number(),
  total_deductions: z.number(),
  total_net_pay: z.number(),
  technician_count: z.number(),
  created_at: z.string(),
  approved_at: z.string().optional(),
  approved_by: z.string().optional(),
  paid_at: z.string().optional(),
});

export const payrollPeriodsResponseSchema = z.object({
  periods: z.array(payrollPeriodSchema),
});

export const timeEntrySchema = z.object({
  id: z.string(),
  technician_id: z.string(),
  technician_name: z.string().optional(),
  payroll_period_id: z.string().optional(),
  work_order_id: z.string().optional(),
  work_order_number: z.string().optional(),
  date: z.string(),
  clock_in: z.string(),
  clock_out: z.string().optional(),
  regular_hours: z.number(),
  overtime_hours: z.number(),
  break_minutes: z.number(),
  status: z.enum(["pending", "approved", "rejected"]),
  notes: z.string().optional(),
  clock_in_latitude: z.number().optional(),
  clock_in_longitude: z.number().optional(),
  clock_out_latitude: z.number().optional(),
  clock_out_longitude: z.number().optional(),
  created_at: z.string(),
});

export const timeEntriesResponseSchema = z.object({
  entries: z.array(timeEntrySchema),
});

export const commissionSchema = z.object({
  id: z.string(),
  technician_id: z.string(),
  technician_name: z.string().optional(),
  work_order_id: z.string().optional(),
  work_order_number: z.string().optional(),
  invoice_id: z.string().optional(),
  payroll_period_id: z.string().optional(),
  commission_type: z.enum(["job_completion", "upsell", "referral", "bonus", "pump_out", "service"]).optional(),
  base_amount: z.number(),
  rate: z.number(),
  rate_type: z.enum(["percent", "fixed"]).optional(),
  commission_amount: z.number(),
  status: z.enum(["pending", "approved", "paid"]),
  description: z.string().optional(),
  earned_date: z.string().optional(),
  created_at: z.string().optional(),
  job_type: z.string().optional(),
  gallons_pumped: z.number().optional(),
  dump_site_id: z.string().optional(),
  dump_fee_per_gallon: z.number().optional(),
  dump_fee_amount: z.number().optional(),
  commissionable_amount: z.number().optional(),
  job_total: z.number().optional(),
  commission_rate: z.number().optional(),
  notes: z.string().optional(),
});

export const commissionsResponseSchema = z.object({
  commissions: z.array(commissionSchema),
});

export const payRateSchema = z.object({
  id: z.string(),
  technician_id: z.string(),
  technician_name: z.string().optional(),
  pay_type: z.enum(["hourly", "salary"]),
  hourly_rate: z.number().nullable(),
  overtime_rate: z.number().nullable(),
  salary_amount: z.number().nullable(),
  commission_rate: z.number(),
  effective_date: z.string(),
  end_date: z.string().optional(),
  is_active: z.boolean(),
});

export const payRatesResponseSchema = z.object({
  rates: z.array(payRateSchema),
});

export const payrollSummarySchema = z.object({
  technician_id: z.string(),
  technician_name: z.string(),
  regular_hours: z.number(),
  overtime_hours: z.number(),
  regular_pay: z.number(),
  overtime_pay: z.number(),
  total_commissions: z.number(),
  // Backboard guarantee fields
  commission_pay: z.number().default(0),
  backboard_applied: z.boolean().default(false),
  backboard_amount: z.number().default(0),
  backboard_threshold: z.number().default(2307.69),
  gross_pay: z.number(),
  deductions: z.number(),
  net_pay: z.number(),
  jobs_completed: z.number(),
});

export const payrollSummaryResponseSchema = z.object({
  summaries: z.array(payrollSummarySchema),
});
