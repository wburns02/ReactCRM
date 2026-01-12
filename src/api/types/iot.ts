/**
 * IoT Integration Types
 * Connected equipment, sensors, and predictive maintenance
 */
import { z } from "zod";

/**
 * Device types
 */
export const deviceTypeSchema = z.enum([
  "thermostat",
  "hvac_monitor",
  "septic_sensor",
  "water_heater",
  "pump_monitor",
  "flow_meter",
  "pressure_sensor",
  "temperature_sensor",
  "humidity_sensor",
  "generic",
]);
export type DeviceType = z.infer<typeof deviceTypeSchema>;

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  thermostat: "Smart Thermostat",
  hvac_monitor: "HVAC Monitor",
  septic_sensor: "Septic Tank Sensor",
  water_heater: "Water Heater Sensor",
  pump_monitor: "Pump Monitor",
  flow_meter: "Flow Meter",
  pressure_sensor: "Pressure Sensor",
  temperature_sensor: "Temperature Sensor",
  humidity_sensor: "Humidity Sensor",
  generic: "Generic Sensor",
};

/**
 * Device connection status
 */
export const deviceStatusSchema = z.enum([
  "online",
  "offline",
  "warning",
  "critical",
  "maintenance",
]);
export type DeviceStatus = z.infer<typeof deviceStatusSchema>;

/**
 * IoT Platform/Provider
 */
export const iotProviderSchema = z.enum([
  "ecobee",
  "nest",
  "honeywell",
  "custom",
  "mqtt",
  "lorawan",
]);
export type IoTProvider = z.infer<typeof iotProviderSchema>;

/**
 * Connected Device schema
 */
export const deviceSchema = z.object({
  id: z.string(),
  customer_id: z.union([z.string(), z.number()]).transform(String),
  customer_name: z.string().optional(),
  equipment_id: z.string().optional().nullable(), // Link to customer equipment
  device_type: deviceTypeSchema,
  provider: iotProviderSchema,
  external_device_id: z.string(), // ID from provider (e.g., Ecobee device ID)
  name: z.string(),
  location: z.string().optional().nullable(), // e.g., "Main floor", "Basement"
  status: deviceStatusSchema,
  last_seen: z.string().optional().nullable(),
  battery_level: z.number().optional().nullable(), // 0-100
  signal_strength: z.number().optional().nullable(), // 0-100
  firmware_version: z.string().optional().nullable(),
  is_active: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  created_at: z.string(),
  updated_at: z.string().optional().nullable(),
});

export type Device = z.infer<typeof deviceSchema>;

/**
 * Device reading/telemetry
 */
export const deviceReadingSchema = z.object({
  id: z.string(),
  device_id: z.string(),
  timestamp: z.string(),
  readings: z.record(
    z.string(),
    z.union([z.number(), z.string(), z.boolean()]),
  ),
  // Common reading fields (also in readings object)
  temperature: z.number().optional().nullable(),
  humidity: z.number().optional().nullable(),
  pressure: z.number().optional().nullable(),
  flow_rate: z.number().optional().nullable(),
  level: z.number().optional().nullable(), // Tank level %
  power_consumption: z.number().optional().nullable(),
  runtime_hours: z.number().optional().nullable(),
});

export type DeviceReading = z.infer<typeof deviceReadingSchema>;

/**
 * Device alert
 */
export const alertSeveritySchema = z.enum(["info", "warning", "critical"]);
export type AlertSeverity = z.infer<typeof alertSeveritySchema>;

export const deviceAlertSchema = z.object({
  id: z.string(),
  device_id: z.string(),
  device_name: z.string().optional(),
  customer_id: z.string(),
  customer_name: z.string().optional(),
  alert_type: z.string(), // e.g., "high_temperature", "low_battery", "offline"
  severity: alertSeveritySchema,
  title: z.string(),
  message: z.string(),
  reading_value: z.union([z.number(), z.string()]).optional().nullable(),
  threshold_value: z.union([z.number(), z.string()]).optional().nullable(),
  is_acknowledged: z.boolean(),
  acknowledged_by: z.string().optional().nullable(),
  acknowledged_at: z.string().optional().nullable(),
  work_order_id: z.string().optional().nullable(), // If auto-created
  created_at: z.string(),
  resolved_at: z.string().optional().nullable(),
});

