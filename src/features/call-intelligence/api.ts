import { useQuery } from "@tanstack/react-query";
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
    staleTime: 60_000, // 1 minute
    refetchInterval: 60_000, // Auto-refresh every minute
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
}) {
  return useQuery({
    queryKey: callIntelligenceKeys.callsList(filters),
    queryFn: async (): Promise<PaginatedCallsResponse> => {
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
    staleTime: 30_000, // 30 seconds
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
      const { data } = await apiClient.get("/ringcentral/agents/performance");
      return data;
    },
    staleTime: 120_000, // 2 minutes
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
    staleTime: 120_000, // 2 minutes
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
        `/ringcentral/quality/heatmap?days=${days}`
      );
      return data;
    },
    staleTime: 300_000, // 5 minutes
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
      const { data } = await apiClient.get("/ringcentral/coaching/insights");
      return data;
    },
    staleTime: 300_000, // 5 minutes
  });
}
