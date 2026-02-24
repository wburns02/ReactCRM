import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { validateResponse } from "../validateResponse.ts";
import { toastError } from "@/components/ui/Toast.tsx";
import {
  invoiceListResponseSchema,
  invoiceSchema,
  type Invoice,
  type InvoiceListResponse,
  type InvoiceFilters,
  type InvoiceFormData,
} from "../types/invoice.ts";

/**
 * Query keys for invoices
 */
export const invoiceKeys = {
  all: ["invoices"] as const,
  lists: () => [...invoiceKeys.all, "list"] as const,
  list: (filters: InvoiceFilters) => [...invoiceKeys.lists(), filters] as const,
  details: () => [...invoiceKeys.all, "detail"] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
};

/**
 * Fetch paginated invoices list
 */
export function useInvoices(filters: InvoiceFilters = {}) {
  return useQuery({
    queryKey: invoiceKeys.list(filters),
    queryFn: async (): Promise<InvoiceListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", String(filters.page));
      if (filters.page_size) params.set("page_size", String(filters.page_size));
      if (filters.status) params.set("status", filters.status);
      if (filters.customer_id) params.set("customer_id", filters.customer_id);
      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);
      if (filters.search) params.set("search", filters.search);

      const url = "/invoices?" + params.toString();
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
        invoiceListResponseSchema,
        data,
        "/invoices"
      );
    },
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Fetch single invoice by ID
 */
export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: invoiceKeys.detail(id!),
    queryFn: async (): Promise<Invoice> => {
      const { data } = await apiClient.get("/invoices/" + id);

      // Validate response in ALL environments (reports to Sentry if invalid)
      return validateResponse(invoiceSchema, data, `/invoices/${id}`);
    },
    enabled: !!id,
  });
}

/**
 * Create new invoice
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InvoiceFormData): Promise<Invoice> => {
      // Calculate line item amounts
      const lineItems = data.line_items.map((item) => ({
        ...item,
        amount: item.quantity * item.rate,
      }));

      // Calculate totals
      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const tax = subtotal * (data.tax_rate / 100);
      const total = subtotal + tax;

      const invoiceData = {
        ...data,
        line_items: lineItems,
        subtotal,
        tax,
        total,
      };

      const response = await apiClient.post("/invoices", invoiceData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
    onError: () => toastError("Failed to create invoice"),
  });
}

/**
 * Update existing invoice
 */
export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<InvoiceFormData>;
    }): Promise<Invoice> => {
      let invoiceData = { ...data };

      // If line items are being updated, recalculate totals
      if (data.line_items) {
        const lineItems = data.line_items.map((item) => ({
          ...item,
          amount: item.quantity * item.rate,
        }));

        // Calculated fields (subtotal, tax, total) are computed server-side
        invoiceData = {
          ...data,
          line_items: lineItems,
        };
      }

      const response = await apiClient.patch("/invoices/" + id, invoiceData);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: invoiceKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
    onError: () => toastError("Failed to update invoice"),
  });
}

/**
 * Delete invoice
 */
export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete("/invoices/" + id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
    onError: () => toastError("Failed to delete invoice"),
  });
}

/**
 * Send invoice to customer
 */
export function useSendInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<Invoice> => {
      const response = await apiClient.post(`/invoices/${id}/send`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
    onError: () => toastError("Failed to send invoice"),
  });
}

/**
 * Mark invoice as paid
 */
export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<Invoice> => {
      const response = await apiClient.post(`/invoices/${id}/mark-paid`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
    onError: () => toastError("Failed to mark invoice as paid"),
  });
}
