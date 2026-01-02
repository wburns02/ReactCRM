import { useState, useEffect, useCallback } from 'react';
import {
  addToSyncQueue,
  getSyncQueue,
  removeSyncQueueItem,
  updateSyncQueueItem,
  setLastSyncTime,
  getLastSyncTime,
  type SyncQueueItem,
} from '@/lib/db';
import { apiClient } from '@/api/client';

interface UseOfflineReturn {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  syncQueue: SyncQueueItem[];
  lastSyncTime: number | null;
  addToQueue: (item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>) => Promise<void>;
  syncNow: () => Promise<SyncResult>;
  clearQueue: () => Promise<void>;
}

interface SyncResult {
  success: number;
  failed: number;
  errors: string[];
}

const MAX_RETRIES = 3;
const SYNC_INTERVAL = 30000; // 30 seconds

/**
 * Hook for managing offline state and sync queue with IndexedDB persistence
 */
export function useOffline(): UseOfflineReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [lastSyncTime, setLastSyncTimeState] = useState<number | null>(null);

  // Load initial queue and last sync time from IndexedDB
  useEffect(() => {
    async function loadQueue() {
      try {
        const queue = await getSyncQueue();
        setSyncQueue(queue);
        const lastSync = await getLastSyncTime();
        setLastSyncTimeState(lastSync ?? null);
      } catch (error) {
        console.error('Failed to load sync queue:', error);
      }
    }
    loadQueue();
  }, []);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncNowInternal();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync interval when online
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      if (syncQueue.length > 0 && !isSyncing) {
        syncNowInternal();
      }
    }, SYNC_INTERVAL);

    return () => clearInterval(interval);
  }, [isOnline, syncQueue.length, isSyncing]);

  // Add item to sync queue
  const addToQueue = useCallback(async (item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>) => {
    try {
      await addToSyncQueue(item);
      const queue = await getSyncQueue();
      setSyncQueue(queue);
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
      throw error;
    }
  }, []);

  // Process a single sync item
  const processSyncItem = async (item: SyncQueueItem): Promise<boolean> => {
    try {
      const endpoint = getEndpointForEntity(item.entity);

      switch (item.type) {
        case 'create':
          await apiClient.post(endpoint, item.data);
          break;
        case 'update':
          const updateData = item.data as { id: string | number; [key: string]: unknown };
          await apiClient.patch(`${endpoint}/${updateData.id}`, item.data);
          break;
        case 'delete':
          const deleteData = item.data as { id: string | number };
          await apiClient.delete(`${endpoint}/${deleteData.id}`);
          break;
      }

      return true;
    } catch (error) {
      console.error(`Sync failed for ${item.entity}:${item.type}:`, error);
      return false;
    }
  };

  // Internal sync function
  const syncNowInternal = async (): Promise<SyncResult> => {
    if (!isOnline || isSyncing) {
      return { success: 0, failed: 0, errors: [] };
    }

    setIsSyncing(true);
    const result: SyncResult = { success: 0, failed: 0, errors: [] };

    try {
      const queue = await getSyncQueue();

      for (const item of queue) {
        const success = await processSyncItem(item);

        if (success) {
          await removeSyncQueueItem(item.id);
          result.success++;
        } else {
          const updatedItem: SyncQueueItem = {
            ...item,
            retries: item.retries + 1,
            lastError: `Sync failed at ${new Date().toISOString()}`,
          };

          if (updatedItem.retries >= MAX_RETRIES) {
            // Remove after max retries
            await removeSyncQueueItem(item.id);
            result.errors.push(`${item.entity}:${item.type} failed after ${MAX_RETRIES} retries`);
          } else {
            await updateSyncQueueItem(updatedItem);
          }
          result.failed++;
        }
      }

      // Update last sync time and queue state
      const now = Date.now();
      await setLastSyncTime(now);
      setLastSyncTimeState(now);

      const newQueue = await getSyncQueue();
      setSyncQueue(newQueue);
    } catch (error) {
      console.error('Sync process error:', error);
      result.errors.push(String(error));
    } finally {
      setIsSyncing(false);
    }

    return result;
  };

  // Public sync function
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    return syncNowInternal();
  }, [isOnline, isSyncing]);

  // Clear the sync queue
  const clearQueue = useCallback(async () => {
    try {
      const { clearSyncQueue } = await import('@/lib/db');
      await clearSyncQueue();
      setSyncQueue([]);
    } catch (error) {
      console.error('Failed to clear sync queue:', error);
      throw error;
    }
  }, []);

  return {
    isOnline,
    pendingCount: syncQueue.length,
    isSyncing,
    syncQueue,
    lastSyncTime,
    addToQueue,
    syncNow,
    clearQueue,
  };
}

// Helper to get API endpoint for entity type
function getEndpointForEntity(entity: SyncQueueItem['entity']): string {
  switch (entity) {
    case 'customer':
      return '/customers/';
    case 'workOrder':
      return '/work-orders';
    case 'invoice':
      return '/invoices';
    case 'payment':
      return '/payments';
    default:
      throw new Error(`Unknown entity type: ${entity}`);
  }
}

/**
 * Hook for caching data to IndexedDB
 */
export function useOfflineCache() {
  const [isLoading, setIsLoading] = useState(false);

  const cacheCustomers = useCallback(async (customers: unknown[]) => {
    setIsLoading(true);
    try {
      const { cacheCustomers: cache } = await import('@/lib/db');
      await cache(customers as Parameters<typeof cache>[0]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cacheWorkOrders = useCallback(async (workOrders: unknown[]) => {
    setIsLoading(true);
    try {
      const { cacheWorkOrders: cache } = await import('@/lib/db');
      await cache(workOrders as Parameters<typeof cache>[0]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cacheTechnicians = useCallback(async (technicians: unknown[]) => {
    setIsLoading(true);
    try {
      const { cacheTechnicians: cache } = await import('@/lib/db');
      await cache(technicians as Parameters<typeof cache>[0]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCacheStats = useCallback(async () => {
    const { getCacheStats: getStats } = await import('@/lib/db');
    return getStats();
  }, []);

  const clearCache = useCallback(async () => {
    const { clearAllCaches } = await import('@/lib/db');
    await clearAllCaches();
  }, []);

  return {
    isLoading,
    cacheCustomers,
    cacheWorkOrders,
    cacheTechnicians,
    getCacheStats,
    clearCache,
  };
}
