/** Relationship stages for the realtor pipeline */
export type RealtorStage = "cold" | "introd" | "warm" | "active_referrer";

export const REALTOR_STAGE_LABELS: Record<RealtorStage, string> = {
  cold: "Cold",
  introd: "Intro'd",
  warm: "Warm",
  active_referrer: "Active Referrer",
};

export const REALTOR_STAGE_COLORS: Record<RealtorStage, string> = {
  cold: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  introd: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  warm: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  active_referrer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
};

export const REALTOR_STAGES: RealtorStage[] = ["cold", "introd", "warm", "active_referrer"];

/** Disposition codes for realtor calls */
export type RealtorDisposition =
  | "no_answer"
  | "left_voicemail"
  | "callback_scheduled"
  | "intro_complete"
  | "one_pager_sent"
  | "not_interested"
  | "has_inspector"
  | "wants_quote"
  | "referral_received"
  | "do_not_call"
  | "wrong_number";

export const REALTOR_DISPOSITION_LABELS: Record<RealtorDisposition, string> = {
  no_answer: "No Answer",
  left_voicemail: "Left Voicemail",
  callback_scheduled: "Callback Scheduled",
  intro_complete: "Intro Complete",
  one_pager_sent: "One-Pager Sent",
  not_interested: "Not Interested",
  has_inspector: "Has Inspector",
  wants_quote: "Wants Quote",
  referral_received: "Referral Received",
  do_not_call: "Do Not Call",
  wrong_number: "Wrong Number",
};

export const REALTOR_DISPOSITION_ICONS: Record<RealtorDisposition, string> = {
  no_answer: "📵",
  left_voicemail: "📨",
  callback_scheduled: "📅",
  intro_complete: "🤝",
  one_pager_sent: "📄",
  not_interested: "👎",
  has_inspector: "🔧",
  wants_quote: "💰",
  referral_received: "🎉",
  do_not_call: "🚫",
  wrong_number: "❌",
};

/** Preferred contact method */
export type PreferredContact = "call" | "text" | "email";

/** A realtor agent in the pipeline */
export interface RealtorAgent {
  id: string;

  // Identity
  first_name: string;
  last_name: string;
  brokerage: string | null;
  license_number: string | null;

  // Contact info
  phone: string;
  email: string | null;
  cell: string | null;
  preferred_contact: PreferredContact;

  // Location
  coverage_area: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;

  // Relationship
  stage: RealtorStage;
  current_inspector: string | null;
  relationship_notes: string | null;

  // Call tracking
  call_attempts: number;
  last_call_date: string | null;
  last_call_duration: number | null;
  last_disposition: RealtorDisposition | null;
  next_follow_up: string | null;

  // Referral tracking
  total_referrals: number;
  total_revenue: number;
  last_referral_date: string | null;

  // Documents
  one_pager_sent: boolean;
  one_pager_sent_date: string | null;

  // Meta
  assigned_rep: string | null;
  priority: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** A referral from an agent */
export interface Referral {
  id: string;
  realtor_id: string;

  // Property/job info
  property_address: string;
  homeowner_name: string | null;
  service_type: "inspection" | "pumpout" | "maintenance" | "repair";

  // Financial
  invoice_amount: number | null;
  status: "pending" | "scheduled" | "completed" | "paid";

  // Dates
  referred_date: string;
  completed_date: string | null;

  notes: string | null;
}

/** Stats for the pipeline overview bar */
export interface RealtorPipelineStats {
  total_agents: number;
  cold: number;
  introd: number;
  warm: number;
  active_referrer: number;
  referrals_this_month: number;
  revenue_this_month: number;
  agents_due_followup: number;
}
