import { useOnlineStatus } from '@/hooks/usePWA';
import { useSyncStatus } from '@/hooks/useOffline';

/**
 * Offline Banner Component
 * Shows when the app goes offline with sync status
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const syncStatus = useSyncStatus();

  // Only show when offline
  if (isOnline) {
    return null;
  }

  return (
    <div className="bg-gray-800 text-white px-4 py-2 text-center text-sm">
      <div className="flex items-center justify-center gap-2">
        <svg className="w-4 h-4 text-yellow-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>
          <strong>You're offline</strong>
          {syncStatus.pendingCount > 0 && (
            <span className="ml-2 text-gray-300">
              ({syncStatus.pendingCount} change{syncStatus.pendingCount !== 1 ? 's' : ''} will sync when online)
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

export default OfflineBanner;
