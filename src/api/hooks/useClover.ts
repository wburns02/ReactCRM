import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { toastError } from "@/components/ui/Toast.tsx";
import { validateResponse } from "../validateResponse.ts";
import {
  cloverConfigSchema,
  cloverMerchantSchema,
  cloverPaymentsResponseSchema,
  cloverOrdersResponseSchema,
  cloverItemsResponseSchema,
  cloverSyncResultSchema,
  cloverReconciliationSchema,
  cloverOAuthAuthorizeSchema,
  cloverOAuthStatusSchema,
  cloverOAuthCallbackResultSchema,
  type CloverConfig,
  type CloverMerchant,
  type CloverPaymentsResponse,
  type CloverOrdersResponse,
  type CloverItemsResponse,
  type CloverSyncResult,
  type CloverReconciliation,
  type CloverOAuthAuthorize,
  type CloverOAuthStatus,
  type CloverOAuthCallbackResult,
} from "../types/clover.ts";

/**
 * Query keys for Clover
 */
export const cloverKeys = {
  all: ["clover"] as const,
  config: () => [...cloverKeys.all, "config"] as const,
  merchant: () => [...cloverKeys.all, "merchant"] as const,
  payments: (limit?: number) => [...cloverKeys.all, "payments", limit] as const,
  orders: (limit?: number) => [...cloverKeys.all, "orders", limit] as const,
  items: () => [...cloverKeys.all, "items"] as const,
  reconciliation: () => [...cloverKeys.all, "reconciliation"] as const,
  oauthStatus: () => [...cloverKeys.all, "oauth-status"] as const,
};

/**
 * Fetch Clover config + capabilities
 */
export function useCloverConfig() {
  return useQuery({
    queryKey: cloverKeys.config(),
    queryFn: async (): Promise<CloverConfig> => {
      const { data } = await apiClient.get("/payments/clover/config");
      return validateResponse(cloverConfigSchema, data, "/payments/clover/config");
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

/**
 * Fetch Clover merchant profile
 */
export function useCloverMerchant() {
  return useQuery({
    queryKey: cloverKeys.merchant(),
    queryFn: async (): Promise<CloverMerchant> => {
      const { data } = await apiClient.get("/payments/clover/merchant");
      return validateResponse(cloverMerchantSchema, data, "/payments/clover/merchant");
    },
    retry: false,
    staleTime: 10 * 60 * 1000, // 10 min
  });
}

/**
 * Fetch Clover payments (from POS device)
 */
export function useCloverPayments(limit: number = 50) {
  return useQuery({
    queryKey: cloverKeys.payments(limit),
    queryFn: async (): Promise<CloverPaymentsResponse> => {
      const { data } = await apiClient.get(`/payments/clover/payments?limit=${limit}`);
      return validateResponse(cloverPaymentsResponseSchema, data, "/payments/clover/payments");
    },
    retry: false,
    staleTime: 2 * 60 * 1000, // 2 min
  });
}

/**
 * Fetch Clover orders with line items
 */
export function useCloverOrders(limit: number = 50) {
  return useQuery({
    queryKey: cloverKeys.orders(limit),
    queryFn: async (): Promise<CloverOrdersResponse> => {
      const { data } = await apiClient.get(`/payments/clover/orders?limit=${limit}`);
      return validateResponse(cloverOrdersResponseSchema, data, "/payments/clover/orders");
    },
    retry: false,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch Clover service catalog items
 */
export function useCloverItems() {
  return useQuery({
    queryKey: cloverKeys.items(),
    queryFn: async (): Promise<CloverItemsResponse> => {
      const { data } = await apiClient.get("/payments/clover/items");
      return validateResponse(cloverItemsResponseSchema, data, "/payments/clover/items");
    },
    retry: false,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch payment reconciliation data
 */
export function useCloverReconciliation() {
  return useQuery({
    queryKey: cloverKeys.reconciliation(),
    queryFn: async (): Promise<CloverReconciliation> => {
      const { data } = await apiClient.get("/payments/clover/reconciliation");
      return validateResponse(cloverReconciliationSchema, data, "/payments/clover/reconciliation");
    },
    retry: false,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Sync Clover payments to CRM
 */
export function useCloverSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<CloverSyncResult> => {
      const { data } = await apiClient.post("/payments/clover/sync");
      return validateResponse(cloverSyncResultSchema, data, "/payments/clover/sync");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cloverKeys.reconciliation() });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

// =============================================================================
// OAuth Hooks
// =============================================================================

/**
 * Fetch Clover OAuth connection status
 */
export function useCloverOAuthStatus() {
  return useQuery({
    queryKey: cloverKeys.oauthStatus(),
    queryFn: async (): Promise<CloverOAuthStatus> => {
      const { data } = await apiClient.get("/payments/clover/oauth/status");
      return validateResponse(cloverOAuthStatusSchema, data, "/payments/clover/oauth/status");
    },
    retry: false,
    staleTime: 30 * 1000, // 30 sec
  });
}

/**
 * Get Clover OAuth authorization URL
 */
export function useCloverOAuthAuthorize() {
  return useMutation({
    mutationFn: async (): Promise<CloverOAuthAuthorize> => {
      const { data } = await apiClient.get("/payments/clover/oauth/authorize");
      return validateResponse(cloverOAuthAuthorizeSchema, data, "/payments/clover/oauth/authorize");
    },
  });
}

/**
 * Exchange OAuth code for token (callback)
 */
export function useCloverOAuthCallback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { code: string; merchant_id?: string; state?: string }): Promise<CloverOAuthCallbackResult> => {
      const queryStr = new URLSearchParams({
        code: params.code,
        ...(params.merchant_id ? { merchant_id: params.merchant_id } : {}),
        ...(params.state ? { state: params.state } : {}),
      }).toString();
      const { data } = await apiClient.post(`/payments/clover/oauth/callback?${queryStr}`);
      return validateResponse(cloverOAuthCallbackResultSchema, data, "/payments/clover/oauth/callback");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cloverKeys.all });
    },
  });
}

/**
 * Disconnect Clover OAuth
 */
export function useCloverOAuthDisconnect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post("/payments/clover/oauth/disconnect");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cloverKeys.all });
    },
  });
}

/**
 * Charge a payment via Clover ecommerce
 */
export function useCloverCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      invoice_id: string;
      amount: number;
      token: string;
      customer_email?: string;
    }) => {
      const { data } = await apiClient.post("/payments/clover/charge", params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: cloverKeys.reconciliation() });
    },
    onError: () => toastError("Payment failed. Please try again."),
  });
}
