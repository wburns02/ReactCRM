import { useState, useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/usePWA';
import { useSyncStatus } from '@/hooks/useOffline';
import {
  getPhotoQueueStats,
  getSignatureStats,
} from '@/lib/db';

/**
 * Enhanced Offline Banner Component
 *
 * Features:
 * - Shows offline status with pending changes count
 * - Displays sync progress when online
 * - Shows photo and signature queue status
 * - Provides sync trigger button
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const syncStatus = useSyncStatus();
  const [photoStats, setPhotoStats] = useState({ pending: 0, uploading: 0, failed: 0 });
  const [sigStats, setSigStats] = useState({ pending: 0, failed: 0 });
  const [isExpanded, setIsExpanded] = useState(false);

  // Load media queue stats
  useEffect(() => {
    async function loadStats() {
      const [photos, signatures] = await Promise.all([
        getPhotoQueueStats(),
        getSignatureStats(),
      ]);
      setPhotoStats(photos);
      setSigStats(signatures);
    }
    loadStats();

    // Poll for updates
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalPending = syncStatus.pendingCount + photoStats.pending + sigStats.pending;
  const hasFailures = photoStats.failed > 0 || sigStats.failed > 0 || syncStatus.consecutiveFailures > 0;

  // Don't show if online and nothing pending
  if (isOnline && totalPending === 0 && !hasFailures) {
    return null;
  }

  // Determine banner color
  const getBannerColor = () => {
    if (!isOnline) return 'bg-gray-800';
    if (hasFailures) return 'bg-red-700';
    if (syncStatus.status === 'syncing') return 'bg-blue-700';
    if (totalPending > 0) return 'bg-yellow-700';
    return 'bg-green-700';
  };

  // Get status icon
  const getStatusIcon = () => {
    if (!isOnline) {
      return (
        <svg className="w-4 h-4 text-yellow-400 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.28 3.28a.75.75 0 011.06 0l16.38 16.38a.75.75 0 01-1.06 1.06L2.28 4.34a.75.75 0 010-1.06z"/>
          <path fillRule="evenodd" d="M4.5 10.5A7.5 7.5 0 0112 3a7.5 7.5 0 016.15 3.19l-1.06 1.06A6 6 0 0012 4.5a6 6 0 00-6 6c0 .98.24 1.91.66 2.72L5.6 14.28A7.5 7.5 0 014.5 10.5z"/>
          <path fillRule="evenodd" d="M12 6a4.5 4.5 0 00-4.5 4.5c0 .73.17 1.41.48 2.02l-1.06 1.06A6 6 0 016 10.5 6 6 0 0112 4.5a6 6 0 013.08.85l-1.06 1.06A4.5 4.5 0 0012 6z"/>
          <circle cx="12" cy="18" r="1.5"/>
        </svg>
      );
    }
    if (syncStatus.status === 'syncing') {
      return (
        <svg className="w-4 h-4 text-white animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      );
    }
    if (hasFailures) {
      return (
        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"/>
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"/>
      </svg>
    );
  };

  // Get status message
  const getStatusMessage = () => {
    if (!isOnline) {
      return (
        <>
          <strong>You&apos;re offline</strong>
          {totalPending > 0 && (
            <span className="ml-2 text-gray-300">
              ({totalPending} change{totalPending !== 1 ? 's' : ''} pending)
            </span>
          )}
        </>
      );
    }
    if (syncStatus.status === 'syncing') {
      return <span>Syncing changes...</span>;
    }
    if (hasFailures) {
      return (
        <span className="text-white">
          Sync issues detected
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-2 underline hover:no-underline"
          >
            {isExpanded ? 'Hide details' : 'View details'}
          </button>
        </span>
      );
    }
    if (totalPending > 0) {
      return (
        <span>
          {totalPending} change{totalPending !== 1 ? 's' : ''} pending sync
        </span>
      );
    }
    return <span>All changes synced</span>;
  };

  return (
    <div className={`${getBannerColor()} text-white px-4 py-2 text-sm transition-colors duration-300`}>
      <div className="flex items-center justify-center gap-2">
        {getStatusIcon()}
        <span>{getStatusMessage()}</span>

        {/* Expand/collapse for details */}
        {(totalPending > 1 || hasFailures) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-2 p-1 hover:bg-white/10 rounded"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z"/>
            </svg>
          </button>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-white/20 text-xs">
          <div className="flex flex-wrap justify-center gap-4">
            {syncStatus.pendingCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full"/>
                <span>{syncStatus.pendingCount} data changes</span>
              </div>
            )}
            {photoStats.pending > 0 && (
              <div className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-blue-400 rounded-full"/>
                <span>{photoStats.pending} photos</span>
              </div>
            )}
            {photoStats.uploading > 0 && (
              <div className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse"/>
                <span>{photoStats.uploading} uploading</span>
              </div>
            )}
            {sigStats.pending > 0 && (
              <div className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-purple-400 rounded-full"/>
                <span>{sigStats.pending} signatures</span>
              </div>
            )}
            {photoStats.failed > 0 && (
              <div className="flex items-center gap-1 text-red-300">
                <span className="inline-block w-2 h-2 bg-red-400 rounded-full"/>
                <span>{photoStats.failed} photos failed</span>
              </div>
            )}
            {sigStats.failed > 0 && (
              <div className="flex items-center gap-1 text-red-300">
                <span className="inline-block w-2 h-2 bg-red-400 rounded-full"/>
                <span>{sigStats.failed} signatures failed</span>
              </div>
            )}
          </div>

          {/* Last sync time */}
          {syncStatus.lastSync && (
            <div className="mt-2 text-center text-gray-400">
              Last sync: {syncStatus.lastSync.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact sync status indicator for use in headers
 */
export function SyncStatusIndicator() {
  const isOnline = useOnlineStatus();
  const syncStatus = useSyncStatus();
  const [photoStats, setPhotoStats] = useState({ pending: 0, uploading: 0, failed: 0 });

  useEffect(() => {
    async function loadStats() {
      const photos = await getPhotoQueueStats();
      setPhotoStats(photos);
    }
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalPending = syncStatus.pendingCount + photoStats.pending;

  if (isOnline && totalPending === 0 && syncStatus.status === 'idle') {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      {!isOnline && (
        <span className="flex items-center gap-1 text-yellow-600">
          <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"/>
          Offline
        </span>
      )}
      {isOnline && syncStatus.status === 'syncing' && (
        <span className="flex items-center gap-1 text-blue-600">
          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Syncing
        </span>
      )}
      {isOnline && totalPending > 0 && syncStatus.status !== 'syncing' && (
        <span className="flex items-center gap-1 text-text-secondary">
          <span className="w-2 h-2 bg-yellow-500 rounded-full"/>
          {totalPending}
        </span>
      )}
    </div>
  );
}

export default OfflineBanner;
