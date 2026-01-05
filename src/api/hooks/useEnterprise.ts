/**
 * Enterprise API Hooks
 * Multi-region, franchise, permissions management
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  regionSchema,
  regionPerformanceSchema,
  franchiseRoyaltySchema,
  territorySchema,
  roleSchema,
  userRoleAssignmentSchema,
  auditLogSchema,
  complianceReportSchema,
} from '@/api/types/enterprise';
import type {
  Region,
  RegionPerformance,
  FranchiseRoyalty,
  Territory,
  Role,
  UserRoleAssignment,
  AuditLog,
  ComplianceReport,
  MultiRegionFilters,
  RegionComparison,
} from '@/api/types/enterprise';
import { z } from 'zod';

// Query keys
export const enterpriseKeys = {
  regions: {
    all: ['enterprise', 'regions'] as const,
    list: () => [...enterpriseKeys.regions.all, 'list'] as const,
    detail: (id: string) => [...enterpriseKeys.regions.all, 'detail', id] as const,
    performance: (filters?: MultiRegionFilters) =>
      [...enterpriseKeys.regions.all, 'performance', filters] as const,
    comparison: (metric: string) =>
      [...enterpriseKeys.regions.all, 'comparison', metric] as const,
  },
  franchise: {
    all: ['enterprise', 'franchise'] as const,
    royalties: (franchiseId?: string) =>
      [...enterpriseKeys.franchise.all, 'royalties', franchiseId] as const,
    territories: (regionId?: string) =>
      [...enterpriseKeys.franchise.all, 'territories', regionId] as const,
  },
  permissions: {
    all: ['enterprise', 'permissions'] as const,
    roles: () => [...enterpriseKeys.permissions.all, 'roles'] as const,
    role: (id: string) => [...enterpriseKeys.permissions.all, 'role', id] as const,
    userAssignments: (userId?: string) =>
      [...enterpriseKeys.permissions.all, 'assignments', userId] as const,
    currentPermissions: () => [...enterpriseKeys.permissions.all, 'current'] as const,
  },
  audit: {
    all: ['enterprise', 'audit'] as const,
    logs: (filters?: Record<string, unknown>) =>
      [...enterpriseKeys.audit.all, 'logs', filters] as const,
    compliance: (regionId?: string) =>
      [...enterpriseKeys.audit.all, 'compliance', regionId] as const,
  },
};

// ============================================
// Region Management Hooks
// ============================================

/**
 * Get all regions
 */
export function useRegions() {
  return useQuery({
    queryKey: enterpriseKeys.regions.list(),
    queryFn: async (): Promise<Region[]> => {
      const { data } = await apiClient.get('/enterprise/regions');
      return z.array(regionSchema).parse(data.regions || data);
    },
  });
}

/**
 * Get single region
 */
export function useRegion(id: string) {
  return useQuery({
    queryKey: enterpriseKeys.regions.detail(id),
    queryFn: async (): Promise<Region> => {
      const { data } = await apiClient.get(`/enterprise/regions/${id}`);
      return regionSchema.parse(data.region || data);
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
    mutationFn: async (
      region: Omit<Region, 'id' | 'created_at' | 'updated_at'>
    ): Promise<Region> => {
      const { data } = await apiClient.post('/enterprise/regions', region);
      return regionSchema.parse(data.region || data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enterpriseKeys.regions.all });
    },
  });
}

/**
 * Update region
 */
export function useUpdateRegion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Region>;
    }): Promise<Region> => {
      const { data } = await apiClient.patch(`/enterprise/regions/${id}`, updates);
      return regionSchema.parse(data.region || data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(enterpriseKeys.regions.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: enterpriseKeys.regions.list() });
    },
  });
}

/**
 * Get region performance metrics
 */
