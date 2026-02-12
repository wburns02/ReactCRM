import { z } from "zod";

/**
 * Technician Dashboard types — matches GET /technician-dashboard/my-summary
 */

export const techDashboardJobSchema = z.object({
  id: z.string(),
  customer_id: z.string().nullable().optional(),
  customer_name: z.string(),
  job_type: z.string(),
  job_type_label: z.string(),
  status: z.string(),
  status_label: z.string(),
  status_color: z.enum(["blue", "yellow", "orange", "green", "red", "gray"]),
  priority: z.string().nullable().optional(),
  time_window: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  estimated_duration_hours: z.number().nullable().optional(),
  total_amount: z.number().nullable().optional(),
});

export const techDashboardResponseSchema = z.object({
  technician: z.object({
    first_name: z.string(),
    last_name: z.string(),
    id: z.string(),
  }),
  clock_status: z.object({
    is_clocked_in: z.boolean(),
    clock_in_time: z.string().nullable().optional(),
    active_entry_id: z.string().nullable().optional(),
  }),
  todays_jobs: z.array(techDashboardJobSchema),
  today_stats: z.object({
    total_jobs: z.number(),
    completed_jobs: z.number(),
    hours_worked: z.number(),
    remaining_jobs: z.number(),
  }),
  pay_this_period: z.object({
    period_label: z.string().nullable().optional(),
    next_payday: z.string().nullable().optional(),
    commissions_earned: z.number(),
    jobs_completed_period: z.number(),
    backboard_threshold: z.number(),
    on_track: z.boolean(),
  }),
  performance: z.object({
    jobs_this_week: z.number(),
    jobs_last_week: z.number(),
    avg_job_duration_minutes: z.number(),
  }),
});

export type TechDashboardResponse = z.infer<typeof techDashboardResponseSchema>;
export type TechDashboardJob = z.infer<typeof techDashboardJobSchema>;
