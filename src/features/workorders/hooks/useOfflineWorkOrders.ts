/**
 * useOfflineWorkOrders - Offline-first work order management
 *
 * Features:
 * - View assigned work orders offline
 * - Update status offline with optimistic updates
 * - Add notes offline
 * - Automatic sync when connectivity returns
 * - Conflict resolution with server-wins strategy
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { useOnlineStatus } from "@/hooks/usePWA";
import {
  getCachedWorkOrders,
  getCachedWorkOrder,
  getCachedWorkOrdersByTechnician,
  cacheWorkOrders,
  updateCachedWorkOrder,
  markWorkOrderPendingSync,
  clearWorkOrderPendingSync,
  getWorkOrdersWithPendingSync,
  addToSyncQueue,
  type CachedWorkOrder,
} from "@/lib/db";
import { workOrderKeys } from "@/api/hooks/useWorkOrders";
import type { WorkOrder, WorkOrderStatus } from "@/api/types/workOrder";

// ============================================
// Types
// ============================================

export interface OfflineWorkOrderUpdate {
  id: string;
  status?: WorkOrderStatus;
  notes?: string;
  priority?: string;
  [key: string]: unknown;
}

export interface UseOfflineWorkOrdersReturn {
  /** Work orders (from cache when offline, from server when online) */
  workOrders: CachedWorkOrder[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Current error if any */
  error: Error | null;
  /** Whether we're using cached data */
  isFromCache: boolean;
  /** Number of work orders pending sync */
  pendingSyncCount: number;
  /** Update a work order (works offline) */
  updateWorkOrder: (update: OfflineWorkOrderUpdate) => Promise<void>;
  /** Update work order status */
  updateStatus: (id: string, status: WorkOrderStatus) => Promise<void>;
  /** Add a note to work order */
  addNote: (id: string, note: string) => Promise<void>;
  /** Force refresh from server */
  refresh: () => Promise<void>;
  /** Sync pending changes */
  syncPending: () => Promise<void>;
  /** Get a single work order */
  getWorkOrder: (id: string) => Promise<CachedWorkOrder | undefined>;
}

// ============================================
// Helper Functions
// ============================================

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

