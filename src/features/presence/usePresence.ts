import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth.ts';

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
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#0ea5e9', // sky
    '#6366f1', // indigo
    '#a855f7', // purple
    '#ec4899', // pink
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
function parseRoute(pathname: string): { recordType?: string; recordId?: string } {
  const patterns = [
    { pattern: /^\/customers\/([^/]+)$/, type: 'customer' },
    { pattern: /^\/prospects\/([^/]+)$/, type: 'prospect' },
    { pattern: /^\/work-orders\/([^/]+)$/, type: 'workorder' },
    { pattern: /^\/technicians\/([^/]+)$/, type: 'technician' },
    { pattern: /^\/invoices\/([^/]+)$/, type: 'invoice' },
    { pattern: /^\/tickets\/([^/]+)$/, type: 'ticket' },
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
 * Compute demo users based on pathname (deterministic)
 * In production, this would be replaced with real WebSocket data
 */
function computeDemoUsers(pathname: string): PresenceUser[] {
  const demoUsers: PresenceUser[] = [];

  // Only show demo users on specific pages for realism
  if (pathname.includes('/customers/') || pathname.includes('/work-orders/')) {
    // Use a deterministic approach based on pathname
    const pathHash = pathname.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    if (pathHash % 3 === 0) {
      const { recordType, recordId } = parseRoute(pathname);
      const demoUser: PresenceUser = {
        id: 'demo-user-1',
        name: 'Sarah Johnson',
        initials: 'SJ',
        email: 'sarah@example.com',
        color: generateUserColor('demo-user-1'),
        currentPage: pathname,
        recordType,
        recordId,
        lastSeen: new Date(),
        isOnline: true,
      };
      demoUsers.push(demoUser);
    }
  }

  return demoUsers;
}

/**
 * Hook for real-time presence tracking
 *
 * Tracks which users are viewing which pages/records in real-time.
 * Currently uses simulated demo data. In production, this would
 * connect to a WebSocket server for real-time presence updates.
 *
 * @returns Presence state and helpers
 */
export function usePresence() {
  const { user } = useAuth();
  const location = useLocation();
  const hasUser = !!user;

  // Compute all presence state from current context
  const presenceState = useMemo(() => {
    const { recordType, recordId } = parseRoute(location.pathname);
    const connected = hasUser;

    // Get demo users for current page
    const allUsers = hasUser ? computeDemoUsers(location.pathname) : [];

    // Filter users (excluding self)
    const users = allUsers.filter(u => u.id !== user?.id);

    // Users viewing the same page
    const usersOnSamePage = users.filter(
      u => u.currentPage === location.pathname
    );

    // Users viewing the same record
    const usersOnSameRecord = users.filter(
      u => u.recordType === recordType && u.recordId === recordId
    );

    // All online users
    const allOnlineUsers = users.filter(u => u.isOnline);

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
  }, [hasUser, user?.id, location.pathname]);

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
  };
}

/**
 * Get users viewing a specific record
 */
export function useRecordPresence(recordType: string, recordId: string) {
  const { users } = usePresence();

  return useMemo(
    () => users.filter(u => u.recordType === recordType && u.recordId === recordId),
    [users, recordType, recordId]
  );
}
