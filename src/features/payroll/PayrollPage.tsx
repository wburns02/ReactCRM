import { useState } from "react";
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
  useCommissions,
  usePayRates,
  useCreatePayrollPeriod,
  useApprovePayrollPeriod,
  useUpdateTimeEntry,
  useBulkApproveTimeEntries,
  useUpdateCommission,
  useBulkApproveCommissions,
} from "@/api/hooks/usePayroll";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { PayrollPeriod } from "@/api/types/payroll";

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
          <Card key={period.id} className="p-4">
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
              {period.status === "draft" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setPeriodToApprove(period)}
                  disabled={approvePeriod.isPending}
                >
                  Approve
                </Button>
              )}
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
 * Commissions Tab
 */
function CommissionsTab() {
  const { data: commissions, isLoading } = useCommissions({
    status: "pending",
  });
  const updateCommission = useUpdateCommission();
  const bulkApprove = useBulkApproveCommissions();
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

  const handleBulkApprove = async () => {
    await bulkApprove.mutateAsync(Array.from(selected));
    setSelected(new Set());
  };

  const handleApprove = async (commissionId: string) => {
    await updateCommission.mutateAsync({
      commissionId,
      input: { status: "approved" },
    });
  };

  if (isLoading) {
    return <div className="animate-pulse h-48 bg-bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-text-primary">
          Pending Commissions
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

      <div className="space-y-3">
        {commissions?.map((commission) => (
          <Card key={commission.id} className="p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(commission.id)}
                onChange={() => toggleSelect(commission.id)}
                className="mt-1 rounded border-border"
              />
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-text-primary">
                      {commission.technician_name ||
                        `Tech #${commission.technician_id}`}
                    </div>
                    <div className="text-sm text-text-secondary">
                      WO #
                      {commission.work_order_number || commission.work_order_id}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-success">
                      {formatCurrency(commission.commission_amount)}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {(commission.commission_rate * 100).toFixed(0)}% of{" "}
                      {formatCurrency(commission.job_total)}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleApprove(commission.id)}
                    disabled={updateCommission.isPending}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {(!commissions || commissions.length === 0) && (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-4">💵</div>
          <h3 className="font-medium text-text-primary mb-2">
            No Pending Commissions
          </h3>
          <p className="text-sm text-text-secondary">
            All commissions have been processed.
          </p>
        </Card>
      )}
    </div>
  );
}

/**
 * Pay Rates Tab
 */
function PayRatesTab() {
  const { data: rates, isLoading } = usePayRates({ is_active: true });

  if (isLoading) {
    return <div className="animate-pulse h-48 bg-bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-text-primary">
          Technician Pay Rates
        </h3>
        <Button variant="primary">+ Add Rate</Button>
      </div>

      <div className="space-y-3">
        {rates?.map((rate) => (
          <Card key={rate.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-medium text-text-primary">
                  {rate.technician_name || `Technician #${rate.technician_id}`}
                </div>
                <div className="text-sm text-text-secondary">
                  Effective: {formatDate(rate.effective_date)}
                </div>
              </div>
              <Badge variant={rate.is_active ? "success" : "secondary"}>
                {rate.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-text-secondary">Hourly Rate</div>
                <div className="font-medium">
                  {formatCurrency(rate.hourly_rate)}/hr
                </div>
              </div>
              <div>
                <div className="text-text-secondary">Overtime Rate</div>
                <div className="font-medium">
                  {formatCurrency(rate.overtime_rate)}/hr
                </div>
              </div>
              <div>
                <div className="text-text-secondary">Commission</div>
                <div className="font-medium">
                  {(rate.commission_rate * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {(!rates || rates.length === 0) && (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="font-medium text-text-primary mb-2">
            No Pay Rates Configured
          </h3>
          <p className="text-sm text-text-secondary mb-4">
            Set up pay rates for your technicians.
          </p>
          <Button variant="primary">Add Pay Rate</Button>
        </Card>
      )}
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
