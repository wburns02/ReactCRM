import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { validateResponse } from "../validateResponse.ts";
import {
  paymentListResponseSchema,
  paymentSchema,
  type Payment,
  type PaymentListResponse,
  type PaymentFilters,
  type PaymentFormData,
} from "../types/payment.ts";

/**
 * Query keys for payments
 */
export const paymentKeys = {
  all: ["payments"] as const,
  lists: () => [...paymentKeys.all, "list"] as const,
  list: (filters: PaymentFilters) => [...paymentKeys.lists(), filters] as const,
  details: () => [...paymentKeys.all, "detail"] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
  stats: () => [...paymentKeys.all, "stats"] as const,
};

/**
 * Fetch paginated payments list
 */
export function usePayments(filters: PaymentFilters = {}) {
  return useQuery({
    queryKey: paymentKeys.list(filters),
    queryFn: async (): Promise<PaymentListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", String(filters.page));
      if (filters.page_size) params.set("page_size", String(filters.page_size));
      if (filters.status) params.set("status", filters.status);
      if (filters.payment_method)
        params.set("payment_method", filters.payment_method);
      if (filters.customer_id) params.set("customer_id", filters.customer_id);
      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);

      const url = "/payments?" + params.toString();
      const { data } = await apiClient.get(url);

      // Handle both array and paginated response
      if (Array.isArray(data)) {
        return {
          items: data,
          total: data.length,
          page: 1,
          page_size: data.length,
        };
      }

      // Validate response in ALL environments (reports to Sentry if invalid)
      return validateResponse(
        paymentListResponseSchema,
        data,
        "/payments"
      );
    },
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Fetch single payment by ID
 */
export function usePayment(id: string | undefined) {
  return useQuery({
    queryKey: paymentKeys.detail(id!),
    queryFn: async (): Promise<Payment> => {
      const { data } = await apiClient.get("/payments/" + id);

      // Validate response in ALL environments (reports to Sentry if invalid)
      return validateResponse(paymentSchema, data, `/payments/${id}`);
    },
    enabled: !!id,
  });
}

/**
 * Create new payment (record payment)
 */
export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PaymentFormData): Promise<Payment> => {
      const response = await apiClient.post("/payments", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paymentKeys.stats() });
    },
  });
}

/**
 * Update existing payment
 */
export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<PaymentFormData>;
    }): Promise<Payment> => {
      const response = await apiClient.patch("/payments/" + id, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: paymentKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paymentKeys.stats() });
    },
  });
}

/**
 * Delete payment
 */
export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete("/payments/" + id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paymentKeys.stats() });
    },
  });
}

/**
 * Payment statistics hook
 */
export function usePaymentStats() {
  return useQuery({
    queryKey: paymentKeys.stats(),
    queryFn: async () => {
      // Fetch all payments for stats calculation
      const { data } = await apiClient.get("/payments?page=1&page_size=500");
      const payments: Payment[] = Array.isArray(data) ? data : data.items || [];

      const stats = {
        totalReceived: 0,
        pending: 0,
        completed: 0,
        failed: 0,
        thisMonth: 0,
      };

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      payments.forEach((payment) => {
        const amount = Number(payment.amount) || 0;

        // Total received (completed payments)
        if (payment.status === "completed") {
          stats.totalReceived += amount;
          stats.completed++;
        }

        // Pending
        if (payment.status === "pending") {
          stats.pending++;
        }

        // Failed
        if (payment.status === "failed") {
          stats.failed++;
        }

        // This month's payments
        const dateStr = payment.payment_date || payment.created_at;
        if (dateStr) {
          const paymentDate = new Date(dateStr);
          if (paymentDate >= firstDayOfMonth && payment.status === "completed") {
            stats.thisMonth += amount;
          }
        }
      });

      return stats;
    },
    staleTime: 60_000, // 1 minute
  });
}
