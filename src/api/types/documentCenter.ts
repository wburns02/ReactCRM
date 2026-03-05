import { z } from "zod";
import { paginatedResponseSchema } from "./common.ts";

/**
 * Document Center types for PDF generation, email delivery, and management
 * This is separate from document.ts which handles file attachments
 */

// Document status enum - matches backend
export const DocumentStatus = {
  DRAFT: "draft",
  SENT: "sent",
  VIEWED: "viewed",
  SIGNED: "signed",
  EXPIRED: "expired",
} as const;

export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

// Document type enum - matches backend
export const DocumentType = {
  INVOICE: "invoice",
  QUOTE: "quote",
  WORK_ORDER: "work_order",
  INSPECTION_REPORT: "inspection_report",
} as const;

export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

/**
 * Document metadata schema (no PDF data)
 */
export const documentMetaSchema = z.object({
  id: z.string().uuid(),
  document_type: z.enum(["invoice", "quote", "work_order", "inspection_report"]),
  reference_id: z.string().uuid().nullable(),
  reference_number: z.string().nullable(),
  customer_id: z.string().uuid().nullable(),
  customer_name: z.string().nullable(),
  file_name: z.string().nullable(),
  file_size: z.number().nullable(),
  status: z.enum(["draft", "sent", "viewed", "signed", "expired"]),
  sent_at: z.string().datetime().nullable(),
  sent_to: z.string().email().nullable(),
  viewed_at: z.string().datetime().nullable(),
  created_by: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
});

export type DocumentMeta = z.infer<typeof documentMetaSchema>;

/**
 * Paginated document list response
 */
export const documentListResponseSchema = z.object({
  items: z.array(documentMetaSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  has_more: z.boolean(),
});

export type DocumentListResponse = z.infer<typeof documentListResponseSchema>;

/**
 * Document statistics for dashboard
 */
export const documentStatsSchema = z.object({
  total_documents: z.number(),
  sent_this_month: z.number(),
  viewed_count: z.number(),
  pending_drafts: z.number(),
  monthly_counts: z.array(z.object({
    month: z.string(), // "2026-01"
    total: z.number(),
    invoices: z.number(),
    quotes: z.number(),
    work_orders: z.number(),
    inspections: z.number(),
  })),
});

export type DocumentStats = z.infer<typeof documentStatsSchema>;

/**
 * Generate document request
 */
export const generateRequestSchema = z.object({
  document_type: z.enum(["invoice", "quote", "work_order", "inspection_report"]),
  reference_id: z.string().uuid(),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

/**
 * Batch generate request
 */
export const batchGenerateRequestSchema = z.object({
  document_type: z.enum(["invoice", "quote", "work_order", "inspection_report"]),
  reference_ids: z.array(z.string().uuid()),
});

export type BatchGenerateRequest = z.infer<typeof batchGenerateRequestSchema>;

/**
 * Send email request
 */
export const sendRequestSchema = z.object({
  email: z.string().email(),
  subject: z.string().optional(),
  message: z.string().optional(),
});

export type SendRequest = z.infer<typeof sendRequestSchema>;

/**
 * Document list filters
 */
export interface DocumentFilters {
  page?: number;
  page_size?: number;
  document_type?: DocumentType;
  customer_id?: string;
  status?: DocumentStatus;
  search?: string; // reference_number or file_name
  date_from?: string; // ISO date
  date_to?: string; // ISO date
}

/**
 * Source record selection for generation
 */
export interface SourceRecord {
  id: string;
  reference_number: string;
  customer_name?: string;
  date?: string;
  amount?: number;
  status?: string;
}

/**
 * Batch generation result
 */
export const batchGenerateResponseSchema = z.object({
  generated: z.array(documentMetaSchema),
  errors: z.array(z.object({
    reference_id: z.string(),
    error: z.string(),
  })),
  total_requested: z.number(),
  total_generated: z.number(),
  total_errors: z.number(),
});

export type BatchGenerateResponse = z.infer<typeof batchGenerateResponseSchema>;

/**
 * Document type display information
 */
export const DOCUMENT_TYPE_INFO = {
  [DocumentType.INVOICE]: {
    label: "Invoice",
    icon: "📄",
    color: "#3b82f6",
  },
  [DocumentType.QUOTE]: {
    label: "Quote",
    icon: "📝",
    color: "#8b5cf6",
  },
  [DocumentType.WORK_ORDER]: {
    label: "Work Order",
    icon: "🔧",
    color: "#f59e0b",
  },
  [DocumentType.INSPECTION_REPORT]: {
    label: "Inspection Report",
    icon: "🔍",
    color: "#10b981",
  },
} as const;

/**
 * Status badge information
 */
export const STATUS_INFO = {
  [DocumentStatus.DRAFT]: {
    label: "Draft",
    color: "gray",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
  },
  [DocumentStatus.SENT]: {
    label: "Sent",
    color: "blue",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
  },
  [DocumentStatus.VIEWED]: {
    label: "Viewed",
    color: "green",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
  },
  [DocumentStatus.SIGNED]: {
    label: "Signed",
    color: "purple",
    bgColor: "bg-purple-100",
    textColor: "text-purple-700",
  },
  [DocumentStatus.EXPIRED]: {
    label: "Expired",
    color: "red",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
  },
} as const;

/**
 * Helper to format file size
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return "0 KB";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Helper to calculate open rate percentage
 */
export function calculateOpenRate(viewed: number, sent: number): number {
  if (sent === 0) return 0;
  return Math.round((viewed / sent) * 100);
}