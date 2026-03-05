import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { validateResponse } from "../validateResponse.ts";
import { toastError, toastSuccess } from "@/components/ui/Toast.tsx";
import {
  documentListResponseSchema,
  documentMetaSchema,
  documentStatsSchema,
  batchGenerateResponseSchema,
  type DocumentMeta,
  type DocumentListResponse,
  type DocumentStats,
  type DocumentFilters,
  type GenerateRequest,
  type BatchGenerateRequest,
  type SendRequest,
  type BatchGenerateResponse,
  type SourceRecord,
} from "../types/documentCenter.ts";

/**
 * Query keys for Document Center
 */
export const documentCenterKeys = {
  all: ["documentCenter"] as const,
  lists: () => [...documentCenterKeys.all, "list"] as const,
  list: (filters: DocumentFilters) => [...documentCenterKeys.lists(), filters] as const,
  details: () => [...documentCenterKeys.all, "detail"] as const,
  detail: (id: string) => [...documentCenterKeys.details(), id] as const,
  stats: () => [...documentCenterKeys.all, "stats"] as const,
  preview: (id: string) => [...documentCenterKeys.all, "preview", id] as const,
  sourceRecords: (type: string, search?: string) => [
    ...documentCenterKeys.all,
    "sourceRecords",
    type,
    search,
  ] as const,
};

/**
 * Fetch paginated documents list
 */
export function useDocuments(filters: DocumentFilters = {}) {
  return useQuery({
    queryKey: documentCenterKeys.list(filters),
    queryFn: async (): Promise<DocumentListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", String(filters.page));
      if (filters.page_size) params.set("page_size", String(filters.page_size));
      if (filters.document_type) params.set("document_type", filters.document_type);
      if (filters.customer_id) params.set("customer_id", filters.customer_id);
      if (filters.status) params.set("status", filters.status);
      if (filters.search) params.set("search", filters.search);
      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);

      const url = "/documents?" + params.toString();
      const { data } = await apiClient.get(url);

      return validateResponse(documentListResponseSchema, data, url);
    },
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Fetch single document metadata
 */
export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: documentCenterKeys.detail(id!),
    queryFn: async (): Promise<DocumentMeta> => {
      const { data } = await apiClient.get(`/documents/${id}`);
      return validateResponse(documentMetaSchema, data, `/documents/${id}`);
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

/**
 * Fetch document statistics for dashboard
 */
export function useDocumentStats() {
  return useQuery({
    queryKey: documentCenterKeys.stats(),
    queryFn: async (): Promise<DocumentStats> => {
      const { data } = await apiClient.get("/documents/stats");
      return validateResponse(documentStatsSchema, data, "/documents/stats");
    },
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Generate a new document PDF
 */
export function useGenerateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: GenerateRequest): Promise<DocumentMeta> => {
      const { data } = await apiClient.post("/documents/generate", request);
      return validateResponse(documentMetaSchema, data, "/documents/generate");
    },
    onSuccess: (_, variables) => {
      toastSuccess("Document generated successfully!");
      // Invalidate lists and stats
      queryClient.invalidateQueries({ queryKey: documentCenterKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentCenterKeys.stats() });
    },
    onError: (error) => {
      console.error("Document generation failed:", error);
      toastError("Failed to generate document. Please try again.");
    },
  });
}

/**
 * Generate multiple documents at once
 */
export function useBatchGenerateDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: BatchGenerateRequest): Promise<BatchGenerateResponse> => {
      const { data } = await apiClient.post("/documents/batch-generate", request);
      return validateResponse(batchGenerateResponseSchema, data, "/documents/batch-generate");
    },
    onSuccess: (result) => {
      const { total_generated, total_errors } = result;
      if (total_errors === 0) {
        toastSuccess(`Successfully generated ${total_generated} documents!`);
      } else {
        toastError(`Generated ${total_generated} documents with ${total_errors} errors.`);
      }

      // Invalidate lists and stats
      queryClient.invalidateQueries({ queryKey: documentCenterKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentCenterKeys.stats() });
    },
    onError: (error) => {
      console.error("Batch generation failed:", error);
      toastError("Failed to generate documents. Please try again.");
    },
  });
}

/**
 * Send document via email
 */
export function useSendDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, request }: { id: string; request: SendRequest }): Promise<DocumentMeta> => {
      const { data } = await apiClient.post(`/documents/${id}/send`, request);
      return validateResponse(documentMetaSchema, data, `/documents/${id}/send`);
    },
    onSuccess: (_, { request }) => {
      toastSuccess(`Document sent to ${request.email}!`);
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: documentCenterKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentCenterKeys.stats() });
      queryClient.invalidateQueries({ queryKey: documentCenterKeys.details() });
    },
    onError: (error) => {
      console.error("Document send failed:", error);
      toastError("Failed to send document. Please try again.");
    },
  });
}

