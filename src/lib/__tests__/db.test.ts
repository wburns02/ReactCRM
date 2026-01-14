import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import {
  addToSyncQueue,
  getSyncQueue,
  getSyncQueueCount,
  getSyncQueueOrdered,
  removeSyncQueueItem,
  updateSyncQueueItem,
  clearSyncQueue,
  batchRemoveSyncQueueItems,
  getOfflineSyncState,
  setOfflineSyncState,
  markSyncAttempt,
  markSyncSuccess,
  markSyncFailure,
  setLastSyncTime,
  getLastSyncTime,
  checkDatabaseHealth,
} from "../db";

describe("IndexedDB Sync Queue", () => {
  beforeEach(async () => {
    // Clear the sync queue before each test
    await clearSyncQueue();
  });

  describe("addToSyncQueue", () => {
    it("should add an item to the sync queue", async () => {
      const id = await addToSyncQueue({
        type: "create",
        entity: "customer",
        data: { name: "Test Customer" },
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe("string");

      const queue = await getSyncQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].type).toBe("create");
      expect(queue[0].entity).toBe("customer");
      expect(queue[0].retries).toBe(0);
    });

    it("should auto-generate timestamp and retries", async () => {
      const before = Date.now();
      await addToSyncQueue({
        type: "update",
        entity: "workOrder",
        data: { id: "123", status: "completed" },
      });
      const after = Date.now();

      const queue = await getSyncQueue();
      expect(queue[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(queue[0].timestamp).toBeLessThanOrEqual(after);
      expect(queue[0].retries).toBe(0);
    });
  });

  describe("getSyncQueueCount", () => {
    it("should return correct count", async () => {
      expect(await getSyncQueueCount()).toBe(0);

      await addToSyncQueue({ type: "create", entity: "customer", data: {} });
      expect(await getSyncQueueCount()).toBe(1);

      await addToSyncQueue({ type: "update", entity: "workOrder", data: {} });
      expect(await getSyncQueueCount()).toBe(2);
    });
  });

  describe("getSyncQueueOrdered", () => {
    it("should return items ordered by priority then timestamp", async () => {
      // Add items with different priorities
      await addToSyncQueue({
        type: "delete",
        entity: "customer",
        data: {},
        priority: 15,
      });

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      await addToSyncQueue({
        type: "create",
        entity: "customer",
        data: {},
        priority: 5,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await addToSyncQueue({
        type: "update",
        entity: "workOrder",
        data: {},
        priority: 10,
      });

      const queue = await getSyncQueueOrdered();
      expect(queue).toHaveLength(3);
      // Higher priority (lower number) should come first
      expect(queue[0].priority).toBe(5);
      expect(queue[1].priority).toBe(10);
      expect(queue[2].priority).toBe(15);
    });
  });

  describe("removeSyncQueueItem", () => {
    it("should remove an item by id", async () => {
      const id = await addToSyncQueue({
        type: "create",
        entity: "customer",
        data: {},
      });

      expect(await getSyncQueueCount()).toBe(1);

      await removeSyncQueueItem(id);

      expect(await getSyncQueueCount()).toBe(0);
    });
  });

  describe("updateSyncQueueItem", () => {
    it("should update an existing item", async () => {
      const id = await addToSyncQueue({
        type: "create",
        entity: "customer",
        data: { name: "Original" },
      });

      const queue = await getSyncQueue();
      const item = queue.find((i) => i.id === id)!;

      await updateSyncQueueItem({
        ...item,
        retries: 2,
        lastError: "Connection failed",
      });

      const updatedQueue = await getSyncQueue();
      const updatedItem = updatedQueue.find((i) => i.id === id)!;

      expect(updatedItem.retries).toBe(2);
      expect(updatedItem.lastError).toBe("Connection failed");
    });
  });

  describe("batchRemoveSyncQueueItems", () => {
    it("should remove multiple items at once", async () => {
      const id1 = await addToSyncQueue({
        type: "create",
        entity: "customer",
        data: {},
      });
      const id2 = await addToSyncQueue({
        type: "update",
        entity: "workOrder",
        data: {},
      });
      await addToSyncQueue({ type: "delete", entity: "invoice", data: {} });

      expect(await getSyncQueueCount()).toBe(3);

      await batchRemoveSyncQueueItems([id1, id2]);

      expect(await getSyncQueueCount()).toBe(1);
    });
  });

  describe("clearSyncQueue", () => {
    it("should clear all items", async () => {
      await addToSyncQueue({ type: "create", entity: "customer", data: {} });
      await addToSyncQueue({ type: "update", entity: "workOrder", data: {} });

      expect(await getSyncQueueCount()).toBe(2);

      await clearSyncQueue();

      expect(await getSyncQueueCount()).toBe(0);
    });
  });
});

describe("Offline Sync State", () => {
  beforeEach(async () => {
    // Reset sync state
    await setOfflineSyncState({
      lastSyncAttempt: null,
      lastSuccessfulSync: null,
      consecutiveFailures: 0,
      isInitialized: false,
    });
  });

  describe("getOfflineSyncState / setOfflineSyncState", () => {
    it("should return default state when not set", async () => {
      const state = await getOfflineSyncState();
      expect(state.consecutiveFailures).toBe(0);
      expect(state.isInitialized).toBe(false);
    });

    it("should update state partially", async () => {
      await setOfflineSyncState({ isInitialized: true });

      const state = await getOfflineSyncState();
      expect(state.isInitialized).toBe(true);
      expect(state.consecutiveFailures).toBe(0);
    });
  });

  describe("markSyncAttempt", () => {
    it("should record sync attempt time", async () => {
      const before = Date.now();
      await markSyncAttempt();
      const after = Date.now();

      const state = await getOfflineSyncState();
      expect(state.lastSyncAttempt).toBeGreaterThanOrEqual(before);
      expect(state.lastSyncAttempt).toBeLessThanOrEqual(after);
    });
  });

  describe("markSyncSuccess", () => {
    it("should reset consecutive failures on success", async () => {
      await setOfflineSyncState({ consecutiveFailures: 3 });

      await markSyncSuccess();

      const state = await getOfflineSyncState();
      expect(state.consecutiveFailures).toBe(0);
      expect(state.lastSuccessfulSync).toBeDefined();
    });
  });

  describe("markSyncFailure", () => {
    it("should increment consecutive failures", async () => {
      await markSyncFailure();
      expect((await getOfflineSyncState()).consecutiveFailures).toBe(1);

      await markSyncFailure();
      expect((await getOfflineSyncState()).consecutiveFailures).toBe(2);
    });
  });
});

describe("Last Sync Time", () => {
  describe("setLastSyncTime / getLastSyncTime", () => {
    it("should store and retrieve last sync time", async () => {
      const time = Date.now();
      await setLastSyncTime(time);

      const retrieved = await getLastSyncTime();
      expect(retrieved).toBe(time);
    });
  });
});

describe("Database Health", () => {
  describe("checkDatabaseHealth", () => {
    it("should report healthy database", async () => {
      const health = await checkDatabaseHealth();
      expect(health.healthy).toBe(true);
      expect(health.error).toBeUndefined();
    });
  });
});
