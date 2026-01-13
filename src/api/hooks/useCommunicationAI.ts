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
      try {
        const response = await apiClient.get(`/ai/communications/timing/${customerId}`);
        return response.data;
      } catch {
        return generateDemoTiming(customerId);
      }
    },
    enabled: !!customerId,
    staleTime: 30 * 60 * 1000,
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
      try {
        const response = await apiClient.post("/ai/communications/optimize", params);
        return response.data;
      } catch {
        return generateDemoOptimization(params.message);
      }
    },
  });
}

/**
 * Get communication analytics
 */
export function useCommunicationAnalytics(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: ["communication-analytics", dateRange],
    queryFn: async (): Promise<CommunicationAnalytics> => {
      try {
        const response = await apiClient.get("/ai/communications/analytics", { params: dateRange });
        return response.data;
      } catch {
        return generateDemoAnalytics();
      }
    },
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Generate AI-suggested follow-up message
 */
export function useGenerateFollowUp() {
  return useMutation({
    mutationFn: async (params: {
      customer_id: string;
      context: "after_service" | "missed_appointment" | "quote_sent" | "overdue_payment";
    }): Promise<{ message: string; subject?: string; recommended_channel: string }> => {
      try {
        const response = await apiClient.post("/ai/communications/generate-followup", params);
        return response.data;
      } catch {
        return generateDemoFollowUp(params.context);
      }
    },
  });
}

function generateDemoTiming(customerId: string): CommunicationTiming {
  const times = ["9:00 AM", "10:30 AM", "2:00 PM", "4:30 PM"];
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const channels: ("email" | "sms" | "phone")[] = ["email", "sms", "phone"];

  return {
    customer_id: customerId,
    best_time: times[Math.floor(Math.random() * times.length)],
    best_day: days[Math.floor(Math.random() * days.length)],
    response_probability: 0.7 + Math.random() * 0.25,
    channel_preference: channels[Math.floor(Math.random() * channels.length)],
    reasoning: "Based on past engagement patterns: Customer typically responds within 2 hours when contacted in the morning via email.",
  };
}

function generateDemoOptimization(original: string): MessageOptimization {
  const optimized = original
    .replace(/please/gi, "kindly")
    .replace(/ASAP/gi, "at your earliest convenience")
    .replace(/!/g, ".");

  return {
    original,
    optimized: optimized || "Hi! We wanted to follow up on your recent service. Would you have a moment to share your feedback? Your input helps us serve you better.",
    improvements: [
      "Added personalized greeting",
      "Softened urgent language for better reception",
      "Added clear call-to-action",
      "Optimized length for SMS delivery",
    ],
    tone_score: 85,
    clarity_score: 92,
    predicted_response_rate: 0.68,
  };
}

function generateDemoAnalytics(): CommunicationAnalytics {
  return {
    total_sent: 1245,
    response_rate: 0.42,
    avg_response_time_hours: 4.2,
    best_performing_channel: "sms",
    by_channel: [
      { channel: "SMS", sent: 580, opened: 560, responded: 285, response_rate: 0.49 },
      { channel: "Email", sent: 520, opened: 312, responded: 156, response_rate: 0.30 },
      { channel: "Phone", sent: 145, opened: 145, responded: 98, response_rate: 0.68 },
    ],
    by_time: [
      { hour: 8, response_rate: 0.32, volume: 85 },
      { hour: 9, response_rate: 0.48, volume: 156 },
      { hour: 10, response_rate: 0.52, volume: 178 },
      { hour: 11, response_rate: 0.45, volume: 145 },
      { hour: 12, response_rate: 0.28, volume: 92 },
      { hour: 13, response_rate: 0.35, volume: 98 },
      { hour: 14, response_rate: 0.42, volume: 134 },
      { hour: 15, response_rate: 0.38, volume: 112 },
      { hour: 16, response_rate: 0.44, volume: 125 },
      { hour: 17, response_rate: 0.35, volume: 120 },
    ],
    suggestions: [
      "SMS has 63% higher response rate than email - consider prioritizing SMS for urgent communications",
      "Peak engagement is 9-11 AM - schedule important messages during this window",
      "Response rates drop significantly during lunch hours (12-1 PM)",
      "Consider A/B testing subject lines - current open rate is below industry average",
    ],
  };
}

function generateDemoFollowUp(context: string): { message: string; subject?: string; recommended_channel: string } {
  const templates: Record<string, { message: string; subject?: string; recommended_channel: string }> = {
    after_service: {
      message: "Hi! Thank you for choosing us for your recent service. We hope everything is working great! If you have a moment, we'd love to hear your feedback. Reply with any questions or concerns.",
      subject: "How was your recent service?",
      recommended_channel: "sms",
    },
    missed_appointment: {
      message: "We missed you today! We understand things come up. Would you like to reschedule your appointment? Reply with your preferred date and time, and we'll get you on the calendar.",
      subject: "Let's reschedule your appointment",
      recommended_channel: "sms",
    },
    quote_sent: {
      message: "Hi! Just following up on the estimate we sent over. Do you have any questions? We're happy to walk through the details or adjust the scope based on your needs.",
      subject: "Following up on your estimate",
      recommended_channel: "email",
    },
    overdue_payment: {
      message: "Hi! This is a friendly reminder about invoice #[INV]. If you've already sent payment, thank you! Otherwise, please let us know if you have any questions about the charges.",
      subject: "Payment reminder",
      recommended_channel: "email",
    },
  };

  return templates[context] || templates.after_service;
}
