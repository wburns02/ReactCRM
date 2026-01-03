import { useState } from 'react';
import { useOffline, useSyncStatus } from '@/hooks/useOffline';
import { Button } from '@/components/ui/Button';

/**
 * Offline indicator component
 * Shows connection status and pending sync count with enhanced functionality
 */
export function OfflineIndicator() {
  const {
    isOnline,
    pendingCount,
    isSyncing,
    syncQueue,
    lastSyncTime,
    isInitialized,
    dbError,
    syncNow,
    retryItem,
    removeItem,
  } = useOffline();
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleSync = async () => {
    setSyncError(null);
    const result = await syncNow();
    if (result.errors.length > 0) {
      setSyncError(result.errors.join(', '));
    }
  };

  const handleRetry = async (id: string) => {
    setSyncError(null);
    const success = await retryItem(id);
    if (!success) {
      setSyncError('Retry failed - please try again');
    }
  };

  const handleRemove = async (id: string) => {
    await removeItem(id);
  };

  // Don't render until initialized
  if (!isInitialized) {
    return null;
  }

  // Show database error if any
  if (dbError) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="bg-danger text-white px-4 py-2 text-center text-sm font-medium">
          <div className="flex items-center justify-center gap-2">
            <span>Database Error: {dbError}</span>
          </div>
        </div>
      </div>
    );
  }

  // Don't show anything if online, no pending items, and no errors
  if (isOnline && pendingCount === 0 && !syncError) {
    return null;
  }

  // Get failed items (retries >= 3)
  const failedItems = syncQueue.filter(item => item.retries >= 3);

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-warning text-white px-4 py-2 text-center text-sm font-medium">
          <div className="flex items-center justify-center gap-2">
            <span className="animate-pulse">You are offline. Changes will be synced when connection is restored.</span>
          </div>
        </div>
      )}

      {/* Syncing banner */}
      {isSyncing && (
        <div className="bg-primary text-white px-4 py-2 text-center text-sm font-medium">
          <div className="flex items-center justify-center gap-2">
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            <span>Syncing changes...</span>
          </div>
        </div>
      )}

      {/* Pending changes banner */}
      {isOnline && pendingCount > 0 && !isSyncing && (
        <div className="bg-mac-dark-blue text-white px-4 py-2">
          <div className="flex items-center justify-between max-w-screen-xl mx-auto">
            <div className="flex items-center gap-2 text-sm">
              <span>
                {pendingCount} pending {pendingCount === 1 ? 'change' : 'changes'} to sync
              </span>
              {lastSyncTime && (
                <span className="text-white/70 text-xs">
                  Last sync: {formatRelativeTime(lastSyncTime)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="text-white hover:bg-white/20"
              >
                {showDetails ? 'Hide' : 'Details'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSync}
                className="text-white hover:bg-white/20"
              >
                Sync Now
              </Button>
            </div>
          </div>

          {/* Expandable details */}
          {showDetails && (
            <div className="mt-2 pt-2 border-t border-white/20 max-w-screen-xl mx-auto">
              <div className="space-y-1 text-xs">
                {syncQueue.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-1">
                    <span>
                      {item.type.toUpperCase()} {item.entity}
                      {item.retries > 0 && (
                        <span className="text-warning ml-2">
                          ({item.retries} retries)
                        </span>
                      )}
                    </span>
                    <div className="flex gap-1">
                      {item.retries >= 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRetry(item.id)}
                          className="text-white hover:bg-white/20 text-xs h-6 px-2"
                        >
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(item.id)}
                        className="text-white/70 hover:bg-white/20 text-xs h-6 px-2"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Failed items warning */}
      {failedItems.length > 0 && !showDetails && (
        <div className="bg-danger/90 text-white px-4 py-2">
          <div className="flex items-center justify-between max-w-screen-xl mx-auto">
            <div className="flex items-center gap-2 text-sm">
              <span>
                {failedItems.length} {failedItems.length === 1 ? 'change' : 'changes'} failed to sync
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(true)}
              className="text-white hover:bg-white/20"
            >
              View Details
            </Button>
          </div>
        </div>
      )}

      {/* Sync error banner */}
      {syncError && (
        <div className="bg-danger text-white px-4 py-2">
          <div className="flex items-center justify-between max-w-screen-xl mx-auto">
            <div className="flex items-center gap-2 text-sm">
              <span>Sync failed: {syncError}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSyncError(null)}
              className="text-white hover:bg-white/20"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact offline indicator (for mobile bottom bar)
 */
export function CompactOfflineIndicator() {
  const { isOnline, pendingCount, isSyncing } = useOffline();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-xs">
      {!isOnline && <span className="text-warning animate-pulse">Offline</span>}
      {isSyncing && (
        <span className="animate-spin inline-block w-3 h-3 border border-primary border-t-transparent rounded-full" />
      )}
      {pendingCount > 0 && (
        <span className="bg-danger text-white rounded-full px-2 py-0.5 font-medium">
          {pendingCount}
        </span>
      )}
    </div>
  );
}

/**
 * Inline offline status (for forms/buttons)
 */
export function InlineOfflineStatus() {
  const { isOnline, pendingCount } = useOffline();

  if (isOnline) {
    return null;
  }

  return (
    <div className="bg-warning/10 border border-warning/20 rounded-md px-3 py-2 text-sm text-warning">
      <div className="flex items-center gap-2">
        <span className="animate-pulse">Offline</span>
        <span>Changes will be queued for sync</span>
        {pendingCount > 0 && (
          <span className="text-xs">({pendingCount} pending)</span>
        )}
      </div>
    </div>
  );
}

/**
 * Sync status badge for header/nav
 */
export function SyncStatusBadge() {
  const status = useSyncStatus();

  // Don't show when healthy and idle
  if (status.isHealthy && status.status === 'idle') {
    return null;
  }

  const statusColors = {
    idle: 'bg-gray-500',
    syncing: 'bg-primary animate-pulse',
    error: 'bg-danger',
    offline: 'bg-warning',
  };

  return (
    <div className="relative">
      <div
        className={`w-2 h-2 rounded-full ${statusColors[status.status]}`}
        title={status.message}
      />
      {status.pendingCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] rounded-full w-3 h-3 flex items-center justify-center">
          {status.pendingCount > 9 ? '9+' : status.pendingCount}
        </span>
      )}
    </div>
  );
}

/**
 * Detailed sync status panel (for settings/debug)
 */
export function SyncStatusPanel() {
  const {
    isOnline,
    pendingCount,
    isSyncing,
    syncQueue,
    lastSyncTime,
    isInitialized,
    dbError,
    syncNow,
    clearQueue,
  } = useOffline();

  const [isClearing, setIsClearing] = useState(false);

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear all pending changes? This cannot be undone.')) {
      setIsClearing(true);
      try {
        await clearQueue();
      } finally {
        setIsClearing(false);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <h3 className="font-medium text-gray-900">Offline Sync Status</h3>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Connection:</span>
          <span className={`ml-2 font-medium ${isOnline ? 'text-success' : 'text-warning'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Status:</span>
          <span className="ml-2 font-medium">
            {isSyncing ? 'Syncing...' : isInitialized ? 'Ready' : 'Initializing...'}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Pending:</span>
          <span className="ml-2 font-medium">{pendingCount} items</span>
        </div>
        <div>
          <span className="text-gray-500">Last Sync:</span>
          <span className="ml-2 font-medium">
            {lastSyncTime ? formatRelativeTime(lastSyncTime) : 'Never'}
          </span>
        </div>
      </div>

      {dbError && (
        <div className="bg-danger/10 text-danger text-sm rounded p-2">
          Database Error: {dbError}
        </div>
      )}

      {syncQueue.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Pending Changes</h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {syncQueue.map(item => (
              <div key={item.id} className="text-xs bg-gray-50 rounded p-2 flex justify-between">
                <span>
                  {item.type} {item.entity}
                  {item.retries > 0 && ` (${item.retries} retries)`}
                </span>
                <span className="text-gray-400">
                  {formatRelativeTime(item.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => syncNow()}
          disabled={!isOnline || isSyncing || pendingCount === 0}
        >
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={isClearing || pendingCount === 0}
          className="text-danger hover:bg-danger/10"
        >
          {isClearing ? 'Clearing...' : 'Clear Queue'}
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Helper Functions
// ============================================

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
