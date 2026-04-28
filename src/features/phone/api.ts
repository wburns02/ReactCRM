import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import {
  type RCStatus,
  type CallListResponse,
  type Disposition,
  type InitiateCallRequest,
  type LogDispositionRequest,
} from "./types.ts";

/**
 * Query keys for phone/RingCentral
 */
export const phoneKeys = {
  all: ["phone"] as const,
  status: () => [...phoneKeys.all, "status"] as const,
  calls: () => [...phoneKeys.all, "calls"] as const,
  callsList: (filters?: Record<string, unknown>) =>
    [...phoneKeys.calls(), filters] as const,
  dispositions: () => [...phoneKeys.all, "dispositions"] as const,
  extensions: () => [...phoneKeys.all, "extensions"] as const,
  myExtension: () => [...phoneKeys.all, "my-extension"] as const,
};

/**
 * Get RingCentral connection status
 */
export function useRCStatus() {
  return useQuery({
    queryKey: phoneKeys.status(),
    queryFn: async (): Promise<RCStatus> => {
      const { data } = await apiClient.get("/ringcentral/status");
      return data;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

/**
 * Get the current user's own RingCentral extension.
 * This is YOUR extension, not a list of all extensions.
 */
export function useMyExtension() {
  return useQuery({
    queryKey: phoneKeys.myExtension(),
    queryFn: async () => {
      const { data } = await apiClient.get("/ringcentral/my-extension");
      return data;
    },
    staleTime: 300_000, // 5 minutes
  });
}

/**
 * Get RingCentral extensions (for selecting from_number)
 */
export function useExtensions() {
  return useQuery({
    queryKey: phoneKeys.extensions(),
    queryFn: async () => {
      const { data } = await apiClient.get("/ringcentral/extensions");
      return data.items || [];
    },
    staleTime: 300_000, // 5 minutes
  });
}

/**
 * Initiate an outbound call
 */
export function useInitiateCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: InitiateCallRequest) => {
      const { data } = await apiClient.post("/ringcentral/call", request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phoneKeys.calls() });
    },
  });
}

/**
 * Get call log with pagination
 */
export function useCallLog(filters?: {
  page?: number;
  page_size?: number;
  direction?: string;
  customer_id?: string;
}) {
  return useQuery({
    queryKey: phoneKeys.callsList(filters),
    queryFn: async (): Promise<CallListResponse> => {
      const params = new URLSearchParams();
      if (filters?.page) params.set("page", String(filters.page));
      if (filters?.page_size)
        params.set("page_size", String(filters.page_size));
      if (filters?.direction) params.set("direction", filters.direction);
      if (filters?.customer_id) params.set("customer_id", filters.customer_id);

      const url =
        "/ringcentral/user/calls" +
        (params.toString() ? "?" + params.toString() : "");
      const { data } = await apiClient.get(url);

      // Return the paginated response
      return {
        items: data.items || [],
        total: data.total || 0,
        page: data.page || 1,
        page_size: data.page_size || 20,
      };
    },
    staleTime: 30_000,
  });
}

/**
 * Sync calls from RingCentral
 */
export function useSyncCalls() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hoursBack: number = 24) => {
      const { data } = await apiClient.post("/ringcentral/sync", {
        hours_back: hoursBack,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phoneKeys.calls() });
    },
  });
}

/**
 * Get available call dispositions
 */
export function useDispositions() {
  return useQuery({
    queryKey: phoneKeys.dispositions(),
    queryFn: async (): Promise<Disposition[]> => {
      try {
        const { data } = await apiClient.get("/call-dispositions");
        return Array.isArray(data) ? data : [];
      } catch {
        // Endpoint might not exist, return empty array
        return [];
      }
    },
    staleTime: 300_000,
  });
}

/**
 * Log a call disposition
 */
