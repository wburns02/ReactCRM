import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { addBreadcrumb, captureException } from '@/lib/sentry';

/**
 * API client configured for FastAPI backend with JWT tokens
 * Standalone deployment - API is on separate domain (Railway)
 *
 * Backend: https://react-crm-api-production.up.railway.app/api/v2
 * Repository: wburns02/react-crm-api
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://react-crm-api-production.up.railway.app/api/v2';

// Token storage key (kept for backwards compatibility during migration)
const TOKEN_KEY = 'auth_token';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // SECURITY: Enable credentials for HTTP-only cookie auth
  // This sends the session cookie automatically with every request
  withCredentials: true,
});

// Request interceptor - add JWT token (fallback) and track request
// SECURITY: Auth priority:
// 1. HTTP-only cookie (automatic via withCredentials) - XSS-safe
// 2. Bearer token in localStorage (fallback for compatibility)
// The cookie is set by the backend on login and sent automatically.
// The Bearer token is kept as fallback during migration period.
apiClient.interceptors.request.use(
  (config) => {
    // Only add Bearer token if no cookie auth will be used
    // This is a fallback for backwards compatibility
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add breadcrumb for API request tracking
    addBreadcrumb(
      `API ${config.method?.toUpperCase()} ${config.url}`,
      'http',
      { method: config.method, url: config.url },
      'info'
    );

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors and track responses
apiClient.interceptors.response.use(
  (response) => {
    // Track successful responses for debugging context
    addBreadcrumb(
      `API ${response.status} ${response.config.url}`,
      'http',
      { status: response.status, url: response.config.url },
      'info'
    );
    return response;
  },
  (error: AxiosError) => {
    // Track failed responses
    const status = error.response?.status;
    const url = error.config?.url;

    addBreadcrumb(
      `API Error ${status || 'network'} ${url}`,
      'http',
      {
        status,
        url,
        message: error.message,
      },
      'error'
    );

    // Capture 5xx errors to Sentry (server errors)
    if (status && status >= 500) {
      captureException(error, {
        url,
        status,
        response: error.response?.data,
      });
    }

    if (status === 401) {
      // Clear invalid token
      localStorage.removeItem(TOKEN_KEY);

      // Dispatch event for auth state listeners
      window.dispatchEvent(new CustomEvent('auth:expired'));

      // Don't redirect to login if already on login page (prevents infinite loop)
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login')) {
        // Redirect to login with return URL
        const returnUrl = encodeURIComponent(currentPath + window.location.search);
        window.location.href = `/login?return=${returnUrl}`;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Store JWT token after login
 */
export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Clear JWT token on logout
 */
export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Check if user has a stored token
 */
export function hasAuthToken(): boolean {
  return !!localStorage.getItem(TOKEN_KEY);
}

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
export function isApiError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return axios.isAxiosError(error) && error.response?.data?.error !== undefined;
}

/**
 * Extract error message from API error or unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.response?.data.error || 'An error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
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
 * Wrapper for API calls that gracefully handles 404 by returning a default value.
 * Use this for endpoints that may not be implemented yet on the backend.
 *
 * @param apiFn - The async API function to call
 * @param defaultValue - The value to return if the endpoint returns 404
 * @returns The API response or default value on 404
 */
export async function withFallback<T>(
  apiFn: () => Promise<T>,
  defaultValue: T
): Promise<T> {
  try {
    return await apiFn();
  } catch (error) {
    if (is404Error(error)) {
      return defaultValue;
    }
    throw error;
  }
}
