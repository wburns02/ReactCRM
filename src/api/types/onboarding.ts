/**
 * Onboarding & Training Types
 * Setup wizard, tutorials, and help system
 */
import { z } from 'zod';

// ============================================
// Setup Wizard Types
// ============================================

export const setupStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
  is_required: z.boolean(),
  order: z.number(),
  category: z.enum(['import', 'configuration', 'integrations', 'team']),
  estimated_minutes: z.number(),
  completion_percentage: z.number().optional(),
});

export type SetupStep = z.infer<typeof setupStepSchema>;

export const onboardingProgressSchema = z.object({
  user_id: z.string(),
  organization_id: z.string(),
  overall_progress: z.number(), // 0-100
  steps: z.array(setupStepSchema),
  started_at: z.string(),
  completed_at: z.string().optional().nullable(),
  current_step_id: z.string().optional().nullable(),
  skip_count: z.number(),
});

export type OnboardingProgress = z.infer<typeof onboardingProgressSchema>;

export const importSourceSchema = z.enum([
  'csv',
  'quickbooks',
  'servicetitan',
  'housecall_pro',
  'jobber',
  'other_crm',
]);

export type ImportSource = z.infer<typeof importSourceSchema>;

export const importMappingSchema = z.object({
  source_field: z.string(),
  target_field: z.string(),
  transform: z.enum(['none', 'lowercase', 'uppercase', 'trim', 'date', 'number', 'phone']).optional(),
});

export type ImportMapping = z.infer<typeof importMappingSchema>;

export const importJobSchema = z.object({
  id: z.string(),
  source: importSourceSchema,
  entity_type: z.enum(['customers', 'technicians', 'work_orders', 'invoices', 'products']),
  status: z.enum(['pending', 'processing', 'validating', 'completed', 'failed']),
  file_name: z.string().optional().nullable(),
  total_records: z.number(),
  processed_records: z.number(),
  success_count: z.number(),
  error_count: z.number(),
  errors: z.array(z.object({
    row: z.number(),
    field: z.string(),
    message: z.string(),
  })),
  mappings: z.array(importMappingSchema),
  created_at: z.string(),
  completed_at: z.string().optional().nullable(),
});

export type ImportJob = z.infer<typeof importJobSchema>;

// ============================================
// In-App Training Types
// ============================================

export const tutorialSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  feature: z.string(), // Feature area (e.g., "work_orders", "scheduling")
  type: z.enum(['video', 'interactive', 'walkthrough', 'article']),
  duration_minutes: z.number(),
  thumbnail_url: z.string().optional().nullable(),
  video_url: z.string().optional().nullable(),
  content_url: z.string().optional().nullable(),
  steps: z.array(z.object({
    order: z.number(),
    title: z.string(),
    content: z.string(),
    target_selector: z.string().optional(), // For interactive tutorials
    action: z.enum(['click', 'type', 'observe', 'complete']).optional(),
  })).optional().nullable(),
  tags: z.array(z.string()),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  is_recommended: z.boolean(),
});

export type Tutorial = z.infer<typeof tutorialSchema>;

export const userTutorialProgressSchema = z.object({
  tutorial_id: z.string(),
  user_id: z.string(),
  status: z.enum(['not_started', 'in_progress', 'completed']),
  progress_percentage: z.number(),
  current_step: z.number().optional().nullable(),
  started_at: z.string().optional().nullable(),
  completed_at: z.string().optional().nullable(),
  time_spent_seconds: z.number(),
});

export type UserTutorialProgress = z.infer<typeof userTutorialProgressSchema>;

export const tooltipSchema = z.object({
  id: z.string(),
  target_selector: z.string(),
  title: z.string(),
  content: z.string(),
  position: z.enum(['top', 'bottom', 'left', 'right']),
  trigger: z.enum(['hover', 'click', 'focus', 'auto']),
  feature: z.string(),
  show_once: z.boolean(),
  is_active: z.boolean(),
});

export type Tooltip = z.infer<typeof tooltipSchema>;

// ============================================
// What's New / Release Notes
// ============================================

export const releaseNoteSchema = z.object({
  id: z.string(),
  version: z.string(),
  title: z.string(),
  summary: z.string(),
  content_html: z.string(),
  features: z.array(z.object({
    title: z.string(),
    description: z.string(),
    icon: z.string().optional(),
    link: z.string().optional(),
  })),
  improvements: z.array(z.string()),
  bug_fixes: z.array(z.string()),
  published_at: z.string(),
  is_major: z.boolean(),
});

export type ReleaseNote = z.infer<typeof releaseNoteSchema>;

// ============================================
// Help & Support Types
// ============================================

export const helpArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  content_html: z.string(),
  excerpt: z.string(),
  category: z.string(),
  subcategory: z.string().optional().nullable(),
  tags: z.array(z.string()),
  related_articles: z.array(z.string()), // Article IDs
  helpful_count: z.number(),
  not_helpful_count: z.number(),
  views: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type HelpArticle = z.infer<typeof helpArticleSchema>;

export const helpCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  icon: z.string(),
  article_count: z.number(),
  order: z.number(),
});

export type HelpCategory = z.infer<typeof helpCategorySchema>;

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.string(),
  sources: z.array(z.object({
    type: z.enum(['article', 'video', 'documentation']),
    title: z.string(),
    url: z.string(),
  })).optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const supportTicketSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  subject: z.string(),
  description: z.string(),
  status: z.enum(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  category: z.string(),
  assigned_to: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  resolved_at: z.string().optional().nullable(),
});

export type SupportTicket = z.infer<typeof supportTicketSchema>;

// ============================================
// Configuration Types
// ============================================

export interface ServiceTypeConfig {
  id?: string;
  name: string;
  description: string;
  default_duration_minutes: number;
  default_price: number;
  category: string;
  is_active: boolean;
}

export interface TechnicianConfig {
  id?: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  certifications: string[];
  schedule: {
    day: string;
    start: string;
    end: string;
  }[];
}
