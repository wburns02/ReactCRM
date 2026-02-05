import { z } from "zod";

// =============================================================================
// Clover Config
// =============================================================================

export const cloverConfigSchema = z.object({
  merchant_id: z.string(),
  merchant_name: z.string().nullable().optional(),
  environment: z.string(),
  is_configured: z.boolean(),
  rest_api_available: z.boolean().optional().default(false),
  ecommerce_available: z.boolean().optional().default(false),
});

export type CloverConfig = z.infer<typeof cloverConfigSchema>;

// =============================================================================
// Clover Merchant
// =============================================================================

export const cloverMerchantSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  owner: z.string().nullable().optional(),
  address: z.any().nullable().optional(),
  phone: z.string().nullable().optional(),
});

export type CloverMerchant = z.infer<typeof cloverMerchantSchema>;

// =============================================================================
// Clover Payment
// =============================================================================

export const cloverPaymentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  amount_dollars: z.number(),
  tip_amount: z.number().optional().default(0),
  tax_amount: z.number().optional().default(0),
  result: z.string().nullable().optional(),
  tender_label: z.string().optional().default("Unknown"),
  tender_id: z.string().nullable().optional(),
  order_id: z.string().nullable().optional(),
  employee_id: z.string().nullable().optional(),
  created_time: z.number().nullable().optional(),
  offline: z.boolean().optional().default(false),
});

export type CloverPayment = z.infer<typeof cloverPaymentSchema>;

export const cloverPaymentsResponseSchema = z.object({
  payments: z.array(cloverPaymentSchema),
  total: z.number(),
});

export type CloverPaymentsResponse = z.infer<typeof cloverPaymentsResponseSchema>;

// =============================================================================
// Clover Order
// =============================================================================

export const cloverLineItemSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  price: z.number().optional().default(0),
  price_dollars: z.number().optional().default(0),
});

export type CloverLineItem = z.infer<typeof cloverLineItemSchema>;

export const cloverOrderSchema = z.object({
  id: z.string(),
  total: z.number(),
  total_dollars: z.number(),
  state: z.string().nullable().optional(),
  payment_state: z.string().nullable().optional(),
  currency: z.string().optional().default("USD"),
  line_items: z.array(cloverLineItemSchema).optional().default([]),
  created_time: z.number().nullable().optional(),
  modified_time: z.number().nullable().optional(),
});

export type CloverOrder = z.infer<typeof cloverOrderSchema>;

export const cloverOrdersResponseSchema = z.object({
  orders: z.array(cloverOrderSchema),
  total: z.number(),
});

export type CloverOrdersResponse = z.infer<typeof cloverOrdersResponseSchema>;

// =============================================================================
// Clover Item (Service Catalog)
// =============================================================================

export const cloverItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  price_dollars: z.number(),
  price_type: z.string().optional().default("FIXED"),
  color_code: z.string().nullable().optional(),
  available: z.boolean().optional().default(true),
  hidden: z.boolean().optional().default(false),
});

export type CloverItem = z.infer<typeof cloverItemSchema>;

export const cloverItemsResponseSchema = z.object({
  items: z.array(cloverItemSchema),
  total: z.number(),
});

export type CloverItemsResponse = z.infer<typeof cloverItemsResponseSchema>;

// =============================================================================
// Clover Sync
// =============================================================================

export const cloverSyncResultSchema = z.object({
  synced: z.number(),
  skipped: z.number(),
  errors: z.number(),
  total_clover_payments: z.number(),
});

export type CloverSyncResult = z.infer<typeof cloverSyncResultSchema>;

// =============================================================================
// Clover Reconciliation
// =============================================================================

export const reconciliationEntrySchema = z.object({
  clover_id: z.string().optional(),
  crm_id: z.union([z.string(), z.number()]).optional(),
  amount_dollars: z.number(),
  result: z.string().optional(),
  tender: z.string().optional(),
  created_time: z.number().nullable().optional(),
  status: z.string().optional(),
  method: z.string().optional(),
});

export const cloverReconciliationSchema = z.object({
  matched: z.array(reconciliationEntrySchema),
  unmatched_clover: z.array(reconciliationEntrySchema),
  unmatched_crm: z.array(reconciliationEntrySchema),
  summary: z.object({
    total_clover_payments: z.number(),
    total_crm_payments: z.number(),
    matched_count: z.number(),
    unmatched_clover_count: z.number(),
    unmatched_crm_count: z.number(),
    clover_total_dollars: z.number(),
    crm_total_dollars: z.number(),
  }),
});

export type CloverReconciliation = z.infer<typeof cloverReconciliationSchema>;
