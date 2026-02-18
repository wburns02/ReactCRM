import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
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
 */
export function useCallAnalytics() {
  return useQuery({
    queryKey: callIntelligenceKeys.analytics(),
    queryFn: async (): Promise<CallAnalyticsResponse> => {
      const { data } = await apiClient.get("/ringcentral/calls/analytics");
      return data;
    },
    retry: 1,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

/**
 * Get calls with analysis data
 * Supports filtering and pagination
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
      const params = new URLSearchParams();

      if (filters?.page) params.set("page", String(filters.page));
      if (filters?.page_size)
        params.set("page_size", String(filters.page_size));

      if (filters?.hasRecording !== undefined)
        params.set("has_recording", String(filters.hasRecording));
      if (filters?.hasAnalysis !== undefined)
        params.set("has_analysis", String(filters.hasAnalysis));
      if (filters?.hasTranscript !== undefined)
        params.set("has_transcript", String(filters.hasTranscript));

      if (filters?.dateRange?.start)
        params.set("date_from", filters.dateRange.start);
      if (filters?.dateRange?.end)
        params.set("date_to", filters.dateRange.end);

      if (filters?.agents?.length)
        params.set("agent_ids", filters.agents.join(","));
      if (filters?.dispositions?.length)
        params.set("dispositions", filters.dispositions.join(","));
      if (filters?.sentiment?.length)
        params.set("sentiment", filters.sentiment.join(","));
      if (filters?.escalationRisk?.length)
        params.set("escalation_risk", filters.escalationRisk.join(","));

      if (filters?.qualityRange?.min !== undefined)
        params.set("quality_min", String(filters.qualityRange.min));
      if (filters?.qualityRange?.max !== undefined)
        params.set("quality_max", String(filters.qualityRange.max));

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
    retry: 1,
    staleTime: 30_000,
  });
}

/**
 * Get agent performance metrics
 * Returns performance data for all agents with call activity
 */
export function useAgentPerformance() {
  return useQuery({
    queryKey: callIntelligenceKeys.agentPerformance(),
    queryFn: async (): Promise<AgentPerformanceResponse> => {
      const { data } = await apiClient.get(
        "/ringcentral/agents/performance",
      );
      return data;
    },
    retry: 1,
    staleTime: 120_000,
  });
}

/**
 * Get disposition statistics
 * Returns breakdown of call dispositions with analytics
 */
export function useDispositionStats() {
  return useQuery({
    queryKey: callIntelligenceKeys.dispositionStats(),
    queryFn: async (): Promise<DispositionStatsResponse> => {
      const { data } = await apiClient.get("/call-dispositions/analytics");
      return data;
    },
    retry: 1,
    staleTime: 120_000,
  });
}

/**
 * Get quality heatmap data
 * Returns daily quality scores by agent for visualization
 */
export function useQualityHeatmap(days: number = 14) {
  return useQuery({
    queryKey: callIntelligenceKeys.qualityHeatmap(days),
    queryFn: async (): Promise<QualityHeatmapResponse> => {
      const { data } = await apiClient.get(
        `/ringcentral/quality/heatmap?days=${days}`,
      );
      return data;
    },
    retry: 1,
    staleTime: 300_000,
  });
}

/**
 * Get coaching insights
 * Returns aggregated coaching recommendations and trends
 */
export function useCoachingInsights() {
  return useQuery({
    queryKey: callIntelligenceKeys.coachingInsights(),
    queryFn: async (): Promise<CoachingInsightsResponse> => {
      const { data } = await apiClient.get(
        "/ringcentral/coaching/insights",
      );
      return data;
    },
    retry: 1,
    staleTime: 300_000,
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
      const { data } = await apiClient.get(
        `/ringcentral/calls/${callId}/transcript`,
      );
      return data;
    },
    enabled: !!callId,
    retry: 1,
    staleTime: 60_000,
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
      const { data } = await apiClient.get(
        "/ringcentral/calls/analysis-status",
      );
      return data;
    },
    retry: 1,
    staleTime: 30_000,
  });
}

/**
 * Trigger AI analysis for a single call
 * Returns status and queues background analysis
 */
export interface AnalyzeCallResponse {
  status: "queued" | "already_analyzed" | "error";
  message: string;
  call_id: string;
  analyzed_at?: string;
  sentiment?: string;
  quality_score?: number;
  previous_sentiment?: string;
  previous_quality_score?: number;
}

export function useAnalyzeCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      callId,
      force = false,
    }: {
      callId: string;
      force?: boolean;
    }): Promise<AnalyzeCallResponse> => {
      const { data } = await apiClient.post(
        `/ringcentral/calls/analyze/${callId}${force ? "?force=true" : ""}`,
      );
      return data;
    },
    onSuccess: (data, { callId }) => {
      if (data.status === "queued") {
        setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: ["call-transcript", callId],
          });
          queryClient.invalidateQueries({ queryKey: ["calls-with-analysis"] });
          queryClient.invalidateQueries({ queryKey: ["call-analytics"] });
        }, 10000);
      }
    },
  });
}
