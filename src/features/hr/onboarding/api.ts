import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiClient } from "@/api/client";
import { validateResponse } from "@/api/validateResponse";


export const workflowTaskSchema = z.object({
  id: z.string(),
  instance_id: z.string(),
  position: z.number(),
  stage: z.string().nullable(),
  name: z.string(),
  kind: z.string(),
  status: z.enum(["blocked", "ready", "in_progress", "completed", "skipped"]),
  assignee_user_id: z.number().nullable(),
  assignee_subject_id: z.string().nullable(),
  assignee_role: z.string(),
  due_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  config: z.record(z.string(), z.any()),
  result: z.record(z.string(), z.any()),
});
export type WorkflowTask = z.infer<typeof workflowTaskSchema>;


export const workflowInstanceSchema = z.object({
  id: z.string(),
  template_id: z.string(),
  template_version: z.number(),
  subject_type: z.string(),
  subject_id: z.string(),
  status: z.enum(["active", "completed", "cancelled"]),
  started_at: z.string(),
  completed_at: z.string().nullable(),
});
export type WorkflowInstance = z.infer<typeof workflowInstanceSchema>;


export const instanceDetailSchema = z.object({
  instance: workflowInstanceSchema,
  tasks: z.array(workflowTaskSchema),
  onboarding_token: z.string().nullable(),
});
export type InstanceDetail = z.infer<typeof instanceDetailSchema>;


export const onboardingKeys = {
  all: ["hr", "onboarding"] as const,
  listFor: (subjectId: string | undefined, category?: string) =>
    [...onboardingKeys.all, "list", subjectId ?? "", category ?? "all"] as const,
  detail: (id: string) => [...onboardingKeys.all, "detail", id] as const,
};


export function useInstanceDetail(instanceId: string | undefined) {
  return useQuery({
    enabled: !!instanceId,
    queryKey: onboardingKeys.detail(instanceId ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get(`/hr/onboarding/instances/${instanceId}`);
      return validateResponse(
        instanceDetailSchema,
        data,
        `/hr/onboarding/instances/${instanceId}`,
      );
    },
  });
}


export function useInstancesForSubject(
  subjectId: string | undefined,
  category?: "onboarding" | "offboarding",
) {
  return useQuery({
    enabled: !!subjectId,
    queryKey: onboardingKeys.listFor(subjectId, category),
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/onboarding/instances", {
        params: { subject_id: subjectId, category },
      });
      return validateResponse(
        z.array(workflowInstanceSchema),
        data,
        "/hr/onboarding/instances",
      );
    },
  });
}


export function useAllInstances(category?: "onboarding" | "offboarding") {
  return useQuery({
    queryKey: [...onboardingKeys.all, "all", category ?? "all"],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/onboarding/instances", {
        params: category ? { category } : undefined,
      });
      return validateResponse(
        z.array(workflowInstanceSchema),
        data,
        "/hr/onboarding/instances (all)",
      );
    },
    staleTime: 30_000,
  });
}


export function useAdvanceWorkflowTask(instanceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      taskId: string;
      status: "in_progress" | "completed" | "skipped";
      reason?: string;
    }) => {
      const { data } = await apiClient.patch(
        `/hr/onboarding/instances/${instanceId}/tasks/${input.taskId}`,
        { status: input.status, reason: input.reason },
      );
      return validateResponse(
        workflowTaskSchema,
        data,
        "advance workflow task",
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: onboardingKeys.all }),
  });
}


export function useSpawnOffboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { subject_id: string }) => {
      const { data } = await apiClient.post(
        "/hr/onboarding/spawn-offboarding",
        input,
      );
      return validateResponse(
        workflowInstanceSchema,
        data,
        "spawn-offboarding",
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: onboardingKeys.all }),
  });
}
