import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { usePayRates, useCommissions } from "@/api/hooks/usePayroll.ts";
import { formatDate, formatCurrency } from "@/lib/utils.ts";

interface TechCompensationTabProps {
  technicianId: string;
}

const COMMISSION_TYPE_LABELS: Record<string, string> = {
  job_completion: "Job Completion",
  upsell: "Upsell",
  referral: "Referral",
  bonus: "Bonus",
  pump_out: "Pump Out",
  service: "Service",
};

export function TechCompensationTab({ technicianId }: TechCompensationTabProps) {
  const { data: payRatesData, isLoading: ratesLoading } = usePayRates({
    technician_id: technicianId,
    is_active: true,
  });
  const { data: commissionsData, isLoading: commissionsLoading } = useCommissions({
    technician_id: technicianId,
  });

  // Get active pay rate
  const activeRate = useMemo(() => {
    const rates = payRatesData ?? [];
    return rates.find((r) => r.is_active) ?? rates[0] ?? null;
  }, [payRatesData]);

  // Commission summary
  const commissionSummary = useMemo(() => {
    const items = commissionsData ?? [];
    const totalEarned = items.reduce(
      (sum, c) => sum + (c.commission_amount ?? 0),
      0,
    );
    const pendingAmount = items
      .filter((c) => c.status === "pending")
      .reduce((sum, c) => sum + (c.commission_amount ?? 0), 0);
    const paidAmount = items
      .filter((c) => c.status === "paid" || c.status === "approved")
      .reduce((sum, c) => sum + (c.commission_amount ?? 0), 0);
    const avgPerJob =
      items.length > 0 ? totalEarned / items.length : 0;
    return { totalEarned, pendingAmount, paidAmount, avgPerJob, count: items.length };
  }, [commissionsData]);

  // Backboard threshold: $60K annual / 26 biweekly = $2,307.69
  const backboardThreshold = activeRate?.salary_amount
    ? Number(activeRate.salary_amount) / 26
    : 2307.69;

  // Progress toward threshold (from commissions this period)
  const backboardProgress = Math.min(
    (commissionSummary.totalEarned / backboardThreshold) * 100,
    100,
  );

  return (
    <div className="space-y-6">
      {/* Earnings Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-text-muted">Total Commissions</p>
            <p className="text-2xl font-bold text-text-primary">
              {formatCurrency(commissionSummary.totalEarned)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-text-muted">Pending</p>
            <p className="text-2xl font-bold text-warning">
              {formatCurrency(commissionSummary.pendingAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-text-muted">Paid/Approved</p>
            <p className="text-2xl font-bold text-success">
              {formatCurrency(commissionSummary.paidAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-text-muted">Avg Per Job</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(commissionSummary.avgPerJob)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pay Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Current Pay Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {ratesLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-6 bg-bg-muted rounded w-1/2" />
                <div className="h-6 bg-bg-muted rounded w-1/3" />
              </div>
            ) : !activeRate ? (
              <p className="text-text-muted py-4">No pay rate configured</p>
            ) : (
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-text-muted">Pay Type</dt>
                  <dd className="text-text-primary font-medium capitalize">
                    {activeRate.pay_type}
                  </dd>
                </div>
                {activeRate.hourly_rate != null && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-text-muted">Hourly Rate</dt>
                    <dd className="text-text-primary font-medium">
                      ${Number(activeRate.hourly_rate).toFixed(2)}/hr
                    </dd>
                  </div>
                )}
                {activeRate.overtime_multiplier != null && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-text-muted">OT Multiplier</dt>
                    <dd className="text-text-primary">
                      {Number(activeRate.overtime_multiplier).toFixed(1)}x
                    </dd>
                  </div>
                )}
                {activeRate.salary_amount != null && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-text-muted">Annual Salary</dt>
                    <dd className="text-text-primary">
                      ${Number(activeRate.salary_amount).toLocaleString()}
                    </dd>
                  </div>
                )}
                {activeRate.job_commission_rate != null && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-text-muted">Job Commission Rate</dt>
                    <dd className="text-text-primary">
                      {(Number(activeRate.job_commission_rate) * 100).toFixed(1)}%
                    </dd>
                  </div>
                )}
                {activeRate.upsell_commission_rate != null && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-text-muted">Upsell Commission Rate</dt>
                    <dd className="text-text-primary">
                      {(Number(activeRate.upsell_commission_rate) * 100).toFixed(1)}%
                    </dd>
                  </div>
                )}
                {activeRate.weekly_overtime_threshold != null && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-text-muted">OT Threshold</dt>
                    <dd className="text-text-primary">
                      {Number(activeRate.weekly_overtime_threshold)}h/week
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-sm text-text-muted">Effective Date</dt>
                  <dd className="text-text-primary">
                    {formatDate(activeRate.effective_date)}
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        {/* Backboard Tracker */}
        <Card>
          <CardHeader>
            <CardTitle>Backboard Tracker</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary mb-4">
              100% commission model with {formatCurrency(backboardThreshold)} biweekly guarantee threshold.
            </p>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Commission Earned</span>
                <span className="text-text-primary font-medium">
                  {formatCurrency(commissionSummary.totalEarned)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Threshold</span>
                <span className="text-text-primary font-medium">
                  {formatCurrency(backboardThreshold)}
                </span>
              </div>
              <div className="w-full h-4 bg-bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    backboardProgress >= 100
                      ? "bg-green-500"
                      : backboardProgress >= 70
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(backboardProgress, 100)}%` }}
                />
              </div>
              <p className="text-xs text-text-muted text-center">
                {backboardProgress >= 100
                  ? "Above threshold - commissions paid"
                  : `${backboardProgress.toFixed(0)}% of threshold - backboard may apply`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission History */}
      <Card>
        <CardHeader>
          <CardTitle>
            Commission History {commissionsData ? `(${commissionsData.length})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {commissionsLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-bg-muted rounded" />
              ))}
            </div>
          ) : !commissionsData || commissionsData.length === 0 ? (
            <p className="text-center text-text-muted py-8">
              No commissions recorded
            </p>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 text-text-muted font-medium">Date</th>
                      <th className="pb-3 text-text-muted font-medium">Type</th>
                      <th className="pb-3 text-text-muted font-medium text-right">Base Amount</th>
                      <th className="pb-3 text-text-muted font-medium text-right">Rate</th>
                      <th className="pb-3 text-text-muted font-medium text-right">Commission</th>
                      <th className="pb-3 text-text-muted font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {commissionsData.map((comm) => (
                      <tr key={comm.id} className="hover:bg-bg-hover transition-colors">
                        <td className="py-3 text-text-primary">
                          {comm.earned_date
                            ? formatDate(comm.earned_date)
                            : comm.created_at
                              ? formatDate(comm.created_at)
                              : "-"}
                        </td>
                        <td className="py-3">
                          <Badge variant="default">
                            {COMMISSION_TYPE_LABELS[comm.commission_type ?? ""] ??
                              comm.commission_type ??
                              "-"}
                          </Badge>
                        </td>
                        <td className="py-3 text-text-primary text-right">
                          {formatCurrency(comm.base_amount)}
                        </td>
                        <td className="py-3 text-text-secondary text-right">
                          {comm.rate_type === "percent"
                            ? `${(Number(comm.rate) * 100).toFixed(1)}%`
                            : formatCurrency(Number(comm.rate))}
                        </td>
                        <td className="py-3 text-text-primary font-medium text-right">
                          {formatCurrency(comm.commission_amount)}
                        </td>
                        <td className="py-3">
                          <Badge
                            variant={
                              comm.status === "paid"
                                ? "success"
                                : comm.status === "approved"
                                  ? "success"
                                  : "warning"
                            }
                          >
                            {comm.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3">
                {commissionsData.map((comm) => (
                  <div
                    key={comm.id}
                    className="p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <Badge variant="default">
                          {COMMISSION_TYPE_LABELS[comm.commission_type ?? ""] ??
                            comm.commission_type}
                        </Badge>
                        <span className="text-xs text-text-muted ml-2">
                          {comm.earned_date ? formatDate(comm.earned_date) : "-"}
                        </span>
                      </div>
                      <Badge
                        variant={
                          comm.status === "paid" || comm.status === "approved"
                            ? "success"
                            : "warning"
                        }
                      >
                        {comm.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">
                        {formatCurrency(comm.base_amount)} @{" "}
                        {comm.rate_type === "percent"
                          ? `${(Number(comm.rate) * 100).toFixed(1)}%`
                          : formatCurrency(Number(comm.rate))}
                      </span>
                      <span className="text-text-primary font-bold">
                        {formatCurrency(comm.commission_amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
