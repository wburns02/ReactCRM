import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import {
  technicianListResponseSchema,
  technicianSchema,
  type Technician,
  type TechnicianListResponse,
  type TechnicianFilters,
  type TechnicianFormData,
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

      // Validate response in development
      if (import.meta.env.DEV) {
        const result = technicianListResponseSchema.safeParse(data);
        if (!result.success) {
          console.warn(
            "Technician list response validation failed:",
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
 * Fetch single technician by ID
 */
export function useTechnician(id: string | undefined) {
  return useQuery({
    queryKey: technicianKeys.detail(id!),
    queryFn: async (): Promise<Technician> => {
      const { data } = await apiClient.get("/technicians/" + id);

      if (import.meta.env.DEV) {
        const result = technicianSchema.safeParse(data);
        if (!result.success) {
          console.warn("Technician response validation failed:", result.error);
        }
      }

      return data;
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
    },
  });
}
