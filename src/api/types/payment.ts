import { z } from "zod";
import { paginatedResponseSchema } from "./common.ts";

/**
 * Payment Method enum
 */
export const paymentMethodSchema = z.enum([
  "card",
  "cash",
  "check",
  "payment_link",
  "bank_transfer",
  "other",
]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: "Card",
  cash: "Cash",
  check: "Check",
  payment_link: "Payment Link",
  bank_transfer: "Bank Transfer",
  other: "Other",
};

/**
 * Payment Status enum
 */
export const paymentStatusSchema = z.enum([
  "pending",
  "completed",
  "failed",
  "refunded",
]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending",
  completed: "Completed",
  failed: "Failed",
  refunded: "Refunded",
};

/**
 * Payment schema - validates API responses
 */
export const paymentSchema = z.object({
  id: z.string(),
  invoice_id: z.string().nullable().optional(),
  customer_id: z
    .union([z.string(), z.number()])
    .transform(String)
    .nullable()
    .optional(),
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
  amount: z.number(),
  payment_method: paymentMethodSchema,
  status: paymentStatusSchema,
  transaction_id: z.string().nullable().optional(),
  reference_number: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  payment_date: z.string(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type Payment = z.infer<typeof paymentSchema>;

/**
 * Paginated payment list response
 */
export const paymentListResponseSchema = paginatedResponseSchema(paymentSchema);
export type PaymentListResponse = z.infer<typeof paymentListResponseSchema>;

/**
 * Payment filters for list queries
 */
export interface PaymentFilters {
  page?: number;
  page_size?: number;
  status?: string;
  payment_method?: string;
  customer_id?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * Create/update payment request
 */
export const paymentFormSchema = z.object({
  invoice_id: z.string().optional(),
  customer_id: z.coerce.number().min(1, "Customer is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  payment_method: paymentMethodSchema,
  status: paymentStatusSchema.default("completed"),
  transaction_id: z.string().optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
  payment_date: z.string().min(1, "Payment date is required"),
});

export type PaymentFormData = z.infer<typeof paymentFormSchema>;
