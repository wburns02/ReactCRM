/**
 * Mobile Field Service Components
 *
 * Optimized for mobile technicians working in the field.
 * All components support offline operation and have 44px minimum touch targets.
 */

// Main Components
export { MobileWorkOrderView } from './MobileWorkOrderView';
export { FieldServiceMode } from './FieldServiceMode';
export { QuickActions, SwipeableWorkOrderCard } from './QuickActions';
export { StatusUpdateWidget } from './StatusUpdateWidget';
export {
  ChecklistMode,
  DEFAULT_CHECKLIST_TEMPLATES,
  type ChecklistItem,
  type ChecklistTemplate,
} from './ChecklistMode';
export { VoiceCommands } from './VoiceCommands';
export {
  OfflineIndicator,
  OfflineBanner,
  SyncStatusToast,
} from './OfflineIndicator';

// Hooks
export {
  useOfflineSync,
  type OfflineChange,
  type SyncResult,
  type UseOfflineSyncReturn,
} from './hooks/useOfflineSync';
export {
  useInstallPrompt,
  useServiceWorker,
  useBackgroundSync,
  usePushNotifications,
  useMobilePWA,
  type InstallPromptState,
  type ServiceWorkerState,
  type BackgroundSyncState,
  type PushNotificationState,
  type MobilePWAState,
} from './hooks/usePWA';