export function useRegionPerformance(filters?: MultiRegionFilters) {
  return useQuery({
    queryKey: enterpriseKeys.regions.performance(filters),
    queryFn: async (): Promise<RegionPerformance[]> => {
      const { data } = await apiClient.get('/enterprise/regions/performance', {
        params: filters,
      });
      return z.array(regionPerformanceSchema).parse(data.performance || data);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get cross-region comparison for a metric
 */
export function useRegionComparison(metric: string) {
  return useQuery({
    queryKey: enterpriseKeys.regions.comparison(metric),
    queryFn: async (): Promise<RegionComparison> => {
      const { data } = await apiClient.get('/enterprise/regions/compare', {
        params: { metric },
      });
      return data;
    },
    enabled: !!metric,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// Franchise Management Hooks
// ============================================

/**
 * Get franchise royalty reports
 */
export function useFranchiseRoyalties(franchiseId?: string) {
  return useQuery({
    queryKey: enterpriseKeys.franchise.royalties(franchiseId),
    queryFn: async (): Promise<FranchiseRoyalty[]> => {
      const params = franchiseId ? { franchise_id: franchiseId } : {};
      const { data } = await apiClient.get('/enterprise/franchise/royalties', { params });
      return z.array(franchiseRoyaltySchema).parse(data.royalties || data);
    },
  });
}

/**
 * Generate royalty invoice
 */
export function useGenerateRoyaltyInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      franchise_id: string;
      period_start: string;
      period_end: string;
    }): Promise<FranchiseRoyalty> => {
      const { data } = await apiClient.post('/enterprise/franchise/royalties/generate', params);
      return franchiseRoyaltySchema.parse(data.royalty || data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enterpriseKeys.franchise.royalties() });
    },
  });
}

/**
 * Mark royalty as paid
 */
export function useMarkRoyaltyPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      royalty_id: string;
      paid_date: string;
      reference?: string;
    }): Promise<FranchiseRoyalty> => {
      const { data } = await apiClient.post(
        `/enterprise/franchise/royalties/${params.royalty_id}/paid`,
        params
      );
      return franchiseRoyaltySchema.parse(data.royalty || data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enterpriseKeys.franchise.royalties() });
    },
  });
}

/**
 * Get territories
 */
export function useTerritories(regionId?: string) {
  return useQuery({
    queryKey: enterpriseKeys.franchise.territories(regionId),
    queryFn: async (): Promise<Territory[]> => {
      const params = regionId ? { region_id: regionId } : {};
      const { data } = await apiClient.get('/enterprise/territories', { params });
      return z.array(territorySchema).parse(data.territories || data);
    },
  });
}

/**
 * Create territory
 */
export function useCreateTerritory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      territory: Omit<Territory, 'id' | 'created_at'>
    ): Promise<Territory> => {
      const { data } = await apiClient.post('/enterprise/territories', territory);
      return territorySchema.parse(data.territory || data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enterpriseKeys.franchise.territories() });
    },
  });
}

/**
 * Update territory
 */
export function useUpdateTerritory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Territory>;
    }): Promise<Territory> => {
      const { data } = await apiClient.patch(`/enterprise/territories/${id}`, updates);
      return territorySchema.parse(data.territory || data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enterpriseKeys.franchise.territories() });
    },
  });
}

// ============================================
// Permissions Management Hooks
// ============================================

/**
 * Get all roles
 */
export function useRoles() {
  return useQuery({
    queryKey: enterpriseKeys.permissions.roles(),
    queryFn: async (): Promise<Role[]> => {
      const { data } = await apiClient.get('/enterprise/roles');
      return z.array(roleSchema).parse(data.roles || data);
    },
  });
}

/**
 * Get single role
 */
export function useRole(id: string) {
  return useQuery({
    queryKey: enterpriseKeys.permissions.role(id),
    queryFn: async (): Promise<Role> => {
      const { data } = await apiClient.get(`/enterprise/roles/${id}`);
      return roleSchema.parse(data.role || data);
    },
    enabled: !!id,
  });
}

