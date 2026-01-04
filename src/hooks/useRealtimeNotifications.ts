import { useEffect, useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOptionalWebSocketContext } from '@/providers/WebSocketProvider';
import { showToast } from '@/components/ui/Toast';
import {
  type WebSocketMessage,
  type NotificationPayload,
  isNotification,
} from '@/hooks/useWebSocket';

// ============================================
// Types
// ============================================

export interface RealtimeNotificationOptions {
  /** Whether to show toasts for notifications (default: true) */
  showToasts?: boolean;
  /** Whether to play sound for notifications (default: false) */
  playSound?: boolean;
  /** Whether to request desktop notification permission (default: false) */
  requestDesktopPermission?: boolean;
  /** Whether to show desktop notifications (default: true if permission granted) */
  showDesktopNotifications?: boolean;
  /** Sound URL to play (default: system notification sound) */
  soundUrl?: string;
  /** Callback when notification is received */
  onNotification?: (notification: NotificationPayload) => void;
  /** Filter function to decide which notifications to show */
  filter?: (notification: NotificationPayload) => boolean;
}

export interface UseRealtimeNotificationsReturn {
  /** Whether desktop notifications are supported */
  isDesktopSupported: boolean;
  /** Current desktop notification permission */
  desktopPermission: NotificationPermission | 'unsupported';
  /** Request desktop notification permission */
  requestPermission: () => Promise<NotificationPermission | 'unsupported'>;
  /** Whether sound is enabled */
  isSoundEnabled: boolean;
  /** Toggle sound on/off */
  toggleSound: () => void;
  /** Last notification received */
  lastNotification: NotificationPayload | null;
}

// ============================================
// Constants
// ============================================

const DEFAULT_SOUND_URL = '/sounds/notification.mp3';

// Notification type to toast variant mapping
const NOTIFICATION_VARIANTS: Record<NotificationPayload['type'], 'default' | 'success' | 'error' | 'warning' | 'info'> = {
  work_order: 'info',
  schedule: 'info',
  payment: 'success',
  message: 'default',
  alert: 'warning',
  system: 'info',
};

// Notification type to icon mapping (for desktop notifications)
const NOTIFICATION_ICONS: Record<NotificationPayload['type'], string> = {
  work_order: '/icons/work-order.png',
  schedule: '/icons/schedule.png',
  payment: '/icons/payment.png',
  message: '/icons/message.png',
  alert: '/icons/alert.png',
  system: '/icons/system.png',
};

// ============================================
// Helper Functions
// ============================================

/**
 * Check if desktop notifications are supported
 */
function isDesktopNotificationSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Get current desktop notification permission
 */
function getDesktopPermission(): NotificationPermission | 'unsupported' {
  if (!isDesktopNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Request desktop notification permission
 */
async function requestDesktopPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isDesktopNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('[Notifications] Failed to request permission:', error);
    return 'denied';
  }
}

/**
 * Show a desktop notification
 */
