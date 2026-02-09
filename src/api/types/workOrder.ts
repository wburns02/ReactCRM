import { z } from "zod";
import { paginatedResponseSchema } from "./common.ts";

/**
 * Work Order Status enum - matches backend WorkOrderStatus
 */
export const workOrderStatusSchema = z.enum([
  "draft",
  "scheduled",
  "confirmed",
  "enroute",
  "on_site",
  "in_progress",
  "completed",
  "canceled",
  "requires_followup",
]).or(z.string()); // Allow unknown statuses (like quote_request) to pass through
export type WorkOrderStatus = z.infer<typeof workOrderStatusSchema>;

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  enroute: "En Route",
  on_site: "On Site",
  in_progress: "In Progress",
  completed: "Completed",
  canceled: "Canceled",
  requires_followup: "Requires Follow-up",
};

/**
 * Job/Service Type enum - matches backend ServiceType
 */
export const jobTypeSchema = z.enum([
  "pumping",
  "inspection",
  "repair",
  "installation",
  "emergency",
  "maintenance",
  "grease_trap",
  "camera_inspection",
]);
export type JobType = z.infer<typeof jobTypeSchema>;

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  pumping: "Pumping",
  inspection: "Inspection",
  repair: "Repair",
  installation: "Installation",
  emergency: "Emergency",
  maintenance: "Maintenance",
  grease_trap: "Grease Trap",
  camera_inspection: "Camera Inspection",
};

/**
 * Priority enum - matches backend Priority
 */
export const prioritySchema = z.enum([
  "low",
  "normal",
  "high",
  "urgent",
  "emergency",
]);
export type Priority = z.infer<typeof prioritySchema>;

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
  emergency: "Emergency",
};

/**
 * Work Order schema - validates API responses
 */
export const workOrderSchema = z.object({
  id: z.string(),
  work_order_number: z.string().nullable().optional(),
  customer_id: z.union([z.string(), z.number()]).transform(String),
  customer_name: z.string().nullable().optional(),
  customer: z
    .object({
      id: z.union([z.string(), z.number()]).transform(String),
      first_name: z.string(),
      last_name: z.string(),
      email: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
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
  technician_id: z.string().nullable().optional(),
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
  // Pumping details (for pump-out jobs)
  gallons_pumped: z.number().nullable().optional(),
  dump_site_id: z.string().nullable().optional(),
  dump_fee: z.number().nullable().optional(),
  // Timestamps
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  // Time tracking
  actual_start_time: z.string().nullable().optional(),
  actual_end_time: z.string().nullable().optional(),
  travel_start_time: z.string().nullable().optional(),
  travel_end_time: z.string().nullable().optional(),
  break_minutes: z.number().nullable().optional(),
  total_labor_minutes: z.number().nullable().optional(),
  total_travel_minutes: z.number().nullable().optional(),
  is_clocked_in: z.boolean().nullable().optional(),
  // GPS tracking
  clock_in_gps_lat: z.number().nullable().optional(),
  clock_in_gps_lon: z.number().nullable().optional(),
  clock_out_gps_lat: z.number().nullable().optional(),
  clock_out_gps_lon: z.number().nullable().optional(),
  // Additional fields
  estimated_gallons: z.number().nullable().optional(),
  internal_notes: z.string().nullable().optional(),
  is_recurring: z.boolean().nullable().optional(),
  recurrence_frequency: z.string().nullable().optional(),
  next_recurrence_date: z.string().nullable().optional(),
  total_amount: z.union([z.number(), z.string(), z.null()]).optional().transform(val => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') return val;
    return parseFloat(val as string);
  }),
});

export type WorkOrder = z.infer<typeof workOrderSchema>;

/**
 * Paginated work order list response
 */
export const workOrderListResponseSchema =
  paginatedResponseSchema(workOrderSchema);
export type WorkOrderListResponse = z.infer<typeof workOrderListResponseSchema>;

/**
 * Work Order filters for list queries
 */
export interface WorkOrderFilters {
  page?: number;
  page_size?: number;
  status?: string; // Comma-separated status values
  scheduled_date?: string; // YYYY-MM-DD
  scheduled_date_from?: string; // YYYY-MM-DD - Filter work orders >= this date
  scheduled_date_to?: string; // YYYY-MM-DD - Filter work orders <= this date
  customer_id?: string;
}

/**
 * Create/update work order request
 */
export const workOrderFormSchema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  job_type: jobTypeSchema,
  status: workOrderStatusSchema.default("draft"),
  priority: prioritySchema.default("normal"),
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
  service_state: z.string().max(2, "Use 2-letter state code").optional(),
  service_postal_code: z.string().optional(),
  // Pumping details
  gallons_pumped: z.coerce.number().min(0).optional(),
  dump_site_id: z.string().optional(),
  dump_fee: z.coerce.number().min(0).optional(),
  // Work details
  notes: z.string().optional(),
});

