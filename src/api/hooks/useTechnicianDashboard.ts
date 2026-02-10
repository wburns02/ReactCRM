import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import { validateResponse } from "@/api/validateResponse.ts";
import {
  techDashboardResponseSchema,
  type TechDashboardResponse,
} from "@/api/types/technicianDashboard.ts";

// Re-export action hooks techs need (already implemented in useEmployee.ts)
export { useClockIn, useClockOut, useStartJob, useCompleteJob } from "./useEmployee.ts";

const DEFAULT_RESPONSE: TechDashboardResponse = {
  technician: { first_name: "", last_name: "", id: "" },
  clock_status: { is_clocked_in: false, clock_in_time: null, active_entry_id: null },
  todays_jobs: [],
  today_stats: { total_jobs: 0, completed_jobs: 0, hours_worked: 0, remaining_jobs: 0 },
  pay_this_period: {
    period_label: null,
    next_payday: null,
    commissions_earned: 0,
    jobs_completed_period: 0,
    backboard_threshold: 2307.69,
    on_track: false,
  },
  performance: { jobs_this_week: 0, jobs_last_week: 0, avg_job_duration_minutes: 0 },
};

/**
 * Fetches the technician's full dashboard in one API call.
 * Auto-refreshes every 60 seconds. Returns safe defaults on error.
 */
export function useTechnicianDashboard() {
  return useQuery({
    queryKey: ["technician-dashboard", "my-summary"],
    queryFn: async (): Promise<TechDashboardResponse> => {
      try {
        const { data } = await apiClient.get("/technician-dashboard/my-summary");
        return validateResponse(
          techDashboardResponseSchema,
          data,
          "/technician-dashboard/my-summary",
        );
      } catch {
        return DEFAULT_RESPONSE;
      }
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
