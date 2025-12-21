import { useState, useEffect } from 'react';

interface QueueItem {
  id: string;
  type: string;
  data: unknown;
  timestamp: number;
}

interface UseOfflineReturn {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  syncQueue: QueueItem[];
  addToQueue: (item: Omit<QueueItem, 'id' | 'timestamp'>) => void;
  syncNow: () => Promise<void>;
}

/**
 * Hook for managing offline state and sync queue
 * TODO: Implement full offline sync functionality with IndexedDB
 */
export function useOffline(): UseOfflineReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncQueue, setSyncQueue] = useState<QueueItem[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addToQueue = (item: Omit<QueueItem, 'id' | 'timestamp'>) => {
    const newItem: QueueItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setSyncQueue((prev) => [...prev, newItem]);
  };

  const syncNow = async () => {
    if (!isOnline || isSyncing || syncQueue.length === 0) return;

    setIsSyncing(true);
    try {
      // TODO: Implement actual sync logic
      // For now, just clear the queue
      setSyncQueue([]);
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isOnline,
    pendingCount: syncQueue.length,
    isSyncing,
    syncQueue,
    addToQueue,
    syncNow,
  };
}
