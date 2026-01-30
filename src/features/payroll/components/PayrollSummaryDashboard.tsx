import { useCurrentPayrollPeriod, usePayrollSummary } from "@/api/hooks/usePayroll";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { PayrollSummary } from "@/api/types/payroll";

/**
 * Stat Card for KPI display
 */
function StatCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string | number;
  variant?: "default" | "warning" | "success";
}) {
  const colorClasses = {
    default: "text-text-primary",
    warning: "text-warning",
    success: "text-success",
  };

  return (
    <Card className="p-4">
      <div className="text-sm text-text-muted">{label}</div>
      <div className={`text-2xl font-bold ${colorClasses[variant]}`}>{value}</div>
    </Card>
  );
}

/**
 * Loading skeleton for the dashboard
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-bg-muted rounded w-1/3"></div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 bg-bg-muted rounded-lg"></div>
        ))}
      </div>
      <div className="h-96 bg-bg-muted rounded-lg"></div>
    </div>
  );
}

/**
 * Empty state when no period or no data
 */
function EmptyState({ message }: { message: string }) {
  return (
    <Card className="p-8 text-center">
      <div className="text-4xl mb-4">📊</div>
      <h3 className="font-medium text-text-primary mb-2">No Data Available</h3>
      <p className="text-sm text-text-secondary">{message}</p>
    </Card>
  );
}

/**
 * Payroll Summary Dashboard
 *
 * Shows comprehensive payroll summary for the current pay period
 * including all technicians, their hours, pay, commissions, and jobs.
 */
export function PayrollSummaryDashboard() {
  // Auto-load current period
  const {
    data: period,
    isLoading: periodLoading,
    error: periodError,
  } = useCurrentPayrollPeriod();

  const {
    data: summaries,
    isLoading: summaryLoading,
  } = usePayrollSummary(period?.id || "");

  // Status badge colors
  const statusColors: Record<string, "default" | "warning" | "success" | "secondary"> = {
    draft: "secondary",
    processing: "warning",
    approved: "default",
    paid: "success",
    void: "secondary",
  };

  if (periodLoading || summaryLoading) {
    return <LoadingSkeleton />;
  }

  if (periodError) {
    return (
      <EmptyState message="Could not load payroll period. Please try again or create a new period." />
    );
  }

  if (!period) {
    return (
      <EmptyState message="No payroll period found. Create a new pay period to get started." />
    );
  }

  if (!summaries || summaries.length === 0) {
    return (
      <div className="space-y-6">
        {/* Period Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary">
              Payroll Summary
            </h2>
            <p className="text-text-muted">
              {formatDate(period.start_date)} - {formatDate(period.end_date)}
            </p>
          </div>
          <Badge variant={statusColors[period.status] || "secondary"}>
            {period.status}
          </Badge>
        </div>
        <EmptyState message="No technician data for this period. Add time entries or commissions to see the summary." />
      </div>
    );
  }

  // Calculate totals
  const totals = summaries.reduce(
    (acc: {
      regular_hours: number;
      overtime_hours: number;
      regular_pay: number;
      overtime_pay: number;
      commissions: number;
      gross_pay: number;
      jobs: number;
    }, s: PayrollSummary) => ({
      regular_hours: acc.regular_hours + (s.regular_hours || 0),
      overtime_hours: acc.overtime_hours + (s.overtime_hours || 0),
      regular_pay: acc.regular_pay + (s.regular_pay || 0),
      overtime_pay: acc.overtime_pay + (s.overtime_pay || 0),
      commissions: acc.commissions + (s.total_commissions || 0),
      gross_pay: acc.gross_pay + (s.gross_pay || 0),
      jobs: acc.jobs + (s.jobs_completed || 0),
    }),
    {
      regular_hours: 0,
      overtime_hours: 0,
      regular_pay: 0,
      overtime_pay: 0,
      commissions: 0,
      gross_pay: 0,
      jobs: 0,
    }
  );

  return (
    <div className="space-y-6">
      {/* Period Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">
            Payroll Summary
          </h2>
          <p className="text-text-muted">
            {formatDate(period.start_date)} - {formatDate(period.end_date)}
          </p>
        </div>
        <Badge variant={statusColors[period.status] || "secondary"}>
          {period.status}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Technicians" value={summaries.length} />
        <StatCard
          label="Total Hours"
          value={`${(totals.regular_hours + totals.overtime_hours).toFixed(1)}h`}
        />
        <StatCard
          label="Overtime"
          value={`${totals.overtime_hours.toFixed(1)}h`}
          variant="warning"
        />
        <StatCard
          label="Commissions"
          value={formatCurrency(totals.commissions)}
        />
        <StatCard
          label="Total Payroll"
          value={formatCurrency(totals.gross_pay)}
          variant="success"
        />
      </div>

      {/* Summary Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-bg-muted/50">
                <th className="p-4 text-left text-sm font-medium text-text-muted">
                  Technician
                </th>
                <th className="p-4 text-right text-sm font-medium text-text-muted">
                  Reg Hours
                </th>
                <th className="p-4 text-right text-sm font-medium text-text-muted">
                  OT Hours
                </th>
                <th className="p-4 text-right text-sm font-medium text-text-muted">
                  Reg Pay
                </th>
                <th className="p-4 text-right text-sm font-medium text-text-muted">
                  OT Pay
                </th>
                <th className="p-4 text-right text-sm font-medium text-text-muted">
                  Commissions
                </th>
                <th className="p-4 text-right text-sm font-medium text-text-muted">
                  Jobs
                </th>
                <th className="p-4 text-right text-sm font-semibold text-text-primary">
                  Gross Pay
                </th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s: PayrollSummary) => (
                <tr
                  key={s.technician_id}
                  className="border-b border-border hover:bg-bg-muted/30 transition-colors"
                >
                  <td className="p-4 font-medium text-text-primary">
                    {s.technician_name || `Tech #${s.technician_id.slice(0, 8)}`}
                  </td>
                  <td className="p-4 text-right text-text-primary">
                    {(s.regular_hours || 0).toFixed(1)}
                  </td>
                  <td className="p-4 text-right text-warning">
                    {(s.overtime_hours || 0).toFixed(1)}
                  </td>
                  <td className="p-4 text-right text-text-primary">
                    {formatCurrency(s.regular_pay || 0)}
                  </td>
                  <td className="p-4 text-right text-text-primary">
                    {formatCurrency(s.overtime_pay || 0)}
                  </td>
                  <td className="p-4 text-right text-text-primary">
                    {formatCurrency(s.total_commissions || 0)}
                  </td>
                  <td className="p-4 text-right text-text-primary">
                    {s.jobs_completed || 0}
                  </td>
                  <td className="p-4 text-right font-bold text-success">
                    {formatCurrency(s.gross_pay || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-bg-muted font-semibold">
                <td className="p-4 text-text-primary">TOTALS</td>
                <td className="p-4 text-right text-text-primary">
                  {totals.regular_hours.toFixed(1)}
                </td>
                <td className="p-4 text-right text-warning">
                  {totals.overtime_hours.toFixed(1)}
                </td>
                <td className="p-4 text-right text-text-primary">
                  {formatCurrency(totals.regular_pay)}
                </td>
                <td className="p-4 text-right text-text-primary">
                  {formatCurrency(totals.overtime_pay)}
                </td>
                <td className="p-4 text-right text-text-primary">
                  {formatCurrency(totals.commissions)}
                </td>
                <td className="p-4 text-right text-text-primary">
                  {totals.jobs}
                </td>
                <td className="p-4 text-right text-success font-bold">
                  {formatCurrency(totals.gross_pay)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
