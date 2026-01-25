import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { toastSuccess, toastError } from "@/components/ui/Toast";
import {
  prospectListResponseSchema,
  prospectSchema,
  type Prospect,
  type ProspectListResponse,
  type ProspectFilters,
  type ProspectFormData,
  type StageUpdateData,
} from "../types/prospect.ts";

/**
 * Query keys for prospects
 */
export const prospectKeys = {
  all: ["prospects"] as const,
  lists: () => [...prospectKeys.all, "list"] as const,
  list: (filters: ProspectFilters) =>
    [...prospectKeys.lists(), filters] as const,
  details: () => [...prospectKeys.all, "detail"] as const,
  detail: (id: string) => [...prospectKeys.details(), id] as const,
};

/**
 * Fetch paginated prospects list
 */
export function useProspects(filters: ProspectFilters = {}) {
  return useQuery({
    queryKey: prospectKeys.list(filters),
    queryFn: async (): Promise<ProspectListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", String(filters.page));
      if (filters.page_size) params.set("page_size", String(filters.page_size));
      if (filters.search) params.set("search", filters.search);
      if (filters.stage) params.set("stage", filters.stage);
      if (filters.lead_source) params.set("lead_source", filters.lead_source);

      const { data } = await apiClient.get(`/prospects/?${params.toString()}`);

      // Validate response in development
      if (import.meta.env.DEV) {
        const result = prospectListResponseSchema.safeParse(data);
        if (!result.success) {
          console.warn(
            "Prospect list response validation failed:",
            result.error,
          );
        }
      }

      return data;
    },
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Fetch single prospect by ID
 */
export function useProspect(id: string | undefined) {
  return useQuery({
    queryKey: prospectKeys.detail(id!),
    queryFn: async (): Promise<Prospect> => {
      const { data } = await apiClient.get(`/prospects/${id}`);

      if (import.meta.env.DEV) {
        const result = prospectSchema.safeParse(data);
        if (!result.success) {
          console.warn("Prospect response validation failed:", result.error);
        }
      }

      return data;
    },
    enabled: !!id,
  });
}

/**
 * Create new prospect
 */
export function useCreateProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProspectFormData): Promise<Prospect> => {
      const response = await apiClient.post("/prospects/", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: prospectKeys.lists() });
    },
  });
}

/**
 * Update existing prospect
 */
export function useUpdateProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ProspectFormData>;
    }): Promise<Prospect> => {
      const response = await apiClient.patch(`/prospects/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: prospectKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: prospectKeys.lists() });
    },
  });
}

/**
 * Update prospect stage (optimized for drag-drop/quick updates)
 */
export function useUpdateProspectStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      stage,
    }: { id: string } & StageUpdateData): Promise<Prospect> => {
      const response = await apiClient.patch(`/prospects/${id}/stage`, {
        stage,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: prospectKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: prospectKeys.lists() });
    },
  });
}

/**
 * Delete prospect
 */
export function useDeleteProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/prospects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: prospectKeys.lists() });
      toastSuccess("Prospect deleted", "The prospect has been removed.");
    },
    onError: (error) => {
      console.error("[Prospect Delete] Failed:", error);
      toastError(
        "Failed to delete prospect",
        "Please try again or contact support."
      );
    },
  });
}
