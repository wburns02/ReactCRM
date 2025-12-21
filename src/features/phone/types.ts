import { z } from 'zod';

/**
 * RingCentral Status
 */
export const rcStatusSchema = z.object({
  connected: z.boolean(),
  user_name: z.string().optional(),
  extension: z.string().optional(),
});

export type RCStatus = z.infer<typeof rcStatusSchema>;

/**
 * Call Direction
 */
export const callDirectionSchema = z.enum(['inbound', 'outbound']);
export type CallDirection = z.infer<typeof callDirectionSchema>;

/**
 * Call Record
 */
export const callRecordSchema = z.object({
  id: z.string(),
  direction: callDirectionSchema,
  from: z.string(),
  to: z.string(),
  duration: z.number(),
  started_at: z.string(),
  disposition: z.string().optional(),
  recording_url: z.string().optional(),
});

export type CallRecord = z.infer<typeof callRecordSchema>;

/**
 * Call Disposition Category
 */
export const dispositionCategorySchema = z.enum(['positive', 'neutral', 'negative']);
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
export const DISPOSITION_CATEGORY_LABELS: Record<DispositionCategory, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
};
