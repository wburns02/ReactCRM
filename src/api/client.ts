import axios, { type AxiosError, type AxiosInstance } from 'axios';

/**
 * API client configured for Flask backend with JWT tokens
 * Standalone deployment - API is on separate domain
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://crm.ecbtx.com/api';

// Token storage key
const TOKEN_KEY = 'auth_token';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add JWT token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
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
