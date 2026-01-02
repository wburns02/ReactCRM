import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, withFallback } from '@/api/client';

/**
 * SMS Types
 */
export interface SMSTemplate {
  id: string;
  name: string;
  type: 'appointment_reminder' | 'appointment_confirmation' | 'service_complete' | 'invoice_sent' | 'payment_reminder' | 'custom';
  content: string;
  variables: string[]; // Available template variables like {{customer_name}}, {{appointment_date}}
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SMSMessage {
  id: string;
  to_phone: string;
  from_phone: string;
  content: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  direction: 'inbound' | 'outbound';
  twilio_sid?: string;
  error_message?: string;
  customer_id?: number;
  work_order_id?: string;
  sent_at: string;
  delivered_at?: string;
}

export interface SMSSettings {
  twilio_enabled: boolean;
  twilio_phone_number?: string;
  twilio_account_status?: 'active' | 'suspended' | 'pending';
  // Auto-send settings
  auto_appointment_reminder: boolean;
  reminder_hours_before: number; // Hours before appointment to send reminder
  auto_service_complete: boolean;
  auto_invoice_sent: boolean;
  auto_payment_reminder: boolean;
  payment_reminder_days: number; // Days after invoice is overdue
  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_start: string;
  quiet_end: string;
  // Opt-out tracking
  total_opted_out: number;
}

export interface SMSStats {
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  delivery_rate: number;
  messages_today: number;
  messages_this_month: number;
  opt_out_count: number;
}

export interface SendSMSRequest {
  to_phone: string;
  message: string;
  customer_id?: number;
  work_order_id?: string;
  template_id?: string;
  template_variables?: Record<string, string>;
}

export interface SMSConversation {
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

/**
 * Default values for 404 fallback
 */
const DEFAULT_SETTINGS: SMSSettings = {
  twilio_enabled: false,
  auto_appointment_reminder: false,
  reminder_hours_before: 24,
  auto_service_complete: false,
  auto_invoice_sent: false,
  auto_payment_reminder: false,
  payment_reminder_days: 7,
  quiet_hours_enabled: false,
  quiet_start: '22:00',
  quiet_end: '07:00',
  total_opted_out: 0,
};

const DEFAULT_STATS: SMSStats = {
  total_sent: 0,
  total_delivered: 0,
  total_failed: 0,
  delivery_rate: 0,
  messages_today: 0,
  messages_this_month: 0,
  opt_out_count: 0,
};

/**
 * Query keys for SMS
 */
export const smsKeys = {
  all: ['sms'] as const,
  settings: () => [...smsKeys.all, 'settings'] as const,
  stats: () => [...smsKeys.all, 'stats'] as const,
  templates: () => [...smsKeys.all, 'templates'] as const,
  template: (id: string) => [...smsKeys.all, 'template', id] as const,
  messages: (filters?: { customer_id?: number; status?: string }) =>
    [...smsKeys.all, 'messages', filters] as const,
  conversations: () => [...smsKeys.all, 'conversations'] as const,
  conversation: (customerId: number) => [...smsKeys.all, 'conversation', customerId] as const,
};

/**
 * Get SMS settings
 * Returns defaults if endpoint not implemented (404)
 */
export function useSMSSettings() {
  return useQuery({
    queryKey: smsKeys.settings(),
    queryFn: async (): Promise<SMSSettings> => {
      return withFallback(
        async () => {
          const { data } = await apiClient.get('/sms/settings');
          return data;
        },
        DEFAULT_SETTINGS
      );
    },
  });
}

/**
 * Update SMS settings
 */
export function useUpdateSMSSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<SMSSettings>): Promise<SMSSettings> => {
      const { data } = await apiClient.put('/sms/settings', settings);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.settings() });
    },
  });
}

/**
 * Get SMS stats
 * Returns defaults if endpoint not implemented (404)
 */
export function useSMSStats() {
  return useQuery({
    queryKey: smsKeys.stats(),
    queryFn: async (): Promise<SMSStats> => {
      return withFallback(
        async () => {
          const { data } = await apiClient.get('/sms/stats');
          return data;
        },
        DEFAULT_STATS
      );
    },
  });
}

/**
 * Get SMS templates
 * Returns empty array if endpoint not implemented (404)
 */
