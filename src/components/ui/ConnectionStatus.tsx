import { useState, useEffect, memo } from "react";
import { useOptionalWebSocketContext } from "@/providers/WebSocketProvider";
import { useSyncStatus } from "@/hooks/useOffline";
import { cn } from "@/lib/utils";

// ============================================
// Types
// ============================================

export type ConnectionState =
  | "online"
  | "offline"
  | "connecting"
  | "syncing"
  | "error";

export interface ConnectionStatusProps {
  /** Whether to show text label (default: false for compact mode) */
  showLabel?: boolean;
  /** Whether to show tooltip on hover (default: true) */
  showTooltip?: boolean;
  /** Custom class name */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

// ============================================
// Constants
// ============================================

const STATUS_CONFIG: Record<
  ConnectionState,
  {
    color: string;
    bgColor: string;
    label: string;
    icon: string;
    pulse?: boolean;
  }
> = {
  online: {
    color: "text-success",
    bgColor: "bg-success",
    label: "Connected",
    icon: "check",
  },
  offline: {
    color: "text-text-muted",
    bgColor: "bg-text-muted",
    label: "Offline",
    icon: "offline",
  },
  connecting: {
    color: "text-warning",
    bgColor: "bg-warning",
    label: "Connecting...",
    icon: "connecting",
    pulse: true,
  },
  syncing: {
    color: "text-info",
    bgColor: "bg-info",
    label: "Syncing...",
    icon: "sync",
    pulse: true,
  },
  error: {
    color: "text-danger",
    bgColor: "bg-danger",
    label: "Connection Error",
    icon: "error",
  },
};

const SIZE_CONFIG = {
  sm: {
    dot: "w-2 h-2",
    container: "gap-1.5 text-xs",
    icon: "w-3 h-3",
  },
  md: {
    dot: "w-2.5 h-2.5",
    container: "gap-2 text-sm",
    icon: "w-4 h-4",
  },
  lg: {
    dot: "w-3 h-3",
    container: "gap-2.5 text-base",
    icon: "w-5 h-5",
  },
};

// ============================================
// Icons
// ============================================

function StatusIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case "check":
      return (
        <svg
          className={className}
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
      );
    case "offline":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-1.414-3.536A5 5 0 019.172 8.464L6.343 5.636A9 9 0 003.636 18.364M21 3l-9.5 9.5"
          />
        </svg>
      );
    case "connecting":
      return (
        <svg
          className={cn(className, "animate-spin")}
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      );
    case "sync":
      return (
        <svg
          className={cn(className, "animate-spin")}
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
      );
    case "error":
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );
    default:
      return null;
  }
}

// ============================================
// Component
// ============================================

/**
 * Connection Status Indicator
 *
 * Shows the current connection state with visual feedback:
 * - Online: Green dot/checkmark
 * - Offline: Gray dot with offline icon
 * - Connecting: Yellow pulsing dot with spinner
 * - Syncing: Blue pulsing dot with sync icon
 * - Error: Red dot with warning icon
 *
 * Integrates with:
 * - Browser online/offline status
 * - WebSocket connection status
 * - Offline sync status
 */
