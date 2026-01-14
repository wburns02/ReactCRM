import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
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

      const url = "/quotes?" + params.toString();
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

      // Validate response in development
      if (import.meta.env.DEV) {
        const result = quoteListResponseSchema.safeParse(data);
        if (!result.success) {
          console.warn("Quote list response validation failed:", result.error);
        }
      }

      return data;
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

      if (import.meta.env.DEV) {
        const result = quoteSchema.safeParse(data);
        if (!result.success) {
          console.warn("Quote response validation failed:", result.error);
        }
      }

      return data;
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

      // Calculate totals
      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const tax = subtotal * (data.tax_rate / 100);
      const total = subtotal + tax;

      const quoteData = {
        ...data,
        line_items: lineItems,
        subtotal,
        tax,
        total,
      };

      const response = await apiClient.post("/quotes", quoteData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quoteKeys.lists() });
    },
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
  });
}
