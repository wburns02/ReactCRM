import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Query keys for payment plans
 */
export const paymentPlanKeys = {
  all: ["payment-plans"] as const,
  lists: () => [...paymentPlanKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...paymentPlanKeys.lists(), filters] as const,
  details: () => [...paymentPlanKeys.all, "detail"] as const,
  detail: (id: string) => [...paymentPlanKeys.details(), id] as const,
};

/**
 * Data for recording a payment against a payment plan
 */
interface RecordPaymentData {
  planId: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes?: string;
}

/**
 * Hook to record a payment against a payment plan
 */
export function useRecordPaymentPlanPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RecordPaymentData) => {
      const { planId, ...payload } = data;
      const response = await apiClient.post(
        `/payment-plans/${planId}/payments`,
        payload
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific payment plan detail
      queryClient.invalidateQueries({
        queryKey: ["payment-plan", variables.planId],
      });
      // Also invalidate the list
      queryClient.invalidateQueries({ queryKey: paymentPlanKeys.lists() });
    },
  });
}
