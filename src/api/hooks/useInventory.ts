import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { validateResponse } from "../validateResponse.ts";
import {
  inventoryListResponseSchema,
  inventoryItemSchema,
  type InventoryItem,
  type InventoryListResponse,
  type InventoryFilters,
  type InventoryFormData,
  type InventoryAdjustmentData,
} from "../types/inventory.ts";

/**
 * Query keys for inventory
 */
export const inventoryKeys = {
  all: ["inventory"] as const,
  lists: () => [...inventoryKeys.all, "list"] as const,
  list: (filters: InventoryFilters) =>
    [...inventoryKeys.lists(), filters] as const,
  details: () => [...inventoryKeys.all, "detail"] as const,
  detail: (id: string) => [...inventoryKeys.details(), id] as const,
};

/**
 * Fetch paginated inventory list
 */
export function useInventory(filters: InventoryFilters = {}) {
  return useQuery({
    queryKey: inventoryKeys.list(filters),
    queryFn: async (): Promise<InventoryListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", String(filters.page));
      if (filters.page_size) params.set("page_size", String(filters.page_size));
      if (filters.search) params.set("search", filters.search);
      if (filters.category) params.set("category", filters.category);
      if (filters.low_stock !== undefined)
        params.set("low_stock", String(filters.low_stock));

      const url = "/inventory/?" + params.toString();
      const { data } = await apiClient.get(url);

      // Validate response in ALL environments (reports to Sentry if invalid)
      return validateResponse(
        inventoryListResponseSchema,
        data,
        "/inventory"
      );
    },
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Fetch single inventory item by ID
 */
export function useInventoryItem(id: string | undefined) {
  return useQuery({
    queryKey: inventoryKeys.detail(id!),
    queryFn: async (): Promise<InventoryItem> => {
      const { data } = await apiClient.get("/inventory/" + id);

      // Validate response in ALL environments (reports to Sentry if invalid)
      return validateResponse(inventoryItemSchema, data, `/inventory/${id}`);
    },
    enabled: !!id,
  });
}

/**
 * Create new inventory item
 */
export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InventoryFormData): Promise<InventoryItem> => {
      const response = await apiClient.post("/inventory/", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
    },
  });
}

/**
 * Update existing inventory item
 */
export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<InventoryFormData>;
    }): Promise<InventoryItem> => {
      const response = await apiClient.patch("/inventory/" + id, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
    },
  });
}

/**
 * Adjust inventory quantity
 */
export function useAdjustInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: InventoryAdjustmentData;
    }): Promise<InventoryItem> => {
      const response = await apiClient.post(
        "/inventory/" + id + "/adjust",
        data,
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
    },
  });
}

/**
 * Delete inventory item
 */
export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete("/inventory/" + id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
    },
  });
}
