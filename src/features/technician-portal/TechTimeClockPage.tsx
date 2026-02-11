import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useTechnicianDashboard,
  useClockIn,
  useClockOut,
  useTechTimeEntries,
} from "@/api/hooks/useTechPortal.ts";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";
import { useQueryClient } from "@tanstack/react-query";

// ── Helpers ──────────────────────────────────────────────────

function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return "--:--";
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatHoursDecimal(hours: number | null | undefined): string {
  if (hours == null || hours <= 0) return "0.0h";
  return hours.toFixed(1) + "h";
}

function formatElapsedReadable(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  }
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function statusBadgeVariant(
  status: string | null | undefined,
): "warning" | "success" | "info" | "default" {
  switch (status) {
    case "pending":
      return "warning";
    case "approved":
      return "success";
    case "submitted":
      return "info";
    default:
      return "default";
  }
}

function statusLabel(status: string | null | undefined): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "submitted":
      return "Submitted";
    case "rejected":
      return "Rejected";
    default:
      return status || "Active";
  }
}

// Last 7 days date range helper
function getLast7DaysRange(): { start_date: string; end_date: string } {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  return { start_date: start.toISOString().split("T")[0], end_date: end };
}

// ── Live Elapsed Timer ───────────────────────────────────────

function ElapsedTimer({ clockInTime }: { clockInTime: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startMs = new Date(clockInTime).getTime();

    function update() {
      const nowMs = Date.now();
      setElapsed(Math.max(0, Math.floor((nowMs - startMs) / 1000)));
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [clockInTime]);

  return (
    <div className="text-center">
      <p className="text-3xl sm:text-4xl md:text-5xl font-mono font-black text-text-primary tracking-wider">
        {formatElapsedReadable(elapsed)}
      </p>
      <p className="text-sm text-text-muted mt-1">Time on the clock</p>
    </div>
  );
}

// ── Clock Button ─────────────────────────────────────────────

function ClockButton({
  isClockedIn,
  isLoading,
  onClockIn,
  onClockOut,
}: {
  isClockedIn: boolean;
  isLoading: boolean;
  onClockIn: () => void;
  onClockOut: () => void;
}) {
  return (
    <button
      type="button"
      onClick={isClockedIn ? onClockOut : onClockIn}
      disabled={isLoading}
      className={`
        w-full h-20 rounded-2xl text-2xl font-black text-white
        shadow-lg transition-all duration-200 active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${
          isClockedIn
            ? "bg-gradient-to-b from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 shadow-red-200 dark:shadow-red-900/30"
            : "bg-gradient-to-b from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 shadow-green-200 dark:shadow-green-900/30"
        }
      `}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <svg
            className="animate-spin h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Working...
        </span>
      ) : isClockedIn ? (
        "🔴 CLOCK OUT"
      ) : (
        "🟢 CLOCK IN"
      )}
    </button>
  );
}

// ── Status Display ───────────────────────────────────────────