function showDesktopNotification(notification: NotificationPayload): void {
  if (!isDesktopNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  try {
    const n = new Notification(notification.title, {
      body: notification.body,
      icon: NOTIFICATION_ICONS[notification.type] || '/icons/default.png',
      tag: notification.id, // Prevents duplicate notifications
      requireInteraction: notification.priority === 'urgent',
      silent: !notification.sound,
    });

    // Handle click
    n.onclick = () => {
      window.focus();
      if (notification.action_url) {
        window.location.href = notification.action_url;
      }
      n.close();
    };

    // Auto-close after 10 seconds (unless urgent)
    if (notification.priority !== 'urgent') {
      setTimeout(() => n.close(), 10000);
    }
  } catch (error) {
    console.error('[Notifications] Failed to show desktop notification:', error);
  }
}

/**
 * Play notification sound
 */
function playNotificationSound(soundUrl: string): void {
  try {
    const audio = new Audio(soundUrl);
    audio.volume = 0.5;
    audio.play().catch((error) => {
      // Autoplay may be blocked - this is expected
      console.debug('[Notifications] Could not play sound:', error.message);
    });
  } catch (error) {
    console.error('[Notifications] Failed to create audio:', error);
  }
}

// ============================================
// Main Hook
// ============================================

/**
 * Hook for handling real-time notifications via WebSocket
 *
 * Features:
 * - Integrates with WebSocket provider
 * - Shows toast notifications
 * - Desktop notifications (with permission)
 * - Sound notifications
 * - Auto-invalidates notification queries
 */
export function useRealtimeNotifications(
  options: RealtimeNotificationOptions = {}
): UseRealtimeNotificationsReturn {
  const {
    showToasts = true,
    playSound: initialPlaySound = false,
    requestDesktopPermission: shouldRequestPermission = false,
    showDesktopNotifications = true,
    soundUrl = DEFAULT_SOUND_URL,
    onNotification,
    filter,
  } = options;

  const queryClient = useQueryClient();
  const ws = useOptionalWebSocketContext();

  // State
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | 'unsupported'>(
    getDesktopPermission()
  );
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    // Load from localStorage
    const stored = localStorage.getItem('notification_sound_enabled');
    return stored !== null ? stored === 'true' : initialPlaySound;
  });
  const [lastNotification, setLastNotification] = useState<NotificationPayload | null>(null);

  // Refs
  const onNotificationRef = useRef(onNotification);
  const filterRef = useRef(filter);

  // Keep refs in sync
  useEffect(() => { onNotificationRef.current = onNotification; }, [onNotification]);
  useEffect(() => { filterRef.current = filter; }, [filter]);

  // ============================================
  // Permission Request
  // ============================================

  const requestPermission = useCallback(async (): Promise<NotificationPermission | 'unsupported'> => {
    const permission = await requestDesktopPermission();
    setDesktopPermission(permission);
    return permission;
  }, []);

  // Auto-request permission on mount if configured
  useEffect(() => {
    if (shouldRequestPermission && desktopPermission === 'default') {
      requestPermission();
    }
  }, [shouldRequestPermission, desktopPermission, requestPermission]);

  // ============================================
  // Sound Toggle
  // ============================================

  const toggleSound = useCallback(() => {
    setIsSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('notification_sound_enabled', String(next));
      return next;
    });
  }, []);

  // ============================================
  // Notification Handler
  // ============================================

  const handleNotification = useCallback((message: WebSocketMessage) => {
    if (!isNotification(message)) {
      return;
    }

    const notification = message.payload;

    // Apply filter if provided
    if (filterRef.current && !filterRef.current(notification)) {
      return;
    }

    // Update last notification
    setLastNotification(notification);

    // Invalidate notification queries to refresh UI
    queryClient.invalidateQueries({ queryKey: ['notifications'] });

    // Call custom handler
    onNotificationRef.current?.(notification);

    // Show toast
    if (showToasts) {
      const variant = NOTIFICATION_VARIANTS[notification.type] || 'default';
      showToast({
        title: notification.title,
        description: notification.body,
        variant,
        duration: notification.priority === 'urgent' ? 0 : 5000, // Urgent = sticky
        action: notification.action_url
          ? {
              label: 'View',
              onClick: () => {
                window.location.href = notification.action_url!;
              },
            }
          : undefined,
      });
    }

    // Show desktop notification
    if (showDesktopNotifications && desktopPermission === 'granted') {
      showDesktopNotification(notification);
    }

    // Play sound
    if (isSoundEnabled && notification.sound !== false) {
      playNotificationSound(soundUrl);
    }
  }, [queryClient, showToasts, showDesktopNotifications, desktopPermission, isSoundEnabled, soundUrl]);

  // ============================================
  // WebSocket Subscription
  // ============================================

  useEffect(() => {
    if (!ws) {
      return;
    }

    // Subscribe to notification messages
    const unsubscribe = ws.subscribe('notification', handleNotification);

    return unsubscribe;
  }, [ws, handleNotification]);

  // ============================================
  // Handle Other Real-time Updates
  // ============================================

  useEffect(() => {
    if (!ws) {
      return;
    }

    // Subscribe to work order updates
    const unsubscribeWorkOrder = ws.subscribe('work_order_update', () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
    });

    // Subscribe to schedule changes
    const unsubscribeSchedule = ws.subscribe('schedule_change', () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
    });

    // Subscribe to dispatch updates
    const unsubscribeDispatch = ws.subscribe('dispatch_update', () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch'] });
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
    });

    // Subscribe to job status updates
    const unsubscribeJobStatus = ws.subscribe('job_status', () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
    });

    // Subscribe to payment updates
    const unsubscribePayment = ws.subscribe('payment_received', () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    });

    return () => {
      unsubscribeWorkOrder();
      unsubscribeSchedule();
      unsubscribeDispatch();
      unsubscribeJobStatus();
      unsubscribePayment();
    };
  }, [ws, queryClient]);

  return {
    isDesktopSupported: isDesktopNotificationSupported(),
    desktopPermission,
    requestPermission,
    isSoundEnabled,
    toggleSound,
    lastNotification,
  };
}

// ============================================
// Convenience Hook for Components
// ============================================

/**
 * Simple hook to just enable real-time updates without configuration
 * Use this in components that just need real-time data refreshing
 */
export function useRealtimeUpdates(): void {
  useRealtimeNotifications({
    showToasts: false,
    showDesktopNotifications: false,
    playSound: false,
  });
}