/**
 * Resend document to same or new email
 */
export function useResendDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, request }: { id: string; request: SendRequest }): Promise<DocumentMeta> => {
      const { data } = await apiClient.post(`/documents/${id}/resend`, request);
      return validateResponse(documentMetaSchema, data, `/documents/${id}/resend`);
    },
    onSuccess: (_, { request }) => {
      toastSuccess(`Document resent to ${request.email}!`);
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: documentCenterKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentCenterKeys.stats() });
      queryClient.invalidateQueries({ queryKey: documentCenterKeys.details() });
    },
    onError: (error) => {
      console.error("Document resend failed:", error);
      toastError("Failed to resend document. Please try again.");
    },
  });
}

/**
 * Delete document
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/documents/${id}`);
    },
    onSuccess: () => {
      toastSuccess("Document deleted successfully!");
      // Invalidate all document queries
      queryClient.invalidateQueries({ queryKey: documentCenterKeys.all });
    },
    onError: (error) => {
      console.error("Document delete failed:", error);
      toastError("Failed to delete document. Please try again.");
    },
  });
}

/**
 * Get PDF download URL (for opening in new tab or downloading)
 */
export function getPDFUrl(documentId: string): string {
  return `${apiClient.defaults.baseURL}/documents/${documentId}/pdf`;
}

/**
 * Get HTML preview URL (for iframe)
 */
export function getHTMLPreviewUrl(documentId: string): string {
  return `${apiClient.defaults.baseURL}/documents/${documentId}/html`;
}

/**
 * Download PDF document
 */
export function useDownloadDocument() {
  return useMutation({
    mutationFn: async (document: DocumentMeta): Promise<void> => {
      // Open PDF in a new tab (browser will handle download based on settings)
      const pdfUrl = getPDFUrl(document.id);
      window.open(pdfUrl, "_blank");
    },
    onError: (error) => {
      console.error("Download failed:", error);
      toastError("Failed to download document.");
    },
  });
}

/**
 * Fetch source records for document generation (invoices, quotes, work orders)
 */
export function useSourceRecords(documentType: string, search?: string) {
  return useQuery({
    queryKey: documentCenterKeys.sourceRecords(documentType, search),
    queryFn: async (): Promise<SourceRecord[]> => {
      // Map document types to their API endpoints
      const endpointMap: Record<string, string> = {
        invoice: "/invoices",
        quote: "/quotes",
        work_order: "/work-orders",
        inspection_report: "/work-orders", // Inspections are work orders with checklist data
      };

      const endpoint = endpointMap[documentType];
      if (!endpoint) {
        throw new Error(`Unknown document type: ${documentType}`);
      }

      const params = new URLSearchParams({
        page_size: "50", // Limit for dropdown
      });

      if (search) {
        params.set("search", search);
      }

      // For inspection reports, filter for completed work orders only
      if (documentType === "inspection_report") {
        params.set("status", "completed");
      }

      const url = `${endpoint}?${params.toString()}`;
      const { data } = await apiClient.get(url);

      // Transform response to SourceRecord format
      const items = Array.isArray(data) ? data : data.items || [];

      return items.map((item: any): SourceRecord => ({
        id: item.id,
        reference_number:
          item.invoice_number ||
          item.quote_number ||
          `WO-${item.id.slice(0, 8).toUpperCase()}`,
        customer_name: item.customer_name || `${item.customer?.first_name || ""} ${item.customer?.last_name || ""}`.trim() || "Unknown",
        date: item.invoice_date || item.created_at || item.scheduled_date,
        amount: item.amount || item.total || null,
        status: item.status,
      }));
    },
    enabled: !!documentType,
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Generate document and optionally send email in one step
 */
export function useGenerateAndSend() {
  const generateMutation = useGenerateDocument();
  const sendMutation = useSendDocument();

  const mutation = useMutation({
    mutationFn: async ({
      generateRequest,
      sendRequest,
    }: {
      generateRequest: GenerateRequest;
      sendRequest?: SendRequest;
    }): Promise<DocumentMeta> => {
      // First, generate the document
      const document = await generateMutation.mutateAsync(generateRequest);

      // If sendRequest is provided, send the email
      if (sendRequest) {
        return await sendMutation.mutateAsync({ id: document.id, request: sendRequest });
      }

      return document;
    },
    onError: (error) => {
      console.error("Generate and send failed:", error);
      toastError("Failed to generate and send document.");
    },
  });

  return {
    ...mutation,
    isLoading: mutation.isPending || generateMutation.isPending || sendMutation.isPending,
  };
}