import { z } from 'zod';
import { paginatedResponseSchema } from './common.ts';

/**
 * Equipment status enum
 */
export const equipmentStatusSchema = z.enum([
  'available',
  'in_use',
  'maintenance',
  'retired',
]);
export type EquipmentStatus = z.infer<typeof equipmentStatusSchema>;

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  available: 'Available',
  in_use: 'In Use',
  maintenance: 'Maintenance',
  retired: 'Retired',
};

/**
 * Equipment schema - validates API responses
 */
export const equipmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  serial_number: z.string().nullable(),
  status: equipmentStatusSchema,
  assigned_to: z.string().nullable(), // technician_id
  last_maintenance: z.string().nullable(),
  next_maintenance: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type Equipment = z.infer<typeof equipmentSchema>;

/**
 * Paginated equipment list response
 */
export const equipmentListResponseSchema = paginatedResponseSchema(equipmentSchema);
export type EquipmentListResponse = z.infer<typeof equipmentListResponseSchema>;

/**
 * Equipment filters for list queries
 */
export interface EquipmentFilters {
  page?: number;
  page_size?: number;
  search?: string;
  status?: EquipmentStatus;
  assigned_to?: string;
}

/**
 * Create/update equipment request
 */
export const equipmentFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  serial_number: z.string().optional(),
  status: equipmentStatusSchema.default('available'),
  assigned_to: z.string().optional(),
  last_maintenance: z.string().optional(),
  next_maintenance: z.string().optional(),
  notes: z.string().optional(),
});

export type EquipmentFormData = z.infer<typeof equipmentFormSchema>;
