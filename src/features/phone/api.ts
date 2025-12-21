import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client.ts';
import {
  rcStatusSchema,
  callRecordSchema,
  dispositionSchema,
  type RCStatus,
  type CallRecord,
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
};

/**
 * Get RingCentral connection status
 */
export function useRCStatus() {
  return useQuery({
    queryKey: phoneKeys.status(),
    queryFn: async (): Promise<RCStatus> => {
      const { data } = await apiClient.get('/ringcentral/status');

      if (import.meta.env.DEV) {
        const result = rcStatusSchema.safeParse(data);
        if (!result.success) {
          console.warn('RingCentral status response validation failed:', result.error);
        }
      }

      return data;
    },
    staleTime: 60_000, // 1 minute
    refetchInterval: 60_000, // Refresh every minute
  });
}

/**
 * Initiate an outbound call
 */
export function useInitiateCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: InitiateCallRequest): Promise<CallRecord> => {
      const { data } = await apiClient.post('/ringcentral/call', request);
      return data;
    },
    onSuccess: () => {
      // Invalidate call log to show new call
      queryClient.invalidateQueries({ queryKey: phoneKeys.calls() });
    },
  });
}

/**
 * Get call log
 */
export function useCallLog(filters?: { limit?: number; customer_id?: string; prospect_id?: string }) {
  return useQuery({
    queryKey: phoneKeys.callsList(filters),
    queryFn: async (): Promise<CallRecord[]> => {
      const params = new URLSearchParams();
      if (filters?.limit) params.set('limit', String(filters.limit));
      if (filters?.customer_id) params.set('customer_id', filters.customer_id);
      if (filters?.prospect_id) params.set('prospect_id', filters.prospect_id);

      const url = '/ringcentral/calls?' + params.toString();
      const { data } = await apiClient.get(url);

      if (import.meta.env.DEV) {
        if (Array.isArray(data)) {
          data.forEach((item, index) => {
            const result = callRecordSchema.safeParse(item);
            if (!result.success) {
              console.warn(`Call record ${index} validation failed:`, result.error);
            }
          });
        }
      }

      return data;
    },
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Get available call dispositions
 */
export function useDispositions() {
  return useQuery({
    queryKey: phoneKeys.dispositions(),
    queryFn: async (): Promise<Disposition[]> => {
      const { data } = await apiClient.get('/call-dispositions');

      if (import.meta.env.DEV) {
        if (Array.isArray(data)) {
          data.forEach((item, index) => {
            const result = dispositionSchema.safeParse(item);
            if (!result.success) {
              console.warn(`Disposition ${index} validation failed:`, result.error);
            }
          });
        }
      }

      return data;
    },
    staleTime: 300_000, // 5 minutes (dispositions rarely change)
  });
}

/**
 * Log a call disposition
 */
export function useLogDisposition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: LogDispositionRequest): Promise<void> => {
      await apiClient.post('/call-dispositions', request);
    },
    onSuccess: () => {
      // Invalidate call log to show updated disposition
      queryClient.invalidateQueries({ queryKey: phoneKeys.calls() });
    },
  });
}
