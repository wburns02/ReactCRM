/**
 * Communication Hooks
 *
 * Custom hooks for SMS, email, and notification management.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import type {
  SMSNotification,
  SMSConversation,
  SendNotificationResponse,
  ScheduledNotification,
  CustomerSMSPreferences,
  SMSDeliveryStats,
} from "@/api/types/sms.ts";
import type {
  CommunicationFilters,
  CommunicationListResponse,
  SendSMSData,
  SendEmailData,
} from "@/api/types/communication.ts";

// ============================================================================
// Query Keys
// ============================================================================

export const communicationKeys = {
  all: ["communications"] as const,
  lists: () => [...communicationKeys.all, "list"] as const,
  list: (filters: CommunicationFilters) =>
    [...communicationKeys.lists(), filters] as const,
  history: (workOrderId: string) =>
    [...communicationKeys.all, "history", workOrderId] as const,
  conversation: (customerId: string) =>
    [...communicationKeys.all, "conversation", customerId] as const,
  scheduled: () => [...communicationKeys.all, "scheduled"] as const,
  preferences: (customerId: string) =>
    [...communicationKeys.all, "preferences", customerId] as const,
  stats: () => [...communicationKeys.all, "stats"] as const,
  templates: () => [...communicationKeys.all, "templates"] as const,
  calls: (workOrderId: string) =>
    [...communicationKeys.all, "calls", workOrderId] as const,
};

// ============================================================================
// Send SMS Hook
// ============================================================================

interface SendSMSParams {
  to: string;
  message: string;
  customerId?: string;
  workOrderId?: string;
  templateId?: string;
}

export function useSendSMS() {
  const queryClient = useQueryClient();

  return useMutation<SendNotificationResponse, Error, SendSMSParams>({
    mutationFn: async ({ to, message, customerId, templateId }) => {
      const payload: SendSMSData = {
        customer_id: customerId || "",
        phone: to,
        message,
        template_id: templateId,
      };
      const response = await apiClient.post<SendNotificationResponse>(
        "/communications/sms",
        payload,
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: communicationKeys.lists() });
      if (variables.customerId) {
        queryClient.invalidateQueries({
          queryKey: communicationKeys.conversation(variables.customerId),
        });
      }
      if (variables.workOrderId) {
        queryClient.invalidateQueries({
          queryKey: communicationKeys.history(variables.workOrderId),
        });
      }
    },
  });
}

// ============================================================================
// Send Email Hook
// ============================================================================

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  customerId?: string;
  workOrderId?: string;
  templateId?: string;
}

export function useSendEmail() {
  const queryClient = useQueryClient();

  return useMutation<SendNotificationResponse, Error, SendEmailParams>({
    mutationFn: async ({ to, subject, body, customerId, templateId }) => {
      const payload: SendEmailData = {
        customer_id: customerId || "",
        email: to,
        subject,
        message: body,
        template_id: templateId,
      };
      const response = await apiClient.post<SendNotificationResponse>(
        "/communications/email/send",
        payload,
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: communicationKeys.lists() });
      if (variables.workOrderId) {
        queryClient.invalidateQueries({
          queryKey: communicationKeys.history(variables.workOrderId),
        });
      }
    },
  });
}

// ============================================================================
// Notification History Hook
// ============================================================================

interface NotificationHistoryResponse {
  items: SMSNotification[];
  total: number;
  page: number;
  page_size: number;
}

export function useNotificationHistory(workOrderId: string, enabled = true) {
  return useQuery<NotificationHistoryResponse, Error>({
    queryKey: communicationKeys.history(workOrderId),
    queryFn: async () => {
      const response = await apiClient.get<NotificationHistoryResponse>(
        `/work-orders/${workOrderId}/communications`,
      );
      return response.data;
    },
    enabled: enabled && !!workOrderId,
  });
}

// ============================================================================
// Conversation Hook
// ============================================================================

export function useConversation(customerId: string, enabled = true) {
  return useQuery<SMSConversation, Error>({
    queryKey: communicationKeys.conversation(customerId),
    queryFn: async () => {
      const response = await apiClient.get<SMSConversation>(
        `/customers/${customerId}/sms-conversation`,
      );
      return response.data;
    },
    enabled: enabled && !!customerId,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });
}

// ============================================================================
// Communication List Hook
// ============================================================================

export function useCommunications(filters: CommunicationFilters = {}) {
  return useQuery<CommunicationListResponse, Error>({
    queryKey: communicationKeys.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<CommunicationListResponse>(
        "/communications",
        { params: filters },
      );
      return response.data;
    },
  });
}

// ============================================================================
// Resend Notification Hook
// ============================================================================

export function useResendNotification() {
  const queryClient = useQueryClient();

  return useMutation<SendNotificationResponse, Error, string>({
    mutationFn: async (notificationId) => {
      const response = await apiClient.post<SendNotificationResponse>(
        `/communications/${notificationId}/resend`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communicationKeys.lists() });
    },
  });
}

// ============================================================================
// Scheduled Notifications Hook
// ============================================================================

export function useScheduledNotifications() {
  return useQuery<ScheduledNotification[], Error>({
    queryKey: communicationKeys.scheduled(),
    queryFn: async () => {
      const response = await apiClient.get<{ items: ScheduledNotification[] }>(
        "/communications/scheduled",
      );
      return response.data.items;
    },
  });
}

// ============================================================================
// Cancel Scheduled Notification Hook
// ============================================================================

export function useCancelScheduledNotification() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (notificationId) => {
      await apiClient.delete(`/communications/scheduled/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: communicationKeys.scheduled(),
      });
    },
  });
}

// ============================================================================
// Customer SMS Preferences Hook
// ============================================================================

export function useCustomerSMSPreferences(customerId: string, enabled = true) {
  return useQuery<CustomerSMSPreferences, Error>({
    queryKey: communicationKeys.preferences(customerId),
    queryFn: async () => {
      const response = await apiClient.get<CustomerSMSPreferences>(
        `/customers/${customerId}/sms-preferences`,
      );
      return response.data;
    },
    enabled: enabled && !!customerId,
  });
}

// ============================================================================
// Update SMS Preferences Hook
// ============================================================================

export function useUpdateSMSPreferences() {
  const queryClient = useQueryClient();

  return useMutation<
    CustomerSMSPreferences,
    Error,
    { customerId: string; preferences: Partial<CustomerSMSPreferences> }
  >({
    mutationFn: async ({ customerId, preferences }) => {
      const response = await apiClient.patch<CustomerSMSPreferences>(
        `/customers/${customerId}/sms-preferences`,
        preferences,
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: communicationKeys.preferences(variables.customerId),
      });
    },
  });
}

// ============================================================================
// SMS Delivery Stats Hook
// ============================================================================

export function useSMSDeliveryStats() {
  return useQuery<SMSDeliveryStats, Error>({
    queryKey: communicationKeys.stats(),
    queryFn: async () => {
      const response = await apiClient.get<SMSDeliveryStats>(
        "/communications/stats",
      );
      return response.data;
    },
  });
}

// ============================================================================
// Generate Portal Link Hook
// ============================================================================

interface PortalLinkParams {
  workOrderId: string;
  expirationHours?: number;
}

interface PortalLinkResponse {
  link: string;
  expiresAt: string;
  qrCode: string;
}

export function useGeneratePortalLink() {
  return useMutation<PortalLinkResponse, Error, PortalLinkParams>({
    mutationFn: async ({ workOrderId, expirationHours = 72 }) => {
      const response = await apiClient.post<PortalLinkResponse>(
        `/work-orders/${workOrderId}/portal-link`,
        { expiration_hours: expirationHours },
      );
      return response.data;
    },
  });
}

// ============================================================================
// Voice Call Log Hook
// ============================================================================

export interface VoiceCall {
  id: string;
  workOrderId: string;
  customerId: string;
  direction: "inbound" | "outbound";
  duration: number; // seconds
  status: "completed" | "missed" | "voicemail" | "busy" | "failed";
  fromPhone: string;
  toPhone: string;
  recordingUrl?: string;
  transcription?: string;
  notes?: string;
  timestamp: string;
  agentId?: string;
  agentName?: string;
}

interface VoiceCallLogResponse {
  items: VoiceCall[];
  total: number;
}

export function useVoiceCallLog(workOrderId: string, enabled = true) {
  return useQuery<VoiceCallLogResponse, Error>({
    queryKey: communicationKeys.calls(workOrderId),
    queryFn: async () => {
      const response = await apiClient.get<VoiceCallLogResponse>(
        `/work-orders/${workOrderId}/calls`,
      );
      return response.data;
    },
    enabled: enabled && !!workOrderId,
  });
}

// ============================================================================
// Add Call Note Hook
// ============================================================================

export function useAddCallNote() {
  const queryClient = useQueryClient();

  return useMutation<
    VoiceCall,
    Error,
    { callId: string; workOrderId: string; notes: string }
  >({
    mutationFn: async ({ callId, notes }) => {
      const response = await apiClient.patch<VoiceCall>(`/calls/${callId}`, {
        notes,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: communicationKeys.calls(variables.workOrderId),
      });
    },
  });
}

// ============================================================================
// Test Notification Hook
// ============================================================================

interface TestNotificationParams {
  type: "sms" | "email";
  templateId: string;
  testPhone?: string;
  testEmail?: string;
}

export function useSendTestNotification() {
  return useMutation<SendNotificationResponse, Error, TestNotificationParams>({
    mutationFn: async ({ type, templateId, testPhone, testEmail }) => {
      const response = await apiClient.post<SendNotificationResponse>(
        "/communications/test",
        {
          type,
          template_id: templateId,
          test_phone: testPhone,
          test_email: testEmail,
        },
      );
      return response.data;
    },
  });
}
