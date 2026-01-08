/**
 * SMS Notification System Hooks
 *
 * React Query hooks for the comprehensive SMS notification system.
 * Supports Twilio integration, automated triggers, two-way SMS,
 * delivery tracking, and TCPA compliance.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, withFallback } from '@/api/client';
import type {
  SMSNotificationTemplate,
  SMSNotification,
  CustomerSMSPreferences,
  ScheduledNotification,
  InboundSMS,
  SMSConversation,
  SMSDeliveryStats,
  SMSNotificationSettings,
  SendNotificationRequest,
  SendBulkNotificationRequest,
  SendNotificationResponse,
  BulkSendResponse,
  NotificationTrigger,
  ETANotificationData,
  NotificationQueueItem,
} from '@/api/types/sms';

// =============================================================================
// Query Keys
// =============================================================================

export const smsNotificationKeys = {
  all: ['sms-notifications'] as const,

  // Settings & Configuration
  settings: () => [...smsNotificationKeys.all, 'settings'] as const,

  // Templates
  templates: () => [...smsNotificationKeys.all, 'templates'] as const,
  templatesByTrigger: (trigger: NotificationTrigger) =>
    [...smsNotificationKeys.templates(), 'trigger', trigger] as const,
  template: (id: string) => [...smsNotificationKeys.templates(), id] as const,

  // Notifications (sent messages)
  notifications: (filters?: NotificationFilters) =>
    [...smsNotificationKeys.all, 'notifications', filters] as const,
  notification: (id: string) =>
    [...smsNotificationKeys.all, 'notification', id] as const,

  // Scheduled notifications
  scheduled: (filters?: ScheduledFilters) =>
    [...smsNotificationKeys.all, 'scheduled', filters] as const,

  // Customer preferences
  customerPreferences: (customerId: number) =>
    [...smsNotificationKeys.all, 'preferences', customerId] as const,

  // Conversations (two-way SMS)
  conversations: () => [...smsNotificationKeys.all, 'conversations'] as const,
  conversation: (customerId: number) =>
    [...smsNotificationKeys.conversations(), customerId] as const,

  // Inbound messages
  inbound: (filters?: InboundFilters) =>
    [...smsNotificationKeys.all, 'inbound', filters] as const,

  // Statistics
  stats: (period?: string) =>
    [...smsNotificationKeys.all, 'stats', period] as const,

  // Queue
  queue: () => [...smsNotificationKeys.all, 'queue'] as const,
};

// =============================================================================
// Filter Types
// =============================================================================

export interface NotificationFilters {
  customer_id?: number;
  status?: string;
  trigger?: NotificationTrigger;
  from_date?: string;
  to_date?: string;
  page?: number;
  page_size?: number;
}

export interface ScheduledFilters {
  status?: 'pending' | 'sent' | 'cancelled';
  trigger?: NotificationTrigger;
  from_date?: string;
  to_date?: string;
}

export interface InboundFilters {
  customer_id?: number;
  requires_response?: boolean;
  from_date?: string;
  to_date?: string;
}

// =============================================================================
// Default Values
// =============================================================================

const DEFAULT_SETTINGS: SMSNotificationSettings = {
  twilio_enabled: false,
  triggers: [],
  quiet_hours_enabled: false,
  quiet_start: '21:00',
  quiet_end: '08:00',
  max_messages_per_day: 100,
  include_opt_out_message: true,
  opt_out_message: 'Reply STOP to unsubscribe',
  default_templates: {} as Record<NotificationTrigger, string>,
};

const DEFAULT_STATS: SMSDeliveryStats = {
  period: 'month',
  total_sent: 0,
  total_delivered: 0,
  total_failed: 0,
  total_queued: 0,
  delivery_rate: 0,
  average_delivery_time_seconds: 0,
  by_trigger: {} as Record<NotificationTrigger, { sent: number; delivered: number; failed: number }>,
  opt_outs_count: 0,
  opt_ins_count: 0,
  inbound_messages: 0,
  responses_sent: 0,
};

const DEFAULT_PREFERENCES: CustomerSMSPreferences = {
  customer_id: 0,
  sms_enabled: true,
  opt_out_status: 'opted_in',
  booking_confirmation: true,
  appointment_reminders: true,
  on_my_way_alerts: true,
  service_complete: true,
  invoice_notifications: true,
  payment_reminders: true,
  review_requests: true,
  marketing_messages: false,
  preferred_reminder_hours: 24,
  quiet_hours_enabled: false,
  quiet_start: '21:00',
  quiet_end: '08:00',
  primary_phone: '',
  updated_at: new Date().toISOString(),
};

// =============================================================================
// Settings & Configuration Hooks
// =============================================================================

/**
 * Get SMS notification settings
 */
