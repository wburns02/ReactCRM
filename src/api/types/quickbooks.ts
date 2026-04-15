import { z } from "zod";

/**
 * QuickBooks Online integration types
 */

export const qboConnectionStatusSchema = z.object({
  connected: z.boolean(),
  company_name: z.string().nullable().optional(),
  company_id: z.string().nullable().optional(),
  realm_id: z.string().nullable().optional(),
  last_sync: z.string().nullable().optional(),
  connected_at: z.string().nullable().optional(),
  connected_by: z.string().nullable().optional(),
  token_expired: z.boolean().nullable().optional(),
  message: z.string().nullable().optional(),
});

export const qboAuthURLSchema = z.object({
  auth_url: z.string(),
  state: z.string(),
});

export const qboSyncResultSchema = z.object({
  entity_type: z.string(),
  synced: z.number(),
  created: z.number(),
  updated: z.number(),
  errors: z.number(),
  error_messages: z.array(z.string()).default([]),
});

export const qboSettingsSchema = z.object({
  auto_sync_customers: z.boolean(),
  auto_sync_invoices: z.boolean(),
  auto_sync_payments: z.boolean(),
  sync_interval_minutes: z.number(),
  default_income_account: z.string().nullable().optional(),
  default_payment_account: z.string().nullable().optional(),
  client_id_configured: z.boolean().optional().default(false),
  redirect_uri: z.string().optional().default(""),
});

export type QBOConnectionStatus = z.infer<typeof qboConnectionStatusSchema>;
export type QBOAuthURL = z.infer<typeof qboAuthURLSchema>;
export type QBOSyncResult = z.infer<typeof qboSyncResultSchema>;
export type QBOSettings = z.infer<typeof qboSettingsSchema>;

// ── GoPayment parallel integration ──────────────────────────

export const qbPullSummarySchema = z.object({
  run_id: z.string(),
  transactions_fetched: z.number(),
  transactions_matched: z.number(),
  transactions_unmatched: z.number(),
  error_message: z.string().nullable().optional(),
  run_started_at: z.string(),
  run_completed_at: z.string(),
});
export type QBPullSummary = z.infer<typeof qbPullSummarySchema>;

export const qbSyncRunSchema = z.object({
  id: z.string(),
  run_started_at: z.string().nullable(),
  run_completed_at: z.string().nullable(),
  transactions_fetched: z.number(),
  transactions_matched: z.number(),
  transactions_unmatched: z.number(),
  error_message: z.string().nullable().optional(),
  triggered_by: z.string().nullable().optional(),
});
export const qbSyncLogSchema = z.object({
  runs: z.array(qbSyncRunSchema),
  count: z.number(),
});
export type QBSyncRun = z.infer<typeof qbSyncRunSchema>;

export const qbUnmatchedPaymentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  external_txn_id: z.string().nullable().optional(),
  reference_code: z.string().nullable().optional(),
  payment_date: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
});
export const qbUnmatchedListSchema = z.object({
  payments: z.array(qbUnmatchedPaymentSchema),
  count: z.number(),
});
export type QBUnmatchedPayment = z.infer<typeof qbUnmatchedPaymentSchema>;

export const qbReferenceCodeSchema = z.object({
  invoice_id: z.string(),
  reference_code: z.string(),
  amount: z.number(),
  instructions: z.string(),
});
export type QBReferenceCode = z.infer<typeof qbReferenceCodeSchema>;

export const qbPrimaryProcessorSchema = z.object({
  primary_payment_processor: z.enum(["clover", "quickbooks_gopayment"]),
});
export type QBPrimaryProcessor = z.infer<typeof qbPrimaryProcessorSchema>;
