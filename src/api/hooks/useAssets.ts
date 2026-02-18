import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { validateResponse } from "../validateResponse.ts";
import {
  assetListResponseSchema,
  assetSchema,
  assetDashboardSchema,
  maintenanceLogSchema,
  assignmentSchema,
  type Asset,
  type AssetListResponse,
  type AssetFilters,
  type AssetFormData,
  type AssetDashboard,
  type MaintenanceLog,
  type AssetAssignment,
} from "../types/assets.ts";
import { z } from "zod";

/**
 * Query keys for assets
 */
export const assetKeys = {
  all: ["assets"] as const,
  lists: () => [...assetKeys.all, "list"] as const,
  list: (filters: AssetFilters) => [...assetKeys.lists(), filters] as const,
  details: () => [...assetKeys.all, "detail"] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
  dashboard: () => [...assetKeys.all, "dashboard"] as const,
  maintenance: (id: string) => [...assetKeys.all, "maintenance", id] as const,
  assignments: (id: string) => [...assetKeys.all, "assignments", id] as const,
  types: () => [...assetKeys.all, "types"] as const,
};

/**
 * Fetch asset dashboard
 */
export function useAssetDashboard() {
  return useQuery({
    queryKey: assetKeys.dashboard(),
    queryFn: async (): Promise<AssetDashboard> => {
      const { data } = await apiClient.get("/assets/dashboard");
      return validateResponse(assetDashboardSchema, data, "/assets/dashboard");
    },
    staleTime: 30_000,
  });
}

/**
 * Fetch paginated asset list
 */
export function useAssets(filters: AssetFilters = {}) {
  return useQuery({
    queryKey: assetKeys.list(filters),
    queryFn: async (): Promise<AssetListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", String(filters.page));
      if (filters.page_size) params.set("page_size", String(filters.page_size));
      if (filters.search) params.set("search", filters.search);
      if (filters.asset_type) params.set("asset_type", filters.asset_type);
      if (filters.status) params.set("status", filters.status);
      if (filters.condition) params.set("condition", filters.condition);
      if (filters.assigned_to) params.set("assigned_to", filters.assigned_to);
      if (filters.is_active !== undefined)
        params.set("is_active", String(filters.is_active));

      const url = "/assets/?" + params.toString();
      const { data } = await apiClient.get(url);
      return validateResponse(assetListResponseSchema, data, "/assets");
    },
    staleTime: 30_000,
  });
}

/**
 * Fetch single asset by ID
 */
export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: assetKeys.detail(id!),
    queryFn: async (): Promise<Asset> => {
      const { data } = await apiClient.get("/assets/" + id);
      return validateResponse(assetSchema, data, `/assets/${id}`);
    },
    enabled: !!id,
  });
}

/**
 * Fetch asset types
 */
export function useAssetTypes() {
  return useQuery({
    queryKey: assetKeys.types(),
    queryFn: async (): Promise<string[]> => {
      const { data } = await apiClient.get("/assets/types");
      return data.types || [];
    },
    staleTime: 300_000, // 5 minutes
  });
}

/**
 * Create new asset
 */
export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: AssetFormData): Promise<Asset> => {
      const { data } = await apiClient.post("/assets/", formData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.dashboard() });
    },
  });
}

/**
 * Update existing asset
 */
export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data: formData,
    }: {
      id: string;
      data: Partial<AssetFormData>;
    }): Promise<Asset> => {
      const { data } = await apiClient.patch("/assets/" + id, formData);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assetKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.dashboard() });
    },
  });
}

/**
 * Delete (retire) asset
 */
export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete("/assets/" + id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.dashboard() });
    },
  });
}

/**
 * Fetch maintenance logs for an asset
 */
export function useAssetMaintenance(assetId: string | undefined) {
  return useQuery({
    queryKey: assetKeys.maintenance(assetId!),
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/assets/${assetId}/maintenance`,
      );
      return {
        items: (data.items || []).map((item: unknown) =>
          validateResponse(
            maintenanceLogSchema,
            item,
            `/assets/${assetId}/maintenance`,
          ),
        ) as MaintenanceLog[],
        total: data.total || 0,
      };
    },
    enabled: !!assetId,
  });
}

/**
 * Create maintenance log
 */
export function useCreateMaintenanceLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: {
      asset_id: string;
      maintenance_type: string;
      title: string;
      description?: string;
      cost?: number;
      condition_before?: string;
      condition_after?: string;
      hours_at_service?: number;
      odometer_at_service?: number;
      notes?: string;
    }): Promise<MaintenanceLog> => {
      const { data } = await apiClient.post(
        `/assets/${formData.asset_id}/maintenance`,
        formData,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assetKeys.maintenance(variables.asset_id),
      });
      queryClient.invalidateQueries({
        queryKey: assetKeys.detail(variables.asset_id),
      });
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.dashboard() });
    },
  });
}

/**
 * Fetch assignment history for an asset
 */
export function useAssetAssignments(assetId: string | undefined) {
  return useQuery({
    queryKey: assetKeys.assignments(assetId!),
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/assets/${assetId}/assignments`,
      );
      return {
        items: (data.items || []).map((item: unknown) =>
          validateResponse(
            assignmentSchema,
            item,
            `/assets/${assetId}/assignments`,
          ),
        ) as AssetAssignment[],
        total: data.total || 0,
      };
    },
    enabled: !!assetId,
  });
}

/**
 * Checkout asset
 */
export function useCheckoutAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: {
      asset_id: string;
      assigned_to_type: string;
      assigned_to_id: string;
      assigned_to_name?: string;
      condition_at_checkout?: string;
      notes?: string;
    }): Promise<AssetAssignment> => {
      const { data } = await apiClient.post("/assets/checkout", formData);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assetKeys.assignments(variables.asset_id),
      });
      queryClient.invalidateQueries({
        queryKey: assetKeys.detail(variables.asset_id),
      });
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.dashboard() });
    },
  });
}

/**
 * Checkin asset
 */
export function useCheckinAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assignmentId,
      data: formData,
    }: {
      assignmentId: string;
      assetId: string;
      data: { condition_at_checkin?: string; notes?: string };
    }): Promise<AssetAssignment> => {
      const { data } = await apiClient.post(
        `/assets/checkin/${assignmentId}`,
        formData,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assetKeys.assignments(variables.assetId),
      });
      queryClient.invalidateQueries({
        queryKey: assetKeys.detail(variables.assetId),
      });
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.dashboard() });
    },
  });
}
