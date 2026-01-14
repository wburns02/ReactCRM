import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth.ts";
import { useOptionalWebSocketContext } from "@/providers/WebSocketProvider";

/**
 * Presence user type
 */
export interface PresenceUser {
  id: string;
  name: string;
  initials: string;
  email: string;
  color: string;
  currentPage: string;
  recordId?: string;
  recordType?: string;
  lastSeen: Date;
  isOnline: boolean;
}

/**
 * Generate consistent color from user ID
 */
export function generateUserColor(userId: string): string {
  const colors = [
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#14b8a6", // teal
    "#0ea5e9", // sky
    "#6366f1", // indigo
    "#a855f7", // purple
    "#ec4899", // pink
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Parse route to get record type and ID
 */
function parseRoute(pathname: string): {
  recordType?: string;
  recordId?: string;
} {
  const patterns = [
    { pattern: /^\/customers\/([^/]+)$/, type: "customer" },
    { pattern: /^\/prospects\/([^/]+)$/, type: "prospect" },
    { pattern: /^\/work-orders\/([^/]+)$/, type: "workorder" },
    { pattern: /^\/technicians\/([^/]+)$/, type: "technician" },
    { pattern: /^\/invoices\/([^/]+)$/, type: "invoice" },
    { pattern: /^\/tickets\/([^/]+)$/, type: "ticket" },
  ];

  for (const { pattern, type } of patterns) {
    const match = pathname.match(pattern);
    if (match) {
      return { recordType: type, recordId: match[1] };
    }
  }

  return {};
}

/**
 * Transform raw WebSocket presence data to PresenceUser
 */
function transformPresenceData(data: {
  id: string;
  name: string;
  email: string;
  status?: string;
  currentPage?: string;
  lastSeen?: string;
}): PresenceUser {
  return {
    id: data.id,
    name: data.name,
    initials: getInitials(data.name),
    email: data.email,
    color: generateUserColor(data.id),
    currentPage: data.currentPage || "",
    ...parseRoute(data.currentPage || ""),
    lastSeen: data.lastSeen ? new Date(data.lastSeen) : new Date(),
    isOnline: data.status === "online" || data.status === "busy",
  };
}

/**
 * Hook for real-time presence tracking
 *
 * Tracks which users are viewing which pages/records in real-time.
 * Connects to WebSocket for real-time presence updates.
 *
 * @returns Presence state and helpers
 */
export function usePresence() {
  const { user } = useAuth();
  const location = useLocation();
  const hasUser = !!user;
  const ws = useOptionalWebSocketContext();

  // State for presence users
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const lastPageRef = useRef<string>("");

  // Subscribe to presence events from WebSocket
  useEffect(() => {
    if (!ws) return;

    // Subscribe to presence list updates
    const unsubscribe = ws.subscribe("system_message" as never, (message) => {
      const payload = message.payload as {
        action?: string;
        users?: Array<{
          id: string;
          name: string;
          email: string;
          status?: string;
          currentPage?: string;
          lastSeen?: string;
        }>;
        user?: {
          id: string;
          name: string;
          email: string;
          status?: string;
          currentPage?: string;
          lastSeen?: string;
        };
      };

      if (payload.action === "presence_list" && payload.users) {
        // Full presence list update
        setPresenceUsers(payload.users.map(transformPresenceData));
      } else if (payload.action === "user_joined" && payload.user) {
        // User joined - add or update
        setPresenceUsers((prev) => {
          const filtered = prev.filter((u) => u.id !== payload.user!.id);
          return [...filtered, transformPresenceData(payload.user!)];
        });
      } else if (payload.action === "user_left" && payload.user) {
        // User left - remove
        setPresenceUsers((prev) =>
          prev.filter((u) => u.id !== payload.user!.id),
        );
      } else if (payload.action === "presence_update" && payload.user) {
        // User presence updated
        setPresenceUsers((prev) => {
          const idx = prev.findIndex((u) => u.id === payload.user!.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = transformPresenceData(payload.user!);
            return updated;
          }
          return [...prev, transformPresenceData(payload.user!)];
        });
      }
    });

    return unsubscribe;
  }, [ws]);

  // Send presence update when page changes
  useEffect(() => {
    if (
      !ws?.isConnected ||
      !hasUser ||
      location.pathname === lastPageRef.current
    ) {
      return;
    }

    lastPageRef.current = location.pathname;
    const { recordType, recordId } = parseRoute(location.pathname);

    ws.send("system_message" as never, {
      action: "presence_update",
      status: "online",
      currentPage: location.pathname,
      recordType,
      recordId,
    });
  }, [ws, ws?.isConnected, hasUser, location.pathname]);

  // Send presence update on mount and cleanup on unmount
  useEffect(() => {
    if (!ws?.isConnected || !hasUser) {
      return;
    }

    // Announce online when connected
    ws.send("system_message" as never, {
      action: "presence_update",
      status: "online",
      currentPage: location.pathname,
    });

    // Announce offline when disconnecting
    return () => {
      if (ws?.isConnected) {
        ws.send("system_message" as never, {
          action: "presence_update",
          status: "offline",
        });
      }
    };
  }, [ws, ws?.isConnected, hasUser, location.pathname]);

  // Compute presence state
  const presenceState = useMemo(() => {
    const { recordType, recordId } = parseRoute(location.pathname);
    const connected = hasUser && (ws?.isConnected ?? false);

    // Filter out self
    const users = presenceUsers.filter((u) => u.id !== user?.id);

    // Users viewing the same page
    const usersOnSamePage = users.filter(
      (u) => u.currentPage === location.pathname,
    );

    // Users viewing the same record
    const usersOnSameRecord = users.filter(
      (u) => u.recordType === recordType && u.recordId === recordId,
    );

    // All online users
    const allOnlineUsers = users.filter((u) => u.isOnline);

    // Current record info
    const currentRecord = recordId ? { type: recordType, id: recordId } : null;

    return {
      users,
      usersOnSamePage,
      usersOnSameRecord,
      allOnlineUsers,
      connected,
      currentRecord,
    };
  }, [hasUser, user?.id, location.pathname, presenceUsers, ws?.isConnected]);

  // Update presence status
  const updateStatus = useCallback(
    (status: "online" | "away" | "busy") => {
      if (!ws?.isConnected) return;

      ws.send("system_message" as never, {
        action: "presence_update",
        status,
        currentPage: location.pathname,
      });
    },
    [ws, location.pathname],
  );

  return {
    /** All presence users (excluding self) */
    users: presenceState.users,
    /** Users viewing the exact same page */
    usersOnSamePage: presenceState.usersOnSamePage,
    /** Users viewing the same record (across different pages) */
    usersOnSameRecord: presenceState.usersOnSameRecord,
    /** All online users */
    allOnlineUsers: presenceState.allOnlineUsers,
    /** WebSocket connection status */
    connected: presenceState.connected,
    /** Current record info */
    currentRecord: presenceState.currentRecord,
    /** Generate consistent color for a user */
    getUserColor: generateUserColor,
    /** Get initials from name */
    getInitials,
    /** Update own presence status */
    updateStatus,
  };
}

/**
 * Get users viewing a specific record
 */
export function useRecordPresence(recordType: string, recordId: string) {
  const { users } = usePresence();

  return useMemo(
    () =>
      users.filter(
        (u) => u.recordType === recordType && u.recordId === recordId,
      ),
    [users, recordType, recordId],
  );
}
