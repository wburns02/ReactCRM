import { z } from 'zod';

/**
 * Email Marketing Types
 * Matches backend tiers and data structures
 */

// Subscription tiers
export type SubscriptionTier = 'none' | 'manual' | 'ai_suggested' | 'autonomous';

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  none: 'No Email Marketing',
  manual: 'Manual Marketing',
  ai_suggested: 'AI-Suggested Marketing',
  autonomous: 'Fully Autonomous Marketing',
};

export const TIER_PRICES: Record<SubscriptionTier, number> = {
  none: 0,
  manual: 49,
  ai_suggested: 99,
  autonomous: 199,
};

// Subscription schema
export const subscriptionSchema = z.object({
  tier: z.enum(['none', 'manual', 'ai_suggested', 'autonomous']),
  monthly_price: z.number().nullable().optional(),
  started_at: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  is_active: z.boolean(),
});
export type Subscription = z.infer<typeof subscriptionSchema>;

// Business profile schema
export const businessProfileSchema = z.object({
  business_name: z.string().nullable().optional(),
  tagline: z.string().nullable().optional(),
  years_in_business: z.number().nullable().optional(),
  service_areas: z.array(z.string()).nullable().optional(),
  brand_voice: z.string().nullable().optional(),
  onboarding_completed: z.boolean().optional(),
  ai_autonomy_level: z.string().nullable().optional(),
  monthly_email_budget: z.number().nullable().optional(),
  customer_email_limit: z.number().nullable().optional(),
});
export type BusinessProfile = z.infer<typeof businessProfileSchema>;

// Template schema
export const emailTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().nullable().optional(),
  subject_template: z.string(),
  body_html: z.string(),
  body_text: z.string().nullable().optional(),
  variables: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    example: z.string().optional(),
  })).nullable().optional(),
  is_system: z.boolean().optional(),
  is_active: z.boolean().optional(),
  created_at: z.string().nullable().optional(),
});
export type EmailTemplate = z.infer<typeof emailTemplateSchema>;

export const TEMPLATE_CATEGORIES = [
  { value: 'reminder', label: 'Service Reminder' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'referral', label: 'Referral' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'win_back', label: 'Win-Back' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'custom', label: 'Custom' },
];

// Segment schema
export const segmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  count: z.number(),
  criteria: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type Segment = z.infer<typeof segmentSchema>;

// Campaign schema
export const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  template_id: z.string().nullable().optional(),
  segment: z.string().nullable().optional(),
  status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'canceled']),
  scheduled_at: z.string().nullable().optional(),
  sent_at: z.string().nullable().optional(),
  stats: z.object({
    total_sent: z.number(),
    delivered: z.number(),
    opened: z.number(),
    clicked: z.number(),
    bounced: z.number(),
    unsubscribed: z.number(),
  }).nullable().optional(),
  created_at: z.string().nullable().optional(),
});
export type Campaign = z.infer<typeof campaignSchema>;

export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  sending: 'Sending',
  sent: 'Sent',
  canceled: 'Canceled',
};

// AI Suggestion schema
export const aiSuggestionSchema = z.object({
  id: z.string(),
  suggestion_type: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  target_segment: z.string().nullable().optional(),
  estimated_recipients: z.number().nullable().optional(),
  estimated_revenue: z.number().nullable().optional(),
  priority_score: z.number().nullable().optional(),
  ai_rationale: z.string().nullable().optional(),
  suggested_subject: z.string().nullable().optional(),
  suggested_body: z.string().nullable().optional(),
  suggested_send_date: z.string().nullable().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'sent']),
  created_at: z.string().nullable().optional(),
});
export type AISuggestion = z.infer<typeof aiSuggestionSchema>;

// Analytics schema
export const analyticsSchema = z.object({
  daily_stats: z.array(z.object({
    date: z.string(),
    sent: z.number(),
    delivered: z.number(),
    opened: z.number(),
    clicked: z.number(),
  })).optional(),
  top_campaigns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    sent: z.number(),
    open_rate: z.number(),
    click_rate: z.number(),
  })).optional(),
  segment_performance: z.array(z.object({
    segment: z.string(),
    sent: z.number(),
    open_rate: z.number(),
    click_rate: z.number(),
  })).optional(),
  totals: z.object({
    total_sent: z.number(),
    total_delivered: z.number(),
    total_opened: z.number(),
    total_clicked: z.number(),
    open_rate: z.number(),
    click_rate: z.number(),
  }).optional(),
});
export type Analytics = z.infer<typeof analyticsSchema>;

// Onboarding question schema
export const onboardingQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(['text', 'number', 'select', 'multi_select', 'multi_text', 'boolean']),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
  options: z.array(z.union([
    z.string(),
    z.object({ value: z.union([z.string(), z.number(), z.boolean()]), label: z.string() }),
  ])).optional(),
  condition: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type OnboardingQuestion = z.infer<typeof onboardingQuestionSchema>;

// Form schemas for creating/updating
export const templateFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().optional(),
  subject_template: z.string().min(1, 'Subject is required'),
  body_html: z.string().min(1, 'Body is required'),
  body_text: z.string().optional(),
});
export type TemplateFormData = z.infer<typeof templateFormSchema>;

export const campaignFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  template_id: z.string().optional(),
  segment: z.string().optional(),
  scheduled_at: z.string().optional(),
});
export type CampaignFormData = z.infer<typeof campaignFormSchema>;
