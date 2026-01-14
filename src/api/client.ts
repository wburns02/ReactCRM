import axios, { type AxiosError, type AxiosInstance } from "axios";
import { addBreadcrumb, captureException } from "@/lib/sentry";
import {
  getSecurityHeaders,
  clearSessionState,
  markSessionInvalid,
  dispatchSecurityEvent,
  hasLegacyToken,
  getLegacyToken,
  cleanupLegacyAuth,
} from "@/lib/security";

/**
 * API client configured for FastAPI backend with secure cookie auth
 * Standalone deployment - API is on separate domain (Railway)
 *
 * SECURITY ARCHITECTURE:
 * - Primary: HTTP-only, Secure, SameSite=Strict cookies (XSS-safe)
 * - CSRF tokens sent in header for state-changing requests
 * - Legacy Bearer token support for migration (will be removed)
 *
 * Backend: https://react-crm-api-production.up.railway.app/api/v2
 * Repository: wburns02/react-crm-api
 */

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://react-crm-api-production.up.railway.app/api/v2";

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // SECURITY: Enable credentials for HTTP-only cookie auth
  // This sends the session cookie automatically with every request
  withCredentials: true,
});

/**
 * Request interceptor
 * - Adds CSRF token for state-changing requests
 * - Adds legacy Bearer token (migration period only)
 * - Tracks requests for debugging
 */
