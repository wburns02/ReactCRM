/**
 * Sync Engine - Conflict Resolution and Exponential Backoff
 *
 * Features:
 * - Server-wins conflict resolution with user notification
 * - Exponential backoff for retry logic
 * - Priority-based sync order
 * - Batch processing for efficiency
 * - Sync status tracking
 */

import { apiClient } from "@/api/client";
import {
  getSyncQueueOrdered,
  updateSyncQueueItem,
  batchRemoveSyncQueueItems,
  setLastSyncTime,
  markSyncSuccess,
  markSyncFailure,
  type SyncQueueItem,
} from "./db";

// ============================================
// Types
// ============================================

export interface SyncEngineConfig {
  /** Maximum retry attempts before giving up */
  maxRetries: number;
  /** Base delay for exponential backoff (ms) */
  baseDelay: number;
  /** Maximum delay between retries (ms) */
  maxDelay: number;
  /** Timeout for individual requests (ms) */
  requestTimeout: number;
  /** Enable server-wins conflict resolution */
  serverWinsConflict: boolean;
}

export interface SyncResult {
  success: number;
  failed: number;
  conflicts: number;
  errors: SyncError[];
  syncedItems: string[];
  failedItems: string[];
  conflictItems: ConflictInfo[];
}

export interface SyncError {
  itemId: string;
  entity: string;
  message: string;
  code?: string;
  retryable: boolean;
}

export interface ConflictInfo {
  itemId: string;
  entity: string;
  localData: unknown;
  serverData: unknown;
  resolution: "server_wins" | "local_wins" | "merged";
  resolvedAt: number;
}

export type SyncEventType =
  | "sync_start"
  | "sync_complete"
  | "sync_error"
  | "item_synced"
  | "item_failed"
  | "conflict_detected"
  | "conflict_resolved";

export interface SyncEvent {
  type: SyncEventType;
  timestamp: number;
  data?: unknown;
}

type SyncEventHandler = (event: SyncEvent) => void;

// ============================================
// Default Configuration
// ============================================

const DEFAULT_CONFIG: SyncEngineConfig = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  requestTimeout: 30000,
  serverWinsConflict: true,
};

// ============================================
// Sync Engine Class
// ============================================

export class SyncEngine {
  private config: SyncEngineConfig;
  private isSyncing: boolean = false;
  private eventHandlers: Set<SyncEventHandler> = new Set();
  private conflictHistory: ConflictInfo[] = [];
  private abortController: AbortController | null = null;

  constructor(config: Partial<SyncEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================
  // Event Handling
  // ============================================

  on(handler: SyncEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emit(type: SyncEventType, data?: unknown): void {
    const event: SyncEvent = {
      type,
      timestamp: Date.now(),
      data,
    };
    this.eventHandlers.forEach((handler) => handler(event));
  }

  // ============================================
  // Exponential Backoff
  // ============================================

  private calculateBackoff(retryCount: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.config.baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, this.config.maxDelay);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================
  // Conflict Resolution
  // ============================================

  private async resolveConflict(
    item: SyncQueueItem,
    serverData: unknown,
  ): Promise<ConflictInfo> {
    const conflict: ConflictInfo = {
      itemId: item.id,
      entity: item.entity,
      localData: item.data,
      serverData,
      resolution: "server_wins",
      resolvedAt: Date.now(),
    };

    if (this.config.serverWinsConflict) {
      // Server wins - we'll discard local changes
      conflict.resolution = "server_wins";
      this.emit("conflict_resolved", conflict);
    }

    this.conflictHistory.push(conflict);
    return conflict;
  }

  // ============================================
  // Item Processing
  // ============================================

  private async processItem(item: SyncQueueItem): Promise<{
    success: boolean;
    conflict?: ConflictInfo;
    error?: SyncError;
  }> {
    try {
      // Handle raw URL-based requests
      if (item.url && item.method) {
        await this.executeRequest(item.method, item.url, item.data);
        return { success: true };
      }

      // Handle entity-based requests
      const endpoint = this.getEndpointForEntity(item.entity);

      switch (item.type) {
        case "create":
          await apiClient.post(endpoint, item.data);
          break;
        case "update": {
          const updateData = item.data as {
            id: string | number;
            [key: string]: unknown;
          };
          try {
            await apiClient.patch(`${endpoint}/${updateData.id}`, item.data);
          } catch (err: unknown) {
            // Check for conflict (409)
            const error = err as {
              response?: { status: number; data: unknown };
            };
            if (error.response?.status === 409) {
              const conflict = await this.resolveConflict(
                item,
                error.response.data,
              );
              this.emit("conflict_detected", conflict);
              // For server-wins, we consider this a "success" since we accept server version
              return { success: true, conflict };
            }
            throw err;
          }
          break;
        }
        case "delete": {
          const deleteData = item.data as { id: string | number };
          try {
            await apiClient.delete(`${endpoint}/${deleteData.id}`);
          } catch (err: unknown) {
            // 404 on delete means already deleted - not an error
            const error = err as { response?: { status: number } };
            if (error.response?.status === 404) {
              return { success: true };
            }
            throw err;
          }
          break;
        }
      }

      return { success: true };
    } catch (err: unknown) {
      const error = err as { response?: { status: number }; message?: string };
      const syncError: SyncError = {
        itemId: item.id,
        entity: item.entity,
        message: error.message || "Unknown error",
        code: error.response?.status?.toString(),
        retryable: this.isRetryableError(error),
      };
      return { success: false, error: syncError };
    }
  }

  private async executeRequest(
    method: "POST" | "PUT" | "PATCH" | "DELETE",
    url: string,
    data: unknown,
  ): Promise<unknown> {
    switch (method) {
      case "POST":
        return apiClient.post(url, data);
      case "PUT":
        return apiClient.put(url, data);
      case "PATCH":
        return apiClient.patch(url, data);
      case "DELETE":
        return apiClient.delete(url);
    }
  }

  private isRetryableError(error: { response?: { status: number } }): boolean {
    const status = error.response?.status;
    if (!status) return true; // Network errors are retryable
    // 5xx errors and some 4xx are retryable
    return status >= 500 || status === 408 || status === 429;
  }

  private getEndpointForEntity(entity: SyncQueueItem["entity"]): string {
    switch (entity) {
      case "customer":
        return "/customers";
      case "workOrder":
        return "/work-orders";
      case "invoice":
        return "/invoices";
      case "payment":
        return "/payments";
      case "prospect":
        return "/prospects";
      case "activity":
        return "/activities";
      default:
        throw new Error(`Unknown entity type: ${entity}`);
    }
  }

  // ============================================
  // Main Sync Process
  // ============================================

  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: 0,
        failed: 0,
        conflicts: 0,
        errors: [],
        syncedItems: [],
        failedItems: [],
        conflictItems: [],
      };
    }

