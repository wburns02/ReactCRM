import { useState, useEffect, useCallback, useRef } from "react";
import { getSessionToken } from "@/lib/security.ts";

// ============================================
// Types
// ============================================

export type WebSocketStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "error";

export type WebSocketMessageType =
  | "dispatch_update"
  | "job_status"
  | "notification"
  | "work_order_update"
  | "schedule_change"
  | "payment_received"
  | "technician_location"
  | "system_message"
  | "ping"
  | "pong";

export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  payload: T;
  timestamp: string;
  id?: string;
}

export interface DispatchUpdatePayload {
  work_order_id: string | number;
  technician_id?: string | number;
  status: string;
  scheduled_date?: string;
  scheduled_time?: string;
}

export interface JobStatusPayload {
  work_order_id: string | number;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  updated_at: string;
  updated_by?: string;
}

export interface NotificationPayload {
  id: string;
  type: "work_order" | "schedule" | "payment" | "message" | "alert" | "system";
  title: string;
  body: string;
  action_url?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  sound?: boolean;
}

export interface UseWebSocketOptions {
  /** WebSocket URL (defaults to env or standard endpoint) */
  url?: string;
  /** Whether to auto-connect on mount */
  autoConnect?: boolean;
  /** Whether to auto-reconnect on disconnect */
  autoReconnect?: boolean;
  /** Maximum reconnect attempts (0 = infinite) */
  maxReconnectAttempts?: number;
  /** Base delay for reconnect in ms */
  reconnectBaseDelay?: number;
  /** Maximum delay for reconnect in ms */
  reconnectMaxDelay?: number;
  /** Heartbeat interval in ms (0 = disabled) */
  heartbeatInterval?: number;
  /** Handler for incoming messages */
  onMessage?: (message: WebSocketMessage) => void;
  /** Handler for connection status changes */
  onStatusChange?: (status: WebSocketStatus) => void;
  /** Handler for errors */
  onError?: (error: Event) => void;
}

export interface UseWebSocketReturn {
  /** Current connection status */
  status: WebSocketStatus;
  /** Whether WebSocket is connected */
  isConnected: boolean;
  /** Whether currently reconnecting */
  isReconnecting: boolean;
  /** Current reconnect attempt number */
  reconnectAttempt: number;
  /** Last error that occurred */
  lastError: string | null;
  /** Last message received */
  lastMessage: WebSocketMessage | null;
  /** Connect to WebSocket */
  connect: () => void;
  /** Disconnect from WebSocket */
  disconnect: () => void;
  /** Send a message */
  send: <T>(type: WebSocketMessageType, payload: T) => boolean;
  /** Send a raw message (JSON string) */
  sendRaw: (message: string) => boolean;
}

// ============================================
// Constants
// ============================================

const DEFAULT_WS_URL =
  import.meta.env.VITE_WS_URL ||
  (import.meta.env.PROD
    ? "wss://react-crm-api-production.up.railway.app/api/v2/ws"
    : "ws://localhost:5001/api/v2/ws");

const DEFAULT_OPTIONS: Required<
  Omit<UseWebSocketOptions, "onMessage" | "onStatusChange" | "onError">
> = {
  url: DEFAULT_WS_URL,
  autoConnect: true,
  autoReconnect: true,
  maxReconnectAttempts: 10,
  reconnectBaseDelay: 1000,
  reconnectMaxDelay: 30000,
  heartbeatInterval: 30000,
};

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate exponential backoff delay with jitter
 */
function getReconnectDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  // Add jitter (0-25% of delay)
  const jitter = exponentialDelay * 0.25 * Math.random();
  // Cap at max delay
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================
// Main Hook
// ============================================

/**
 * Hook for managing WebSocket connections with auto-reconnect
 *
 * Features:
 * - Auto-connect on mount (optional)
 * - Exponential backoff reconnection
 * - Heartbeat/ping-pong keepalive
 * - Message type handling
 * - Graceful degradation
 */
