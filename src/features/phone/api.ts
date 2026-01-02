import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client.ts';
import {
  type RCStatus,
  type CallListResponse,
  type Disposition,
  type InitiateCallRequest,
  type LogDispositionRequest,
} from './types.ts';

/**
 * Query keys for phone/RingCentral
 */
export const phoneKeys = {
  all: ['phone'] as const,
  status: () => [...phoneKeys.all, 'status'] as const,
  calls: () => [...phoneKeys.all, 'calls'] as const,
  callsList: (filters?: Record<string, unknown>) => [...phoneKeys.calls(), filters] as const,
  dispositions: () => [...phoneKeys.all, 'dispositions'] as const,
  extensions: () => [...phoneKeys.all, 'extensions'] as const,
  myExtension: () => [...phoneKeys.all, 'my-extension'] as const,
};

/**
 * Get RingCentral connection status
 */
export function useRCStatus() {
  return useQuery({
    queryKey: phoneKeys.status(),
    queryFn: async (): Promise<RCStatus> => {
      const { data } = await apiClient.get('/ringcentral/status');
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
      const { data } = await apiClient.get('/ringcentral/my-extension');
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
      const { data } = await apiClient.get('/ringcentral/extensions');
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
      const { data } = await apiClient.post('/ringcentral/call', request);
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
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.page_size) params.set('page_size', String(filters.page_size));
      if (filters?.direction) params.set('direction', filters.direction);
      if (filters?.customer_id) params.set('customer_id', filters.customer_id);

      const url = '/ringcentral/calls' + (params.toString() ? '?' + params.toString() : '');
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
      const { data } = await apiClient.post('/ringcentral/sync', { hours_back: hoursBack });
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
        const { data } = await apiClient.get('/call-dispositions');
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


// ============ Twilio Integration ============

export const twilioKeys = {
  all: ['twilio'] as const,
  status: () => [...twilioKeys.all, 'status'] as const,
  calls: () => [...twilioKeys.all, 'calls'] as const,
};

/**
 * Get Twilio connection status
 */
export function useTwilioStatus() {
  return useQuery({
    queryKey: twilioKeys.status(),
    queryFn: async () => {
      const { data } = await apiClient.get('/twilio/status');
      return data;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

/**
 * Initiate a call via Twilio (direct call, no "ring your phone first")
 */
export function useTwilioCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: { to_number: string; from_number?: string; record?: boolean }) => {
      const { data } = await apiClient.post('/twilio/call', request);
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
