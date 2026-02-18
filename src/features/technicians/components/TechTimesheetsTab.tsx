import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { useTimeEntries } from "@/api/hooks/usePayroll.ts";
import { formatDate } from "@/lib/utils.ts";

interface TechTimesheetsTabProps {
  technicianId: string;
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const STATUS_BADGE_VARIANT: Record<string, "default" | "success" | "warning" | "danger"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const TYPE_LABELS: Record<string, string> = {
  work: "Work",
  travel: "Travel",
  break: "Break",
  pto: "PTO",
};

function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export function TechTimesheetsTab({ technicianId }: TechTimesheetsTabProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: allEntries, isLoading } = useTimeEntries({
    technician_id: technicianId,
  });

  const entries = useMemo(() => {
    const items = allEntries ?? [];
    if (statusFilter === "all") return items;
    return items.filter((e) => e.status === statusFilter);
  }, [allEntries, statusFilter]);

  const summaryStats = useMemo(() => {
    const items = allEntries ?? [];
    const regularHours = items.reduce(
      (sum, e) => sum + (e.regular_hours ?? 0),
      0,
    );
    const overtimeHours = items.reduce(
      (sum, e) => sum + (e.overtime_hours ?? 0),
      0,
    );
    const pendingCount = items.filter((e) => e.status === "pending").length;
    return { regularHours, overtimeHours, pendingCount };
  }, [allEntries]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-text-muted">Regular Hours</p>
            <p className="text-3xl font-bold text-text-primary">
              {summaryStats.regularHours.toFixed(1)}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-text-muted">Overtime Hours</p>
            <p className="text-3xl font-bold text-warning">
              {summaryStats.overtimeHours.toFixed(1)}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-text-muted">Pending Approval</p>
            <p className="text-3xl font-bold text-primary">
              {summaryStats.pendingCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Entries */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>
              Time Entries {allEntries ? `(${entries.length})` : ""}
            </CardTitle>
            <div className="flex gap-2">
              {(["all", "pending", "approved", "rejected"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? "primary" : "secondary"}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-bg-muted rounded" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="text-center text-text-muted py-8">
              {statusFilter === "all"
                ? "No time entries recorded"
                : `No ${statusFilter} entries`}
            </p>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 text-text-muted font-medium">Date</th>
                      <th className="pb-3 text-text-muted font-medium">Clock In</th>
                      <th className="pb-3 text-text-muted font-medium">Clock Out</th>
                      <th className="pb-3 text-text-muted font-medium text-right">Regular</th>
                      <th className="pb-3 text-text-muted font-medium text-right">OT</th>
                      <th className="pb-3 text-text-muted font-medium">Type</th>
                      <th className="pb-3 text-text-muted font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-bg-hover transition-colors">
                        <td className="py-3 text-text-primary">
                          {entry.date
                            ? formatDate(entry.date)
                            : "-"}
                        </td>
                        <td className="py-3 text-text-primary font-mono text-xs">
                          {formatTime(entry.clock_in)}
                        </td>
                        <td className="py-3 text-text-primary font-mono text-xs">
                          {formatTime(entry.clock_out)}
                        </td>
                        <td className="py-3 text-text-primary text-right">
                          {entry.regular_hours?.toFixed(1) ?? "0.0"}h
                        </td>
                        <td className="py-3 text-right">
                          <span className={entry.overtime_hours && entry.overtime_hours > 0 ? "text-warning font-medium" : "text-text-muted"}>
                            {entry.overtime_hours?.toFixed(1) ?? "0.0"}h
                          </span>
                        </td>
                        <td className="py-3">
                          <Badge variant="default">
                            {TYPE_LABELS[(entry as Record<string, unknown>).entry_type as string] ??
                              (entry as Record<string, unknown>).entry_type ?? "Work"}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Badge variant={STATUS_BADGE_VARIANT[entry.status] ?? "default"}>
                            {entry.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-text-primary">
                        {entry.date ? formatDate(entry.date) : "-"}
                      </span>
                      <Badge variant={STATUS_BADGE_VARIANT[entry.status] ?? "default"}>
                        {entry.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-text-muted">In: </span>
                        <span className="text-text-primary font-mono text-xs">
                          {formatTime(entry.clock_in)}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted">Out: </span>
                        <span className="text-text-primary font-mono text-xs">
                          {formatTime(entry.clock_out)}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted">Regular: </span>
                        <span className="text-text-primary">
                          {entry.regular_hours?.toFixed(1) ?? "0.0"}h
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted">OT: </span>
                        <span className={entry.overtime_hours && entry.overtime_hours > 0 ? "text-warning font-medium" : "text-text-muted"}>
                          {entry.overtime_hours?.toFixed(1) ?? "0.0"}h
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