export function useSMSNotificationSettings() {
  return useQuery({
    queryKey: smsNotificationKeys.settings(),
    queryFn: async (): Promise<SMSNotificationSettings> => {
      return withFallback(
        async () => {
          const { data } = await apiClient.get('/sms/notifications/settings');
          return data;
        },
        DEFAULT_SETTINGS
      );
    },
  });
}

/**
 * Update SMS notification settings
 */
export function useUpdateSMSNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<SMSNotificationSettings>): Promise<SMSNotificationSettings> => {
      const { data } = await apiClient.put('/sms/notifications/settings', settings);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsNotificationKeys.settings() });
    },
  });
}

// =============================================================================
// Template Hooks
// =============================================================================

/**
 * Get all notification templates
 */
export function useSMSNotificationTemplates() {
  return useQuery({
    queryKey: smsNotificationKeys.templates(),
    queryFn: async (): Promise<SMSNotificationTemplate[]> => {
      return withFallback(
        async () => {
          const { data } = await apiClient.get('/sms/notifications/templates');
          return data.templates || [];
        },
        []
      );
    },
  });
}

/**
 * Get templates by trigger type
 */
export function useSMSTemplatesByTrigger(trigger: NotificationTrigger) {
  return useQuery({
    queryKey: smsNotificationKeys.templatesByTrigger(trigger),
    queryFn: async (): Promise<SMSNotificationTemplate[]> => {
      return withFallback(
        async () => {
          const { data } = await apiClient.get(`/sms/notifications/templates?trigger=${trigger}`);
          return data.templates || [];
        },
        []
      );
    },
    enabled: !!trigger,
  });
}

/**
 * Get single template
 */
