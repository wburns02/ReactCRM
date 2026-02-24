import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";

export interface ActivityEntry {
  id: string;
  user_id: number | null;
  user_email: string | null;
  user_name: string | null;
  category: string;
  action: string;
  description: string | null;
  ip_address: string | null;
  source: string | null;
  resource_type: string | null;
  resource_id: string | null;
  endpoint: string | null;
  http_method: string | null;
  status_code: number | null;
  response_time_ms: number | null;
  session_id: string | null;
  entity_id: string | null;
  created_at: string;
}

export interface ActivityStats {
  period_days: number;
  active_users: number;
  total_events: number;
  total_logins: number;
  failed_logins: number;
  by_category: { category: string; count: number }[];
  by_action: { action: string; count: number }[];
  top_users: { email: string; count: number }[];
  top_resources: { resource: string; count: number }[];
  by_hour: { hour: number; count: number }[];
  by_day: { day: string; count: number }[];
  response_time: {
    avg_ms: number | null;
    max_ms: number | null;
    p95_ms: number | null;
  };
}

export interface SessionEntry {
  id: string;
  user_id: number | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  source: string | null;
  session_id: string | null;
  created_at: string;
}

const activityKeys = {
  all: ["user-activity"] as const,
  log: (params: Record<string, unknown>) => [...activityKeys.all, "log", params] as const,
  stats: (days: number) => [...activityKeys.all, "stats", days] as const,
  sessions: (params: Record<string, unknown>) => [...activityKeys.all, "sessions", params] as const,
};

export function useActivityLog(params: {
  page?: number;
  page_size?: number;
  category?: string;
  action?: string;
  user_email?: string;
  days?: number;
}) {
  return useQuery({
    queryKey: activityKeys.log(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.page_size) searchParams.set("page_size", String(params.page_size));
      if (params.category) searchParams.set("category", params.category);
      if (params.action) searchParams.set("action", params.action);
      if (params.user_email) searchParams.set("user_email", params.user_email);
      if (params.days) searchParams.set("days", String(params.days));

      const { data } = await apiClient.get(
        `/admin/user-activity?${searchParams.toString()}`
      );
      return data as {
        items: ActivityEntry[];
        total: number;
        page: number;
        page_size: number;
        pages: number;
      };
    },
    staleTime: 30_000,
  });
}

export function useActivityStats(days: number = 7) {
  return useQuery({
    queryKey: activityKeys.stats(days),
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/admin/user-activity/stats?days=${days}`
      );
      return data as ActivityStats;
    },
    staleTime: 60_000,
  });
}

export function useLoginSessions(params: {
  page?: number;
  page_size?: number;
  user_email?: string;
  days?: number;
}) {
  return useQuery({
    queryKey: activityKeys.sessions(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.page_size) searchParams.set("page_size", String(params.page_size));
      if (params.user_email) searchParams.set("user_email", params.user_email);
      if (params.days) searchParams.set("days", String(params.days));

      const { data } = await apiClient.get(
        `/admin/user-activity/sessions?${searchParams.toString()}`
      );
      return data as {
        items: SessionEntry[];
        total: number;
        page: number;
        page_size: number;
      };
    },
    staleTime: 30_000,
  });
}
