/**
 * OfflineIndicator - Offline status indicator for mobile
 *
 * Features:
 * - Connection status badge
 * - Pending changes count
 * - Last sync time
 * - Sync now button
 * - Works at 375px width minimum
 * - Large touch targets (44px min)
 */

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// ============================================
// Types
// ============================================

interface OfflineIndicatorProps {
  isOffline: boolean;
  pendingChanges?: number;
  lastSyncTime?: Date;
  onSyncNow?: () => Promise<void>;
  compact?: boolean;
  className?: string;
}

// ============================================
// Helper Functions
// ============================================

function formatLastSync(date: Date | undefined): string {
  if (!date) return "Never";

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

// ============================================
// Compact Indicator Component
// ============================================

interface CompactIndicatorProps {
  isOffline: boolean;
  pendingChanges?: number;
  onTap?: () => void;
}

function CompactIndicator({
  isOffline,
  pendingChanges = 0,
  onTap,
}: CompactIndicatorProps) {
  return (
    <button
      onClick={onTap}
      className="flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-2 touch-manipulation"
      aria-label={isOffline ? "Offline mode" : "Online"}
    >
      {/* Connection status dot */}
      <span
        className={cn(
          "w-2.5 h-2.5 rounded-full",
          isOffline ? "bg-warning animate-pulse" : "bg-success",
        )}
      />

      {/* Pending count badge */}
      {pendingChanges > 0 && (
        <Badge variant="warning" size="sm">
          {pendingChanges}
        </Badge>
      )}
    </button>
  );
}

// ============================================
// Full Indicator Component
// ============================================

interface FullIndicatorProps {
  isOffline: boolean;
  pendingChanges: number;
  lastSyncTime?: Date;
  onSyncNow?: () => Promise<void>;
  isSyncing: boolean;
}

function FullIndicator({
  isOffline,
  pendingChanges,
  lastSyncTime,
  onSyncNow,
  isSyncing,
}: FullIndicatorProps) {
  return (
    <div
      className={cn(
        "rounded-lg p-4",
        isOffline
          ? "bg-warning/10 border border-warning/20"
          : "bg-success/10 border border-success/20",
      )}
    >
      {/* Status Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "w-3 h-3 rounded-full",
              isOffline ? "bg-warning animate-pulse" : "bg-success",
            )}
          />
          <span
            className={cn(
              "font-semibold",
              isOffline ? "text-warning" : "text-success",
            )}
          >
            {isOffline ? "Offline Mode" : "Online"}
          </span>
        </div>

        {/* Sync Icon */}
        {isSyncing && (
          <svg
            className="w-5 h-5 animate-spin text-primary"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-text-secondary">Pending Changes</p>
          <p
            className={cn(
              "text-lg font-bold",
              pendingChanges > 0 ? "text-warning" : "text-text-primary",
            )}
          >
            {pendingChanges}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">Last Sync</p>
          <p className="text-lg font-bold text-text-primary">
            {formatLastSync(lastSyncTime)}
          </p>
        </div>
      </div>

      {/* Description */}
      {isOffline ? (
        <p className="text-sm text-warning mb-4">
          You are working offline. Changes will sync automatically when
          connection is restored.
        </p>
      ) : pendingChanges > 0 ? (
        <p className="text-sm text-text-secondary mb-4">
          You have {pendingChanges} change{pendingChanges !== 1 ? "s" : ""}{" "}
          waiting to sync.
        </p>
      ) : (
        <p className="text-sm text-success mb-4">All changes are synced.</p>
      )}

      {/* Sync Button */}
      {onSyncNow && !isOffline && pendingChanges > 0 && (
        <Button
          variant="primary"
          size="lg"
          onClick={onSyncNow}
          disabled={isSyncing}
          className="w-full min-h-[48px] touch-manipulation"
        >
          {isSyncing ? (
            <>
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Sync Now</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}

// ============================================
// Expandable Panel Component
// ============================================

interface ExpandablePanelProps {
  isOffline: boolean;
  pendingChanges: number;
  lastSyncTime?: Date;
  onSyncNow?: () => Promise<void>;
  isSyncing: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

function ExpandablePanel({
  isOffline,
  pendingChanges,
  lastSyncTime,
  onSyncNow,
  isSyncing,
  isExpanded,
  onToggle,
}: ExpandablePanelProps) {
  return (
    <div className="relative">
      {/* Compact trigger */}
      <CompactIndicator
        isOffline={isOffline}
        pendingChanges={pendingChanges}
        onTap={onToggle}
      />

      {/* Expanded panel */}
      {isExpanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={onToggle}
            aria-hidden="true"
          />

          {/* Panel */}
          <div className="absolute top-full right-0 mt-2 z-50 w-72 shadow-xl rounded-lg bg-bg-card border border-border">
            <FullIndicator
              isOffline={isOffline}
              pendingChanges={pendingChanges}
              lastSyncTime={lastSyncTime}
              onSyncNow={onSyncNow}
              isSyncing={isSyncing}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function OfflineIndicator({
  isOffline,
  pendingChanges = 0,
  lastSyncTime,
  onSyncNow,
  compact = false,
  className,
}: OfflineIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncNow = useCallback(async () => {
    if (!onSyncNow || isSyncing) return;

    setIsSyncing(true);
    try {
      await onSyncNow();
    } finally {
      setIsSyncing(false);
    }
  }, [onSyncNow, isSyncing]);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Compact mode - just show expandable badge
  if (compact) {
    return (
      <div className={className}>
        <ExpandablePanel
          isOffline={isOffline}
          pendingChanges={pendingChanges}
          lastSyncTime={lastSyncTime}
          onSyncNow={handleSyncNow}
          isSyncing={isSyncing}
          isExpanded={isExpanded}
          onToggle={handleToggle}
        />
      </div>
    );
  }

  // Full mode - show full indicator
  return (
    <div className={className}>
      <FullIndicator
        isOffline={isOffline}
        pendingChanges={pendingChanges}
        lastSyncTime={lastSyncTime}
        onSyncNow={handleSyncNow}
        isSyncing={isSyncing}
      />
    </div>
  );
}

// ============================================
// Offline Banner Component (for top of screen)
// ============================================

interface OfflineBannerProps {
  isOffline: boolean;
  pendingChanges?: number;
  onDismiss?: () => void;
}

export function OfflineBanner({
  isOffline,
  pendingChanges = 0,
  onDismiss,
}: OfflineBannerProps) {
  if (!isOffline) return null;

  return (
    <div className="bg-warning text-white px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
          />
        </svg>
        <span className="font-medium">
          Offline Mode
          {pendingChanges > 0 && ` - ${pendingChanges} pending`}
        </span>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-white/20 rounded min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
          aria-label="Dismiss"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

// ============================================
// Sync Status Toast Component
// ============================================

interface SyncStatusToastProps {
  status: "syncing" | "success" | "error";
  message?: string;
  onDismiss?: () => void;
}

export function SyncStatusToast({
  status,
  message,
  onDismiss,
}: SyncStatusToastProps) {
  const statusConfig = {
    syncing: {
      bg: "bg-primary",
      icon: (
        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ),
      defaultMessage: "Syncing changes...",
    },
    success: {
      bg: "bg-success",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ),
      defaultMessage: "All changes synced",
    },
    error: {
      bg: "bg-danger",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      ),
      defaultMessage: "Sync failed",
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 z-50 rounded-lg p-4 text-white flex items-center justify-between shadow-lg",
        config.bg,
      )}
    >
      <div className="flex items-center gap-3">
        {config.icon}
        <span className="font-medium">{message || config.defaultMessage}</span>
      </div>
      {onDismiss && status !== "syncing" && (
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-white/20 rounded min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
          aria-label="Dismiss"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default OfflineIndicator;
