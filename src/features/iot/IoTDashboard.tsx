/**
 * IoT Dashboard Component
 * Monitor connected devices, alerts, and equipment health
 */
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  useDevices,
  useDeviceAlerts,
  useMaintenanceRecommendations,
  useAcknowledgeAlert,
  useScheduleMaintenanceFromRecommendation,
} from "@/api/hooks/useIoT";
import { DEVICE_TYPE_LABELS } from "@/api/types/iot";
import type {
  Device,
  DeviceAlert,
  MaintenanceRecommendation,
} from "@/api/types/iot";
import { formatDate, cn } from "@/lib/utils";
import { getErrorMessage } from "@/api/client";
import { toastError } from "@/components/ui/Toast";

export function IoTDashboard() {
  const { data: devices, isLoading: devicesLoading } = useDevices();
  const { data: alerts, isLoading: alertsLoading } = useDeviceAlerts({
    acknowledged: false,
  });
  const { data: recommendations, isLoading: recsLoading } =
    useMaintenanceRecommendations();

  // Aggregate stats
  const stats = {
    totalDevices: devices?.length || 0,
    onlineDevices: devices?.filter((d) => d.status === "online").length || 0,
    warningDevices: devices?.filter((d) => d.status === "warning").length || 0,
    criticalDevices:
      devices?.filter((d) => d.status === "critical").length || 0,
    offlineDevices: devices?.filter((d) => d.status === "offline").length || 0,
    unacknowledgedAlerts: alerts?.length || 0,
    pendingMaintenance:
      recommendations?.filter((r) => r.status === "pending").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            IoT Monitoring
          </h1>
          <p className="text-text-secondary">
            Monitor connected equipment and predictive maintenance
          </p>
        </div>
        <Button variant="primary">Connect Device</Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatCard label="Total Devices" value={stats.totalDevices} />
        <StatCard
          label="Online"
          value={stats.onlineDevices}
          variant="success"
        />
        <StatCard
          label="Warnings"
          value={stats.warningDevices}
          variant="warning"
        />
        <StatCard
          label="Critical"
          value={stats.criticalDevices}
          variant="danger"
        />
        <StatCard
          label="Offline"
          value={stats.offlineDevices}
          variant="muted"
        />
        <StatCard
          label="Active Alerts"
          value={stats.unacknowledgedAlerts}
          variant="danger"
        />
        <StatCard
          label="Maintenance Due"
          value={stats.pendingMaintenance}
          variant="warning"
        />
      </div>

      {/* Alerts Section */}
      {alerts && alerts.length > 0 && (
        <AlertsSection alerts={alerts} loading={alertsLoading} />
      )}

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Status */}
        <DeviceStatusCard devices={devices || []} loading={devicesLoading} />

        {/* Maintenance Recommendations */}
        <MaintenanceRecommendationsCard
          recommendations={recommendations || []}
          loading={recsLoading}
        />
      </div>
    </div>
  );
}

// Stat Card
function StatCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: number;
  variant?: "default" | "success" | "warning" | "danger" | "muted";
}) {
  const variantStyles = {
    default: "text-text-primary",
    success: "text-success",
    warning: "text-warning",
    danger: "text-error",
    muted: "text-text-muted",
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-text-muted uppercase tracking-wide">
          {label}
        </p>
        <p className={cn("text-2xl font-bold", variantStyles[variant])}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

// Alerts Section
function AlertsSection({
  alerts,
  loading,
}: {
  alerts: DeviceAlert[];
  loading: boolean;
}) {
  const acknowledgeAlert = useAcknowledgeAlert();

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert.mutateAsync(alertId);
    } catch (error) {
      toastError(`Error: ${getErrorMessage(error)}`);
    }
  };

  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");
  const infoAlerts = alerts.filter((a) => a.severity === "info");

  return (
    <Card className="border-error/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚨</span>
            <CardTitle>Active Alerts</CardTitle>
            <Badge variant="destructive">{alerts.length}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-20 bg-background-secondary animate-pulse rounded" />
        ) : (
          <div className="space-y-3">
            {/* Critical alerts first */}
            {criticalAlerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onAcknowledge={() => handleAcknowledge(alert.id)}
                isPending={acknowledgeAlert.isPending}
              />
            ))}
            {warningAlerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onAcknowledge={() => handleAcknowledge(alert.id)}
                isPending={acknowledgeAlert.isPending}
              />
            ))}
            {infoAlerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onAcknowledge={() => handleAcknowledge(alert.id)}
                isPending={acknowledgeAlert.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlertRow({
  alert,
  onAcknowledge,
  isPending,
}: {
  alert: DeviceAlert;
  onAcknowledge: () => void;
  isPending: boolean;
}) {
  const severityStyles = {
    critical: "bg-error/10 border-error/30",
    warning: "bg-warning/10 border-warning/30",
    info: "bg-info/10 border-info/30",
  };

  const severityIcons = {
    critical: "🚨",
    warning: "⚠️",
    info: "ℹ️",
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border",
        severityStyles[alert.severity],
      )}
    >
      <span className="text-lg">{severityIcons[alert.severity]}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{alert.title}</span>
          <Badge
            className={cn(
              "text-xs",
              alert.severity === "critical" && "bg-error text-white",
              alert.severity === "warning" && "bg-warning text-white",
              alert.severity === "info" && "bg-info text-white",
            )}
          >
            {alert.severity}
          </Badge>
        </div>
        <p className="text-sm text-text-secondary mt-0.5">{alert.message}</p>
        <p className="text-xs text-text-muted mt-1">
          {alert.device_name} • {alert.customer_name} •{" "}
          {formatDate(alert.created_at)}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onAcknowledge}
        disabled={isPending}
      >
        Acknowledge
      </Button>
    </div>
  );
}

