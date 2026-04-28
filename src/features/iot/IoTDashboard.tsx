/**
 * IoT Monitor Dashboard — MAC Septic Watchful
 *
 * Surfaces:
 *   - Aggregate stats (real `useDashboardStats`)
 *   - Open alerts (acknowledge / resolve mutations)
 *   - Connected devices (link to detail page)
 *   - Predictive maintenance recommendations (subset of open alerts)
 *
 * Spec: docs/superpowers/specs/2026-04-27-iot-monitor-design.md
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Cpu, Plus } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { toastError, toastSuccess } from "@/components/ui/Toast";
import { getErrorMessage } from "@/api/client";

import {
  useDevices,
  useDeviceAlerts,
  useMaintenanceRecommendations,
  useDashboardStats,
  useAcknowledgeAlert,
  useResolveAlert,
} from "@/api/hooks/useIoT";
import {
  ALERT_TYPE_LABELS,
  INSTALL_TYPE_LABELS,
  type IoTAlert,
  type IoTDevice,
  type AlertSeverity,
} from "@/api/types/iot";
import { formatDate, cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const SEVERITY_BADGE: Record<
  AlertSeverity,
  { tone: string; label: string }
> = {
  critical: { tone: "bg-error text-white", label: "Critical" },
  high: { tone: "bg-warning text-white", label: "High" },
  medium: { tone: "bg-info text-white", label: "Medium" },
  low: { tone: "bg-text-muted text-white", label: "Low" },
};

const ALERT_ROW_TONE: Record<AlertSeverity, string> = {
  critical: "bg-error/10 border-error/40",
  high: "bg-warning/10 border-warning/40",
  medium: "bg-info/10 border-info/30",
  low: "bg-bg-secondary border-border",
};

function deviceStatus(device: IoTDevice): {
  label: string;
  tone: string;
} {
  if (device.archived_at) return { label: "Archived", tone: "bg-text-muted" };
  if (!device.last_seen_at) return { label: "Pending", tone: "bg-text-muted" };

  const lastSeen = new Date(device.last_seen_at).getTime();
  const ageMs = Date.now() - lastSeen;
  const hours = ageMs / (1000 * 60 * 60);
  if (hours < 36) return { label: "Online", tone: "bg-success" };
  if (hours < 96) return { label: "Stale", tone: "bg-warning" };
  return { label: "Offline", tone: "bg-error" };
}

// ─── Page ────────────────────────────────────────────────────────────────

export function IoTDashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: devices, isLoading: devicesLoading } = useDevices();
  const { data: openAlerts, isLoading: alertsLoading } = useDeviceAlerts({
    status: "open",
  });
  const { data: recommendations, isLoading: recsLoading } =
    useMaintenanceRecommendations();

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
            <Cpu className="w-6 h-6 text-primary" />
            IoT Monitor
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Septic system telemetry, alerts, and predictive maintenance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/iot/devices?action=register">
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Register Device
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <StatCard
          label="Total Devices"
          value={stats?.total_devices ?? 0}
          loading={statsLoading}
        />
        <StatCard
          label="Online"
          value={stats?.online ?? 0}
          loading={statsLoading}
          variant="success"
        />
        <StatCard
          label="Offline"
          value={stats?.offline ?? 0}
          loading={statsLoading}
          variant="muted"
        />
        <StatCard
          label="Warnings"
          value={stats?.warnings ?? 0}
          loading={statsLoading}
          variant="warning"
        />
        <StatCard
          label="Critical"
          value={stats?.critical ?? 0}
          loading={statsLoading}
          variant="danger"
        />
        <StatCard
          label="Active Alerts"
          value={stats?.active_alerts ?? 0}
          loading={statsLoading}
          variant="danger"
        />
        <StatCard
          label="Maintenance Due"
          value={stats?.maintenance_due ?? 0}
          loading={statsLoading}
          variant="warning"
        />
      </div>

      {/* Open Alerts */}
      <AlertsSection alerts={openAlerts ?? []} loading={alertsLoading} />

      {/* Two-column on desktop, stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DeviceListCard
          devices={devices ?? []}
          loading={devicesLoading}
        />
        <RecommendationsCard
          recommendations={recommendations ?? []}
          loading={recsLoading}
        />
      </div>
    </div>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  loading = false,
  variant = "default",
}: {
  label: string;
  value: number;
  loading?: boolean;
  variant?: "default" | "success" | "warning" | "danger" | "muted";
}) {
  const tone: Record<typeof variant, string> = {
    default: "text-text-primary",
    success: "text-success",
    warning: "text-warning",
    danger: "text-error",
    muted: "text-text-muted",
  };

  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </p>
      {loading ? (
        <div className="mt-2 h-7 w-12 bg-bg-secondary animate-pulse rounded" />
      ) : (
        <p className={cn("mt-1 text-2xl font-bold", tone[variant])}>{value}</p>
      )}
    </Card>
  );
}

// ─── Alerts ──────────────────────────────────────────────────────────────

function AlertsSection({
  alerts,
  loading,
}: {
  alerts: IoTAlert[];
  loading: boolean;
}) {
  const sorted = useMemo(
    () =>
      [...alerts].sort((a, b) => {
        const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
        if (sev !== 0) return sev;
        return (
          new Date(b.fired_at).getTime() - new Date(a.fired_at).getTime()
        );
      }),
    [alerts],
  );

  return (
    <Card className={cn(alerts.length > 0 && "border-error/40")}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-error" />
            Active Alerts
          </CardTitle>
          <Badge variant="outline">{alerts.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-24 bg-bg-secondary animate-pulse rounded" />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon="✅"
            title="All systems quiet"
            description="No open alerts across the fleet."
          />
        ) : (
          <ul className="space-y-3">
            {sorted.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AlertRow({ alert }: { alert: IoTAlert }) {
  const ack = useAcknowledgeAlert();
  const resolve = useResolveAlert();
  const sev = alert.severity;
  const sevBadge = SEVERITY_BADGE[sev];

  const handleAck = async () => {
    try {
      await ack.mutateAsync({ alert_id: alert.id });
      toastSuccess("Alert acknowledged");
    } catch (err) {
      toastError(`Acknowledge failed: ${getErrorMessage(err)}`);
    }
  };

  const handleResolve = async () => {
    try {
      await resolve.mutateAsync({ alert_id: alert.id });
      toastSuccess("Alert resolved");
    } catch (err) {
      toastError(`Resolve failed: ${getErrorMessage(err)}`);
    }
  };

  return (
    <li
      className={cn(
        "flex flex-col sm:flex-row sm:items-start gap-3 p-3 rounded-lg border",
        ALERT_ROW_TONE[sev],
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-text-primary">
            {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
          </span>
          <Badge className={cn("text-[10px]", sevBadge.tone)}>
            {sevBadge.label}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {alert.status}
          </Badge>
        </div>
        {alert.message && (
          <p className="text-sm text-text-secondary mt-1">{alert.message}</p>
        )}
        <p className="text-xs text-text-muted mt-1">
          <Link
            to={`/iot/devices/${alert.device_id}`}
            className="hover:text-primary underline-offset-2 hover:underline"
          >
            Device {alert.device_id.slice(0, 8)}…
          </Link>
          {" · "}
          Fired {formatDate(alert.fired_at)}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        {alert.status === "open" && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleAck}
            disabled={ack.isPending}
          >
            Acknowledge
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={handleResolve}
          disabled={resolve.isPending}
        >
          Resolve
        </Button>
      </div>
    </li>
  );
}

// ─── Devices list ────────────────────────────────────────────────────────

function DeviceListCard({
  devices,
  loading,
}: {
  devices: IoTDevice[];
  loading: boolean;
}) {
  const [filter, setFilter] = useState<
    "all" | "online" | "offline" | "stale" | "unbound"
  >("all");

  const visible = useMemo(() => {
    return devices.filter((d) => {
      if (filter === "all") return true;
      if (filter === "unbound") return !d.customer_id;
      const status = deviceStatus(d).label.toLowerCase();
      return status === filter;
    });
  }, [devices, filter]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle>Connected Devices</CardTitle>
          <div className="flex flex-wrap gap-1">
            {(["all", "online", "stale", "offline", "unbound"] as const).map(
              (f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "primary" : "ghost"}
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
          <div className="h-60 bg-bg-secondary animate-pulse rounded" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="📡"
            title={
              filter === "all"
                ? "No devices registered yet"
                : `No ${filter} devices`
            }
            description={
              filter === "all"
                ? "Manufactured units appear here once provisioned."
                : undefined
            }
          />
        ) : (
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {visible.map((device) => {
              const status = deviceStatus(device);
              return (
                <li key={device.id}>
                  <Link
                    to={`/iot/devices/${device.id}`}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-bg-secondary hover:bg-bg-hover transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={cn("w-2 h-2 rounded-full shrink-0", status.tone)}
                        aria-label={status.label}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary truncate">
                          {device.serial}
                        </p>
                        <p className="text-xs text-text-muted truncate">
                          {device.install_type
                            ? INSTALL_TYPE_LABELS[device.install_type]
                            : "Unbound"}
                          {device.firmware_version
                            ? ` · fw ${device.firmware_version}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-text-secondary">
                        {status.label}
                      </p>
                      {device.last_seen_at && (
                        <p className="text-[11px] text-text-muted">
                          {formatDate(device.last_seen_at)}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Recommendations ─────────────────────────────────────────────────────

function RecommendationsCard({
  recommendations,
  loading,
}: {
  recommendations: IoTAlert[];
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Maintenance Recommendations</CardTitle>
          <Badge variant="outline">{recommendations.length}</Badge>
        </div>
        <p className="text-sm text-text-secondary mt-1">
          Predictive alerts surfaced as service opportunities.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-60 bg-bg-secondary animate-pulse rounded" />
        ) : recommendations.length === 0 ? (
          <EmptyState
            icon="🛠️"
            title="No recommendations right now"
            description="Predictive alerts will appear here as fleet telemetry develops trends."
          />
        ) : (
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {recommendations.map((rec) => {
              const sevBadge = SEVERITY_BADGE[rec.severity];
              return (
                <li
                  key={rec.id}
                  className={cn(
                    "p-3 rounded-lg border",
                    ALERT_ROW_TONE[rec.severity],
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-text-primary">
                      {ALERT_TYPE_LABELS[rec.alert_type] ?? rec.alert_type}
                    </span>
                    <Badge className={cn("text-[10px]", sevBadge.tone)}>
                      {sevBadge.label}
                    </Badge>
                  </div>
                  {rec.message && (
                    <p className="text-sm text-text-secondary mt-1">
                      {rec.message}
                    </p>
                  )}
                  <p className="text-xs text-text-muted mt-1">
                    <Link
                      to={`/iot/devices/${rec.device_id}`}
                      className="hover:text-primary underline-offset-2 hover:underline"
                    >
                      Device {rec.device_id.slice(0, 8)}…
                    </Link>
                    {" · "}
                    {formatDate(rec.fired_at)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
