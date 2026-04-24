import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiClient } from "@/api/client";
import { validateResponse } from "@/api/validateResponse";


export const payRunSchema = z.object({
  id: z.string(),
  label: z.string(),
  pay_schedule_name: z.string().nullable(),
  entity: z.string().nullable(),
  pay_run_type: z.string(),
  pay_date: z.string().nullable(),
  approve_by: z.string().nullable(),
  funding_method: z.string().nullable(),
  status: z.string(),
  action_text: z.string().nullable(),
  failure_reason: z.string().nullable(),
  archived_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});
export type PayRun = z.infer<typeof payRunSchema>;


export type PayRunPatch = Partial<Omit<PayRun, "id" | "created_at" | "updated_at">>;


export function usePayRuns(status?: string) {
  return useQuery({
    queryKey: ["payroll", "pay-runs", status ?? "all"],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/payroll/pay-runs", {
        params: status ? { status } : undefined,
      });
      return validateResponse(
        z.array(payRunSchema),
        data,
        "payroll pay-runs",
      );
    },
    staleTime: 30_000,
  });
}


export function useApprovePayRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post(
        `/hr/payroll/pay-runs/${id}/approve`,
      );
      return payRunSchema.parse(data);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["payroll", "pay-runs"] }),
  });
}


export function useArchivePayRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post(
        `/hr/payroll/pay-runs/${id}/archive`,
      );
      return payRunSchema.parse(data);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["payroll", "pay-runs"] }),
  });
}


export function usePatchPayRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: PayRunPatch }) => {
      const { data } = await apiClient.patch(
        `/hr/payroll/pay-runs/${input.id}`,
        input.patch,
      );
      return payRunSchema.parse(data);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["payroll", "pay-runs"] }),
  });
}


export function useSeedPayrollDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post("/hr/payroll/seed-demo");
      return data as { pay_runs_count: number; people_count: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll", "pay-runs"] });
      qc.invalidateQueries({ queryKey: ["payroll", "people"] });
    },
  });
}
