import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";

/**
 * Types for Calls API
 */
export interface Call {
  id: number;
  ringcentral_call_id?: string | null;
  caller_number?: string | null;
  called_number?: string | null;
  direction?: string | null;
  call_disposition?: string | null;
  call_type?: string | null;
  call_date?: string | null;
  call_time?: string | null;
  duration_seconds?: number | null;
  ring_duration?: number | null;
  recording_url?: string | null;
  notes?: string | null;
  customer_id?: number | null;
  answered_by?: string | null;
  created_at?: string | null;
}

export interface CallListResponse {
  items: Call[];
  total: number;
  page: number;
  page_size: number;
}

export interface CallDisposition {
  id: number;
  name: string;
  description?: string | null;
  color: string;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
}

export interface CallAnalytics {
  call_volume_by_hour: Record<string, number>;
  missed_calls: number;
  answered_calls: number;
  total_calls: number;
  avg_duration_seconds: number;
  total_duration_seconds: number;
  calls_by_direction: Record<string, number>;
  calls_by_disposition: Record<string, number>;
}

export interface CallFilters {
  page?: number;
  page_size?: number;
  direction?: string;
  disposition?: string;
  customer_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
}

/**
 * Query keys for calls
 */
export const callsKeys = {
  all: ["calls"] as const,
  list: (filters?: CallFilters) => [...callsKeys.all, "list", filters] as const,
  detail: (id: number) => [...callsKeys.all, "detail", id] as const,
  dispositions: () => [...callsKeys.all, "dispositions"] as const,
  analytics: (dateFrom?: string, dateTo?: string) =>
    [...callsKeys.all, "analytics", dateFrom, dateTo] as const,
};

/**
 * Get calls list with pagination and filters
 */
export function useCalls(filters?: CallFilters) {
  return useQuery({
    queryKey: callsKeys.list(filters),
    queryFn: async (): Promise<CallListResponse> => {
      const params = new URLSearchParams();
      if (filters?.page) params.set("page", String(filters.page));
      if (filters?.page_size)
        params.set("page_size", String(filters.page_size));
      if (filters?.direction) params.set("direction", filters.direction);
      if (filters?.disposition) params.set("disposition", filters.disposition);
      if (filters?.customer_id)
        params.set("customer_id", String(filters.customer_id));
      if (filters?.date_from) params.set("date_from", filters.date_from);
      if (filters?.date_to) params.set("date_to", filters.date_to);
      if (filters?.search) params.set("search", filters.search);

      const url = "/calls" + (params.toString() ? "?" + params.toString() : "");
      const { data } = await apiClient.get(url);
      return data;
    },
    staleTime: 30_000,
  });
}

/**
 * Get single call by ID
 */
export function useCall(id: number) {
  return useQuery({
    queryKey: callsKeys.detail(id),
    queryFn: async (): Promise<Call> => {
      const { data } = await apiClient.get(`/calls/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Get call dispositions
 */
export function useCallDispositions() {
  return useQuery({
    queryKey: callsKeys.dispositions(),
    queryFn: async (): Promise<CallDisposition[]> => {
      const { data } = await apiClient.get("/calls/dispositions");
      return data;
    },
    staleTime: 300_000, // 5 minutes
  });
}

/**
 * Get call analytics
 */
export function useCallAnalytics(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: callsKeys.analytics(dateFrom, dateTo),
    queryFn: async (): Promise<CallAnalytics> => {
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const url =
        "/calls/analytics" + (params.toString() ? "?" + params.toString() : "");
      const { data } = await apiClient.get(url);
      return data;
    },
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Set call disposition
 */
export function useSetCallDisposition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      callId,
      disposition,
      notes,
    }: {
      callId: number;
      disposition: string;
      notes?: string;
    }) => {
      const { data } = await apiClient.post(`/calls/${callId}/disposition`, {
        disposition,
        notes,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: callsKeys.all });
    },
  });
}