export type WorkOrderFormData = z.infer<typeof workOrderFormSchema>;

// ============================================================================
// ENHANCED WORK ORDER TYPES - Ralph Wiggum Build
// ============================================================================

/**
 * Status colors for UI rendering
 */
export const STATUS_COLORS: Record<WorkOrderStatus, string> = {
  draft: "#6b7280",
  scheduled: "#3b82f6",
  confirmed: "#10b981",
  enroute: "#f59e0b",
  on_site: "#06b6d4",
  in_progress: "#8b5cf6",
  completed: "#22c55e",
  canceled: "#ef4444",
  requires_followup: "#f97316",
};

/**
 * Priority colors for UI rendering
 */
export const PRIORITY_COLORS: Record<Priority, string> = {
  low: "#6b7280",
  normal: "#3b82f6",
  high: "#f59e0b",
  urgent: "#ef4444",
  emergency: "#dc2626",
};

/**
 * Photo types for work order documentation
 */
export const photoTypeSchema = z.enum([
  "before",
  "after",
  "manifest",
  "damage",
  "lid",
  "tank",
  "access",
  "equipment",
  "other",
]);
export type PhotoType = z.infer<typeof photoTypeSchema>;

/**
 * Photo metadata with GPS and timestamp
 */
export interface PhotoMetadata {
  timestamp: string;
  gps?: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  deviceInfo: string;
  photoType: PhotoType;
}

/**
 * Captured photo for work orders
 */
export interface WorkOrderPhoto {
  id: string;
  workOrderId: string;
  data: string;
  thumbnail: string;
  metadata: PhotoMetadata;
  uploadStatus: "pending" | "uploading" | "uploaded" | "failed";
  uploadProgress?: number;
  createdAt: string;
}

/**
 * Signature types
 */
export const signatureTypeSchema = z.enum(["customer", "technician"]);
export type SignatureType = z.infer<typeof signatureTypeSchema>;

/**
 * Signature data for work orders
 */
export interface WorkOrderSignature {
  id: string;
  workOrderId: string;
  type: SignatureType;
  signerName: string;
  data: string;
  timestamp: string;
  uploadStatus: "pending" | "uploading" | "uploaded" | "failed";
}

/**
 * Line item for invoicing
 */
export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxable: boolean;
  category?: string;
}

/**
 * Payment status
 */
