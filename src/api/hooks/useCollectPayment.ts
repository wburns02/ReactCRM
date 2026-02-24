import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import { toastError } from "@/components/ui/Toast.tsx";

export interface CollectPaymentParams {
  work_order_id?: string;
  invoice_id?: string;
  customer_id?: string;
  amount: number;
  payment_method: string;
  check_number?: string;
  reference_number?: string;
  notes?: string;
  auto_create_invoice?: boolean;
}

export interface CollectPaymentResult {
  status: string;
  payment_id: string;
  work_order_id?: string;
  invoice_id?: string;
  customer_id?: string;
  customer_name: string;
  amount: number;
  payment_method: string;
  description: string;
  payment_date: string;
}

/**
 * Collect a payment via the admin/unified endpoint.
 * POST /payments/clover/collect
 */
export function useCollectPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CollectPaymentParams): Promise<CollectPaymentResult> => {
      const { data } = await apiClient.post("/payments/clover/collect", params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["workOrders"] });
      queryClient.invalidateQueries({ queryKey: ["technician-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["clover"] });
    },
    onError: () => toastError("Payment failed. Please try again."),
  });
}

/**
 * Record a field payment for a specific work order (technician endpoint).
 * POST /employee/jobs/{workOrderId}/payment
 */
export function useRecordFieldPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      workOrderId: string;
      payment_method: string;
      amount: number;
      check_number?: string;
      notes?: string;
    }): Promise<CollectPaymentResult> => {
      const { data } = await apiClient.post(
        `/employee/jobs/${params.workOrderId}/payment`,
        {
          payment_method: params.payment_method,
          amount: params.amount,
          check_number: params.check_number,
          notes: params.notes,
        },
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["technician-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["tech-job-payments", variables.workOrderId] });
      queryClient.invalidateQueries({ queryKey: ["workOrders"] });
    },
    onError: () => toastError("Failed to record field payment"),
  });
}
