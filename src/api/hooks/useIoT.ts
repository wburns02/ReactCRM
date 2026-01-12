/**
 * IoT Integration API Hooks
 * Device management, telemetry, alerts, and predictive maintenance
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import {
  deviceSchema,
  deviceReadingSchema,
  deviceAlertSchema,
  alertRuleSchema,
  equipmentHealthSchema,
  maintenanceRecommendationSchema,
} from "@/api/types/iot";
import type {
  Device,
  DeviceReading,
  DeviceAlert,
  AlertRule,
  EquipmentHealth,
  MaintenanceRecommendation,
  ConnectDeviceRequest,
  IoTProviderConnection,
  TelemetryQueryParams,
  IoTProvider,
} from "@/api/types/iot";
import { z } from "zod";

// Query keys
export const iotKeys = {
  devices: {
    all: ["iot", "devices"] as const,
    list: (customerId?: string) =>
      [...iotKeys.devices.all, "list", customerId] as const,
    detail: (id: string) => [...iotKeys.devices.all, "detail", id] as const,
    telemetry: (id: string, params?: TelemetryQueryParams) =>
      [...iotKeys.devices.all, "telemetry", id, params] as const,
  },
  alerts: {
    all: ["iot", "alerts"] as const,
    list: (filters?: { acknowledged?: boolean; severity?: string }) =>
      [...iotKeys.alerts.all, "list", filters] as const,
    rules: () => [...iotKeys.alerts.all, "rules"] as const,
  },
  health: {
    all: ["iot", "health"] as const,
    equipment: (equipmentId: string) =>
      [...iotKeys.health.all, "equipment", equipmentId] as const,
    customer: (customerId: string) =>
      [...iotKeys.health.all, "customer", customerId] as const,
    recommendations: () => [...iotKeys.health.all, "recommendations"] as const,
  },
  providers: {
    all: ["iot", "providers"] as const,
    connections: () => [...iotKeys.providers.all, "connections"] as const,
  },
};

// ============================================
// Device Management Hooks
// ============================================

/**
 * Get all devices, optionally filtered by customer
 */
export function useDevices(customerId?: string) {
  return useQuery({
    queryKey: iotKeys.devices.list(customerId),
    queryFn: async (): Promise<Device[]> => {
      const params = customerId ? { customer_id: customerId } : {};
      const { data } = await apiClient.get("/iot/devices", { params });
      return z.array(deviceSchema).parse(data.devices || data);
    },
  });
}

/**
 * Get single device
 */
export function useDevice(id: string) {
  return useQuery({
    queryKey: iotKeys.devices.detail(id),
    queryFn: async (): Promise<Device> => {
      const { data } = await apiClient.get(`/iot/devices/${id}`);
      return deviceSchema.parse(data.device || data);
    },
    enabled: !!id,
  });
}

/**
 * Get device telemetry/readings
 */
export function useDeviceTelemetry(params: TelemetryQueryParams) {
  return useQuery({
    queryKey: iotKeys.devices.telemetry(params.device_id, params),
    queryFn: async (): Promise<DeviceReading[]> => {
      const { data } = await apiClient.get(
        `/iot/devices/${params.device_id}/telemetry`,
        {
          params: {
            start_date: params.start_date,
            end_date: params.end_date,
            resolution: params.resolution,
            metrics: params.metrics?.join(","),
          },
        },
      );
      return z.array(deviceReadingSchema).parse(data.readings || data);
    },
    enabled: !!params.device_id,
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Get latest reading for a device
 */
export function useLatestReading(deviceId: string) {
  return useQuery({
    queryKey: ["iot", "devices", deviceId, "latest"],
    queryFn: async (): Promise<DeviceReading | null> => {
      const { data } = await apiClient.get(`/iot/devices/${deviceId}/latest`);
      if (!data.reading) return null;
      return deviceReadingSchema.parse(data.reading);
    },
    enabled: !!deviceId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Connect a new device
 */
export function useConnectDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ConnectDeviceRequest): Promise<Device> => {
      const { data } = await apiClient.post("/iot/devices", request);
      return deviceSchema.parse(data.device || data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: iotKeys.devices.list(data.customer_id),
      });
      queryClient.invalidateQueries({ queryKey: iotKeys.devices.list() });
    },
  });
}

/**
 * Update device settings
 */
export function useUpdateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<{
        name: string;
        location: string;
        is_active: boolean;
      }>;
    }): Promise<Device> => {
      const { data } = await apiClient.patch(`/iot/devices/${id}`, updates);
      return deviceSchema.parse(data.device || data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(iotKeys.devices.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: iotKeys.devices.list() });
    },
  });
}

/**
 * Disconnect/remove a device
 */
export function useDisconnectDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/iot/devices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: iotKeys.devices.all });
    },
  });
}

// ============================================
// Alert Hooks
// ============================================

/**
 * Get device alerts
 */
export function useDeviceAlerts(filters?: {
  acknowledged?: boolean;
  severity?: string;
}) {
  return useQuery({
    queryKey: iotKeys.alerts.list(filters),
    queryFn: async (): Promise<DeviceAlert[]> => {
      const { data } = await apiClient.get("/iot/alerts", { params: filters });
      return z.array(deviceAlertSchema).parse(data.alerts || data);
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Acknowledge an alert
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string): Promise<DeviceAlert> => {
      const { data } = await apiClient.post(
        `/iot/alerts/${alertId}/acknowledge`,
      );
      return deviceAlertSchema.parse(data.alert || data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: iotKeys.alerts.all });
    },
  });
}

