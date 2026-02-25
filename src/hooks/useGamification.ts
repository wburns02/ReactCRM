import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import type {
  GamificationStats,
  Badge,
  LeaderboardResponse,
  MilestonesResponse,
} from "@/api/types/gamification.ts";

export function useGamificationStats() {
  return useQuery<GamificationStats>({
    queryKey: ["gamification", "stats"],
    queryFn: async () => {
      const { data } = await apiClient.get("/gamification/my-stats");
      return data;
    },
    staleTime: 60_000,
  });
}

export function useGamificationBadges() {
  return useQuery<Badge[]>({
    queryKey: ["gamification", "badges"],
    queryFn: async () => {
      const { data } = await apiClient.get("/gamification/badges");
      return data;
    },
    staleTime: 60_000,
  });
}

export function useGamificationLeaderboard() {
  return useQuery<LeaderboardResponse>({
    queryKey: ["gamification", "leaderboard"],
    queryFn: async () => {
      const { data } = await apiClient.get("/gamification/leaderboard");
      return data;
    },
    staleTime: 60_000,
  });
}

export function useGamificationMilestones() {
  return useQuery<MilestonesResponse>({
    queryKey: ["gamification", "milestones"],
    queryFn: async () => {
      const { data } = await apiClient.get("/gamification/next-milestones");
      return data;
    },
    staleTime: 60_000,
  });
}
