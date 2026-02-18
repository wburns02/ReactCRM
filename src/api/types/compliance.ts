import { z } from "zod";

/**
 * Certification item from GET /compliance/certifications
 */
export const certificationItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  certification_type: z.string(),
  certification_number: z.string().nullable().optional(),
  issuing_organization: z.string().nullable().optional(),
  technician_id: z.string().nullable().optional(),
  technician_name: z.string().nullable().optional(),
  issue_date: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  status: z.string(),
  requires_renewal: z.boolean().optional(),
  renewal_interval_months: z.number().nullable().optional(),
  training_hours: z.number().nullable().optional(),
  training_date: z.string().nullable().optional(),
  training_provider: z.string().nullable().optional(),
  document_url: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export type CertificationItem = z.infer<typeof certificationItemSchema>;

/**
 * License item from GET /compliance/licenses
 */
export const licenseItemSchema = z.object({
  id: z.string(),
  license_number: z.string(),
  license_type: z.string(),
  issuing_authority: z.string().nullable().optional(),
  issuing_state: z.string().nullable().optional(),
  holder_type: z.string(),
  holder_id: z.string().nullable().optional(),
  holder_name: z.string().nullable().optional(),
  issue_date: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  status: z.string(),
  renewal_reminder_sent: z.boolean().optional(),
  renewal_reminder_date: z.string().nullable().optional(),
  document_url: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export type LicenseItem = z.infer<typeof licenseItemSchema>;

/**
 * Paginated certification list response
 */
export const certificationListResponseSchema = z.object({
  items: z.array(certificationItemSchema),
  total: z.number(),
  page: z.number().optional(),
  page_size: z.number().optional(),
});

export type CertificationListResponse = z.infer<typeof certificationListResponseSchema>;

/**
 * Paginated license list response
 */
export const licenseListResponseSchema = z.object({
  items: z.array(licenseItemSchema),
  total: z.number(),
  page: z.number().optional(),
  page_size: z.number().optional(),
});

export type LicenseListResponse = z.infer<typeof licenseListResponseSchema>;