export const paymentStatusSchema = z.enum([
  "not_invoiced",
  "invoiced",
  "partial",
  "paid",
  "overdue",
  "refunded",
]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

/**
 * Status change history entry
 */
export interface StatusChange {
  id: string;
  fromStatus: WorkOrderStatus;
  toStatus: WorkOrderStatus;
  changedBy: string;
  changedAt: string;
  notes?: string;
}

/**
 * Activity log entry types
 */
export const activityTypeSchema = z.enum([
  "created",
  "status_change",
  "assigned",
  "rescheduled",
  "note_added",
  "photo_added",
  "signature_captured",
  "payment_received",
  "invoice_sent",
  "customer_notified",
  "technician_enroute",
  "arrived",
  "completed",
]);
export type ActivityType = z.infer<typeof activityTypeSchema>;

/**
 * Activity log entry
 */
export interface ActivityLogEntry {
  id: string;
  type: ActivityType;
  description: string;
  userId?: string;
  userName?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Time slot for scheduling
 */
export interface TimeSlot {
  start: string;
  end: string;
  label?: string;
}

/**
 * Inspection form item
 */
export interface InspectionItem {
  id: string;
  category: string;
  label: string;
  type: "checkbox" | "text" | "number" | "select" | "photo";
  required: boolean;
  options?: string[];
  value?: unknown;
  notes?: string;
}

/**
 * Inspection form data
 */
export interface InspectionForm {
  id: string;
  templateId: string;
  templateName: string;
  items: InspectionItem[];
  completedAt?: string;
  completedBy?: string;
}

/**
 * Extended Work Order with all relationships
 */
export interface WorkOrderExtended extends WorkOrder {
  customer_phone?: string;
  customer_email?: string;
  photos: WorkOrderPhoto[];
  signatures: WorkOrderSignature[];
  inspectionForm?: InspectionForm;
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus: PaymentStatus;
  technicianLocation?: {
    lat: number;
    lng: number;
    lastUpdated: string;
  };
  etaMinutes?: number;
  statusHistory: StatusChange[];
  activityLog: ActivityLogEntry[];
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
}

/**
 * Work order quick stats
 */
export interface WorkOrderStats {
  total: number;
  byStatus: Record<WorkOrderStatus, number>;
  byPriority: Record<Priority, number>;
  byJobType: Record<JobType, number>;
  todayScheduled: number;
  overdueCount: number;
  avgCompletionTime: number;
  completionRate: number;
}

/**
 * Scheduling conflict
 */
export interface SchedulingConflict {
  type: "overlap" | "capacity" | "equipment" | "travel_time";
  workOrderId: string;
  technicianId?: string;
  message: string;
  severity: "warning" | "error";
}

/**
 * Smart scheduling suggestion
 */
export interface SchedulingSuggestion {
  technicianId: string;
  technicianName: string;
  suggestedDate: string;
  suggestedTime: string;
  score: number;
  reasons: string[];
  estimatedTravelTime?: number;
  proximity?: number;
}

/**
 * Recurring schedule pattern
 */
export interface RecurringPattern {
  frequency:
    | "daily"
    | "weekly"
    | "biweekly"
    | "monthly"
    | "quarterly"
    | "yearly";
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: string;
  endAfterOccurrences?: number;
}

/**
 * Geofence for auto arrival/departure
 */
export interface Geofence {
  id: string;
  workOrderId: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  enteredAt?: string;
  exitedAt?: string;
}

/**
 * Communication template
 */
export interface CommunicationTemplate {
  id: string;
  name: string;
  type: "sms" | "email";
  trigger: "manual" | "scheduled" | "confirmed" | "enroute" | "completed";
  subject?: string;
  body: string;
  variables: string[];
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  smsEnabled: boolean;
  emailEnabled: boolean;
  reminder48h: boolean;
  reminder24h: boolean;
  reminder2h: boolean;
  enrouteAlert: boolean;
  completionNotice: boolean;
  invoiceNotice: boolean;
}

/**
 * KPI metrics for analytics
 */
export interface WorkOrderKPIs {
  totalCompleted: number;
  totalScheduled: number;
  totalCanceled: number;
  avgResponseTime: number;
  avgCompletionTime: number;
  avgTravelTime: number;
  firstTimeFixRate: number;
  customerSatisfaction: number;
  callbackRate: number;
  avgRevenuePerJob: number;
  totalRevenue: number;
  collectionRate: number;
  utilizationRate: number;
  jobsPerTechPerDay: number;
}
