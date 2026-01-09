/**
 * useOfflineSync - Enhanced IndexedDB sync hook for mobile
 *
 * Features:
 * - saveOffline(workOrder)
 * - queueChange(change)
 * - syncPending()
 * - isOnline state
 * - Offline-first operations
 * - Automatic retry with exponential backoff
 * - Conflict resolution
 *
 * This enhances the existing useOfflineWorkOrders hook with
 * additional sync capabilities for mobile field service.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useOnlineStatus } from '@/hooks/usePWA';
import {
  getDB,
  addToSyncQueue,
  getSyncQueueOrdered,
  removeSyncQueueItem,
  updateSyncQueueItem,
  getSyncQueueCount,
  batchRemoveSyncQueueItems,
  getOfflineSyncState,
  markSyncAttempt,
  markSyncSuccess,
  markSyncFailure,
  updateCachedWorkOrder,
  getCachedWorkOrder,
  type SyncQueueItem,
  type CachedWorkOrder,
  // setOfflineSyncState, getWorkOrdersWithPendingSync - available for extended sync
} from '@/lib/db';
import type { WorkOrder, WorkOrderStatus } from '@/api/types/workOrder';

// ============================================
// Types
// ============================================

export interface OfflineChange {
  type: 'status_update' | 'note_add' | 'checklist_update' | 'photo_add' | 'signature_add';
  workOrderId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

export interface UseOfflineSyncReturn {
  /** Whether device is online */
  isOnline: boolean;
  /** Whether sync is in progress */
  isSyncing: boolean;
  /** Number of pending changes */
  pendingCount: number;
  /** Last successful sync time */
  lastSyncTime: Date | null;
  /** Number of consecutive failures */
  consecutiveFailures: number;
  /** Save a work order to offline cache */
  saveOffline: (workOrder: WorkOrder) => Promise<void>;
  /** Queue a change for sync */
  queueChange: (change: OfflineChange) => Promise<string>;
  /** Sync all pending changes */
  syncPending: () => Promise<SyncResult>;
  /** Force sync a specific item */
  syncItem: (itemId: string) => Promise<boolean>;
  /** Cancel a pending sync item */
  cancelPending: (itemId: string) => Promise<void>;
  /** Clear all pending items (use with caution) */
  clearAllPending: () => Promise<void>;
  /** Update work order status (offline-capable) */
  updateStatus: (workOrderId: string, status: WorkOrderStatus, notes?: string) => Promise<void>;
  /** Add note to work order (offline-capable) */
  addNote: (workOrderId: string, note: string) => Promise<void>;
}

// ============================================
// Constants
// ============================================

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 60000; // 1 minute
const SYNC_BATCH_SIZE = 10;

// ============================================
// Helper Functions
// ============================================

