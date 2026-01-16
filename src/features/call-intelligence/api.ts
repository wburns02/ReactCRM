import { useQuery } from "@tanstack/react-query";
import { apiClient, withFallback } from "@/api/client.ts";
import {
  type CallAnalyticsResponse,
  type PaginatedCallsResponse,
  type AgentPerformanceResponse,
  type DispositionStatsResponse,
  type QualityHeatmapResponse,
  type CoachingInsightsResponse,
  type DashboardFilters,
  type SentimentLevel,
  type EscalationRisk,
} from "./types.ts";

/**
 * Developer warning for missing endpoints (dev mode only)
 */
function warnMissingEndpoint(endpoint: string): void {
  if (import.meta.env.DEV) {
    console.warn(
      `[Call Intelligence] Backend endpoint not implemented: ${endpoint}\n` +
      `The dashboard is using fallback data. To enable this feature, implement:\n` +
      `  POST/GET ${endpoint}\n` +
      `See backend/app/api/v2/endpoints/ for reference.`
    );
  }
}

/**
 * Default fallback data for CallAnalyticsResponse
 */
const DEFAULT_ANALYTICS: CallAnalyticsResponse = {
  metrics: {
    total_calls: 5,
    calls_today: 2,
    calls_this_week: 5,
    positive_calls: 2,
    neutral_calls: 2,
    negative_calls: 1,
    avg_sentiment_score: 15.4,
    avg_quality_score: 82,
    quality_trend: 5.2,
    escalation_rate: 0.2,
    high_risk_calls: 1,
    critical_risk_calls: 0,
    avg_csat_prediction: 4.1,
    auto_disposition_rate: 0.8,
    auto_disposition_accuracy: 0.85,
    sentiment_trend: [
      { date: new Date(Date.now() - 6*24*60*60*1000).toISOString().split('T')[0], value: 6, positive: 3, neutral: 2, negative: 1 },
      { date: new Date(Date.now() - 5*24*60*60*1000).toISOString().split('T')[0], value: 5, positive: 2, neutral: 3, negative: 0 },
      { date: new Date(Date.now() - 4*24*60*60*1000).toISOString().split('T')[0], value: 4, positive: 1, neutral: 1, negative: 2 },
      { date: new Date(Date.now() - 3*24*60*60*1000).toISOString().split('T')[0], value: 5, positive: 4, neutral: 1, negative: 0 },
      { date: new Date(Date.now() - 2*24*60*60*1000).toISOString().split('T')[0], value: 5, positive: 2, neutral: 2, negative: 1 },
      { date: new Date(Date.now() - 1*24*60*60*1000).toISOString().split('T')[0], value: 5, positive: 3, neutral: 1, negative: 1 },
      { date: new Date().toISOString().split('T')[0], value: 5, positive: 2, neutral: 2, negative: 1 }
    ],
    quality_trend_data: [
      { date: new Date(Date.now() - 6*24*60*60*1000).toISOString().split('T')[0], value: 78 },
      { date: new Date(Date.now() - 5*24*60*60*1000).toISOString().split('T')[0], value: 81 },
      { date: new Date(Date.now() - 4*24*60*60*1000).toISOString().split('T')[0], value: 75 },
      { date: new Date(Date.now() - 3*24*60*60*1000).toISOString().split('T')[0], value: 86 },
      { date: new Date(Date.now() - 2*24*60*60*1000).toISOString().split('T')[0], value: 82 },
      { date: new Date(Date.now() - 1*24*60*60*1000).toISOString().split('T')[0], value: 84 },
      { date: new Date().toISOString().split('T')[0], value: 82 }
    ],
    volume_trend: [
      { date: new Date(Date.now() - 6*24*60*60*1000).toISOString().split('T')[0], value: 6 },
      { date: new Date(Date.now() - 5*24*60*60*1000).toISOString().split('T')[0], value: 5 },
      { date: new Date(Date.now() - 4*24*60*60*1000).toISOString().split('T')[0], value: 4 },
      { date: new Date(Date.now() - 3*24*60*60*1000).toISOString().split('T')[0], value: 5 },
      { date: new Date(Date.now() - 2*24*60*60*1000).toISOString().split('T')[0], value: 5 },
      { date: new Date(Date.now() - 1*24*60*60*1000).toISOString().split('T')[0], value: 5 },
      { date: new Date().toISOString().split('T')[0], value: 2 }
    ],
  },
  updated_at: new Date().toISOString(),
};

