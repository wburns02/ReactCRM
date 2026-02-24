import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { validateResponse } from "../validateResponse.ts";
import { toastError } from "@/components/ui/Toast.tsx";
import {
  quoteListResponseSchema,
  quoteSchema,
  type Quote,
  type QuoteListResponse,
  type QuoteFilters,
  type QuoteFormData,
} from "../types/quote.ts";

/**
 * Query keys for quotes
 */
export const quoteKeys = {
  all: ["quotes"] as const,
  lists: () => [...quoteKeys.all, "list"] as const,
  list: (filters: QuoteFilters) => [...quoteKeys.lists(), filters] as const,
  details: () => [...quoteKeys.all, "detail"] as const,
  detail: (id: string) => [...quoteKeys.details(), id] as const,
};

/**
 * Fetch paginated quotes list
 */
export function useQuotes(filters: QuoteFilters = {}) {
  return useQuery({
    queryKey: quoteKeys.list(filters),
    queryFn: async (): Promise<QuoteListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", String(filters.page));
      if (filters.page_size) params.set("page_size", String(filters.page_size));
      if (filters.status) params.set("status", filters.status);
      if (filters.customer_id) params.set("customer_id", filters.customer_id);

      const url = "/quotes/?" + params.toString();
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
        quoteListResponseSchema,
        data,
        "/quotes"
      );
    },
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Fetch single quote by ID
 */
export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: quoteKeys.detail(id!),
    queryFn: async (): Promise<Quote> => {
      const { data } = await apiClient.get("/quotes/" + id);

      // Validate response in ALL environments (reports to Sentry if invalid)
      return validateResponse(quoteSchema, data, `/quotes/${id}`);
    },
    enabled: !!id,
  });
}

/**
 * Create new quote
 */
export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: QuoteFormData): Promise<Quote> => {
      // Calculate line item amounts
      const lineItems = data.line_items.map((item) => ({
        ...item,
        amount: item.quantity * item.rate,
      }));

      // Calculate totals - round to 2 decimal places for API compatibility
      const subtotal =
        Math.round(
          lineItems.reduce((sum, item) => sum + item.amount, 0) * 100,
        ) / 100;
      const tax = Math.round(subtotal * (data.tax_rate / 100) * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;

      const quoteData = {
        ...data,
        line_items: lineItems,
        subtotal,
        tax,
        total,
        // Pass date as-is (YYYY-MM-DD) - backend handles the format
        valid_until: data.valid_until || undefined,
      };

      const response = await apiClient.post("/quotes/", quoteData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
    },
    onError: () => toastError("Failed to create quote"),
  });
}

/**
 * Update existing quote
 */
export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<QuoteFormData>;
    }): Promise<Quote> => {
      let quoteData = { ...data };

      // If line items are being updated, recalculate totals
      if (data.line_items) {
        const lineItems = data.line_items.map((item) => ({
          ...item,
          amount: item.quantity * item.rate,
        }));

        // Calculated fields (subtotal, tax, total) are computed server-side
        quoteData = {
          ...data,
          line_items: lineItems,
        };
      }

      const response = await apiClient.patch("/quotes/" + id, quoteData);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: quoteKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
    },
    onError: () => toastError("Failed to update quote"),
  });
}

/**
 * Delete quote
 */
export function useDeleteQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete("/quotes/" + id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
    },
    onError: () => toastError("Failed to delete quote"),
  });
}

/**
 * Convert quote to invoice
 */
export function useConvertQuoteToInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ invoice_id: string }> => {
      const response = await apiClient.post(`/quotes/${id}/convert-to-invoice`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
      // Also invalidate invoices since a new one was created
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: () => toastError("Failed to convert quote to invoice"),
  });
}

/**
 * Send quote to customer
 */
export function useSendQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<Quote> => {
      const response = await apiClient.post(`/quotes/${id}/send`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
    },
    onError: () => toastError("Failed to send quote"),
  });
}

/**
 * Accept quote/estimate - marks as accepted by customer
 */
export function useAcceptQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: string | { id: string; signatureData?: string; signedBy?: string }): Promise<Quote> => {
      const id = typeof params === "string" ? params : params.id;
      const body = typeof params === "string" ? {} : {
        signature_data: params.signatureData,
        signed_by: params.signedBy,
      };
      const response = await apiClient.post(`/quotes/${id}/accept`, body);
      return response.data;
    },
    onSuccess: (_, params) => {
      const id = typeof params === "string" ? params : params.id;
      queryClient.invalidateQueries({ queryKey: quoteKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
    },
    onError: () => toastError("Failed to accept quote"),
  });
}

/**
 * Decline quote/estimate - marks as declined by customer
 */
export function useDeclineQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<Quote> => {
      const response = await apiClient.post(`/quotes/${id}/decline`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
    },
    onError: () => toastError("Failed to decline quote"),
  });
}

/**
 * Download estimate/quote as PDF
 */
export function useDownloadEstimatePDF() {
  return useMutation({
    mutationFn: async (estimateId: string): Promise<{ success: boolean }> => {
      const response = await apiClient.get(`/quotes/${estimateId}/pdf`, {
        responseType: "blob",
      });

      // Create blob from response
      const blob = new Blob([response.data], { type: "application/pdf" });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers["content-disposition"];
      let filename = `Estimate_${estimateId}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      window.URL.revokeObjectURL(url);

      return { success: true };
    },
  });
}