export function useOfflineWorkOrders(
  technicianName?: string,
): UseOfflineWorkOrdersReturn {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();

  const [workOrders, setWorkOrders] = useState<CachedWorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Track if we've loaded from cache on mount
  const hasLoadedFromCache = useRef(false);

  // ============================================
  // Load work orders (from cache or server)
  // ============================================

  const loadWorkOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isOnline) {
        // Fetch from server
        const params = new URLSearchParams({
          page: "1",
          page_size: "200",
        });
        if (technicianName) {
          params.set("assigned_technician", technicianName);
        }

        const { data } = await apiClient.get(
          `/work-orders?${params.toString()}`,
        );
        const items = Array.isArray(data) ? data : data.items || [];

        // Convert and cache
        const cachedItems = items.map(workOrderToCache);
        await cacheWorkOrders(cachedItems);

        setWorkOrders(cachedItems);
        setIsFromCache(false);
      } else {
        // Load from cache
        const cached = technicianName
          ? await getCachedWorkOrdersByTechnician(technicianName)
          : await getCachedWorkOrders();

        setWorkOrders(cached);
        setIsFromCache(true);
      }

      // Update pending sync count
      const pending = await getWorkOrdersWithPendingSync();
      setPendingSyncCount(pending.length);
    } catch (err) {
      console.error("Failed to load work orders:", err);
      setError(err instanceof Error ? err : new Error(String(err)));

      // Fall back to cache if server fails
      if (!hasLoadedFromCache.current) {
        const cached = technicianName
          ? await getCachedWorkOrdersByTechnician(technicianName)
          : await getCachedWorkOrders();
        setWorkOrders(cached);
        setIsFromCache(true);
      }
    } finally {
      setIsLoading(false);
      hasLoadedFromCache.current = true;
    }
  }, [isOnline, technicianName]);

  // Load on mount and when online status changes
  useEffect(() => {
    loadWorkOrders();
  }, [loadWorkOrders]);

  // ============================================
  // Update work order (offline-capable)
  // ============================================

  const updateWorkOrder = useCallback(
    async (update: OfflineWorkOrderUpdate) => {
      const { id, ...changes } = update;

      // Get current work order from cache
      const current = await getCachedWorkOrder(id);
      if (!current) {
        throw new Error(`Work order ${id} not found in cache`);
      }

      // Apply optimistic update to cache
      const updated: CachedWorkOrder = {
        ...current,
        ...changes,
        updated_at: new Date().toISOString(),
        _cachedAt: Date.now(),
        _pendingSync: true,
      };
      await updateCachedWorkOrder(updated);

      // Update local state
      setWorkOrders((prev) => prev.map((wo) => (wo.id === id ? updated : wo)));

      if (isOnline) {
        // Sync immediately
        try {
          await apiClient.patch(`/work-orders/${id}`, changes);
          await clearWorkOrderPendingSync(id);

          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: workOrderKeys.detail(id) });
          queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
        } catch (err) {
          console.error("Failed to sync work order update:", err);
          // Keep in pending sync state - will retry later
          await addToSyncQueue({
            entity: "workOrder",
            type: "update",
            data: { id, ...changes },
            priority: 5,
          });
        }
      } else {
        // Queue for later sync
        await addToSyncQueue({
          entity: "workOrder",
          type: "update",
          data: { id, ...changes },
          priority: 5,
        });
        await markWorkOrderPendingSync(id);
      }

      // Update pending count
      const pending = await getWorkOrdersWithPendingSync();
      setPendingSyncCount(pending.length);
    },
    [isOnline, queryClient],
  );

  // ============================================
  // Update status shortcut
  // ============================================

  const updateStatus = useCallback(
    async (id: string, status: WorkOrderStatus) => {
      await updateWorkOrder({ id, status });
    },
    [updateWorkOrder],
  );

  // ============================================
  // Add note shortcut
  // ============================================

  const addNote = useCallback(
    async (id: string, note: string) => {
      const current = await getCachedWorkOrder(id);
      const existingNotes = current?.notes || "";
      const timestamp = new Date().toLocaleString();
      const newNotes = existingNotes
        ? `${existingNotes}\n\n[${timestamp}]\n${note}`
        : `[${timestamp}]\n${note}`;

      await updateWorkOrder({ id, notes: newNotes });
    },
    [updateWorkOrder],
  );

  // ============================================
  // Force refresh
  // ============================================

  const refresh = useCallback(async () => {
    await loadWorkOrders();
  }, [loadWorkOrders]);

  // ============================================
  // Sync pending changes
  // ============================================

  const syncPending = useCallback(async () => {
    if (!isOnline) {
      return;
    }

    const pending = await getWorkOrdersWithPendingSync();
    for (const wo of pending) {
      try {
        // Get the work order from cache with all pending changes
        const cached = await getCachedWorkOrder(wo.id);
        if (!cached) continue;

        // Extract only the fields that should be synced
        const syncData = {
          status: cached.status,
          notes: cached.notes,
          priority: cached.priority,
        };

        await apiClient.patch(`/work-orders/${wo.id}`, syncData);
        await clearWorkOrderPendingSync(wo.id);
      } catch (err) {
        console.error(`Failed to sync work order ${wo.id}:`, err);
      }
    }

    // Refresh after sync
    await loadWorkOrders();
  }, [isOnline, loadWorkOrders]);

  // ============================================
  // Get single work order
  // ============================================

  const getWorkOrder = useCallback(
    async (id: string): Promise<CachedWorkOrder | undefined> => {
      // Try cache first
      const cached = await getCachedWorkOrder(id);
      if (cached) return cached;

      // If online and not in cache, fetch
      if (isOnline) {
        try {
          const { data } = await apiClient.get(`/work-orders/${id}`);
          const cachedItem = workOrderToCache(data);
          await updateCachedWorkOrder(cachedItem);
          return cachedItem;
        } catch (err) {
          console.error(`Failed to fetch work order ${id}:`, err);
          return undefined;
        }
      }

      return undefined;
    },
    [isOnline],
  );

  // ============================================
  // Auto-sync when coming back online
  // ============================================

  useEffect(() => {
    if (isOnline && pendingSyncCount > 0) {
      syncPending();
    }
  }, [isOnline, pendingSyncCount, syncPending]);

  return {
    workOrders,
    isLoading,
    error,
    isFromCache,
    pendingSyncCount,
    updateWorkOrder,
    updateStatus,
    addNote,
    refresh,
    syncPending,
    getWorkOrder,
  };
}

// ============================================
// Single Work Order Hook (offline-capable)
// ============================================

export function useOfflineWorkOrder(id: string | undefined) {
  const isOnline = useOnlineStatus();
  const [workOrder, setWorkOrder] = useState<CachedWorkOrder | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);

  useEffect(() => {
    if (!id) {
      setWorkOrder(undefined);
      setIsLoading(false);
      return;
    }

    async function load() {
      if (!id) return;
      setIsLoading(true);

      // Try cache first
      const cached = await getCachedWorkOrder(id);

      if (isOnline) {
        try {
          const { data } = await apiClient.get(`/work-orders/${id}`);
          const cachedItem = workOrderToCache(data);
          await updateCachedWorkOrder(cachedItem);
          setWorkOrder(cachedItem);
          setIsFromCache(false);
        } catch (err) {
          console.error("Failed to fetch work order:", err);
          if (cached) {
            setWorkOrder(cached);
            setIsFromCache(true);
          }
        }
      } else {
        setWorkOrder(cached);
        setIsFromCache(true);
      }

      setIsLoading(false);
    }

    load();
  }, [id, isOnline]);

  return { workOrder, isLoading, isFromCache };
}