/**
 * Create role
 */
export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      role: Omit<Role, 'id' | 'is_system_role' | 'user_count' | 'created_at' | 'updated_at'>
    ): Promise<Role> => {
      const { data } = await apiClient.post('/enterprise/roles', role);
      return roleSchema.parse(data.role || data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enterpriseKeys.permissions.roles() });
    },
  });
}

/**
 * Update role
 */
export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Role>;
    }): Promise<Role> => {
      const { data } = await apiClient.patch(`/enterprise/roles/${id}`, updates);
      return roleSchema.parse(data.role || data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(enterpriseKeys.permissions.role(data.id), data);
      queryClient.invalidateQueries({ queryKey: enterpriseKeys.permissions.roles() });
    },
  });
}

/**
 * Delete role
 */
export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/enterprise/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enterpriseKeys.permissions.roles() });
    },
  });
}

/**
 * Get user role assignments
 */
export function useUserRoleAssignments(userId?: string) {
  return useQuery({
    queryKey: enterpriseKeys.permissions.userAssignments(userId),
    queryFn: async (): Promise<UserRoleAssignment[]> => {
      const params = userId ? { user_id: userId } : {};
      const { data } = await apiClient.get('/enterprise/role-assignments', { params });
      return z.array(userRoleAssignmentSchema).parse(data.assignments || data);
    },
  });
}

/**
 * Assign role to user
 */
export function useAssignRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      user_id: string;
      role_id: string;
      region_id?: string;
      expires_at?: string;
    }): Promise<UserRoleAssignment> => {
      const { data } = await apiClient.post('/enterprise/role-assignments', params);
      return userRoleAssignmentSchema.parse(data.assignment || data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enterpriseKeys.permissions.userAssignments() });
    },
  });
}

/**
 * Remove role from user
 */
export function useRemoveRoleAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string): Promise<void> => {
      await apiClient.delete(`/enterprise/role-assignments/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enterpriseKeys.permissions.userAssignments() });
    },
  });
}

/**
 * Get current user's effective permissions
 */
export function useCurrentPermissions() {
  return useQuery({
    queryKey: enterpriseKeys.permissions.currentPermissions(),
    queryFn: async (): Promise<{
      roles: string[];
      permissions: {
        resource: string;
        actions: string[];
        scope: string;
      }[];
      regions: string[]; // Region IDs user has access to
    }> => {
      const { data } = await apiClient.get('/enterprise/permissions/me');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// Audit & Compliance Hooks
// ============================================

/**
 * Get audit logs
 */
export function useAuditLogs(filters?: {
  user_id?: string;
  resource_type?: string;
  action?: string;
  region_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: enterpriseKeys.audit.logs(filters),
    queryFn: async (): Promise<{
      logs: AuditLog[];
      total: number;
      page: number;
      page_size: number;
    }> => {
      const { data } = await apiClient.get('/enterprise/audit/logs', { params: filters });
      return {
        logs: z.array(auditLogSchema).parse(data.logs || []),
        total: data.total || 0,
        page: data.page || 1,
        page_size: data.page_size || 50,
      };
    },
  });
}

/**
 * Export audit logs
 */
export function useExportAuditLogs() {
  return useMutation({
    mutationFn: async (filters: {
      start_date: string;
      end_date: string;
      format: 'csv' | 'json';
      region_id?: string;
    }): Promise<{ download_url: string }> => {
      const { data } = await apiClient.post('/enterprise/audit/export', filters);
      return data;
    },
  });
}

/**
 * Get compliance report
 */
export function useComplianceReport(regionId?: string) {
  return useQuery({
    queryKey: enterpriseKeys.audit.compliance(regionId),
    queryFn: async (): Promise<ComplianceReport> => {
      const params = regionId ? { region_id: regionId } : {};
      const { data } = await apiClient.get('/enterprise/compliance/report', { params });
      return complianceReportSchema.parse(data);
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}
