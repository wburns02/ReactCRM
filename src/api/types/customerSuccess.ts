/**
 * Customer Success Platform Types
 *
 * Type definitions for the Enterprise Customer Success Platform.
 */

import { z } from 'zod';

// ============================================
// Health Score Types
// ============================================

export type HealthStatus = 'healthy' | 'at_risk' | 'critical' | 'churned';
export type ScoreTrend = 'improving' | 'stable' | 'declining';

export const healthScoreSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  overall_score: z.number().min(0).max(100),
  health_status: z.enum(['healthy', 'at_risk', 'critical', 'churned']).nullable(),

  // Component scores
  product_adoption_score: z.number().min(0).max(100).nullable(),
  engagement_score: z.number().min(0).max(100).nullable(),
  relationship_score: z.number().min(0).max(100).nullable(),
  financial_score: z.number().min(0).max(100).nullable(),
  support_score: z.number().min(0).max(100).nullable(),

  // Weights
  adoption_weight: z.number().default(30),
  engagement_weight: z.number().default(25),
  relationship_weight: z.number().default(15),
  financial_weight: z.number().default(20),
  support_weight: z.number().default(10),

  // Thresholds
  healthy_threshold: z.number().default(70),
  at_risk_threshold: z.number().default(40),
  critical_threshold: z.number().default(20),

  // Predictive
  churn_probability: z.number().min(0).max(1).nullable(),
  expansion_probability: z.number().min(0).max(1).nullable(),

  // Trend
  score_trend: z.enum(['improving', 'stable', 'declining']).nullable(),
  trend_percentage: z.number().nullable(),

  // Override
  is_manually_set: z.boolean().default(false),
  manual_override_reason: z.string().nullable(),

  // Component details
  adoption_details: z.record(z.string(), z.unknown()).nullable(),
  engagement_details: z.record(z.string(), z.unknown()).nullable(),
  relationship_details: z.record(z.string(), z.unknown()).nullable(),
  financial_details: z.record(z.string(), z.unknown()).nullable(),
  support_details: z.record(z.string(), z.unknown()).nullable(),

  // UI-friendly aliases
  status: z.enum(['healthy', 'at_risk', 'critical', 'churned']).nullable().optional(),
  trend: z.enum(['improving', 'stable', 'declining']).nullable().optional(),
  risk_factors: z.array(z.string()).nullable().optional(),
  opportunities: z.array(z.string()).nullable().optional(),

  // Timestamps
  calculated_at: z.string().nullable(),
  previous_score: z.number().nullable(),
  previous_score_date: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type HealthScore = z.infer<typeof healthScoreSchema>;

