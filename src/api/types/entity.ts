import { z } from "zod";

export const companyEntitySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  short_code: z.string().nullable(),
  tax_id: z.string().nullable().optional(),
  address_line1: z.string().nullable().optional(),
  address_line2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  invoice_prefix: z.string().nullable().optional(),
  is_active: z.boolean(),
  is_default: z.boolean(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export type CompanyEntity = z.infer<typeof companyEntitySchema>;

export const companyEntityListSchema = z.array(companyEntitySchema);

export const companyEntityCreateSchema = z.object({
  name: z.string().min(1),
  short_code: z.string().min(1).max(10).optional(),
  tax_id: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  logo_url: z.string().url().optional(),
  invoice_prefix: z.string().max(10).optional(),
  is_default: z.boolean().optional(),
});

export type CompanyEntityCreate = z.infer<typeof companyEntityCreateSchema>;
