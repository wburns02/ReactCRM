import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/**
 * Multi-Region/Franchise Types
 */
export interface Region {
  id: string;
  name: string;
  code: string; // e.g., "TX-DAL", "SC-CHS"
  type: 'company_owned' | 'franchise' | 'partner';
  status: 'active' | 'inactive' | 'pending';
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  settings: RegionSettings;
  franchise_info?: FranchiseInfo;
  created_at: string;
  updated_at: string;
}

export interface RegionSettings {
  timezone: string;
  currency: string;
  tax_rate: number;
  default_service_types: string[];
  operating_hours: {
    start: string;
    end: string;
    days: number[]; // 0-6 for Sun-Sat
  };
  service_area: {
    zip_codes?: string[];
    radius_miles?: number;
    center_lat?: number;
    center_lng?: number;
  };
  branding?: {
    logo_url?: string;
    primary_color?: string;
    company_name?: string;
  };
}

export interface FranchiseInfo {
  owner_name: string;
  owner_email: string;
  agreement_start: string;
  agreement_end: string;
  royalty_percentage: number;
  territory_exclusive: boolean;
  territory_description: string;
}

export interface RegionUser {
  id: number;
  user_id: number;
  region_id: string;
  role: 'admin' | 'manager' | 'technician' | 'dispatcher' | 'viewer';
  is_primary_region: boolean;
  permissions: string[];
  created_at: string;
}

export interface RegionStats {
  region_id: string;
  region_name: string;
  customers: number;
  active_work_orders: number;
  revenue_mtd: number;
  revenue_ytd: number;
  technicians: number;
  avg_rating: number;
}

export interface CrossRegionTransfer {
  id: string;
  from_region_id: string;
  to_region_id: string;
  entity_type: 'customer' | 'work_order' | 'technician';
  entity_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reason?: string;
  requested_by: number;
  requested_at: string;
  approved_by?: number;
  approved_at?: string;
}

/**
 * Query keys for Multi-Region
 */
export const regionKeys = {
  all: ['regions'] as const,
  list: () => [...regionKeys.all, 'list'] as const,
  detail: (id: string) => [...regionKeys.all, 'detail', id] as const,
  users: (regionId: string) => [...regionKeys.all, 'users', regionId] as const,
  stats: () => [...regionKeys.all, 'stats'] as const,
  regionStats: (id: string) => [...regionKeys.all, 'stats', id] as const,
  transfers: () => [...regionKeys.all, 'transfers'] as const,
  currentRegion: () => [...regionKeys.all, 'current'] as const,
};

/**
 * Get current user's active region
 */
export function useCurrentRegion() {
  return useQuery({
    queryKey: regionKeys.currentRegion(),
    queryFn: async (): Promise<Region> => {
      const { data } = await apiClient.get('/regions/current');
      return data;
    },
  });
}

/**
 * Get all regions
 */
export function useRegions() {
  return useQuery({
    queryKey: regionKeys.list(),
    queryFn: async (): Promise<Region[]> => {
      const { data } = await apiClient.get('/regions/');
      return data.regions || [];
    },
  });
}

/**
 * Get single region
 */