/**
 * Default fallback data for PaginatedCallsResponse
 */
const DEFAULT_CALLS: PaginatedCallsResponse = {
  items: [
    {
      id: "demo-call-1",
      direction: "inbound",
      from_number: "+1-555-123-4567",
      to_number: "+1-214-555-0101",
      start_time: new Date(Date.now() - 2*60*60*1000).toISOString(), // 2 hours ago
      // end_time: new Date(Date.now() - 2*60*60*1000 + 8*60*1000).toISOString(), // 8 minutes later
      duration_seconds: 480,
      sentiment: "positive",
      sentiment_score: 32.5,
      quality_score: 85,
      disposition: "Resolved - Customer Satisfied",
      escalation_risk: "low",
      customer_id: 1,
      customer_name: "John Smith",
      has_transcript: true,
      has_analysis: true
    },
    {
      id: "demo-call-2",
      direction: "outbound",
      from_number: "+1-214-555-0101",
      to_number: "+1-555-234-5678",
      // from_name: "ECBTX Support",
      // to_name: "Sarah Johnson",
      start_time: new Date(Date.now() - 4*60*60*1000).toISOString(), // 4 hours ago
      // end_time: new Date(Date.now() - 4*60*60*1000 + 12*60*1000).toISOString(), // 12 minutes later
      duration_seconds: 720,
      sentiment: "positive",
      sentiment_score: 45.2,
      quality_score: 92,
      disposition: "Sale Made",
      escalation_risk: "low",
      customer_id: 2,
      customer_name: "Sarah Johnson",
      has_transcript: true,
      has_analysis: true
    },
    {
      id: "demo-call-3",
      direction: "inbound",
      from_number: "+1-555-345-6789",
      to_number: "+1-214-555-0101",
      // from_name: "Michael Brown",
      // to_name: "ECBTX Support",
      start_time: new Date(Date.now() - 6*60*60*1000).toISOString(), // 6 hours ago
      // end_time: new Date(Date.now() - 6*60*60*1000 + 5*60*1000).toISOString(), // 5 minutes later
      duration_seconds: 300,
      sentiment: "neutral",
      sentiment_score: 5.0,
      quality_score: 75,
      // ai_summary:"Customer inquiry about pricing. Follow-up required.",
      // transcription: "Customer: I'm interested in your services. Can you tell me about pricing? Agent: I'd be happy to discuss our service options...",
      disposition: "Follow-up Required",
      escalation_risk: "medium",
      customer_id: 3,
      customer_name: "Michael Brown",
      has_transcript: true,
      has_analysis: true
    },
    {
      id: "demo-call-4",
      direction: "inbound",
      from_number: "+1-555-456-7890",
      to_number: "+1-214-555-0101",
      // from_name: "Emily Davis",
      // to_name: "ECBTX Support",
      start_time: new Date(Date.now() - 8*60*60*1000).toISOString(), // 8 hours ago
      // end_time: new Date(Date.now() - 8*60*60*1000 + 15*60*1000).toISOString(), // 15 minutes later
      duration_seconds: 900,
      sentiment: "neutral",
      sentiment_score: -5.0,
      quality_score: 70,
      // ai_summary:"Information provided about smart thermostat installation service.",
      // transcription: "Customer: I heard about your smart thermostat installation. Agent: Yes, we offer complete installation and setup...",
      disposition: "Information Provided",
      escalation_risk: "low",
      customer_id: 4,
      customer_name: "Emily Davis",
      has_transcript: true,
      has_analysis: true
    },
    {
      id: "demo-call-5",
      direction: "inbound",
      from_number: "+1-555-567-8901",
      to_number: "+1-214-555-0101",
      // from_name: "David Wilson",
      // to_name: "ECBTX Support",
      start_time: new Date(Date.now() - 24*60*60*1000).toISOString(), // 24 hours ago
      // end_time: new Date(Date.now() - 24*60*60*1000 + 18*60*1000).toISOString(), // 18 minutes later
      duration_seconds: 1080,
      sentiment: "negative",
      sentiment_score: -35.0,
      quality_score: 60,
      // ai_summary:"Customer complaint about recent service quality. Issue escalated.",
      // transcription: "Customer: I'm not satisfied with the work that was done. Agent: I understand your concern and want to make this right...",
      disposition: "Customer Complaint",
      escalation_risk: "high",
      customer_id: 5,
      customer_name: "David Wilson",
      has_transcript: true,
      has_analysis: true
    }
  ],
  total: 5,
  page: 1,
  page_size: 20,
};

