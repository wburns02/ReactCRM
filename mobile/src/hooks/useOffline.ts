/**
 * Offline functionality hooks for CRM Mobile
 */
import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { offlineQueue, QueuedRequest, SyncResult } from '../api/offlineQueue';

export interface OfflineState {
  isOnline: boolean;
  isInitialized: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncQueue: QueuedRequest[];
  lastSyncTime: number | null;
}

export function useOffline() {
  const [state, setState] = useState<OfflineState>({
    isOnline: true,
    isInitialized: false,
    isSyncing: false,
    pendingCount: 0,
    syncQueue: [],
    lastSyncTime: null,
  });

  // Initialize and subscribe to network changes
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Initialize queue
      await offlineQueue.init();

      // Get initial network state
      const netState = await NetInfo.fetch();

      // Get queue state
      const queue = await offlineQueue.getAll();

      if (mounted) {
        setState((prev) => ({
          ...prev,
          isOnline: netState.isConnected ?? true,
          isInitialized: true,
          pendingCount: queue.length,
          syncQueue: queue,
        }));
      }
    };

    init();

    // Subscribe to network changes
    const unsubscribeNet = NetInfo.addEventListener((netState: NetInfoState) => {
      if (mounted) {
        setState((prev) => ({
          ...prev,
          isOnline: netState.isConnected ?? true,
        }));
      }
    });

    // Subscribe to queue changes
    const unsubscribeQueue = offlineQueue.subscribe(async () => {
      if (mounted) {
        const queue = await offlineQueue.getAll();
        setState((prev) => ({
          ...prev,
          pendingCount: queue.length,
          syncQueue: queue,
          isSyncing: offlineQueue.getIsSyncing(),
        }));
      }
    });

    return () => {
      mounted = false;
      unsubscribeNet();
      unsubscribeQueue();
    };
  }, []);

  // Sync now function
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    setState((prev) => ({ ...prev, isSyncing: true }));
    const result = await offlineQueue.sync();
    setState((prev) => ({
      ...prev,
      isSyncing: false,
      lastSyncTime: Date.now(),
    }));
    return result;
  }, []);

  // Retry specific item
  const retryItem = useCallback(async (id: string): Promise<boolean> => {
    return offlineQueue.retry(id);
  }, []);

  // Remove item from queue
  const removeItem = useCallback(async (id: string): Promise<void> => {
    return offlineQueue.remove(id);
  }, []);

  // Clear entire queue
  const clearQueue = useCallback(async (): Promise<void> => {
    return offlineQueue.clear();
  }, []);

  return {
    ...state,
    syncNow,
    retryItem,
    removeItem,
    clearQueue,
  };
}

/**
 * Simple hook to check if device is online
 */
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? true);
    });

    return unsubscribe;
  }, []);

  return isOnline;
}

/**
 * Hook for sync status display
 */
export interface SyncStatus {
  status: 'idle' | 'syncing' | 'error' | 'offline';
  message: string;
  pendingCount: number;
  isHealthy: boolean;
}

export function useSyncStatus(): SyncStatus {
  const { isOnline, isSyncing, pendingCount, syncQueue } = useOffline();

  // Check if any items have failed (3+ retries)
  const hasErrors = syncQueue.some((item) => item.retries >= 3);

  if (!isOnline) {
    return {
      status: 'offline',
      message: 'You are offline',
      pendingCount,
      isHealthy: false,
    };
  }

  if (isSyncing) {
    return {
      status: 'syncing',
      message: 'Syncing changes...',
      pendingCount,
      isHealthy: true,
    };
  }

  if (hasErrors) {
    return {
      status: 'error',
      message: 'Some changes failed to sync',
      pendingCount,
      isHealthy: false,
    };
  }

  if (pendingCount > 0) {
    return {
      status: 'idle',
      message: `${pendingCount} pending changes`,
      pendingCount,
      isHealthy: true,
    };
  }

  return {
    status: 'idle',
    message: 'All changes synced',
    pendingCount: 0,
    isHealthy: true,
  };
}
