import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiClient } from "@/api/client";
import { validateResponse } from "@/api/validateResponse";


const numOrStr = z.union([z.string(), z.number()]);


export const fsaPlanSchema = z.object({
  id: z.string(),
  kind: z.string(),
  name: z.string(),
  annual_limit_employee: numOrStr,
  annual_limit_family: numOrStr.nullable(),
  plan_year_start: z.string().nullable(),
  plan_year_end: z.string().nullable(),
  grace_period_enabled: z.boolean(),
  grace_period_months: z.number(),
  rollover_enabled: z.boolean(),
  rollover_max: numOrStr.nullable(),
  runout_days: z.number(),
  is_active: z.boolean(),
});
export type FsaPlan = z.infer<typeof fsaPlanSchema>;


export const fsaEnrollmentSchema = z.object({
  id: z.string(),
  employee_id: z.string().nullable(),
  employee_name: z.string(),
  plan_id: z.string().nullable(),
  plan_kind: z.string(),
  annual_election: numOrStr,
  ytd_contributed: numOrStr,
  ytd_spent: numOrStr,
  status: z.string(),
  enrolled_at: z.string().nullable(),
});
export type FsaEnrollment = z.infer<typeof fsaEnrollmentSchema>;


export const fsaTransactionSchema = z.object({
  id: z.string(),
  employee_id: z.string().nullable(),
  employee_name: z.string(),
  plan_kind: z.string(),
  transaction_date: z.string(),
  merchant: z.string().nullable(),
  category: z.string().nullable(),
  amount: numOrStr,
  kind: z.string(),
  status: z.string(),
  notes: z.string().nullable(),
});
export type FsaTransaction = z.infer<typeof fsaTransactionSchema>;


export const fsaSettingsSchema = z.object({
  id: z.string(),
  bank_name: z.string().nullable(),
  bank_account_last4: z.string().nullable(),
  bank_routing_last4: z.string().nullable(),
  bank_account_type: z.string().nullable(),
  eligibility_waiting_days: z.number(),
  eligibility_min_hours: z.number(),
  eligibility_rule: z.string().nullable(),
  debit_card_enabled: z.boolean(),
  auto_substantiation_enabled: z.boolean(),
});
export type FsaSettings = z.infer<typeof fsaSettingsSchema>;


export const fsaDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.string(),
  url: z.string().nullable(),
  description: z.string().nullable(),
  uploaded_at: z.string(),
});
export type FsaDocument = z.infer<typeof fsaDocumentSchema>;


export const fsaComplianceTestSchema = z.object({
  id: z.string(),
  test_kind: z.string(),
  plan_year: z.number(),
  run_date: z.string(),
  status: z.string(),
  highly_compensated_count: z.number(),
  non_highly_compensated_count: z.number(),
  failure_reason: z.string().nullable(),
  report_url: z.string().nullable(),
});
export type FsaComplianceTest = z.infer<typeof fsaComplianceTestSchema>;


export const fsaExclusionSchema = z.object({
  id: z.string(),
  employee_id: z.string().nullable(),
  employee_name: z.string(),
  reason: z.string(),
  excluded_from: z.string(),
});
export type FsaExclusion = z.infer<typeof fsaExclusionSchema>;


export const fsaOverviewSchema = z.object({
  total_enrollments: z.number(),
  active_enrollments: z.number(),
  pending_enrollments: z.number(),
  declined_enrollments: z.number(),
  total_ytd_contributed: numOrStr,
  total_ytd_spent: numOrStr,
  remaining_balance: numOrStr,
  by_plan_kind: z.record(z.string(), z.number()),
  transactions_last_30d: z.number(),
  last_compliance_status: z.string().nullable(),
  bank_configured: z.boolean(),
});
export type FsaOverview = z.infer<typeof fsaOverviewSchema>;


// ─── queries ────────────────────────────────────────────────

