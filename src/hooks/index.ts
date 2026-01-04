/**
 * Hooks module exports
 */

// Offline sync hooks
export {
  useOffline,
  useSyncStatus,
  useOfflineCache,
  type UseOfflineReturn,
  type SyncResult,
  type SyncStatusInfo,
  type SyncQueueItem,
} from './useOffline';

// Debounce hooks
export { useDebounce, useDebouncedCallback } from './useDebounce';

// WebSocket hooks
export {
  useWebSocket,
  type WebSocketStatus,
  type WebSocketMessageType,
  type WebSocketMessage,
  type DispatchUpdatePayload,
  type JobStatusPayload,
  type NotificationPayload,
  type UseWebSocketOptions,
  type UseWebSocketReturn,
  isDispatchUpdate,
  isJobStatus,
  isNotification,
} from './useWebSocket';

// Real-time notification hooks
export {
  useRealtimeNotifications,
  useRealtimeUpdates,
  type RealtimeNotificationOptions,
  type UseRealtimeNotificationsReturn,
} from './useRealtimeNotifications';
