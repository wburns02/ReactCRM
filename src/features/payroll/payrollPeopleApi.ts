import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiClient } from "@/api/client";
import { validateResponse } from "@/api/validateResponse";


export const payrollPersonSchema = z.object({
  id: z.string(),
  employee_name: z.string(),
  employee_title: z.string().nullable(),
  pay_schedule: z.string().nullable(),
  status: z.string(),
  bucket: z.string(),
  critical_missing_count: z.number(),
  missing_fields: z.string().nullable(),
  signatory_status: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});
export type PayrollPerson = z.infer<typeof payrollPersonSchema>;


export type PayrollPersonPatch = Partial<Omit<PayrollPerson, "id" | "created_at" | "updated_at">>;


export function usePayrollPeople(bucket?: string) {
  return useQuery({
    queryKey: ["payroll", "people", bucket ?? "all"],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/payroll/people", {
        params: bucket ? { bucket } : undefined,
      });
      return validateResponse(
        z.array(payrollPersonSchema),
        data,
        "payroll people",
      );
    },
    staleTime: 30_000,
  });
}


export function useRequestPayrollInfo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post(
        `/hr/payroll/people/${id}/request-info`,
      );
      return data as { requested: boolean; employee: string };
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["payroll", "people"] }),
  });
}


export function usePatchPayrollPerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: PayrollPersonPatch }) => {
      const { data } = await apiClient.patch(
        `/hr/payroll/people/${input.id}`,
        input.patch,
      );
      return payrollPersonSchema.parse(data);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["payroll", "people"] }),
  });
}
