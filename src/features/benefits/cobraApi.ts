import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiClient } from "@/api/client";
import { validateResponse } from "@/api/validateResponse";


const numOrStr = z.union([z.string(), z.number()]);


export const cobraEnrollmentSchema = z.object({
  id: z.string(),
  employee_id: z.string().nullable(),
  employee_name: z.string(),
  employee_label: z.string().nullable(),
  beneficiary_name: z.string(),
  status: z.string(),
  qualifying_event: z.string().nullable(),
  eligibility_date: z.string().nullable(),
  exhaustion_date: z.string().nullable(),
  bucket: z.string(),
  notice_sent_at: z.string().nullable(),
  notes: z.string().nullable(),
});
export type CobraEnrollment = z.infer<typeof cobraEnrollmentSchema>;


export const cobraPaymentSchema = z.object({
  id: z.string(),
  enrollment_id: z.string().nullable(),
  employee_name: z.string(),
  beneficiary_name: z.string(),
  month: z.string(),
  employee_charge_date: z.string().nullable(),
  charged_amount: numOrStr.nullable(),
  company_reimbursement_date: z.string().nullable(),
  reimbursement_amount: numOrStr.nullable(),
  status: z.string(),
});
export type CobraPayment = z.infer<typeof cobraPaymentSchema>;


export const cobraNoticeSchema = z.object({
  id: z.string(),
  enrollment_id: z.string().nullable(),
  employee_name: z.string(),
  beneficiary_name: z.string(),
  type_of_notice: z.string(),
  addressed_to: z.string().nullable(),
  notice_url: z.string().nullable(),
  tracking_status: z.string(),
  updated_on: z.string().nullable(),
});
export type CobraNotice = z.infer<typeof cobraNoticeSchema>;


export const cobraSettingsSchema = z.object({
  id: z.string(),
  payment_method_label: z.string().nullable(),
  bank_last4: z.string().nullable(),
  country_code: z.string().nullable(),
  grace_period_days: z.number(),
  election_window_days: z.number(),
  send_election_notices_automatically: z.boolean(),
});
export type CobraSettings = z.infer<typeof cobraSettingsSchema>;


export const cobraPrePlanSchema = z.object({
  id: z.string(),
  carrier: z.string(),
  plan_name: z.string(),
  plan_kind: z.string(),
  monthly_premium: numOrStr.nullable(),
  effective_from: z.string().nullable(),
  effective_to: z.string().nullable(),
  is_active: z.boolean(),
});
export type CobraPrePlan = z.infer<typeof cobraPrePlanSchema>;


export function useCobraEnrollments(params: { bucket?: string; q?: string }) {
  return useQuery({
    queryKey: ["cobra", "enrollments", params],
    queryFn: async () => {
      const clean = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
      );
      const { data } = await apiClient.get("/hr/cobra/enrollments", {
        params: clean,
      });
      return validateResponse(
        z.array(cobraEnrollmentSchema),
        data,
        "cobra enrollments",
      );
    },
    staleTime: 15_000,
  });
}


export function useAddCobraEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      employee_name: string;
      beneficiary_name: string;
      qualifying_event?: string;
      eligibility_date?: string;
      exhaustion_date?: string;
      bucket?: string;
      status?: string;
    }) => {
      const { data } = await apiClient.post("/hr/cobra/enrollments", payload);
      return cobraEnrollmentSchema.parse(data);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["cobra", "enrollments"] }),
  });
}


export function usePatchCobraEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string } & Partial<CobraEnrollment>) => {
      const { id, ...patch } = input;
      const { data } = await apiClient.patch(
        `/hr/cobra/enrollments/${id}`,
        patch,
      );
      return cobraEnrollmentSchema.parse(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cobra", "enrollments"] });
    },
  });
}


export function useSendCobraNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { data } = await apiClient.post(
        `/hr/cobra/enrollments/${enrollmentId}/send-notice`,
      );
      return data as { notice_id: string; status: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cobra"] });
    },
  });
}


export function useCobraPayments(params: { status?: string; q?: string }) {
  return useQuery({
    queryKey: ["cobra", "payments", params],
    queryFn: async () => {
      const clean = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
      );
      const { data } = await apiClient.get("/hr/cobra/payments", {
        params: clean,
      });
      return validateResponse(
        z.array(cobraPaymentSchema),
        data,
        "cobra payments",
      );
    },
    staleTime: 30_000,
  });
}


export function useCobraNotices(q?: string) {
  return useQuery({
    queryKey: ["cobra", "notices", { q }],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/cobra/notices", {
        params: q ? { q } : undefined,
      });
      return validateResponse(
        z.array(cobraNoticeSchema),
        data,
        "cobra notices",
      );
    },
    staleTime: 30_000,
  });
}


export function useCobraSettings() {
  return useQuery({
    queryKey: ["cobra", "settings"],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/cobra/settings");
      return validateResponse(cobraSettingsSchema, data, "cobra settings");
    },
    staleTime: 30_000,
  });
}


export function usePatchCobraSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<CobraSettings>) => {
      const { data } = await apiClient.patch("/hr/cobra/settings", patch);
      return cobraSettingsSchema.parse(data);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["cobra", "settings"] }),
  });
}


export function useCobraPrePlans() {
  return useQuery({
    queryKey: ["cobra", "pre-plans"],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/cobra/pre-plans");
      return validateResponse(
        z.array(cobraPrePlanSchema),
        data,
        "cobra pre-plans",
      );
    },
    staleTime: 60_000,
  });
}


export function useAddCobraPrePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      carrier: string;
      plan_name: string;
      plan_kind?: string;
      monthly_premium?: number;
    }) => {
      const { data } = await apiClient.post("/hr/cobra/pre-plans", payload);
      return cobraPrePlanSchema.parse(data);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["cobra", "pre-plans"] }),
  });
}


export function useDeleteCobraPrePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/hr/cobra/pre-plans/${id}`);
      return id;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["cobra", "pre-plans"] }),
  });
}
