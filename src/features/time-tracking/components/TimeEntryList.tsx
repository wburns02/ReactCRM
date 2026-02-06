import { useState } from "react";
import {
  useTimeEntries,
  useApproveTimeEntry,
  type TimeEntryFilters,
} from "../api/timeTracking.ts";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { formatDate } from "@/lib/utils.ts";

interface TimeEntryListProps {
  technicianId?: string;
  showApprove?: boolean;
  defaultStatus?: string;
}

export function TimeEntryList({
  technicianId,
  showApprove = false,
  defaultStatus = "",
}: TimeEntryListProps) {
  const [filters, setFilters] = useState<TimeEntryFilters>({
    page: 1,
    page_size: 20,
    technician_id: technicianId,
  });
  const [statusFilter, setStatusFilter] = useState<string>(defaultStatus);

  const { data, isLoading, error } = useTimeEntries({
    ...filters,
    status: statusFilter || undefined,
  });
  const approveEntry = useApproveTimeEntry();

  const entries = (data as any) || [];
  const total = entries.length || 0;
  const totalPages = Math.ceil(total / (filters.page_size || 20));

  const formatTime = (isoString: string | null): string => {
    if (!isoString) return "-";
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatHours = (hours: number): string => {
    return hours.toFixed(2);
  };

  const getStatusVariant = (
    status: string,
  ): "success" | "warning" | "danger" | "default" => {
    switch (status) {
      case "approved":
        return "success";
      case "pending":
        return "warning";
      case "rejected":
        return "danger";
      default:
        return "default";
    }
  };

  const getEntryTypeIcon = (type: string): string => {
    switch (type) {
      case "work":
        return "🔧";
      case "travel":
        return "🚗";
      case "break":
        return "☕";
      case "pto":
        return "🏖️";
      default:
        return "⏱️";
    }
  };

  const handleApprove = async (entryId: string) => {
    try {
      await approveEntry.mutateAsync(entryId);
    } catch (err) {
      console.error("Failed to approve entry:", err);
    }
  };

  if (error) {
    return (
      <div className="bg-bg-error/10 border border-border-error rounded-lg p-4 text-text-error">
        Error loading time entries: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setFilters((prev) => ({ ...prev, page: 1 }));
          }}
          className="px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-bg-muted rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && entries.length === 0 && (
        <div className="text-center py-12 border border-border rounded-lg">
          <span className="text-4xl mb-4 block">⏱️</span>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            No time entries found
          </h3>
          <p className="text-text-muted">
            {statusFilter
              ? "Try adjusting your filters"
              : "Time entries will appear here"}
          </p>
        </div>
      )}

      {/* Time entry list */}
      {!isLoading && entries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">
                  Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">
                  Type
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">
                  Clock In
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">
                  Clock Out
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">
                  Regular
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">
                  OT
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-text-muted">
                  Status
                </th>
                {showApprove && (
                  <th className="text-center py-3 px-4 text-sm font-medium text-text-muted">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry: any) => (
                <tr
                  key={entry.id}
                  className="border-b border-border hover:bg-bg-hover"
                >
                  <td className="py-3 px-4">
                    <span className="font-medium text-text-primary">
                      {formatDate(entry.entry_date)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-2">
                      <span>{getEntryTypeIcon(entry.entry_type)}</span>
                      <span className="capitalize text-text-primary">
                        {entry.entry_type}
                      </span>
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-text-primary">
                    {formatTime(entry.clock_in)}
                  </td>
                  <td className="py-3 px-4 font-mono text-text-primary">
                    {formatTime(entry.clock_out)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-text-primary">
                    {formatHours(entry.regular_hours)}h
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {entry.overtime_hours > 0 ? (
                      <span className="text-warning font-medium">
                        {formatHours(entry.overtime_hours)}h
                      </span>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant={getStatusVariant(entry.status)}>
                      {entry.status}
                    </Badge>
                  </td>
                  {showApprove && (
                    <td className="py-3 px-4 text-center">
                      {entry.status === "pending" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleApprove(entry.id)}
                          disabled={approveEntry.isPending}
                        >
                          Approve
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-text-muted">
            Showing {((filters.page || 1) - 1) * (filters.page_size || 20) + 1}{" "}
            to{" "}
            {Math.min((filters.page || 1) * (filters.page_size || 20), total)}{" "}
            of {total} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setFilters((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))
              }
              disabled={(filters.page || 1) <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-text-muted">
              Page {filters.page || 1} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))
              }
              disabled={(filters.page || 1) >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
