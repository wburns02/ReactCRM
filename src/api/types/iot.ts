/**
 * IoT Monitor Types — MAC Septic Watchful
 *
 * Source of truth: react-crm-api `app/schemas/iot.py`
 * Spec: docs/superpowers/specs/2026-04-27-iot-monitor-design.md
 *
 * Real cellular IoT monitor for residential septic systems (ATU + conventional).
 * NOTE: An older third-party "device/provider" stub schema previously lived here
 * (Ecobee/Nest/etc.) and is intentionally removed — it was unwired stub code.
 */
import { z } from "zod";

// ─── Enums ───────────────────────────────────────────────────────────────

export const installTypeSchema = z.enum(["conventional", "atu"]);
export type InstallType = z.infer<typeof installTypeSchema>;

export const alertSeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export type AlertSeverity = z.infer<typeof alertSeveritySchema>;

export const alertStatusSchema = z.enum(["open", "acknowledged", "resolved"]);
export type AlertStatus = z.infer<typeof alertStatusSchema>;

export const alertTypeSchema = z.enum([
  "oem_alarm_fire",
  "power_loss",
  "pump_overcurrent",
  "pump_dry_run",
  "pump_short_cycle",
  "pump_degradation",
  "drain_field_saturation",
  "tank_high_level",
  "missing_heartbeat",
  "low_battery",
  "tamper",
]);
export type AlertType = z.infer<typeof alertTypeSchema>;

export const ruleTypeSchema = z.enum([
  "threshold_gt",
  "threshold_lt",
  "rate_of_change",
  "digital_high",
  "missing_heartbeat",
]);
export type RuleType = z.infer<typeof ruleTypeSchema>;

// ─── Display labels ──────────────────────────────────────────────────────

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  oem_alarm_fire: "OEM Alarm Fired",
  power_loss: "Power Loss",
  pump_overcurrent: "Pump Overcurrent",
  pump_dry_run: "Pump Dry Run",
  pump_short_cycle: "Pump Short-Cycling",
  pump_degradation: "Pump Degradation",
  drain_field_saturation: "Drain Field Saturation",
  tank_high_level: "Tank High Level",
  missing_heartbeat: "Device Missing Heartbeat",
  low_battery: "Low UPS Battery",
  tamper: "Cabinet Tamper",
};

export const INSTALL_TYPE_LABELS: Record<InstallType, string> = {
  conventional: "Conventional",
  atu: "Aerobic Treatment Unit (ATU)",
};

// ─── Devices ─────────────────────────────────────────────────────────────

export const iotDeviceSchema = z.object({
  id: z.string(),
  serial: z.string(),
  customer_id: z.string().nullable().optional(),
  site_address: z.record(z.string(), z.unknown()).nullable().optional(),
  install_type: installTypeSchema.nullable().optional(),
  firmware_version: z.string().nullable().optional(),
  hardware_revision: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  last_seen_at: z.string().nullable().optional(),
  manufactured_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().nullable().optional(),
  archived_at: z.string().nullable().optional(),
});
export type IoTDevice = z.infer<typeof iotDeviceSchema>;

// ─── Telemetry ───────────────────────────────────────────────────────────

export const iotTelemetrySchema = z.object({
  id: z.string(),
  device_id: z.string(),
  time: z.string(),
  sensor_type: z.string(),
  value_numeric: z.number().nullable().optional(),
  value_text: z.string().nullable().optional(),
  raw_payload: z.record(z.string(), z.unknown()).nullable().optional(),
  ingested_at: z.string(),
});
export type IoTTelemetry = z.infer<typeof iotTelemetrySchema>;

export interface IoTTelemetryQueryParams {
  device_id?: string;
  sensor_type?: string;
  start_time?: string;
  end_time?: string;
  limit?: number;
}

// ─── Alerts ──────────────────────────────────────────────────────────────

