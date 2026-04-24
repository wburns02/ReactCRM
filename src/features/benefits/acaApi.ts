import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiClient } from "@/api/client";
import { validateResponse } from "@/api/validateResponse";


const numOrStr = z.union([z.string(), z.number()]);


export const acaFilingSchema = z.object({
  id: z.string(),
  plan_year: z.number(),
  form_1094c_status: z.string(),
  form_1095c_count: z.number(),
  irs_deadline: z.string().nullable(),
  employee_deadline: z.string().nullable(),
  filed_at: z.string().nullable(),
  is_current: z.boolean(),
  notes: z.string().nullable(),
});
export type AcaFiling = z.infer<typeof acaFilingSchema>;


export const lookbackPolicySchema = z.object({
  id: z.string(),
  standard_measurement_months: z.number(),
  stability_months: z.number(),
  administrative_days: z.number(),
  initial_measurement_months: z.number(),
  hours_threshold: z.number(),
  is_active: z.boolean(),
  effective_from: z.string().nullable(),
});
export type LookbackPolicy = z.infer<typeof lookbackPolicySchema>;


export const employeeHoursSchema = z.object({
  id: z.string(),
  employee_name: z.string(),
  measurement_period: z.string(),
  total_hours: numOrStr,
  average_hours_per_week: numOrStr,
  is_full_time_eligible: z.boolean(),
});
export type EmployeeHours = z.infer<typeof employeeHoursSchema>;


export const benefitSignatorySchema = z.object({
  id: z.string(),
  document_type: z.string(),
  signatory_name: z.string().nullable(),
  signatory_department: z.string().nullable(),
  status: z.string(),
});
export type BenefitSignatory = z.infer<typeof benefitSignatorySchema>;


export const companySettingsSchema = z.object({
  id: z.string(),
  class_codes: z.string().nullable(),
  tax_std_not_taxed: z.boolean(),
  tax_ltd_not_taxed: z.boolean(),
  enrollment_hide_until_start: z.boolean(),
  newly_eligible_window_days: z.number(),
  part_time_offer_health: z.boolean(),
  cost_show_monthly_in_app: z.boolean(),
  cost_hide_company_contribution: z.boolean(),
  ask_tobacco_question: z.boolean(),
  qle_require_admin_approval: z.boolean(),
  new_hire_preview_enabled: z.boolean(),
  form_forwarding_enabled: z.boolean(),
  carrier_connect_tier: z.string(),
  benefit_admin_notification_user: z.string().nullable(),
});
export type CompanySettings = z.infer<typeof companySettingsSchema>;


export function useAcaFilings() {
  return useQuery({
    queryKey: ["aca", "filings"],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/aca/filings");
      return validateResponse(z.array(acaFilingSchema), data, "aca filings");
    },
    staleTime: 60_000,
  });
}


export function useLookbackPolicy() {
  return useQuery({
    queryKey: ["aca", "lookback"],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/aca/lookback");
      return validateResponse(lookbackPolicySchema, data, "aca lookback");
    },
    staleTime: 30_000,
  });
}


export function usePatchLookback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<LookbackPolicy>) => {
      const { data } = await apiClient.patch("/hr/aca/lookback", patch);
      return lookbackPolicySchema.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aca", "lookback"] }),
  });
}


export function useEmployeeHours() {
  return useQuery({
    queryKey: ["aca", "employee-hours"],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/aca/employee-hours");
      return validateResponse(
        z.array(employeeHoursSchema),
        data,
        "aca employee hours",
      );
    },
    staleTime: 60_000,
  });
}


export function useBenefitCompanySettings() {
  return useQuery({
    queryKey: ["benefit-company-settings"],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/benefit-company-settings");
      return validateResponse(companySettingsSchema, data, "company settings");
    },
    staleTime: 30_000,
  });
}


export function usePatchCompanySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<CompanySettings>) => {
      const { data } = await apiClient.patch(
        "/hr/benefit-company-settings",
        patch,
      );
      return companySettingsSchema.parse(data);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["benefit-company-settings"] }),
  });
}


export function useBenefitSignatories() {
  return useQuery({
    queryKey: ["benefit-signatories"],
    queryFn: async () => {
      const { data } = await apiClient.get(
        "/hr/benefit-company-settings/signatories",
      );
      return validateResponse(
        z.array(benefitSignatorySchema),
        data,
        "signatories",
      );
    },
    staleTime: 60_000,
  });
}


export function usePatchBenefitSignatory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      signatory_name?: string | null;
      status?: string;
    }) => {
      const { id, ...patch } = input;
      const { data } = await apiClient.patch(
        `/hr/benefit-company-settings/signatories/${id}`,
        patch,
      );
      return benefitSignatorySchema.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["benefit-signatories"] }),
  });
}
