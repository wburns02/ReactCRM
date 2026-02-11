import { useState, useMemo, useEffect } from "react";
import {
  useTimeEntries,
  useApproveTimeEntry,
  useRejectTimeEntry,
  useDeleteTimeEntry,
  useBulkApproveTimeEntries,
  type TimeEntry,
  type TimeEntryFilters,
} from "../api/timeTracking.ts";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { ConfirmDialog } from "@/components/ui/Dialog.tsx";
import { formatDate } from "@/lib/utils.ts";
import { TimeEntryDetailModal } from "./TimeEntryDetailModal.tsx";

interface TimeEntryListProps {
  technicianId?: string;
  showApprove?: boolean;
  defaultStatus?: string;
}

type SortField =
  | "entry_date"
  | "entry_type"
  | "regular_hours"
  | "overtime_hours"
  | "status";
type SortOrder = "asc" | "desc";

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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [entryTypeFilter, setEntryTypeFilter] = useState("");

  // Sorting
  const [sortBy, setSortBy] = useState<SortField>("entry_date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Detail modal
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Delete confirmation
  const [entryToDelete, setEntryToDelete] = useState<TimeEntry | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Bulk confirmation
  const [showBulkApproveConfirm, setShowBulkApproveConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const { data, isLoading, error } = useTimeEntries({
    ...filters,
    status: statusFilter || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  });
  const approveEntry = useApproveTimeEntry();
  const rejectEntry = useRejectTimeEntry();
  const deleteEntry = useDeleteTimeEntry();
  const bulkApprove = useBulkApproveTimeEntries();

  // Parse response — backend returns { entries: [...], total, page, page_size }
  const rawEntries: TimeEntry[] = data?.entries || [];
  const total = data?.total || rawEntries.length;
  const pageSize = filters.page_size || 20;
  const totalPages = Math.ceil(total / pageSize);

  // Client-side entry type filter (backend doesn't support entry_type param)
  const filteredEntries = useMemo(() => {
    if (!entryTypeFilter) return rawEntries;
    return rawEntries.filter((e) => e.entry_type === entryTypeFilter);
  }, [rawEntries, entryTypeFilter]);

  // Client-side sorting
  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "entry_date":
          cmp = (a.entry_date || "").localeCompare(b.entry_date || "");
          break;
        case "entry_type":
          cmp = (a.entry_type || "").localeCompare(b.entry_type || "");
          break;
        case "regular_hours":
          cmp = (a.regular_hours || 0) - (b.regular_hours || 0);
          break;
        case "overtime_hours":
          cmp = (a.overtime_hours || 0) - (b.overtime_hours || 0);
          break;
        case "status":
          cmp = (a.status || "").localeCompare(b.status || "");
          break;
      }
      return sortOrder === "desc" ? -cmp : cmp;
    });
  }, [filteredEntries, sortBy, sortOrder]);

  // Clear selection when filters/page change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [statusFilter, startDate, endDate, entryTypeFilter, filters.page]);

  // Reset page on filter change
  const resetPage = () => setFilters((prev) => ({ ...prev, page: 1 }));

  const handleApprove = async (entryId: string) => {
    await approveEntry.mutateAsync(entryId);
  };

  const handleReject = async (entryId: string) => {
    await rejectEntry.mutateAsync(entryId);
  };

  const handleDelete = async () => {
    if (!entryToDelete) return;
    await deleteEntry.mutateAsync(entryToDelete.id);
    setShowDeleteConfirm(false);
    setEntryToDelete(null);
  };

  const handleBulkApprove = async () => {
    await bulkApprove.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
    setShowBulkApproveConfirm(false);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try {
        await deleteEntry.mutateAsync(id);
      } catch {
        // Some may fail (non-pending) — continue
      }
    }
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedEntries.length && sortedEntries.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedEntries.map((e) => e.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

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

  const hasActiveFilters =
    statusFilter !== defaultStatus || startDate || endDate || entryTypeFilter;

  const clearFilters = () => {
    setStatusFilter(defaultStatus);
    setStartDate("");
    setEndDate("");
    setEntryTypeFilter("");
    resetPage();
  };

  // Totals for current page
  const pageTotalRegular = sortedEntries.reduce(
    (sum, e) => sum + (e.regular_hours || 0),
    0,
  );
  const pageTotalOT = sortedEntries.reduce(
    (sum, e) => sum + (e.overtime_hours || 0),
    0,
  );

  const SortHeader = ({
    field,
    children,
    className = "",
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => {
    const isActive = sortBy === field;
    return (
      <th
        className={`py-3 px-4 text-sm font-medium text-text-muted cursor-pointer hover:text-text-primary select-none ${className}`}
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          {isActive && (
            <span className="text-xs">
              {sortOrder === "asc" ? "▲" : "▼"}
            </span>
          )}
        </div>
      </th>
    );
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
      <div className="flex flex-wrap gap-3 items-end">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            resetPage();
          }}
          className="px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary text-sm"
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={entryTypeFilter}
          onChange={(e) => {
            setEntryTypeFilter(e.target.value);
            resetPage();
          }}
          className="px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary text-sm"
          aria-label="Filter by type"
        >
          <option value="">All Types</option>
          <option value="work">Work</option>
          <option value="travel">Travel</option>
          <option value="break">Break</option>
          <option value="pto">PTO</option>
        </select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              resetPage();
            }}
            className="px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary text-sm"
            aria-label="Start date"
          />
          <span className="text-text-muted text-sm">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              resetPage();
            }}
            className="px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary text-sm"
            aria-label="End date"
          />
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            ✕ Clear Filters
          </Button>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium text-text-primary">
            {selectedIds.size} {selectedIds.size === 1 ? "entry" : "entries"}{" "}
            selected
          </span>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowBulkApproveConfirm(true)}
              disabled={bulkApprove.isPending}
            >
              {bulkApprove.isPending ? "Approving..." : "Approve Selected"}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowBulkDeleteConfirm(true)}
              disabled={deleteEntry.isPending}
            >
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-bg-muted rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sortedEntries.length === 0 && (
        <div className="text-center py-12 border border-border rounded-lg">
          <span className="text-4xl mb-4 block">⏱️</span>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            No time entries found
          </h3>
          <p className="text-text-muted">
            {hasActiveFilters
              ? "Try adjusting your filters"
              : "Time entries will appear here"}
          </p>
        </div>
      )}

      {/* Time entry table */}
      {!isLoading && sortedEntries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size === sortedEntries.length &&
                      sortedEntries.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-border"
                    aria-label="Select all"
                  />
                </th>
                <SortHeader field="entry_date" className="text-left">
                  Date
                </SortHeader>
                <SortHeader field="entry_type" className="text-left">
                  Type
                </SortHeader>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">
                  Clock In
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">
                  Clock Out
                </th>
                <SortHeader field="regular_hours" className="text-right">
                  Regular
                </SortHeader>
                <SortHeader field="overtime_hours" className="text-right">
                  OT
                </SortHeader>
                <SortHeader field="status" className="text-center">
                  Status
                </SortHeader>
                <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry: TimeEntry) => (
                <tr
                  key={entry.id}
                  className="border-b border-border hover:bg-bg-hover cursor-pointer"
                  onClick={() => {
                    setSelectedEntry(entry);
                    setShowDetailModal(true);
                  }}
                >
                  <td
                    className="py-3 px-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(entry.id)}
                      onChange={() => toggleOne(entry.id)}
                      className="rounded border-border"
                      aria-label={`Select entry ${entry.entry_date}`}
                    />
                  </td>
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
                  <td
                    className="py-3 px-4 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-end gap-1">
                      {entry.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="min-w-[32px] min-h-[32px] p-1"
                            onClick={() => handleApprove(entry.id)}
                            disabled={approveEntry.isPending}
                            title="Approve"
                          >
                            <span className="text-success">✓</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="min-w-[32px] min-h-[32px] p-1"
                            onClick={() => handleReject(entry.id)}
                            disabled={rejectEntry.isPending}
                            title="Reject"
                          >
                            <span className="text-danger">✕</span>
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-w-[32px] min-h-[32px] p-1"
                        onClick={() => {
                          setEntryToDelete(entry);
                          setShowDeleteConfirm(true);
                        }}
                        disabled={
                          entry.status !== "pending" || deleteEntry.isPending
                        }
                        title="Delete"
                      >
                        <span
                          className={
                            entry.status === "pending"
                              ? "text-danger"
                              : "text-text-muted opacity-30"
                          }
                        >
                          🗑
                        </span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-bg-hover/50">
                <td colSpan={5} className="py-3 px-4 font-semibold text-text-primary">
                  Page Totals
                </td>
                <td className="py-3 px-4 text-right font-mono font-semibold text-text-primary">
                  {pageTotalRegular.toFixed(2)}h
                </td>
                <td className="py-3 px-4 text-right font-mono font-semibold text-warning">
                  {pageTotalOT > 0 ? `${pageTotalOT.toFixed(2)}h` : "-"}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4">
          <p className="text-sm text-text-muted">
            Showing{" "}
            {((filters.page || 1) - 1) * pageSize + 1} to{" "}
            {Math.min((filters.page || 1) * pageSize, total)} of {total}{" "}
            entries
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

      {/* Detail Modal */}
      <TimeEntryDetailModal
        entry={selectedEntry}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedEntry(null);
        }}
        onDelete={(entry) => {
          setShowDetailModal(false);
          setEntryToDelete(entry);
          setShowDeleteConfirm(true);
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setEntryToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Time Entry"
        message="Are you sure you want to delete this time entry? Only pending entries can be deleted."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteEntry.isPending}
      />

      {/* Bulk Approve Confirmation */}
      <ConfirmDialog
        open={showBulkApproveConfirm}
        onClose={() => setShowBulkApproveConfirm(false)}
        onConfirm={handleBulkApprove}
        title="Approve Selected Entries"
        message={`Approve ${selectedIds.size} selected time ${selectedIds.size === 1 ? "entry" : "entries"}?`}
        confirmLabel="Approve All"
        variant="primary"
        isLoading={bulkApprove.isPending}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        open={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Entries"
        message={`Delete ${selectedIds.size} selected time ${selectedIds.size === 1 ? "entry" : "entries"}? Only pending entries can be deleted.`}
        confirmLabel="Delete All"
        variant="danger"
        isLoading={deleteEntry.isPending}
      />
    </div>
  );
}