export function useFsaOverview() {
  return useQuery({
    queryKey: ["fsa", "overview"],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/fsa/overview");
      return validateResponse(fsaOverviewSchema, data, "fsa overview");
    },
    staleTime: 15_000,
  });
}


export function useFsaPlans() {
  return useQuery({
    queryKey: ["fsa", "plans"],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/fsa/plans");
      return validateResponse(z.array(fsaPlanSchema), data, "fsa plans");
    },
    staleTime: 30_000,
  });
}


export function useFsaEnrollments(params: { plan_kind?: string; status?: string }) {
  return useQuery({
    queryKey: ["fsa", "enrollments", params],
    queryFn: async () => {
      const clean = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
      );
      const { data } = await apiClient.get("/hr/fsa/enrollments", {
        params: clean,
      });
      return validateResponse(z.array(fsaEnrollmentSchema), data, "fsa enrollments");
    },
    staleTime: 30_000,
  });
}


export function useFsaTransactions(params: {
  status?: string;
  plan_kind?: string;
  kind?: string;
  q?: string;
}) {
  return useQuery({
    queryKey: ["fsa", "transactions", params],
    queryFn: async () => {
      const clean = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
      );
      const { data } = await apiClient.get("/hr/fsa/transactions", {
        params: clean,
      });
      return validateResponse(
        z.array(fsaTransactionSchema),
        data,
        "fsa transactions",
      );
    },
    staleTime: 15_000,
  });
}


export function usePatchFsaTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status?: string; notes?: string }) => {
      const { id, ...patch } = input;
      const { data } = await apiClient.patch(`/hr/fsa/transactions/${id}`, patch);
      return fsaTransactionSchema.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fsa", "transactions"] }),
  });
}


export function useFsaSettings() {
  return useQuery({
    queryKey: ["fsa", "settings"],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/fsa/settings");
      return validateResponse(fsaSettingsSchema, data, "fsa settings");
    },
    staleTime: 30_000,
  });
}


export function usePatchFsaSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<FsaSettings>) => {
      const { data } = await apiClient.patch("/hr/fsa/settings", patch);
      return fsaSettingsSchema.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fsa", "settings"] }),
  });
}


export function useFsaDocuments() {
  return useQuery({
    queryKey: ["fsa", "documents"],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/fsa/documents");
      return validateResponse(z.array(fsaDocumentSchema), data, "fsa documents");
    },
    staleTime: 60_000,
  });
}


export function useFsaComplianceTests() {
  return useQuery({
    queryKey: ["fsa", "compliance-tests"],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/fsa/compliance/tests");
      return validateResponse(
        z.array(fsaComplianceTestSchema),
        data,
        "fsa compliance tests",
      );
    },
    staleTime: 30_000,
  });
}


export function useRunFsaCompliance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post("/hr/fsa/compliance/run");
      return z.array(fsaComplianceTestSchema).parse(data);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["fsa", "compliance-tests"] }),
  });
}


export function useFsaExclusions() {
  return useQuery({
    queryKey: ["fsa", "exclusions"],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/fsa/exclusions");
      return validateResponse(z.array(fsaExclusionSchema), data, "fsa exclusions");
    },
    staleTime: 30_000,
  });
}


export function useAddFsaExclusion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      employee_name: string;
      reason: string;
      excluded_from: string;
    }) => {
      const { data } = await apiClient.post("/hr/fsa/exclusions", input);
      return fsaExclusionSchema.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fsa", "exclusions"] }),
  });
}


export function useDeleteFsaExclusion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/hr/fsa/exclusions/${id}`);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fsa", "exclusions"] }),
  });
}


export function usePatchFsaPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string } & Partial<FsaPlan>) => {
      const { id, ...patch } = input;
      const { data } = await apiClient.patch(`/hr/fsa/plans/${id}`, patch);
      return fsaPlanSchema.parse(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fsa", "plans"] });
      qc.invalidateQueries({ queryKey: ["fsa", "overview"] });
    },
  });
}
