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
      'by-technician': string;
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
  // Offline photo queue
  photoQueue: {
    key: string;
    value: QueuedPhoto;
    indexes: {
      'by-workOrder': string;
      'by-status': string;
      'by-timestamp': number;
    };
  };
  // Offline signatures
  signatures: {
    key: string;
    value: StoredSignature;
    indexes: {
      'by-workOrder': string;
      'by-status': string;
    };
  };
}

export interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'customer' | 'workOrder' | 'invoice' | 'payment' | 'prospect' | 'activity';
  data: unknown;
  timestamp: number;
  retries: number;
  lastError?: string;
  /** Original request URL for raw HTTP queue items */
  url?: string;
  /** HTTP method for raw HTTP queue items */
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Priority for processing order (lower = higher priority) */
  priority?: number;
}

export interface OfflineRequest {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data: unknown;
  headers?: Record<string, string>;
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
  priority?: string;
  scheduled_date?: string;
  time_window_start?: string;
  time_window_end?: string;
  estimated_duration_hours?: number;
  technician_id?: number;
  assigned_technician?: string;
  assigned_vehicle?: string;
  service_address_line1?: string;
  service_city?: string;
  service_state?: string;
  service_postal_code?: string;
  notes?: string;
  customer_name?: string;
  updated_at: string;
  _cachedAt: number;
  _isOffline?: boolean; // True if created/modified offline
  _pendingSync?: boolean; // True if changes not yet synced
}

export interface CachedTechnician {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  _cachedAt: number;
}

export interface QueuedPhoto {
  id: string;
  workOrderId: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  capturedAt: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  uploadProgress?: number;
  retries: number;
  lastError?: string;
  uploadedUrl?: string;
}

export interface StoredSignature {
  id: string;
  workOrderId: string;
  signatureData: string; // base64 PNG
  signerName: string;
  signerType: 'customer' | 'technician';
  capturedAt: number;
  status: 'pending' | 'uploaded' | 'failed';
  retries: number;
  lastError?: string;
}

const DB_NAME = 'ecbtx-crm';
const DB_VERSION = 2; // Bumped for new stores

let dbInstance: IDBPDatabase<CRMDatabase> | null = null;

/**
 * Get the database instance (creates if not exists)
 */
