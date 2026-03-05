import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import {
  ExecutiveKPIsSchema,
  RevenueTrendResponseSchema,
  ServiceMixResponseSchema,
  TechLeaderboardResponseSchema,
  PipelineFunnelResponseSchema,
  RecentActivityResponseSchema,
  type ExecutiveKPIs,
  type RevenueTrendResponse,
  type ServiceMixResponse,
  type TechLeaderboardResponse,
  type PipelineFunnelResponse,
  type RecentActivityResponse,
} from "@/api/types/executiveDashboard";

export function useExecutiveKPIs() {
  return useQuery({
    queryKey: ["executive", "kpis"],
    queryFn: async (): Promise<ExecutiveKPIs> => {
      const { data } = await apiClient.get("/executive/kpis");
      return ExecutiveKPIsSchema.parse(data);
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useRevenueTrend(period: string) {
  return useQuery({
    queryKey: ["executive", "revenue-trend", period],
    queryFn: async (): Promise<RevenueTrendResponse> => {
      const { data } = await apiClient.get(`/executive/revenue-trend?period=${period}`);
      return RevenueTrendResponseSchema.parse(data);
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

export function useServiceMix() {
  return useQuery({
    queryKey: ["executive", "service-mix"],
    queryFn: async (): Promise<ServiceMixResponse> => {
      const { data } = await apiClient.get("/executive/service-mix");
      return ServiceMixResponseSchema.parse(data);
    },
    staleTime: 60_000,
  });
}

export function useTechLeaderboard() {
  return useQuery({
    queryKey: ["executive", "tech-leaderboard"],
    queryFn: async (): Promise<TechLeaderboardResponse> => {
      const { data } = await apiClient.get("/executive/technician-leaderboard");
      return TechLeaderboardResponseSchema.parse(data);
    },
    staleTime: 60_000,
  });
}

export function usePipelineFunnel() {
  return useQuery({
    queryKey: ["executive", "pipeline-funnel"],
    queryFn: async (): Promise<PipelineFunnelResponse> => {
      const { data } = await apiClient.get("/executive/pipeline-funnel");
      return PipelineFunnelResponseSchema.parse(data);
    },
    staleTime: 60_000,
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ["executive", "recent-activity"],
    queryFn: async (): Promise<RecentActivityResponse> => {
      const { data } = await apiClient.get("/executive/recent-activity");
      return RecentActivityResponseSchema.parse(data);
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
