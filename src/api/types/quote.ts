import { z } from "zod";
import { paginatedResponseSchema } from "./common.ts";
import { lineItemSchema, type LineItem } from "./invoice.ts";

/**
 * Quote Status enum
 */
export const quoteStatusSchema = z.enum([
  "draft",
  "sent",
  "accepted",
  "declined",
  "expired",
  "invoiced", // Terminal state after conversion to invoice
]);
export type QuoteStatus = z.infer<typeof quoteStatusSchema>;

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  invoiced: "Invoiced",
};

/**
 * Status stage order for progress bar visualization
 * Main flow: draft → sent → accepted → invoiced
 */
export const QUOTE_STAGE_ORDER = [
  "draft",
  "sent",
  "accepted",
  "invoiced",
] as const;

/**
 * Status metadata for UI components
 */
export interface QuoteStatusMeta {
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  icon: string;
  description: string;
}

export const QUOTE_STATUS_META: Record<QuoteStatus, QuoteStatusMeta> = {
  draft: {
    label: "Draft",
    color: "#6b7280",
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
    icon: "📝",
    description: "Estimate created, ready to send to customer",
  },
  sent: {
    label: "Sent",
    color: "#3b82f6",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    icon: "✉️",
    description: "Sent to customer, awaiting response",
  },
  accepted: {
    label: "Accepted",
    color: "#10b981",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    icon: "✅",
    description: "Customer accepted, ready to convert to invoice",
  },
  declined: {
    label: "Declined",
    color: "#ef4444",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    icon: "❌",
    description: "Customer declined this estimate",
  },
  expired: {
    label: "Expired",
    color: "#9ca3af",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    icon: "⏰",
    description: "Estimate validity period has passed",
  },
  invoiced: {
    label: "Invoiced",
    color: "#8b5cf6",
    bgClass: "bg-purple-100",
    textClass: "text-purple-700",
    icon: "💰",
    description: "Converted to invoice",
  },
};

/**
 * Quote schema - validates API responses
 */
export const quoteSchema = z.object({
  id: z.string(),
  quote_number: z.string(),
  customer_id: z.union([z.string(), z.number()]).transform(String),
  customer_name: z.string().nullable().optional(),
  customer: z
    .object({
      id: z.union([z.string(), z.number()]).transform(String),
      first_name: z.string(),
      last_name: z.string(),
      email: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  status: quoteStatusSchema,
  line_items: z.array(lineItemSchema),
  subtotal: z.number(),
  tax_rate: z.number().default(0),
  tax: z.number(),
  total: z.number(),
  valid_until: z.string().nullable(),
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type Quote = z.infer<typeof quoteSchema>;

/**
 * Paginated quote list response
 */
export const quoteListResponseSchema = paginatedResponseSchema(quoteSchema);
export type QuoteListResponse = z.infer<typeof quoteListResponseSchema>;

/**
 * Quote filters for list queries
 */
export interface QuoteFilters {
  page?: number;
  page_size?: number;
  status?: string;
  customer_id?: string;
}

/**
 * Create/update quote request
 */
export const quoteFormSchema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  status: quoteStatusSchema.default("draft"),
  line_items: z
    .array(
      z.object({
        service: z.string().min(1, "Service is required"),
        description: z.string().optional(),
        quantity: z.coerce
          .number()
          .min(0.01, "Quantity must be greater than 0"),
        rate: z.coerce
          .number()
          .min(0, "Rate must be greater than or equal to 0"),
      }),
    )
    .min(1, "At least one line item is required"),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  valid_until: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

export type QuoteFormData = z.infer<typeof quoteFormSchema>;

// Re-export LineItem type for convenience
export type { LineItem };