export const healthScoreListResponseSchema = z.object({
  items: z.array(healthScoreSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});

export type HealthScoreListResponse = z.infer<typeof healthScoreListResponseSchema>;

// ============================================
// Segment Types
// ============================================

export type SegmentType = 'static' | 'dynamic' | 'ai_generated';
export type RuleOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'is_null' | 'is_not_null' | 'between' | 'starts_with' | 'ends_with';

export interface SegmentRule {
  field: string;
  operator: RuleOperator;
  value?: unknown;
  value2?: unknown;
}

export interface SegmentRuleSet {
  logic: 'and' | 'or';
  rules: (SegmentRule | SegmentRuleSet)[];
}

export const segmentSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  segment_type: z.enum(['static', 'dynamic', 'ai_generated']),
  rules: z.unknown().nullable(),
  priority: z.number().default(0),
  is_active: z.boolean().default(true),
  auto_update: z.boolean().default(true),
  update_frequency_hours: z.number().default(24),

  // Actions
  on_entry_playbook_id: z.number().nullable(),
  on_entry_journey_id: z.number().nullable(),
  on_exit_playbook_id: z.number().nullable(),
  on_exit_journey_id: z.number().nullable(),

  // Metrics
  customer_count: z.number().default(0),
  total_arr: z.number().nullable(),
  avg_health_score: z.number().nullable(),
  churn_risk_count: z.number().nullable(),

  // UI
  color: z.string().nullable(),
  icon: z.string().nullable(),
  tags: z.array(z.string()).nullable(),

  // Timing
  last_evaluated_at: z.string().nullable(),
  next_evaluation_at: z.string().nullable(),

  // Ownership
  created_by_user_id: z.number().nullable(),
  owned_by_user_id: z.number().nullable(),

  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type Segment = z.infer<typeof segmentSchema>;

export const segmentListResponseSchema = z.object({
  items: z.array(segmentSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});

export type SegmentListResponse = z.infer<typeof segmentListResponseSchema>;

// ============================================
// Journey Types
// ============================================

export type JourneyStatus = 'draft' | 'active' | 'paused' | 'archived';
export type JourneyType = 'onboarding' | 'adoption' | 'retention' | 'expansion' | 'renewal' | 'win_back' | 'custom';
export type JourneyStepType = 'email' | 'task' | 'wait' | 'condition' | 'webhook' | 'human_touchpoint' | 'in_app_message' | 'sms' | 'notification' | 'update_field' | 'add_tag' | 'enroll_journey' | 'trigger_playbook';
export type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'exited' | 'failed';

export const journeyStepSchema = z.object({
  id: z.number(),
  journey_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  step_type: z.string(),
  step_order: z.number(),
  wait_duration_hours: z.number().nullable(),
  wait_until_time: z.string().nullable(),
  condition_rules: z.unknown().nullable(),
  true_next_step_id: z.number().nullable(),
  false_next_step_id: z.number().nullable(),
  action_config: z.unknown().nullable(),
  is_required: z.boolean().default(true),
  is_active: z.boolean().default(true),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type JourneyStep = z.infer<typeof journeyStepSchema>;

export const journeySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  journey_type: z.string(),
  status: z.enum(['draft', 'active', 'paused', 'archived']),
  trigger_segment_id: z.number().nullable(),
  trigger_event: z.string().nullable(),
  entry_criteria: z.unknown().nullable(),
  exit_criteria: z.unknown().nullable(),
  goal_criteria: z.unknown().nullable(),
  allow_re_enrollment: z.boolean().default(false),
  priority: z.number().default(0),

  // Metrics
  total_enrolled: z.number().default(0),
  active_enrolled: z.number().default(0),
  completed_count: z.number().default(0),
  goal_achieved_count: z.number().default(0),
  avg_completion_days: z.number().nullable(),
  conversion_rate: z.number().nullable(),

  // UI-friendly computed
  step_count: z.number().optional(),
  active_enrollments: z.number().optional(),
  trigger_type: z.string().optional(),

  // Steps
  steps: z.array(journeyStepSchema).default([]),

  // Ownership
  created_by_user_id: z.number().nullable(),
  owned_by_user_id: z.number().nullable(),

  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type Journey = z.infer<typeof journeySchema>;

export const journeyListResponseSchema = z.object({
  items: z.array(journeySchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});

export type JourneyListResponse = z.infer<typeof journeyListResponseSchema>;

export const journeyEnrollmentSchema = z.object({
  id: z.number(),
  journey_id: z.number(),
  customer_id: z.number(),
  status: z.enum(['active', 'paused', 'completed', 'exited', 'failed']),
  current_step_id: z.number().nullable(),
  current_step_order: z.number().default(0),
  steps_completed: z.number().default(0),
  steps_total: z.number().default(0),
  goal_achieved: z.boolean().default(false),
  goal_achieved_at: z.string().nullable(),
  enrolled_at: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  exited_at: z.string().nullable(),
  exit_reason: z.string().nullable(),
  health_score_at_start: z.number().nullable(),
  health_score_at_end: z.number().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type JourneyEnrollment = z.infer<typeof journeyEnrollmentSchema>;

// ============================================
// Playbook Types
// ============================================

export type PlaybookCategory = 'onboarding' | 'adoption' | 'renewal' | 'churn_risk' | 'expansion' | 'escalation' | 'qbr' | 'executive_sponsor' | 'champion_change' | 'implementation' | 'training' | 'custom' | 'risk_mitigation' | 'churn_prevention' | 'winback';
export type PlaybookTriggerType = 'manual' | 'health_threshold' | 'segment_entry' | 'event' | 'days_to_renewal' | 'scheduled';
export type PlaybookPriority = 'low' | 'medium' | 'high' | 'critical';
export type PlaybookExecStatus = 'active' | 'paused' | 'completed' | 'cancelled' | 'failed';
export type PlaybookOutcome = 'successful' | 'unsuccessful' | 'partial' | 'cancelled';

export const playbookStepSchema = z.object({
  id: z.number(),
  playbook_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  step_type: z.string(),
  step_order: z.number(),
  default_assignee_role: z.string().nullable(),
  days_from_start: z.number().default(0),
  due_days: z.number().nullable(),
  is_required: z.boolean().default(true),
  instructions: z.string().nullable(),
  talk_track: z.string().nullable(),
  is_active: z.boolean().default(true),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type PlaybookStep = z.infer<typeof playbookStepSchema>;

export const playbookSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  trigger_type: z.string(),
  trigger_health_threshold: z.number().nullable(),
  trigger_health_direction: z.string().nullable(),
  trigger_days_to_renewal: z.number().nullable(),
  trigger_event: z.string().nullable(),
  trigger_segment_id: z.number().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  is_active: z.boolean().default(true),
  auto_assign: z.boolean().default(true),
  estimated_hours: z.number().nullable(),
  target_completion_days: z.number().nullable(),
  success_criteria: z.unknown().nullable(),
  allow_parallel_execution: z.boolean().default(false),
  max_active_per_customer: z.number().default(1),
  cooldown_days: z.number().nullable(),

  // Metrics
  times_triggered: z.number().default(0),
  times_completed: z.number().default(0),
  times_successful: z.number().default(0),
  avg_completion_days: z.number().nullable(),
  success_rate: z.number().nullable(),

  // UI-friendly computed
  step_count: z.number().optional(),

  // Steps
  steps: z.array(playbookStepSchema).default([]),

  // Ownership
  created_by_user_id: z.number().nullable(),
  owned_by_user_id: z.number().nullable(),

  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type Playbook = z.infer<typeof playbookSchema>;

export const playbookListResponseSchema = z.object({
  items: z.array(playbookSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});

export type PlaybookListResponse = z.infer<typeof playbookListResponseSchema>;

export const playbookExecutionSchema = z.object({
  id: z.number(),
  playbook_id: z.number(),
  customer_id: z.number(),
  status: z.enum(['active', 'paused', 'completed', 'cancelled', 'failed']),
  current_step_order: z.number().default(1),
  steps_completed: z.number().default(0),
  steps_total: z.number().nullable(),
  assigned_to_user_id: z.number().nullable(),
  triggered_by: z.string().nullable(),
  trigger_reason: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  outcome: z.enum(['successful', 'unsuccessful', 'partial', 'cancelled']).nullable(),
  outcome_notes: z.string().nullable(),
  health_score_at_start: z.number().nullable(),
  health_score_at_end: z.number().nullable(),
  total_time_spent_minutes: z.number().default(0),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type PlaybookExecution = z.infer<typeof playbookExecutionSchema>;

// ============================================
// Task Types
// ============================================

export type TaskType = 'call' | 'email' | 'meeting' | 'internal' | 'review' | 'escalation' | 'follow_up' | 'documentation' | 'training' | 'product_demo' | 'qbr' | 'renewal' | 'custom' | 'check_in' | 'health_review' | 'renewal_prep' | 'expansion_opportunity' | 'risk_assessment' | 'qbr_prep';
export type TaskCategory = 'onboarding' | 'adoption' | 'retention' | 'expansion' | 'support' | 'relationship' | 'administrative';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked' | 'snoozed';
export type TaskOutcome = 'successful' | 'unsuccessful' | 'rescheduled' | 'no_response' | 'voicemail' | 'escalated' | 'cancelled' | 'not_applicable';

export const csTaskSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  task_type: z.string(),
  category: z.string().nullable(),

  // Assignment
  assigned_to_user_id: z.number().nullable(),
  assigned_to_role: z.string().nullable(),
  assigned_by_user_id: z.number().nullable(),
  assigned_at: z.string().nullable(),

  // Priority and status
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'blocked', 'snoozed']).default('pending'),

  // Timing
  due_date: z.string().nullable(),
  due_datetime: z.string().nullable(),
  reminder_at: z.string().nullable(),
  snoozed_until: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  cancelled_at: z.string().nullable(),

  // Outcome
  outcome: z.string().nullable(),
  outcome_notes: z.string().nullable(),

  // Origin
  playbook_execution_id: z.number().nullable(),
  playbook_step_id: z.number().nullable(),
  journey_enrollment_id: z.number().nullable(),
  journey_step_id: z.number().nullable(),
  source: z.string().nullable(),

  // Time tracking
  time_spent_minutes: z.number().default(0),
  estimated_minutes: z.number().nullable(),

  // Contact
  contact_name: z.string().nullable(),
  contact_email: z.string().nullable(),
  contact_phone: z.string().nullable(),
  contact_role: z.string().nullable(),

  // Instructions
  instructions: z.string().nullable(),
  talk_track: z.string().nullable(),
  agenda: z.string().nullable(),

  // Meeting
  scheduled_datetime: z.string().nullable(),
  meeting_link: z.string().nullable(),
  meeting_duration_minutes: z.number().nullable(),
  meeting_type: z.string().nullable(),

  // Metadata
  tags: z.array(z.string()).nullable(),

  // UI-friendly computed
  customer_name: z.string().nullable().optional(),

  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type CSTask = z.infer<typeof csTaskSchema>;

export const csTaskListResponseSchema = z.object({
  items: z.array(csTaskSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});

export type CSTaskListResponse = z.infer<typeof csTaskListResponseSchema>;

// ============================================
// Touchpoint Types
// ============================================

export type TouchpointType =
  | 'call' | 'email_sent' | 'email_received' | 'email_opened' | 'email_clicked' | 'email_replied'
  | 'call_outbound' | 'call_inbound' | 'call_missed' | 'voicemail'
  | 'meeting' | 'meeting_scheduled' | 'meeting_held' | 'meeting_cancelled' | 'meeting_no_show'
  | 'video_call' | 'chat' | 'sms_sent' | 'sms_received' | 'chat_session'
  | 'support_ticket' | 'support_resolved' | 'product_login' | 'feature_usage' | 'feature_adoption'
  | 'login' | 'milestone_achieved' | 'onboarding_step' | 'webinar_registered' | 'webinar_attended' | 'training_completed'
  | 'event_attended' | 'support_ticket_opened' | 'support_ticket_resolved' | 'support_escalation'
  | 'nps_response' | 'csat_response' | 'feature_request' | 'bug_report' | 'product_feedback'
  | 'survey_response' | 'review_posted'
  | 'qbr' | 'qbr_held' | 'renewal_discussion' | 'expansion_discussion'
  | 'contract_signed' | 'renewal' | 'upsell' | 'downgrade' | 'invoice_paid' | 'payment_issue'
  | 'invoice_sent' | 'payment_received' | 'payment_overdue'
  | 'churn_risk_identified' | 'health_score_change' | 'executive_sponsor_change' | 'stakeholder_change'
  | 'internal_note' | 'health_alert' | 'risk_flag'
  | 'in_app_message_sent' | 'in_app_message_clicked'
  | 'document_shared' | 'document_viewed'
  | 'referral_given' | 'case_study' | 'testimonial' | 'social_mention'
  | 'escalation' | 'executive_escalation' | 'product_launch' | 'integration_added' | 'api_usage'
  | 'referral_made' | 'custom';

export type TouchpointSentiment = 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';

export type TouchpointDirection = 'inbound' | 'outbound' | 'internal';
export type TouchpointChannel = 'email' | 'phone' | 'video' | 'in_app' | 'in_person' | 'chat' | 'sms' | 'social' | 'webinar' | 'event' | 'other';
export type SentimentLabel = 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';

export const touchpointSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  touchpoint_type: z.string(),
  subject: z.string().nullable(),
  summary: z.string().nullable(),
  description: z.string().nullable(),
  direction: z.string().nullable(),
  channel: z.string().nullable(),

  // Participants
  user_id: z.number().nullable(),
  user_role: z.string().nullable(),
  contact_name: z.string().nullable(),
  contact_email: z.string().nullable(),
  contact_role: z.string().nullable(),
  contact_is_champion: z.boolean().default(false),
  contact_is_executive: z.boolean().default(false),
  attendee_count: z.number().nullable(),

  // Sentiment
  sentiment_score: z.number().nullable(),
  sentiment_label: z.string().nullable(),
  sentiment_confidence: z.number().nullable(),

  // AI insights
  key_topics: z.array(z.string()).nullable(),
  action_items: z.array(z.string()).nullable(),
  risk_signals: z.array(z.string()).nullable(),
  expansion_signals: z.array(z.string()).nullable(),
  key_quotes: z.array(z.string()).nullable(),

  // Engagement
  engagement_score: z.number().nullable(),
  was_positive: z.boolean().nullable(),

  // Meeting/call
  duration_minutes: z.number().nullable(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  meeting_link: z.string().nullable(),
  recording_url: z.string().nullable(),

  // NPS/Survey
  nps_score: z.number().nullable(),
  csat_score: z.number().nullable(),

  // Related entities
  task_id: z.number().nullable(),
  journey_enrollment_id: z.number().nullable(),
  playbook_execution_id: z.number().nullable(),

  // UI-friendly aliases
  sentiment: z.enum(['very_positive', 'positive', 'neutral', 'negative', 'very_negative']).nullable().optional(),
  outcome: z.string().nullable().optional(),

  // Timestamps
  occurred_at: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type Touchpoint = z.infer<typeof touchpointSchema>;

export const touchpointListResponseSchema = z.object({
  items: z.array(touchpointSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});

export type TouchpointListResponse = z.infer<typeof touchpointListResponseSchema>;

// ============================================
// Dashboard Types
// ============================================

export interface CSOverview {
  health_distribution: Record<HealthStatus, number>;
  avg_health_score: number;
  total_at_risk: number;
  active_journey_enrollments: number;
  active_playbook_executions: number;
  open_tasks: number;
  overdue_tasks: number;
  recent_touchpoints_7d: number;
  active_segments: number;
}

export interface AtRiskCustomer {
  customer_id: number;
  overall_score: number;
  health_status: HealthStatus;
  churn_probability: number | null;
  score_trend: ScoreTrend | null;
}

export interface TaskSummary {
  total_open: number;
  overdue: number;
  due_today: number;
  upcoming: number;
  tasks: CSTask[];
}

// ============================================
// Form Data Types
// ============================================

export interface HealthScoreFormData {
  customer_id: number;
  overall_score?: number;
  health_status?: HealthStatus;
  product_adoption_score?: number;
  engagement_score?: number;
  relationship_score?: number;
  financial_score?: number;
  support_score?: number;
  is_manually_set?: boolean;
  manual_override_reason?: string;
}

export interface SegmentFormData {
  name: string;
  description?: string;
  segment_type: SegmentType;
  rules?: SegmentRuleSet;
  priority?: number;
  is_active?: boolean;
  color?: string;
  icon?: string;
  tags?: string[];
}

export interface JourneyFormData {
  name: string;
  description?: string;
  journey_type: JourneyType;
  status?: JourneyStatus;
  trigger_segment_id?: number;
  trigger_event?: string;
  entry_criteria?: Record<string, unknown>;
  allow_re_enrollment?: boolean;
  priority?: number;
}

export interface PlaybookFormData {
  name: string;
  description?: string;
  category: PlaybookCategory;
  trigger_type: PlaybookTriggerType;
  trigger_health_threshold?: number;
  trigger_health_direction?: 'below' | 'above';
  trigger_days_to_renewal?: number;
  trigger_event?: string;
  trigger_segment_id?: number;
  priority?: PlaybookPriority;
  is_active?: boolean;
  auto_assign?: boolean;
  estimated_hours?: number;
  target_completion_days?: number;
}

export interface CSTaskFormData {
  customer_id: number;
  title: string;
  description?: string;
  task_type: TaskType;
  category?: TaskCategory;
  priority?: TaskPriority;
  due_date?: string;
  assigned_to_user_id?: number;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  instructions?: string;
  talk_track?: string;
  tags?: string[];
}

export interface TouchpointFormData {
  customer_id: number;
  touchpoint_type: TouchpointType;
  subject?: string;
  summary?: string;
  description?: string;
  direction?: TouchpointDirection;
  channel?: TouchpointChannel;
  contact_name?: string;
  contact_email?: string;
  contact_role?: string;
  contact_is_champion?: boolean;
  contact_is_executive?: boolean;
  duration_minutes?: number;
  nps_score?: number;
  csat_score?: number;
  occurred_at?: string;
}

// ============================================
// Filter Types
// ============================================

export interface HealthScoreFilters {
  page?: number;
  page_size?: number;
  health_status?: HealthStatus;
  min_score?: number;
  max_score?: number;
  trend?: ScoreTrend;
}

export interface SegmentFilters {
  page?: number;
  page_size?: number;
  segment_type?: SegmentType;
  is_active?: boolean;
  search?: string;
}

export interface JourneyFilters {
  page?: number;
  page_size?: number;
  status?: JourneyStatus;
  journey_type?: JourneyType;
  search?: string;
}

export interface PlaybookFilters {
  page?: number;
  page_size?: number;
  category?: PlaybookCategory;
  trigger_type?: PlaybookTriggerType;
  is_active?: boolean;
  search?: string;
}

export interface CSTaskFilters {
  page?: number;
  page_size?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  task_type?: TaskType;
  category?: TaskCategory;
  assigned_to_user_id?: number;
  customer_id?: number;
  due_before?: string;
  due_after?: string;
  search?: string;
  my_tasks?: boolean;
}

export interface TouchpointFilters {
  page?: number;
  page_size?: number;
  customer_id?: number;
  touchpoint_type?: TouchpointType;
  channel?: TouchpointChannel;
  direction?: TouchpointDirection;
  sentiment_label?: SentimentLabel;
  user_id?: number;
  start_date?: string;
  end_date?: string;
}
