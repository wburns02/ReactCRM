import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Label } from "@/components/ui/Label.tsx";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";
import { useTechnicians } from "@/api/hooks/useTechnicians.ts";
import { useDumpSites } from "@/api/hooks/useDumpSites.ts";
import {
  useCreateCommission,
  useUpdateCommission,
  useDeleteCommission,
  useWorkOrdersForCommission,
  useCalculateCommission,
} from "@/api/hooks/usePayroll.ts";
import type {
  Commission,
  CreateCommissionInput,
  CommissionCalculation,
} from "@/api/types/payroll.ts";
import {
  DollarSign,
  Percent,
  Trash2,
  Calculator,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface CommissionFormModalProps {
  open: boolean;
  onClose: () => void;
  commission?: Commission | null; // If provided, we're editing
}

const COMMISSION_TYPES = [
  { value: "job_completion", label: "Job Completion" },
  { value: "upsell", label: "Upsell" },
  { value: "referral", label: "Referral" },
  { value: "bonus", label: "Bonus" },
] as const;

// Commission rates by job type (must match backend)
const COMMISSION_RATES: Record<
  string,
  { rate: number; applyDumpFee: boolean }
> = {
  pumping: { rate: 0.2, applyDumpFee: true },
  grease_trap: { rate: 0.2, applyDumpFee: true },
  inspection: { rate: 0.15, applyDumpFee: false },
  repair: { rate: 0.15, applyDumpFee: false },
  installation: { rate: 0.1, applyDumpFee: false },
  emergency: { rate: 0.2, applyDumpFee: false },
  maintenance: { rate: 0.15, applyDumpFee: false },
  camera_inspection: { rate: 0.15, applyDumpFee: false },
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

export function CommissionFormModal({
  open,
  onClose,
  commission,
}: CommissionFormModalProps) {
  const isEditing = !!commission;

  // Form state
  const [technicianId, setTechnicianId] = useState("");
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState("");
  const [dumpSiteId, setDumpSiteId] = useState("");
  const [commissionType, setCommissionType] =
    useState<string>("job_completion");
  const [baseAmount, setBaseAmount] = useState("");
  const [rate, setRate] = useState("");
  const [rateType, setRateType] = useState<"percent" | "fixed">("percent");
  const [commissionAmount, setCommissionAmount] = useState("");
  const [earnedDate, setEarnedDate] = useState("");
  const [description, setDescription] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  // Auto-calc state
  const [jobType, setJobType] = useState("");
  const [gallons, setGallons] = useState<number | null>(null);
  const [dumpFeePerGallon, setDumpFeePerGallon] = useState<number | null>(null);
  const [dumpFeeAmount, setDumpFeeAmount] = useState<number | null>(null);
  const [commissionableAmount, setCommissionableAmount] = useState<
    number | null
  >(null);
  const [calculationResult, setCalculationResult] =
    useState<CommissionCalculation | null>(null);

  // Hooks
  const { data: techniciansData } = useTechnicians({ active_only: true });
  const { data: workOrders, isLoading: workOrdersLoading } =
    useWorkOrdersForCommission();
  const { data: dumpSites } = useDumpSites({ is_active: true });
  const createCommission = useCreateCommission();
  const updateCommission = useUpdateCommission();
  const deleteCommission = useDeleteCommission();
  const calculateCommission = useCalculateCommission();

  const technicians = techniciansData?.items || [];

  // Determine if dump site is needed
  const requiresDumpSite = jobType
    ? COMMISSION_RATES[jobType]?.applyDumpFee
    : false;

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (commission) {
        // Editing - populate form with existing data
        setTechnicianId(commission.technician_id);
        setSelectedWorkOrderId(commission.work_order_id || "");
        setCommissionType(commission.commission_type || "job_completion");
        setBaseAmount(
          String(commission.base_amount || commission.job_total || ""),
        );
        setRate(
          String((commission.rate || commission.commission_rate || 0) * 100),
        ); // Convert decimal to percentage
        setRateType(commission.rate_type || "percent");
        setCommissionAmount(String(commission.commission_amount || ""));
        setEarnedDate(commission.earned_date || "");
        setDescription(commission.description || commission.notes || "");
        setJobType(commission.job_type || "");
        setGallons(commission.gallons_pumped || null);
        setDumpSiteId(commission.dump_site_id || "");
        setDumpFeePerGallon(commission.dump_fee_per_gallon || null);
        setDumpFeeAmount(commission.dump_fee_amount || null);
        setCommissionableAmount(commission.commissionable_amount || null);
        setManualMode(true); // When editing, start in manual mode
        setCalculationResult(null);
      } else {
        // Creating - reset form
        setTechnicianId("");
        setSelectedWorkOrderId("");
        setDumpSiteId("");
        setCommissionType("job_completion");
        setBaseAmount("");
        setRate("");
        setRateType("percent");
        setCommissionAmount("");
        setEarnedDate(new Date().toISOString().split("T")[0]);
        setDescription("");
        setJobType("");
        setGallons(null);
        setDumpFeePerGallon(null);
        setDumpFeeAmount(null);
        setCommissionableAmount(null);
        setManualMode(false);
        setCalculationResult(null);
      }
      setShowDeleteConfirm(false);
    }
  }, [open, commission]);

  // Handle work order selection
  const handleWorkOrderSelect = useCallback(
    async (workOrderId: string) => {
      setSelectedWorkOrderId(workOrderId);

      if (!workOrderId) {
        // Reset auto-calc fields
        setTechnicianId("");
        setJobType("");
        setGallons(null);
        setBaseAmount("");
        setRate("");
        setDumpSiteId("");
        setDumpFeePerGallon(null);
        setDumpFeeAmount(null);
        setCommissionableAmount(null);
        setCommissionAmount("");
        setCalculationResult(null);
        return;
      }

      // Find the selected work order
      const wo = workOrders?.find((w) => w.id === workOrderId);
      if (!wo) return;

      // Auto-fill from work order
      setTechnicianId(wo.technician_id || "");
      setJobType(wo.job_type);
      setGallons(wo.estimated_gallons || null);
      setBaseAmount(String(wo.total_amount || ""));

      // Set rate based on job type
      const rateConfig = COMMISSION_RATES[wo.job_type];
      if (rateConfig) {
        setRate(String(rateConfig.rate * 100));
      }

      // If doesn't require dump site, calculate immediately
      if (!rateConfig?.applyDumpFee) {
        try {
          const result = await calculateCommission.mutateAsync({
            work_order_id: workOrderId,
          });
          setCalculationResult(result);
          setCommissionAmount(String(result.commission_amount));
          setCommissionableAmount(result.commissionable_amount);
        } catch (error) {
          console.error("Auto-calculate error:", error);
        }
      }
    },
    [workOrders, calculateCommission],
  );

  // Handle dump site selection and calculate
  const handleDumpSiteSelect = useCallback(
    async (siteId: string) => {
      setDumpSiteId(siteId);

      if (!siteId || !selectedWorkOrderId) {
        setDumpFeePerGallon(null);
        setDumpFeeAmount(null);
        setCommissionableAmount(null);
        setCommissionAmount("");
        setCalculationResult(null);
        return;
      }

      // Find the selected dump site
      const site = dumpSites?.find((s) => s.id === siteId);
      if (site) {
        setDumpFeePerGallon(site.fee_per_gallon);
      }

      // Calculate commission with dump site
      try {
        const result = await calculateCommission.mutateAsync({
          work_order_id: selectedWorkOrderId,
          dump_site_id: siteId,
        });
        setCalculationResult(result);
        setCommissionAmount(String(result.commission_amount));
        setDumpFeeAmount(result.dump_fee_total || null);
        setCommissionableAmount(result.commissionable_amount);
      } catch (error) {
        toastError("Calculation Error", getErrorMessage(error));
      }
    },
    [selectedWorkOrderId, dumpSites, calculateCommission],
  );

  // Manual calculation fallback (when not using work order)
  useEffect(() => {
    if (manualMode && rateType === "percent" && baseAmount && rate) {
      const base = parseFloat(baseAmount);
      const rateDecimal = parseFloat(rate) / 100;
      if (!isNaN(base) && !isNaN(rateDecimal)) {
        const calculated = base * rateDecimal;
        setCommissionAmount(calculated.toFixed(2));
      }
    } else if (manualMode && rateType === "fixed" && rate) {
      setCommissionAmount(rate);
    }
  }, [manualMode, baseAmount, rate, rateType]);

  const handleSubmit = useCallback(async () => {
    if (!technicianId) {
      toastError("Validation Error", "Please select a technician");
      return;
    }
    if (!baseAmount || parseFloat(baseAmount) < 0) {
      toastError("Validation Error", "Please enter a valid job/base amount");
      return;
    }
    if (!rate || parseFloat(rate) < 0) {
      toastError("Validation Error", "Please enter a valid commission rate");
      return;
    }
    if (requiresDumpSite && !dumpSiteId && !manualMode) {
      toastError(
        "Validation Error",
        "Please select a dump site for pumping jobs",
      );
      return;
    }

    try {
      if (isEditing && commission) {
        // Update existing commission
        await updateCommission.mutateAsync({
          commissionId: commission.id,
          input: {
            base_amount: parseFloat(baseAmount),
            rate: parseFloat(rate) / 100, // Convert percentage to decimal
            commission_amount: parseFloat(commissionAmount),
            description: description || undefined,
            commission_type:
              commissionType as CreateCommissionInput["commission_type"],
          },
        });
        toastSuccess(
          "Commission Updated",
          "Commission has been updated successfully",
        );
      } else {
        // Create new commission
        const input: CreateCommissionInput = {
          technician_id: technicianId,
          work_order_id: selectedWorkOrderId || undefined,
          commission_type:
            commissionType as CreateCommissionInput["commission_type"],
          base_amount: parseFloat(baseAmount),
          rate: parseFloat(rate) / 100, // Convert percentage to decimal
          rate_type: rateType,
          commission_amount: parseFloat(commissionAmount),
          earned_date: earnedDate || undefined,
          description: description || undefined,
          // Auto-calc fields
          dump_site_id: dumpSiteId || undefined,
          job_type: jobType || undefined,
          gallons_pumped: gallons || undefined,
          dump_fee_per_gallon: dumpFeePerGallon || undefined,
          dump_fee_amount: dumpFeeAmount || undefined,
          commissionable_amount: commissionableAmount || undefined,
        };
        await createCommission.mutateAsync(input);
        toastSuccess("Commission Created", "New commission has been created");
      }
      onClose();
    } catch (error) {
      toastError("Error", getErrorMessage(error));
    }
  }, [
    isEditing,
    commission,
    technicianId,
    selectedWorkOrderId,
    commissionType,
    baseAmount,
    rate,
    rateType,
    commissionAmount,
    earnedDate,
    description,
    dumpSiteId,
    jobType,
    gallons,
    dumpFeePerGallon,
    dumpFeeAmount,
    commissionableAmount,
    requiresDumpSite,
    manualMode,
    createCommission,
    updateCommission,
    onClose,
  ]);

  const handleDelete = useCallback(async () => {
    if (!commission) return;

    try {
      await deleteCommission.mutateAsync(commission.id);
      toastSuccess("Commission Deleted", "Commission has been deleted");
      onClose();
    } catch (error) {
      toastError("Delete Failed", getErrorMessage(error));
    }
  }, [commission, deleteCommission, onClose]);

  const isLoading =
    createCommission.isPending ||
    updateCommission.isPending ||
    deleteCommission.isPending ||
    calculateCommission.isPending;

  const isValid =
    technicianId &&
    baseAmount &&
    parseFloat(baseAmount) >= 0 &&
    rate &&
    parseFloat(rate) >= 0 &&
    (!requiresDumpSite || dumpSiteId || manualMode);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader onClose={onClose}>
          {isEditing ? "Edit Commission" : "Add New Commission"}
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            {/* Mode Toggle */}
            {!isEditing && (
              <div className="flex items-center gap-4 p-3 bg-bg-muted rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    checked={!manualMode}
                    onChange={() => setManualMode(false)}
                    className="text-primary"
                  />
                  <span className="text-sm">
                    Auto-Calculate from Work Order
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    checked={manualMode}
                    onChange={() => setManualMode(true)}
                    className="text-primary"
                  />
                  <span className="text-sm">Manual Entry</span>
                </label>
              </div>
            )}

            {/* Work Order Selection (Auto mode) */}
            {!manualMode && !isEditing && (
              <div>
                <Label htmlFor="work-order">Select Work Order *</Label>
                <select
                  id="work-order"
                  value={selectedWorkOrderId}
                  onChange={(e) => handleWorkOrderSelect(e.target.value)}
                  disabled={workOrdersLoading}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  <option value="">
                    {workOrdersLoading
                      ? "Loading..."
                      : "Select a completed work order..."}
                  </option>
                  {workOrders?.map((wo) => (
                    <option key={wo.id} value={wo.id}>
                      {wo.scheduled_date} - {wo.job_type.toUpperCase()} -{" "}
                      {formatCurrency(wo.total_amount)}
                      {wo.technician_name ? ` (${wo.technician_name})` : ""}
                    </option>
                  ))}
                </select>
                {workOrders?.length === 0 && !workOrdersLoading && (
                  <p className="text-xs text-text-secondary mt-1">
                    No completed work orders without commissions found
                  </p>
                )}
              </div>
            )}

            {/* Dump Site Selection (for pumping jobs) */}
            {requiresDumpSite && !manualMode && selectedWorkOrderId && (
              <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="flex items-start gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-warning">
                      Dump Site Required
                    </p>
                    <p className="text-xs text-text-secondary">
                      Select the dump site to calculate dump fees for this{" "}
                      {jobType} job
                    </p>
                  </div>
                </div>
                <Label htmlFor="dump-site">Dump Site *</Label>
                <select
                  id="dump-site"
                  value={dumpSiteId}
                  onChange={(e) => handleDumpSiteSelect(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a dump site...</option>
                  {dumpSites?.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name} ({site.address_state}) - $
                      {site.fee_per_gallon.toFixed(4)}/gallon
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Warning: Dump fees exceed job total */}
            {calculationResult?.warning && !manualMode && (
              <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="flex items-start gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-warning">
                      Warning: No Commission Earned
                    </p>
                    <p className="text-xs text-text-secondary">
                      {calculationResult.warning}
                    </p>
                  </div>
                </div>
                <div className="space-y-1 font-mono text-sm">
                  {calculationResult.breakdown.steps.map((step, i) => (
                    <p key={i} className="text-text-secondary">
                      {step}
                    </p>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-warning/30 flex justify-between items-center">
                  <span className="text-sm font-medium">Total Commission:</span>
                  <span className="text-lg font-bold text-warning">
                    {formatCurrency(calculationResult.commission_amount)}
                  </span>
                </div>
              </div>
            )}

            {/* Calculation Result Display */}
            {calculationResult && !calculationResult.warning && !manualMode && (
              <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
                <div className="flex items-start gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-success">
                      Commission Calculated
                    </p>
                    <p className="text-xs text-text-secondary">
                      {calculationResult.breakdown.formula}
                    </p>
                  </div>
                </div>
                <div className="space-y-1 font-mono text-sm">
                  {calculationResult.breakdown.steps.map((step, i) => (
                    <p key={i} className="text-text-secondary">
                      {step}
                    </p>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-success/30 flex justify-between items-center">
                  <span className="text-sm font-medium">Total Commission:</span>
                  <span className="text-lg font-bold text-success">
                    {formatCurrency(calculationResult.commission_amount)}
                  </span>
                </div>
              </div>
            )}

            {/* Technician Selection (Manual mode or display) */}
            <div>
              <Label htmlFor="technician">Technician *</Label>
              <select
                id="technician"
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                disabled={
                  isEditing || (!manualMode && selectedWorkOrderId !== "")
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              >
                <option value="">Select a technician...</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.first_name} {tech.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Commission Type */}
            <div>
              <Label htmlFor="commission-type">Commission Type</Label>
              <select
                id="commission-type"
                value={commissionType}
                onChange={(e) => setCommissionType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {COMMISSION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Job Details (shown for auto-calc) */}
            {!manualMode && jobType && (
              <div className="grid grid-cols-3 gap-4 p-3 bg-bg-muted rounded-lg">
                <div>
                  <span className="text-xs text-text-secondary">Job Type</span>
                  <p className="font-medium capitalize">
                    {jobType.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-text-secondary">
                    Commission Rate
                  </span>
                  <p className="font-medium">
                    {formatPercent(COMMISSION_RATES[jobType]?.rate || 0.15)}
                  </p>
                </div>
                {gallons && (
                  <div>
                    <span className="text-xs text-text-secondary">
                      Est. Gallons
                    </span>
                    <p className="font-medium">{gallons.toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}

            {/* Manual Entry Fields */}
            {(manualMode || isEditing) && (
              <>
                {/* Work Order ID (Optional) */}
                {manualMode && (
                  <div>
                    <Label htmlFor="work-order-manual">
                      Work Order ID (Optional)
                    </Label>
                    <Input
                      id="work-order-manual"
                      type="text"
                      placeholder="WO-12345"
                      value={selectedWorkOrderId}
                      onChange={(e) => setSelectedWorkOrderId(e.target.value)}
                    />
                    <p className="text-xs text-text-secondary mt-1">
                      Link this commission to a work order
                    </p>
                  </div>
                )}

                {/* Job/Base Amount */}
                <div>
                  <Label htmlFor="base-amount">Job Total / Base Amount *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <Input
                      id="base-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="500.00"
                      value={baseAmount}
                      onChange={(e) => setBaseAmount(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Rate Type & Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rate-type">Rate Type</Label>
                    <select
                      id="rate-type"
                      value={rateType}
                      onChange={(e) =>
                        setRateType(e.target.value as "percent" | "fixed")
                      }
                      className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="percent">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="rate">
                      {rateType === "percent" ? "Rate (%)" : "Fixed Amount ($)"}
                    </Label>
                    <div className="relative">
                      {rateType === "percent" ? (
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                      ) : (
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                      )}
                      <Input
                        id="rate"
                        type="number"
                        step="0.1"
                        min="0"
                        max={rateType === "percent" ? "100" : undefined}
                        placeholder={rateType === "percent" ? "15" : "50.00"}
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Calculated Commission Amount */}
                <div>
                  <Label htmlFor="commission-amount">Commission Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <Input
                      id="commission-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="25.00"
                      value={commissionAmount}
                      onChange={(e) => setCommissionAmount(e.target.value)}
                      className="pl-9 bg-bg-muted"
                    />
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    Auto-calculated from base amount and rate (can override)
                  </p>
                </div>
              </>
            )}

            {/* Earned Date */}
            <div>
              <Label htmlFor="earned-date">Earned Date</Label>
              <Input
                id="earned-date"
                type="date"
                value={earnedDate}
                onChange={(e) => setEarnedDate(e.target.value)}
              />
            </div>

            {/* Description/Notes */}
            <div>
              <Label htmlFor="description">Description / Notes</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes about this commission..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Delete Section (only when editing pending commissions) */}
            {isEditing && commission?.status === "pending" && (
              <div className="pt-4 border-t border-border">
                {!showDeleteConfirm ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-danger hover:text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Commission
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-danger/10 rounded-lg">
                    <span className="text-sm text-danger">
                      Delete this commission?
                    </span>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleteCommission.isPending}
                    >
                      {deleteCommission.isPending
                        ? "Deleting..."
                        : "Yes, Delete"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}
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
            {isLoading ? (
              <>
                <Calculator className="w-4 h-4 mr-2 animate-spin" />
                {isEditing ? "Saving..." : "Creating..."}
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Create Commission"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