export function useRegion(id: string) {
  return useQuery({
    queryKey: regionKeys.detail(id),
    queryFn: async (): Promise<Region> => {
      const { data } = await apiClient.get(`/regions/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Create region
 */
export function useCreateRegion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (region: Omit<Region, 'id' | 'created_at' | 'updated_at'>): Promise<Region> => {
      const { data } = await apiClient.post('/regions/', region);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: regionKeys.list() });
    },
  });
}

/**
 * Update region
 */
export function useUpdateRegion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...region }: Partial<Region> & { id: string }): Promise<Region> => {
      const { data } = await apiClient.put(`/regions/${id}`, region);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: regionKeys.list() });
      queryClient.invalidateQueries({ queryKey: regionKeys.detail(variables.id) });
    },
  });
}

/**
 * Delete region
 */
export function useDeleteRegion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/regions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: regionKeys.list() });
    },
  });
}

/**
 * Switch active region
 */
export function useSwitchRegion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (regionId: string): Promise<{ success: boolean }> => {
      const { data } = await apiClient.post(`/regions/${regionId}/switch`);
      return data;
    },
    onSuccess: () => {
      // Invalidate all queries since data is region-scoped
      queryClient.invalidateQueries();
    },
  });
}

/**
 * Get users in a region
 */
export function useRegionUsers(regionId: string) {
  return useQuery({
    queryKey: regionKeys.users(regionId),
    queryFn: async (): Promise<RegionUser[]> => {
      const { data } = await apiClient.get(`/regions/${regionId}/users`);
      return data.users || [];
    },
    enabled: !!regionId,
  });
}

/**
 * Add user to region
 */
export function useAddUserToRegion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      region_id: string;
      user_id: number;
      role: RegionUser['role'];
      is_primary_region?: boolean;
    }): Promise<RegionUser> => {
      const { data } = await apiClient.post(`/regions/${params.region_id}/users`, params);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: regionKeys.users(variables.region_id) });
    },
  });
}

/**
 * Remove user from region
 */
export function useRemoveUserFromRegion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      region_id: string;
      user_id: number;
    }): Promise<void> => {
      await apiClient.delete(`/regions/${params.region_id}/users/${params.user_id}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: regionKeys.users(variables.region_id) });
    },
  });
}

/**
 * Update user role in region
 */
export function useUpdateRegionUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      region_id: string;
      user_id: number;
      role: RegionUser['role'];
    }): Promise<RegionUser> => {
      const { data } = await apiClient.put(
        `/regions/${params.region_id}/users/${params.user_id}`,
        { role: params.role }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: regionKeys.users(variables.region_id) });
    },
  });
}

/**
 * Get stats for all regions
 */
export function useAllRegionStats() {
  return useQuery({
    queryKey: regionKeys.stats(),
    queryFn: async (): Promise<RegionStats[]> => {
      const { data } = await apiClient.get('/regions/stats');
      return data.stats || [];
    },
  });
}

/**
 * Get stats for single region
 */
export function useRegionStats(regionId: string) {
  return useQuery({
    queryKey: regionKeys.regionStats(regionId),
    queryFn: async (): Promise<RegionStats> => {
      const { data } = await apiClient.get(`/regions/${regionId}/stats`);
      return data;
    },
    enabled: !!regionId,
  });
}

/**
 * Get pending transfers
 */
export function useCrossRegionTransfers(status?: CrossRegionTransfer['status']) {
  return useQuery({
    queryKey: regionKeys.transfers(),
    queryFn: async (): Promise<CrossRegionTransfer[]> => {
      const params = status ? `?status=${status}` : '';
      const { data } = await apiClient.get(`/regions/transfers${params}`);
      return data.transfers || [];
    },
  });
}

/**
 * Request cross-region transfer
 */
export function useRequestCrossRegionTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      from_region_id: string;
      to_region_id: string;
      entity_type: CrossRegionTransfer['entity_type'];
      entity_id: string;
      reason?: string;
    }): Promise<CrossRegionTransfer> => {
      const { data } = await apiClient.post('/regions/transfers', params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: regionKeys.transfers() });
    },
  });
}

/**
 * Approve cross-region transfer
 */
export function useApproveCrossRegionTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transferId: string): Promise<CrossRegionTransfer> => {
      const { data } = await apiClient.post(`/regions/transfers/${transferId}/approve`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: regionKeys.transfers() });
    },
  });
}

/**
 * Reject cross-region transfer
 */
export function useRejectCrossRegionTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      transfer_id: string;
      reason: string;
    }): Promise<CrossRegionTransfer> => {
      const { data } = await apiClient.post(`/regions/transfers/${params.transfer_id}/reject`, {
        reason: params.reason,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: regionKeys.transfers() });
    },
  });
}

/**
 * Get regions the current user has access to
 */
export function useUserRegions() {
  return useQuery({
    queryKey: [...regionKeys.all, 'user-regions'],
    queryFn: async (): Promise<{
      region: Region;
      role: RegionUser['role'];
      is_primary: boolean;
    }[]> => {
      const { data } = await apiClient.get('/regions/user-regions');
      return data.regions || [];
    },
  });
}
