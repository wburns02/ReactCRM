import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { Commission } from "@/api/types/payroll";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";

interface CommissionDetailModalProps {
  commission: Commission | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (commission: Commission) => void;
  onDelete?: (commission: Commission) => void;
}

/**
 * Read-only modal displaying all commission details.
 * Opens when user clicks a commission row in the table.
 */
export function CommissionDetailModal({
  commission,
  open,
  onClose,
  onEdit,
  onDelete,
}: CommissionDetailModalProps) {
  if (!commission) return null;

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercent = (rate: number | undefined) => {
    if (rate === undefined || rate === null) return "N/A";
    return `${(rate * 100).toFixed(0)}%`;
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "warning";
      case "approved":
        return "info";
      case "paid":
        return "success";
      default:
        return "default";
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent size="lg" className="max-w-2xl">
        <DialogHeader onClose={onClose}>
          <div className="flex items-center gap-3">
            <span>Commission Details</span>
            <Badge variant={getStatusColor(commission.status)}>
              {commission.status.charAt(0).toUpperCase() +
                commission.status.slice(1)}
            </Badge>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-6">
          {/* Assignment Section */}
          <section>
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Assignment
            </h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-text-muted">Technician</dt>
                <dd className="font-medium text-text-primary">
                  {commission.technician_name || "Unassigned"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-text-muted">Work Order</dt>
                <dd className="font-medium text-text-primary">
                  {commission.work_order_id ? (
                    <Link
                      to={`/work-orders/${commission.work_order_id}`}
                      className="text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {commission.work_order_number || `WO-${commission.work_order_id.slice(0, 8)}`}
                    </Link>
                  ) : (
                    "N/A"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-text-muted">Commission Type</dt>
                <dd className="font-medium text-text-primary capitalize">
                  {commission.commission_type?.replace(/_/g, " ") || "Job Completion"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-text-muted">Earned Date</dt>
                <dd className="font-medium text-text-primary">
                  {formatDate(commission.earned_date)}
                </dd>
              </div>
            </dl>
          </section>

          {/* Financial Details Section */}
          <section className="bg-bg-hover/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Commission Calculation
            </h3>
            <dl className="space-y-3">
              <div className="flex justify-between items-center">
                <dt className="text-sm text-text-muted">Job Total</dt>
                <dd className="font-medium text-text-primary">
                  {formatCurrency(commission.base_amount)}
                </dd>
              </div>

              {commission.dump_fee_amount && commission.dump_fee_amount > 0 && (
                <div className="flex justify-between items-center text-orange-600">
                  <dt className="text-sm">Dump Fee Deducted</dt>
                  <dd className="font-medium">
                    -{formatCurrency(commission.dump_fee_amount)}
                  </dd>
                </div>
              )}

              {commission.commissionable_amount !== undefined &&
                commission.commissionable_amount !== commission.base_amount && (
                  <div className="flex justify-between items-center">
                    <dt className="text-sm text-text-muted">Commissionable Amount</dt>
                    <dd className="font-medium text-text-primary">
                      {formatCurrency(commission.commissionable_amount)}
                    </dd>
                  </div>
                )}

              <div className="flex justify-between items-center">
                <dt className="text-sm text-text-muted">Commission Rate</dt>
                <dd className="font-medium text-text-primary">
                  {formatPercent(commission.rate)}
                  {commission.rate_type === "fixed" && " (fixed)"}
                </dd>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-border">
                <dt className="font-semibold text-text-primary">Commission Amount</dt>
                <dd className="text-xl font-bold text-success">
                  {formatCurrency(commission.commission_amount)}
                </dd>
              </div>
            </dl>
          </section>

          {/* Job Details Section */}
          {(commission.job_type || commission.gallons_pumped) && (
            <section>
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
                Job Details
              </h3>
              <dl className="grid grid-cols-2 gap-4">
                {commission.job_type && (
                  <div>
                    <dt className="text-sm text-text-muted">Job Type</dt>
                    <dd className="font-medium text-text-primary capitalize">
                      {commission.job_type.replace(/_/g, " ")}
                    </dd>
                  </div>
                )}
                {commission.gallons_pumped && (
                  <div>
                    <dt className="text-sm text-text-muted">Gallons Pumped</dt>
                    <dd className="font-medium text-text-primary">
                      {commission.gallons_pumped.toLocaleString()}
                    </dd>
                  </div>
                )}
                {commission.dump_fee_per_gallon && (
                  <div>
                    <dt className="text-sm text-text-muted">Dump Fee Rate</dt>
                    <dd className="font-medium text-text-primary">
                      {formatCurrency(commission.dump_fee_per_gallon)}/gal
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* Notes Section */}
          {(commission.description || commission.notes) && (
            <section>
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2">
                Notes
              </h3>
              <p className="text-text-secondary bg-bg-hover/30 rounded p-3">
                {commission.description || commission.notes}
              </p>
            </section>
          )}

          {/* Metadata */}
          <section className="text-xs text-text-muted border-t border-border pt-4">
            <div className="flex justify-between">
              <span>ID: {commission.id.slice(0, 8)}...</span>
              {commission.created_at && (
                <span>Created: {formatDate(commission.created_at)}</span>
              )}
            </div>
          </section>
        </DialogBody>

        <DialogFooter>
          {onDelete && commission.status === "pending" && (
            <Button
              variant="danger"
              onClick={() => {
                onDelete(commission);
                onClose();
              }}
              className="mr-auto"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {onEdit && commission.status === "pending" && (
            <Button
              variant="primary"
              onClick={() => {
                onEdit(commission);
                onClose();
              }}
            >
              Edit Commission
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
