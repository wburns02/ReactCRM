import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";

interface RecordingInfo {
  call_id: string;
  recording_id: string;
  content_type: string;
  duration?: number;
  secure_url: string;
}

/**
 * Fetch secure recording URL for a call
 * Returns a secure proxy URL that doesn't expose RingCentral tokens
 */
export function useCallRecording(callId: string | null) {
  return useQuery({
    queryKey: ["call-recording", callId],
    queryFn: async (): Promise<RecordingInfo> => {
      if (!callId) {
        throw new Error("Call ID is required");
      }

      const { data } = await apiClient.get(
        `/ringcentral/calls/${callId}/recording`,
      );
      return data;
    },
    enabled: !!callId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: unknown) => {
      // Don't retry if recording doesn't exist
      if (error instanceof Error && "response" in error && (error as Error & { response?: { status?: number } }).response?.status === 404) return false;
      return failureCount < 2;
    },
  });
}

/**
 * Generate full secure URL for recording playback
 */
export function getSecureRecordingUrl(baseUrl: string): string {
  // The secure_url is already relative to the API base
  return `${apiClient.defaults.baseURL}${baseUrl}`;
}
