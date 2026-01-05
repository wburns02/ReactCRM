import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

/**
 * Web Push Notification Hooks
 *
 * Provides hooks for:
 * - VAPID key retrieval
 * - Subscription management
 * - Notification preferences
 * - Notification history
 */

// =============================================================================
// Types
// =============================================================================

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface SubscriptionResponse {
  id: string;
  user_id: string;
  device_name: string | null;
  device_type: string;
  created_at: string;
  last_used: string | null;
  is_active: boolean;
}

export interface NotificationPreferences {
  new_work_order: boolean;
  work_order_assigned: boolean;
  work_order_status_change: boolean;
  payment_received: boolean;
  invoice_overdue: boolean;
  customer_message: boolean;
  schedule_reminder: boolean;
  system_alerts: boolean;
  marketing: boolean;
}

export interface SendNotificationRequest {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
  user_ids?: string[];
  role?: string;
  all_users?: boolean;
}

export interface NotificationLog {
  id: string;
  title: string;
  body: string;
  sent_at: string;
  delivered_count: number;
  failed_count: number;
  click_count: number;
  sent_by: string;
}

export interface NotificationStats {
  total_sent_today: number;
  total_sent_week: number;
  total_sent_month: number;
  delivery_rate: number;
  click_rate: number;
  active_subscriptions: number;
  by_type: Record<string, number>;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  variables: string[];
}

// =============================================================================
// Query Keys
// =============================================================================

export const pushNotificationKeys = {
  all: ['push-notifications'] as const,
  vapidKey: () => [...pushNotificationKeys.all, 'vapid-key'] as const,
  subscriptions: () => [...pushNotificationKeys.all, 'subscriptions'] as const,
  preferences: () => [...pushNotificationKeys.all, 'preferences'] as const,
  history: () => [...pushNotificationKeys.all, 'history'] as const,
  stats: () => [...pushNotificationKeys.all, 'stats'] as const,
  templates: () => [...pushNotificationKeys.all, 'templates'] as const,
};

// =============================================================================
// VAPID Key Hook
// =============================================================================

/**
 * Get VAPID public key for push subscription
 */
export function useVapidKey() {
  return useQuery({
    queryKey: pushNotificationKeys.vapidKey(),
    queryFn: async (): Promise<{ publicKey: string }> => {
      const { data } = await apiClient.get('/notifications/push/vapid-key');
      return data;
    },
    staleTime: Infinity, // VAPID key doesn't change
  });
}

// =============================================================================
// Subscription Hooks
// =============================================================================

/**
 * Subscribe to push notifications
 */
export function useSubscribePush() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      subscription: PushSubscription;
      device_name?: string;
      device_type?: string;
    }): Promise<SubscriptionResponse> => {
      const { data } = await apiClient.post('/notifications/push/subscribe', params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pushNotificationKeys.subscriptions() });
    },
  });
}

/**
 * Unsubscribe from push notifications
 */
export function useUnsubscribePush() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (endpoint: string): Promise<{ success: boolean }> => {
      const { data } = await apiClient.delete('/notifications/push/subscribe', {
        params: { endpoint },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pushNotificationKeys.subscriptions() });
    },
  });
}

/**
 * Get user's push subscriptions
 */
export function usePushSubscriptions() {
  return useQuery({
    queryKey: pushNotificationKeys.subscriptions(),
    queryFn: async (): Promise<{ subscriptions: SubscriptionResponse[] }> => {
      const { data } = await apiClient.get('/notifications/push/subscriptions');
      return data;
    },
  });
}

// =============================================================================
// Notification Sending Hooks
// =============================================================================

/**
 * Send push notification
 */
export function useSendPushNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SendNotificationRequest): Promise<{
      notification_id: string;
      title: string;
      delivered: number;
      failed: number;
      sent_at: string;
    }> => {
      const { data } = await apiClient.post('/notifications/push/send', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pushNotificationKeys.history() });
      queryClient.invalidateQueries({ queryKey: pushNotificationKeys.stats() });
    },
  });
}

/**
 * Send test notification to current user
 */
export function useSendTestNotification() {
  return useMutation({
    mutationFn: async (): Promise<{
      success: boolean;
      message: string;
      title: string;
      body: string;
    }> => {
      const { data } = await apiClient.post('/notifications/push/send/test');
      return data;
    },
  });
}

