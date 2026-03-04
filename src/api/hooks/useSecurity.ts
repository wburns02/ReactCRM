import { useQuery, useMutation } from "@tanstack/react-query";
import { socClient } from "../socClient";
import type {
  SocHealthResponse,
  AgentSummary,
  AgentListResponse,
  AlertSummary,
  AlertListResponse,
  EscalationStats,
  EscalationHistoryResponse,
} from "../types/security";
import type {
  RunPentestRequest,
  RunPentestResponse,
  PentestStatusResponse,
  PentestResults,
} from "../types/pentest";

export const socKeys = {
  all: ["soc"] as const,
  health: () => [...socKeys.all, "health"] as const,
  agentSummary: () => [...socKeys.all, "agent-summary"] as const,
  agents: (params?: Record<string, string>) => [...socKeys.all, "agents", params] as const,
  alertSummary: (range: string) => [...socKeys.all, "alert-summary", range] as const,
  alerts: (params?: Record<string, string>) => [...socKeys.all, "alerts", params] as const,
  escalationStats: () => [...socKeys.all, "escalation-stats"] as const,
  escalationHistory: (limit?: number) => [...socKeys.all, "escalation-history", limit] as const,
  pentestStatus: () => [...socKeys.all, "pentest-status"] as const,
  pentestResults: () => [...socKeys.all, "pentest-results"] as const,
};

export function useSocHealth() {
  return useQuery({
    queryKey: socKeys.health(),
    queryFn: async () => {
      const { data } = await socClient.get<SocHealthResponse>("/management/health");
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useAgentSummary() {
  return useQuery({
    queryKey: socKeys.agentSummary(),
    queryFn: async () => {
      const { data } = await socClient.get<AgentSummary>("/management/wazuh/agents/summary");
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useSocAgents(params?: Record<string, string>) {
  return useQuery({
    queryKey: socKeys.agents(params),
    queryFn: async () => {
      const { data } = await socClient.get<AgentListResponse>("/management/wazuh/agents", { params });
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useAlertSummary(timeRange = "24h") {
  return useQuery({
    queryKey: socKeys.alertSummary(timeRange),
    queryFn: async () => {
      const { data } = await socClient.get<AlertSummary>(`/management/alerts/summary?time_range=${timeRange}`);
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useSocAlerts(params?: Record<string, string>) {
  return useQuery({
    queryKey: socKeys.alerts(params),
    queryFn: async () => {
      const { data } = await socClient.get<AlertListResponse>("/management/alerts", { params });
      return data;
    },
    refetchInterval: 15_000,
  });
}

export function useEscalationStats() {
  return useQuery({
    queryKey: socKeys.escalationStats(),
    queryFn: async () => {
      const { data } = await socClient.get<EscalationStats>("/escalation/stats");
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useEscalationHistory(limit = 50) {
  return useQuery({
    queryKey: socKeys.escalationHistory(limit),
    queryFn: async () => {
      const { data } = await socClient.get<EscalationHistoryResponse>(`/escalation/history?limit=${limit}`);
      return data;
    },
    refetchInterval: 30_000,
  });
}

// --- Pentest hooks ---

export function useRunPentest() {
  return useMutation({
    mutationFn: async (req: RunPentestRequest) => {
      const { data } = await socClient.post<RunPentestResponse>("/management/pentest/run", req);
      return data;
    },
  });
}

export function usePentestStatus(enabled: boolean, polling = false) {
  return useQuery({
    queryKey: socKeys.pentestStatus(),
    queryFn: async () => {
      const { data } = await socClient.get<PentestStatusResponse>("/management/pentest/status");
      return data;
    },
    enabled,
    refetchInterval: (query) => {
      if (!polling) return false;
      const status = query.state.data?.status;
      if (status === "running") return 2_000;
      return false;
    },
  });
}

export function usePentestResults(enabled: boolean) {
  return useQuery({
    queryKey: socKeys.pentestResults(),
    queryFn: async () => {
      const { data } = await socClient.get<PentestResults>("/management/pentest/results");
      return data;
    },
    enabled,
  });
}