/**
 * Get alert rules
 */
export function useAlertRules() {
  return useQuery({
    queryKey: iotKeys.alerts.rules(),
    queryFn: async (): Promise<AlertRule[]> => {
      const { data } = await apiClient.get("/iot/alerts/rules");
      return z.array(alertRuleSchema).parse(data.rules || data);
    },
  });
}

/**
 * Create alert rule
 */
export function useCreateAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      rule: Omit<AlertRule, "id" | "created_at">,
    ): Promise<AlertRule> => {
      const { data } = await apiClient.post("/iot/alerts/rules", rule);
      return alertRuleSchema.parse(data.rule || data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: iotKeys.alerts.rules() });
    },
  });
}

/**
 * Update alert rule
 */
export function useUpdateAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<AlertRule>;
    }): Promise<AlertRule> => {
      const { data } = await apiClient.patch(
        `/iot/alerts/rules/${id}`,
        updates,
      );
      return alertRuleSchema.parse(data.rule || data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: iotKeys.alerts.rules() });
    },
  });
}

/**
 * Delete alert rule
 */
export function useDeleteAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/iot/alerts/rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: iotKeys.alerts.rules() });
    },
  });
}

// ============================================
// Predictive Maintenance Hooks
// ============================================

/**
 * Get equipment health score
 */
export function useEquipmentHealth(equipmentId: string) {
  return useQuery({
    queryKey: iotKeys.health.equipment(equipmentId),
    queryFn: async (): Promise<EquipmentHealth> => {
      const { data } = await apiClient.get(
        `/iot/health/equipment/${equipmentId}`,
      );
      return equipmentHealthSchema.parse(data);
    },
    enabled: !!equipmentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get all equipment health for a customer
 */
export function useCustomerEquipmentHealth(customerId: string) {
  return useQuery({
    queryKey: iotKeys.health.customer(customerId),
    queryFn: async (): Promise<EquipmentHealth[]> => {
      const { data } = await apiClient.get(
        `/iot/health/customer/${customerId}`,
      );
      return z.array(equipmentHealthSchema).parse(data.equipment || data);
    },
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get maintenance recommendations
 */
export function useMaintenanceRecommendations(filters?: {
  priority?: string;
  status?: string;
  customer_id?: string;
}) {
  return useQuery({
    queryKey: iotKeys.health.recommendations(),
    queryFn: async (): Promise<MaintenanceRecommendation[]> => {
      const { data } = await apiClient.get("/iot/maintenance/recommendations", {
        params: filters,
      });
      return z
        .array(maintenanceRecommendationSchema)
        .parse(data.recommendations || data);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Create work order from recommendation
 */
export function useScheduleMaintenanceFromRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      recommendation_id: string;
      scheduled_date: string;
      technician_id?: string;
    }): Promise<{ work_order_id: string }> => {
      const { data } = await apiClient.post(
        `/iot/maintenance/recommendations/${params.recommendation_id}/schedule`,
        params,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: iotKeys.health.recommendations(),
      });
    },
  });
}

/**
 * Decline a maintenance recommendation
 */
export function useDeclineRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      recommendation_id: string;
      reason?: string;
    }): Promise<void> => {
      await apiClient.post(
        `/iot/maintenance/recommendations/${params.recommendation_id}/decline`,
        { reason: params.reason },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: iotKeys.health.recommendations(),
      });
    },
  });
}

// ============================================
// Provider Connection Hooks
// ============================================

/**
 * Get IoT provider connections
 */
export function useIoTProviderConnections() {
  return useQuery({
    queryKey: iotKeys.providers.connections(),
    queryFn: async (): Promise<IoTProviderConnection[]> => {
      const { data } = await apiClient.get("/iot/providers/connections");
      return data.connections || [];
    },
  });
}

/**
 * Initiate OAuth connection to provider
 */
export function useConnectIoTProvider() {
  return useMutation({
    mutationFn: async (
      provider: IoTProvider,
    ): Promise<{ auth_url: string; state: string }> => {
      const { data } = await apiClient.post(
        `/iot/providers/${provider}/connect`,
      );
      return data;
    },
  });
}

/**
 * Complete OAuth connection
 */
export function useCompleteIoTProviderConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      provider: IoTProvider;
      code: string;
      state: string;
    }): Promise<IoTProviderConnection> => {
      const { data } = await apiClient.post(
        `/iot/providers/${params.provider}/callback`,
        {
          code: params.code,
          state: params.state,
        },
      );
      return data.connection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: iotKeys.providers.connections(),
      });
      queryClient.invalidateQueries({ queryKey: iotKeys.devices.all });
    },
  });
}

/**
 * Disconnect IoT provider
 */
export function useDisconnectIoTProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (provider: IoTProvider): Promise<void> => {
      await apiClient.delete(`/iot/providers/${provider}/disconnect`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: iotKeys.providers.connections(),
      });
      queryClient.invalidateQueries({ queryKey: iotKeys.devices.all });
    },
  });
}

/**
 * Sync devices from provider
 */
export function useSyncProviderDevices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      provider: IoTProvider,
    ): Promise<{ synced_count: number }> => {
      const { data } = await apiClient.post(`/iot/providers/${provider}/sync`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: iotKeys.devices.all });
    },
  });
}
