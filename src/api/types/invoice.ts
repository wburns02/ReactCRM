import { z } from "zod";
import { paginatedResponseSchema } from "./common.ts";

/**
 * Invoice Status enum
 * Backend PostgreSQL enum includes "partial" in addition to these.
 * Use .or(z.string()) for forward compatibility.
 */
export const invoiceStatusSchema = z.enum([
  "draft",
  "sent",
  "paid",
  "overdue",
  "void",
  "partial",
]);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
  partial: "Partial",
};

/**
 * Line Item schema
 * Line items are stored as JSON in the database.
 * The `id` field comes back as null (not undefined) from PostgreSQL JSON.
 */
export const lineItemSchema = z.object({
  id: z.string().nullable().optional(),
  service: z.string(),
  description: z.string().nullable().optional(),
  quantity: z.union([z.number(), z.string().transform(Number)]).default(0),
  rate: z.union([z.number(), z.string().transform(Number)]).default(0),
  amount: z.union([z.number(), z.string().transform(Number)]).default(0),
});

export type LineItem = z.infer<typeof lineItemSchema>;

/**
 * Invoice schema - validates API responses
 */
export const invoiceSchema = z.object({
  id: z.string(),
  invoice_number: z.string(),
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
  work_order_id: z.string().nullable().optional(),
  status: invoiceStatusSchema.or(z.string()),
  line_items: z.array(lineItemSchema).nullable().default([]),
  subtotal: z.union([z.number(), z.string().transform(Number)]).default(0),
  tax_rate: z.union([z.number(), z.string().transform(Number)]).default(0),
  tax: z.union([z.number(), z.string().transform(Number)]).default(0),
  total: z.union([z.number(), z.string().transform(Number)]).default(0),
  due_date: z.string().nullable(),
  paid_date: z.string().nullable(),
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type Invoice = z.infer<typeof invoiceSchema>;

/**
 * Paginated invoice list response
 */
export const invoiceListResponseSchema = paginatedResponseSchema(invoiceSchema);
export type InvoiceListResponse = z.infer<typeof invoiceListResponseSchema>;

/**
 * Invoice filters for list queries
 */
export interface InvoiceFilters {
  page?: number;
  page_size?: number;
  status?: string;
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string; // Search invoice number, customer name, email, phone, address
}

/**
 * Create/update invoice line item form data
 */
export const lineItemFormSchema = z.object({
  service: z.string().min(1, "Service is required"),
  description: z.string().optional(),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  rate: z.coerce.number().min(0, "Rate must be greater than or equal to 0"),
});

export type LineItemFormData = z.infer<typeof lineItemFormSchema>;

/**
 * Create/update invoice request
 */
export const invoiceFormSchema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  work_order_id: z.string().optional(),
  status: invoiceStatusSchema.default("draft"),
  line_items: z
    .array(lineItemFormSchema)
    .min(1, "At least one line item is required"),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;
