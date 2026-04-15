import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { validateResponse } from "../validateResponse.ts";
import {
  qboConnectionStatusSchema,
  qboAuthURLSchema,
  qboSyncResultSchema,
  qboSettingsSchema,
  qbPullSummarySchema,
  qbSyncLogSchema,
  qbUnmatchedListSchema,
  qbReferenceCodeSchema,
  qbPrimaryProcessorSchema,
  type QBOConnectionStatus,
  type QBOAuthURL,
  type QBOSyncResult,
  type QBOSettings,
  type QBPullSummary,
  type QBReferenceCode,
  type QBPrimaryProcessor,
} from "../types/quickbooks.ts";

/**
 * Query keys for QuickBooks
 */
export const qboKeys = {
  all: ["quickbooks"] as const,
  status: () => [...qboKeys.all, "status"] as const,
  settings: () => [...qboKeys.all, "settings"] as const,
  syncLog: () => [...qboKeys.all, "syncLog"] as const,
  unmatched: () => [...qboKeys.all, "unmatched"] as const,
  primaryProcessor: () => [...qboKeys.all, "primaryProcessor"] as const,
  referenceCode: (invoiceId: string) =>
    [...qboKeys.all, "referenceCode", invoiceId] as const,
};

/**
 * Get QuickBooks connection status
 */
export function useQBOStatus() {
  return useQuery({
    queryKey: qboKeys.status(),
    queryFn: async (): Promise<QBOConnectionStatus> => {
      const { data } = await apiClient.get("/integrations/quickbooks/status");
      return validateResponse(qboConnectionStatusSchema, data, "/integrations/quickbooks/status");
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
      const { data } = await apiClient.get("/integrations/quickbooks/settings");
      return validateResponse(qboSettingsSchema, data, "/integrations/quickbooks/settings");
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
      const { data } = await apiClient.get("/integrations/quickbooks/connect");
      return validateResponse(qboAuthURLSchema, data, "/integrations/quickbooks/connect");
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
      const { data } = await apiClient.post("/integrations/quickbooks/disconnect");
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
        "/integrations/quickbooks/customers/sync",
        customerIds ? { customer_ids: customerIds } : undefined,
      );
      return validateResponse(qboSyncResultSchema, data, "/integrations/quickbooks/customers/sync");
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
        "/integrations/quickbooks/invoices/sync",
        invoiceIds ? { invoice_ids: invoiceIds } : undefined,
      );
      return validateResponse(qboSyncResultSchema, data, "/integrations/quickbooks/invoices/sync");
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
        "/integrations/quickbooks/payments/sync",
        paymentIds ? { payment_ids: paymentIds } : undefined,
      );
      return validateResponse(qboSyncResultSchema, data, "/integrations/quickbooks/payments/sync");
    },
  });
}

// ── GoPayment parallel integration ──────────────────────────

/**
 * Trigger a QB → CRM payment pull. Matches transactions by reference code in memo.
 */
export function useQBPullPayments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lookbackDays = 14): Promise<QBPullSummary> => {
      const { data } = await apiClient.post(
        `/integrations/quickbooks/sync/pull?lookback_days=${lookbackDays}`,
      );
      return validateResponse(qbPullSummarySchema, data, "/integrations/quickbooks/sync/pull");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qboKeys.syncLog() });
      queryClient.invalidateQueries({ queryKey: qboKeys.unmatched() });
      queryClient.invalidateQueries({ queryKey: qboKeys.status() });
    },
  });
}

/**
 * Recent QB sync run summaries.
 */
export function useQBSyncLog(limit = 20) {
  return useQuery({
    queryKey: qboKeys.syncLog(),
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/integrations/quickbooks/sync/log?limit=${limit}`,
      );
      return validateResponse(qbSyncLogSchema, data, "/integrations/quickbooks/sync/log");
    },
    retry: false,
    staleTime: 30 * 1000,
  });
}

/**
 * QB-sourced payments that could not be matched to a CRM invoice.
 */
export function useQBUnmatchedPayments() {
  return useQuery({
    queryKey: qboKeys.unmatched(),
    queryFn: async () => {
      const { data } = await apiClient.get("/integrations/quickbooks/payments/unmatched");
      return validateResponse(qbUnmatchedListSchema, data, "/integrations/quickbooks/payments/unmatched");
    },
    retry: false,
    staleTime: 30 * 1000,
  });
}

/**
 * Manually link an unmatched QB payment to an invoice.
 */
export function useQBMatchPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId, invoiceId }: { paymentId: string; invoiceId: string }) => {
      const { data } = await apiClient.post(
        `/integrations/quickbooks/payments/${paymentId}/match?invoice_id=${invoiceId}`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qboKeys.unmatched() });
    },
  });
}

/**
 * Fetch the reference code a tech should type into the GoPayment memo.
 */
export function useQBReferenceCode(invoiceId: string | undefined) {
  return useQuery({
    queryKey: qboKeys.referenceCode(invoiceId || ""),
    queryFn: async (): Promise<QBReferenceCode> => {
      const { data } = await apiClient.get(
        `/integrations/quickbooks/reference-code/${invoiceId}`,
      );
      return validateResponse(qbReferenceCodeSchema, data, "/integrations/quickbooks/reference-code");
    },
    enabled: !!invoiceId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Record a pending GoPayment charge (tech initiated — CRM awaits sync confirmation).
 */
export function useQBRecordPending() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      invoice_id: string;
      customer_id?: string;
      amount: number;
      reference_code: string;
      notes?: string;
    }) => {
      const params = new URLSearchParams();
      params.set("invoice_id", payload.invoice_id);
      params.set("amount", String(payload.amount));
      params.set("reference_code", payload.reference_code);
      if (payload.customer_id) params.set("customer_id", payload.customer_id);
      if (payload.notes) params.set("notes", payload.notes);
      const { data } = await apiClient.post(
        `/integrations/quickbooks/payments/pending?${params.toString()}`,
      );
      return data as { success: boolean; payment_id: string; status: string; reference_code: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

/**
 * Read/write the primary payment processor (clover | quickbooks_gopayment).
 */
export function useQBPrimaryProcessor() {
  return useQuery({
    queryKey: qboKeys.primaryProcessor(),
    queryFn: async (): Promise<QBPrimaryProcessor> => {
      const { data } = await apiClient.get("/integrations/quickbooks/primary-processor");
      return validateResponse(qbPrimaryProcessorSchema, data, "/integrations/quickbooks/primary-processor");
    },
    retry: false,
    staleTime: 60 * 1000,
  });
}

export function useSetQBPrimaryProcessor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (processor: "clover" | "quickbooks_gopayment") => {
      const { data } = await apiClient.patch(
        `/integrations/quickbooks/primary-processor?processor=${processor}`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qboKeys.primaryProcessor() });
    },
  });
}