export type DeviceAlert = z.infer<typeof deviceAlertSchema>;

/**
 * Alert rule configuration
 */
export const alertRuleSchema = z.object({
  id: z.string(),
  device_type: deviceTypeSchema.optional().nullable(), // null = all types
  device_id: z.string().optional().nullable(), // null = all devices of type
  name: z.string(),
  description: z.string().optional().nullable(),
  metric: z.string(), // e.g., "temperature", "level", "runtime_hours"
  operator: z.enum(["gt", "lt", "eq", "gte", "lte", "ne"]),
  threshold: z.number(),
  severity: alertSeveritySchema,
  auto_create_work_order: z.boolean(),
  work_order_template: z
    .object({
      job_type: z.string(),
      priority: z.string(),
      notes_template: z.string(),
    })
    .optional()
    .nullable(),
  notification_channels: z.array(z.enum(["email", "sms", "push", "webhook"])),
  cooldown_minutes: z.number(), // Don't re-alert for this period
  is_active: z.boolean(),
  created_at: z.string(),
});

export type AlertRule = z.infer<typeof alertRuleSchema>;

/**
 * Equipment health score (predictive maintenance)
 */
export const equipmentHealthSchema = z.object({
  equipment_id: z.string(),
  customer_id: z.string(),
  equipment_type: z.string(),
  equipment_name: z.string(),
  customer_name: z.string().optional(),
  health_score: z.number(), // 0-100
  predicted_failure_date: z.string().optional().nullable(),
  days_until_maintenance: z.number().optional().nullable(),
  risk_level: z.enum(["low", "medium", "high", "critical"]),
  factors: z.array(
    z.object({
      factor: z.string(),
      impact: z.number(), // -100 to +100
      description: z.string(),
    }),
  ),
  recommended_actions: z.array(
    z.object({
      action: z.string(),
      urgency: z.enum(["now", "soon", "scheduled"]),
      estimated_cost: z.number().optional().nullable(),
    }),
  ),
  last_service_date: z.string().optional().nullable(),
  usage_stats: z
    .object({
      total_runtime_hours: z.number().optional(),
      avg_daily_cycles: z.number().optional(),
      efficiency_rating: z.number().optional(),
    })
    .optional()
    .nullable(),
});

export type EquipmentHealth = z.infer<typeof equipmentHealthSchema>;

/**
 * Predictive maintenance recommendation
 */
export const maintenanceRecommendationSchema = z.object({
  id: z.string(),
  equipment_id: z.string(),
  customer_id: z.string(),
  customer_name: z.string().optional(),
  equipment_name: z.string(),
  recommendation_type: z.enum(["preventive", "predictive", "reactive"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  title: z.string(),
  description: z.string(),
  estimated_cost: z.number().optional().nullable(),
  estimated_savings: z.number().optional().nullable(), // If addressed proactively
  confidence: z.number(), // 0-1
  due_by: z.string().optional().nullable(),
  work_order_id: z.string().optional().nullable(),
  status: z.enum(["pending", "scheduled", "completed", "declined"]),
  created_at: z.string(),
});

export type MaintenanceRecommendation = z.infer<
  typeof maintenanceRecommendationSchema
>;

/**
 * Device connection request
 */
export interface ConnectDeviceRequest {
  customer_id: string;
  equipment_id?: string;
  device_type: DeviceType;
  provider: IoTProvider;
  external_device_id?: string;
  name: string;
  location?: string;
  auth_code?: string; // For OAuth-based providers
}

/**
 * OAuth connection for IoT providers
 */
export interface IoTProviderConnection {
  provider: IoTProvider;
  is_connected: boolean;
  account_email?: string;
  device_count: number;
  connected_at?: string;
  expires_at?: string;
}

/**
 * Device telemetry query params
 */
export interface TelemetryQueryParams {
  device_id: string;
  start_date?: string;
  end_date?: string;
  resolution?: "minute" | "hour" | "day";
  metrics?: string[];
}
