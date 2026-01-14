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
    total_calls: 0,
    calls_today: 0,
    calls_this_week: 0,
    positive_calls: 0,
    neutral_calls: 0,
    negative_calls: 0,
    avg_sentiment_score: 0,
    avg_quality_score: 0,
    quality_trend: 0,
    escalation_rate: 0,
    high_risk_calls: 0,
    critical_risk_calls: 0,
    avg_csat_prediction: 0,
    auto_disposition_rate: 0,
    auto_disposition_accuracy: 0,
    sentiment_trend: [],
    quality_trend_data: [],
    volume_trend: [],
  },
  updated_at: new Date().toISOString(),
};

/**
 * Default fallback data for PaginatedCallsResponse
 */
const DEFAULT_CALLS: PaginatedCallsResponse = {
  items: [],
  total: 0,
  page: 1,
  page_size: 20,
};

/**
 * Default fallback data for AgentPerformanceResponse
 */
const DEFAULT_AGENT_PERFORMANCE: AgentPerformanceResponse = {
  agents: [],
  total: 0,
};

/**
 * Default fallback data for DispositionStatsResponse
 */
const DEFAULT_DISPOSITION_STATS: DispositionStatsResponse = {
  dispositions: [],
  total_calls: 0,
};

/**
 * Default fallback data for QualityHeatmapResponse
 */
const DEFAULT_QUALITY_HEATMAP: QualityHeatmapResponse = {
  data: [],
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
}) {
  return useQuery({
    queryKey: callIntelligenceKeys.callsList(filters),
    queryFn: async (): Promise<PaginatedCallsResponse> => {
      return withFallback(
        async () => {
          const params = new URLSearchParams();

          if (filters?.page) params.set("page", String(filters.page));
          if (filters?.page_size)
            params.set("page_size", String(filters.page_size));

          // Date range
          if (filters?.dateRange?.start)
            params.set("start_date", filters.dateRange.start);
          if (filters?.dateRange?.end)
            params.set("end_date", filters.dateRange.end);

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
      return withFallback(
        async () => {
          const { data } = await apiClient.get("/call-dispositions/analytics");
          return data;
        },
        (() => {
          warnMissingEndpoint("/call-dispositions/analytics");
          return DEFAULT_DISPOSITION_STATS;
        })()
      );
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
      return withFallback(
        async () => {
          const { data } = await apiClient.get(
            `/ringcentral/quality/heatmap?days=${days}`
          );
          return data;
        },
        (() => {
          warnMissingEndpoint("/ringcentral/quality/heatmap");
          return DEFAULT_QUALITY_HEATMAP;
        })()
      );
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
