import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { validateResponse } from "../validateResponse.ts";
import {
  equipmentListResponseSchema,
  equipmentSchema,
  type Equipment,
  type EquipmentListResponse,
  type EquipmentFilters,
  type EquipmentFormData,
} from "../types/equipment.ts";

/**
 * Query keys for equipment
 */
export const equipmentKeys = {
  all: ["equipment"] as const,
  lists: () => [...equipmentKeys.all, "list"] as const,
  list: (filters: EquipmentFilters) =>
    [...equipmentKeys.lists(), filters] as const,
  details: () => [...equipmentKeys.all, "detail"] as const,
  detail: (id: string) => [...equipmentKeys.details(), id] as const,
};

/**
 * Fetch paginated equipment list
 */
export function useEquipment(filters: EquipmentFilters = {}) {
  return useQuery({
    queryKey: equipmentKeys.list(filters),
    queryFn: async (): Promise<EquipmentListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", String(filters.page));
      if (filters.page_size) params.set("page_size", String(filters.page_size));
      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.assigned_to) params.set("assigned_to", filters.assigned_to);

      const url = "/equipment/?" + params.toString();
      const { data } = await apiClient.get(url);

      // Validate response in ALL environments (reports to Sentry if invalid)
      return validateResponse(
        equipmentListResponseSchema,
        data,
        "/equipment"
      );
    },
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Fetch single equipment by ID
 */
export function useEquipmentItem(id: string | undefined) {
  return useQuery({
    queryKey: equipmentKeys.detail(id!),
    queryFn: async (): Promise<Equipment> => {
      const { data } = await apiClient.get("/equipment/" + id);

      // Validate response in ALL environments (reports to Sentry if invalid)
      return validateResponse(equipmentSchema, data, `/equipment/${id}`);
    },
    enabled: !!id,
  });
}

/**
 * Create new equipment
 */
export function useCreateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EquipmentFormData): Promise<Equipment> => {
      const response = await apiClient.post("/equipment/", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.lists() });
    },
  });
}

/**
 * Update existing equipment
 */
export function useUpdateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<EquipmentFormData>;
    }): Promise<Equipment> => {
      const response = await apiClient.patch("/equipment/" + id, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: equipmentKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: equipmentKeys.lists() });
    },
  });
}

/**
 * Delete equipment
 */
export function useDeleteEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete("/equipment/" + id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.lists() });
    },
  });
}
