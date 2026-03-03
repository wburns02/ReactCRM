// SOC API response types — based on actual R730 API responses

export interface SocHealthResponse {
  overall: "healthy" | "degraded" | "critical";
  services: SocService[];
  timestamp: number;
}

export interface SocService {
  name: string;
  status: "healthy" | "degraded" | "error";
  description?: string;
  version?: string;
  agents?: {
    connection: { active: number; disconnected: number; never_connected: number; pending: number; total: number };
    configuration: { synced: number; total: number; not_synced: number };
  };
  cluster_status?: string;
  node_count?: number;
  collections?: number;
  total_vectors?: number;
  models?: string[];
  model_count?: number;
}

export interface AgentSummary {
  total: number;
  active: number;
  disconnected: number;
  pending: number;
  never_connected: number;
  descriptions: Record<string, string>;
}

export interface WazuhAgent {
  id: string;
  name: string;
  ip: string;
  status: string;
  status_description: string;
  os: string;
  os_version: string;
  last_keepalive: string;
  date_add: string;
  group: string[];
  node_name: string;
  version: string;
}

export interface AgentListResponse {
  agents: WazuhAgent[];
  total: number;
}

export interface AlertSummary {
  total: number;
  severity: Record<string, number>;
  top_rules: { rule_id: string; count: number }[];
  by_agent: { agent: string; count: number }[];
  time_range: string;
}

export interface SocAlert {
  id: string;
  timestamp: string;
  rule_id: string;
  rule_level: number;
  level_info: { label: string; color: string; description: string };
  rule_description: string;
  agent_name: string;
  agent_id: string;
  mitre: { id?: string[]; tactic?: string[] };
  groups: string[];
  data: Record<string, unknown>;
  full_log: string;
}

export interface AlertListResponse {
  alerts: SocAlert[];
  total: number;
}

export interface EscalationStats {
  total_triaged: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  avg_triage_time_ms: number;
  last_24h: number;
}

export interface EscalationEntry {
  alert_id: string;
  severity: string;
  ai_verdict: string;
  mitre_ids: string[];
  recommended_actions: string[];
  notification_sent: string;
  timestamp: string;
  triage_time_ms?: number;
  rule_id?: string;
  rule_level?: number;
  rule_description?: string;
  agent_name?: string;
}

export interface EscalationHistoryResponse {
  escalations: EscalationEntry[];
  total: number;
}
