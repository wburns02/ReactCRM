import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { validateResponse } from "../validateResponse.ts";
import { toastSuccess, toastError } from "@/components/ui/Toast";
import {
  technicianListResponseSchema,
  technicianSchema,
  technicianPerformanceStatsSchema,
  technicianJobsResponseSchema,
  type Technician,
  type TechnicianListResponse,
  type TechnicianFilters,
  type TechnicianFormData,
  type TechnicianPerformanceStats,
  type TechnicianJobsResponse,
  type JobCategory,
} from "../types/technician.ts";

/**
 * Query keys for technicians
 */
export const technicianKeys = {
  all: ["technicians"] as const,
  lists: () => [...technicianKeys.all, "list"] as const,
  list: (filters: TechnicianFilters) =>
    [...technicianKeys.lists(), filters] as const,
  details: () => [...technicianKeys.all, "detail"] as const,
  detail: (id: string) => [...technicianKeys.details(), id] as const,
  performance: (id: string) =>
    [...technicianKeys.all, "performance", id] as const,
  jobs: (id: string, category: JobCategory, page: number) =>
    [...technicianKeys.all, "jobs", id, category, page] as const,
};

/**
 * Fetch paginated technicians list
 */
export function useTechnicians(filters: TechnicianFilters = {}) {
  return useQuery({
    queryKey: technicianKeys.list(filters),
    queryFn: async (): Promise<TechnicianListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", String(filters.page));
      if (filters.page_size) params.set("page_size", String(filters.page_size));
      if (filters.search) params.set("search", filters.search);
      if (filters.active_only !== undefined)
        params.set("active_only", String(filters.active_only));

      const url = "/technicians/?" + params.toString();
      const { data } = await apiClient.get(url);

      // Validate response in ALL environments (reports to Sentry if invalid)
      return validateResponse(
        technicianListResponseSchema,
        data,
        "/technicians"
      );
    },
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Fetch single technician by ID
 */
export function useTechnician(id: string | undefined) {
  return useQuery({
    queryKey: technicianKeys.detail(id!),
    queryFn: async (): Promise<Technician> => {
      const { data } = await apiClient.get("/technicians/" + id);

      // Validate response in ALL environments (reports to Sentry if invalid)
      return validateResponse(technicianSchema, data, `/technicians/${id}`);
    },
    enabled: !!id,
  });
}

/**
 * Create new technician
 */
export function useCreateTechnician() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TechnicianFormData): Promise<Technician> => {
      const response = await apiClient.post("/technicians/", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: technicianKeys.lists() });
      toastSuccess("Technician created", "The new technician has been added.");
    },
    onError: (error) => {
      console.error("[Technician Create] Failed:", error);
      toastError(
        "Failed to create technician",
        "Please try again or contact support.",
      );
    },
  });
}

/**
 * Update existing technician
 */
export function useUpdateTechnician() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<TechnicianFormData>;
    }): Promise<Technician> => {
      const response = await apiClient.patch("/technicians/" + id, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: technicianKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: technicianKeys.lists() });
      toastSuccess("Technician updated", "Changes have been saved.");
    },
    onError: (error) => {
      console.error("[Technician Update] Failed:", error);
      toastError(
        "Failed to update technician",
        "Please try again or contact support.",
      );
    },
  });
}

/**
 * Delete technician (soft delete - sets is_active=false)
 */
export function useDeleteTechnician() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete("/technicians/" + id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: technicianKeys.lists() });
      toastSuccess("Technician deactivated", "The technician has been marked as inactive.");
    },
    onError: (error) => {
      console.error("[Technician Delete] Failed:", error);
      toastError(
        "Failed to delete technician",
        "Please try again or contact support.",
      );
    },
  });
}

// =====================================================
// Performance Stats Hooks
// =====================================================

/**
 * Fetch technician performance statistics
 */
export function useTechnicianPerformance(technicianId: string | undefined) {
  return useQuery({
    queryKey: technicianKeys.performance(technicianId!),
    queryFn: async (): Promise<TechnicianPerformanceStats> => {
      const { data } = await apiClient.get(
        `/technicians/${technicianId}/performance`,
      );

      // Validate response in ALL environments (reports to Sentry if invalid)
      return validateResponse(
        technicianPerformanceStatsSchema,
        data,
        `/technicians/${technicianId}/performance`
      );
    },
    enabled: !!technicianId,
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Fetch technician job details with pagination and filtering
 */
export function useTechnicianJobs(
  technicianId: string | undefined,
  jobCategory: JobCategory = "all",
  page: number = 1,
  pageSize: number = 20,
) {
  return useQuery({
    queryKey: technicianKeys.jobs(technicianId!, jobCategory, page),
    queryFn: async (): Promise<TechnicianJobsResponse> => {
      const params = new URLSearchParams({
        job_category: jobCategory,
        page: String(page),
        page_size: String(pageSize),
      });

      const { data } = await apiClient.get(
        `/technicians/${technicianId}/jobs?${params.toString()}`,
      );

      // Validate response in ALL environments (reports to Sentry if invalid)
      return validateResponse(
        technicianJobsResponseSchema,
        data,
        `/technicians/${technicianId}/jobs`
      );
    },
    enabled: !!technicianId,
    staleTime: 30_000, // 30 seconds
  });
}