export function useLogDisposition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: LogDispositionRequest): Promise<void> => {
      await apiClient.patch(`/ringcentral/calls/${request.call_id}`, {
        disposition: request.disposition_id,
        notes: request.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phoneKeys.calls() });
    },
  });
}

/**
 * Update a CallLog by external SID (Twilio CallSid or RC call ID).
 * Used by the outbound PowerDialer where the dialer only has a SID, not a UUID.
 */
export function useUpdateCallBySid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: {
      sid: string;
      notes?: string;
      disposition?: string;
      customer_id?: string;
    }): Promise<void> => {
      const { sid, ...body } = request;
      await apiClient.patch(`/ringcentral/calls/by-sid/${sid}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phoneKeys.calls() });
    },
    // Don't throw on 404 — the call might not have a CallLog row yet (race)
    // The local Zustand store already has the data; this is a sync to server.
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404 && failureCount < 2) return true;
      return false;
    },
    retryDelay: 2000,
  });
}

// ============ Twilio Integration ============

export const twilioKeys = {
  all: ["twilio"] as const,
  status: () => [...twilioKeys.all, "status"] as const,
  calls: () => [...twilioKeys.all, "calls"] as const,
  numbers: () => [...twilioKeys.all, "numbers"] as const,
  preview: (to: string, market?: string) =>
    [...twilioKeys.all, "preview", to, market ?? "auto"] as const,
};

export type TwilioMarket =
  | "auto"
  | "TN"
  | "TX"
  | "SC"
  | "TN_NASHVILLE"
  | "TN_COLUMBIA"
  | "TX_AUSTIN"
  | "SC_COLUMBIA";

export interface TwilioNumberOption {
  market: string;
  label: string;
  from_number: string;
  area_codes: string;
}

export interface TwilioNumbersResponse {
  default: string | null;
  markets: TwilioNumberOption[];
}

export interface TwilioCallerIdPreview {
  from_number: string | null;
  market: string | null;
  reason: string;
}

/**
 * Get Twilio connection status
 */
export function useTwilioStatus() {
  return useQuery({
    queryKey: twilioKeys.status(),
    queryFn: async () => {
      const { data } = await apiClient.get("/twilio/status");
      return data;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

/**
 * Get configured Twilio caller-ID numbers grouped by market.
 * Used by the dialer's TN/TX/SC picker.
 */
export function useTwilioNumbers() {
  return useQuery({
    queryKey: twilioKeys.numbers(),
    queryFn: async (): Promise<TwilioNumbersResponse> => {
      const { data } = await apiClient.get("/twilio/numbers");
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * Preview which caller ID smart routing would pick for a destination + market choice.
 */
export function useTwilioCallerIdPreview(toNumber: string, market: TwilioMarket = "auto") {
  return useQuery({
    queryKey: twilioKeys.preview(toNumber, market),
    queryFn: async (): Promise<TwilioCallerIdPreview> => {
      const { data } = await apiClient.post("/twilio/preview-caller-id", {
        to_number: toNumber,
        from_market: market,
      });
      return data;
    },
    enabled: toNumber.replace(/\D/g, "").length >= 10,
    staleTime: 30_000,
  });
}

/**
 * Initiate a call via Twilio (direct call, no "ring your phone first").
 * Caller ID is auto-routed by destination area code unless `from_number` or
 * `from_market` is provided.
 */
export function useTwilioCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: {
      to_number: string;
      from_number?: string;
      record?: boolean;
      from_market?: TwilioMarket;
    }) => {
      const { data } = await apiClient.post("/twilio/call", request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: twilioKeys.calls() });
    },
  });
}

/**
 * Get Twilio call logs
 */
export function useTwilioCalls(limit: number = 50) {
  return useQuery({
    queryKey: [...twilioKeys.calls(), limit],
    queryFn: async () => {
      const { data } = await apiClient.get(`/twilio/calls?limit=${limit}`);
      return data;
    },
    staleTime: 30_000,
  });
}
