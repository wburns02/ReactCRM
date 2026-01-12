import { z } from "zod";
import { paginatedResponseSchema } from "./common.ts";

/**
 * Technician skills - matches backend skills array
 */
export const technicianSkillSchema = z.enum([
  "pumping",
  "maintenance",
  "inspection",
  "repair",
  "installation",
  "camera_inspection",
  "emergency_response",
]);
export type TechnicianSkill = z.infer<typeof technicianSkillSchema>;

export const TECHNICIAN_SKILL_LABELS: Record<TechnicianSkill, string> = {
  pumping: "Pumping",
  maintenance: "Maintenance",
  inspection: "Inspection",
  repair: "Repair",
  installation: "Installation",
  camera_inspection: "Camera Inspection",
  emergency_response: "Emergency Response",
};

/**
 * Technician schema - validates API responses
 */
export const technicianSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  full_name: z.string().optional(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  employee_id: z.string().nullable(),
  is_active: z.boolean(),
  // Home location
  home_region: z.string().nullable(),
  home_address: z.string().nullable(),
  home_city: z.string().nullable(),
  home_state: z.string().nullable(),
  home_postal_code: z.string().nullable(),
  home_latitude: z.number().nullable(),
  home_longitude: z.number().nullable(),
  // Skills
  skills: z.array(z.string()).nullable(),
  // Vehicle info
  assigned_vehicle: z.string().nullable(),
  vehicle_capacity_gallons: z.number().nullable(),
  // Licensing
  license_number: z.string().nullable(),
  license_expiry: z.string().nullable(),
  // Payroll
  hourly_rate: z.number().nullable(),
  // Notes
  notes: z.string().nullable(),
  // Timestamps
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type Technician = z.infer<typeof technicianSchema>;

/**
 * Paginated technician list response
 */
export const technicianListResponseSchema =
  paginatedResponseSchema(technicianSchema);
export type TechnicianListResponse = z.infer<
  typeof technicianListResponseSchema
>;

/**
 * Technician filters for list queries
 */
export interface TechnicianFilters {
  page?: number;
  page_size?: number;
  search?: string;
  active_only?: boolean;
}

/**
 * Create/update technician request
 */
export const technicianFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  employee_id: z.string().optional(),
  is_active: z.boolean().default(true),
  // Home location
  home_region: z.string().optional(),
  home_address: z.string().optional(),
  home_city: z.string().optional(),
  home_state: z.string().max(2, "Use 2-letter state code").optional(),
  home_postal_code: z.string().optional(),
  home_latitude: z.coerce.number().optional(),
  home_longitude: z.coerce.number().optional(),
  // Skills
  skills: z.array(technicianSkillSchema).optional(),
  // Vehicle info
  assigned_vehicle: z.string().optional(),
  vehicle_capacity_gallons: z.coerce.number().min(0).optional(),
  // Licensing
  license_number: z.string().optional(),
  license_expiry: z.string().optional(),
  // Payroll
  hourly_rate: z.coerce.number().min(0).optional(),
  // Notes
  notes: z.string().optional(),
});

export type TechnicianFormData = z.infer<typeof technicianFormSchema>;
