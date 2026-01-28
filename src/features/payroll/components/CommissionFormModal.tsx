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
import {
  useCreateCommission,
  useUpdateCommission,
  useDeleteCommission,
} from "@/api/hooks/usePayroll.ts";
import type { Commission, CreateCommissionInput } from "@/api/types/payroll.ts";
import { DollarSign, Percent, Trash2 } from "lucide-react";

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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

export function CommissionFormModal({
  open,
  onClose,
  commission,
}: CommissionFormModalProps) {
  const isEditing = !!commission;

  // Form state
  const [technicianId, setTechnicianId] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");
  const [commissionType, setCommissionType] = useState<string>("job_completion");
  const [baseAmount, setBaseAmount] = useState("");
  const [rate, setRate] = useState("");
  const [rateType, setRateType] = useState<"percent" | "fixed">("percent");
  const [commissionAmount, setCommissionAmount] = useState("");
  const [earnedDate, setEarnedDate] = useState("");
  const [description, setDescription] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Hooks
  const { data: techniciansData } = useTechnicians({ active_only: true });
  const createCommission = useCreateCommission();
  const updateCommission = useUpdateCommission();
  const deleteCommission = useDeleteCommission();

  const technicians = techniciansData?.items || [];

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (commission) {
        // Editing - populate form with existing data
        setTechnicianId(commission.technician_id);
        setWorkOrderId(commission.work_order_id || "");
        setCommissionType(commission.commission_type || "job_completion");
        setBaseAmount(String(commission.base_amount || commission.job_total || ""));
        setRate(String((commission.rate || commission.commission_rate || 0) * 100)); // Convert decimal to percentage
        setRateType(commission.rate_type || "percent");
        setCommissionAmount(String(commission.commission_amount || ""));
        setEarnedDate(commission.earned_date || "");
        setDescription(commission.description || commission.notes || "");
      } else {
        // Creating - reset form
        setTechnicianId("");
        setWorkOrderId("");
        setCommissionType("job_completion");
        setBaseAmount("");
        setRate("5"); // Default 5%
        setRateType("percent");
        setCommissionAmount("");
        setEarnedDate(new Date().toISOString().split("T")[0]);
        setDescription("");
      }
      setShowDeleteConfirm(false);
    }
  }, [open, commission]);

  // Auto-calculate commission amount when base amount or rate changes
  useEffect(() => {
    if (rateType === "percent" && baseAmount && rate) {
      const base = parseFloat(baseAmount);
      const rateDecimal = parseFloat(rate) / 100;
      if (!isNaN(base) && !isNaN(rateDecimal)) {
        const calculated = base * rateDecimal;
        setCommissionAmount(calculated.toFixed(2));
      }
    } else if (rateType === "fixed" && rate) {
      setCommissionAmount(rate);
    }
  }, [baseAmount, rate, rateType]);

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
            commission_type: commissionType as CreateCommissionInput["commission_type"],
          },
        });
        toastSuccess("Commission Updated", "Commission has been updated successfully");
      } else {
        // Create new commission
        const input: CreateCommissionInput = {
          technician_id: technicianId,
          work_order_id: workOrderId || undefined,
          commission_type: commissionType as CreateCommissionInput["commission_type"],
          base_amount: parseFloat(baseAmount),
          rate: parseFloat(rate) / 100, // Convert percentage to decimal
          rate_type: rateType,
          commission_amount: parseFloat(commissionAmount),
          earned_date: earnedDate || undefined,
          description: description || undefined,
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
    workOrderId,
    commissionType,
    baseAmount,
    rate,
    rateType,
    commissionAmount,
    earnedDate,
    description,
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
    deleteCommission.isPending;

  const isValid =
    technicianId &&
    baseAmount &&
    parseFloat(baseAmount) >= 0 &&
    rate &&
    parseFloat(rate) >= 0;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader onClose={onClose}>
          {isEditing ? "Edit Commission" : "Add New Commission"}
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
                disabled={isEditing} // Can't change technician when editing
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

            {/* Work Order ID (Optional) */}
            <div>
              <Label htmlFor="work-order">Work Order ID (Optional)</Label>
              <Input
                id="work-order"
                type="text"
                placeholder="WO-12345"
                value={workOrderId}
                onChange={(e) => setWorkOrderId(e.target.value)}
              />
              <p className="text-xs text-text-secondary mt-1">
                Link this commission to a work order
              </p>
            </div>

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
              <p className="text-xs text-text-secondary mt-1">
                The total job amount or base the commission is calculated on
              </p>
            </div>

            {/* Rate Type & Rate */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rate-type">Rate Type</Label>
                <select
                  id="rate-type"
                  value={rateType}
                  onChange={(e) => setRateType(e.target.value as "percent" | "fixed")}
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
                    placeholder={rateType === "percent" ? "5" : "50.00"}
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
                    <span className="text-sm text-danger">Delete this commission?</span>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleteCommission.isPending}
                    >
                      {deleteCommission.isPending ? "Deleting..." : "Yes, Delete"}
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
            {isLoading
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
                ? "Save Changes"
                : "Create Commission"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
