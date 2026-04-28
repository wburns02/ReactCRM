/**
 * IoT Device Detail page (route: `/iot/devices/:id`).
 *
 * Displays:
 *  - Device metadata (serial, install type, firmware, last seen, customer binding)
 *  - Live telemetry charts (line chart per sensor_type)
 *  - Open + recent alert history
 *  - Binding history (audit trail)
 *
 * Spec §10 + react-crm-api `IoTDeviceDetail` schema.
 */
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Cpu,
  Edit3,
  Link as LinkIcon,
  Unlink,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { toastError, toastSuccess } from "@/components/ui/Toast";
import { getErrorMessage } from "@/api/client";

import {
  useDeviceDetail,
  useUnbindDevice,
  useAcknowledgeAlert,
  useResolveAlert,
} from "@/api/hooks/useIoT";
import {
  ALERT_TYPE_LABELS,
  INSTALL_TYPE_LABELS,
  type IoTAlert,
  type IoTDeviceDetail,
  type IoTTelemetry,
  type AlertSeverity,
} from "@/api/types/iot";
import { formatDate, cn } from "@/lib/utils";
import { DeviceBindModal } from "./DeviceBindModal";

// ─── Helpers ─────────────────────────────────────────────────────────────

const SEVERITY_BADGE: Record<AlertSeverity, { tone: string; label: string }> = {
  critical: { tone: "bg-error text-white", label: "Critical" },
  high: { tone: "bg-warning text-white", label: "High" },
  medium: { tone: "bg-info text-white", label: "Medium" },
  low: { tone: "bg-text-muted text-white", label: "Low" },
};

const CHART_SENSORS = ["pump_current", "soil_moisture", "tank_level"] as const;
type ChartSensor = (typeof CHART_SENSORS)[number];

const CHART_COLORS: Record<ChartSensor, string> = {
  pump_current: "#2aabe1",
  soil_moisture: "#22c55e",
  tank_level: "#f59e0b",
};

const SENSOR_LABELS: Record<ChartSensor, string> = {
  pump_current: "Pump Current (A)",
  soil_moisture: "Soil Moisture (%)",
  tank_level: "Tank Level (%)",
};

interface ChartPoint {
  time: number; // epoch ms
  pump_current?: number;
  soil_moisture?: number;
  tank_level?: number;
}

/**
 * Bucket telemetry rows into a single time-indexed series for recharts.
 */
function buildChartData(rows: IoTTelemetry[]): ChartPoint[] {
  const buckets = new Map<number, ChartPoint>();
  for (const row of rows) {
    if (
      !CHART_SENSORS.includes(row.sensor_type as ChartSensor) ||
      row.value_numeric == null
    ) {
      continue;
    }
    const t = new Date(row.time).getTime();
    if (Number.isNaN(t)) continue;
    const bucket = buckets.get(t) ?? { time: t };
    bucket[row.sensor_type as ChartSensor] = row.value_numeric;
    buckets.set(t, bucket);
  }
  return [...buckets.values()].sort((a, b) => a.time - b.time);
}