export async function getDB(): Promise<IDBPDatabase<CRMDatabase>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<CRMDatabase>(DB_NAME, DB_VERSION, {
    upgrade(db, _oldVersion, _newVersion) {
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
        workOrderStore.createIndex('by-technician', 'assigned_technician');
      }

      // Technicians store
      if (!db.objectStoreNames.contains('technicians')) {
        db.createObjectStore('technicians', { keyPath: 'id' });
      }

      // App State store
      if (!db.objectStoreNames.contains('appState')) {
        db.createObjectStore('appState');
      }

      // Photo Queue store (new in v2)
      if (!db.objectStoreNames.contains('photoQueue')) {
        const photoStore = db.createObjectStore('photoQueue', { keyPath: 'id' });
        photoStore.createIndex('by-workOrder', 'workOrderId');
        photoStore.createIndex('by-status', 'status');
        photoStore.createIndex('by-timestamp', 'capturedAt');
      }

      // Signatures store (new in v2)
      if (!db.objectStoreNames.contains('signatures')) {
        const sigStore = db.createObjectStore('signatures', { keyPath: 'id' });
        sigStore.createIndex('by-workOrder', 'workOrderId');
        sigStore.createIndex('by-status', 'status');
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

// ============================================
// Enhanced Sync Queue Operations
// ============================================

/**
 * Get sync queue count without fetching all items
 */
export async function getSyncQueueCount(): Promise<number> {
  const db = await getDB();
  return db.count('syncQueue');
}

/**
 * Get sync queue items sorted by priority and timestamp
 */
export async function getSyncQueueOrdered(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  const items = await db.getAllFromIndex('syncQueue', 'by-timestamp');
  // Sort by priority (lower first), then by timestamp (older first)
  return items.sort((a, b) => {
    const priorityDiff = (a.priority ?? 10) - (b.priority ?? 10);
    if (priorityDiff !== 0) return priorityDiff;
    return a.timestamp - b.timestamp;
  });
}

/**
 * Get items that have failed and need attention (max retries reached)
 */
export async function getFailedSyncItems(maxRetries: number = 3): Promise<SyncQueueItem[]> {
  const db = await getDB();
  const items = await db.getAll('syncQueue');
  return items.filter(item => item.retries >= maxRetries);
}

/**
 * Batch update multiple sync queue items
 */
export async function batchUpdateSyncQueue(items: SyncQueueItem[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  await Promise.all([
    ...items.map(item => tx.store.put(item)),
    tx.done,
  ]);
}

/**
 * Batch remove multiple sync queue items by ID
 */
export async function batchRemoveSyncQueueItems(ids: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  await Promise.all([
    ...ids.map(id => tx.store.delete(id)),
    tx.done,
  ]);
}

// ============================================
// Offline Sync State Persistence
// ============================================

const SYNC_STATE_KEY = 'offlineSyncState';

export interface OfflineSyncState {
  lastSyncAttempt: number | null;
  lastSuccessfulSync: number | null;
  consecutiveFailures: number;
  isInitialized: boolean;
}

const DEFAULT_SYNC_STATE: OfflineSyncState = {
  lastSyncAttempt: null,
  lastSuccessfulSync: null,
  consecutiveFailures: 0,
  isInitialized: false,
};

export async function getOfflineSyncState(): Promise<OfflineSyncState> {
  const state = await getAppState<OfflineSyncState>(SYNC_STATE_KEY);
  return state ?? DEFAULT_SYNC_STATE;
}

export async function setOfflineSyncState(state: Partial<OfflineSyncState>): Promise<void> {
  const currentState = await getOfflineSyncState();
  await setAppState(SYNC_STATE_KEY, { ...currentState, ...state });
}

export async function markSyncAttempt(): Promise<void> {
  await setOfflineSyncState({ lastSyncAttempt: Date.now() });
}

export async function markSyncSuccess(): Promise<void> {
  await setOfflineSyncState({
    lastSuccessfulSync: Date.now(),
    consecutiveFailures: 0,
  });
}

export async function markSyncFailure(): Promise<void> {
  const state = await getOfflineSyncState();
  await setOfflineSyncState({
    consecutiveFailures: state.consecutiveFailures + 1,
  });
}

// ============================================
// Database Health & Recovery
// ============================================

/**
 * Check if IndexedDB is available and working
 */
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; error?: string }> {
  try {
    const db = await getDB();
    // Test basic operations
    await db.count('syncQueue');
    return { healthy: true };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

/**
 * Reset database connection (useful for recovery)
 */
export async function resetDatabaseConnection(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  // Re-initialize
  await getDB();
}

/**
 * Export all sync queue items for backup/debugging
 */
export async function exportSyncQueue(): Promise<string> {
  const items = await getSyncQueue();
  return JSON.stringify(items, null, 2);
}

/**
 * Import sync queue items from backup
 */
export async function importSyncQueue(jsonData: string): Promise<number> {
  const items = JSON.parse(jsonData) as SyncQueueItem[];
  const db = await getDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  await Promise.all([
    ...items.map(item => tx.store.put(item)),
    tx.done,
  ]);
  return items.length;
}

// ============================================
// Photo Queue Operations
// ============================================

/**
 * Add a photo to the offline queue
 */
export async function addPhotoToQueue(photo: Omit<QueuedPhoto, 'id' | 'retries' | 'status'>): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const queuedPhoto: QueuedPhoto = {
    ...photo,
    id,
    status: 'pending',
    retries: 0,
  };
  await db.add('photoQueue', queuedPhoto);
  return id;
}

/**
 * Get all pending photos for a work order
 */
export async function getPhotosForWorkOrder(workOrderId: string): Promise<QueuedPhoto[]> {
  const db = await getDB();
  return db.getAllFromIndex('photoQueue', 'by-workOrder', workOrderId);
}

/**
 * Get all pending photos
 */
export async function getPendingPhotos(): Promise<QueuedPhoto[]> {
  const db = await getDB();
  return db.getAllFromIndex('photoQueue', 'by-status', 'pending');
}

/**
 * Update photo status
 */
export async function updatePhotoStatus(
  id: string,
  status: QueuedPhoto['status'],
  uploadedUrl?: string,
  error?: string
): Promise<void> {
  const db = await getDB();
  const photo = await db.get('photoQueue', id);
  if (photo) {
    const updated: QueuedPhoto = {
      ...photo,
      status,
      uploadedUrl: uploadedUrl ?? photo.uploadedUrl,
      lastError: error ?? photo.lastError,
      retries: status === 'failed' ? photo.retries + 1 : photo.retries,
    };
    await db.put('photoQueue', updated);
  }
}

/**
 * Update photo upload progress
 */
export async function updatePhotoProgress(id: string, progress: number): Promise<void> {
  const db = await getDB();
  const photo = await db.get('photoQueue', id);
  if (photo) {
    await db.put('photoQueue', { ...photo, uploadProgress: progress, status: 'uploading' });
  }
}

/**
 * Remove a photo from the queue
 */
export async function removePhotoFromQueue(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('photoQueue', id);
}

/**
 * Get photo queue stats
 */
export async function getPhotoQueueStats(): Promise<{
  pending: number;
  uploading: number;
  uploaded: number;
  failed: number;
}> {
  const db = await getDB();
  const [pending, uploading, uploaded, failed] = await Promise.all([
    db.countFromIndex('photoQueue', 'by-status', 'pending'),
    db.countFromIndex('photoQueue', 'by-status', 'uploading'),
    db.countFromIndex('photoQueue', 'by-status', 'uploaded'),
    db.countFromIndex('photoQueue', 'by-status', 'failed'),
  ]);
  return { pending, uploading, uploaded, failed };
}

// ============================================
// Signature Operations
// ============================================

/**
 * Store a signature for later upload
 */
export async function storeSignature(signature: Omit<StoredSignature, 'id' | 'retries' | 'status'>): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const storedSig: StoredSignature = {
    ...signature,
    id,
    status: 'pending',
    retries: 0,
  };
  await db.add('signatures', storedSig);
  return id;
}

/**
 * Get signature for a work order
 */
export async function getSignatureForWorkOrder(workOrderId: string): Promise<StoredSignature | undefined> {
  const db = await getDB();
  const signatures = await db.getAllFromIndex('signatures', 'by-workOrder', workOrderId);
  return signatures[0]; // Return most recent
}

/**
 * Get all pending signatures
 */
export async function getPendingSignatures(): Promise<StoredSignature[]> {
  const db = await getDB();
  return db.getAllFromIndex('signatures', 'by-status', 'pending');
}

/**
 * Update signature status
 */
export async function updateSignatureStatus(
  id: string,
  status: StoredSignature['status'],
  error?: string
): Promise<void> {
  const db = await getDB();
  const sig = await db.get('signatures', id);
  if (sig) {
    const updated: StoredSignature = {
      ...sig,
      status,
      lastError: error ?? sig.lastError,
      retries: status === 'failed' ? sig.retries + 1 : sig.retries,
    };
    await db.put('signatures', updated);
  }
}

/**
 * Remove a signature from storage
 */
export async function removeSignature(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('signatures', id);
}

/**
 * Get signature stats
 */
export async function getSignatureStats(): Promise<{
  pending: number;
  uploaded: number;
  failed: number;
}> {
  const db = await getDB();
  const [pending, uploaded, failed] = await Promise.all([
    db.countFromIndex('signatures', 'by-status', 'pending'),
    db.countFromIndex('signatures', 'by-status', 'uploaded'),
    db.countFromIndex('signatures', 'by-status', 'failed'),
  ]);
  return { pending, uploaded, failed };
}

// ============================================
// Enhanced Work Order Cache with Technician Filter
// ============================================

/**
 * Get cached work orders for a specific technician
 */
export async function getCachedWorkOrdersByTechnician(technicianName: string): Promise<CachedWorkOrder[]> {
  const db = await getDB();
  return db.getAllFromIndex('workOrders', 'by-technician', technicianName);
}

/**
 * Update a single cached work order
 */
export async function updateCachedWorkOrder(workOrder: CachedWorkOrder): Promise<void> {
  const db = await getDB();
  await db.put('workOrders', { ...workOrder, _cachedAt: Date.now() });
}

/**
 * Mark a cached work order as having pending sync
 */
export async function markWorkOrderPendingSync(id: string): Promise<void> {
  const db = await getDB();
  const wo = await db.get('workOrders', id);
  if (wo) {
    await db.put('workOrders', { ...wo, _pendingSync: true });
  }
}

/**
 * Clear pending sync flag for a work order
 */
export async function clearWorkOrderPendingSync(id: string): Promise<void> {
  const db = await getDB();
  const wo = await db.get('workOrders', id);
  if (wo) {
    await db.put('workOrders', { ...wo, _pendingSync: false });
  }
}

/**
 * Get all work orders with pending sync
 */
export async function getWorkOrdersWithPendingSync(): Promise<CachedWorkOrder[]> {
  const db = await getDB();
  const all = await db.getAll('workOrders');
  return all.filter(wo => wo._pendingSync === true);
}
