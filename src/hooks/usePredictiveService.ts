import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import type {
  PredictiveScoresResponse,
  PredictiveScore,
  CampaignPreview,
  DashboardStats,
} from "@/api/types/predictiveService.ts";

export function usePredictiveScores(params?: {
  risk_level?: string;
  min_score?: number;
  limit?: number;
  offset?: number;
}) {
  return useQuery<PredictiveScoresResponse>({
    queryKey: ["predictive-service", "scores", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.risk_level) searchParams.set("risk_level", params.risk_level);
      if (params?.min_score !== undefined) searchParams.set("min_score", String(params.min_score));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));
      const qs = searchParams.toString();
      const { data } = await apiClient.get(`/predictive-service/scores${qs ? `?${qs}` : ""}`);
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useCustomerScore(customerId: string | undefined) {
  return useQuery<PredictiveScore>({
    queryKey: ["predictive-service", "score", customerId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/predictive-service/scores/${customerId}`);
      return data;
    },
    enabled: !!customerId,
    staleTime: 5 * 60_000,
  });
}

export function useCampaignPreview(params?: { min_score?: number; days_horizon?: number }) {
  return useQuery<CampaignPreview>({
    queryKey: ["predictive-service", "campaign", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.min_score !== undefined) searchParams.set("min_score", String(params.min_score));
      if (params?.days_horizon) searchParams.set("days_horizon", String(params.days_horizon));
      const qs = searchParams.toString();
      const { data } = await apiClient.get(`/predictive-service/campaign-preview${qs ? `?${qs}` : ""}`);
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function usePredictiveDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["predictive-service", "dashboard-stats"],
    queryFn: async () => {
      const { data } = await apiClient.get("/predictive-service/dashboard-stats");
      return data;
    },
    staleTime: 5 * 60_000,
  });
}
