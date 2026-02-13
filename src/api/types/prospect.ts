import { z } from "zod";
import {
  prospectStageSchema,
  leadSourceSchema,
  paginatedResponseSchema,
  type ProspectStage,
  type LeadSource,
} from "./common.ts";

/**
 * Prospect schema - validates API responses
 *
 * Prospects share the backend CustomerResponse schema.
 * Fields are aligned with customer.ts patterns for consistency.
 */
export const prospectSchema = z.object({
  id: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  email: z.string().email().or(z.string()).nullable(),
  phone: z.string().nullable(),
  company_name: z.string().nullable().optional(), // Not in backend CustomerResponse
  address_line1: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postal_code: z.string().nullable(),
  prospect_stage: prospectStageSchema.or(z.string()).nullable(),
  lead_source: leadSourceSchema.or(z.string()).nullable(),
  estimated_value: z
    .union([z.number(), z.string().transform(Number)])
    .nullable(),
  assigned_sales_rep: z.string().nullable(),
  next_follow_up_date: z.string().nullable(),
  lead_notes: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type Prospect = z.infer<typeof prospectSchema>;

/**
 * Paginated prospect list response
 */
export const prospectListResponseSchema =
  paginatedResponseSchema(prospectSchema);
export type ProspectListResponse = z.infer<typeof prospectListResponseSchema>;

/**
 * Prospect filters for list queries
 */
export interface ProspectFilters {
  page?: number;
  page_size?: number;
  search?: string;
  stage?: ProspectStage;
  lead_source?: LeadSource;
}

/**
 * Create/update prospect request
 *
 * Note: prospect_stage is required at schema level.
 * Default value ('new_lead') should be set in form defaultValues.
 */
export const prospectFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  company_name: z.string().optional(),
  address_line1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2, "Use 2-letter state code").optional(),
  postal_code: z.string().optional(),
  prospect_stage: prospectStageSchema,
  lead_source: leadSourceSchema.optional(),
  estimated_value: z.coerce.number().min(0).optional(),
  assigned_sales_rep: z.string().optional(),
  next_follow_up_date: z.string().optional(),
  lead_notes: z.string().optional(),
});

export type ProspectFormData = z.infer<typeof prospectFormSchema>;

/**
 * Stage update request
 */
export const stageUpdateSchema = z.object({
  stage: prospectStageSchema,
});

export type StageUpdateData = z.infer<typeof stageUpdateSchema>;
