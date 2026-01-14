import { useState, useEffect, useCallback, useRef } from "react";
import {
  addToSyncQueue,
  getSyncQueue,
  getSyncQueueCount,
  getSyncQueueOrdered,
  removeSyncQueueItem,
  updateSyncQueueItem,
  batchRemoveSyncQueueItems,
  setLastSyncTime,
  getLastSyncTime,
  getOfflineSyncState,
  setOfflineSyncState,
  markSyncAttempt,
  markSyncSuccess,
  markSyncFailure,
  checkDatabaseHealth,
  type SyncQueueItem,
} from "@/lib/db";
import { apiClient } from "@/api/client";

// ============================================
// Types
// ============================================

export interface UseOfflineReturn {
  /** Whether the browser reports being online */
  isOnline: boolean;
  /** Number of items pending in the sync queue */
  pendingCount: number;
  /** Whether a sync operation is currently in progress */
  isSyncing: boolean;
  /** Full sync queue (loaded from IndexedDB) */
  syncQueue: SyncQueueItem[];
  /** Timestamp of last successful sync */
  lastSyncTime: number | null;
  /** Whether IndexedDB has been initialized */
  isInitialized: boolean;
  /** Any database error that occurred */
  dbError: string | null;
  /** Add an item to the sync queue */
  addToQueue: (
    item: Omit<SyncQueueItem, "id" | "timestamp" | "retries">,
  ) => Promise<string>;
  /** Manually trigger a sync */
  syncNow: () => Promise<SyncResult>;
  /** Clear all items from the sync queue */
  clearQueue: () => Promise<void>;
  /** Retry a specific failed item */
  retryItem: (id: string) => Promise<boolean>;
  /** Remove a specific item from the queue */
  removeItem: (id: string) => Promise<void>;
  /** Refresh queue state from IndexedDB */
  refreshQueue: () => Promise<void>;
}

export interface SyncResult {
  /** Number of items successfully synced */
  success: number;
  /** Number of items that failed */
  failed: number;
  /** Error messages for failed items */
  errors: string[];
  /** IDs of items that were successfully synced */
  syncedIds: string[];
  /** IDs of items that failed */
  failedIds: string[];
}

export interface SyncStatusInfo {
  /** Overall sync status */
  status: "idle" | "syncing" | "error" | "offline";
  /** Human-readable status message */
  message: string;
  /** Number of pending items */
  pendingCount: number;
  /** Last successful sync time */
  lastSync: Date | null;
  /** Consecutive failure count */
  consecutiveFailures: number;
  /** Whether sync is healthy (no failures, queue not backed up) */
  isHealthy: boolean;
}

// ============================================
// Constants
// ============================================

const MAX_RETRIES = 3;
const SYNC_INTERVAL = 30000; // 30 seconds
const SYNC_DEBOUNCE = 2000; // 2 seconds debounce after coming online

// ============================================
// Helper Functions
// ============================================

function getEndpointForEntity(entity: SyncQueueItem["entity"]): string {
  switch (entity) {
    case "customer":
      return "/customers/";
    case "workOrder":
      return "/work-orders";
    case "invoice":
      return "/invoices";
    case "payment":
      return "/payments";
    case "prospect":
      return "/prospects/";
    case "activity":
      return "/activities/";
    default:
      throw new Error(`Unknown entity type: ${entity}`);
  }
}

async function processSyncItem(item: SyncQueueItem): Promise<boolean> {
  try {
    // If item has a raw URL, use that directly
    if (item.url && item.method) {
      switch (item.method) {
        case "POST":
          await apiClient.post(item.url, item.data);
          break;
        case "PUT":
          await apiClient.put(item.url, item.data);
          break;
        case "PATCH":
          await apiClient.patch(item.url, item.data);
          break;
        case "DELETE":
          await apiClient.delete(item.url);
          break;
      }
      return true;
    }

    // Otherwise, use entity-based routing
    const endpoint = getEndpointForEntity(item.entity);

    switch (item.type) {
      case "create":
        await apiClient.post(endpoint, item.data);
        break;
      case "update": {
        const updateData = item.data as {
          id: string | number;
          [key: string]: unknown;
        };
        await apiClient.patch(`${endpoint}/${updateData.id}`, item.data);
        break;
      }
      case "delete": {
        const deleteData = item.data as { id: string | number };
        await apiClient.delete(`${endpoint}/${deleteData.id}`);
        break;
      }
    }

    return true;
  } catch (error) {
    console.error(`Sync failed for ${item.entity}:${item.type}:`, error);
    return false;
  }
}