export function useSMSTemplates() {
  return useQuery({
    queryKey: smsKeys.templates(),
    queryFn: async (): Promise<SMSTemplate[]> => {
      return withFallback(
        async () => {
          const { data } = await apiClient.get('/sms/templates');
          return data.templates || [];
        },
        []
      );
    },
  });
}

/**
 * Get single SMS template
 */
export function useSMSTemplate(id: string) {
  return useQuery({
    queryKey: smsKeys.template(id),
    queryFn: async (): Promise<SMSTemplate> => {
      const { data } = await apiClient.get(`/sms/templates/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Create SMS template
 */
export function useCreateSMSTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<SMSTemplate, 'id' | 'created_at' | 'updated_at' | 'variables'>): Promise<SMSTemplate> => {
      const { data } = await apiClient.post('/sms/templates', template);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.templates() });
    },
  });
}

/**
 * Update SMS template
 */
export function useUpdateSMSTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...template }: Partial<SMSTemplate> & { id: string }): Promise<SMSTemplate> => {
      const { data } = await apiClient.put(`/sms/templates/${id}`, template);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: smsKeys.templates() });
      queryClient.invalidateQueries({ queryKey: smsKeys.template(variables.id) });
    },
  });
}

/**
 * Delete SMS template
 */
export function useDeleteSMSTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/sms/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.templates() });
    },
  });
}

/**
 * Send SMS message
 */
export function useSendSMS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SendSMSRequest): Promise<SMSMessage> => {
      const { data } = await apiClient.post('/sms/send', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.messages() });
      queryClient.invalidateQueries({ queryKey: smsKeys.stats() });
    },
  });
}

/**
 * Get SMS messages
 * Returns empty list if endpoint not implemented (404)
 */
export function useSMSMessages(filters?: { customer_id?: number; status?: string; limit?: number }) {
  return useQuery({
    queryKey: smsKeys.messages(filters),
    queryFn: async (): Promise<{ messages: SMSMessage[]; total: number }> => {
      return withFallback(
        async () => {
          const params = new URLSearchParams();
          if (filters?.customer_id) params.append('customer_id', filters.customer_id.toString());
          if (filters?.status) params.append('status', filters.status);
          if (filters?.limit) params.append('limit', filters.limit.toString());

          const { data } = await apiClient.get(`/sms/messages?${params.toString()}`);
          return data;
        },
        { messages: [], total: 0 }
      );
    },
  });
}

/**
 * Get SMS conversations list
 * Returns empty array if endpoint not implemented (404)
 */
export function useSMSConversations() {
  return useQuery({
    queryKey: smsKeys.conversations(),
    queryFn: async (): Promise<SMSConversation[]> => {
      return withFallback(
        async () => {
          const { data } = await apiClient.get('/sms/conversations');
          return data.conversations || [];
        },
        []
      );
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });
}

/**
 * Get conversation with a customer
 * Returns empty array if endpoint not implemented (404)
 */
export function useSMSConversation(customerId: number) {
  return useQuery({
    queryKey: smsKeys.conversation(customerId),
    queryFn: async (): Promise<SMSMessage[]> => {
      return withFallback(
        async () => {
          const { data } = await apiClient.get(`/sms/conversations/${customerId}`);
          return data.messages || [];
        },
        []
      );
    },
    enabled: !!customerId,
  });
}

/**
 * Send bulk SMS
 */
export function useSendBulkSMS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      customer_ids: number[];
      template_id: string;
      template_variables?: Record<string, string>;
    }): Promise<{ sent: number; failed: number; errors: string[] }> => {
      const { data } = await apiClient.post('/sms/send-bulk', params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.messages() });
      queryClient.invalidateQueries({ queryKey: smsKeys.stats() });
    },
  });
}

/**
 * Test Twilio configuration
 */
export function useTestTwilioConnection() {
  return useMutation({
    mutationFn: async (): Promise<{ success: boolean; message: string }> => {
      const { data } = await apiClient.post('/sms/test-connection');
      return data;
    },
  });
}

/**
 * Preview SMS template with variables
 */
export function usePreviewSMSTemplate() {
  return useMutation({
    mutationFn: async (params: {
      template_id: string;
      variables: Record<string, string>;
    }): Promise<{ preview: string; character_count: number }> => {
      const { data } = await apiClient.post('/sms/templates/preview', params);
      return data;
    },
  });
}
