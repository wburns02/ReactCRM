import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, withFallback } from '@/api/client';

/**
 * Push Notification Types
 */
export interface PushSubscription {
  id: string;
  user_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_name?: string;
  created_at: string;
  last_used?: string;
  is_active: boolean;
}

export interface NotificationPreferences {
  user_id: number;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  // Notification types
  work_order_assigned: boolean;
  work_order_updated: boolean;
  work_order_completed: boolean;
  schedule_changes: boolean;
  customer_messages: boolean;
  payment_received: boolean;
  invoice_overdue: boolean;
  system_alerts: boolean;
  marketing_updates: boolean;
  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_start: string; // "22:00"
  quiet_end: string;   // "07:00"
}

export interface Notification {
  id: string;
  user_id: number;
  type: 'work_order' | 'schedule' | 'payment' | 'message' | 'alert' | 'system';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
  action_url?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  by_type: Record<string, number>;
}

/**
 * Default values for 404 fallback
 */
const DEFAULT_PREFERENCES: NotificationPreferences = {
  user_id: 0,
  push_enabled: false,
  email_enabled: true,
  sms_enabled: false,
  work_order_assigned: true,
  work_order_updated: true,
  work_order_completed: true,
  schedule_changes: true,
  customer_messages: true,
  payment_received: true,
  invoice_overdue: true,
  system_alerts: true,
  marketing_updates: false,
  quiet_hours_enabled: false,
  quiet_start: '22:00',
  quiet_end: '07:00',
};

const DEFAULT_STATS: NotificationStats = {
  total: 0,
  unread: 0,
  by_type: {},
};

/**
 * Query keys for notifications
 */
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters?: { unread_only?: boolean; type?: string }) =>
    [...notificationKeys.lists(), filters] as const,
  stats: () => [...notificationKeys.all, 'stats'] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
  subscriptions: () => [...notificationKeys.all, 'subscriptions'] as const,
};

/**
 * Get notification preferences
 * Returns defaults if endpoint not implemented (404)
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: async (): Promise<NotificationPreferences> => {
      return withFallback(
        async () => {
          const { data } = await apiClient.get('/notifications/preferences');
          return data;
        },
        DEFAULT_PREFERENCES
      );
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
      const { data } = await apiClient.put('/notifications/preferences', preferences);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() });
    },
  });
}

/**
 * Get user's push subscriptions
 * Returns empty array if endpoint not implemented (404)
 */
export function usePushSubscriptions() {
  return useQuery({
    queryKey: notificationKeys.subscriptions(),
    queryFn: async (): Promise<PushSubscription[]> => {
      return withFallback(
        async () => {
          const { data } = await apiClient.get('/notifications/push/subscriptions');
          return data.subscriptions || [];
        },
        []
      );
    },
  });
}

/**
 * Register a new push subscription
 */
export function useRegisterPushSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      endpoint: string;
      p256dh: string;
      auth: string;
      device_name?: string;
    }): Promise<PushSubscription> => {
      const { data } = await apiClient.post('/notifications/push/subscribe', params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.subscriptions() });
    },
  });
}

/**
 * Unregister a push subscription
 */
export function useUnregisterPushSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionId: string): Promise<void> => {
      await apiClient.delete(`/notifications/push/subscriptions/${subscriptionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.subscriptions() });
    },
  });
}

/**
 * Get notifications list
 * Returns empty list if endpoint not implemented (404)
 */
export function useNotifications(filters?: { unread_only?: boolean; type?: string; limit?: number }) {
  return useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: async (): Promise<{ notifications: Notification[]; total: number }> => {
      return withFallback(
        async () => {
          const params = new URLSearchParams();
          if (filters?.unread_only) params.append('unread_only', 'true');
          if (filters?.type) params.append('type', filters.type);
          if (filters?.limit) params.append('limit', filters.limit.toString());

          const { data } = await apiClient.get(`/notifications?${params.toString()}`);
          return data;
        },
        { notifications: [], total: 0 }
      );
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });
}

/**
 * Get notification stats
 * Returns default stats if endpoint not implemented (404)
 */
export function useNotificationStats() {
  return useQuery({
    queryKey: notificationKeys.stats(),
    queryFn: async (): Promise<NotificationStats> => {
      return withFallback(
        async () => {
          const { data } = await apiClient.get('/notifications/stats');
          return data;
        },
        DEFAULT_STATS
      );
    },
    refetchInterval: 30000,
  });
}

/**
 * Mark notification as read
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string): Promise<void> => {
      await apiClient.post(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Mark all notifications as read
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      await apiClient.post('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Delete notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string): Promise<void> => {
      await apiClient.delete(`/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Send test notification (for debugging)
 */
export function useSendTestNotification() {
  return useMutation({
    mutationFn: async (): Promise<{ success: boolean }> => {
      const { data } = await apiClient.post('/notifications/push/test');
      return data;
    },
  });
}

/**
 * Get VAPID public key for push subscriptions
 * Returns empty key if endpoint not implemented (404)
 */
export function useVapidPublicKey() {
  return useQuery({
    queryKey: ['notifications', 'vapid-key'],
    queryFn: async (): Promise<{ public_key: string }> => {
      return withFallback(
        async () => {
          const { data } = await apiClient.get('/notifications/push/vapid-key');
          return data;
        },
        { public_key: '' }
      );
    },
    staleTime: Infinity,
  });
}
