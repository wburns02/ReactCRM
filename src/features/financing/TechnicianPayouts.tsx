/**
 * Technician Payouts Component
 * View earnings and request instant payouts
 */
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  useTechnicianEarnings,
  useTechnicianPayouts,
  useRequestInstantPayout,
  useInstantPayoutFee,
} from "@/api/hooks/useFintech";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { getErrorMessage } from "@/api/client";
import { toastError } from "@/components/ui/Toast";

interface TechnicianPayoutsProps {
  technicianId: string;
  technicianName?: string;
}

export function TechnicianPayouts({
  technicianId,
  technicianName,
}: TechnicianPayoutsProps) {
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");

  const { data: earnings, isLoading: earningsLoading } =
    useTechnicianEarnings(technicianId);
  const { data: payouts, isLoading: payoutsLoading } =
    useTechnicianPayouts(technicianId);
  const requestPayout = useRequestInstantPayout();

  const amount = parseFloat(payoutAmount) || 0;
  const { data: feeData } = useInstantPayoutFee(amount);

  const handleRequestPayout = async () => {
    if (amount <= 0) return;

    try {
      await requestPayout.mutateAsync({
        technician_id: technicianId,
        amount,
      });
      setShowPayoutDialog(false);
      setPayoutAmount("");
    } catch (error) {
      toastError(`Error: ${getErrorMessage(error)}`);
    }
  };

  const maxPayout = earnings?.available_for_instant_payout || 0;

  return (
    <div className="space-y-6">
      {/* Earnings Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Earnings Overview</CardTitle>
              <p className="text-sm text-text-secondary mt-1">
                {technicianName || "Technician"}'s current pay period
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowPayoutDialog(true)}
              disabled={maxPayout <= 0}
            >
              Request Instant Payout
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {earningsLoading ? (
            <div className="h-40 bg-background-secondary animate-pulse rounded" />
          ) : earnings ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-background-secondary rounded-lg p-4">
                  <p className="text-sm text-text-muted">Gross Earnings</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(earnings.gross_earnings)}
                  </p>
                </div>
                <div className="bg-background-secondary rounded-lg p-4">
                  <p className="text-sm text-text-muted">Jobs Completed</p>
                  <p className="text-2xl font-bold">{earnings.total_jobs}</p>
                </div>
                <div className="bg-background-secondary rounded-lg p-4">
                  <p className="text-sm text-text-muted">Hours Worked</p>
                  <p className="text-2xl font-bold">
                    {earnings.total_hours.toFixed(1)}
                  </p>
                </div>
                <div className="bg-success/10 rounded-lg p-4">
                  <p className="text-sm text-success">Available for Payout</p>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(earnings.available_for_instant_payout)}
                  </p>
                </div>
              </div>

              {/* Earnings Breakdown */}
              <div className="border border-border rounded-lg p-4">
                <h4 className="font-medium mb-3">Earnings Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Base Pay</span>
                    <span>{formatCurrency(earnings.base_pay)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Commission</span>
                    <span>{formatCurrency(earnings.commission)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Bonuses</span>
                    <span className="text-success">
                      +{formatCurrency(earnings.bonuses)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Deductions</span>
                    <span className="text-error">
                      -{formatCurrency(earnings.deductions)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border font-medium">
                    <span>Gross Total</span>
                    <span>{formatCurrency(earnings.gross_earnings)}</span>
                  </div>
                </div>
              </div>

              {/* Recent Jobs */}
              {earnings.jobs.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Recent Jobs</h4>
                  <div className="space-y-2">
                    {earnings.jobs.slice(0, 5).map((job) => (
                      <div
                        key={job.work_order_id}
                        className="flex items-center justify-between p-3 bg-background-secondary rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{job.customer_name}</p>
                          <p className="text-sm text-text-muted">
                            {job.job_type} • {job.duration_hours}h •{" "}
                            {formatDate(job.completed_at)}
                          </p>
                        </div>
                        <span className="font-medium text-success">
                          +{formatCurrency(job.earnings)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-text-secondary">No earnings data available</p>
          )}
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          {payoutsLoading ? (
            <div className="h-40 bg-background-secondary animate-pulse rounded" />
          ) : !payouts?.length ? (
            <p className="text-text-secondary text-center py-8">
              No payouts yet
            </p>
          ) : (
            <div className="space-y-3">
              {payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatCurrency(payout.net_amount)}
                      </span>
                      <Badge
                        className={cn(
                          payout.status === "completed" &&
                            "bg-success/10 text-success",
                          payout.status === "processing" &&
                            "bg-warning/10 text-warning",
                          payout.status === "pending" && "bg-info/10 text-info",
                          payout.status === "failed" &&
                            "bg-error/10 text-error",
                        )}
                      >
                        {payout.status}
                      </Badge>
                      {payout.type === "instant" && (
                        <Badge variant="outline">Instant</Badge>
                      )}
                    </div>
                    <p className="text-sm text-text-muted mt-1">
                      {formatDate(payout.created_at)}
                      {payout.fee > 0 &&
                        ` • Fee: ${formatCurrency(payout.fee)}`}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-lg font-semibold",
                      payout.status === "completed"
                        ? "text-success"
                        : "text-text-muted",
                    )}
                  >
                    {formatCurrency(payout.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instant Payout Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Instant Payout</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-success/10 border border-success/30 rounded-lg p-4">
              <p className="text-sm text-success">
                Available for instant payout:{" "}
                <strong>{formatCurrency(maxPayout)}</strong>
              </p>
            </div>

            <div>
              <Label htmlFor="payout-amount">Amount</Label>
              <Input
                id="payout-amount"
                type="number"
                step="0.01"
                min="0"
                max={maxPayout}
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="Enter amount"
              />
              <div className="flex justify-end mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPayoutAmount(maxPayout.toString())}
                >
                  Max
                </Button>
              </div>
            </div>

            {amount > 0 && feeData && (
              <div className="border border-border rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Payout Amount</span>
                  <span>{formatCurrency(amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">
                    Instant Payout Fee (1.5%)
                  </span>
                  <span className="text-error">
                    -{formatCurrency(feeData.fee)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border font-medium">
                  <span>You'll Receive</span>
                  <span className="text-success">
                    {formatCurrency(feeData.net_amount)}
                  </span>
                </div>
              </div>
            )}

            <p className="text-xs text-text-muted">
              Instant payouts are typically deposited within minutes. A 1.5% fee
              applies for instant payouts. Standard payouts (next business day)
              are free.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPayoutDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleRequestPayout}
              disabled={
                amount <= 0 || amount > maxPayout || requestPayout.isPending
              }
            >
              {requestPayout.isPending
                ? "Processing..."
                : "Request Instant Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
