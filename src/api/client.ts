import axios, { type AxiosError, type AxiosInstance } from "axios";
import { addBreadcrumb, captureException } from "@/lib/sentry";
import {
  getSecurityHeaders,
  getSessionToken,
  clearSessionState,
  markSessionInvalid,
  dispatchSecurityEvent,
  cleanupLegacyAuth,
} from "@/lib/security";
import {
  parseError,
  ErrorCodes,
  type ProblemDetail,
} from "./errorHandler";

/**
 * API client configured for FastAPI backend with secure cookie auth
 * Standalone deployment - API is on separate domain (Railway)
 *
 * SECURITY ARCHITECTURE:
 * - Primary: HTTP-only, Secure, SameSite=Strict cookies (XSS-safe)
 * - CSRF tokens sent in header for state-changing requests
 * - Cookie-based auth only (legacy Bearer token removed)
 *
 * OBSERVABILITY:
 * - X-Correlation-ID: Session-level ID for tracing user journeys
 * - X-Request-ID: Per-request ID for individual request tracing
 *
 * Backend: https://react-crm-api-production.up.railway.app/api/v2
 * Repository: wburns02/react-crm-api
 */

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://react-crm-api-production.up.railway.app/api/v2";

/**
 * Generate a session-level correlation ID for tracing user journeys.
 * This persists for the browser session and links all requests from one user.
 */
const SESSION_CORRELATION_ID = crypto.randomUUID();

/**
 * Generate a unique request ID for each API call.
 */
function generateRequestId(): string {
  return crypto.randomUUID();
}

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
 * - Tracks requests for debugging
 */
apiClient.interceptors.request.use(
  (config) => {
    const method = config.method?.toUpperCase() || "GET";
    const requestId = generateRequestId();

    // OBSERVABILITY: Add correlation headers for distributed tracing
    config.headers["X-Correlation-ID"] = SESSION_CORRELATION_ID;
    config.headers["X-Request-ID"] = requestId;

    // SECURITY: Add CSRF token and other security headers
    const securityHeaders = getSecurityHeaders(method);
    Object.assign(config.headers, securityHeaders);

    // MULTI-ENTITY: Send selected entity ID on every request
    const entityId = localStorage.getItem("selected_entity_id");
    if (entityId) {
      config.headers["X-Entity-ID"] = entityId;
    }

    // MOBILE FIX: Send Bearer token as fallback for mobile browsers that
    // block third-party cookies (iOS Safari ITP, Chrome cookie deprecation).
    // The backend checks Bearer first, then falls back to cookie (deps.py:86).
    const sessionToken = getSessionToken();
    if (sessionToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${sessionToken}`;
    }

    // Add breadcrumb for API request tracking with correlation info
    addBreadcrumb(
      `API ${method} ${config.url}`,
      "http",
      {
        method,
        url: config.url,
        correlation_id: SESSION_CORRELATION_ID,
        request_id: requestId,
      },
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
  async (error: AxiosError) => {
    // Track failed responses
    const status = error.response?.status;
    const url = error.config?.url;

    // Parse RFC 7807 error response if available
    const problem = parseError(error);

    addBreadcrumb(
      `API Error ${status || "network"} ${url}`,
      "http",
      {
        status,
        url,
        message: error.message,
        error_code: problem?.code,
        trace_id: problem?.trace_id,
      },
      "error",
    );

    // Capture 5xx errors to Sentry (server errors)
    if (status && status >= 500) {
      captureException(error, {
        url,
        status,
        error_code: problem?.code,
        trace_id: problem?.trace_id,
        response: error.response?.data,
      });
    }

    // Handle authentication errors
    if (status === 401) {
      // Skip auth handling for optional endpoints that should fail silently
      const optionalEndpoints = ["/roles", "/auth/refresh", "/entities", "/auth/me"];
      const isOptionalEndpoint = optionalEndpoints.some((endpoint) =>
        url?.includes(endpoint),
      );

      // Don't redirect on public pages — they don't require auth
      const publicPaths = ["/home", "/book", "/privacy", "/terms", "/track/", "/pay/", "/embed/", "/portal/", "/customer-portal/"];
      const isPublicPage = publicPaths.some((p) =>
        window.location.pathname.startsWith(p),
      );

      if (!isOptionalEndpoint && !isPublicPage) {
        // Try to refresh the token before giving up
        if (!(error.config as Record<string, unknown>)?._retried) {
          try {
            (error.config as Record<string, unknown>)._retried = true;
            await apiClient.post("/auth/refresh");
            // Retry the original request
            return apiClient.request(error.config!);
          } catch {
            // Refresh failed — fall through to logout
          }
        }

        // SECURITY: Clear all auth state
        markSessionInvalid();
        clearSessionState();
        cleanupLegacyAuth();

        // Dispatch security event for listeners
        dispatchSecurityEvent("session:expired");

        // Don't redirect to login if already on login page (prevents infinite loop)
        const currentPath = window.location.pathname;
        if (!currentPath.includes("/login")) {
          const returnUrl = encodeURIComponent(
            currentPath + window.location.search,
          );
          window.location.href = `/login?return=${returnUrl}`;
        }
      }
    }

    // Handle CSRF errors (using RFC 7807 error code or legacy string matching)
    if (status === 403) {
      const isCsrfError =
        problem?.code === ErrorCodes.CSRF_INVALID ||
        (typeof problem?.detail === "string" &&
          problem.detail.toLowerCase().includes("csrf"));

      if (isCsrfError) {
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
 * Check if user has an active session
 * Checks sessionStorage metadata AND localStorage Bearer token fallback
 */
export function hasAuthToken(): boolean {
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

  // Also check localStorage for Bearer token (mobile fallback).
  // On mobile, sessionStorage may be cleared between PWA launches
  // but localStorage persists.
  if (getSessionToken()) {
    return true;
  }

  return false;
}

/**
 * Get session state for UI display
 */
export { getSessionState } from "@/lib/security";

/**
 * Type-safe API error (legacy format)
 * @deprecated Use ProblemDetail from errorHandler.ts for RFC 7807 format
 */
export interface ApiErrorResponse {
  error: string;
  detail?: string;
  hint?: string;
}

/**
 * Check if error is an API error with our expected shape
 * Supports both legacy format and RFC 7807 ProblemDetail
 */
export function isApiError(
  error: unknown,
): error is AxiosError<ApiErrorResponse | ProblemDetail> {
  if (!axios.isAxiosError(error)) return false;
  const data = error.response?.data;
  // Check for legacy format or RFC 7807 format
  return (
    data?.error !== undefined ||
    (data?.code !== undefined && data?.trace_id !== undefined)
  );
}

/**
 * Extract error message from API error or unknown error
 * Supports both legacy format and RFC 7807 ProblemDetail
 */
export function getErrorMessage(error: unknown): string {
  // Try RFC 7807 format first
  const problem = parseError(error);
  if (problem) {
    return problem.detail;
  }

  // Fall back to legacy format
  if (isApiError(error)) {
    const data = error.response?.data as ApiErrorResponse;
    return data.error || "An error occurred";
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