function StatusDisplay({
  isClockedIn,
  clockInTime,
}: {
  isClockedIn: boolean;
  clockInTime: string | null | undefined;
}) {
  if (!isClockedIn || !clockInTime) {
    return (
      <Card className="border-2 border-dashed border-border">
        <CardContent className="py-8 text-center">
          <p className="text-4xl mb-3">😴</p>
          <p className="text-xl font-bold text-text-secondary">
            Not clocked in
          </p>
          <p className="text-sm text-text-muted mt-1">
            Hit the green button to start your day!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20">
      <CardContent className="py-6">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <p className="text-sm font-semibold text-green-700 dark:text-green-400">
            Clocked in since {formatTime(clockInTime)}
          </p>
        </div>

        <ElapsedTimer clockInTime={clockInTime} />
      </CardContent>
    </Card>
  );
}

// ── Today's Hours Card ───────────────────────────────────────

function TodayHoursCard({ hoursWorked }: { hoursWorked: number }) {
  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-2xl sm:text-3xl">⏱️</span>
            <div>
              <p className="text-sm text-text-muted">Today's Hours</p>
              <p className="text-2xl sm:text-3xl font-black text-text-primary">
                {hoursWorked.toFixed(1)}h
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-text-muted">Standard Day</p>
            <p className="text-lg font-semibold text-text-secondary">8.0h</p>
          </div>
        </div>

        {/* Simple progress bar */}
        <div className="mt-3">
          <div className="w-full bg-bg-muted rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                hoursWorked >= 8
                  ? "bg-green-500"
                  : hoursWorked >= 6
                    ? "bg-blue-500"
                    : "bg-orange-400"
              }`}
              style={{ width: `${Math.min(100, (hoursWorked / 8) * 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Time Entry Row ───────────────────────────────────────────

function TimeEntryRow({
  entry,
}: {
  entry: {
    id: string;
    entry_date: string | null | undefined;
    clock_in: string | null | undefined;
    clock_out: string | null | undefined;
    regular_hours: number | null | undefined;
    overtime_hours: number | null | undefined;
    status: string | null | undefined;
    notes: string | null | undefined;
  };
}) {
  const totalHours =
    (entry.regular_hours || 0) + (entry.overtime_hours || 0);
  const hasOvertime = (entry.overtime_hours || 0) > 0;

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary">
          {formatDate(entry.entry_date || entry.clock_in)}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text-muted">
            {formatTime(entry.clock_in)}
          </span>
          <span className="text-xs text-text-muted">-</span>
          <span className="text-xs text-text-muted">
            {entry.clock_out ? formatTime(entry.clock_out) : "Active"}
          </span>
        </div>
        {entry.notes && (
          <p className="text-xs text-text-muted mt-0.5 truncate">
            {entry.notes}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 ml-3">
        <div className="text-right">
          <p className="text-lg font-bold text-text-primary">
            {formatHoursDecimal(totalHours)}
          </p>
          {hasOvertime && (
            <p className="text-xs text-orange-500 font-medium">
              +{formatHoursDecimal(entry.overtime_hours)} OT
            </p>
          )}
        </div>
        <Badge variant={statusBadgeVariant(entry.status)} size="sm">
          {statusLabel(entry.status)}
        </Badge>
      </div>
    </div>
  );
}

// ── Time History List ────────────────────────────────────────

function TimeHistoryList({
  entries,
  isLoading,
}: {
  entries: Array<{
    id: string;
    entry_date: string | null | undefined;
    clock_in: string | null | undefined;
    clock_out: string | null | undefined;
    regular_hours: number | null | undefined;
    overtime_hours: number | null | undefined;
    status: string | null | undefined;
    notes: string | null | undefined;
  }>;
  isLoading: boolean;
}) {
  // Weekly totals
  const weeklyTotal = useMemo(() => {
    let regular = 0;
    let overtime = 0;
    for (const e of entries) {
      regular += e.regular_hours || 0;
      overtime += e.overtime_hours || 0;
    }
    return { regular, overtime, total: regular + overtime };
  }, [entries]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-5 pb-5">
          <Skeleton className="h-5 w-40 mb-4" variant="rounded" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" variant="rounded" />
                <Skeleton className="h-3 w-36" variant="rounded" />
              </div>
              <Skeleton className="h-6 w-16" variant="rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-5 pb-2">
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-1">
          <span className="text-2xl">📅</span> Last 7 Days
        </h2>

        {/* Weekly summary bar */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-3 py-2 px-3 rounded-lg bg-bg-muted/50">
          <div>
            <span className="text-xs text-text-muted">Total</span>
            <p className="text-lg font-bold text-text-primary">
              {formatHoursDecimal(weeklyTotal.total)}
            </p>
          </div>
          <div>
            <span className="text-xs text-text-muted">Regular</span>
            <p className="text-sm font-semibold text-text-secondary">
              {formatHoursDecimal(weeklyTotal.regular)}
            </p>
          </div>
          {weeklyTotal.overtime > 0 && (
            <div>
              <span className="text-xs text-text-muted">Overtime</span>
              <p className="text-sm font-semibold text-orange-500">
                {formatHoursDecimal(weeklyTotal.overtime)}
              </p>
            </div>
          )}
          <div className="ml-auto">
            <span className="text-xs text-text-muted">Entries</span>
            <p className="text-sm font-semibold text-text-secondary">
              {entries.length}
            </p>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-text-secondary text-sm">
              No time entries in the last 7 days
            </p>
          </div>
        ) : (
          <div>
            {entries.map((entry) => (
              <TimeEntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────

function TimeClockSkeleton() {
  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto">
      {/* Title */}
      <Skeleton className="h-8 w-48" variant="rounded" />
      {/* Clock button */}
      <Skeleton className="h-20 rounded-2xl" />
      {/* Status */}
      <Skeleton className="h-36 rounded-xl" />
      {/* Today's hours */}
      <Skeleton className="h-24 rounded-xl" />
      {/* History */}
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export function TechTimeClockPage() {
  const queryClient = useQueryClient();
  const { data: dashboard, isLoading: dashLoading } = useTechnicianDashboard();
  const clockIn = useClockIn();
  const clockOut = useClockOut();

  const dateRange = useMemo(() => getLast7DaysRange(), []);
  const { data: timeEntries, isLoading: entriesLoading } = useTechTimeEntries(dateRange);

  const isClockedIn = dashboard?.clock_status?.is_clocked_in || false;
  const clockInTime = dashboard?.clock_status?.clock_in_time || null;
  const hoursWorked = dashboard?.today_stats?.hours_worked || 0;

  const isClockLoading = clockIn.isPending || clockOut.isPending;

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["technician-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["employee"] });
    queryClient.invalidateQueries({ queryKey: ["tech-portal", "time-entries"] });
  }, [queryClient]);

  const handleClockIn = useCallback(async () => {
    try {
      // Try GPS
      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
          }),
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        // GPS is optional
      }
      await clockIn.mutateAsync({ latitude, longitude });
      toastSuccess("Clocked in! Let's get to work!");
      invalidateAll();
    } catch {
      toastError("Couldn't clock in. Try again.");
    }
  }, [clockIn, invalidateAll]);

  const handleClockOut = useCallback(async () => {
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
          }),
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        // GPS is optional
      }
      await clockOut.mutateAsync({ latitude, longitude });
      toastSuccess("Clocked out! Great work today!");
      invalidateAll();
    } catch {
      toastError("Couldn't clock out. Try again.");
    }
  }, [clockOut, invalidateAll]);

  if (dashLoading) return <TimeClockSkeleton />;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-20">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">⏰</span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Time Clock</h1>
          <p className="text-sm text-text-muted">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Section 1: Giant Clock In/Out Button */}
      <ClockButton
        isClockedIn={isClockedIn}
        isLoading={isClockLoading}
        onClockIn={handleClockIn}
        onClockOut={handleClockOut}
      />

      {/* Section 2: Status Display + Elapsed Timer */}
      <StatusDisplay isClockedIn={isClockedIn} clockInTime={clockInTime} />

      {/* Section 3: Today's Hours */}
      <TodayHoursCard hoursWorked={hoursWorked} />

      {/* Section 4: Quick Actions */}
      {isClockedIn && (
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="lg"
                className="h-14 text-base font-semibold"
                onClick={() => {
                  toastSuccess("Break started! Take your time.");
                }}
              >
                ☕ Start Break
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14 text-base font-semibold"
                onClick={() => {
                  toastSuccess("Break ended! Back at it.");
                }}
              >
                🔨 End Break
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 5: Time Entry History (Last 7 Days) */}
      <TimeHistoryList
        entries={timeEntries ?? []}
        isLoading={entriesLoading}
      />
    </div>
  );
}
