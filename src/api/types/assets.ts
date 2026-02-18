import { z } from "zod";
import { paginatedResponseSchema } from "./common.ts";

/**
 * Asset status enum
 */
export const assetStatusSchema = z.enum([
  "available",
  "in_use",
  "maintenance",
  "retired",
  "lost",
]);
export type AssetStatus = z.infer<typeof assetStatusSchema>;

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  available: "Available",
  in_use: "In Use",
  maintenance: "Maintenance",
  retired: "Retired",
  lost: "Lost",
};

export const ASSET_STATUS_COLORS: Record<AssetStatus, string> = {
  available: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  in_use: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  maintenance: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  retired: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  lost: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

/**
 * Asset condition enum
 */
export const assetConditionSchema = z.enum([
  "excellent",
  "good",
  "fair",
  "poor",
]);
export type AssetCondition = z.infer<typeof assetConditionSchema>;

export const ASSET_CONDITION_LABELS: Record<AssetCondition, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

export const ASSET_CONDITION_COLORS: Record<AssetCondition, string> = {
  excellent: "bg-green-100 text-green-700",
  good: "bg-blue-100 text-blue-700",
  fair: "bg-amber-100 text-amber-700",
  poor: "bg-red-100 text-red-700",
};

/**
 * Asset type constants
 */
export const ASSET_TYPES = [
  { value: "vehicle", label: "Vehicle", icon: "🚛" },
  { value: "pump", label: "Pump", icon: "⚙️" },
  { value: "tool", label: "Tool", icon: "🔧" },
  { value: "ppe", label: "PPE", icon: "🦺" },
  { value: "trailer", label: "Trailer", icon: "🚚" },
  { value: "part", label: "Part", icon: "🔩" },
  { value: "other", label: "Other", icon: "📦" },
] as const;

export const ASSET_TYPE_MAP: Record<string, { label: string; icon: string }> =
  Object.fromEntries(ASSET_TYPES.map((t) => [t.value, { label: t.label, icon: t.icon }]));

/**
 * Asset schema - validates API responses
 */
export const assetSchema = z.object({
  id: z.string(),
  name: z.string(),
  asset_tag: z.string().nullable().optional(),
  asset_type: z.string(),
  category: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  make: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  serial_number: z.string().nullable().optional(),
  year: z.number().nullable().optional(),
  purchase_date: z.string().nullable().optional(),
  purchase_price: z.number().nullable().optional(),
  current_value: z.number().nullable().optional(),
  depreciated_value: z.number().nullable().optional(),
  salvage_value: z.number().nullable().optional(),
  useful_life_years: z.number().nullable().optional(),
  depreciation_method: z.string().nullable().optional(),
  status: z.string().default("available"),
  condition: z.string().nullable().optional(),
  assigned_technician_id: z.string().nullable().optional(),
  assigned_technician_name: z.string().nullable().optional(),
  assigned_work_order_id: z.string().nullable().optional(),
  location_description: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  samsara_vehicle_id: z.string().nullable().optional(),
  last_maintenance_date: z.string().nullable().optional(),
  next_maintenance_date: z.string().nullable().optional(),
  maintenance_interval_days: z.number().nullable().optional(),
  total_hours: z.number().nullable().optional(),
  odometer_miles: z.number().nullable().optional(),
  photo_url: z.string().nullable().optional(),
  qr_code: z.string().nullable().optional(),
  warranty_expiry: z.string().nullable().optional(),
  insurance_policy: z.string().nullable().optional(),
  insurance_expiry: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});
export type Asset = z.infer<typeof assetSchema>;

/**
 * Paginated asset list response
 */
export const assetListResponseSchema = paginatedResponseSchema(assetSchema);
export type AssetListResponse = z.infer<typeof assetListResponseSchema>;

/**
 * Asset filters
 */
export interface AssetFilters {
  page?: number;
  page_size?: number;
  search?: string;
  asset_type?: string;
  status?: string;
  condition?: string;
  assigned_to?: string;
  is_active?: boolean;
}

/**
 * Asset form data for create/update
 */
export interface AssetFormData {
  name: string;
  asset_tag?: string;
  asset_type: string;
  category?: string;
  description?: string;
  make?: string;
  model?: string;
  serial_number?: string;
  year?: number;
  purchase_date?: string;
  purchase_price?: number;
  current_value?: number;
  salvage_value?: number;
  useful_life_years?: number;
  status?: string;
  condition?: string;
  assigned_technician_id?: string;
  assigned_technician_name?: string;
  location_description?: string;
  samsara_vehicle_id?: string;
  maintenance_interval_days?: number;
  total_hours?: number;
  odometer_miles?: number;
  photo_url?: string;
  warranty_expiry?: string;
  insurance_policy?: string;
  insurance_expiry?: string;
  notes?: string;
}

/**
 * Maintenance log schema
 */
export const maintenanceLogSchema = z.object({
  id: z.string(),
  asset_id: z.string(),
  maintenance_type: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  performed_by_id: z.string().nullable().optional(),
  performed_by_name: z.string().nullable().optional(),
  performed_at: z.string().nullable().optional(),
  cost: z.number().nullable().optional(),
  parts_used: z.string().nullable().optional(),
  hours_at_service: z.number().nullable().optional(),
  odometer_at_service: z.number().nullable().optional(),
  next_due_date: z.string().nullable().optional(),
  next_due_hours: z.number().nullable().optional(),
  next_due_miles: z.number().nullable().optional(),
  condition_before: z.string().nullable().optional(),
  condition_after: z.string().nullable().optional(),
  photos: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
});
export type MaintenanceLog = z.infer<typeof maintenanceLogSchema>;

/**
 * Assignment schema
 */
export const assignmentSchema = z.object({
  id: z.string(),
  asset_id: z.string(),
  assigned_to_type: z.string(),
  assigned_to_id: z.string(),
  assigned_to_name: z.string().nullable().optional(),
  checked_out_at: z.string().nullable().optional(),
  checked_in_at: z.string().nullable().optional(),
  checked_out_by_id: z.string().nullable().optional(),
  checked_out_by_name: z.string().nullable().optional(),
  condition_at_checkout: z.string().nullable().optional(),
  condition_at_checkin: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
});
export type AssetAssignment = z.infer<typeof assignmentSchema>;

/**
 * Dashboard schema
 */
export const assetDashboardSchema = z.object({
  total_assets: z.number().default(0),
  total_value: z.number().default(0),
  by_status: z.record(z.string(), z.number()).default({}),
  by_type: z.record(z.string(), z.number()).default({}),
  by_condition: z.record(z.string(), z.number()).default({}),
  maintenance_due: z.number().default(0),
  maintenance_overdue: z.number().default(0),
  recently_added: z.array(assetSchema).default([]),
  recent_maintenance: z.array(maintenanceLogSchema).default([]),
  low_condition_assets: z.array(assetSchema).default([]),
});
export type AssetDashboard = z.infer<typeof assetDashboardSchema>;
