import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import type { OpsLiveState, RecommendResponse } from "@/api/types/opsCenter.ts";

export function useOpsLiveState() {
  return useQuery<OpsLiveState>({
    queryKey: ["ops-center", "live-state"],
    queryFn: async () => {
      const { data } = await apiClient.get("/ops-center/live-state");
      return data;
    },
    refetchInterval: 30_000, // Auto-refresh every 30s
    staleTime: 15_000,
  });
}

export function useDispatchRecommend(workOrderId: string | null) {
  return useQuery<RecommendResponse>({
    queryKey: ["ops-center", "recommend", workOrderId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/ops-center/recommend-dispatch/${workOrderId}`);
      return data;
    },
    enabled: !!workOrderId,
    staleTime: 30_000,
  });
}
