import { useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, clearAuthToken, hasAuthToken } from "@/api/client.ts";
import { setUser as setSentryUser } from "@/lib/sentry";
import {
  markSessionValidated,
  markSessionInvalid,
  clearSessionState,
  clearSessionToken,
  onSecurityEvent,
  dispatchSecurityEvent,
} from "@/lib/security";

/**
 * User type from /api/auth/me
 * Matches backend routes/authentication.py get_current_user response
 */
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "admin" | "manager" | "technician" | "sales" | "user";
  permissions?: Record<string, Record<string, boolean>>;
  technician_id?: string;
}

/**
 * Auth response wrapper
 */
interface AuthResponse {
  user: User;
}

/**
 * Auth hook - validates session via /api/auth/me
 *
 * SECURITY ARCHITECTURE:
 * - Uses HTTP-only cookie for authentication (XSS-safe)
 * - Session state stored in sessionStorage (not the token itself)
 * - Validates session on mount and periodically
 * - Handles session expiry and CSRF errors gracefully
 */
export function useAuth() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async (): Promise<AuthResponse> => {
      const { data } = await apiClient.get("/auth/me");

      // SECURITY: Mark session as validated on successful auth check
      if (data?.user) {
        markSessionValidated(data.user.id);
      }

      return data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Check auth if we have a session or legacy token
    enabled: hasAuthToken(),
  });

  const user = data?.user;

  // Set user context in Sentry for error tracking
  useEffect(() => {
    if (user) {
      setSentryUser({
        id: user.id,
        email: user.email,
        username: `${user.first_name} ${user.last_name}`,
        role: user.role,
      });
    } else {
      setSentryUser(null);
    }
  }, [user]);

  // Listen for security events
  useEffect(() => {
    const unsubscribeExpired = onSecurityEvent("session:expired", () => {
      queryClient.setQueryData(["auth", "me"], null);
    });

    const unsubscribeInvalid = onSecurityEvent("session:invalid", () => {
      queryClient.setQueryData(["auth", "me"], null);
    });

    return () => {
      unsubscribeExpired();
      unsubscribeInvalid();
    };
  }, [queryClient]);

  /**
   * Logout - clears session and redirects to login
   */
  const logout = useCallback(async () => {
    try {
      // Call backend logout to clear HTTP-only cookie
      await apiClient.post("/auth/logout");
    } catch {
      // Ignore logout errors - proceed with client cleanup
    }

    // SECURITY: Clear all client-side auth state
    setSentryUser(null);
    markSessionInvalid();
    clearSessionState();
    clearSessionToken(); // Explicitly clear Bearer token on logout
    clearAuthToken();

    // Clear all cached data
    queryClient.clear();

    // Dispatch logout event for listeners
    dispatchSecurityEvent("auth:logout");

    // Navigate to login page
    window.location.href = "/login";
  }, [queryClient]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    isAdmin: user?.role === "admin",
    isManager: user?.role === "manager",
    isTechnician: user?.role === "technician",
    isSales: user?.role === "sales",
    // Helper to get full name
    fullName: user ? `${user.first_name} ${user.last_name}` : undefined,
    logout,
    refetch,
  };
}
