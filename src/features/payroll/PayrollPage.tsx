import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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
  usePayrollPeriods,
  useTimeEntries,
  usePayRates,
  useCreatePayrollPeriod,
  useApprovePayrollPeriod,
  useUpdateTimeEntry,
  useBulkApproveTimeEntries,
  useCreatePayRate,
  useUpdatePayRate,
  useDeletePayRate,
} from "@/api/hooks/usePayroll";
import { useTechnicians } from "@/api/hooks/useTechnicians";
import { CommissionsDashboard } from "./components/CommissionsDashboard";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { PayrollPeriod, TechnicianPayRate } from "@/api/types/payroll";

type TabType = "periods" | "time-entries" | "commissions" | "pay-rates";

/**
 * Tab Button
 */
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? "bg-primary text-white"
          : "bg-bg-muted text-text-secondary hover:bg-bg-muted/80"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/**
 * Pay Periods Tab
 */
function PayPeriodsTab() {
  const navigate = useNavigate();
  const { data: periods, isLoading } = usePayrollPeriods();
  const createPeriod = useCreatePayrollPeriod();
  const approvePeriod = useApprovePayrollPeriod();
  const [showCreate, setShowCreate] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [periodToApprove, setPeriodToApprove] = useState<PayrollPeriod | null>(null);

  const handleApprovePeriod = async () => {
    if (!periodToApprove) return;
    try {
      await approvePeriod.mutateAsync(periodToApprove.id);
      toastSuccess(
        "Period Approved",
        `Payroll period ${formatDate(periodToApprove.start_date)} - ${formatDate(periodToApprove.end_date)} approved successfully`
      );
      setPeriodToApprove(null);
    } catch (error) {
      toastError("Approval Failed", getErrorMessage(error));
      setPeriodToApprove(null);
    }
  };

  const handleCreate = async () => {
    if (!startDate || !endDate) return;
    await createPeriod.mutateAsync({
      start_date: startDate,
      end_date: endDate,
    });
    setShowCreate(false);
    setStartDate("");
    setEndDate("");
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
    return <div className="animate-pulse h-48 bg-bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-text-primary">
          Payroll Periods
        </h3>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          + New Period
        </Button>
      </div>

      <div className="space-y-3">
        {periods?.map((period) => (
          <Card
            key={period.id}
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/payroll/${period.id}`)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-medium text-text-primary">
                  {formatDate(period.start_date)} -{" "}
                  {formatDate(period.end_date)}
                </div>
                <div className="text-sm text-text-secondary">
                  {period.technician_count} technicians
                </div>
              </div>
              <Badge variant={statusColors[period.status]}>
                {period.status}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm mb-3">
              <div>
                <div className="text-text-secondary">Hours</div>
                <div className="font-medium">
                  {period.total_hours.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-text-secondary">Overtime</div>
                <div className="font-medium">
                  {period.total_overtime_hours.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-text-secondary">Commissions</div>
                <div className="font-medium">
                  {formatCurrency(period.total_commissions)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div>
                <div className="text-sm text-text-secondary">Net Pay</div>
                <div className="text-lg font-bold text-text-primary">
                  {formatCurrency(period.total_net_pay)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/payroll/${period.id}`);
                  }}
                >
                  View
                </Button>
                {period.status === "draft" && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPeriodToApprove(period);
                    }}
                    disabled={approvePeriod.isPending}
                  >
                    Approve
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {(!periods || periods.length === 0) && (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-4">💰</div>
          <h3 className="font-medium text-text-primary mb-2">
            No Payroll Periods
          </h3>
          <p className="text-sm text-text-secondary mb-4">
            Create your first payroll period to get started.
          </p>
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            Create Period
          </Button>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)}>
        <DialogContent>
          <DialogHeader onClose={() => setShowCreate(false)}>
            Create Payroll Period
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={!startDate || !endDate || createPeriod.isPending}
            >
              {createPeriod.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <ConfirmDialog
        open={!!periodToApprove}
        onClose={() => setPeriodToApprove(null)}
        onConfirm={handleApprovePeriod}
        title="Approve Payroll Period"
        message={
          periodToApprove
            ? `Are you sure you want to approve the payroll period from ${formatDate(periodToApprove.start_date)} to ${formatDate(periodToApprove.end_date)}? This action cannot be undone.`
            : ""
        }
        confirmLabel="Approve"
        variant="primary"
        isLoading={approvePeriod.isPending}
      />
    </div>
  );
}

/**
 * Time Entries Tab
 */
