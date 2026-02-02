import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { validateResponse } from "../validateResponse.ts";
import {
  communicationListResponseSchema,
  type Communication,
  type CommunicationListResponse,
  type CommunicationFilters,
  type SendSMSData,
  type SendEmailData,
} from "../types/communication.ts";

/**
 * Query keys for communications
 */
export const communicationKeys = {
  all: ["communications"] as const,
  lists: () => [...communicationKeys.all, "list"] as const,
  list: (filters: CommunicationFilters) =>
    [...communicationKeys.lists(), filters] as const,
  history: (customerId: string) =>
    [...communicationKeys.all, "history", customerId] as const,
};

/**
 * Fetch communication history for a customer
 */
export function useCommunicationHistory(customerId: string | undefined) {
  return useQuery({
    queryKey: communicationKeys.history(customerId!),
    queryFn: async (): Promise<CommunicationListResponse> => {
      const params = new URLSearchParams({
        customer_id: customerId!,
        page_size: "100",
      });

      const { data } = await apiClient.get(
        `/communications/history?${params.toString()}`,
      );

      // Validate response in ALL environments (reports to Sentry if invalid)
      return validateResponse(
        communicationListResponseSchema,
        data,
        "/communications/history"
      );
    },
    enabled: !!customerId,
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Send SMS
 */
export function useSendSMS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SendSMSData): Promise<Communication> => {
      const response = await apiClient.post("/communications/sms/send", data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate communication history for this customer
      queryClient.invalidateQueries({
        queryKey: communicationKeys.history(variables.customer_id),
      });
      queryClient.invalidateQueries({ queryKey: communicationKeys.lists() });
    },
  });
}

/**
 * Send Email
 */
export function useSendEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SendEmailData): Promise<Communication> => {
      const response = await apiClient.post("/communications/email/send", data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate communication history for this customer
      if (variables.customer_id !== undefined) {
        queryClient.invalidateQueries({
          queryKey: communicationKeys.history(String(variables.customer_id)),
        });
      }
      queryClient.invalidateQueries({ queryKey: communicationKeys.lists() });
    },
  });
}
