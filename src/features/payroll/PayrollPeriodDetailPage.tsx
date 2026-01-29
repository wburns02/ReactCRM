import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  ConfirmDialog,
} from "@/components/ui/Dialog";
import { toastSuccess, toastError } from "@/components/ui/Toast";
import { getErrorMessage } from "@/api/client";
import {
  usePayrollPeriod,
  useUpdatePayrollPeriod,
  usePayrollSummary,
  useTimeEntries,
  useCommissions,
  useCreateTimeEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
} from "@/api/hooks/usePayroll";
import { useTechnicians } from "@/api/hooks/useTechnicians";
import type { TimeEntry } from "@/api/types/payroll";
import { formatDate, formatCurrency } from "@/lib/utils";

/**
 * Payroll Period Detail Page
 * Shows comprehensive view of a payroll period with edit capability
 */
export function PayrollPeriodDetailPage() {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();

  // Fetch period data
  const { data: period, isLoading, error } = usePayrollPeriod(periodId || "");
  const updatePeriod = useUpdatePayrollPeriod();

  // Fetch related data for tabs
  const { data: summaries } = usePayrollSummary(periodId || "");
  const { data: timeEntries } = useTimeEntries({ payroll_period_id: periodId });
  const { data: commissions } = useCommissions({ payroll_period_id: periodId });

  // Time Entry CRUD hooks
  const createEntry = useCreateTimeEntry();
  const updateEntry = useUpdateTimeEntry();
  const deleteEntry = useDeleteTimeEntry();
  const { data: technicians } = useTechnicians();

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  // Time Entry form state
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<TimeEntry | null>(null);
  const [formTechnicianId, setFormTechnicianId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formClockIn, setFormClockIn] = useState("");
  const [formClockOut, setFormClockOut] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Active tab
  const [activeTab, setActiveTab] = useState<
    "overview" | "time" | "commissions" | "technicians"
  >("overview");

  // Helper to get technician name from ID
  const getTechnicianName = (technicianId: string): string => {
    const tech = technicians?.items?.find((t) => t.id === technicianId);
    if (tech) {
      return `${tech.first_name} ${tech.last_name}`;
    }
    // Shortened UUID as fallback if technician not found
    return `Tech #${technicianId.slice(0, 8)}...`;
  };

  // Populate edit form when period loads
  useEffect(() => {
    if (period) {
      setEditStartDate(period.start_date);
      setEditEndDate(period.end_date);
    }
  }, [period]);

  const handleUpdate = async () => {
    if (!periodId || !editStartDate || !editEndDate) return;
    try {
      await updatePeriod.mutateAsync({
        periodId,
        input: { start_date: editStartDate, end_date: editEndDate },
      });
      toastSuccess("Period Updated", "Dates updated successfully");
      setShowEditModal(false);
    } catch (err) {
      toastError("Update Failed", getErrorMessage(err));
    }
  };

  // Time Entry handlers
  const resetEntryForm = () => {
    setShowEntryForm(false);
    setEditingEntry(null);
    setFormTechnicianId("");
    setFormDate("");
    setFormClockIn("");
    setFormClockOut("");
    setFormNotes("");
  };

  const openAddEntryForm = () => {
    resetEntryForm();
    // Pre-fill date from period start
    if (period) {
      setFormDate(period.start_date);
    }
    setShowEntryForm(true);
  };

  const openEditEntryForm = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setFormTechnicianId(entry.technician_id);
    setFormDate(entry.date);
    // Extract time from ISO datetime
    setFormClockIn(entry.clock_in?.split("T")[1]?.slice(0, 5) || "");
    setFormClockOut(entry.clock_out?.split("T")[1]?.slice(0, 5) || "");
    setFormNotes(entry.notes || "");
    setShowEntryForm(true);
  };

  const handleSaveEntry = async () => {
    if (!formTechnicianId || !formDate || !formClockIn) return;
    try {
      const clockInDateTime = `${formDate}T${formClockIn}:00`;
      const clockOutDateTime = formClockOut
        ? `${formDate}T${formClockOut}:00`
        : undefined;

      if (editingEntry) {
        await updateEntry.mutateAsync({
          entryId: editingEntry.id,
          input: {
            clock_in: clockInDateTime,
            clock_out: clockOutDateTime,
            notes: formNotes || undefined,
          },
        });
        toastSuccess("Entry Updated", "Time entry updated successfully");
      } else {
        await createEntry.mutateAsync({
          technician_id: formTechnicianId,
          entry_date: formDate,
          clock_in: clockInDateTime,
          clock_out: clockOutDateTime,
          notes: formNotes || undefined,
        });
        toastSuccess("Entry Created", "Time entry created successfully");
      }
      resetEntryForm();
    } catch (error) {
      toastError("Save Failed", getErrorMessage(error));
    }
  };

  const handleDeleteEntry = async () => {
    if (!entryToDelete) return;
    try {
      await deleteEntry.mutateAsync(entryToDelete.id);
      toastSuccess("Entry Deleted", "Time entry deleted successfully");
      setEntryToDelete(null);
    } catch (error) {
      toastError("Delete Failed", getErrorMessage(error));
    }
  };

  const statusColors: Record<
    string,
    "default" | "warning" | "success" | "danger" | "secondary"
  > = {
    draft: "secondary",
    processing: "warning",
    approved: "default",
    paid: "success",
    void: "danger",
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !period) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <span className="text-4xl block mb-4">404</span>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Payroll Period Not Found
          </h2>
          <p className="text-text-muted mb-4">
            The payroll period you're looking for doesn't exist.
          </p>
          <Button onClick={() => navigate("/payroll")}>Back to Payroll</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
            <Link
              to="/payroll"
              className="hover:text-primary transition-colors"
            >
              ← Back to Payroll
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">
            {formatDate(period.start_date)} - {formatDate(period.end_date)}
          </h1>
          <p className="text-text-muted">
            {period.period_type || "Biweekly"} Period •{" "}
            {period.technician_count} technicians
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusColors[period.status] || "secondary"}>
            {period.status}
          </Badge>
          <Button variant="secondary" onClick={() => setShowEditModal(true)}>
            Edit
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-text-muted">Total Hours</div>
          <div className="text-2xl font-bold text-text-primary">
            {(period.total_hours || 0).toFixed(1)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-text-muted">Overtime Hours</div>
          <div className="text-2xl font-bold text-text-primary">
            {(period.total_overtime_hours || 0).toFixed(1)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-text-muted">Gross Pay</div>
          <div className="text-2xl font-bold text-text-primary">
            {formatCurrency(period.total_gross_pay || 0)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-text-muted">Net Pay</div>
          <div className="text-2xl font-bold text-success">
            {formatCurrency(period.total_net_pay || 0)}
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "overview"
              ? "bg-primary text-white"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("time")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "time"
              ? "bg-primary text-white"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          Time Entries ({timeEntries?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("commissions")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "commissions"
              ? "bg-primary text-white"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          Commissions ({commissions?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("technicians")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "technicians"
              ? "bg-primary text-white"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          Technicians ({summaries?.length || 0})
        </button>
      </div>

      {/* Tab Content */}
      <Card className="p-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-text-primary">
              Period Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-text-muted">Start Date</div>
                <div className="font-medium">
                  {formatDate(period.start_date)}
                </div>
              </div>
              <div>
                <div className="text-sm text-text-muted">End Date</div>
                <div className="font-medium">{formatDate(period.end_date)}</div>
              </div>
              <div>
                <div className="text-sm text-text-muted">Status</div>
                <div className="font-medium capitalize">{period.status}</div>
              </div>
              <div>
                <div className="text-sm text-text-muted">Period Type</div>
                <div className="font-medium capitalize">
                  {period.period_type || "Biweekly"}
                </div>
              </div>
              <div>
                <div className="text-sm text-text-muted">Commissions</div>
                <div className="font-medium">
                  {formatCurrency(period.total_commissions || 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-text-muted">Deductions</div>
                <div className="font-medium">
                  {formatCurrency(period.total_deductions || 0)}
                </div>
              </div>
            </div>

            {period.approved_at && (
              <div className="pt-4 border-t border-border">
                <div className="text-sm text-text-muted">
                  Approved by {period.approved_by} on{" "}
                  {formatDate(period.approved_at)}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "time" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-text-primary">
                Time Entries
              </h3>
              <Button variant="primary" size="sm" onClick={openAddEntryForm}>
                + Add Entry
              </Button>
            </div>
            {timeEntries && timeEntries.length > 0 ? (
              <div className="space-y-3">
                {timeEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex justify-between items-center p-3 bg-bg-muted rounded-lg"
                  >
                    <div>
                      <div className="font-medium">
                        {entry.technician_name ||
                          getTechnicianName(entry.technician_id)}
                      </div>
                      <div className="text-sm text-text-muted">
                        {formatDate(entry.date)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right mr-2">
                        <div className="font-medium">
                          {entry.regular_hours.toFixed(1)} hrs
                        </div>
                        {entry.overtime_hours > 0 && (
                          <div className="text-sm text-warning">
                            +{entry.overtime_hours.toFixed(1)} OT
                          </div>
                        )}
                      </div>
                      <Badge
                        variant={
                          entry.status === "approved"
                            ? "success"
                            : entry.status === "rejected"
                              ? "danger"
                              : "secondary"
                        }
                      >
                        {entry.status}
                      </Badge>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditEntryForm(entry)}
                      >
                        Edit
                      </Button>
                      {entry.status === "pending" && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setEntryToDelete(entry)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-muted text-center py-8">
                No time entries for this period
              </p>
            )}
          </div>
        )}

        {activeTab === "commissions" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">
              Commissions
            </h3>
            {commissions && commissions.length > 0 ? (
              <div className="space-y-3">
                {commissions.map((comm) => (
                  <div
                    key={comm.id}
                    className="flex justify-between items-center p-3 bg-bg-muted rounded-lg"
                  >
                    <div>
                      <div className="font-medium">
                        {comm.technician_name ||
                          getTechnicianName(comm.technician_id)}
                      </div>
                      <div className="text-sm text-text-muted">
                        Work Order #{comm.work_order_id}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-success">
                        {formatCurrency(comm.commission_amount)}
                      </div>
                      <Badge
                        variant={
                          comm.status === "paid"
                            ? "success"
                            : comm.status === "approved"
                              ? "default"
                              : "warning"
                        }
                      >
                        {comm.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-muted text-center py-8">
                No commissions for this period
              </p>
            )}
          </div>
        )}

        {activeTab === "technicians" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">
              Technician Breakdown
            </h3>
            {summaries && summaries.length > 0 ? (
              <div className="space-y-3">
                {summaries.map((summary) => (
                  <div
                    key={summary.technician_id}
                    className="p-4 bg-bg-muted rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">
                        {summary.technician_name}
                      </div>
                      <div className="text-lg font-bold text-success">
                        {formatCurrency(summary.net_pay)}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <div className="text-text-muted">Regular</div>
                        <div>{summary.regular_hours}h</div>
                      </div>
                      <div>
                        <div className="text-text-muted">Overtime</div>
                        <div>{summary.overtime_hours}h</div>
                      </div>
                      <div>
                        <div className="text-text-muted">Gross</div>
                        <div>{formatCurrency(summary.gross_pay)}</div>
                      </div>
                      <div>
                        <div className="text-text-muted">Commissions</div>
                        <div>{formatCurrency(summary.total_commissions)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-muted text-center py-8">
                No technician data for this period
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onClose={() => setShowEditModal(false)}>
        <DialogContent>
          <DialogHeader onClose={() => setShowEditModal(false)}>
            Edit Payroll Period
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-start-date">Start Date</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-end-date">End Date</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdate}
              disabled={
                !editStartDate || !editEndDate || updatePeriod.isPending
              }
            >
              {updatePeriod.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time Entry Form Modal */}
      <Dialog open={showEntryForm} onClose={resetEntryForm}>
        <DialogContent>
          <DialogHeader onClose={resetEntryForm}>
            {editingEntry ? "Edit Time Entry" : "Add Time Entry"}
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <Label htmlFor="entry-technician">Technician *</Label>
                <select
                  id="entry-technician"
                  value={formTechnicianId}
                  onChange={(e) => setFormTechnicianId(e.target.value)}
                  disabled={!!editingEntry}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  <option value="">Select a technician...</option>
                  {technicians?.items?.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.first_name} {tech.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="entry-date">Date *</Label>
                <Input
                  id="entry-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="entry-clock-in">Clock In *</Label>
                  <Input
                    id="entry-clock-in"
                    type="time"
                    value={formClockIn}
                    onChange={(e) => setFormClockIn(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="entry-clock-out">Clock Out</Label>
                  <Input
                    id="entry-clock-out"
                    type="time"
                    value={formClockOut}
                    onChange={(e) => setFormClockOut(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="entry-notes">Notes</Label>
                <textarea
                  id="entry-notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  placeholder="Optional notes about this time entry..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={resetEntryForm}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveEntry}
              disabled={
                !formTechnicianId ||
                !formDate ||
                !formClockIn ||
                createEntry.isPending ||
                updateEntry.isPending
              }
            >
              {createEntry.isPending || updateEntry.isPending
                ? "Saving..."
                : editingEntry
                  ? "Update Entry"
                  : "Create Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Time Entry Confirmation */}
      <ConfirmDialog
        open={!!entryToDelete}
        onClose={() => setEntryToDelete(null)}
        onConfirm={handleDeleteEntry}
        title="Delete Time Entry"
        message={
          entryToDelete
            ? `Are you sure you want to delete this time entry for ${entryToDelete.technician_name || getTechnicianName(entryToDelete.technician_id)} on ${formatDate(entryToDelete.date)}? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteEntry.isPending}
      />
    </div>
  );
}
