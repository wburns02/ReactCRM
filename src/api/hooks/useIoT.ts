/**
 * IoT Monitor API Hooks (MAC Septic Watchful)
 *
 * Wired to real backend at `${VITE_API_URL}/iot/*` per spec
 * `docs/superpowers/specs/2026-04-27-iot-monitor-design.md`.
 *
 * Endpoints (all under /iot):
 * - GET    /iot/devices                      — list devices
 * - POST   /iot/devices                      — register device (admin)
 * - GET    /iot/devices/{id}                 — device detail w/ telemetry + alerts + bindings
 * - PATCH  /iot/devices/{id}                 — update device
 * - POST   /iot/devices/{id}/bind            — bind to customer
 * - POST   /iot/devices/{id}/unbind          — unbind
 * - GET    /iot/telemetry                    — query telemetry
 * - GET    /iot/alerts                       — list alerts
 * - POST   /iot/alerts/{id}/acknowledge      — ack alert
 * - POST   /iot/alerts/{id}/resolve          — resolve alert
 * - GET    /iot/dashboard/stats              — aggregate dashboard counts
 * - GET    /iot/maintenance/recommendations  — predictive alerts surfaced as recs
 * - GET    /iot/alerts/rules                 — list alert rules
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiClient } from "@/api/client";
import {
  iotDeviceSchema,
  iotDeviceDetailSchema,
  iotTelemetrySchema,
  iotAlertSchema,
  iotDeviceBindingSchema,
  iotDashboardStatsSchema,
  iotAlertRuleSchema,
  type IoTDevice,
  type IoTDeviceDetail,
  type IoTTelemetry,
  type IoTTelemetryQueryParams,
  type IoTAlert,
  type IoTDeviceBinding,
  type IoTDashboardStats,
  type IoTAlertRule,
  type IoTDeviceBindRequest,
  type IoTDeviceUnbindRequest,
  type IoTAlertAckRequest,
  type IoTAlertResolveRequest,
  type AlertSeverity,
  type AlertStatus,
} from "@/api/types/iot";

// ─── Query keys ──────────────────────────────────────────────────────────

export const iotKeys = {
  all: ["iot"] as const,
  devices: {
    all: ["iot", "devices"] as const,
    list: (filters?: { customer_id?: string; install_type?: string }) =>
      ["iot", "devices", "list", filters ?? null] as const,
    detail: (id: string) => ["iot", "devices", "detail", id] as const,
  },
  telemetry: (params: IoTTelemetryQueryParams) =>
    ["iot", "telemetry", params] as const,
  alerts: {
    all: ["iot", "alerts"] as const,
    list: (filters?: {
      device_id?: string;
      status?: AlertStatus;
      severity?: AlertSeverity;
    }) => ["iot", "alerts", "list", filters ?? null] as const,
    rules: () => ["iot", "alerts", "rules"] as const,
  },
  dashboard: {
    stats: () => ["iot", "dashboard", "stats"] as const,
  },
  maintenance: {
    recommendations: () => ["iot", "maintenance", "recommendations"] as const,
  },
};

// ─── Devices ─────────────────────────────────────────────────────────────

/**
 * List IoT devices (optionally filtered by customer / install_type).
 */
export function useDevices(filters?: {
  customer_id?: string;
  install_type?: string;
  archived?: boolean;
}) {
  return useQuery({
    queryKey: iotKeys.devices.list(filters),
    queryFn: async (): Promise<IoTDevice[]> => {
      const { data } = await apiClient.get("/iot/devices", { params: filters });
      return z.array(iotDeviceSchema).parse(data);
    },
  });
}

/**
 * Single device detail — includes recent telemetry + open alerts + bindings.
 */
export function useDeviceDetail(id: string | undefined) {
  return useQuery({
    queryKey: iotKeys.devices.detail(id ?? ""),
    queryFn: async (): Promise<IoTDeviceDetail> => {
      const { data } = await apiClient.get(`/iot/devices/${id}`);
      return iotDeviceDetailSchema.parse(data);
    },
    enabled: !!id,
    refetchInterval: 60_000, // refresh once a minute for live telemetry
  });
}

/**
 * Bind a device to a customer + site (tech action).
 */
export function useBindDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      device_id: string;
      payload: IoTDeviceBindRequest;
    }): Promise<IoTDeviceBinding> => {
      const { data } = await apiClient.post(
        `/iot/devices/${params.device_id}/bind`,
        params.payload,
      );
      return iotDeviceBindingSchema.parse(data);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: iotKeys.devices.all });
      queryClient.invalidateQueries({
        queryKey: iotKeys.devices.detail(vars.device_id),
      });
      queryClient.invalidateQueries({ queryKey: iotKeys.dashboard.stats() });
    },
  });
}

/**
 * Unbind a device (decommission / transfer).
 */