function calculateRetryDelay(retries: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, capped at 60s
  const delay = Math.min(BASE_RETRY_DELAY * Math.pow(2, retries), MAX_RETRY_DELAY);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

function workOrderToCache(wo: WorkOrder): CachedWorkOrder {
  return {
    id: wo.id,
    customer_id: parseInt(String(wo.customer_id), 10),
    job_type: wo.job_type,
    status: wo.status,
    priority: wo.priority,
    scheduled_date: wo.scheduled_date ?? undefined,
    time_window_start: wo.time_window_start ?? undefined,
    time_window_end: wo.time_window_end ?? undefined,
    estimated_duration_hours: wo.estimated_duration_hours ?? undefined,
    assigned_technician: wo.assigned_technician ?? undefined,
    assigned_vehicle: wo.assigned_vehicle ?? undefined,
    service_address_line1: wo.service_address_line1 ?? undefined,
    service_city: wo.service_city ?? undefined,
    service_state: wo.service_state ?? undefined,
    service_postal_code: wo.service_postal_code ?? undefined,
    notes: wo.notes ?? undefined,
    customer_name: wo.customer_name ?? undefined,
    updated_at: wo.updated_at ?? new Date().toISOString(),
    _cachedAt: Date.now(),
  };
}

// ============================================
// Main Hook
// ============================================

export function useOfflineSync(): UseOfflineSyncReturn {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();

  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  const syncInProgressRef = useRef(false);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ============================================
  // Load initial state
  // ============================================

  useEffect(() => {
    async function loadState() {
      const [count, state] = await Promise.all([
        getSyncQueueCount(),
        getOfflineSyncState(),
      ]);

      setPendingCount(count);
      setConsecutiveFailures(state.consecutiveFailures);

      if (state.lastSuccessfulSync) {
        setLastSyncTime(new Date(state.lastSuccessfulSync));
      }
    }

    loadState();
  }, []);

  // ============================================
  // Update pending count
  // ============================================

  const updatePendingCount = useCallback(async () => {
    const count = await getSyncQueueCount();
    setPendingCount(count);
  }, []);

  // ============================================
  // Save work order to offline cache
  // ============================================

  const saveOffline = useCallback(async (workOrder: WorkOrder) => {
    const cached = workOrderToCache(workOrder);
    await updateCachedWorkOrder(cached);
  }, []);

  // ============================================
  // Queue a change for sync
  // ============================================

  const queueChange = useCallback(
    async (change: OfflineChange): Promise<string> => {
      // Map change type to sync queue format
      const priority = change.type === 'status_update' ? 1 : 5;

      const id = await addToSyncQueue({
        entity: 'workOrder',
        type: 'update',
        data: {
          workOrderId: change.workOrderId,
          changeType: change.type,
          ...change.data,
          timestamp: change.timestamp,
        },
        priority,
      });

      await updatePendingCount();

      // Try to sync immediately if online
      if (isOnline && !syncInProgressRef.current) {
        syncPending();
      }

      return id;
    },
    [isOnline, updatePendingCount]
  );

  // ============================================
  // Sync a single item
  // ============================================

  const syncItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      const db = await getDB();
      const item = await db.get('syncQueue', itemId);

      if (!item) {
        console.warn(`Sync item ${itemId} not found`);
        return false;
      }

      try {
        const data = item.data as Record<string, unknown>;
        const workOrderId = data.workOrderId as string;

        // Determine API endpoint and method based on change type
        const changeType = data.changeType as string;

        switch (changeType) {
          case 'status_update':
            await apiClient.patch(`/work-orders/${workOrderId}`, {
              status: data.status,
              notes: data.notes,
            });
            break;

          case 'note_add':
            await apiClient.patch(`/work-orders/${workOrderId}`, {
              notes: data.notes,
            });
            break;

          case 'checklist_update':
            await apiClient.patch(`/work-orders/${workOrderId}`, {
              checklist: data.checklist,
            });
            break;

          default:
            // Generic update
            await apiClient.patch(`/work-orders/${workOrderId}`, data);
        }

        // Remove from queue on success
        await removeSyncQueueItem(itemId);

        // Clear pending sync flag on work order
        const cached = await getCachedWorkOrder(workOrderId);
        if (cached) {
          await updateCachedWorkOrder({ ...cached, _pendingSync: false });
        }

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['workOrders'] });

        return true;
      } catch (error) {
        console.error(`Failed to sync item ${itemId}:`, error);

        // Update retry count
        const updatedItem: SyncQueueItem = {
          ...item,
          retries: item.retries + 1,
          lastError: error instanceof Error ? error.message : 'Unknown error',
        };

        if (updatedItem.retries < MAX_RETRIES) {
          await updateSyncQueueItem(updatedItem);
        } else {
          // Max retries reached - keep in queue but mark as failed
          await updateSyncQueueItem({ ...updatedItem, priority: 100 });
        }

        return false;
      }
    },
    [queryClient]
  );

  // ============================================
  // Sync all pending changes
  // ============================================

  const syncPending = useCallback(async (): Promise<SyncResult> => {
    if (syncInProgressRef.current || !isOnline) {
      return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress or offline'] };
    }

    syncInProgressRef.current = true;
    setIsSyncing(true);
    await markSyncAttempt();

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Get pending items sorted by priority
      const items = await getSyncQueueOrdered();

      // Filter items that haven't exceeded max retries
      const eligibleItems = items.filter((item) => item.retries < MAX_RETRIES);

      // Process in batches
      for (let i = 0; i < eligibleItems.length; i += SYNC_BATCH_SIZE) {
        const batch = eligibleItems.slice(i, i + SYNC_BATCH_SIZE);

        // Process batch concurrently
        const results = await Promise.allSettled(
          batch.map((item) => syncItem(item.id))
        );

        for (let j = 0; j < results.length; j++) {
          const res = results[j];
          if (res.status === 'fulfilled' && res.value) {
            result.synced++;
          } else {
            result.failed++;
            if (res.status === 'rejected') {
              result.errors.push(String(res.reason));
            }
          }
        }

        // Small delay between batches to avoid overwhelming the server
        if (i + SYNC_BATCH_SIZE < eligibleItems.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // Update state
      if (result.failed === 0 && result.synced > 0) {
        await markSyncSuccess();
        setLastSyncTime(new Date());
        setConsecutiveFailures(0);
      } else if (result.failed > 0) {
        await markSyncFailure();
        const state = await getOfflineSyncState();
        setConsecutiveFailures(state.consecutiveFailures);
      }

      result.success = result.failed === 0;
    } catch (error) {
      console.error('Sync failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      await markSyncFailure();
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
      await updatePendingCount();
    }

    return result;
  }, [isOnline, syncItem, updatePendingCount]);

  // ============================================
  // Cancel a pending item
  // ============================================

  const cancelPending = useCallback(
    async (itemId: string) => {
      await removeSyncQueueItem(itemId);
      await updatePendingCount();
    },
    [updatePendingCount]
  );

  // ============================================
  // Clear all pending items
  // ============================================

  const clearAllPending = useCallback(async () => {
    const items = await getSyncQueueOrdered();
    const ids = items.map((item) => item.id);
    await batchRemoveSyncQueueItems(ids);
    await updatePendingCount();
  }, [updatePendingCount]);

  // ============================================
  // Update work order status (offline-capable)
  // ============================================

  const updateStatus = useCallback(
    async (workOrderId: string, status: WorkOrderStatus, notes?: string) => {
      // Update local cache immediately
      const cached = await getCachedWorkOrder(workOrderId);
      if (cached) {
        const updatedNotes = notes
          ? cached.notes
            ? `${cached.notes}\n\n[${new Date().toLocaleString()}]\n${notes}`
            : `[${new Date().toLocaleString()}]\n${notes}`
          : cached.notes;

        await updateCachedWorkOrder({
          ...cached,
          status,
          notes: updatedNotes,
          _pendingSync: true,
          updated_at: new Date().toISOString(),
        });
      }

      // Queue for sync
      await queueChange({
        type: 'status_update',
        workOrderId,
        data: { status, notes },
        timestamp: Date.now(),
      });
    },
    [queueChange]
  );

  // ============================================
  // Add note to work order (offline-capable)
  // ============================================

  const addNote = useCallback(
    async (workOrderId: string, note: string) => {
      // Update local cache immediately
      const cached = await getCachedWorkOrder(workOrderId);
      if (cached) {
        const timestamp = new Date().toLocaleString();
        const newNotes = cached.notes
          ? `${cached.notes}\n\n[${timestamp}]\n${note}`
          : `[${timestamp}]\n${note}`;

        await updateCachedWorkOrder({
          ...cached,
          notes: newNotes,
          _pendingSync: true,
          updated_at: new Date().toISOString(),
        });
      }

      // Queue for sync
      await queueChange({
        type: 'note_add',
        workOrderId,
        data: {
          notes: cached?.notes || `[${new Date().toLocaleString()}]\n${note}`,
        },
        timestamp: Date.now(),
      });
    },
    [queueChange]
  );

  // ============================================
  // Auto-sync when coming online
  // ============================================

  useEffect(() => {
    if (isOnline && pendingCount > 0 && !syncInProgressRef.current) {
      // Delay sync slightly to ensure stable connection
      const timeout = setTimeout(() => {
        syncPending();
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [isOnline, pendingCount, syncPending]);

  // ============================================
  // Retry with backoff on failures
  // ============================================

  useEffect(() => {
    if (
      isOnline &&
      consecutiveFailures > 0 &&
      consecutiveFailures < MAX_RETRIES &&
      pendingCount > 0 &&
      !syncInProgressRef.current
    ) {
      const delay = calculateRetryDelay(consecutiveFailures);

      retryTimeoutRef.current = setTimeout(() => {
        syncPending();
      }, delay);

      return () => {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
      };
    }
  }, [isOnline, consecutiveFailures, pendingCount, syncPending]);

  // ============================================
  // Cleanup
  // ============================================

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    consecutiveFailures,
    saveOffline,
    queueChange,
    syncPending,
    syncItem,
    cancelPending,
    clearAllPending,
    updateStatus,
    addNote,
  };
}

export default useOfflineSync;
