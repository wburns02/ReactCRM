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
} from "@/components/ui/Dialog";
import { toastSuccess, toastError } from "@/components/ui/Toast";
import { getErrorMessage } from "@/api/client";
import {
  usePayrollPeriod,
  useUpdatePayrollPeriod,
  usePayrollSummary,
  useTimeEntries,
  useCommissions,
} from "@/api/hooks/usePayroll";
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

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  // Active tab
  const [activeTab, setActiveTab] = useState<"overview" | "time" | "commissions" | "technicians">("overview");

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

  const statusColors: Record<string, "default" | "warning" | "success" | "danger" | "secondary"> = {
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
          <Button onClick={() => navigate("/payroll")}>
            Back to Payroll
          </Button>
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
            {period.period_type || "Biweekly"} Period • {period.technician_count} technicians
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
            <h3 className="text-lg font-semibold text-text-primary">Period Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-text-muted">Start Date</div>
                <div className="font-medium">{formatDate(period.start_date)}</div>
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
                <div className="font-medium capitalize">{period.period_type || "Biweekly"}</div>
              </div>
              <div>
                <div className="text-sm text-text-muted">Commissions</div>
                <div className="font-medium">{formatCurrency(period.total_commissions || 0)}</div>
              </div>
              <div>
                <div className="text-sm text-text-muted">Deductions</div>
                <div className="font-medium">{formatCurrency(period.total_deductions || 0)}</div>
              </div>
            </div>

            {period.approved_at && (
              <div className="pt-4 border-t border-border">
                <div className="text-sm text-text-muted">
                  Approved by {period.approved_by} on {formatDate(period.approved_at)}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "time" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Time Entries</h3>
            {timeEntries && timeEntries.length > 0 ? (
              <div className="space-y-3">
                {timeEntries.map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center p-3 bg-bg-muted rounded-lg">
                    <div>
                      <div className="font-medium">{entry.technician_name || `Tech #${entry.technician_id}`}</div>
                      <div className="text-sm text-text-muted">{formatDate(entry.date)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{entry.regular_hours.toFixed(1)} hrs</div>
                      {entry.overtime_hours > 0 && (
                        <div className="text-sm text-warning">+{entry.overtime_hours.toFixed(1)} OT</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-muted text-center py-8">No time entries for this period</p>
            )}
          </div>
        )}

        {activeTab === "commissions" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Commissions</h3>
            {commissions && commissions.length > 0 ? (
              <div className="space-y-3">
                {commissions.map((comm) => (
                  <div key={comm.id} className="flex justify-between items-center p-3 bg-bg-muted rounded-lg">
                    <div>
                      <div className="font-medium">{comm.technician_name || `Tech #${comm.technician_id}`}</div>
                      <div className="text-sm text-text-muted">Work Order #{comm.work_order_id}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-success">{formatCurrency(comm.commission_amount)}</div>
                      <Badge variant={comm.status === "paid" ? "success" : comm.status === "approved" ? "default" : "warning"}>
                        {comm.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-muted text-center py-8">No commissions for this period</p>
            )}
          </div>
        )}

        {activeTab === "technicians" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Technician Breakdown</h3>
            {summaries && summaries.length > 0 ? (
              <div className="space-y-3">
                {summaries.map((summary) => (
                  <div key={summary.technician_id} className="p-4 bg-bg-muted rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">{summary.technician_name}</div>
                      <div className="text-lg font-bold text-success">{formatCurrency(summary.net_pay)}</div>
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
              <p className="text-text-muted text-center py-8">No technician data for this period</p>
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
              disabled={!editStartDate || !editEndDate || updatePeriod.isPending}
            >
              {updatePeriod.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
