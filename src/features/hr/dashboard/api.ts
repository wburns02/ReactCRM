import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { apiClient } from "@/api/client";
import { validateResponse } from "@/api/validateResponse";


export const pendingTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  instance_id: z.string(),
  due_at: z.string().nullable(),
  status: z.string(),
});


export const hrOverviewSchema = z.object({
  open_requisitions: z.number(),
  applicants_last_7d: z.number(),
  active_onboardings: z.number(),
  active_offboardings: z.number(),
  expiring_certs_30d: z.number(),
  active_applications_by_stage: z.record(z.string(), z.number()),
  pending_hr_tasks: z.array(pendingTaskSchema),
});

export type HrOverview = z.infer<typeof hrOverviewSchema>;


export function useHrOverview() {
  return useQuery({
    queryKey: ["hr", "overview"],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/overview");
      return validateResponse(hrOverviewSchema, data, "/hr/overview");
    },
    staleTime: 15_000,
  });
}
