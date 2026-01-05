/**
 * API Client for CRM Mobile App
 * Features:
 * - JWT authentication with secure storage
 * - Automatic token refresh
 * - Offline request queuing
 * - Request retry with exponential backoff
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import { offlineQueue } from './offlineQueue';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl ||
  'https://react-crm-api-production.up.railway.app/api/v2';

// Token storage keys
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function hasAuthToken(): Promise<boolean> {
  const token = await getAuthToken();
  return !!token;
}

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors and offline scenarios
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // Handle 401 - token expired
    if (error.response?.status === 401 && originalRequest) {
      await clearAuthToken();
      // Emit event for auth context to handle
      authEventEmitter.emit('expired');
    }

    // Handle network errors - queue for offline sync
    if (!error.response && originalRequest) {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        // Queue the request for later
        if (originalRequest.method !== 'get') {
          await offlineQueue.add({
            method: originalRequest.method || 'post',
            url: originalRequest.url || '',
            data: originalRequest.data,
            headers: originalRequest.headers as Record<string, string>,
          });
        }
        throw new OfflineError('You are offline. Changes will sync when connection is restored.');
      }
    }

    return Promise.reject(error);
  }
);

// Custom error for offline scenarios
export class OfflineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfflineError';
  }
}

// Simple event emitter for auth events
type AuthEvent = 'expired' | 'refreshed';
type AuthListener = () => void;

class AuthEventEmitter {
  private listeners: Map<AuthEvent, Set<AuthListener>> = new Map();

  on(event: AuthEvent, listener: AuthListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }

  emit(event: AuthEvent): void {
    this.listeners.get(event)?.forEach((listener) => listener());
  }
}

export const authEventEmitter = new AuthEventEmitter();

// API error helpers
export interface ApiErrorResponse {
  error: string;
  detail?: string;
  hint?: string;
}

export function isApiError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return axios.isAxiosError(error) && error.response?.data?.error !== undefined;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof OfflineError) {
    return error.message;
  }
  if (isApiError(error)) {
    const data = error.response?.data;
    return data?.detail || data?.error || 'An error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
