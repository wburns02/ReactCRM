import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

/**
 * IndexedDB Schema for offline-first data storage
 */
interface CRMDatabase extends DBSchema {
  // Sync queue for offline mutations
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-timestamp': number;
      'by-type': string;
    };
  };
  // Cached customers
  customers: {
    key: number;
    value: CachedCustomer;
    indexes: {
      'by-updated': string;
    };
  };
  // Cached work orders
  workOrders: {
    key: string;
    value: CachedWorkOrder;
    indexes: {
      'by-updated': string;
      'by-status': string;
      'by-customer': number;
    };
  };
  // Cached technicians
  technicians: {
    key: number;
    value: CachedTechnician;
  };
  // App state (last sync time, etc.)
  appState: {
    key: string;
    value: unknown;
  };
}

export interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'customer' | 'workOrder' | 'invoice' | 'payment';
  data: unknown;
  timestamp: number;
  retries: number;
  lastError?: string;
}

export interface CachedCustomer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  updated_at: string;
  _cachedAt: number;
}

export interface CachedWorkOrder {
  id: string;
  customer_id: number;
  job_type: string;
  status: string;
  scheduled_date?: string;
  technician_id?: number;
  notes?: string;
  updated_at: string;
  _cachedAt: number;
}

export interface CachedTechnician {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  _cachedAt: number;
}

const DB_NAME = 'ecbtx-crm';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<CRMDatabase> | null = null;

/**
 * Get the database instance (creates if not exists)
 */
export async function getDB(): Promise<IDBPDatabase<CRMDatabase>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<CRMDatabase>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Sync Queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncStore.createIndex('by-timestamp', 'timestamp');
        syncStore.createIndex('by-type', 'type');
      }

      // Customers store
      if (!db.objectStoreNames.contains('customers')) {
        const customerStore = db.createObjectStore('customers', { keyPath: 'id' });
        customerStore.createIndex('by-updated', 'updated_at');
      }

      // Work Orders store
      if (!db.objectStoreNames.contains('workOrders')) {
        const workOrderStore = db.createObjectStore('workOrders', { keyPath: 'id' });
        workOrderStore.createIndex('by-updated', 'updated_at');
        workOrderStore.createIndex('by-status', 'status');
        workOrderStore.createIndex('by-customer', 'customer_id');
      }

      // Technicians store
      if (!db.objectStoreNames.contains('technicians')) {
        db.createObjectStore('technicians', { keyPath: 'id' });
      }

      // App State store
      if (!db.objectStoreNames.contains('appState')) {
        db.createObjectStore('appState');
      }
    },
  });

  return dbInstance;
}

// ============================================
// Sync Queue Operations
// ============================================

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const queueItem: SyncQueueItem = {
    ...item,
    id,
    timestamp: Date.now(),
    retries: 0,
  };
  await db.add('syncQueue', queueItem);
  return id;
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex('syncQueue', 'by-timestamp');
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('syncQueue', id);
}

export async function updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
  const db = await getDB();
  await db.put('syncQueue', item);
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDB();
  await db.clear('syncQueue');
}

// ============================================
// Customer Cache Operations
// ============================================

export async function cacheCustomers(customers: CachedCustomer[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('customers', 'readwrite');
  const now = Date.now();
  await Promise.all([
    ...customers.map((c) => tx.store.put({ ...c, _cachedAt: now })),
    tx.done,
  ]);
}

export async function getCachedCustomers(): Promise<CachedCustomer[]> {
  const db = await getDB();
  return db.getAll('customers');
}

export async function getCachedCustomer(id: number): Promise<CachedCustomer | undefined> {
  const db = await getDB();
  return db.get('customers', id);
}

// ============================================
// Work Order Cache Operations
// ============================================

export async function cacheWorkOrders(workOrders: CachedWorkOrder[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('workOrders', 'readwrite');
  const now = Date.now();
  await Promise.all([
    ...workOrders.map((wo) => tx.store.put({ ...wo, _cachedAt: now })),
    tx.done,
  ]);
}

export async function getCachedWorkOrders(): Promise<CachedWorkOrder[]> {
  const db = await getDB();
  return db.getAll('workOrders');
}

export async function getCachedWorkOrder(id: string): Promise<CachedWorkOrder | undefined> {
  const db = await getDB();
  return db.get('workOrders', id);
}

export async function getCachedWorkOrdersByStatus(status: string): Promise<CachedWorkOrder[]> {
  const db = await getDB();
  return db.getAllFromIndex('workOrders', 'by-status', status);
}

export async function getCachedWorkOrdersByCustomer(customerId: number): Promise<CachedWorkOrder[]> {
  const db = await getDB();
  return db.getAllFromIndex('workOrders', 'by-customer', customerId);
}

// ============================================
// Technician Cache Operations
// ============================================

export async function cacheTechnicians(technicians: CachedTechnician[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('technicians', 'readwrite');
  const now = Date.now();
  await Promise.all([
    ...technicians.map((t) => tx.store.put({ ...t, _cachedAt: now })),
    tx.done,
  ]);
}

export async function getCachedTechnicians(): Promise<CachedTechnician[]> {
  const db = await getDB();
  return db.getAll('technicians');
}

// ============================================
// App State Operations
// ============================================

export async function setAppState<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put('appState', value, key);
}

export async function getAppState<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get('appState', key) as Promise<T | undefined>;
}

export async function getLastSyncTime(): Promise<number | undefined> {
  return getAppState<number>('lastSyncTime');
}

export async function setLastSyncTime(time: number): Promise<void> {
  return setAppState('lastSyncTime', time);
}

// ============================================
// Utility Functions
// ============================================

export async function clearAllCaches(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear('customers'),
    db.clear('workOrders'),
    db.clear('technicians'),
  ]);
}

export async function getCacheStats(): Promise<{
  customers: number;
  workOrders: number;
  technicians: number;
  syncQueue: number;
  lastSync: number | undefined;
}> {
  const db = await getDB();
  const [customers, workOrders, technicians, syncQueue, lastSync] = await Promise.all([
    db.count('customers'),
    db.count('workOrders'),
    db.count('technicians'),
    db.count('syncQueue'),
    getLastSyncTime(),
  ]);
  return { customers, workOrders, technicians, syncQueue, lastSync };
}
