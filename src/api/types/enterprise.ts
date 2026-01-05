/**
 * Enterprise Types
 * Multi-region, franchise management, advanced permissions
 */
import { z } from 'zod';

/**
 * Region/Location schema
 */
export const regionSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(), // Short code like "ATX", "DAL", "HOU"
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  timezone: z.string(),
  is_active: z.boolean(),
  is_franchise: z.boolean(),
  franchise_owner_id: z.string().optional().nullable(),
  franchise_owner_name: z.string().optional().nullable(),
  royalty_percentage: z.number().optional().nullable(), // e.g., 0.06 for 6%
  territory_bounds: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
  }).optional().nullable(),
  contact_email: z.string().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string().optional().nullable(),
});

export type Region = z.infer<typeof regionSchema>;

/**
 * Region performance metrics
 */
export const regionPerformanceSchema = z.object({
  region_id: z.string(),
  region_name: z.string(),
  period_start: z.string(),
  period_end: z.string(),
  // Revenue metrics
  total_revenue: z.number(),
  revenue_change_pct: z.number(), // vs previous period
  average_invoice: z.number(),
  // Operations metrics
  total_work_orders: z.number(),
  completed_work_orders: z.number(),
  completion_rate: z.number(),
  first_time_fix_rate: z.number(),
  average_response_time_hours: z.number(),
  // Customer metrics
  total_customers: z.number(),
  new_customers: z.number(),
  customer_satisfaction: z.number(), // 0-5
  repeat_customer_rate: z.number(),
  // Technician metrics
  technician_count: z.number(),
  technician_utilization: z.number(), // 0-1
  // Rankings
  revenue_rank: z.number(),
  efficiency_rank: z.number(),
  satisfaction_rank: z.number(),
});

export type RegionPerformance = z.infer<typeof regionPerformanceSchema>;

/**
 * Franchise royalty report
 */
export const franchiseRoyaltySchema = z.object({
  id: z.string(),
  franchise_id: z.string(),
  franchise_name: z.string(),
  period_start: z.string(),
  period_end: z.string(),
  gross_revenue: z.number(),
  qualifying_revenue: z.number(), // Revenue subject to royalty
  royalty_rate: z.number(),
  royalty_amount: z.number(),
  marketing_fee: z.number().optional().nullable(),
  technology_fee: z.number().optional().nullable(),
  total_fees: z.number(),
  status: z.enum(['pending', 'invoiced', 'paid', 'overdue']),
  due_date: z.string().optional().nullable(),
  paid_date: z.string().optional().nullable(),
  invoice_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  created_at: z.string(),
});

export type FranchiseRoyalty = z.infer<typeof franchiseRoyaltySchema>;

/**
 * Territory definition
 */
export const territorySchema = z.object({
  id: z.string(),
  region_id: z.string(),
  name: z.string(),
  zip_codes: z.array(z.string()),
  boundaries: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
  }).optional().nullable(),
  assigned_technician_ids: z.array(z.string()),
  is_exclusive: z.boolean(), // Exclusive territory rights
  population: z.number().optional().nullable(),
  estimated_potential: z.number().optional().nullable(),
  created_at: z.string(),
});

export type Territory = z.infer<typeof territorySchema>;

/**
 * Advanced Role Permissions
 */
export const permissionSchema = z.object({
  resource: z.string(), // e.g., "customers", "work_orders", "invoices"
  actions: z.array(z.enum(['create', 'read', 'update', 'delete', 'export', 'approve'])),
  scope: z.enum(['own', 'team', 'region', 'all']), // Data visibility scope
  conditions: z.record(z.string(), z.unknown()).optional().nullable(), // Additional conditions
});

export type Permission = z.infer<typeof permissionSchema>;

export const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  level: z.enum(['system', 'organization', 'region']),
  permissions: z.array(permissionSchema),
  is_system_role: z.boolean(), // Built-in role that can't be deleted
  user_count: z.number().optional(),
  created_at: z.string(),
  updated_at: z.string().optional().nullable(),
});

export type Role = z.infer<typeof roleSchema>;

/**
 * User role assignment with region scope
 */
export const userRoleAssignmentSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  user_email: z.string().optional(),
  user_name: z.string().optional(),
  role_id: z.string(),
  role_name: z.string().optional(),
  region_id: z.string().optional().nullable(), // null = all regions
  region_name: z.string().optional().nullable(),
  granted_by: z.string().optional().nullable(),
  granted_at: z.string(),
  expires_at: z.string().optional().nullable(),
});

export type UserRoleAssignment = z.infer<typeof userRoleAssignmentSchema>;

/**
 * Audit log entry
 */
export const auditLogSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  user_id: z.string(),
  user_email: z.string().optional(),
  user_name: z.string().optional(),
  action: z.string(), // e.g., "create", "update", "delete", "export"
  resource_type: z.string(), // e.g., "customer", "work_order"
  resource_id: z.string(),
  region_id: z.string().optional().nullable(),
  ip_address: z.string().optional().nullable(),
  user_agent: z.string().optional().nullable(),
  changes: z.record(z.string(), z.object({
    old_value: z.unknown(),
    new_value: z.unknown(),
  })).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;

/**
 * Compliance report
 */
export const complianceReportSchema = z.object({
  id: z.string(),
  region_id: z.string().optional().nullable(),
  region_name: z.string().optional().nullable(),
  period_start: z.string(),
  period_end: z.string(),
  compliance_score: z.number(), // 0-100
  areas: z.array(z.object({
    name: z.string(),
    score: z.number(),
    issues: z.array(z.object({
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      description: z.string(),
      recommendation: z.string().optional(),
    })),
  })),
  generated_at: z.string(),
});

export type ComplianceReport = z.infer<typeof complianceReportSchema>;

/**
 * Multi-region filter params
 */
export interface MultiRegionFilters {
  region_ids?: string[];
  include_all_regions?: boolean;
  period_start?: string;
  period_end?: string;
  comparison_period?: 'previous' | 'year_ago';
}

/**
 * Cross-region comparison
 */
export interface RegionComparison {
  metric: string;
  regions: {
    region_id: string;
    region_name: string;
    value: number;
    rank: number;
    trend: 'up' | 'down' | 'stable';
    vs_average: number; // Percentage above/below average
  }[];
  average: number;
  best_performer: string;
  worst_performer: string;
}