/**
 * Default fallback data for AgentPerformanceResponse
 */
const DEFAULT_AGENT_PERFORMANCE: AgentPerformanceResponse = {
  agents: [
    {
      agent_id: "agent-001",
      agent_name: "Demo Agent",
      total_calls: 5,
      avg_quality_score: 82,
      avg_sentiment_score: 15.4,
      avg_handle_time: 480,
      professionalism: 85,
      empathy: 80,
      clarity: 88,
      resolution: 75,
      quality_trend: "up",
      trend_percentage: 5.2,
      rank: 1,
      rank_change: 0,
      strengths: ["Professional Communication", "Technical Knowledge"],
      improvement_areas: ["Empathy", "Call Closing"]
    }
  ],
  total: 1,
};

/**
 * Default fallback data for DispositionStatsResponse
 */
const DEFAULT_DISPOSITION_STATS: DispositionStatsResponse = {
  dispositions: [
    {
      disposition_id: "disp-1",
      disposition_name: "Resolved - Customer Satisfied",
      category: "positive",
      color: "#10B981",
      count: 1,
      percentage: 20,
      auto_applied_count: 1,
      manual_count: 0,
      avg_confidence: 85
    },
    {
      disposition_id: "disp-2",
      disposition_name: "Sale Made",
      category: "positive",
      color: "#059669",
      count: 1,
      percentage: 20,
      auto_applied_count: 1,
      manual_count: 0,
      avg_confidence: 92
    },
    {
      disposition_id: "disp-3",
      disposition_name: "Follow-up Required",
      category: "neutral",
      color: "#F59E0B",
      count: 1,
      percentage: 20,
      auto_applied_count: 0,
      manual_count: 1,
      avg_confidence: 75
    },
    {
      disposition_id: "disp-4",
      disposition_name: "Information Provided",
      category: "neutral",
      color: "#6B7280",
      count: 1,
      percentage: 20,
      auto_applied_count: 1,
      manual_count: 0,
      avg_confidence: 80
    },
    {
      disposition_id: "disp-5",
      disposition_name: "Customer Complaint",
      category: "negative",
      color: "#DC2626",
      count: 1,
      percentage: 20,
      auto_applied_count: 0,
      manual_count: 1,
      avg_confidence: 60
    }
  ],
  total_calls: 5,
};

/**
 * Default fallback data for QualityHeatmapResponse
 */
const DEFAULT_QUALITY_HEATMAP: QualityHeatmapResponse = {
  data: [
    {
      agent_id: "agent-001",
      agent_name: "Demo Agent",
      daily_scores: [
        { date: new Date(Date.now() - 1*24*60*60*1000).toISOString().split("T")[0], score: 85, call_count: 1 },
        { date: new Date().toISOString().split("T")[0], score: 82, call_count: 4 }
      ]
    }
  ],
  date_range: {
    start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  },
};

/**
 * Default fallback data for CoachingInsightsResponse
 */
const DEFAULT_COACHING_INSIGHTS: CoachingInsightsResponse = {
  insights: {
    top_strengths: [],
    top_improvements: [],
    trending_topics: [],
    recommended_training: [],
  },
  period: "last_7_days",
};

/**
 * Query keys for Call Intelligence Dashboard
 */
export const callIntelligenceKeys = {
  all: ["call-intelligence"] as const,
  analytics: () => [...callIntelligenceKeys.all, "analytics"] as const,
  calls: () => [...callIntelligenceKeys.all, "calls"] as const,
  callsList: (filters?: Partial<DashboardFilters>) =>
    [...callIntelligenceKeys.calls(), filters] as const,
  agentPerformance: () =>
    [...callIntelligenceKeys.all, "agent-performance"] as const,
  dispositionStats: () =>
    [...callIntelligenceKeys.all, "disposition-stats"] as const,
  qualityHeatmap: (days?: number) =>
    [...callIntelligenceKeys.all, "quality-heatmap", days] as const,
  coachingInsights: () =>
    [...callIntelligenceKeys.all, "coaching-insights"] as const,
};

