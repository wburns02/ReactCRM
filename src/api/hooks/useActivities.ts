import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import {
  activityListResponseSchema,
  activitySchema,
  type Activity,
  type ActivityListResponse,
  type ActivityFilters,
  type ActivityFormData,
} from "../types/activity.ts";

/**
 * Query keys for activities
 */
export const activityKeys = {
  all: ["activities"] as const,
  lists: () => [...activityKeys.all, "list"] as const,
  list: (filters: ActivityFilters) =>
    [...activityKeys.lists(), filters] as const,
  details: () => [...activityKeys.all, "detail"] as const,
  detail: (id: string) => [...activityKeys.details(), id] as const,
};

/**
 * Fetch paginated activities list
 */
export function useActivities(filters: ActivityFilters = {}) {
  return useQuery({
    queryKey: activityKeys.list(filters),
    queryFn: async (): Promise<ActivityListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", String(filters.page));
      if (filters.page_size) params.set("page_size", String(filters.page_size));
      if (filters.customer_id) params.set("customer_id", filters.customer_id);
      if (filters.activity_type)
        params.set("activity_type", filters.activity_type);

      const { data } = await apiClient.get(`/activities?${params.toString()}`);

      // Validate response in development
      if (import.meta.env.DEV) {
        const result = activityListResponseSchema.safeParse(data);
        if (!result.success) {
          console.warn(
            "Activity list response validation failed:",
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
 * Fetch single activity by ID
 */
export function useActivity(id: string | undefined) {
  return useQuery({
    queryKey: activityKeys.detail(id!),
    queryFn: async (): Promise<Activity> => {
      const { data } = await apiClient.get(`/activities/${id}`);

      if (import.meta.env.DEV) {
        const result = activitySchema.safeParse(data);
        if (!result.success) {
          console.warn("Activity response validation failed:", result.error);
        }
      }

      return data;
    },
    enabled: !!id,
  });
}

/**
 * Create new activity
 */
export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ActivityFormData): Promise<Activity> => {
      const response = await apiClient.post("/activities", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() });
    },
  });
}

/**
 * Update existing activity
 */
export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ActivityFormData>;
    }): Promise<Activity> => {
      const response = await apiClient.patch(`/activities/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: activityKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() });
    },
  });
}

/**
 * Delete activity
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/activities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() });
    },
  });
}
