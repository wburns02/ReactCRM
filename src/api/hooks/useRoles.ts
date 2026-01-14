/**
 * Role Switching API Hooks
 *
 * Provides React Query hooks for the demo mode role switching feature.
 * Only active for the demo user (will@macseptic.com).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, withAuthFallback } from "../client";

// ============================================
// Types
// ============================================

export type RoleKey =
  | "admin"
  | "executive"
  | "manager"
  | "technician"
  | "phone_agent"
  | "dispatcher"
  | "billing";

export interface RoleView {
  id: number;
  role_key: RoleKey;
  display_name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  visible_modules: string[];
  default_route: string;
  dashboard_widgets: string[];
  quick_actions: string[];
  features: Record<string, boolean>;
  is_active: boolean;
  sort_order: number;
}

export interface RoleListResponse {
  roles: RoleView[];
  current_role: RoleKey | null;
  is_demo_user: boolean;
}

export interface RoleSwitchResponse {
  success: boolean;
  message: string;
  current_role: RoleView;
  switched_at: string;
}

export interface CurrentRoleResponse {
  role: RoleView;
  is_demo_user: boolean;
  user_email: string;
  switched_at: string | null;
}

export interface DemoModeStatusResponse {
  is_demo_mode: boolean;
  demo_user_email: string | null;
  available_roles: string[] | null;
  current_role: string | null;
}

// ============================================
// Query Keys
// ============================================

export const roleKeys = {
  all: ["roles"] as const,
  list: () => [...roleKeys.all, "list"] as const,
  current: () => [...roleKeys.all, "current"] as const,
  status: () => [...roleKeys.all, "status"] as const,
};

// ============================================
// API Functions
// ============================================

async function fetchRoles(): Promise<RoleListResponse> {
  const response = await apiClient.get<RoleListResponse>("/roles");
  return response.data;
}

async function fetchCurrentRole(): Promise<CurrentRoleResponse> {
  const response = await apiClient.get<CurrentRoleResponse>("/roles/current");
  return response.data;
}

async function fetchDemoStatus(): Promise<DemoModeStatusResponse> {
  const response = await apiClient.get<DemoModeStatusResponse>("/roles/status");
  return response.data;
}

async function switchRole(roleKey: RoleKey): Promise<RoleSwitchResponse> {
  const response = await apiClient.post<RoleSwitchResponse>("/roles/switch", {
    role_key: roleKey,
  });
  return response.data;
}

// ============================================
// Hooks
// ============================================

/**
 * Hook to check if current user is in demo mode
 * Uses withAuthFallback to handle 401/404 gracefully (returns default for non-auth users)
 */
export function useDemoStatus() {
  return useQuery({
    queryKey: roleKeys.status(),
    queryFn: () =>
      withAuthFallback(fetchDemoStatus, {
        is_demo_mode: false,
        demo_user_email: null,
        available_roles: null,
        current_role: null,
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

/**
 * Hook to fetch available roles
 * Only returns roles for demo users
 * Uses withAuthFallback to handle 401/404 gracefully (returns default for non-auth users)
 */
export function useRoles() {
  return useQuery({
    queryKey: roleKeys.list(),
    queryFn: () =>
      withAuthFallback(fetchRoles, {
        roles: [],
        current_role: null,
        is_demo_user: false,
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

/**
 * Hook to fetch current role details
 */
export function useCurrentRole() {
  return useQuery({
    queryKey: roleKeys.current(),
    queryFn: fetchCurrentRole,
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: false,
    // Only enabled if we know user is in demo mode
    enabled: false, // Will be enabled by the context
  });
}

/**
 * Hook to switch roles
 */
export function useSwitchRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: switchRole,
    onSuccess: (data) => {
      // Update the roles list with new current role
      queryClient.setQueryData<RoleListResponse>(roleKeys.list(), (old) => {
        if (!old) return old;
        return {
          ...old,
          current_role: data.current_role.role_key,
        };
      });

      // Invalidate current role query
      queryClient.invalidateQueries({ queryKey: roleKeys.current() });

      // Invalidate status
      queryClient.invalidateQueries({ queryKey: roleKeys.status() });
    },
  });
}