export function useWebSocket(
  options: UseWebSocketOptions = {},
): UseWebSocketReturn {
  // Filter out undefined values so they don't override defaults
  const definedOptions = Object.fromEntries(
    Object.entries(options).filter(([, v]) => v !== undefined),
  );
  const opts = { ...DEFAULT_OPTIONS, ...definedOptions };

  // State
  const [status, setStatus] = useState<WebSocketStatus>("disconnected");
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  // Refs to avoid stale closures
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const isManualDisconnectRef = useRef(false);
  const statusRef = useRef(status);
  const reconnectAttemptRef = useRef(reconnectAttempt);

  // Keep refs in sync
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    reconnectAttemptRef.current = reconnectAttempt;
  }, [reconnectAttempt]);

  // ============================================
  // Cleanup Functions
  // ============================================

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    clearReconnectTimeout();
    clearHeartbeat();
  }, [clearReconnectTimeout, clearHeartbeat]);

  // ============================================
  // WebSocket Event Handlers
  // ============================================

  const handleOpen = useCallback(() => {
    setStatus("connected");
    setReconnectAttempt(0);
    setLastError(null);
    opts.onStatusChange?.("connected");

    // Start heartbeat
    if (opts.heartbeatInterval > 0 && wsRef.current) {
      heartbeatIntervalRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "ping",
              timestamp: new Date().toISOString(),
            }),
          );
        }
      }, opts.heartbeatInterval);
    }
  }, [opts]);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        // Handle pong (heartbeat response) silently
        if (message.type === "pong") {
          return;
        }

        setLastMessage(message);
        opts.onMessage?.(message);
      } catch (error) {
        console.error("[WebSocket] Failed to parse message:", error);
      }
    },
    [opts],
  );

  const handleError = useCallback(
    (event: Event) => {
      console.error("[WebSocket] Error:", event);
      setLastError("WebSocket connection error");
      setStatus("error");
      opts.onError?.(event);
      opts.onStatusChange?.("error");
    },
    [opts],
  );

  const scheduleReconnect = useCallback(() => {
    if (isManualDisconnectRef.current || !opts.autoReconnect) {
      return;
    }

    if (
      opts.maxReconnectAttempts > 0 &&
      reconnectAttemptRef.current >= opts.maxReconnectAttempts
    ) {
      console.warn("[WebSocket] Max reconnect attempts reached");
      setStatus("disconnected");
      opts.onStatusChange?.("disconnected");
      return;
    }

    const delay = getReconnectDelay(
      reconnectAttemptRef.current,
      opts.reconnectBaseDelay,
      opts.reconnectMaxDelay,
    );

    setStatus("reconnecting");
    opts.onStatusChange?.("reconnecting");

    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempt((prev) => prev + 1);
      // The connect function will be called by the effect that watches reconnectAttempt
    }, delay);
  }, [opts]);

  const handleClose = useCallback(
    (event: CloseEvent) => {
      clearHeartbeat();

      if (isManualDisconnectRef.current) {
        setStatus("disconnected");
        opts.onStatusChange?.("disconnected");
        return;
      }

      // Clean close codes that shouldn't trigger reconnect
      const cleanCloseCodes = [1000, 1001];
      if (cleanCloseCodes.includes(event.code) && !opts.autoReconnect) {
        setStatus("disconnected");
        opts.onStatusChange?.("disconnected");
        return;
      }

      scheduleReconnect();
    },
    [opts, clearHeartbeat, scheduleReconnect],
  );

  // ============================================
  // Connection Functions
  // ============================================

  const connect = useCallback(() => {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      if (
        wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING
      ) {
        wsRef.current.close();
      }
    }

    cleanup();
    isManualDisconnectRef.current = false;

    try {
      // Validate WebSocket URL before attempting connection
      if (
        !opts.url ||
        (!opts.url.startsWith("ws://") && !opts.url.startsWith("wss://"))
      ) {
        console.info(
          "[WebSocket] No valid WebSocket URL configured, skipping connection",
        );
        setStatus("disconnected");
        return;
      }

      setStatus("connecting");
      opts.onStatusChange?.("connecting");

      // Add auth token to WebSocket URL if available
      const token = getSessionToken();
      let wsUrl: URL;
      try {
        wsUrl = new URL(opts.url);
      } catch {
        console.info("[WebSocket] Invalid WebSocket URL, skipping connection");
        setStatus("disconnected");
        return;
      }
      if (token) {
        wsUrl.searchParams.set("token", token);
      }

      wsRef.current = new WebSocket(wsUrl.toString());
      wsRef.current.onopen = handleOpen;
      wsRef.current.onmessage = handleMessage;
      wsRef.current.onerror = handleError;
      wsRef.current.onclose = handleClose;
    } catch (error) {
      console.error("[WebSocket] Failed to create connection:", error);
      setLastError(
        error instanceof Error ? error.message : "Failed to connect",
      );
      setStatus("error");
      opts.onStatusChange?.("error");
      scheduleReconnect();
    }
  }, [
    opts,
    cleanup,
    handleOpen,
    handleMessage,
    handleError,
    handleClose,
    scheduleReconnect,
  ]);

  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    cleanup();

    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;

      if (
        wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING
      ) {
        wsRef.current.close(1000, "Client disconnect");
      }
      wsRef.current = null;
    }

    setStatus("disconnected");
    setReconnectAttempt(0);
    opts.onStatusChange?.("disconnected");
  }, [cleanup, opts]);

  // ============================================
  // Send Functions
  // ============================================

  const send = useCallback(
    <T>(type: WebSocketMessageType, payload: T): boolean => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.warn("[WebSocket] Cannot send message: not connected");
        return false;
      }

      try {
        const message: WebSocketMessage<T> = {
          type,
          payload,
          timestamp: new Date().toISOString(),
          id: generateMessageId(),
        };
        wsRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error("[WebSocket] Failed to send message:", error);
        return false;
      }
    },
    [],
  );

  const sendRaw = useCallback((message: string): boolean => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("[WebSocket] Cannot send message: not connected");
      return false;
    }

    try {
      wsRef.current.send(message);
      return true;
    } catch (error) {
      console.error("[WebSocket] Failed to send raw message:", error);
      return false;
    }
  }, []);

  // ============================================
  // Auto-connect Effect
  // ============================================

  useEffect(() => {
    if (opts.autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
    // Only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // Reconnect on Auth Change
  // ============================================

  useEffect(() => {
    const handleAuthChange = () => {
      // Reconnect with new auth token
      if (
        statusRef.current === "connected" ||
        statusRef.current === "connecting"
      ) {
        disconnect();
        setTimeout(connect, 100);
      }
    };

    const handleAuthExpired = () => {
      disconnect();
    };

    window.addEventListener("auth:change", handleAuthChange);
    window.addEventListener("auth:expired", handleAuthExpired);

    return () => {
      window.removeEventListener("auth:change", handleAuthChange);
      window.removeEventListener("auth:expired", handleAuthExpired);
    };
  }, [connect, disconnect]);

  // ============================================
  // Reconnect on Network Online
  // ============================================

  useEffect(() => {
    const handleOnline = () => {
      if (
        statusRef.current === "disconnected" ||
        statusRef.current === "error"
      ) {
        setReconnectAttempt(0);
        connect();
      }
    };

    const handleOffline = () => {
      // Don't disconnect, let the connection fail naturally
      // This allows the connection to resume if we come back online quickly
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [connect]);

  // ============================================
  // Reconnect Trigger Effect
  // ============================================

  useEffect(() => {
    if (reconnectAttempt > 0 && status === "reconnecting") {
      connect();
    }
    // Only trigger on reconnectAttempt change when status is reconnecting
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconnectAttempt]);

  return {
    status,
    isConnected: status === "connected",
    isReconnecting: status === "reconnecting",
    reconnectAttempt,
    lastError,
    lastMessage,
    connect,
    disconnect,
    send,
    sendRaw,
  };
}

// ============================================
// Message Type Guards
// ============================================

export function isDispatchUpdate(
  message: WebSocketMessage,
): message is WebSocketMessage<DispatchUpdatePayload> {
  return message.type === "dispatch_update";
}

export function isJobStatus(
  message: WebSocketMessage,
): message is WebSocketMessage<JobStatusPayload> {
  return message.type === "job_status";
}

export function isNotification(
  message: WebSocketMessage,
): message is WebSocketMessage<NotificationPayload> {
  return message.type === "notification";
}

// ============================================
// Presence Types
// ============================================

export interface PresenceUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: "online" | "away" | "busy";
  currentPage?: string;
  lastSeen: string;
}

export interface TechnicianLocation {
  technicianId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: string;
  workOrderId?: string;
}

// ============================================
// Presence Hook
// ============================================

/**
 * Tracks online users and their status
 */
export function usePresence(ws: UseWebSocketReturn, currentPage?: string) {
  const [users, setUsers] = useState<PresenceUser[]>([]);

  // Update presence when page changes
  useEffect(() => {
    if (ws.isConnected) {
      ws.send("system_message", {
        action: "presence_update",
        status: "online",
        currentPage,
      });
    }
  }, [ws, currentPage]);

  // Listen for presence updates
  useEffect(() => {
    if (ws.lastMessage?.type === "system_message") {
      const payload = ws.lastMessage.payload as {
        action?: string;
        users?: PresenceUser[];
        user?: PresenceUser;
      };
      if (payload.action === "presence_list" && payload.users) {
        setUsers(payload.users);
      } else if (payload.action === "user_joined" && payload.user) {
        setUsers((prev) => [
          ...prev.filter((u) => u.id !== payload.user!.id),
          payload.user!,
        ]);
      } else if (payload.action === "user_left" && payload.user) {
        setUsers((prev) => prev.filter((u) => u.id !== payload.user!.id));
      }
    }
  }, [ws.lastMessage]);

  return {
    users,
    onlineCount: users.filter((u) => u.status === "online").length,
  };
}

// ============================================
// Technician Location Hook
// ============================================

/**
 * Real-time technician location tracking
 */
export function useTechnicianLocations(ws: UseWebSocketReturn) {
  const [locations, setLocations] = useState<Map<string, TechnicianLocation>>(
    new Map(),
  );

  useEffect(() => {
    if (ws.lastMessage?.type === "technician_location") {
      const location = ws.lastMessage.payload as TechnicianLocation;
      setLocations((prev) => {
        const updated = new Map(prev);
        updated.set(location.technicianId, location);
        return updated;
      });
    }
  }, [ws.lastMessage]);

  const getLocation = useCallback(
    (technicianId: string) => {
      return locations.get(technicianId);
    },
    [locations],
  );

  const getAllLocations = useCallback(() => {
    return Array.from(locations.values());
  }, [locations]);

  return {
    locations,
    getLocation,
    getAllLocations,
  };
}

// ============================================
// WebSocket Event Constants
// ============================================

export const WS_EVENTS = {
  // Dispatch & Work Orders
  DISPATCH_UPDATE: "dispatch_update" as const,
  WORK_ORDER_UPDATE: "work_order_update" as const,
  JOB_STATUS: "job_status" as const,

  // Schedule
  SCHEDULE_CHANGE: "schedule_change" as const,

  // Payments
  PAYMENT_RECEIVED: "payment_received" as const,

  // Technician
  TECHNICIAN_LOCATION: "technician_location" as const,

  // Notifications
  NOTIFICATION: "notification" as const,

  // System
  SYSTEM_MESSAGE: "system_message" as const,
  PING: "ping" as const,
  PONG: "pong" as const,
} as const;

export type WSEventType = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];