// =============================================================================
// Preference Hooks
// =============================================================================

/**
 * Get notification preferences
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: pushNotificationKeys.preferences(),
    queryFn: async (): Promise<NotificationPreferences> => {
      const { data } = await apiClient.get('/notifications/push/preferences');
      return data;
    },
  });
}

/**
 * Update notification preferences
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
      const { data } = await apiClient.patch('/notifications/push/preferences', preferences);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pushNotificationKeys.preferences() });
    },
  });
}

// =============================================================================
// History & Stats Hooks
// =============================================================================

/**
 * Get notification history
 */
export function useNotificationHistory(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...pushNotificationKeys.history(), { page, pageSize }],
    queryFn: async (): Promise<{
      notifications: NotificationLog[];
      total: number;
      page: number;
      page_size: number;
    }> => {
      const { data } = await apiClient.get('/notifications/push/history', {
        params: { page, page_size: pageSize },
      });
      return data;
    },
  });
}

/**
 * Get notification stats
 */
export function useNotificationStats() {
  return useQuery({
    queryKey: pushNotificationKeys.stats(),
    queryFn: async (): Promise<NotificationStats> => {
      const { data } = await apiClient.get('/notifications/push/stats');
      return data;
    },
    staleTime: 60_000, // 1 minute
  });
}

// =============================================================================
// Template Hooks
// =============================================================================

/**
 * Get notification templates
 */
export function useNotificationTemplates() {
  return useQuery({
    queryKey: pushNotificationKeys.templates(),
    queryFn: async (): Promise<{ templates: NotificationTemplate[] }> => {
      const { data } = await apiClient.get('/notifications/push/templates');
      return data;
    },
  });
}

// =============================================================================
// Scheduled Notification Hooks
// =============================================================================

/**
 * Schedule a notification
 */
export function useScheduleNotification() {
  return useMutation({
    mutationFn: async (params: {
      title: string;
      body: string;
      scheduled_for: string;
      user_ids?: string[];
    }): Promise<{
      schedule_id: string;
      title: string;
      scheduled_for: string;
      target_users: string | number;
      status: string;
    }> => {
      const { data } = await apiClient.post('/notifications/push/schedule', null, {
        params: {
          title: params.title,
          body: params.body,
          scheduled_for: params.scheduled_for,
        },
      });
      return data;
    },
  });
}

/**
 * Get scheduled notifications
 */
export function useScheduledNotifications() {
  return useQuery({
    queryKey: [...pushNotificationKeys.all, 'scheduled'],
    queryFn: async (): Promise<{ scheduled: unknown[]; count: number }> => {
      const { data } = await apiClient.get('/notifications/push/scheduled');
      return data;
    },
  });
}

/**
 * Cancel scheduled notification
 */
export function useCancelScheduledNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scheduleId: string): Promise<{ success: boolean }> => {
      const { data } = await apiClient.delete(`/notifications/push/scheduled/${scheduleId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...pushNotificationKeys.all, 'scheduled'] });
    },
  });
}

// =============================================================================
// Browser Push API Helpers
// =============================================================================

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return 'PushManager' in window && 'serviceWorker' in navigator;
}

/**
 * Get current push subscription from browser
 */
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) return null;

  const p256dh = subscription.getKey('p256dh');
  const auth = subscription.getKey('auth');

  if (!p256dh || !auth) return null;

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dh))),
      auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
    },
  };
}

/**
 * Request push notification permission
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return await Notification.requestPermission();
}

/**
 * Subscribe to browser push notifications
 */
export async function subscribeToBrowserPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const permission = await requestPushPermission();
  if (permission !== 'granted') return null;

  const registration = await navigator.serviceWorker.ready;

  // Convert VAPID key from base64 to Uint8Array
  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });

  const p256dh = subscription.getKey('p256dh');
  const auth = subscription.getKey('auth');

  if (!p256dh || !auth) return null;

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dh))),
      auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
    },
  };
}

/**
 * Unsubscribe from browser push notifications
 */
export async function unsubscribeFromBrowserPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) return true;

  return await subscription.unsubscribe();
}

/**
 * Helper to convert VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