export const iotAlertSchema = z.object({
  id: z.string(),
  device_id: z.string(),
  alert_type: alertTypeSchema,
  severity: alertSeveritySchema,
  status: alertStatusSchema,
  message: z.string().nullable().optional(),
  trigger_payload: z.record(z.string(), z.unknown()).nullable().optional(),
  fired_at: z.string(),
  acknowledged_at: z.string().nullable().optional(),
  acknowledged_by_user_id: z.number().nullable().optional(),
  resolved_at: z.string().nullable().optional(),
  resolution_note: z.string().nullable().optional(),
  work_order_id: z.string().nullable().optional(),
  created_at: z.string(),
});
export type IoTAlert = z.infer<typeof iotAlertSchema>;

// ─── Bindings ────────────────────────────────────────────────────────────

export const iotDeviceBindingSchema = z.object({
  id: z.string(),
  device_id: z.string(),
  customer_id: z.string(),
  install_type: installTypeSchema.nullable().optional(),
  site_address: z.record(z.string(), z.unknown()).nullable().optional(),
  notes: z.string().nullable().optional(),
  bound_at: z.string(),
  bound_by_user_id: z.number().nullable().optional(),
  unbound_at: z.string().nullable().optional(),
  unbound_by_user_id: z.number().nullable().optional(),
  unbind_reason: z.string().nullable().optional(),
});
export type IoTDeviceBinding = z.infer<typeof iotDeviceBindingSchema>;

// ─── Device detail (recent telemetry + open alerts + bindings) ───────────

export const iotDeviceDetailSchema = iotDeviceSchema.extend({
  recent_telemetry: z.array(iotTelemetrySchema).default([]),
  open_alerts: z.array(iotAlertSchema).default([]),
  bindings: z.array(iotDeviceBindingSchema).default([]),
});
export type IoTDeviceDetail = z.infer<typeof iotDeviceDetailSchema>;

// ─── Firmware ────────────────────────────────────────────────────────────

export const iotFirmwareSchema = z.object({
  id: z.string(),
  version: z.string(),
  signed_image_url: z.string(),
  signature: z.string(),
  image_sha256: z.string(),
  target_install_types: z.array(z.string()).nullable().optional(),
  min_hardware_revision: z.string().nullable().optional(),
  release_notes: z.string().nullable().optional(),
  released_at: z.string(),
  released_by_user_id: z.number().nullable().optional(),
});
export type IoTFirmwareVersion = z.infer<typeof iotFirmwareSchema>;

// ─── Alert rules ─────────────────────────────────────────────────────────

export const iotAlertRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  rule_type: ruleTypeSchema,
  sensor_type: z.string().nullable().optional(),
  alert_type: alertTypeSchema,
  severity: alertSeveritySchema,
  config: z.record(z.string(), z.unknown()),
  message_template: z.string().nullable().optional(),
  install_types: z.array(z.string()).nullable().optional(),
  cold_start_grace_hours: z.number().nullable().optional(),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string().nullable().optional(),
});
export type IoTAlertRule = z.infer<typeof iotAlertRuleSchema>;

// ─── Dashboard stats ─────────────────────────────────────────────────────

export const iotDashboardStatsSchema = z.object({
  total_devices: z.number(),
  online: z.number(),
  offline: z.number(),
  warnings: z.number(),
  critical: z.number(),
  active_alerts: z.number(),
  maintenance_due: z.number(),
});
export type IoTDashboardStats = z.infer<typeof iotDashboardStatsSchema>;

// ─── Mutation request shapes ─────────────────────────────────────────────

export interface IoTDeviceBindRequest {
  customer_id: string;
  install_type: InstallType;
  site_address?: Record<string, unknown> | null;
  notes?: string | null;
}

export interface IoTDeviceUnbindRequest {
  unbind_reason?: string | null;
}

export interface IoTAlertAckRequest {
  resolution_note?: string | null;
}

export interface IoTAlertResolveRequest {
  resolution_note?: string | null;
  work_order_id?: string | null;
}