function formatTick(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Page ────────────────────────────────────────────────────────────────

export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: device, isLoading, error } = useDeviceDetail(id);
  const [bindOpen, setBindOpen] = useState(false);

  const unbind = useUnbindDevice();

  const handleUnbind = async () => {
    if (!device) return;
    if (!confirm("Unbind this device from its customer? This is auditable.")) {
      return;
    }
    try {
      await unbind.mutateAsync({ device_id: device.id });
      toastSuccess("Device unbound");
    } catch (err) {
      toastError(`Unbind failed: ${getErrorMessage(err)}`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
        <div className="h-8 w-64 bg-bg-secondary animate-pulse rounded mb-4" />
        <div className="h-64 bg-bg-secondary animate-pulse rounded" />
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
        <Link
          to="/iot"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to IoT
        </Link>
        <EmptyState
          icon="❌"
          title="Device not found"
          description="The requested device does not exist or you don't have access."
          action={{ label: "Back to IoT", to: "/iot" }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
      <Link
        to="/iot"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to IoT
      </Link>

      <DeviceHeader
        device={device}
        onBind={() => setBindOpen(true)}
        onUnbind={handleUnbind}
        unbindPending={unbind.isPending}
      />

      <TelemetryChartCard rows={device.recent_telemetry ?? []} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OpenAlertsCard alerts={device.open_alerts ?? []} />
        <BindingHistoryCard device={device} />
      </div>

      <DeviceBindModal
        open={bindOpen}
        onClose={() => setBindOpen(false)}
        device={device}
      />
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────

function DeviceHeader({
  device,
  onBind,
  onUnbind,
  unbindPending,
}: {
  device: IoTDeviceDetail;
  onBind: () => void;
  onUnbind: () => void;
  unbindPending: boolean;
}) {
  const isBound = !!device.customer_id;
  const lastSeen = device.last_seen_at
    ? formatDate(device.last_seen_at)
    : "Never";

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-text-primary break-all">
              {device.serial}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {device.install_type ? (
                <Badge variant="outline">
                  {INSTALL_TYPE_LABELS[device.install_type]}
                </Badge>
              ) : (
                <Badge variant="outline">Unbound</Badge>
              )}
              {device.firmware_version && (
                <Badge variant="outline">fw {device.firmware_version}</Badge>
              )}
              {device.hardware_revision && (
                <Badge variant="outline">hw {device.hardware_revision}</Badge>
              )}
              {device.archived_at && (
                <Badge className="bg-text-muted text-white">Archived</Badge>
              )}
            </div>
            <p className="text-xs text-text-muted mt-2">
              Last seen: <span className="font-medium">{lastSeen}</span>
              {device.customer_id && (
                <>
                  {" · "}
                  Customer:{" "}
                  <Link
                    to={`/customers/${device.customer_id}`}
                    className="font-medium hover:text-primary underline-offset-2 hover:underline"
                  >
                    {device.customer_id.slice(0, 8)}…
                  </Link>
                </>
              )}
            </p>
            {device.notes && (
              <p className="text-xs text-text-secondary mt-2 italic">
                {device.notes}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {isBound ? (
            <>
              <Button variant="outline" size="sm" onClick={onBind}>
                <Edit3 className="w-4 h-4 mr-1" />
                Re-bind
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onUnbind}
                disabled={unbindPending}
              >
                <Unlink className="w-4 h-4 mr-1" />
                Unbind
              </Button>
            </>
          ) : (
            <Button variant="primary" size="sm" onClick={onBind}>
              <LinkIcon className="w-4 h-4 mr-1" />
              Bind to Customer
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Telemetry chart ─────────────────────────────────────────────────────

function TelemetryChartCard({ rows }: { rows: IoTTelemetry[] }) {
  const data = useMemo(() => buildChartData(rows), [rows]);
  const presentSensors = useMemo(() => {
    const set = new Set<ChartSensor>();
    for (const r of rows) {
      if (CHART_SENSORS.includes(r.sensor_type as ChartSensor)) {
        set.add(r.sensor_type as ChartSensor);
      }
    }
    return [...set];
  }, [rows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Telemetry</CardTitle>
        <p className="text-sm text-text-secondary mt-1">
          Pump current, soil moisture, and tank level over the most recent
          check-ins.
        </p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState
            icon="📊"
            title="No telemetry yet"
            description="Charts will populate once the device starts checking in."
          />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb22" />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  scale="time"
                  tickFormatter={formatTick}
                  tick={{ fontSize: 11 }}
                  stroke="currentColor"
                />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" />
                <Tooltip
                  labelFormatter={(t: number) => formatTick(t)}
                  contentStyle={{
                    background: "var(--color-bg-card, #fff)",
                    border: "1px solid var(--color-border, #e5e7eb)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {presentSensors.map((sensor) => (
                  <Line
                    key={sensor}
                    type="monotone"
                    dataKey={sensor}
                    name={SENSOR_LABELS[sensor]}
                    stroke={CHART_COLORS[sensor]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Open alerts ─────────────────────────────────────────────────────────

function OpenAlertsCard({ alerts }: { alerts: IoTAlert[] }) {
  const ack = useAcknowledgeAlert();
  const resolve = useResolveAlert();

  const handleAck = async (id: string) => {
    try {
      await ack.mutateAsync({ alert_id: id });
      toastSuccess("Alert acknowledged");
    } catch (err) {
      toastError(`Acknowledge failed: ${getErrorMessage(err)}`);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await resolve.mutateAsync({ alert_id: id });
      toastSuccess("Alert resolved");
    } catch (err) {
      toastError(`Resolve failed: ${getErrorMessage(err)}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Open Alerts</CardTitle>
          <Badge variant="outline">{alerts.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <EmptyState
            icon="✅"
            title="No open alerts"
            description="This device is healthy."
          />
        ) : (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {alerts.map((alert) => {
              const sevBadge = SEVERITY_BADGE[alert.severity];
              return (
                <li
                  key={alert.id}
                  className="flex flex-col sm:flex-row sm:items-start gap-2 p-3 rounded-lg border border-border bg-bg-secondary"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
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
                      <p className="text-sm text-text-secondary mt-1">
                        {alert.message}
                      </p>
                    )}
                    <p className="text-[11px] text-text-muted mt-1">
                      Fired {formatDate(alert.fired_at)}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {alert.status === "open" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAck(alert.id)}
                        disabled={ack.isPending}
                      >
                        Ack
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolve(alert.id)}
                      disabled={resolve.isPending}
                    >
                      Resolve
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Binding history ─────────────────────────────────────────────────────

function BindingHistoryCard({ device }: { device: IoTDeviceDetail }) {
  const bindings = device.bindings ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Binding History</CardTitle>
          <Badge variant="outline">{bindings.length}</Badge>
        </div>
        <p className="text-sm text-text-secondary mt-1">
          Audit log of every customer pairing.
        </p>
      </CardHeader>
      <CardContent>
        {bindings.length === 0 ? (
          <EmptyState
            icon="🔗"
            title="Never bound"
            description="This device has not been paired with a customer yet."
          />
        ) : (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {bindings.map((b) => (
              <li
                key={b.id}
                className="p-3 rounded-lg border border-border bg-bg-secondary"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/customers/${b.customer_id}`}
                    className="font-medium hover:text-primary underline-offset-2 hover:underline"
                  >
                    {b.customer_id.slice(0, 8)}…
                  </Link>
                  {b.install_type && (
                    <Badge variant="outline" className="text-[10px]">
                      {INSTALL_TYPE_LABELS[b.install_type]}
                    </Badge>
                  )}
                  {b.unbound_at ? (
                    <Badge className="bg-text-muted text-white text-[10px]">
                      Unbound
                    </Badge>
                  ) : (
                    <Badge className="bg-success text-white text-[10px]">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  Bound {formatDate(b.bound_at)}
                  {b.unbound_at && (
                    <> · Unbound {formatDate(b.unbound_at)}</>
                  )}
                </p>
                {b.unbind_reason && (
                  <p className="text-xs text-text-secondary mt-1">
                    Reason: {b.unbind_reason}
                  </p>
                )}
                {b.notes && (
                  <p className="text-xs text-text-secondary mt-1 italic">
                    {b.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
