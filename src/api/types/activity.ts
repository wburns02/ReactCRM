import { z } from "zod";
import { paginatedResponseSchema } from "./common.ts";

/**
 * Activity Type enum
 */
export const ActivityType = {
  CALL: "call",
  EMAIL: "email",
  SMS: "sms",
  NOTE: "note",
  MEETING: "meeting",
  TASK: "task",
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export const activityTypeSchema = z.enum([
  "call",
  "email",
  "sms",
  "note",
  "meeting",
  "task",
]);

/**
 * Activity schema - validates API responses
 */
export const activitySchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  activity_type: activityTypeSchema,
  description: z.string(),
  activity_date: z.string(),
  created_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Activity = z.infer<typeof activitySchema>;

/**
 * Paginated activity list response
 */
export const activityListResponseSchema =
  paginatedResponseSchema(activitySchema);
export type ActivityListResponse = z.infer<typeof activityListResponseSchema>;

/**
 * Activity filters for list queries
 */
export interface ActivityFilters {
  page?: number;
  page_size?: number;
  customer_id?: string;
  activity_type?: ActivityType;
}

/**
 * Create/update activity request
 */
export const activityFormSchema = z.object({
  customer_id: z.string().uuid(),
  activity_type: activityTypeSchema,
  description: z.string().min(1, "Description is required"),
  activity_date: z.string().optional(),
});

export type ActivityFormData = z.infer<typeof activityFormSchema>;

/**
 * Display labels for activity types
 */
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  call: "Phone Call",
  email: "Email",
  sms: "SMS",
  note: "Note",
  meeting: "Meeting",
  task: "Task",
};

/**
 * Icons for activity types
 */
export const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  call: "📞",
  email: "📧",
  sms: "💬",
  note: "📝",
  meeting: "👥",
  task: "✓",
};