apiClient.interceptors.request.use(
  (config) => {
    const method = config.method?.toUpperCase() || "GET";

    // SECURITY: Add CSRF token and other security headers
    const securityHeaders = getSecurityHeaders(method);
    Object.assign(config.headers, securityHeaders);

    // MIGRATION: Add Bearer token from localStorage if exists
    // This will be removed after full migration to cookie auth
    // TODO: Remove this block after migration is complete
    if (hasLegacyToken()) {
      const token = getLegacyToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Add breadcrumb for API request tracking
    addBreadcrumb(
      `API ${method} ${config.url}`,
      "http",
      { method, url: config.url },
      "info",
    );

    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * Response interceptor
 * - Handles authentication errors (401)
 * - Handles CSRF errors (403 with CSRF message)
 * - Tracks responses for debugging
 * - Reports server errors to Sentry
 */
apiClient.interceptors.response.use(
  (response) => {
    // Track successful responses for debugging context
    addBreadcrumb(
      `API ${response.status} ${response.config.url}`,
      "http",
      { status: response.status, url: response.config.url },
      "info",
    );
    return response;
  },
  (error: AxiosError) => {
    // Track failed responses
    const status = error.response?.status;
    const url = error.config?.url;

    addBreadcrumb(
      `API Error ${status || "network"} ${url}`,
      "http",
      {
        status,
        url,
        message: error.message,
      },
      "error",
    );

    // Capture 5xx errors to Sentry (server errors)
    if (status && status >= 500) {
      captureException(error, {
        url,
        status,
        response: error.response?.data,
      });
    }

    // Handle authentication errors
    if (status === 401) {
      // Skip auth handling for optional endpoints that should fail silently
      // These endpoints are non-critical features that work without auth
      const optionalEndpoints = ["/roles"];
      const isOptionalEndpoint = optionalEndpoints.some((endpoint) =>
        url?.includes(endpoint),
      );

      if (!isOptionalEndpoint) {
        // SECURITY: Clear all auth state
        markSessionInvalid();
        clearSessionState();
        cleanupLegacyAuth();

        // Dispatch security event for listeners
        dispatchSecurityEvent("session:expired");

        // Don't redirect to login if already on login page (prevents infinite loop)
        const currentPath = window.location.pathname;
        if (!currentPath.includes("/login")) {
          // Redirect to login with return URL
          const returnUrl = encodeURIComponent(
            currentPath + window.location.search,
          );
          window.location.href = `/login?return=${returnUrl}`;
        }
      }
    }

    // Handle CSRF errors
    if (status === 403) {
      const responseData = error.response?.data as
        | Record<string, unknown>
        | undefined;
      const errorMessage = responseData?.error || responseData?.detail || "";
      if (
        typeof errorMessage === "string" &&
        errorMessage.toLowerCase().includes("csrf")
      ) {
        dispatchSecurityEvent("csrf:missing");
        // Refresh the page to get a new CSRF token
        window.location.reload();
      }
    }

    return Promise.reject(error);
  },
);

// ============================================
// Auth Token Functions (Migration Period)
// ============================================

/**
 * Store JWT token after login
 * @deprecated Will be removed after cookie auth migration
 * The backend should set HTTP-only cookies directly
 */
export function setAuthToken(token: string): void {
  // MIGRATION: Store in localStorage for backwards compatibility
  // This will be removed once backend sets HTTP-only cookies
  localStorage.setItem("auth_token", token);
}

/**
 * Clear JWT token on logout
 * @deprecated Will be removed after cookie auth migration
 */
export function clearAuthToken(): void {
  cleanupLegacyAuth();
  clearSessionState();
}

/**
 * Check if user has a stored token or active session
 * Uses session state first (faster), falls back to legacy token check
 */
export function hasAuthToken(): boolean {
  // Check session state first
  const sessionState = sessionStorage.getItem("session_state");
  if (sessionState) {
    try {
      const state = JSON.parse(sessionState);
      if (state.isAuthenticated) {
        return true;
      }
    } catch {
      // Ignore parse errors
    }
  }

  // MIGRATION: Fall back to legacy token check
  return hasLegacyToken();
}

/**
 * Get session state for UI display
 */
export { getSessionState } from "@/lib/security";

/**
 * Type-safe API error
 */
export interface ApiErrorResponse {
  error: string;
  detail?: string;
  hint?: string;
}

/**
 * Check if error is an API error with our expected shape
 */
export function isApiError(
  error: unknown,
): error is AxiosError<ApiErrorResponse> {
  return axios.isAxiosError(error) && error.response?.data?.error !== undefined;
}

/**
 * Extract error message from API error or unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.response?.data.error || "An error occurred";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

/**
 * Check if error is a 404 Not Found
 * Used to gracefully handle endpoints that don't exist yet
 */
export function is404Error(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return error.response?.status === 404;
  }
  return false;
}

/**
 * Check if error is a 500 Internal Server Error
 * Used to gracefully handle endpoints that are broken or have DB issues
 */
export function is500Error(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return error.response?.status === 500;
  }
  return false;
}

/**
 * Wrapper for API calls that gracefully handles 404/500 by returning a default value.
 * Use this for endpoints that may not be implemented yet or may have backend issues.
 *
 * @param apiFn - The async API function to call
 * @param defaultValue - The value to return if the endpoint returns 404 or 500
 * @returns The API response or default value on 404/500
 */
export async function withFallback<T>(
  apiFn: () => Promise<T>,
  defaultValue: T,
): Promise<T> {
  try {
    return await apiFn();
  } catch (error) {
    if (is404Error(error) || is500Error(error)) {
      return defaultValue;
    }
    throw error;
  }
}

/**
 * Check if error is a 401 Unauthorized
 */
export function is401Error(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return error.response?.status === 401;
  }
  return false;
}

/**
 * Wrapper for API calls that gracefully handles 401/404 by returning a default value.
 * Use this for optional features that should fail silently when user is not authenticated
 * or endpoint doesn't exist (e.g., role switching, demo mode features).
 *
 * NOTE: The 401 interceptor in client.ts may still redirect to login before this catches.
 * This wrapper catches errors that propagate after the interceptor runs.
 *
 * @param apiFn - The async API function to call
 * @param defaultValue - The value to return if the endpoint returns 401 or 404
 * @returns The API response or default value on 401/404
 */
export async function withAuthFallback<T>(
  apiFn: () => Promise<T>,
  defaultValue: T,
): Promise<T> {
  try {
    return await apiFn();
  } catch (error) {
    if (is404Error(error) || is401Error(error)) {
      return defaultValue;
    }
    throw error;
  }
}