// Device Status Card
function DeviceStatusCard({
  devices,
  loading,
}: {
  devices: Device[];
  loading: boolean;
}) {
  const [filter, setFilter] = useState<
    "all" | "online" | "warning" | "critical" | "offline"
  >("all");

  const filteredDevices = devices.filter((d) => {
    if (filter === "all") return true;
    return d.status === filter;
  });

  const statusColors = {
    online: "bg-success",
    offline: "bg-text-muted",
    warning: "bg-warning",
    critical: "bg-error",
    maintenance: "bg-info",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Connected Devices</CardTitle>
          <div className="flex gap-1">
            {(["all", "online", "warning", "critical", "offline"] as const).map(
              (f) => (
                <Button
                  key={f}
                  variant={filter === f ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Button>
              ),
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-60 bg-background-secondary animate-pulse rounded" />
        ) : !filteredDevices.length ? (
          <div className="text-center py-8 text-text-secondary">
            {filter === "all" ? "No devices connected" : `No ${filter} devices`}
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredDevices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-3 bg-background-secondary rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      statusColors[device.status],
                    )}
                  />
                  <div>
                    <p className="font-medium">{device.name}</p>
                    <p className="text-xs text-text-muted">
                      {DEVICE_TYPE_LABELS[device.device_type]} •{" "}
                      {device.customer_name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {device.battery_level !== null &&
                    device.battery_level !== undefined && (
                      <div className="flex items-center gap-1 text-xs text-text-muted">
                        <span>🔋</span>
                        <span>{device.battery_level}%</span>
                      </div>
                    )}
                  {device.last_seen && (
                    <p className="text-xs text-text-muted">
                      Last seen: {formatDate(device.last_seen)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Maintenance Recommendations Card
function MaintenanceRecommendationsCard({
  recommendations,
  loading,
}: {
  recommendations: MaintenanceRecommendation[];
  loading: boolean;
}) {
  const scheduleWork = useScheduleMaintenanceFromRecommendation();

  const handleSchedule = async (recId: string) => {
    try {
      await scheduleWork.mutateAsync({
        recommendation_id: recId,
        scheduled_date: new Date().toISOString().split("T")[0],
      });
    } catch (error) {
      toastError(`Error: ${getErrorMessage(error)}`);
    }
  };

  const pendingRecs = recommendations.filter((r) => r.status === "pending");

  const priorityStyles = {
    urgent: "border-error/50 bg-error/5",
    high: "border-warning/50 bg-warning/5",
    medium: "border-info/50 bg-info/5",
    low: "border-border",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Predictive Maintenance</CardTitle>
          <Badge variant="outline">{pendingRecs.length} pending</Badge>
        </div>
        <p className="text-sm text-text-secondary">
          AI-recommended maintenance based on equipment health
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-60 bg-background-secondary animate-pulse rounded" />
        ) : !pendingRecs.length ? (
          <div className="text-center py-8 text-text-secondary">
            <span className="text-3xl">✅</span>
            <p className="mt-2">All equipment is healthy</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {pendingRecs.map((rec) => (
              <div
                key={rec.id}
                className={cn(
                  "p-3 rounded-lg border",
                  priorityStyles[rec.priority],
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{rec.title}</span>
                      <Badge
                        className={cn(
                          "text-xs",
                          rec.priority === "urgent" && "bg-error text-white",
                          rec.priority === "high" && "bg-warning text-white",
                          rec.priority === "medium" && "bg-info text-white",
                          rec.priority === "low" && "bg-text-muted text-white",
                        )}
                      >
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-secondary mt-1">
                      {rec.description}
                    </p>
                    <p className="text-xs text-text-muted mt-2">
                      {rec.customer_name} • {rec.equipment_name}
                      {rec.confidence &&
                        ` • ${(rec.confidence * 100).toFixed(0)}% confidence`}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSchedule(rec.id)}
                    disabled={scheduleWork.isPending}
                  >
                    Schedule
                  </Button>
                </div>
                {rec.estimated_savings && (
                  <p className="text-xs text-success mt-2">
                    Potential savings: ${rec.estimated_savings.toFixed(0)} if
                    addressed now
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
