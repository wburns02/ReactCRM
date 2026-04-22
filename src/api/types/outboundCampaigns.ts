import { z } from "zod";

export const callStatusSchema = z.enum([
  "pending",
  "queued",
  "calling",
  "connected",
  "voicemail",
  "no_answer",
  "busy",
  "callback_scheduled",
  "interested",
  "not_interested",
  "wrong_number",
  "do_not_call",
  "completed",
  "skipped",
]);
export type CallStatus = z.infer<typeof callStatusSchema>;

export const campaignStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "completed",
  "archived",
]);
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;

export const campaignCountersSchema = z.object({
  total: z.number(),
  pending: z.number(),
  called: z.number(),
  connected: z.number(),
  interested: z.number(),
  voicemail: z.number(),
  no_answer: z.number(),
  callback_scheduled: z.number(),
  completed: z.number(),
  do_not_call: z.number(),
});
export type CampaignCounters = z.infer<typeof campaignCountersSchema>;

export const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  source_file: z.string().nullable(),
  source_sheet: z.string().nullable(),
  created_by: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  counters: campaignCountersSchema,
});
export type Campaign = z.infer<typeof campaignSchema>;

export const campaignsResponseSchema = z.object({
  campaigns: z.array(campaignSchema),
});

export const contactSchema = z.object({
  id: z.string(),
  campaign_id: z.string(),
  account_number: z.string().nullable(),
  account_name: z.string(),
  company: z.string().nullable(),
  phone: z.string(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zip_code: z.string().nullable(),
  service_zone: z.string().nullable(),
  system_type: z.string().nullable(),
  contract_type: z.string().nullable(),
  contract_status: z.string().nullable(),
  contract_start: z.string().nullable(),
  contract_end: z.string().nullable(),
  contract_value: z.union([z.string(), z.number()]).nullable(),
  customer_type: z.string().nullable(),
  call_priority_label: z.string().nullable(),
  call_status: callStatusSchema,
  call_attempts: z.number(),
  last_call_date: z.string().nullable(),
  last_call_duration: z.number().nullable(),
  last_disposition: z.string().nullable(),
  notes: z.string().nullable(),
  callback_date: z.string().nullable(),
  assigned_rep: z.number().nullable(),
  priority: z.number(),
  opens: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Contact = z.infer<typeof contactSchema>;

export const contactsResponseSchema = z.object({
  contacts: z.array(contactSchema),
});

export const attemptSchema = z.object({
  id: z.string(),
  contact_id: z.string(),
  campaign_id: z.string(),
  rep_user_id: z.number().nullable(),
  dispositioned_at: z.string(),
  call_status: callStatusSchema,
  notes: z.string().nullable(),
  duration_sec: z.number().nullable(),
});
export type Attempt = z.infer<typeof attemptSchema>;

export const dispositionResponseSchema = z.object({
  contact: contactSchema,
  attempt: attemptSchema,
});
export type DispositionResponse = z.infer<typeof dispositionResponseSchema>;

export const callbackSchema = z.object({
  id: z.string(),
  contact_id: z.string(),
  campaign_id: z.string(),
  rep_user_id: z.number().nullable(),
  scheduled_for: z.string(),
  notes: z.string().nullable(),
  status: z.string(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
});
export type Callback = z.infer<typeof callbackSchema>;

export const callbacksResponseSchema = z.object({
  callbacks: z.array(callbackSchema),
});

export interface LocalMigrationPayload {
  campaigns: unknown[];
  contacts: Array<{
    id: string;
    campaign_id: string;
    account_name: string;
    phone: string;
    call_status: string;
    call_attempts: number;
    [k: string]: unknown;
  }>;
  callbacks: Array<{
    id?: string;
    contact_id: string;
    campaign_id?: string;
    scheduled_for: string;
    notes?: string | null;
    status?: string;
  }>;
}
