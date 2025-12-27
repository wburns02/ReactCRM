import axios, { type AxiosError, type AxiosInstance } from 'axios';

/**
 * API client configured for Flask backend with session cookies
 */

// In production on react.ecbtx.com, use the Flask backend at crm.ecbtx.com
// In development, use VITE_API_URL or fall back to /api (proxied by Vite)
const getApiBaseUrl = (): string => {
  // Explicit env var takes precedence
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Production on react.ecbtx.com -> use crm.ecbtx.com backend
  if (typeof window !== 'undefined' && window.location.hostname === 'react.ecbtx.com') {
    return 'https://crm.ecbtx.com';
  }

  // Default for local dev (Vite proxy handles it)
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor - handle auth errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Dispatch event for auth state listeners
      window.dispatchEvent(new CustomEvent('auth:expired'));

      // Don't redirect to login if already on login page (prevents infinite loop)
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login')) {
        // Redirect to React login with return URL
        // Strip /app prefix since React Router basename handles it
        // Strip ALL /app prefixes to handle cascading double-prefix bug
        const pathWithoutBase = currentPath.replace(/^(\/app)+/, '') || '/';
        const returnUrl = encodeURIComponent(pathWithoutBase + window.location.search);
        window.location.href = `/app/login?return=${returnUrl}`;
      }
    }

    return Promise.reject(error);
  }
);

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
