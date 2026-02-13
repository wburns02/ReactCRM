import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { z } from "zod";

// Zod schemas matching the backend DashboardFullStats response
const RecentProspectSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  company_name: z.string().nullable().optional(),
  prospect_stage: z.string(),
  estimated_value: z.number().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

const RecentCustomerSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string().nullable().optional(),
});

const TodayJobSchema = z.object({
  id: z.string(),
  customer_id: z.string(),
  customer_name: z.string().nullable().optional(),
  job_type: z.string(),
  status: z.string(),
  time_window_start: z.string().nullable().optional(),
  assigned_technician: z.string().nullable().optional(),
});

const DashboardStatsSchema = z.object({
  total_prospects: z.number(),
  active_prospects: z.number(),
  total_customers: z.number(),
  total_work_orders: z.number(),
  scheduled_work_orders: z.number(),
  in_progress_work_orders: z.number(),
  today_jobs: z.number(),
  pipeline_value: z.number(),
  revenue_mtd: z.number(),
  invoices_pending: z.number(),
  invoices_overdue: z.number(),
  upcoming_followups: z.number(),
  recent_prospect_ids: z.array(z.string()),
  recent_customer_ids: z.array(z.string()),
});

const DashboardFullStatsSchema = z.object({
  stats: DashboardStatsSchema,
  recent_prospects: z.array(RecentProspectSchema),
  recent_customers: z.array(RecentCustomerSchema),
  today_jobs: z.array(TodayJobSchema),
});

export type DashboardFullStats = z.infer<typeof DashboardFullStatsSchema>;
export type RecentProspect = z.infer<typeof RecentProspectSchema>;
export type RecentCustomer = z.infer<typeof RecentCustomerSchema>;
export type TodayJob = z.infer<typeof TodayJobSchema>;

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async (): Promise<DashboardFullStats> => {
      const { data } = await apiClient.get("/dashboard/stats");
      return DashboardFullStatsSchema.parse(data);
    },
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Refresh every minute
  });
}
