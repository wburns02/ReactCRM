import { z } from "zod";

/**
 * Tech Portal types — for My Jobs, Schedule, Pay, Communications, Settings pages
 */

// ── Work Orders (extended for My Jobs page) ──────────────────────────────
export const techWorkOrderSchema = z.object({
  id: z.string(),
  work_order_number: z.string().nullable().optional(),
  customer_id: z.string().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  customer_phone: z.string().nullable().optional(),
  technician_id: z.string().nullable().optional(),
  assigned_technician: z.string().nullable().optional(),
  job_type: z.string().nullable().optional(),
  priority: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  internal_notes: z.string().nullable().optional(),
  scheduled_date: z.string().nullable().optional(),
  time_window_start: z.string().nullable().optional(),
  time_window_end: z.string().nullable().optional(),
  estimated_duration_hours: z.number().nullable().optional(),
  total_amount: z.union([z.number(), z.string().transform(Number)]).nullable().optional(),
  service_address_line1: z.string().nullable().optional(),
  service_city: z.string().nullable().optional(),
  service_state: z.string().nullable().optional(),
  service_postal_code: z.string().nullable().optional(),
  service_latitude: z.number().nullable().optional(),
  service_longitude: z.number().nullable().optional(),
  actual_start_time: z.string().nullable().optional(),
  actual_end_time: z.string().nullable().optional(),
  total_labor_minutes: z.number().nullable().optional(),
  checklist: z.any().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const techWorkOrderListSchema = z.object({
  items: z.array(techWorkOrderSchema),
  total: z.number().optional().default(0),
  page: z.number().optional().default(1),
  page_size: z.number().optional().default(20),
});

export type TechWorkOrder = z.infer<typeof techWorkOrderSchema>;
export type TechWorkOrderList = z.infer<typeof techWorkOrderListSchema>;

// ── Time Entries ─────────────────────────────────────────────────────────
export const timeEntrySchema = z.object({
  id: z.string(),
  technician_id: z.string().nullable().optional(),
  work_order_id: z.string().nullable().optional(),
  entry_date: z.string().nullable().optional(),
  clock_in: z.string().nullable().optional(),
  clock_out: z.string().nullable().optional(),
  regular_hours: z.number().nullable().optional(),
  overtime_hours: z.number().nullable().optional(),
  break_minutes: z.number().nullable().optional(),
  entry_type: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type TimeEntry = z.infer<typeof timeEntrySchema>;

// ── Commissions ──────────────────────────────────────────────────────────
export const commissionSchema = z.object({
  id: z.string(),
  technician_id: z.string().nullable().optional(),
  work_order_id: z.string().nullable().optional(),
  job_type: z.string().nullable().optional(),
  commission_type: z.string().nullable().optional(),
  base_amount: z.union([z.number(), z.string().transform(Number)]).nullable().optional(),
  rate: z.union([z.number(), z.string().transform(Number)]).nullable().optional(),
  commission_amount: z.union([z.number(), z.string().transform(Number)]).nullable().optional(),
  status: z.string().nullable().optional(),
  earned_date: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const commissionListSchema = z.object({
  items: z.array(commissionSchema).optional().default([]),
  total: z.number().optional().default(0),
});

export type Commission = z.infer<typeof commissionSchema>;

// ── Payroll Period ───────────────────────────────────────────────────────
export const payrollPeriodSchema = z.object({
  id: z.string(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  period_type: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  total_regular_hours: z.number().nullable().optional(),
  total_overtime_hours: z.number().nullable().optional(),
  total_gross_pay: z.union([z.number(), z.string().transform(Number)]).nullable().optional(),
  total_commissions: z.union([z.number(), z.string().transform(Number)]).nullable().optional(),
});

export type PayrollPeriod = z.infer<typeof payrollPeriodSchema>;

// ── Communications ───────────────────────────────────────────────────────
export const messageSchema = z.object({
  id: z.string(),
  customer_id: z.string().nullable().optional(),
  work_order_id: z.string().nullable().optional(),
  message_type: z.string().nullable().optional(),
  direction: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  from_number: z.string().nullable().optional(),
  from_email: z.string().nullable().optional(),
  to_number: z.string().nullable().optional(),
  to_email: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  sent_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

export const messageListSchema = z.object({
  items: z.array(messageSchema).optional().default([]),
  total: z.number().optional().default(0),
});

export type Message = z.infer<typeof messageSchema>;

// ── Schedule View ────────────────────────────────────────────────────────
export const scheduleJobSchema = z.object({
  id: z.string(),
  customer_name: z.string().nullable().optional(),
  job_type: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  scheduled_date: z.string().nullable().optional(),
  time_window_start: z.string().nullable().optional(),
  time_window_end: z.string().nullable().optional(),
  service_address_line1: z.string().nullable().optional(),
  service_city: z.string().nullable().optional(),
  estimated_duration_hours: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  priority: z.string().nullable().optional(),
});

export type ScheduleJob = z.infer<typeof scheduleJobSchema>;

// ── Status & Job Type Labels ─────────────────────────────────────────────
export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  en_route: "En Route",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  on_hold: "On Hold",
  pending: "Pending",
};

export const STATUS_COLORS: Record<string, string> = {
  draft: "gray",
  scheduled: "blue",
  en_route: "yellow",
  in_progress: "orange",
  completed: "green",
  cancelled: "red",
  on_hold: "gray",
  pending: "blue",
};

export const JOB_TYPE_LABELS: Record<string, string> = {
  pumping: "Septic Pumping",
  inspection: "Inspection",
  repair: "Repair",
  installation: "Installation",
  maintenance: "Maintenance",
  emergency: "Emergency",
  grease_trap: "Grease Trap",
  other: "Other",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
  emergency: "Emergency",
};
