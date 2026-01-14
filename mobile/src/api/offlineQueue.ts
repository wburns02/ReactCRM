/**
 * Offline Queue for CRM Mobile
 * Persists pending API requests to AsyncStorage for sync when back online
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiClient } from './client';

const QUEUE_KEY = 'offline_queue';
const MAX_RETRIES = 3;

export interface QueuedRequest {
  id: string;
  method: string;
  url: string;
  data?: unknown;
  headers?: Record<string, string>;
  timestamp: number;
  retries: number;
  entity?: string;
}

export interface SyncResult {
  success: number;
  failed: number;
  errors: string[];
}

class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private isInitialized = false;
  private isSyncing = false;
  private listeners: Set<() => void> = new Set();

  /**
   * Initialize queue from storage
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
      this.isInitialized = true;

      // Set up network listener for auto-sync
      NetInfo.addEventListener((state) => {
        if (state.isConnected && this.queue.length > 0 && !this.isSyncing) {
          this.sync();
        }
      });
    } catch (error) {
      console.error('Failed to initialize offline queue:', error);
      this.queue = [];
      this.isInitialized = true;
    }
  }

  /**
   * Add request to queue
   */
  async add(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retries'>): Promise<string> {
    await this.init();

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const queuedRequest: QueuedRequest = {
      ...request,
      id,
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(queuedRequest);
    await this.persist();
    this.notifyListeners();

    return id;
  }

  /**
   * Remove request from queue
   */
  async remove(id: string): Promise<void> {
    await this.init();
    this.queue = this.queue.filter((r) => r.id !== id);
    await this.persist();
    this.notifyListeners();
  }

  /**
   * Get all queued requests
   */
  async getAll(): Promise<QueuedRequest[]> {
    await this.init();
    return [...this.queue];
  }

  /**
   * Get queue count
   */
  async getCount(): Promise<number> {
    await this.init();
    return this.queue.length;
  }

  /**
   * Clear all queued requests
   */
  async clear(): Promise<void> {
    this.queue = [];
    await this.persist();
    this.notifyListeners();
  }

  /**
   * Sync all queued requests
   */
  async sync(): Promise<SyncResult> {
    await this.init();

    if (this.isSyncing || this.queue.length === 0) {
      return { success: 0, failed: 0, errors: [] };
    }

    // Check connectivity
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return { success: 0, failed: 0, errors: ['No network connection'] };
    }

    this.isSyncing = true;
    this.notifyListeners();

    const result: SyncResult = { success: 0, failed: 0, errors: [] };
    const toRemove: string[] = [];
    const toRetry: string[] = [];

    // Process queue in order
    for (const request of this.queue) {
      try {
        await apiClient.request({
          method: request.method,
          url: request.url,
          data: request.data,
          headers: request.headers,
        });
        result.success++;
        toRemove.push(request.id);
      } catch (error) {
        request.retries++;

        if (request.retries >= MAX_RETRIES) {
          result.failed++;
          result.errors.push(`Failed to sync ${request.method} ${request.url}`);
          toRemove.push(request.id);
        } else {
          toRetry.push(request.id);
        }
      }
    }

    // Remove processed requests
    this.queue = this.queue.filter(
      (r) => !toRemove.includes(r.id)
    );

    await this.persist();
    this.isSyncing = false;
    this.notifyListeners();

    return result;
  }

  /**
   * Retry a specific request
   */
  async retry(id: string): Promise<boolean> {
    await this.init();

    const request = this.queue.find((r) => r.id === id);
    if (!request) return false;

    try {
      await apiClient.request({
        method: request.method,
        url: request.url,
        data: request.data,
        headers: request.headers,
      });
      await this.remove(id);
      return true;
    } catch {
      request.retries++;
      await this.persist();
      return false;
    }
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Check if currently syncing
   */
  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Persist queue to storage
   */
  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to persist offline queue:', error);
    }
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const offlineQueue = new OfflineQueue();
