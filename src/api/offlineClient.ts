import { apiClient } from './client';
import {
  addToSyncQueue,
  getSyncQueueOrdered,
  type SyncQueueItem,
} from '@/lib/db';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

// ============================================
// Types
// ============================================

export interface OfflineRequestOptions {
  /** Entity type for the request (used for sync queue categorization) */
  entity: SyncQueueItem['entity'];
  /** Operation type */
  type: SyncQueueItem['type'];
  /** Priority (lower = higher priority, default 10) */
  priority?: number;
  /** Whether to queue when offline (default true for mutations) */
  queueWhenOffline?: boolean;
  /** Custom optimistic response to return when offline */
  optimisticResponse?: unknown;
}

export interface OfflineAwareResponse<T = unknown> {
  /** The actual data or optimistic response */
  data: T;
  /** Whether this was queued offline */
  isOfflineQueued: boolean;
  /** Queue item ID if queued */
  queueId?: string;
}

// ============================================
// Offline-Aware API Client
// ============================================

/**
 * Creates an offline-aware wrapper for API calls
 * Automatically queues mutations when offline and returns optimistic responses
 */
export const offlineClient = {
  /**
   * GET request - never queued, throws error when offline unless cached data available
   */
  async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    if (!navigator.onLine) {
      throw new OfflineError('Cannot fetch data while offline');
    }
    return apiClient.get<T>(url, config);
  },

  /**
   * POST request - queued when offline
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    options?: OfflineRequestOptions,
    config?: AxiosRequestConfig
  ): Promise<OfflineAwareResponse<T>> {
    if (navigator.onLine) {
      const response = await apiClient.post<T>(url, data, config);
      return { data: response.data, isOfflineQueued: false };
    }

    if (options?.queueWhenOffline === false) {
      throw new OfflineError('Cannot create while offline');
    }

    // Queue for later sync
    const queueId = await queueRequest(url, 'POST', data, options);

    return {
      data: (options?.optimisticResponse ?? data) as T,
      isOfflineQueued: true,
      queueId,
    };
  },

  /**
   * PUT request - queued when offline
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    options?: OfflineRequestOptions,
    config?: AxiosRequestConfig
  ): Promise<OfflineAwareResponse<T>> {
    if (navigator.onLine) {
      const response = await apiClient.put<T>(url, data, config);
      return { data: response.data, isOfflineQueued: false };
    }

    if (options?.queueWhenOffline === false) {
      throw new OfflineError('Cannot update while offline');
    }

    const queueId = await queueRequest(url, 'PUT', data, options);

    return {
      data: (options?.optimisticResponse ?? data) as T,
      isOfflineQueued: true,
      queueId,
    };
  },

  /**
   * PATCH request - queued when offline
   */
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    options?: OfflineRequestOptions,
    config?: AxiosRequestConfig
  ): Promise<OfflineAwareResponse<T>> {
    if (navigator.onLine) {
      const response = await apiClient.patch<T>(url, data, config);
      return { data: response.data, isOfflineQueued: false };
    }

    if (options?.queueWhenOffline === false) {
      throw new OfflineError('Cannot update while offline');
    }

    const queueId = await queueRequest(url, 'PATCH', data, options);

    return {
      data: (options?.optimisticResponse ?? data) as T,
      isOfflineQueued: true,
      queueId,
    };
  },

  /**
   * DELETE request - queued when offline
   */
  async delete<T = unknown>(
    url: string,
    options?: OfflineRequestOptions,
    config?: AxiosRequestConfig
  ): Promise<OfflineAwareResponse<T>> {
    if (navigator.onLine) {
      const response = await apiClient.delete<T>(url, config);
      return { data: response.data, isOfflineQueued: false };
    }

    if (options?.queueWhenOffline === false) {
      throw new OfflineError('Cannot delete while offline');
    }

    const queueId = await queueRequest(url, 'DELETE', null, options);

    return {
      data: (options?.optimisticResponse ?? { success: true }) as T,
      isOfflineQueued: true,
      queueId,
    };
  },
};

// ============================================
// Helper Functions
// ============================================

