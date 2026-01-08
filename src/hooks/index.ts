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
  usePresence,
  useTechnicianLocations,
  WS_EVENTS,
  type WebSocketStatus,
  type WebSocketMessageType,
  type WebSocketMessage,
  type DispatchUpdatePayload,
  type JobStatusPayload,
  type NotificationPayload,
  type UseWebSocketOptions,
  type UseWebSocketReturn,
  type PresenceUser,
  type TechnicianLocation,
  type WSEventType,
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

// PWA hooks
export {
  usePWA,
  useOnlineStatus,
  type PWAState,
} from './usePWA';

// Segment Builder hooks
export {
  segmentBuilderKeys,
  useSegmentsList,
  useSegmentDetail,
  useSegmentMembers,
  useCreateSegment,
  useUpdateSegment,
  useDeleteSegment,
  useDuplicateSegment,
  useSegmentPreview,
  useParseNaturalLanguage,
  useSegmentSuggestions,
  useSmartSegments,
  useSegmentAnalytics,
  useSegmentRuleState,
  type SegmentMember,
  type SegmentMembersResponse,
  type SegmentPreviewResult,
  type ParsedSegmentQuery,
  type SegmentSuggestion,
  type SmartSegment,
  type SegmentAnalytics,
} from './useSegments';
