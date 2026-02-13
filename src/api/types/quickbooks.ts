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