export function useSMSNotificationTemplate(id: string) {
  return useQuery({
    queryKey: smsNotificationKeys.template(id),
    queryFn: async (): Promise<SMSNotificationTemplate> => {
      const { data } = await apiClient.get(`/sms/notifications/templates/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Create notification template
 */
export function useCreateNotificationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      template: Omit<SMSNotificationTemplate, 'id' | 'created_at' | 'updated_at' | 'variables' | 'character_count' | 'segment_count'>
    ): Promise<SMSNotificationTemplate> => {
      const { data } = await apiClient.post('/sms/notifications/templates', template);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsNotificationKeys.templates() });
    },
  });
}

/**
 * Update notification template
 */
export function useUpdateNotificationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...template
    }: Partial<SMSNotificationTemplate> & { id: string }): Promise<SMSNotificationTemplate> => {
      const { data } = await apiClient.put(`/sms/notifications/templates/${id}`, template);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: smsNotificationKeys.templates() });
      queryClient.invalidateQueries({ queryKey: smsNotificationKeys.template(variables.id) });
    },
  });
}

/**
 * Delete notification template
 */
export function useDeleteNotificationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/sms/notifications/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsNotificationKeys.templates() });
    },
  });
}

/**
 * Preview template with variables
 */
export function usePreviewNotificationTemplate() {
  return useMutation({
    mutationFn: async (params: {
      template_id: string;
      variables: Record<string, string>;
    }): Promise<{ preview: string; character_count: number; segment_count: number }> => {
      const { data } = await apiClient.post('/sms/notifications/templates/preview', params);
      return data;
    },
  });
}

// =============================================================================
// Send Notification Hooks
// =============================================================================

/**
 * Send single notification
 */
export function useSendNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SendNotificationRequest): Promise<SendNotificationResponse> => {
      const { data } = await apiClient.post('/sms/notifications/send', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsNotificationKeys.notifications() });
      queryClient.invalidateQueries({ queryKey: smsNotificationKeys.stats() });
    },
  });
}

/**
 * Send bulk notifications
 */
export function useSendBulkNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SendBulkNotificationRequest): Promise<BulkSendResponse> => {
      const { data } = await apiClient.post('/sms/notifications/send-bulk', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsNotificationKeys.notifications() });
      queryClient.invalidateQueries({ queryKey: smsNotificationKeys.stats() });
    },
  });
}

/**
 * Send "On My Way" notification with ETA
 */
export function useSendETANotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ETANotificationData): Promise<SendNotificationResponse> => {
      const { data: response } = await apiClient.post('/sms/notifications/send-eta', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsNotificationKeys.notifications() });
    },
  });
}

/**
 * Schedule a notification for later
 */
export function useScheduleNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: SendNotificationRequest & { schedule_for: string }
    ): Promise<ScheduledNotification> => {
      const { data } = await apiClient.post('/sms/notifications/schedule', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsNotificationKeys.scheduled() });
    },
  });
}

/**
 * Cancel a scheduled notification
 */
export function useCancelScheduledNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/sms/notifications/scheduled/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsNotificationKeys.scheduled() });
    },
  });
}

// =============================================================================
// Notification History Hooks
// =============================================================================

/**
 * Get sent notifications with filters
 */
export function useSMSNotifications(filters?: NotificationFilters) {
  return useQuery({
    queryKey: smsNotificationKeys.notifications(filters),
    queryFn: async (): Promise<{ notifications: SMSNotification[]; total: number }> => {
      return withFallback(
        async () => {
          const params = new URLSearchParams();
          if (filters?.customer_id) params.append('customer_id', filters.customer_id.toString());
          if (filters?.status) params.append('status', filters.status);
          if (filters?.trigger) params.append('trigger', filters.trigger);
          if (filters?.from_date) params.append('from_date', filters.from_date);
          if (filters?.to_date) params.append('to_date', filters.to_date);
          if (filters?.page) params.append('page', filters.page.toString());
          if (filters?.page_size) params.append('page_size', filters.page_size.toString());

          const { data } = await apiClient.get(`/sms/notifications?${params.toString()}`);
          return data;
        },
        { notifications: [], total: 0 }
      );
    },
  });
}

/**
 * Get single notification details
 */
export function useSMSNotification(id: string) {
  return useQuery({
    queryKey: smsNotificationKeys.notification(id),
    queryFn: async (): Promise<SMSNotification> => {
      const { data } = await apiClient.get(`/sms/notifications/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Get scheduled notifications
 */
export function useScheduledNotifications(filters?: ScheduledFilters) {
  return useQuery({
    queryKey: smsNotificationKeys.scheduled(filters),
    queryFn: async (): Promise<ScheduledNotification[]> => {
      return withFallback(
        async () => {
          const params = new URLSearchParams();
          if (filters?.status) params.append('status', filters.status);
          if (filters?.trigger) params.append('trigger', filters.trigger);
          if (filters?.from_date) params.append('from_date', filters.from_date);
          if (filters?.to_date) params.append('to_date', filters.to_date);

          const { data } = await apiClient.get(`/sms/notifications/scheduled?${params.toString()}`);
          return data.scheduled || [];
        },
        []
      );
    },
  });
}

// =============================================================================
// Customer Preferences Hooks
// =============================================================================

/**
 * Get customer SMS preferences
 */
export function useCustomerSMSPreferences(customerId: number) {
  return useQuery({
    queryKey: smsNotificationKeys.customerPreferences(customerId),
    queryFn: async (): Promise<CustomerSMSPreferences> => {
      return withFallback(
        async () => {
          const { data } = await apiClient.get(`/sms/notifications/preferences/${customerId}`);
          return data;
        },
        { ...DEFAULT_PREFERENCES, customer_id: customerId }
      );
    },
    enabled: !!customerId,
  });
}

/**
 * Update customer SMS preferences
 */
export function useUpdateCustomerSMSPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      preferences,
    }: {
      customerId: number;
      preferences: Partial<CustomerSMSPreferences>;
    }): Promise<CustomerSMSPreferences> => {
      const { data } = await apiClient.put(`/sms/notifications/preferences/${customerId}`, preferences);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: smsNotificationKeys.customerPreferences(variables.customerId),
      });
    },
  });
}

