import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Communication timing recommendation
 */
export interface CommunicationTiming {
  customer_id: string;
  best_time: string;
  best_day: string;
  response_probability: number;
  channel_preference: "email" | "sms" | "phone";
  reasoning: string;
}

/**
 * Message optimization result
 */
export interface MessageOptimization {
  original: string;
  optimized: string;
  improvements: string[];
  tone_score: number;
  clarity_score: number;
  predicted_response_rate: number;
}

/**
 * Communication analytics
 */
export interface CommunicationAnalytics {
  total_sent: number;
  response_rate: number;
  avg_response_time_hours: number;
  best_performing_channel: string;
  by_channel: ChannelMetrics[];
  by_time: TimeMetrics[];
  suggestions: string[];
}

export interface ChannelMetrics {
  channel: string;
  sent: number;
  opened: number;
  responded: number;
  response_rate: number;
}

export interface TimeMetrics {
  hour: number;
  response_rate: number;
  volume: number;
}

/**
 * Get optimal communication timing for a customer
 */
export function useCommunicationTiming(customerId: string) {
  return useQuery({
    queryKey: ["communication-timing", customerId],
    queryFn: async (): Promise<CommunicationTiming> => {
      const response = await apiClient.get(
        `/ai/communications/timing/${customerId}`,
      );
      return response.data;
    },
    enabled: !!customerId,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Optimize a message for better engagement
 */
export function useOptimizeMessage() {
  return useMutation({
    mutationFn: async (params: {
      message: string;
      channel: "email" | "sms" | "phone";
      purpose: "appointment" | "followup" | "promotion" | "reminder";
      customer_type?: "residential" | "commercial";
    }): Promise<MessageOptimization> => {
      const response = await apiClient.post(
        "/ai/communications/optimize",
        params,
      );
      return response.data;
    },
  });
}

/**
 * Get communication analytics
 */
export function useCommunicationAnalytics(dateRange?: {
  start: string;
  end: string;
}) {
  return useQuery({
    queryKey: ["communication-analytics", dateRange],
    queryFn: async (): Promise<CommunicationAnalytics> => {
      const response = await apiClient.get("/ai/communications/analytics", {
        params: dateRange,
      });
      return response.data;
    },
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Generate AI-suggested follow-up message
 */
export function useGenerateFollowUp() {
  return useMutation({
    mutationFn: async (params: {
      customer_id: string;
      context:
        | "after_service"
        | "missed_appointment"
        | "quote_sent"
        | "overdue_payment";
    }): Promise<{
      message: string;
      subject?: string;
      recommended_channel: string;
    }> => {
      const response = await apiClient.post(
        "/ai/communications/generate-followup",
        params,
      );
      return response.data;
    },
  });
}
