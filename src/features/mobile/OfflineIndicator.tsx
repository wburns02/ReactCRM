import { useState } from 'react';
import { useOffline } from '@/hooks/useOffline';
import { Button } from '@/components/ui/Button';

/**
 * Offline indicator component
 * Shows connection status and pending sync count
 */
export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, syncNow } = useOffline();
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncError(null);
    const result = await syncNow();
    if (result.errors.length > 0) {
      setSyncError(result.errors.join(', '));
    }
  };

  // Don't show anything if online, no pending items, and no errors
  if (isOnline && pendingCount === 0 && !syncError) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-warning text-white px-4 py-2 text-center text-sm font-medium">
          <div className="flex items-center justify-center gap-2">
            <span>⚠️</span>
            <span>You are offline. Changes will be synced when connection is restored.</span>
          </div>
        </div>
      )}

      {/* Syncing banner */}
      {isSyncing && (
        <div className="bg-primary text-white px-4 py-2 text-center text-sm font-medium">
          <div className="flex items-center justify-center gap-2">
            <span className="animate-spin">🔄</span>
            <span>Syncing changes...</span>
          </div>
        </div>
      )}

      {/* Pending changes banner */}
      {isOnline && pendingCount > 0 && !isSyncing && (
        <div className="bg-mac-dark-blue text-white px-4 py-2">
          <div className="flex items-center justify-between max-w-screen-xl mx-auto">
            <div className="flex items-center gap-2 text-sm">
              <span>📤</span>
              <span>
                {pendingCount} pending {pendingCount === 1 ? 'change' : 'changes'} to sync
              </span>
            </div>
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
      )}

      {/* Sync error banner */}
      {syncError && (
        <div className="bg-danger text-white px-4 py-2">
          <div className="flex items-center justify-between max-w-screen-xl mx-auto">
            <div className="flex items-center gap-2 text-sm">
              <span>❌</span>
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
  const { isOnline, pendingCount } = useOffline();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-xs">
      {!isOnline && <span className="text-warning">⚠️</span>}
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
  const { isOnline } = useOffline();

  if (isOnline) {
    return null;
  }

  return (
    <div className="bg-warning/10 border border-warning/20 rounded-md px-3 py-2 text-sm text-warning">
      <div className="flex items-center gap-2">
        <span>⚠️</span>
        <span>Offline - Changes will be queued for sync</span>
      </div>
    </div>
  );
}