/**
 * Opt out a customer (STOP handling)
 */
export function useOptOutCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: number): Promise<void> => {
      await apiClient.post(`/sms/notifications/opt-out/${customerId}`);
    },
    onSuccess: (_, customerId) => {
      queryClient.invalidateQueries({
        queryKey: smsNotificationKeys.customerPreferences(customerId),
      });
      queryClient.invalidateQueries({ queryKey: smsNotificationKeys.stats() });
    },
  });
}

/**
 * Opt in a customer (START handling)
 */
export function useOptInCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: number): Promise<void> => {
      await apiClient.post(`/sms/notifications/opt-in/${customerId}`);
    },
    onSuccess: (_, customerId) => {
      queryClient.invalidateQueries({
        queryKey: smsNotificationKeys.customerPreferences(customerId),
      });
      queryClient.invalidateQueries({ queryKey: smsNotificationKeys.stats() });
    },
  });
}

// =============================================================================
// Two-Way SMS / Conversations Hooks
// =============================================================================

/**
 * Get SMS conversations list
 */
export function useSMSConversationsList() {
  return useQuery({
    queryKey: smsNotificationKeys.conversations(),
    queryFn: async (): Promise<SMSConversation[]> => {
      return withFallback(
        async () => {
          const { data } = await apiClient.get('/sms/notifications/conversations');
          return data.conversations || [];
        },
        []
      );
    },
    refetchInterval: 30000, // Poll every 30 seconds for new messages
  });
}

/**
 * Get conversation with a specific customer
 */
export function useSMSConversationDetail(customerId: number) {
  return useQuery({
    queryKey: smsNotificationKeys.conversation(customerId),
    queryFn: async (): Promise<SMSConversation> => {
      const { data } = await apiClient.get(`/sms/notifications/conversations/${customerId}`);
      return data;
    },
    enabled: !!customerId,
    refetchInterval: 10000, // Poll more frequently when viewing conversation
  });
}

/**
 * Send reply in conversation
 */
export function useSendConversationReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      message,
    }: {
      customerId: number;
      message: string;
    }): Promise<SendNotificationResponse> => {
      const { data } = await apiClient.post(`/sms/notifications/conversations/${customerId}/reply`, {
        message,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: smsNotificationKeys.conversation(variables.customerId),
      });
      queryClient.invalidateQueries({ queryKey: smsNotificationKeys.conversations() });
    },
  });
}

/**
 * Mark conversation as read
 */
export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: number): Promise<void> => {
      await apiClient.post(`/sms/notifications/conversations/${customerId}/read`);
    },
    onSuccess: (_, customerId) => {
      queryClient.invalidateQueries({
        queryKey: smsNotificationKeys.conversation(customerId),
      });
      queryClient.invalidateQueries({ queryKey: smsNotificationKeys.conversations() });
    },
  });
}

