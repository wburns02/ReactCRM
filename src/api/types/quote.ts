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
]);
export type QuoteStatus = z.infer<typeof quoteStatusSchema>;

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
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
  customer_id: z.coerce.number().min(1, "Customer is required"),
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