// ============================================
// Main Hook
// ============================================

/**
 * Hook for managing offline state and sync queue with IndexedDB persistence
 *
 * Features:
 * - Automatic sync queue persistence to IndexedDB
 * - Auto-sync when coming back online
 * - Periodic sync attempts when online
 * - Retry logic with exponential backoff
 * - Queue state restoration on app start
 */
export function useOffline(): UseOfflineReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [lastSyncTime, setLastSyncTimeState] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Refs to avoid stale closures
  const isOnlineRef = useRef(isOnline);
  const isSyncingRef = useRef(isSyncing);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onlineDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);
  useEffect(() => {
    isSyncingRef.current = isSyncing;
  }, [isSyncing]);

  // ============================================
  // Sync Processing (defined as ref to avoid closure issues)
  // ============================================

  const performSync = useCallback(async (): Promise<SyncResult> => {
    // Early exit if not online or already syncing
    if (!isOnlineRef.current || isSyncingRef.current) {
      return {
        success: 0,
        failed: 0,
        errors: [],
        syncedIds: [],
        failedIds: [],
      };
    }

    setIsSyncing(true);
    isSyncingRef.current = true;

    const result: SyncResult = {
      success: 0,
      failed: 0,
      errors: [],
      syncedIds: [],
      failedIds: [],
    };

    try {
      // Mark sync attempt
      await markSyncAttempt();

      // Get ordered queue
      const queue = await getSyncQueueOrdered();

      if (queue.length === 0) {
        await markSyncSuccess();
        const now = Date.now();
        await setLastSyncTime(now);
        setLastSyncTimeState(now);
        return result;
      }

      // Process items sequentially to maintain order
      const successIds: string[] = [];
      const updatedItems: SyncQueueItem[] = [];

      for (const item of queue) {
        // Check if still online
        if (!navigator.onLine) {
          setIsOnline(false);
          break;
        }

        const success = await processSyncItem(item);

        if (success) {
          successIds.push(item.id);
          result.syncedIds.push(item.id);
          result.success++;
        } else {
          const updatedItem: SyncQueueItem = {
            ...item,
            retries: item.retries + 1,
            lastError: `Sync failed at ${new Date().toISOString()}`,
          };

          if (updatedItem.retries >= MAX_RETRIES) {
            // Keep item but mark error for user attention
            result.errors.push(
              `${item.entity}:${item.type} failed after ${MAX_RETRIES} retries`,
            );
            result.failedIds.push(item.id);
          } else {
            updatedItems.push(updatedItem);
          }
          result.failed++;
          result.failedIds.push(item.id);
        }
      }

      // Batch operations for performance
      if (successIds.length > 0) {
        await batchRemoveSyncQueueItems(successIds);
      }

      for (const item of updatedItems) {
        await updateSyncQueueItem(item);
      }

      // Update sync time and state
      const now = Date.now();
      await setLastSyncTime(now);
      setLastSyncTimeState(now);

      if (result.failed === 0) {
        await markSyncSuccess();
      } else {
        await markSyncFailure();
      }

      // Refresh queue state
      const newQueue = await getSyncQueueOrdered();
      setSyncQueue(newQueue);
    } catch (error) {
      console.error("Sync process error:", error);
      result.errors.push(String(error));
      await markSyncFailure();
    } finally {
      setIsSyncing(false);
      isSyncingRef.current = false;
    }

    return result;
  }, []);

  // Store performSync in a ref so effects can access it without it being a dependency
  const performSyncRef = useRef(performSync);
  performSyncRef.current = performSync;

  // ============================================
  // Initialization - Load queue from IndexedDB
  // ============================================

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        // Check database health first
        const health = await checkDatabaseHealth();
        if (!health.healthy) {
          throw new Error(health.error || "Database unavailable");
        }

        // Load queue and sync state
        const [queue, lastSync, syncState] = await Promise.all([
          getSyncQueueOrdered(),
          getLastSyncTime(),
          getOfflineSyncState(),
        ]);

        if (mounted) {
          setSyncQueue(queue);
          setLastSyncTimeState(lastSync ?? null);
          setIsInitialized(true);
          setDbError(null);

          // Mark as initialized in persistent state
          if (!syncState.isInitialized) {
            await setOfflineSyncState({ isInitialized: true });
          }

          // If we have pending items and we're online, trigger sync
          if (queue.length > 0 && navigator.onLine) {
            // Delay initial sync slightly to let app settle
            setTimeout(() => {
              if (mounted) performSyncRef.current();
            }, 1000);
          }
        }
      } catch (error) {
        console.error("Failed to initialize offline sync:", error);
        if (mounted) {
          setDbError(
            error instanceof Error ? error.message : "Failed to initialize",
          );
          setIsInitialized(true); // Still mark as initialized so UI doesn't hang
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  // ============================================
  // Online/Offline Event Handlers
  // ============================================

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);

      // Debounce sync to avoid rapid fire when connection is unstable
      if (onlineDebounceRef.current) {
        clearTimeout(onlineDebounceRef.current);
      }

      onlineDebounceRef.current = setTimeout(() => {
        performSyncRef.current();
      }, SYNC_DEBOUNCE);
    };

    const handleOffline = () => {
      setIsOnline(false);

      // Clear any pending sync debounce
      if (onlineDebounceRef.current) {
        clearTimeout(onlineDebounceRef.current);
        onlineDebounceRef.current = null;
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (onlineDebounceRef.current) {
        clearTimeout(onlineDebounceRef.current);
      }
    };
  }, []);

  // ============================================
  // Auto-sync Interval
  // ============================================

  useEffect(() => {
    // Clear existing interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    // Only set up interval if online and initialized
    if (!isOnline || !isInitialized) return;

    syncIntervalRef.current = setInterval(() => {
      // Use refs to get current values
      if (isOnlineRef.current && !isSyncingRef.current) {
        // Check if we have pending items before syncing
        getSyncQueueCount()
          .then((count) => {
            if (count > 0) {
              performSyncRef.current();
            }
          })
          .catch(console.error);
      }
    }, SYNC_INTERVAL);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, isInitialized]);

  // ============================================
  // Queue Operations
  // ============================================

  const addToQueue = useCallback(
    async (
      item: Omit<SyncQueueItem, "id" | "timestamp" | "retries">,
    ): Promise<string> => {
      try {
        const id = await addToSyncQueue(item);
        // Refresh queue state
        const queue = await getSyncQueueOrdered();
        setSyncQueue(queue);
        return id;
      } catch (error) {
        console.error("Failed to add to sync queue:", error);
        throw error;
      }
    },
    [],
  );

  const removeItem = useCallback(async (id: string): Promise<void> => {
    try {
      await removeSyncQueueItem(id);
      const queue = await getSyncQueueOrdered();
      setSyncQueue(queue);
    } catch (error) {
      console.error("Failed to remove sync queue item:", error);
      throw error;
    }
  }, []);

  const refreshQueue = useCallback(async (): Promise<void> => {
    try {
      const queue = await getSyncQueueOrdered();
      setSyncQueue(queue);
    } catch (error) {
      console.error("Failed to refresh sync queue:", error);
    }
  }, []);

  const syncNow = useCallback(async (): Promise<SyncResult> => {
    return performSync();
  }, [performSync]);

  const retryItem = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const queue = await getSyncQueue();
        const item = queue.find((i) => i.id === id);

        if (!item) {
          console.warn(`Item ${id} not found in queue`);
          return false;
        }

        // Reset retries
        const updatedItem: SyncQueueItem = {
          ...item,
          retries: 0,
          lastError: undefined,
        };
        await updateSyncQueueItem(updatedItem);

        // Trigger sync
        const result = await performSync();
        return result.syncedIds.includes(id);
      } catch (error) {
        console.error("Failed to retry item:", error);
        return false;
      }
    },
    [performSync],
  );

  const clearQueue = useCallback(async () => {
    try {
      const { clearSyncQueue } = await import("@/lib/db");
      await clearSyncQueue();
      setSyncQueue([]);
    } catch (error) {
      console.error("Failed to clear sync queue:", error);
      throw error;
    }
  }, []);

  return {
    isOnline,
    pendingCount: syncQueue.length,
    isSyncing,
    syncQueue,
    lastSyncTime,
    isInitialized,
    dbError,
    addToQueue,
    syncNow,
    clearQueue,
    retryItem,
    removeItem,
    refreshQueue,
  };
}