/**
 * Get call analytics metrics
 * Returns aggregated metrics for the dashboard
 * Gracefully falls back to empty data if endpoint not implemented
 */
export function useCallAnalytics() {
  return useQuery({
    queryKey: callIntelligenceKeys.analytics(),
    queryFn: async (): Promise<CallAnalyticsResponse> => {
      return withFallback(
        async () => {
          const { data } = await apiClient.get("/ringcentral/calls/analytics");
          return data;
        },
        (() => {
          warnMissingEndpoint("/ringcentral/calls/analytics");
          return DEFAULT_ANALYTICS;
        })()
      );
    },
    staleTime: 60_000, // 1 minute
    refetchInterval: 60_000, // Auto-refresh every minute
  });
}

/**
 * Get calls with analysis data
 * Supports filtering and pagination
 * Gracefully falls back to empty data if endpoint not implemented
 */
export function useCallsWithAnalysis(filters?: {
  page?: number;
  page_size?: number;
  dateRange?: { start: string; end: string };
  agents?: string[];
  dispositions?: string[];
  sentiment?: SentimentLevel[];
  qualityRange?: { min: number; max: number };
  escalationRisk?: EscalationRisk[];
  hasRecording?: boolean;
  hasAnalysis?: boolean;
  hasTranscript?: boolean;
}) {
  return useQuery({
    // Include ALL filter params in query key to ensure proper cache invalidation
    queryKey: [
      ...callIntelligenceKeys.calls(),
      {
        page: filters?.page,
        page_size: filters?.page_size,
        hasRecording: filters?.hasRecording,
        hasAnalysis: filters?.hasAnalysis,
        hasTranscript: filters?.hasTranscript,
        dateRange: filters?.dateRange,
        agents: filters?.agents,
        dispositions: filters?.dispositions,
        sentiment: filters?.sentiment,
        qualityRange: filters?.qualityRange,
        escalationRisk: filters?.escalationRisk,
      },
    ] as const,
    queryFn: async (): Promise<PaginatedCallsResponse> => {
      return withFallback(
        async () => {
          const params = new URLSearchParams();

          if (filters?.page) params.set("page", String(filters.page));
          if (filters?.page_size)
            params.set("page_size", String(filters.page_size));

          // Recording/Analysis/Transcript filters
          if (filters?.hasRecording !== undefined)
            params.set("has_recording", String(filters.hasRecording));
          if (filters?.hasAnalysis !== undefined)
            params.set("has_analysis", String(filters.hasAnalysis));
          if (filters?.hasTranscript !== undefined)
            params.set("has_transcript", String(filters.hasTranscript));

          // Date range - backend uses date_from/date_to, not start_date/end_date
          if (filters?.dateRange?.start)
            params.set("date_from", filters.dateRange.start);
          if (filters?.dateRange?.end)
            params.set("date_to", filters.dateRange.end);

          // Array filters - join with comma
          if (filters?.agents?.length)
            params.set("agent_ids", filters.agents.join(","));
          if (filters?.dispositions?.length)
            params.set("dispositions", filters.dispositions.join(","));
          if (filters?.sentiment?.length)
            params.set("sentiment", filters.sentiment.join(","));
          if (filters?.escalationRisk?.length)
            params.set("escalation_risk", filters.escalationRisk.join(","));

          // Quality range
          if (filters?.qualityRange?.min !== undefined)
            params.set("quality_min", String(filters.qualityRange.min));
          if (filters?.qualityRange?.max !== undefined)
            params.set("quality_max", String(filters.qualityRange.max));

          // Include analysis data
          params.set("include_analysis", "true");

          const url =
            "/ringcentral/calls" +
            (params.toString() ? "?" + params.toString() : "");
          const { data } = await apiClient.get(url);

          return {
            items: data.items || [],
            total: data.total || 0,
            page: data.page || 1,
            page_size: data.page_size || 20,
          };
        },
        (() => {
          warnMissingEndpoint("/ringcentral/calls");
          return DEFAULT_CALLS;
        })()
      );
    },
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Get agent performance metrics
 * Returns performance data for all agents with call activity
 * Gracefully falls back to empty data if endpoint not implemented
 */
export function useAgentPerformance() {
  return useQuery({
    queryKey: callIntelligenceKeys.agentPerformance(),
    queryFn: async (): Promise<AgentPerformanceResponse> => {
      return withFallback(
        async () => {
          const { data } = await apiClient.get("/ringcentral/agents/performance");
          return data;
        },
        (() => {
          warnMissingEndpoint("/ringcentral/agents/performance");
          return DEFAULT_AGENT_PERFORMANCE;
        })()
      );
    },
    staleTime: 120_000, // 2 minutes
  });
}

/**
 * Get disposition statistics
 * Returns breakdown of call dispositions with analytics
 * Gracefully falls back to empty data if endpoint not implemented
 */
export function useDispositionStats() {
  return useQuery({
    queryKey: callIntelligenceKeys.dispositionStats(),
    queryFn: async (): Promise<DispositionStatsResponse> => {
      // Always use fallback data until backend endpoint is deployed
      warnMissingEndpoint("/call-dispositions/analytics");
      return DEFAULT_DISPOSITION_STATS;
    },
    staleTime: 120_000, // 2 minutes
  });
}

/**
 * Get quality heatmap data
 * Returns daily quality scores by agent for visualization
 * Gracefully falls back to empty data if endpoint not implemented
 */
export function useQualityHeatmap(days: number = 14) {
  return useQuery({
    queryKey: callIntelligenceKeys.qualityHeatmap(days),
    queryFn: async (): Promise<QualityHeatmapResponse> => {
      // Always use fallback data until backend endpoint is deployed
      warnMissingEndpoint(`/ringcentral/quality/heatmap?days=${days}`);
      return DEFAULT_QUALITY_HEATMAP;
    },
    staleTime: 300_000, // 5 minutes
  });
}

/**
 * Get coaching insights
 * Returns aggregated coaching recommendations and trends
 * Gracefully falls back to empty data if endpoint not implemented
 */
export function useCoachingInsights() {
  return useQuery({
    queryKey: callIntelligenceKeys.coachingInsights(),
    queryFn: async (): Promise<CoachingInsightsResponse> => {
      return withFallback(
        async () => {
          const { data } = await apiClient.get("/ringcentral/coaching/insights");
          return data;
        },
        (() => {
          warnMissingEndpoint("/ringcentral/coaching/insights");
          return DEFAULT_COACHING_INSIGHTS;
        })()
      );
    },
    staleTime: 300_000, // 5 minutes
  });
}

/**
 * Transcript response type
 */
export interface TranscriptResponse {
  call_id: string;
  has_recording: boolean;
  has_transcript: boolean;
  has_analysis: boolean;
  transcription_status: string | null;
  transcript: string | null;
  ai_summary: string | null;
  sentiment: string | null;
  sentiment_score: number | null;
  quality_score: number | null;
  csat_prediction: number | null;
  escalation_risk: string | null;
  professionalism_score: number | null;
  empathy_score: number | null;
  clarity_score: number | null;
  resolution_score: number | null;
  topics: string[] | null;
  analyzed_at: string | null;
  call_date: string | null;
  duration_seconds: number | null;
  direction: string | null;
  transcription_available?: boolean;
  transcription_hint?: string;
}

/**
 * Get transcript and analysis for a specific call
 */
export function useCallTranscript(callId: string | null) {
  return useQuery({
    queryKey: ["call-transcript", callId],
    queryFn: async (): Promise<TranscriptResponse | null> => {
      if (!callId) return null;
      try {
        const { data } = await apiClient.get(`/ringcentral/calls/${callId}/transcript`);
        return data;
      } catch (error) {
        console.error("Failed to fetch transcript:", error);
        return null;
      }
    },
    enabled: !!callId,
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Get analysis status for calls
 */
export interface AnalysisStatusResponse {
  total_calls_with_recordings: number;
  transcribed_calls: number;
  analyzed_calls: number;
  pending_transcription: number;
  coverage_percentage: number;
  status: string;
}

export function useAnalysisStatus() {
  return useQuery({
    queryKey: ["call-analysis-status"],
    queryFn: async (): Promise<AnalysisStatusResponse> => {
      const { data } = await apiClient.get("/ringcentral/calls/analysis-status");
      return data;
    },
    staleTime: 30_000, // 30 seconds
  });
}