// =============================================================================
// Inbound Message Hooks
// =============================================================================

/**
 * Get inbound messages
 */
export function useInboundMessages(filters?: InboundFilters) {
  return useQuery({
    queryKey: smsNotificationKeys.inbound(filters),
    queryFn: async (): Promise<{ messages: InboundSMS[]; total: number }> => {
      return withFallback(
        async () => {
          const params = new URLSearchParams();
          if (filters?.customer_id) params.append('customer_id', filters.customer_id.toString());
          if (filters?.requires_response !== undefined)
            params.append('requires_response', filters.requires_response.toString());
          if (filters?.from_date) params.append('from_date', filters.from_date);
          if (filters?.to_date) params.append('to_date', filters.to_date);

          const { data } = await apiClient.get(`/sms/notifications/inbound?${params.toString()}`);
          return data;
        },
        { messages: [], total: 0 }
      );
    },
    refetchInterval: 30000,
  });
}

/**
 * Route inbound message to user/department
 */
export function useRouteInboundMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      routeTo,
    }: {
      messageId: string;
      routeTo: string;
    }): Promise<void> => {
      await apiClient.post(`/sms/notifications/inbound/${messageId}/route`, { route_to: routeTo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsNotificationKeys.inbound() });
    },
  });
}

// =============================================================================
// Statistics Hooks
// =============================================================================

/**
 * Get SMS delivery statistics
 */
export function useSMSDeliveryStats(period: 'today' | 'week' | 'month' | 'all_time' = 'month') {
  return useQuery({
    queryKey: smsNotificationKeys.stats(period),
    queryFn: async (): Promise<SMSDeliveryStats> => {
      return withFallback(
        async () => {
          const { data } = await apiClient.get(`/sms/notifications/stats?period=${period}`);
          return data;
        },
        { ...DEFAULT_STATS, period }
      );
    },
  });
}

// =============================================================================
// Queue Management Hooks
// =============================================================================

/**
 * Get notification queue status
 */
export function useNotificationQueue() {
  return useQuery({
    queryKey: smsNotificationKeys.queue(),
    queryFn: async (): Promise<{
      queue: NotificationQueueItem[];
      total_pending: number;
      total_processing: number;
    }> => {
      return withFallback(
        async () => {
          const { data } = await apiClient.get('/sms/notifications/queue');
          return data;
        },
        { queue: [], total_pending: 0, total_processing: 0 }
      );
    },
    refetchInterval: 5000, // Refresh queue status frequently
  });
}

/**
 * Retry failed notification
 */
export function useRetryNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<SendNotificationResponse> => {
      const { data } = await apiClient.post(`/sms/notifications/queue/${id}/retry`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsNotificationKeys.queue() });
      queryClient.invalidateQueries({ queryKey: smsNotificationKeys.notifications() });
    },
  });
}

/**
 * Cancel queued notification
 */
export function useCancelQueuedNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/sms/notifications/queue/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsNotificationKeys.queue() });
    },
  });
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Test Twilio connection
 */
export function useTestTwilioConnection() {
  return useMutation({
    mutationFn: async (): Promise<{ success: boolean; message: string }> => {
      const { data } = await apiClient.post('/sms/notifications/test-connection');
      return data;
    },
  });
}

/**
 * Send test notification
 */
export function useSendTestNotification() {
  return useMutation({
    mutationFn: async (phone: string): Promise<SendNotificationResponse> => {
      const { data } = await apiClient.post('/sms/notifications/test', { phone });
      return data;
    },
  });
}

/**
 * Look up customer by phone number
 */
export function useLookupCustomerByPhone() {
  return useMutation({
    mutationFn: async (
      phone: string
    ): Promise<{ customer_id: number; customer_name: string } | null> => {
      const { data } = await apiClient.get(`/sms/notifications/lookup?phone=${encodeURIComponent(phone)}`);
      return data;
    },
  });
}
