/**
 * Marketing Tasks Hooks
 *
 * React Query hooks for the Marketing Tasks Dashboard.
 * Fetches data from the ecbtx-seo-service Docker containers.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import type {
  MarketingTasksResponse,
  ServiceHealth,
  MarketingAlert,
  ScheduledTask,
  MarketingTaskSite,
  MarketingMetrics,
} from "../types/marketingTasks.ts";

// Query Keys
export const marketingTasksKeys = {
  all: ["marketing-tasks"] as const,
  dashboard: () => [...marketingTasksKeys.all, "dashboard"] as const,
  services: () => [...marketingTasksKeys.all, "services"] as const,
  service: (name: string) =>
    [...marketingTasksKeys.all, "services", name] as const,
  alerts: () => [...marketingTasksKeys.all, "alerts"] as const,
  scheduledTasks: () => [...marketingTasksKeys.all, "scheduled"] as const,
  sites: () => [...marketingTasksKeys.all, "sites"] as const,
  metrics: () => [...marketingTasksKeys.all, "metrics"] as const,
};

/**
 * Get Marketing Tasks Dashboard Data
 * Main hook that fetches all dashboard data including services, alerts, and metrics
 */
export function useMarketingTasks() {
  return useQuery({
    queryKey: marketingTasksKeys.dashboard(),
    queryFn: async (): Promise<MarketingTasksResponse> => {
      const response =
        await apiClient.get<MarketingTasksResponse>("/marketing-hub/tasks");
      return response.data;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });
}

/**
 * Get Service Health Status for all services
 */
export function useServiceHealth() {
  return useQuery({
    queryKey: marketingTasksKeys.services(),
    queryFn: async (): Promise<ServiceHealth[]> => {
      const response = await apiClient.get<ServiceHealth[]>(
        "/marketing-hub/tasks/services",
      );
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Get health status of a specific service
 */
export function useSingleServiceHealth(serviceName: string) {
  return useQuery({
    queryKey: marketingTasksKeys.service(serviceName),
    queryFn: async (): Promise<ServiceHealth> => {
      const response = await apiClient.get<ServiceHealth>(
        `/marketing-hub/tasks/services/${serviceName}`,
      );
      return response.data;
    },
    enabled: !!serviceName,
  });
}

/**
 * Get marketing alerts
 */
export function useMarketingAlerts() {
  return useQuery({
    queryKey: marketingTasksKeys.alerts(),
    queryFn: async (): Promise<MarketingAlert[]> => {
      const response = await apiClient.get<MarketingAlert[]>(
        "/marketing-hub/tasks/alerts",
      );
      return response.data;
    },
    refetchInterval: 60000,
  });
}

/**
 * Get scheduled tasks
 */
export function useScheduledTasks() {
  return useQuery({
    queryKey: marketingTasksKeys.scheduledTasks(),
    queryFn: async (): Promise<ScheduledTask[]> => {
      const response = await apiClient.get<ScheduledTask[]>(
        "/marketing-hub/tasks/scheduled",
      );
      return response.data;
    },
  });
}

/**
 * Get configured sites
 */
export function useMarketingSites() {
  return useQuery({
    queryKey: marketingTasksKeys.sites(),
    queryFn: async (): Promise<MarketingTaskSite[]> => {
      const response = await apiClient.get<MarketingTaskSite[]>(
        "/marketing-hub/tasks/sites",
      );
      return response.data;
    },
  });
}

/**
 * Get marketing metrics
 */
export function useMarketingMetrics() {
  return useQuery({
    queryKey: marketingTasksKeys.metrics(),
    queryFn: async (): Promise<MarketingMetrics> => {
      const response = await apiClient.get<MarketingMetrics>(
        "/marketing-hub/tasks/metrics",
      );
      return response.data;
    },
    refetchInterval: 60000,
  });
}

// Mutations

/**
 * Trigger a health check for a specific service
 */
export function useTriggerHealthCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceName: string): Promise<ServiceHealth> => {
      const response = await apiClient.post<ServiceHealth>(
        `/marketing-hub/tasks/services/${serviceName}/check`,
      );
      return response.data;
    },
    onSuccess: (_data, serviceName) => {
      queryClient.invalidateQueries({
        queryKey: marketingTasksKeys.service(serviceName),
      });
      queryClient.invalidateQueries({
        queryKey: marketingTasksKeys.services(),
      });
      queryClient.invalidateQueries({
        queryKey: marketingTasksKeys.dashboard(),
      });
    },
  });
}

/**
 * Resolve an alert
 */
export function useResolveMarketingAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      alertId: string,
    ): Promise<{ success: boolean; message: string }> => {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        `/marketing-hub/tasks/alerts/${alertId}/resolve`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: marketingTasksKeys.alerts(),
      });
      queryClient.invalidateQueries({
        queryKey: marketingTasksKeys.dashboard(),
      });
    },
  });
}

/**
 * Trigger a scheduled task manually
 */
export function useTriggerScheduledTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      taskId: string,
    ): Promise<{ success: boolean; message: string; data?: unknown }> => {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        data?: unknown;
      }>(`/marketing-hub/tasks/scheduled/${taskId}/run`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: marketingTasksKeys.scheduledTasks(),
      });
      queryClient.invalidateQueries({
        queryKey: marketingTasksKeys.dashboard(),
      });
    },
  });
}
