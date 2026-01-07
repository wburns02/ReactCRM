/**
 * Role Provider
 *
 * Provides role context for the demo mode role switching feature.
 * Only active for the demo user (will@macseptic.com).
 */

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  useRoles,
  useSwitchRole,
  type RoleKey,
  type RoleView,
} from '@/api/hooks/useRoles';

// ============================================
// Types
// ============================================

export interface RoleContextValue {
  /** Whether the current user is a demo user */
  isDemoUser: boolean;
  /** Whether roles are loading */
  isLoading: boolean;
  /** Current active role */
  currentRole: RoleView | null;
  /** Current role key */
  currentRoleKey: RoleKey | null;
  /** All available roles */
  availableRoles: RoleView[];
  /** Switch to a different role */
  switchRole: (roleKey: RoleKey) => void;
  /** Whether a role switch is in progress */
  isSwitching: boolean;
  /** Get visible modules for current role */
  visibleModules: string[];
  /** Get quick actions for current role */
  quickActions: string[];
  /** Get dashboard widgets for current role */
  dashboardWidgets: string[];
  /** Check if a feature is enabled for current role */
  hasFeature: (feature: string) => boolean;
  /** Get default route for current role */
  defaultRoute: string;
}

// ============================================
// Context
// ============================================

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

// ============================================
// Hook
// ============================================

/**
 * Hook to access role context
 */
export function useRole(): RoleContextValue {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}

/**
 * Optional hook that returns null if not within provider
 */
export function useOptionalRole(): RoleContextValue | null {
  return useContext(RoleContext) ?? null;
}

// ============================================
// Provider
// ============================================

interface RoleProviderProps {
  children: ReactNode;
}

/**
 * Role Provider
 *
 * Provides role context for the demo mode role switching feature.
 * Wraps React Query hooks and provides a unified interface.
 */
export function RoleProvider({ children }: RoleProviderProps) {
  // Fetch roles (includes demo user check)
  const { data: roleData, isLoading } = useRoles();

  // Switch role mutation
  const switchRoleMutation = useSwitchRole();

  // Derived values
  const isDemoUser = roleData?.is_demo_user ?? false;
  const availableRoles = roleData?.roles ?? [];
  const currentRoleKey = roleData?.current_role ?? null;

  // Find current role object
  const currentRole = useMemo(() => {
    if (!currentRoleKey || !availableRoles.length) return null;
    return availableRoles.find((r) => r.role_key === currentRoleKey) ?? null;
  }, [currentRoleKey, availableRoles]);

  // Switch role handler
  const switchRole = useCallback(
    (roleKey: RoleKey) => {
      if (!isDemoUser) {
        console.warn('Role switching is only available for demo users');
        return;
      }
      switchRoleMutation.mutate(roleKey);
    },
    [isDemoUser, switchRoleMutation]
  );

  // Role-based access helpers
  const visibleModules = useMemo(() => {
    return currentRole?.visible_modules ?? ['*'];
  }, [currentRole]);

  const quickActions = useMemo(() => {
    return currentRole?.quick_actions ?? [];
  }, [currentRole]);

  const dashboardWidgets = useMemo(() => {
    return currentRole?.dashboard_widgets ?? [];
  }, [currentRole]);

  const hasFeature = useCallback(
    (feature: string): boolean => {
      if (!currentRole?.features) return true; // Default to allowed if no features defined
      return currentRole.features[feature] ?? false;
    },
    [currentRole]
  );

  const defaultRoute = currentRole?.default_route ?? '/';

  // Context value
  const contextValue: RoleContextValue = {
    isDemoUser,
    isLoading,
    currentRole,
    currentRoleKey,
    availableRoles,
    switchRole,
    isSwitching: switchRoleMutation.isPending,
    visibleModules,
    quickActions,
    dashboardWidgets,
    hasFeature,
    defaultRoute,
  };

  return (
    <RoleContext.Provider value={contextValue}>{children}</RoleContext.Provider>
  );
}

// ============================================
// Exports
// ============================================

export { RoleContext };
export type { RoleKey, RoleView };
