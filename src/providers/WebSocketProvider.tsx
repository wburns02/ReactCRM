import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useWebSocket,
  type WebSocketStatus,
  type WebSocketMessage,
  type WebSocketMessageType,
  type UseWebSocketReturn,
} from "@/hooks/useWebSocket";

// ============================================
// Types
// ============================================

export interface QueuedMessage {
  id: string;
  type: WebSocketMessageType;
  payload: unknown;
  timestamp: number;
  retries: number;
}

export interface WebSocketContextValue extends UseWebSocketReturn {
  /** Messages queued while disconnected */
  messageQueue: QueuedMessage[];
  /** Queue a message to send when connected */
  queueMessage: <T>(type: WebSocketMessageType, payload: T) => string;
  /** Clear the message queue */
  clearQueue: () => void;
  /** Subscribe to a specific message type */
  subscribe: (
    type: WebSocketMessageType | WebSocketMessageType[],
    handler: (message: WebSocketMessage) => void,
  ) => () => void;
  /** Last received message for each type */
  lastMessageByType: Record<string, WebSocketMessage | undefined>;
}

// ============================================
// Context
// ============================================

const WebSocketContext = createContext<WebSocketContextValue | undefined>(
  undefined,
);

// ============================================
// Hook
// ============================================

/**
 * Hook to access WebSocket context
 */
export function useWebSocketContext(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error(
      "useWebSocketContext must be used within a WebSocketProvider",
    );
  }
  return context;
}

/**
 * Optional hook that returns null if not within provider
 * Useful for components that may or may not have WebSocket available
 */
export function useOptionalWebSocketContext(): WebSocketContextValue | null {
  return useContext(WebSocketContext) ?? null;
}

// ============================================
// Provider
// ============================================

interface WebSocketProviderProps {
  children: ReactNode;
  /** Custom WebSocket URL */
  url?: string;
  /** Whether to auto-connect (default: true) */
  autoConnect?: boolean;
  /** Maximum messages to queue (default: 100) */
  maxQueueSize?: number;
  /** Whether to flush queue on connect (default: true) */
  flushQueueOnConnect?: boolean;
}

/**
 * WebSocket Provider
 *
 * Provides WebSocket connection management across the application.
 *
 * Features:
 * - Shared connection across components
 * - Message queue for offline/disconnected state
 * - Message type subscriptions
 * - Automatic queue flush on reconnect
 * - Auth change handling
 */
export function WebSocketProvider({
  children,
  url,
  autoConnect = true,
  maxQueueSize = 100,
  flushQueueOnConnect = true,
}: WebSocketProviderProps) {
  // Message queue for offline/disconnected state
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);
  const [lastMessageByType, setLastMessageByType] = useState<
    Record<string, WebSocketMessage>
  >({});

  // Subscribers map: type -> Set of handlers
  const subscribersRef = useRef<
    Map<string, Set<(message: WebSocketMessage) => void>>
  >(new Map());

  // Handle incoming messages
  const handleMessage = useCallback((message: WebSocketMessage) => {
    // Update last message by type
    setLastMessageByType((prev) => ({
      ...prev,
      [message.type]: message,
    }));

    // Notify subscribers
    const typeSubscribers = subscribersRef.current.get(message.type);
    if (typeSubscribers) {
      typeSubscribers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error("[WebSocket] Error in message handler:", error);
        }
      });
    }

    // Notify wildcard subscribers
    const wildcardSubscribers = subscribersRef.current.get("*");
    if (wildcardSubscribers) {
      wildcardSubscribers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error("[WebSocket] Error in wildcard handler:", error);
        }
      });
    }
  }, []);

  // Handle status changes
  const handleStatusChange = useCallback((status: WebSocketStatus) => {
    // Dispatch custom event for components that need to react to status changes
    window.dispatchEvent(
      new CustomEvent("websocket:status", { detail: { status } }),
    );
  }, []);

  // Initialize WebSocket hook
  const ws = useWebSocket({
    url,
    autoConnect,
    onMessage: handleMessage,
    onStatusChange: handleStatusChange,
  });

  // ============================================
  // Queue Management
  // ============================================

  const queueMessage = useCallback(
    <T,>(type: WebSocketMessageType, payload: T): string => {
      const id = `queue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      setMessageQueue((prev) => {
        // Trim queue if it exceeds max size
        const trimmed =
          prev.length >= maxQueueSize ? prev.slice(-maxQueueSize + 1) : prev;

        return [
          ...trimmed,
          {
            id,
            type,
            payload,
            timestamp: Date.now(),
            retries: 0,
          },
        ];
      });

      return id;
    },
    [maxQueueSize],
  );

  const clearQueue = useCallback(() => {
    setMessageQueue([]);
  }, []);

  // Flush queue when connected
  useEffect(() => {
    if (!flushQueueOnConnect || !ws.isConnected || messageQueue.length === 0) {
      return;
    }

    // Process queue
    const processQueue = async () => {
      const toRemove: string[] = [];

      for (const item of messageQueue) {
        const success = ws.send(item.type, item.payload);

        if (success) {
          toRemove.push(item.id);
        } else if (item.retries < 3) {
          // Increment retry count (will be handled on next flush)
          setMessageQueue((prev) =>
            prev.map((m) =>
              m.id === item.id ? { ...m, retries: m.retries + 1 } : m,
            ),
          );
          break; // Stop processing if a message fails
        } else {
          // Max retries reached, remove the message
          console.warn(
            "[WebSocket] Max retries reached for queued message:",
            item,
          );
          toRemove.push(item.id);
        }
      }

      // Remove successfully sent messages
      if (toRemove.length > 0) {
        setMessageQueue((prev) => prev.filter((m) => !toRemove.includes(m.id)));
      }
    };

    // Small delay to ensure connection is stable
    const timeout = setTimeout(processQueue, 500);
    return () => clearTimeout(timeout);
  }, [ws.isConnected, ws.send, messageQueue, flushQueueOnConnect]);

  // ============================================
  // Subscription Management
  // ============================================

  const subscribe = useCallback(
    (
      type: WebSocketMessageType | WebSocketMessageType[],
      handler: (message: WebSocketMessage) => void,
    ): (() => void) => {
      const types = Array.isArray(type) ? type : [type];

      types.forEach((t) => {
        if (!subscribersRef.current.has(t)) {
          subscribersRef.current.set(t, new Set());
        }
        subscribersRef.current.get(t)!.add(handler);
      });

      // Return unsubscribe function
      return () => {
        types.forEach((t) => {
          subscribersRef.current.get(t)?.delete(handler);
        });
      };
    },
    [],
  );

  // ============================================
  // Smart Send (Queue if Disconnected)
  // ============================================

  const smartSend = useCallback(
    <T,>(type: WebSocketMessageType, payload: T): boolean => {
      if (ws.isConnected) {
        return ws.send(type, payload);
      }

      // Queue for later
      queueMessage(type, payload);
      return false;
    },
    [ws.isConnected, ws.send, queueMessage],
  );

  // ============================================
  // Context Value
  // ============================================

  const contextValue: WebSocketContextValue = {
    ...ws,
    send: smartSend, // Override send with smart send
    messageQueue,
    queueMessage,
    clearQueue,
    subscribe,
    lastMessageByType,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

// ============================================
// Exports
// ============================================

export { WebSocketContext };
