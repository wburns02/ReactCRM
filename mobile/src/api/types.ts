/**
 * Type definitions for CRM Mobile API
 */
import { z } from 'zod';

// Work Order Status
export const WorkOrderStatus = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type WorkOrderStatusType = (typeof WorkOrderStatus)[keyof typeof WorkOrderStatus];

// Job Types
export const JobType = {
  PUMPING: 'pumping',
  INSPECTION: 'inspection',
  REPAIR: 'repair',
  INSTALLATION: 'installation',
  MAINTENANCE: 'maintenance',
  EMERGENCY: 'emergency',
} as const;

export type JobTypeType = (typeof JobType)[keyof typeof JobType];

export const JOB_TYPE_LABELS: Record<string, string> = {
  pumping: 'Pumping',
  inspection: 'Inspection',
  repair: 'Repair',
  installation: 'Installation',
  maintenance: 'Maintenance',
  emergency: 'Emergency',
};

// Zod Schemas
export const CustomerSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  status: z.string().optional(),
  created_at: z.string().optional(),
});

export type Customer = z.infer<typeof CustomerSchema>;

export const WorkOrderSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  customer_id: z.union([z.string(), z.number()]).transform(String),
  customer_name: z.string().optional().nullable(),
  customer: CustomerSchema.optional().nullable(),
  status: z.string(),
  job_type: z.string(),
  priority: z.string().optional().nullable(),
  scheduled_date: z.string().optional().nullable(),
  time_window_start: z.string().optional().nullable(),
  time_window_end: z.string().optional().nullable(),
  assigned_technician_id: z.string().optional().nullable(),
  assigned_technician_name: z.string().optional().nullable(),
  service_address_line1: z.string().optional().nullable(),
  service_address_line2: z.string().optional().nullable(),
  service_city: z.string().optional().nullable(),
  service_state: z.string().optional().nullable(),
  service_postal_code: z.string().optional().nullable(),
  service_latitude: z.number().optional().nullable(),
  service_longitude: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  estimated_duration_hours: z.number().optional().nullable(),
  actual_duration_hours: z.number().optional().nullable(),
  completion_notes: z.string().optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type WorkOrder = z.infer<typeof WorkOrderSchema>;

export const WorkOrderListSchema = z.object({
  items: z.array(WorkOrderSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});

export type WorkOrderList = z.infer<typeof WorkOrderListSchema>;

// Photo data for mobile capture
export interface PhotoData {
  uri: string;
  base64?: string;
  width: number;
  height: number;
  type: 'before' | 'after' | 'manifest';
  timestamp: string;
}

// Location data
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

// Mobile work order completion data
export interface WorkOrderCompletionData {
  work_order_id: string;
  before_photos: PhotoData[];
  after_photos: PhotoData[];
  manifest_photos: PhotoData[];
  customer_signature?: string;
  technician_signature?: string;
  arrival_location?: LocationData;
  completion_location?: LocationData;
  arrival_time?: string;
  completion_time?: string;
  notes?: string;
}

// Technician type
export const TechnicianSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  skills: z.array(z.string()).optional().default([]),
  is_active: z.boolean().optional().default(true),
});

export type Technician = z.infer<typeof TechnicianSchema>;

// User/Auth types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'manager' | 'technician' | 'office';
  technician_id?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

// Work order filters
export interface WorkOrderFilters extends PaginationParams {
  status?: WorkOrderStatusType;
  scheduled_date?: string;
  technician_id?: string;
}
