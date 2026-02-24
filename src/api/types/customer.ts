import { z } from "zod";
import {
  prospectStageSchema,
  leadSourceSchema,
  paginatedResponseSchema,
} from "./common.ts";

/**
 * Customer Type enum - matches backend CustomerType
 */
export const customerTypeSchema = z.enum([
  "residential",
  "commercial",
  "hoa",
  "municipal",
  "property_management",
]);
export type CustomerType = z.infer<typeof customerTypeSchema>;

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  residential: "Residential",
  commercial: "Commercial",
  hoa: "HOA",
  municipal: "Municipal",
  property_management: "Property Management",
};

/**
 * Customer schema - validates API responses
 * Note: Customer.id is integer (string in JSON), not UUID like Prospect
 */
export const customerSchema = z.object({
  id: z.string(), // UUID serialized as string
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address_line1: z.string().nullable(),
  address_line2: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postal_code: z.string().nullable(),
  // Backend Decimal may serialize as string — coerce to number
  latitude: z.union([z.number(), z.string().transform(Number)]).nullable(),
  longitude: z.union([z.number(), z.string().transform(Number)]).nullable(),
  default_payment_terms: z.string().nullable(),
  is_active: z.boolean(),
  is_archived: z.boolean().optional().default(false),
  // Prospect/Lead fields (Customer can also be a prospect)
  customer_type: z.string().nullable(), // Using string for flexibility
  prospect_stage: prospectStageSchema.or(z.string()).nullable(),
  lead_source: leadSourceSchema.or(z.string()).nullable(),
  estimated_value: z.union([z.number(), z.string().transform(Number)]).nullable(),
  assigned_sales_rep: z.string().nullable(),
  next_follow_up_date: z.string().nullable(),
  lead_notes: z.string().nullable(),
  // System information (for aerobic manufacturer-specific contract pricing)
  system_type: z.string().nullable(),
  manufacturer: z.string().nullable(),
  // External IDs
  quickbooks_customer_id: z.string().nullable(),
  hubspot_contact_id: z.string().nullable(),
  servicenow_ticket_ref: z.string().nullable(),
  // Timestamps
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type Customer = z.infer<typeof customerSchema>;

/**
 * Paginated customer list response
 */
export const customerListResponseSchema =
  paginatedResponseSchema(customerSchema);
export type CustomerListResponse = z.infer<typeof customerListResponseSchema>;

/**
 * Customer filters for list queries
 */
export interface CustomerFilters {
  page?: number;
  page_size?: number;
  search?: string;
  prospect_stage?: string;
  is_active?: boolean;
  is_archived?: boolean;
}

/**
 * Create/update customer request
 */
export const customerFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2, "Use 2-letter state code").optional(),
  postal_code: z.string().optional(),
  customer_type: customerTypeSchema.optional(),
  prospect_stage: prospectStageSchema.optional(),
  lead_source: leadSourceSchema.optional(),
  estimated_value: z.coerce.number().min(0).optional(),
  assigned_sales_rep: z.string().optional(),
  next_follow_up_date: z.string().optional(),
  lead_notes: z.string().optional(),
  is_active: z.boolean().default(true),
  system_type: z.string().optional(),
  manufacturer: z.string().optional(),
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;