    if (!navigator.onLine) {
      return {
        success: 0,
        failed: 0,
        conflicts: 0,
        errors: [
          { itemId: "", entity: "", message: "Offline", retryable: true },
        ],
        syncedItems: [],
        failedItems: [],
        conflictItems: [],
      };
    }

    this.isSyncing = true;
    this.abortController = new AbortController();

    const result: SyncResult = {
      success: 0,
      failed: 0,
      conflicts: 0,
      errors: [],
      syncedItems: [],
      failedItems: [],
      conflictItems: [],
    };

    this.emit("sync_start");

    try {
      const queue = await getSyncQueueOrdered();

      if (queue.length === 0) {
        await markSyncSuccess();
        await setLastSyncTime(Date.now());
        this.emit("sync_complete", result);
        return result;
      }

      const successIds: string[] = [];

      for (const item of queue) {
        // Check if aborted or offline
        if (this.abortController.signal.aborted || !navigator.onLine) {
          break;
        }

        // Check retry limit
        if (item.retries >= this.config.maxRetries) {
          result.errors.push({
            itemId: item.id,
            entity: item.entity,
            message: `Max retries (${this.config.maxRetries}) exceeded`,
            retryable: false,
          });
          result.failedItems.push(item.id);
          result.failed++;
          continue;
        }

        // Apply backoff if this is a retry
        if (item.retries > 0) {
          const backoffDelay = this.calculateBackoff(item.retries);
          await this.delay(backoffDelay);
        }

        const itemResult = await this.processItem(item);

        if (itemResult.success) {
          successIds.push(item.id);
          result.syncedItems.push(item.id);
          result.success++;

          if (itemResult.conflict) {
            result.conflicts++;
            result.conflictItems.push(itemResult.conflict);
          }

          this.emit("item_synced", { itemId: item.id, entity: item.entity });
        } else {
          // Update retry count
          const updatedItem: SyncQueueItem = {
            ...item,
            retries: item.retries + 1,
            lastError: itemResult.error?.message || "Unknown error",
          };
          await updateSyncQueueItem(updatedItem);

          if (!itemResult.error?.retryable) {
            result.failedItems.push(item.id);
            result.failed++;
          }

          if (itemResult.error) {
            result.errors.push(itemResult.error);
          }

          this.emit("item_failed", {
            itemId: item.id,
            error: itemResult.error,
          });
        }
      }

      // Batch remove successful items
      if (successIds.length > 0) {
        await batchRemoveSyncQueueItems(successIds);
      }

      // Update sync state
      const now = Date.now();
      await setLastSyncTime(now);

      if (result.failed === 0) {
        await markSyncSuccess();
      } else {
        await markSyncFailure();
      }

      this.emit("sync_complete", result);
    } catch (error) {
      console.error("Sync engine error:", error);
      result.errors.push({
        itemId: "",
        entity: "",
        message: String(error),
        retryable: true,
      });
      this.emit("sync_error", error);
      await markSyncFailure();
    } finally {
      this.isSyncing = false;
      this.abortController = null;
    }

    return result;
  }

  // ============================================
  // Control Methods
  // ============================================

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  getStatus(): { isSyncing: boolean; conflictCount: number } {
    return {
      isSyncing: this.isSyncing,
      conflictCount: this.conflictHistory.length,
    };
  }

  getConflictHistory(): ConflictInfo[] {
    return [...this.conflictHistory];
  }

  clearConflictHistory(): void {
    this.conflictHistory = [];
  }
}

// ============================================
// Singleton Instance
// ============================================

let syncEngineInstance: SyncEngine | null = null;

export function getSyncEngine(config?: Partial<SyncEngineConfig>): SyncEngine {
  if (!syncEngineInstance) {
    syncEngineInstance = new SyncEngine(config);
  }
  return syncEngineInstance;
}

export function resetSyncEngine(): void {
  if (syncEngineInstance) {
    syncEngineInstance.abort();
  }
  syncEngineInstance = null;
}
