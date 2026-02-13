import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { validateResponse } from "../validateResponse.ts";
import {
  qboConnectionStatusSchema,
  qboAuthURLSchema,
  qboSyncResultSchema,
  qboSettingsSchema,
  type QBOConnectionStatus,
  type QBOAuthURL,
  type QBOSyncResult,
  type QBOSettings,
} from "../types/quickbooks.ts";

/**
 * Query keys for QuickBooks
 */
export const qboKeys = {
  all: ["quickbooks"] as const,
  status: () => [...qboKeys.all, "status"] as const,
  settings: () => [...qboKeys.all, "settings"] as const,
};

/**
 * Get QuickBooks connection status
 */
export function useQBOStatus() {
  return useQuery({
    queryKey: qboKeys.status(),
    queryFn: async (): Promise<QBOConnectionStatus> => {
      const { data } = await apiClient.get("/quickbooks/status");
      return validateResponse(qboConnectionStatusSchema, data, "/quickbooks/status");
    },
    retry: false,
    staleTime: 30 * 1000,
  });
}

/**
 * Get QuickBooks sync settings
 */
export function useQBOSettings() {
  return useQuery({
    queryKey: qboKeys.settings(),
    queryFn: async (): Promise<QBOSettings> => {
      const { data } = await apiClient.get("/quickbooks/settings");
      return validateResponse(qboSettingsSchema, data, "/quickbooks/settings");
    },
    retry: false,
    staleTime: 60 * 1000,
  });
}

/**
 * Initiate QuickBooks OAuth connection
 */
export function useQBOConnect() {
  return useMutation({
    mutationFn: async (): Promise<QBOAuthURL> => {
      const { data } = await apiClient.get("/quickbooks/connect");
      return validateResponse(qboAuthURLSchema, data, "/quickbooks/connect");
    },
  });
}

/**
 * Disconnect QuickBooks
 */
export function useQBODisconnect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post("/quickbooks/disconnect");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qboKeys.all });
    },
  });
}

/**
 * Sync customers to QuickBooks
 */
export function useQBOSyncCustomers() {
  return useMutation({
    mutationFn: async (customerIds?: string[]): Promise<QBOSyncResult> => {
      const { data } = await apiClient.post(
        "/quickbooks/customers/sync",
        customerIds ? { customer_ids: customerIds } : undefined,
      );
      return validateResponse(qboSyncResultSchema, data, "/quickbooks/customers/sync");
    },
  });
}

/**
 * Sync invoices to QuickBooks
 */
export function useQBOSyncInvoices() {
  return useMutation({
    mutationFn: async (invoiceIds?: string[]): Promise<QBOSyncResult> => {
      const { data } = await apiClient.post(
        "/quickbooks/invoices/sync",
        invoiceIds ? { invoice_ids: invoiceIds } : undefined,
      );
      return validateResponse(qboSyncResultSchema, data, "/quickbooks/invoices/sync");
    },
  });
}

/**
 * Sync payments to QuickBooks
 */
export function useQBOSyncPayments() {
  return useMutation({
    mutationFn: async (paymentIds?: string[]): Promise<QBOSyncResult> => {
      const { data } = await apiClient.post(
        "/quickbooks/payments/sync",
        paymentIds ? { payment_ids: paymentIds } : undefined,
      );
      return validateResponse(qboSyncResultSchema, data, "/quickbooks/payments/sync");
    },
  });
}
