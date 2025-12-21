import { z } from 'zod';
import { paginatedResponseSchema } from './common.ts';

/**
 * Work Order Status enum - matches backend WorkOrderStatus
 */
export const workOrderStatusSchema = z.enum([
  'draft',
  'scheduled',
  'confirmed',
  'enroute',
  'on_site',
  'in_progress',
  'completed',
  'canceled',
  'requires_followup',
]);
export type WorkOrderStatus = z.infer<typeof workOrderStatusSchema>;

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  enroute: 'En Route',
  on_site: 'On Site',
  in_progress: 'In Progress',
  completed: 'Completed',
  canceled: 'Canceled',
  requires_followup: 'Requires Follow-up',
};

/**
 * Job/Service Type enum - matches backend ServiceType
 */
export const jobTypeSchema = z.enum([
  'pumping',
  'inspection',
  'repair',
  'installation',
  'emergency',
  'maintenance',
  'grease_trap',
  'camera_inspection',
]);
export type JobType = z.infer<typeof jobTypeSchema>;

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  pumping: 'Pumping',
  inspection: 'Inspection',
  repair: 'Repair',
  installation: 'Installation',
  emergency: 'Emergency',
  maintenance: 'Maintenance',
  grease_trap: 'Grease Trap',
  camera_inspection: 'Camera Inspection',
};

/**
 * Priority enum - matches backend Priority
 */
export const prioritySchema = z.enum([
  'low',
  'normal',
  'high',
  'urgent',
  'emergency',
]);
export type Priority = z.infer<typeof prioritySchema>;

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
  emergency: 'Emergency',
};

/**
 * Work Order schema - validates API responses
 */
export const workOrderSchema = z.object({
  id: z.string(),
  customer_id: z.union([z.string(), z.number()]).transform(String),
  customer_name: z.string().nullable().optional(),
  customer: z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
  }).nullable().optional(),
  // Enum fields
  status: workOrderStatusSchema,
  job_type: jobTypeSchema,
  priority: prioritySchema,
  // Scheduling
  scheduled_date: z.string().nullable(),
  time_window_start: z.string().nullable(),
  time_window_end: z.string().nullable(),
  estimated_duration_hours: z.number().nullable(),
  // Assignment
  assigned_technician: z.string().nullable(),
  assigned_vehicle: z.string().nullable(),
  // Service address
  service_address_line1: z.string().nullable(),
  service_address_line2: z.string().nullable(),
  service_city: z.string().nullable(),
  service_state: z.string().nullable(),
  service_postal_code: z.string().nullable(),
  service_latitude: z.number().nullable(),
  service_longitude: z.number().nullable(),
  // Work details
  checklist: z.record(z.string(), z.unknown()).nullable(),
  notes: z.string().nullable(),
  // Timestamps
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type WorkOrder = z.infer<typeof workOrderSchema>;

/**
 * Paginated work order list response
 */
export const workOrderListResponseSchema = paginatedResponseSchema(workOrderSchema);
export type WorkOrderListResponse = z.infer<typeof workOrderListResponseSchema>;

/**
 * Work Order filters for list queries
 */
export interface WorkOrderFilters {
  page?: number;
  page_size?: number;
  status?: string; // Comma-separated status values
  scheduled_date?: string; // YYYY-MM-DD
  customer_id?: string;
}

/**
 * Create/update work order request
 */
export const workOrderFormSchema = z.object({
  customer_id: z.coerce.number().min(1, 'Customer is required'),
  job_type: jobTypeSchema,
  status: workOrderStatusSchema.default('draft'),
  priority: prioritySchema.default('normal'),
  // Scheduling
  scheduled_date: z.string().optional(),
  time_window_start: z.string().optional(),
  time_window_end: z.string().optional(),
  estimated_duration_hours: z.coerce.number().min(0).optional(),
  // Assignment
  assigned_technician: z.string().optional(),
  assigned_vehicle: z.string().optional(),
  // Service address
  service_address_line1: z.string().optional(),
  service_address_line2: z.string().optional(),
  service_city: z.string().optional(),
  service_state: z.string().max(2, 'Use 2-letter state code').optional(),
  service_postal_code: z.string().optional(),
  // Work details
  notes: z.string().optional(),
});

export type WorkOrderFormData = z.infer<typeof workOrderFormSchema>;
