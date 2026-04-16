import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiClient } from "@/api/client";
import { validateResponse } from "@/api/validateResponse";

import { applicantSchema } from "./api-applicants";


export const STAGES = [
  "applied",
  "screen",
  "ride_along",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
] as const;
export type Stage = (typeof STAGES)[number];


export const applicationSchema = z.object({
  id: z.string(),
  applicant_id: z.string(),
  requisition_id: z.string(),
  stage: z.enum(STAGES),
  stage_entered_at: z.string(),
  assigned_recruiter_id: z.number().nullable(),
  rejection_reason: z.string().nullable(),
  rating: z.number().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
});
export type Application = z.infer<typeof applicationSchema>;


export const applicationWithApplicantSchema = applicationSchema.extend({
  applicant: applicantSchema,
});
export type ApplicationWithApplicant = z.infer<
  typeof applicationWithApplicantSchema
>;


export const applicationKeys = {
  all: ["hr", "applications"] as const,
  byReq: (reqId: string, stage?: string) =>
    [...applicationKeys.all, "list", reqId, stage ?? "all"] as const,
  counts: (reqId: string) =>
    [...applicationKeys.all, "counts", reqId] as const,
  detail: (id: string) => [...applicationKeys.all, "detail", id] as const,
};


export function useApplicationsForRequisition(
  reqId: string | undefined,
  stage?: Stage,
) {
  return useQuery({
    enabled: !!reqId,
    queryKey: applicationKeys.byReq(reqId ?? "", stage),
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/applications", {
        params: { requisition_id: reqId, stage },
      });
      return validateResponse(
        z.array(applicationWithApplicantSchema),
        data,
        "/hr/applications",
      );
    },
  });
}


export function useApplicationStageCounts(reqId: string | undefined) {
  return useQuery({
    enabled: !!reqId,
    queryKey: applicationKeys.counts(reqId ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/applications/counts", {
        params: { requisition_id: reqId },
      });
      return validateResponse(
        z.record(z.string(), z.number()),
        data,
        "/hr/applications/counts",
      );
    },
  });
}


export function useApplication(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: applicationKeys.detail(id ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get(`/hr/applications/${id}`);
      return validateResponse(
        applicationWithApplicantSchema,
        data,
        `/hr/applications/${id}`,
      );
    },
  });
}


export function useTransitionStage(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      stage: Stage;
      rejection_reason?: string;
      note?: string;
    }) => {
      const { data } = await apiClient.patch(
        `/hr/applications/${applicationId}/stage`,
        input,
      );
      return validateResponse(applicationSchema, data, "transition stage");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: applicationKeys.all });
    },
  });
}