async function queueRequest(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  data: unknown,
  options?: OfflineRequestOptions
): Promise<string> {
  const entity = options?.entity ?? inferEntityFromUrl(url);
  const type = options?.type ?? inferTypeFromMethod(method);

  const queueItem: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'> = {
    entity,
    type,
    data,
    url,
    method,
    priority: options?.priority ?? 10,
  };

  return addToSyncQueue(queueItem);
}

function inferEntityFromUrl(url: string): SyncQueueItem['entity'] {
  const normalizedUrl = url.toLowerCase();

  if (normalizedUrl.includes('/customers')) return 'customer';
  if (normalizedUrl.includes('/work-orders')) return 'workOrder';
  if (normalizedUrl.includes('/invoices')) return 'invoice';
  if (normalizedUrl.includes('/payments')) return 'payment';
  if (normalizedUrl.includes('/prospects')) return 'prospect';
  if (normalizedUrl.includes('/activities')) return 'activity';

  // Default to customer if can't infer
  return 'customer';
}

function inferTypeFromMethod(method: string): SyncQueueItem['type'] {
  switch (method) {
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'update';
  }
}

// ============================================
// Custom Error Class
// ============================================

export class OfflineError extends Error {
  readonly isOfflineError = true;

  constructor(message: string = 'Operation unavailable while offline') {
    super(message);
    this.name = 'OfflineError';
  }
}

/**
 * Type guard for OfflineError
 */
export function isOfflineError(error: unknown): error is OfflineError {
  return error instanceof OfflineError ||
    (error instanceof Error && (error as OfflineError).isOfflineError === true);
}

// ============================================
// Mutation Helpers for Common Operations
// ============================================

/**
 * Helper for creating entities with offline support
 */
export async function createWithOfflineSupport<T, R = T>(
  endpoint: string,
  data: T,
  entity: SyncQueueItem['entity'],
  optimisticId?: string
): Promise<OfflineAwareResponse<R>> {
  const optimisticResponse = optimisticId
    ? { ...data, id: optimisticId, _isOptimistic: true }
    : data;

  return offlineClient.post<R>(endpoint, data, {
    entity,
    type: 'create',
    optimisticResponse,
    priority: 5, // Higher priority for creates
  });
}

/**
 * Helper for updating entities with offline support
 */
export async function updateWithOfflineSupport<T, R = T>(
  endpoint: string,
  id: string | number,
  data: Partial<T>,
  entity: SyncQueueItem['entity'],
  currentData?: T
): Promise<OfflineAwareResponse<R>> {
  const optimisticResponse = currentData
    ? { ...currentData, ...data, _isOptimistic: true }
    : { ...data, id, _isOptimistic: true };

  return offlineClient.patch<R>(`${endpoint}/${id}`, data, {
    entity,
    type: 'update',
    optimisticResponse,
    priority: 10,
  });
}

/**
 * Helper for deleting entities with offline support
 */
export async function deleteWithOfflineSupport<R = { success: boolean }>(
  endpoint: string,
  id: string | number,
  entity: SyncQueueItem['entity']
): Promise<OfflineAwareResponse<R>> {
  return offlineClient.delete<R>(`${endpoint}/${id}`, {
    entity,
    type: 'delete',
    optimisticResponse: { success: true, id },
    priority: 15, // Lower priority for deletes
  });
}

// ============================================
// Queue Status Utilities
// ============================================

/**
 * Get pending operations for a specific entity
 */
export async function getPendingOperations(
  entity?: SyncQueueItem['entity']
): Promise<SyncQueueItem[]> {
  const queue = await getSyncQueueOrdered();

  if (entity) {
    return queue.filter(item => item.entity === entity);
  }

  return queue;
}

/**
 * Check if there are pending operations
 */
export async function hasPendingOperations(
  entity?: SyncQueueItem['entity']
): Promise<boolean> {
  const pending = await getPendingOperations(entity);
  return pending.length > 0;
}

/**
 * Get count of pending operations by entity
 */
export async function getPendingOperationCounts(): Promise<Record<string, number>> {
  const queue = await getSyncQueueOrdered();
  const counts: Record<string, number> = {};

  for (const item of queue) {
    counts[item.entity] = (counts[item.entity] || 0) + 1;
  }

  return counts;
}
