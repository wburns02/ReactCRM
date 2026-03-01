import { z } from "zod";

/**
 * Campaign status
 */
export const campaignStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "completed",
  "archived",
]);
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;

/**
 * Contact call status within a campaign
 */
export const contactCallStatusSchema = z.enum([
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
export type ContactCallStatus = z.infer<typeof contactCallStatusSchema>;

/**
 * Campaign contact - a person in a call list
 */
export const campaignContactSchema = z.object({
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
  contract_value: z.number().nullable(),
  days_since_expiry: z.number().nullable(),
  customer_type: z.string().nullable(),
  call_priority_label: z.string().nullable(),
  call_status: contactCallStatusSchema,
  call_attempts: z.number(),
  last_call_date: z.string().nullable(),
  last_call_duration: z.number().nullable(),
  last_disposition: z.string().nullable(),
  notes: z.string().nullable(),
  callback_date: z.string().nullable(),
  assigned_rep: z.string().nullable(),
  priority: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CampaignContact = z.infer<typeof campaignContactSchema>;

/**
 * Campaign
 */
export const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: campaignStatusSchema,
  source_file: z.string().nullable(),
  source_sheet: z.string().nullable(),
  total_contacts: z.number(),
  contacts_called: z.number(),
  contacts_connected: z.number(),
  contacts_interested: z.number(),
  contacts_completed: z.number(),
  assigned_reps: z.array(z.string()),
  created_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Campaign = z.infer<typeof campaignSchema>;

/**
 * Campaign stats summary
 */
export interface CampaignStats {
  total: number;
  pending: number;
  called: number;
  connected: number;
  interested: number;
  not_interested: number;
  voicemail: number;
  no_answer: number;
  callback_scheduled: number;
  completed: number;
  do_not_call: number;
  connect_rate: number;
  interest_rate: number;
}

/**
 * Auto-dial delay options (seconds)
 */
export type AutoDialDelay = 3 | 5 | 10;

/**
 * Sort order for callable contacts
 */
export type SortOrder = "smart" | "default";

/**
 * Smart scoring breakdown for a contact
 */
export interface ScoreBreakdown {
  contractUrgency: number;
  priorityLabel: number;
  customerType: number;
  callbackDue: number;
  attemptEfficiency: number;
  timeOfDay: number;
}

export interface ContactScore {
  contactId: string;
  total: number;
  breakdown: ScoreBreakdown;
}

/**
 * Campaign automation configuration
 */
export interface CampaignAutomationConfig {
  logActivity: boolean;
  sendSms: boolean;
  sendEmail: boolean;
  createProspect: boolean;
}

export const DEFAULT_AUTOMATION_CONFIG: CampaignAutomationConfig = {
  logActivity: true,
  sendSms: false,
  sendEmail: false,
  createProspect: false,
};

/**
 * Post-call automation result
 */
export interface AutomationResult {
  id: string;
  type: "activity" | "sms" | "email" | "prospect" | "priority";
  status: "success" | "error";
  label: string;
  timestamp: number;
}

/**
 * Analytics types
 */
export interface CampaignKPIs {
  callsPerHour: number;
  avgDuration: number;
  connectRate: number;
  interestRate: number;
  callbackConversionRate: number;
}

export interface DispositionBreakdownItem {
  name: string;
  value: number;
  color: string;
}

export interface CallsOverTimeItem {
  date: string;
  calls: number;
  connected: number;
}

export interface FunnelStep {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

export interface BestHourItem {
  hour: string;
  connectRate: number;
  totalCalls: number;
}

export interface CallLogEntry {
  id: string;
  contactName: string;
  phone: string;
  zone: string | null;
  status: ContactCallStatus;
  attempts: number;
  lastCallDate: string | null;
  duration: number | null;
  notes: string | null;
}

/**
 * Status labels and colors for display
 */
export const CAMPAIGN_STATUS_CONFIG: Record<
  CampaignStatus,
  { label: string; color: string }
> = {
  draft: { label: "Draft", color: "bg-zinc-100 text-zinc-700" },
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700" },
  paused: { label: "Paused", color: "bg-amber-100 text-amber-700" },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-700" },
  archived: { label: "Archived", color: "bg-zinc-100 text-zinc-500" },
};

export const ZONE_CONFIG: Record<string, { shortLabel: string; color: string }> = {
  "Zone 1 - Home Base": { shortLabel: "Z1", color: "bg-blue-100 text-blue-700" },
  "Zone 2 - Local":     { shortLabel: "Z2", color: "bg-green-100 text-green-700" },
  "Zone 3 - Regional":  { shortLabel: "Z3", color: "bg-amber-100 text-amber-700" },
  "Zone 4 - Extended":  { shortLabel: "Z4", color: "bg-purple-100 text-purple-700" },
  "Zone 5 - Outer":     { shortLabel: "Z5", color: "bg-red-100 text-red-700" },
};

export const CALL_STATUS_CONFIG: Record<
  ContactCallStatus,
  { label: string; color: string; icon: string }
> = {
  pending: { label: "Pending", color: "bg-zinc-100 text-zinc-600", icon: "⏳" },
  queued: { label: "Queued", color: "bg-blue-100 text-blue-600", icon: "📋" },
  calling: { label: "Calling", color: "bg-yellow-100 text-yellow-700", icon: "📞" },
  connected: { label: "Connected", color: "bg-emerald-100 text-emerald-700", icon: "✅" },
  voicemail: { label: "Voicemail", color: "bg-purple-100 text-purple-700", icon: "📩" },
  no_answer: { label: "No Answer", color: "bg-orange-100 text-orange-700", icon: "📵" },
  busy: { label: "Busy", color: "bg-red-100 text-red-600", icon: "🔴" },
  callback_scheduled: { label: "Callback", color: "bg-indigo-100 text-indigo-700", icon: "🔔" },
  interested: { label: "Interested", color: "bg-emerald-100 text-emerald-800", icon: "🔥" },
  not_interested: { label: "Not Interested", color: "bg-zinc-100 text-zinc-500", icon: "👎" },
  wrong_number: { label: "Wrong Number", color: "bg-red-100 text-red-500", icon: "❌" },
  do_not_call: { label: "Do Not Call", color: "bg-red-200 text-red-800", icon: "🚫" },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-700", icon: "✔️" },
  skipped: { label: "Skipped", color: "bg-zinc-100 text-zinc-400", icon: "⏭️" },
};
