import { z } from "zod";

/**
 * RingCentral Status
 */
export const rcStatusSchema = z.object({
  connected: z.boolean(),
  configured: z.boolean().optional(),
  account_id: z.number().optional(),
  account_name: z.string().nullable().optional(),
  message: z.string().optional(),
  extension: z.string().nullable().optional(),
  user_name: z.string().nullable().optional(),
});

export type RCStatus = z.infer<typeof rcStatusSchema>;

/**
 * Call Direction
 */
export const callDirectionSchema = z.enum(["inbound", "outbound"]);
export type CallDirection = z.infer<typeof callDirectionSchema>;

/**
 * Call Record - matches backend CallLog response
 */
export const callRecordSchema = z.object({
  id: z.string(),
  rc_call_id: z.string().nullable().optional(),
  from_number: z.string(),
  to_number: z.string(),
  from_name: z.string().nullable().optional(),
  to_name: z.string().nullable().optional(),
  direction: z.string(),
  status: z.string(),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  duration_seconds: z.number().nullable().optional(),
  has_recording: z.boolean().optional(),
  recording_url: z.string().nullable().optional(),
  transcription: z.string().nullable().optional(),
  ai_summary: z.string().nullable().optional(),
  sentiment: z.string().nullable().optional(),
  sentiment_score: z.number().nullable().optional(),
  customer_id: z.string().nullable().optional(),
  contact_name: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  disposition: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

export type CallRecord = z.infer<typeof callRecordSchema>;

/**
 * Paginated call list response
 */
export const callListResponseSchema = z.object({
  items: z.array(callRecordSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});

export type CallListResponse = z.infer<typeof callListResponseSchema>;

/**
 * Call Disposition Category
 */
export const dispositionCategorySchema = z.enum([
  "positive",
  "neutral",
  "negative",
]);
export type DispositionCategory = z.infer<typeof dispositionCategorySchema>;

/**
 * Call Disposition
 */
export const dispositionSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: dispositionCategorySchema,
});

export type Disposition = z.infer<typeof dispositionSchema>;

/**
 * Initiate Call Request
 */
export interface InitiateCallRequest {
  to_number: string;
  from_number?: string;
  customer_id?: string;
  prospect_id?: string;
}

/**
 * Log Disposition Request
 */
export interface LogDispositionRequest {
  call_id: string;
  disposition_id: string;
  notes?: string;
}

/**
 * Disposition labels for display
 */
export const DISPOSITION_CATEGORY_LABELS: Record<DispositionCategory, string> =
  {
    positive: "Positive",
    neutral: "Neutral",
    negative: "Negative",
  };