// ============================================
// Sync Status Hook (for UI components)
// ============================================

/**
 * Hook providing sync status information for UI display
 * Lighter weight than useOffline - only subscribes to status updates
 */
export function useSyncStatus(): SyncStatusInfo {
  const [status, setStatus] = useState<SyncStatusInfo>({
    status: "idle",
    message: "Ready",
    pendingCount: 0,
    lastSync: null,
    consecutiveFailures: 0,
    isHealthy: true,
  });

  useEffect(() => {
    let mounted = true;

    async function loadStatus() {
      try {
        const [count, lastSync, syncState] = await Promise.all([
          getSyncQueueCount(),
          getLastSyncTime(),
          getOfflineSyncState(),
        ]);

        if (!mounted) return;

        const isOnline = navigator.onLine;
        const hasFailures = syncState.consecutiveFailures > 0;
        const hasPending = count > 0;

        let statusValue: SyncStatusInfo["status"] = "idle";
        let message = "All changes synced";

        if (!isOnline) {
          statusValue = "offline";
          message = hasPending
            ? `Offline - ${count} change${count === 1 ? "" : "s"} pending`
            : "Offline - changes will be saved locally";
        } else if (hasFailures) {
          statusValue = "error";
          message = `Sync issues - ${syncState.consecutiveFailures} consecutive failure${syncState.consecutiveFailures === 1 ? "" : "s"}`;
        } else if (hasPending) {
          statusValue = "syncing";
          message = `${count} change${count === 1 ? "" : "s"} pending sync`;
        }

        setStatus({
          status: statusValue,
          message,
          pendingCount: count,
          lastSync: lastSync ? new Date(lastSync) : null,
          consecutiveFailures: syncState.consecutiveFailures,
          isHealthy: isOnline && !hasFailures && !hasPending,
        });
      } catch (error) {
        console.error("Failed to load sync status:", error);
      }
    }

    // Initial load
    loadStatus();

    // Subscribe to online/offline events
    const handleOnline = () => loadStatus();
    const handleOffline = () => loadStatus();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Poll for updates (in case sync happens in background)
    const pollInterval = setInterval(loadStatus, 5000);

    return () => {
      mounted = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(pollInterval);
    };
  }, []);

  return status;
}

// ============================================
// Offline Cache Hook
// ============================================

/**
 * Hook for caching data to IndexedDB
 */
export function useOfflineCache() {
  const [isLoading, setIsLoading] = useState(false);

  const cacheCustomers = useCallback(async (customers: unknown[]) => {
    setIsLoading(true);
    try {
      const { cacheCustomers: cache } = await import("@/lib/db");
      await cache(customers as Parameters<typeof cache>[0]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cacheWorkOrders = useCallback(async (workOrders: unknown[]) => {
    setIsLoading(true);
    try {
      const { cacheWorkOrders: cache } = await import("@/lib/db");
      await cache(workOrders as Parameters<typeof cache>[0]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cacheTechnicians = useCallback(async (technicians: unknown[]) => {
    setIsLoading(true);
    try {
      const { cacheTechnicians: cache } = await import("@/lib/db");
      await cache(technicians as Parameters<typeof cache>[0]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCacheStats = useCallback(async () => {
    const { getCacheStats: getStats } = await import("@/lib/db");
    return getStats();
  }, []);

  const clearCache = useCallback(async () => {
    const { clearAllCaches } = await import("@/lib/db");
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

// ============================================
// Exports
// ============================================

export type { SyncQueueItem } from "@/lib/db";
