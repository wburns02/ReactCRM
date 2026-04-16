import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiClient } from "@/api/client";
import { validateResponse } from "@/api/validateResponse";


export const applicantSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  resume_storage_key: z.string().nullable(),
  source: z.enum([
    "careers_page",
    "indeed",
    "ziprecruiter",
    "facebook",
    "referral",
    "manual",
    "email",
  ]),
  source_ref: z.string().nullable(),
  sms_consent_given: z.boolean(),
  created_at: z.string(),
});
export type Applicant = z.infer<typeof applicantSchema>;


export const applicantInputSchema = z.object({
  first_name: z.string().min(1).max(128),
  last_name: z.string().min(1).max(128),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  source: applicantSchema.shape.source.default("manual"),
  source_ref: z.string().optional().nullable(),
});
export type ApplicantInput = z.infer<typeof applicantInputSchema>;


export const applicantKeys = {
  all: ["hr", "applicants"] as const,
  list: (limit: number, offset: number) =>
    [...applicantKeys.all, "list", limit, offset] as const,
  detail: (id: string) => [...applicantKeys.all, "detail", id] as const,
};


export function useApplicants(limit = 50, offset = 0) {
  return useQuery({
    queryKey: applicantKeys.list(limit, offset),
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/applicants", {
        params: { limit, offset },
      });
      return validateResponse(z.array(applicantSchema), data, "/hr/applicants");
    },
    staleTime: 30_000,
  });
}


export function useApplicant(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: applicantKeys.detail(id ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get(`/hr/applicants/${id}`);
      return validateResponse(applicantSchema, data, `/hr/applicants/${id}`);
    },
  });
}


export function useCreateApplicant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ApplicantInput) => {
      const { data } = await apiClient.post("/hr/applicants", payload);
      return validateResponse(applicantSchema, data, "/hr/applicants (create)");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: applicantKeys.all }),
  });
}
