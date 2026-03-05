import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { validateResponse } from "../validateResponse.ts";
import {
  workflowListResponseSchema,
  workflowDetailSchema,
  templatesResponseSchema,
  testRunResultSchema,
  executionListResponseSchema,
  type WorkflowListResponse,
  type WorkflowDetail,
  type WorkflowTemplate,
  type TestRunResult,
  type WorkflowFormData,
  type Workflow,
} from "../types/workflowAutomations.ts";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";

export const workflowKeys = {
  all: ["workflows"] as const,
  lists: () => [...workflowKeys.all, "list"] as const,
  list: (page: number, status?: string) => [...workflowKeys.lists(), page, status] as const,
  details: () => [...workflowKeys.all, "detail"] as const,
  detail: (id: string) => [...workflowKeys.details(), id] as const,
  executions: (id: string, page: number) => [...workflowKeys.detail(id), "executions", page] as const,
  templates: () => [...workflowKeys.all, "templates"] as const,
};

export function useWorkflows(page = 1, status?: string) {
  return useQuery({
    queryKey: workflowKeys.list(page, status),
    queryFn: async (): Promise<WorkflowListResponse> => {
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.set("status", status);
      const { data } = await apiClient.get(`/automations?${params}`);
      return validateResponse(workflowListResponseSchema, data, "/automations");
    },
    staleTime: 30_000,
  });
}

export function useWorkflow(id: string | undefined) {
  return useQuery({
    queryKey: workflowKeys.detail(id!),
    queryFn: async (): Promise<WorkflowDetail> => {
      const { data } = await apiClient.get(`/automations/${id}`);
      return validateResponse(workflowDetailSchema, data, `/automations/${id}`);
    },
    enabled: !!id,
  });
}

export function useWorkflowTemplates() {
  return useQuery({
    queryKey: workflowKeys.templates(),
    queryFn: async (): Promise<WorkflowTemplate[]> => {
      const { data } = await apiClient.get("/automations/templates");
      const parsed = validateResponse(templatesResponseSchema, data, "/automations/templates");
      return parsed.templates;
    },
    staleTime: 60_000 * 10,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: WorkflowFormData): Promise<Workflow> => {
      const { data } = await apiClient.post("/automations", formData);
      return data;
    },
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
      toastSuccess("Workflow Created", `"${workflow.name}" saved successfully`);
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toastError("Creation Failed", error?.response?.data?.detail || error?.message || "Failed to create workflow");
    },
  });
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: formData }: { id: string; data: Partial<WorkflowFormData> }): Promise<Workflow> => {
      const { data } = await apiClient.patch(`/automations/${id}`, formData);
      return data;
    },
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(workflow.id) });
      toastSuccess("Workflow Updated", `"${workflow.name}" updated`);
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toastError("Update Failed", error?.response?.data?.detail || error?.message || "Failed to update workflow");
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/automations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
      toastSuccess("Workflow Deleted", "Workflow removed successfully");
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toastError("Delete Failed", error?.response?.data?.detail || error?.message || "Failed to delete workflow");
    },
  });
}

export function useToggleWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<Workflow> => {
      const { data } = await apiClient.post(`/automations/${id}/toggle`);
      return data;
    },
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(workflow.id) });
      toastSuccess("Status Changed", `Workflow is now ${workflow.status}`);
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toastError("Toggle Failed", error?.response?.data?.detail || error?.message || "Failed to toggle workflow");
    },
  });
}

export function useTestWorkflow() {
  return useMutation({
    mutationFn: async (id: string): Promise<TestRunResult> => {
      const { data } = await apiClient.post(`/automations/${id}/test`);
      return validateResponse(testRunResultSchema, data, `/automations/${id}/test`);
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toastError("Test Failed", error?.response?.data?.detail || error?.message || "Test run failed");
    },
  });
}

export function useWorkflowExecutions(id: string | undefined, page = 1) {
  return useQuery({
    queryKey: workflowKeys.executions(id!, page),
    queryFn: async () => {
      const { data } = await apiClient.get(`/automations/${id}/executions?page=${page}`);
      return validateResponse(executionListResponseSchema, data, `/automations/${id}/executions`);
    },
    enabled: !!id,
  });
}