function TimeEntriesTab() {
  const { data: entries, isLoading } = useTimeEntries({ status: "pending" });
  const updateEntry = useUpdateTimeEntry();
  const bulkApprove = useBulkApproveTimeEntries();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const toggleSelectAll = () => {
    if (selected.size === entries?.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(entries?.map((e) => e.id) || []));
    }
  };

  const handleBulkApprove = async () => {
    await bulkApprove.mutateAsync(Array.from(selected));
    setSelected(new Set());
  };

  const handleApprove = async (entryId: string) => {
    await updateEntry.mutateAsync({ entryId, input: { status: "approved" } });
  };

  const handleReject = async (entryId: string) => {
    await updateEntry.mutateAsync({ entryId, input: { status: "rejected" } });
  };

  if (isLoading) {
    return <div className="animate-pulse h-48 bg-bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-text-primary">
          Pending Time Entries
        </h3>
        {selected.size > 0 && (
          <Button
            variant="primary"
            onClick={handleBulkApprove}
            disabled={bulkApprove.isPending}
          >
            Approve Selected ({selected.size})
          </Button>
        )}
      </div>

      {entries && entries.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selected.size === entries.length}
            onChange={toggleSelectAll}
            className="rounded border-border"
          />
          <span className="text-text-secondary">Select All</span>
        </div>
      )}

      <div className="space-y-3">
        {entries?.map((entry) => (
          <Card key={entry.id} className="p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(entry.id)}
                onChange={() => toggleSelect(entry.id)}
                className="mt-1 rounded border-border"
              />
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-text-primary">
                      {entry.technician_name || `Tech #${entry.technician_id}`}
                    </div>
                    <div className="text-sm text-text-secondary">
                      {formatDate(entry.date)}
                    </div>
                  </div>
                  <Badge variant="warning">Pending</Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                  <div>
                    <div className="text-text-secondary">Regular</div>
                    <div className="font-medium">
                      {entry.regular_hours.toFixed(1)} hrs
                    </div>
                  </div>
                  <div>
                    <div className="text-text-secondary">Overtime</div>
                    <div className="font-medium">
                      {entry.overtime_hours.toFixed(1)} hrs
                    </div>
                  </div>
                  <div>
                    <div className="text-text-secondary">Clock In</div>
                    <div className="font-medium font-mono">
                      {new Date(entry.clock_in).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>

                {entry.work_order_number && (
                  <div className="mt-2 text-sm text-text-secondary">
                    Work Order: #{entry.work_order_number}
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleApprove(entry.id)}
                    disabled={updateEntry.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleReject(entry.id)}
                    disabled={updateEntry.isPending}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {(!entries || entries.length === 0) && (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h3 className="font-medium text-text-primary mb-2">All Caught Up</h3>
          <p className="text-sm text-text-secondary">
            No pending time entries to review.
          </p>
        </Card>
      )}
    </div>
  );
}

/**
 * Commissions Tab - Full Dashboard with stats, filtering, leaderboard, and insights
 */
function CommissionsTab() {
  return <CommissionsDashboard />;
}

/**
 * Pay Rate Form Modal - Create/Edit pay rates
 */
function PayRateFormModal({
  open,
  onClose,
  editingRate,
}: {
  open: boolean;
  onClose: () => void;
  editingRate: TechnicianPayRate | null;
}) {
  const { data: techniciansData } = useTechnicians({ active_only: true });
  const technicians = techniciansData?.items || [];

  const createRate = useCreatePayRate();
  const updateRate = useUpdatePayRate();

  const [technicianId, setTechnicianId] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [overtimeRate, setOvertimeRate] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");

  // Reset form when modal opens or editing rate changes
  useEffect(() => {
    if (editingRate) {
      setTechnicianId(editingRate.technician_id);
      setHourlyRate(editingRate.hourly_rate?.toString() || "");
      setOvertimeRate(editingRate.overtime_rate?.toString() || "");
      setCommissionRate(
        editingRate.commission_rate
          ? (editingRate.commission_rate * 100).toString()
          : ""
      );
      setEffectiveDate(editingRate.effective_date || "");
    } else {
      setTechnicianId("");
      setHourlyRate("");
      setOvertimeRate("");
      setCommissionRate("");
      setEffectiveDate(new Date().toISOString().split("T")[0]);
    }
  }, [editingRate, open]);

  // Calculate overtime rate when hourly rate changes (1.5x default)
  const handleHourlyRateChange = (value: string) => {
    setHourlyRate(value);
    if (value && !overtimeRate) {
      const hourly = parseFloat(value);
      if (!isNaN(hourly)) {
        setOvertimeRate((hourly * 1.5).toFixed(2));
      }
    }
  };

  const handleSubmit = async () => {
    if (!technicianId || !hourlyRate) return;

    const rateData = {
      technician_id: technicianId,
      hourly_rate: parseFloat(hourlyRate),
      overtime_rate: overtimeRate ? parseFloat(overtimeRate) : parseFloat(hourlyRate) * 1.5,
      commission_rate: commissionRate ? parseFloat(commissionRate) / 100 : 0,
      effective_date: effectiveDate || new Date().toISOString().split("T")[0],
      is_active: true,
    };

    try {
      if (editingRate) {
        await updateRate.mutateAsync({
          rateId: editingRate.id,
          input: rateData,
        });
        toastSuccess("Pay Rate Updated", "The pay rate has been updated successfully.");
      } else {
        await createRate.mutateAsync(rateData);
        toastSuccess("Pay Rate Created", "New pay rate has been configured.");
      }
      onClose();
    } catch (error) {
      toastError("Error", getErrorMessage(error));
    }
  };

  const isLoading = createRate.isPending || updateRate.isPending;
  const isValid = technicianId && hourlyRate && parseFloat(hourlyRate) > 0;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent>
        <DialogHeader onClose={onClose}>
          {editingRate ? "Edit Pay Rate" : "Add New Pay Rate"}
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            {/* Technician Selection */}
            <div>
              <Label htmlFor="technician">Technician *</Label>
              <select
                id="technician"
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                disabled={!!editingRate}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              >
                <option value="">Select a technician...</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.first_name} {tech.last_name}
                  </option>
                ))}
              </select>
              {!editingRate && (
                <p className="text-xs text-text-secondary mt-1">
                  Choose the technician to configure pay rates for
                </p>
              )}
            </div>

            {/* Hourly Rate */}
            <div>
              <Label htmlFor="hourly-rate">Hourly Rate ($) *</Label>
              <Input
                id="hourly-rate"
                type="number"
                step="0.01"
                min="0"
                max="500"
                placeholder="25.00"
                value={hourlyRate}
                onChange={(e) => handleHourlyRateChange(e.target.value)}
              />
              <p className="text-xs text-text-secondary mt-1">
                Base hourly pay rate for regular hours
              </p>
            </div>

            {/* Overtime Rate */}
            <div>
              <Label htmlFor="overtime-rate">Overtime Rate ($)</Label>
              <Input
                id="overtime-rate"
                type="number"
                step="0.01"
                min="0"
                max="750"
                placeholder="37.50"
                value={overtimeRate}
                onChange={(e) => setOvertimeRate(e.target.value)}
              />
              <p className="text-xs text-text-secondary mt-1">
                Defaults to 1.5x hourly rate if left empty
              </p>
            </div>

            {/* Commission Rate */}
            <div>
              <Label htmlFor="commission-rate">Commission Rate (%)</Label>
              <Input
                id="commission-rate"
                type="number"
                step="0.5"
                min="0"
                max="100"
                placeholder="5"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
              />
              <p className="text-xs text-text-secondary mt-1">
                Percentage of job total earned as commission (0-100%)
              </p>
            </div>

            {/* Effective Date */}
            <div>
              <Label htmlFor="effective-date">Effective Date</Label>
              <Input
                id="effective-date"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
              <p className="text-xs text-text-secondary mt-1">
                When this pay rate takes effect
              </p>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
          >
            {isLoading
              ? "Saving..."
              : editingRate
                ? "Update Rate"
                : "Create Rate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Pay Rates Tab - Complete CRUD for technician pay rates
 */
function PayRatesTab() {
  const { data: rates, isLoading, error } = usePayRates({ is_active: true });
  const deleteRate = useDeletePayRate();

  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState<TechnicianPayRate | null>(null);
  const [rateToDelete, setRateToDelete] = useState<TechnicianPayRate | null>(null);

  const handleOpenCreate = () => {
    setEditingRate(null);
    setShowForm(true);
  };

  const handleOpenEdit = (rate: TechnicianPayRate) => {
    setEditingRate(rate);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRate(null);
  };

  const handleDelete = async () => {
    if (!rateToDelete) return;
    try {
      await deleteRate.mutateAsync(rateToDelete.id);
      toastSuccess(
        "Pay Rate Deleted",
        `Pay rate for ${rateToDelete.technician_name || "technician"} has been removed.`
      );
      setRateToDelete(null);
    } catch (error) {
      toastError("Delete Failed", getErrorMessage(error));
      setRateToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-6 w-40 bg-bg-muted rounded animate-pulse" />
          <div className="h-10 w-28 bg-bg-muted rounded animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center border-danger">
        <div className="text-4xl mb-4">!</div>
        <h3 className="font-medium text-text-primary mb-2">
          Failed to Load Pay Rates
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          {getErrorMessage(error)}
        </p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Technician Pay Rates
          </h3>
          <p className="text-sm text-text-secondary">
            Configure hourly rates, overtime, and commissions for technicians
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}>
          + Add Rate
        </Button>
      </div>

      {/* Pay Rate Cards */}
      <div className="space-y-3">
        {rates?.map((rate) => (
          <Card key={rate.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-medium text-text-primary text-lg">
                  {rate.technician_name || `Technician #${rate.technician_id}`}
                </div>
                <div className="text-sm text-text-secondary">
                  Effective: {formatDate(rate.effective_date)}
                  {rate.end_date && ` - ${formatDate(rate.end_date)}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={rate.is_active ? "success" : "secondary"}>
                  {rate.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>

            {/* Rate Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
              <div className="bg-bg-muted/50 rounded-lg p-3">
                <div className="text-text-secondary text-xs uppercase tracking-wide">
                  Hourly Rate
                </div>
                <div className="font-bold text-lg text-text-primary">
                  {formatCurrency(rate.hourly_rate)}<span className="text-sm font-normal">/hr</span>
                </div>
              </div>
              <div className="bg-bg-muted/50 rounded-lg p-3">
                <div className="text-text-secondary text-xs uppercase tracking-wide">
                  Overtime Rate
                </div>
                <div className="font-bold text-lg text-text-primary">
                  {formatCurrency(rate.overtime_rate)}<span className="text-sm font-normal">/hr</span>
                </div>
              </div>
              <div className="bg-bg-muted/50 rounded-lg p-3">
                <div className="text-text-secondary text-xs uppercase tracking-wide">
                  Commission
                </div>
                <div className="font-bold text-lg text-text-primary">
                  {(rate.commission_rate * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-bg-muted/50 rounded-lg p-3">
                <div className="text-text-secondary text-xs uppercase tracking-wide">
                  OT Multiplier
                </div>
                <div className="font-bold text-lg text-text-primary">
                  {rate.hourly_rate > 0
                    ? (rate.overtime_rate / rate.hourly_rate).toFixed(1)
                    : "1.5"}x
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenEdit(rate)}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setRateToDelete(rate)}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {(!rates || rates.length === 0) && (
        <Card className="p-8 text-center">
          <div className="text-6xl mb-4">💵</div>
          <h3 className="font-semibold text-text-primary text-xl mb-2">
            No Pay Rates Configured
          </h3>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            Set up pay rates for your technicians to track hourly wages,
            overtime, and commission rates. This ensures accurate payroll
            calculations.
          </p>
          <Button variant="primary" size="lg" onClick={handleOpenCreate}>
            Add First Pay Rate
          </Button>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <PayRateFormModal
        open={showForm}
        onClose={handleCloseForm}
        editingRate={editingRate}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!rateToDelete}
        onClose={() => setRateToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Pay Rate"
        message={
          rateToDelete
            ? `Are you sure you want to delete the pay rate for ${rateToDelete.technician_name || "this technician"}? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteRate.isPending}
      />
    </div>
  );
}

/**
 * Main Payroll Page
 */
export function PayrollPage() {
  const [activeTab, setActiveTab] = useState<TabType>("periods");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Payroll</h1>
        <p className="text-text-secondary">
          Manage time entries, commissions, and pay periods
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <TabButton
          active={activeTab === "periods"}
          onClick={() => setActiveTab("periods")}
        >
          Pay Periods
        </TabButton>
        <TabButton
          active={activeTab === "time-entries"}
          onClick={() => setActiveTab("time-entries")}
        >
          Time Entries
        </TabButton>
        <TabButton
          active={activeTab === "commissions"}
          onClick={() => setActiveTab("commissions")}
        >
          Commissions
        </TabButton>
        <TabButton
          active={activeTab === "pay-rates"}
          onClick={() => setActiveTab("pay-rates")}
        >
          Pay Rates
        </TabButton>
      </div>

      {/* Content */}
      {activeTab === "periods" && <PayPeriodsTab />}
      {activeTab === "time-entries" && <TimeEntriesTab />}
      {activeTab === "commissions" && <CommissionsTab />}
      {activeTab === "pay-rates" && <PayRatesTab />}
    </div>
  );
}