export function useUnbindDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      device_id: string;
      payload?: IoTDeviceUnbindRequest;
    }): Promise<IoTDeviceBinding> => {
      const { data } = await apiClient.post(
        `/iot/devices/${params.device_id}/unbind`,
        params.payload ?? {},
      );
      return iotDeviceBindingSchema.parse(data);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: iotKeys.devices.all });
      queryClient.invalidateQueries({
        queryKey: iotKeys.devices.detail(vars.device_id),
      });
      queryClient.invalidateQueries({ queryKey: iotKeys.dashboard.stats() });
    },
  });
}

// ─── Telemetry ───────────────────────────────────────────────────────────

/**
 * Query telemetry rows. Used for charts on DeviceDetail.
 */
export function useDeviceTelemetry(params: IoTTelemetryQueryParams) {
  return useQuery({
    queryKey: iotKeys.telemetry(params),
    queryFn: async (): Promise<IoTTelemetry[]> => {
      const { data } = await apiClient.get("/iot/telemetry", { params });
      return z.array(iotTelemetrySchema).parse(data);
    },
    enabled: !!params.device_id,
    refetchInterval: 60_000,
  });
}

// ─── Alerts ──────────────────────────────────────────────────────────────

/**
 * List alerts.
 *
 * Backwards-compatible call surface: legacy callers that passed
 * `{ acknowledged?: boolean; severity?: string }` still work — `acknowledged`
 * is mapped to `status: "open"|"acknowledged"`.
 */
export function useDeviceAlerts(
  filters?: {
    device_id?: string;
    status?: AlertStatus;
    severity?: AlertSeverity;
  } & {
    /** legacy shim */
    acknowledged?: boolean;
  },
) {
  // map legacy `acknowledged` flag to `status` if caller used the old shape
  const apiFilters: {
    device_id?: string;
    status?: AlertStatus;
    severity?: AlertSeverity;
  } = {
    device_id: filters?.device_id,
    status: filters?.status,
    severity: filters?.severity,
  };
  if (
    apiFilters.status === undefined &&
    typeof filters?.acknowledged === "boolean"
  ) {
    apiFilters.status = filters.acknowledged ? "acknowledged" : "open";
  }

  return useQuery({
    queryKey: iotKeys.alerts.list(apiFilters),
    queryFn: async (): Promise<IoTAlert[]> => {
      const { data } = await apiClient.get("/iot/alerts", {
        params: apiFilters,
      });
      return z.array(iotAlertSchema).parse(data);
    },
    refetchInterval: 30_000,
  });
}

/**
 * Acknowledge an alert. Returns updated alert.
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      alert_id: string;
      payload?: IoTAlertAckRequest;
    }): Promise<IoTAlert> => {
      const { data } = await apiClient.post(
        `/iot/alerts/${params.alert_id}/acknowledge`,
        params.payload ?? {},
      );
      return iotAlertSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: iotKeys.alerts.all });
      queryClient.invalidateQueries({ queryKey: iotKeys.dashboard.stats() });
    },
  });
}

/**
 * Resolve an alert. Returns updated alert.
 */
export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      alert_id: string;
      payload?: IoTAlertResolveRequest;
    }): Promise<IoTAlert> => {
      const { data } = await apiClient.post(
        `/iot/alerts/${params.alert_id}/resolve`,
        params.payload ?? {},
      );
      return iotAlertSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: iotKeys.alerts.all });
      queryClient.invalidateQueries({ queryKey: iotKeys.dashboard.stats() });
      queryClient.invalidateQueries({
        queryKey: iotKeys.maintenance.recommendations(),
      });
    },
  });
}

// ─── Alert rules ─────────────────────────────────────────────────────────

export function useAlertRules(activeOnly: boolean = true) {
  return useQuery({
    queryKey: iotKeys.alerts.rules(),
    queryFn: async (): Promise<IoTAlertRule[]> => {
      const { data } = await apiClient.get("/iot/alerts/rules", {
        params: { active_only: activeOnly },
      });
      return z.array(iotAlertRuleSchema).parse(data);
    },
  });
}

// ─── Dashboard stats ─────────────────────────────────────────────────────

export function useDashboardStats() {
  return useQuery({
    queryKey: iotKeys.dashboard.stats(),
    queryFn: async (): Promise<IoTDashboardStats> => {
      const { data } = await apiClient.get("/iot/dashboard/stats");
      return iotDashboardStatsSchema.parse(data);
    },
    refetchInterval: 60_000,
  });
}

// ─── Maintenance recommendations ─────────────────────────────────────────

/**
 * Maintenance "recommendations" surface — backend returns predictive (non-critical)
 * open alerts wrapped as `{ recommendations: IoTAlert[] }`.
 *
 * The frontend treats these as a richer card; for v1 it's the same alert shape.
 */
export function useMaintenanceRecommendations(filters?: { limit?: number }) {
  return useQuery({
    queryKey: iotKeys.maintenance.recommendations(),
    queryFn: async (): Promise<IoTAlert[]> => {
      const { data } = await apiClient.get("/iot/maintenance/recommendations", {
        params: filters,
      });
      const payload = data?.recommendations ?? data ?? [];
      return z.array(iotAlertSchema).parse(payload);
    },
    staleTime: 5 * 60_000,
  });
}