export const ConnectionStatus = memo(function ConnectionStatus({
  showLabel = false,
  showTooltip = true,
  className,
  size = "sm",
}: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const wsContext = useOptionalWebSocketContext();
  const syncStatus = useSyncStatus();

  // Track browser online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Determine overall connection state
  const getConnectionState = (): ConnectionState => {
    // Offline takes precedence
    if (!isOnline) {
      return "offline";
    }

    // Check WebSocket status
    if (wsContext) {
      if (wsContext.status === "error") {
        return "error";
      }
      if (
        wsContext.status === "connecting" ||
        wsContext.status === "reconnecting"
      ) {
        return "connecting";
      }
    }

    // Check sync status
    if (syncStatus.status === "syncing") {
      return "syncing";
    }

    if (syncStatus.status === "error") {
      return "error";
    }

    return "online";
  };

  const state = getConnectionState();
  const config = STATUS_CONFIG[state];
  const sizeConfig = SIZE_CONFIG[size];

  // Build detailed tooltip
  const getTooltipContent = (): string => {
    const lines: string[] = [config.label];

    if (!isOnline) {
      lines.push("Browser is offline");
    }

    if (wsContext) {
      lines.push(`WebSocket: ${wsContext.status}`);
      if (wsContext.reconnectAttempt > 0) {
        lines.push(`Reconnect attempt: ${wsContext.reconnectAttempt}`);
      }
    }

    if (syncStatus.pendingCount > 0) {
      lines.push(`${syncStatus.pendingCount} changes pending sync`);
    }

    if (syncStatus.lastSync) {
      lines.push(`Last sync: ${syncStatus.lastSync.toLocaleTimeString()}`);
    }

    return lines.join("\n");
  };

  return (
    <div
      className={cn(
        "inline-flex items-center",
        sizeConfig.container,
        config.color,
        className,
      )}
      title={showTooltip ? getTooltipContent() : undefined}
      role="status"
      aria-label={config.label}
    >
      {/* Status Dot */}
      <span className="relative flex">
        <span
          className={cn(
            "rounded-full",
            sizeConfig.dot,
            config.bgColor,
            config.pulse && "animate-pulse",
          )}
        />
        {config.pulse && (
          <span
            className={cn(
              "absolute inline-flex rounded-full opacity-75 animate-ping",
              sizeConfig.dot,
              config.bgColor,
            )}
          />
        )}
      </span>

      {/* Label */}
      {showLabel && <span className="font-medium">{config.label}</span>}
    </div>
  );
});

// ============================================
// Extended Status Component
// ============================================

export interface ConnectionStatusExtendedProps {
  className?: string;
}

/**
 * Extended Connection Status with more detail
 *
 * Shows:
 * - Connection status with icon
 * - WebSocket status
 * - Pending sync count
 * - Last sync time
 */
export const ConnectionStatusExtended = memo(function ConnectionStatusExtended({
  className,
}: ConnectionStatusExtendedProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const wsContext = useOptionalWebSocketContext();
  const syncStatus = useSyncStatus();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const getOverallState = (): ConnectionState => {
    if (!isOnline) return "offline";
    if (wsContext?.status === "error") return "error";
    if (
      wsContext?.status === "connecting" ||
      wsContext?.status === "reconnecting"
    )
      return "connecting";
    if (syncStatus.status === "syncing") return "syncing";
    if (syncStatus.status === "error") return "error";
    return "online";
  };

  const state = getOverallState();
  const config = STATUS_CONFIG[state];

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg bg-bg-card border border-border",
        className,
      )}
    >
      {/* Main Status */}
      <div className={cn("flex items-center gap-2", config.color)}>
        <StatusIcon type={config.icon} className="w-4 h-4" />
        <span className="font-medium text-sm">{config.label}</span>
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-border" />

      {/* Details */}
      <div className="flex items-center gap-3 text-xs text-text-muted">
        {/* WebSocket Status */}
        {wsContext && (
          <span className="flex items-center gap-1">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                wsContext.isConnected ? "bg-success" : "bg-text-muted",
              )}
            />
            WS
          </span>
        )}

        {/* Pending Sync */}
        {syncStatus.pendingCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            {syncStatus.pendingCount} pending
          </span>
        )}

        {/* Last Sync */}
        {syncStatus.lastSync && (
          <span>
            Last sync:{" "}
            {syncStatus.lastSync.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
});

// ============================================
// Minimal Dot Indicator
// ============================================

export interface ConnectionDotProps {
  className?: string;
}

/**
 * Minimal connection dot indicator
 * Just shows a colored dot based on connection state
 */
export const ConnectionDot = memo(function ConnectionDot({
  className,
}: ConnectionDotProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const wsContext = useOptionalWebSocketContext();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const isConnected = isOnline && (!wsContext || wsContext.isConnected);
  const isConnecting = isOnline && wsContext?.isReconnecting;

  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full",
        isConnected
          ? "bg-success"
          : isConnecting
            ? "bg-warning animate-pulse"
            : "bg-text-muted",
        className,
      )}
      role="status"
      aria-label={
        isConnected ? "Connected" : isConnecting ? "Connecting" : "Disconnected"
      }
    />
  );
});
