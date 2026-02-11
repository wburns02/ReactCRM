import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { formatDate } from "@/lib/utils.ts";
import {
  useUpdateTimeEntry,
  useApproveTimeEntry,
  useRejectTimeEntry,
  type TimeEntry,
  type TimeEntryUpdate,
} from "../api/timeTracking.ts";

interface TimeEntryDetailModalProps {
  entry: TimeEntry | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (entry: TimeEntry) => void;
}

const ENTRY_TYPE_ICONS: Record<string, string> = {
  work: "🔧",
  travel: "🚗",
  break: "☕",
  pto: "🏖️",
};

const ENTRY_TYPES = [
  { value: "work", label: "Work" },
  { value: "travel", label: "Travel" },
  { value: "break", label: "Break" },
  { value: "pto", label: "PTO" },
];

function getStatusVariant(
  status: string,
): "success" | "warning" | "danger" | "default" {
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
}

function formatTime(isoString: string | null): string {
  if (!isoString) return "-";
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDatetimeLocal(isoString: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TimeEntryDetailModal({
  entry,
  open,
  onClose,
  onDelete,
}: TimeEntryDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<{
    clock_in: string;
    clock_out: string;
    notes: string;
    entry_type: string;
  }>({ clock_in: "", clock_out: "", notes: "", entry_type: "work" });

  const updateEntry = useUpdateTimeEntry();
  const approveEntry = useApproveTimeEntry();
  const rejectEntry = useRejectTimeEntry();

  if (!entry) return null;

  const totalHours = (entry.regular_hours || 0) + (entry.overtime_hours || 0);
  const isPending = entry.status === "pending";

  const startEditing = () => {
    setEditData({
      clock_in: toDatetimeLocal(entry.clock_in),
      clock_out: toDatetimeLocal(entry.clock_out),
      notes: entry.notes || "",
      entry_type: entry.entry_type || "work",
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    const updatePayload: TimeEntryUpdate = {};
    if (editData.clock_in) updatePayload.clock_in = new Date(editData.clock_in).toISOString();
    if (editData.clock_out) updatePayload.clock_out = new Date(editData.clock_out).toISOString();
    updatePayload.notes = editData.notes || undefined;

    await updateEntry.mutateAsync({ id: entry.id, data: updatePayload });
    setIsEditing(false);
    onClose();
  };

  const handleApprove = async () => {
    await approveEntry.mutateAsync(entry.id);
    onClose();
  };

  const handleReject = async () => {
    await rejectEntry.mutateAsync(entry.id);
    onClose();
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} ariaLabel="Time Entry Details">
      <DialogContent size="lg" className="max-w-[95vw]">
        <DialogHeader onClose={handleClose}>
          <div className="flex items-center gap-3">
            <span className="text-xl">
              {ENTRY_TYPE_ICONS[entry.entry_type] || "⏱️"}
            </span>
            <span>Time Entry Details</span>
            <Badge variant={getStatusVariant(entry.status)}>
              {entry.status}
            </Badge>
          </div>
        </DialogHeader>

        <DialogBody>
          {isEditing ? (
            /* ---- EDIT MODE ---- */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">
                    Clock In
                  </label>
                  <input
                    type="datetime-local"
                    value={editData.clock_in}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        clock_in: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">
                    Clock Out
                  </label>
                  <input
                    type="datetime-local"
                    value={editData.clock_out}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        clock_out: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Entry Type
                </label>
                <select
                  value={editData.entry_type}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      entry_type: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
                >
                  {ENTRY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Notes
                </label>
                <textarea
                  value={editData.notes}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
                  placeholder="Add notes..."
                />
              </div>
            </div>
          ) : (
            /* ---- VIEW MODE ---- */
            <div className="space-y-6">
              {/* Assignment Section */}
              <div>
                <h4 className="text-sm font-medium text-text-muted mb-3">
                  Assignment
                </h4>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {entry.technician_name && (
                    <div>
                      <dt className="text-xs text-text-muted">Technician</dt>
                      <dd className="text-sm font-medium text-text-primary">
                        {entry.technician_name}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-text-muted">Date</dt>
                    <dd className="text-sm font-medium text-text-primary">
                      {formatDate(entry.entry_date)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">Entry Type</dt>
                    <dd className="text-sm font-medium text-text-primary">
                      {ENTRY_TYPE_ICONS[entry.entry_type] || "⏱️"}{" "}
                      <span className="capitalize">{entry.entry_type}</span>
                    </dd>
                  </div>
                  {entry.work_order_id && (
                    <div>
                      <dt className="text-xs text-text-muted">Work Order</dt>
                      <dd className="text-sm font-medium text-primary">
                        <a
                          href={`/work-orders?id=${entry.work_order_id}`}
                          className="hover:underline"
                        >
                          View Work Order →
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Time Section */}
              <div className="p-4 bg-bg-hover/50 rounded-lg">
                <h4 className="text-sm font-medium text-text-muted mb-3">
                  Time & Hours
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-text-muted">Clock In</p>
                    <p className="text-lg font-mono font-medium text-text-primary">
                      {formatTime(entry.clock_in)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-text-muted">Clock Out</p>
                    <p className="text-lg font-mono font-medium text-text-primary">
                      {formatTime(entry.clock_out)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-text-muted">Regular</p>
                    <p className="text-lg font-mono font-bold text-text-primary">
                      {(entry.regular_hours || 0).toFixed(2)}h
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-text-muted">Overtime</p>
                    <p
                      className={`text-lg font-mono font-bold ${(entry.overtime_hours || 0) > 0 ? "text-warning" : "text-text-muted"}`}
                    >
                      {(entry.overtime_hours || 0) > 0
                        ? `${(entry.overtime_hours || 0).toFixed(2)}h`
                        : "-"}
                    </p>
                  </div>
                </div>

                {/* Total bar */}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-sm text-text-muted">Total Hours</span>
                  <span className="text-xl font-mono font-bold text-text-primary">
                    {totalHours.toFixed(2)}h
                  </span>
                </div>

                {entry.break_minutes > 0 && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-text-muted">
                      Break Deducted
                    </span>
                    <span className="text-sm font-mono text-text-secondary">
                      {entry.break_minutes} min
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {entry.notes && (
                <div>
                  <h4 className="text-sm font-medium text-text-muted mb-2">
                    Notes
                  </h4>
                  <p className="text-sm text-text-primary bg-bg-hover/50 rounded-lg p-3">
                    {entry.notes}
                  </p>
                </div>
              )}

              {/* Approval Info */}
              {(entry.approved_by || entry.approved_at) && (
                <div>
                  <h4 className="text-sm font-medium text-text-muted mb-2">
                    Approval
                  </h4>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                    {entry.approved_by && (
                      <div>
                        <dt className="text-xs text-text-muted">
                          Approved By
                        </dt>
                        <dd className="text-sm text-text-primary">
                          {entry.approved_by}
                        </dd>
                      </div>
                    )}
                    {entry.approved_at && (
                      <div>
                        <dt className="text-xs text-text-muted">
                          Approved At
                        </dt>
                        <dd className="text-sm text-text-primary">
                          {new Date(entry.approved_at).toLocaleString()}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* ID */}
              <p className="text-xs text-text-muted">ID: {entry.id}</p>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {isEditing ? (
            <>
              <Button
                variant="secondary"
                onClick={() => setIsEditing(false)}
                disabled={updateEntry.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={updateEntry.isPending}
              >
                {updateEntry.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <>
              {/* Left side: delete */}
              <div className="flex-1 flex">
                {isPending && onDelete && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      onDelete(entry);
                      handleClose();
                    }}
                  >
                    Delete
                  </Button>
                )}
              </div>

              {/* Right side: actions */}
              <Button variant="secondary" onClick={handleClose}>
                Close
              </Button>
              {isPending && (
                <>
                  <Button
                    variant="danger"
                    onClick={handleReject}
                    disabled={rejectEntry.isPending}
                  >
                    {rejectEntry.isPending ? "Rejecting..." : "Reject"}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleApprove}
                    disabled={approveEntry.isPending}
                  >
                    {approveEntry.isPending ? "Approving..." : "Approve"}
                  </Button>
                  <Button variant="secondary" onClick={startEditing}>
                    Edit
                  </Button>
                </>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
