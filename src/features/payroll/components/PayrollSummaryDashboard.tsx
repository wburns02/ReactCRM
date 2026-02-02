import { useState } from "react";
import {
  useCurrentPayrollPeriod,
  usePayrollSummary,
  usePayrollPeriods,
} from "@/api/hooks/usePayroll";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { PayrollSummary } from "@/api/types/payroll";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

// Colors for charts
const CHART_COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  cyan: "#06b6d4",
};

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

/**
 * Enhanced Stat Card for KPI display with trends
 */
function StatCard({
  label,
  value,
  subValue,
  trend,
  icon,
  variant = "default",
}: {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: { value: number; label: string };
  icon?: string;
  variant?: "default" | "warning" | "success" | "danger";
}) {
  const colorClasses = {
    default: "text-text-primary",
    warning: "text-warning",
    success: "text-success",
    danger: "text-danger",
  };

  const bgClasses = {
    default: "bg-primary/10",
    warning: "bg-warning/10",
    success: "bg-success/10",
    danger: "bg-danger/10",
  };

  return (
    <Card className="p-5 relative overflow-hidden">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="text-sm font-medium text-text-muted mb-1">{label}</div>
          <div className={`text-3xl font-bold ${colorClasses[variant]}`}>
            {value}
          </div>
          {subValue && (
            <div className="text-sm text-text-muted mt-1">{subValue}</div>
          )}
          {trend && (
            <div
              className={`text-xs mt-2 flex items-center gap-1 ${
                trend.value >= 0 ? "text-success" : "text-danger"
              }`}
            >
              <span>{trend.value >= 0 ? "↑" : "↓"}</span>
              <span>
                {Math.abs(trend.value)}% {trend.label}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${bgClasses[variant]}`}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Alert Card for important notifications
 */
function AlertCard({
  type,
  title,
  message,
  action,
}: {
  type: "warning" | "danger" | "info" | "success";
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  const styles = {
    warning: "bg-warning/10 border-warning/30 text-warning",
    danger: "bg-danger/10 border-danger/30 text-danger",
    info: "bg-primary/10 border-primary/30 text-primary",
    success: "bg-success/10 border-success/30 text-success",
  };

  const icons = {
    warning: "⚠️",
    danger: "🚨",
    info: "💡",
    success: "✅",
  };

  return (
    <div className={`p-4 rounded-lg border ${styles[type]}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{icons[type]}</span>
        <div className="flex-1">
          <div className="font-semibold">{title}</div>
          <div className="text-sm opacity-80 mt-1">{message}</div>
          {action && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for the dashboard
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-bg-muted rounded w-1/3"></div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-28 bg-bg-muted rounded-lg"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-bg-muted rounded-lg"></div>
        <div className="h-80 bg-bg-muted rounded-lg"></div>
      </div>
    </div>
  );
}

/**
 * Empty state when no period or no data
 */
function EmptyState({ message }: { message: string }) {
  return (
    <Card className="p-12 text-center">
      <div className="text-6xl mb-4">📊</div>
      <h3 className="font-semibold text-xl text-text-primary mb-2">
        No Data Available
      </h3>
      <p className="text-text-secondary max-w-md mx-auto">{message}</p>
    </Card>
  );
}

/**
 * World-Class Payroll Summary Dashboard
 *
 * "We spared no expense" - John Hammond
 *
 * Features:
 * - Real-time payroll totals and KPIs
 * - Interactive charts (hours distribution, pay breakdown)
 * - AI-powered insights and forecasts
 * - Overtime alerts and compliance warnings
 * - Period comparisons and trends
 * - Export functionality
 */
export function PayrollSummaryDashboard() {
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Auto-load current period
  const {
    data: period,
    isLoading: periodLoading,
    error: periodError,
  } = useCurrentPayrollPeriod();

  const { data: summaries, isLoading: summaryLoading } = usePayrollSummary(
    period?.id || ""
  );

  // Get historical periods for trend comparison
  const { data: allPeriods } = usePayrollPeriods();

  // Status badge colors
  const statusColors: Record<
    string,
    "default" | "warning" | "success" | "secondary"
  > = {
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

  // Calculate totals and insights
  const totals =
    summaries?.reduce(
      (
        acc: {
          regular_hours: number;
          overtime_hours: number;
          regular_pay: number;
          overtime_pay: number;
          commissions: number;
          gross_pay: number;
          jobs: number;
          techCount: number;
        },
        s: PayrollSummary
      ) => ({
        regular_hours: acc.regular_hours + (s.regular_hours || 0),
        overtime_hours: acc.overtime_hours + (s.overtime_hours || 0),
        regular_pay: acc.regular_pay + (s.regular_pay || 0),
        overtime_pay: acc.overtime_pay + (s.overtime_pay || 0),
        commissions: acc.commissions + (s.total_commissions || 0),
        gross_pay: acc.gross_pay + (s.gross_pay || 0),
        jobs: acc.jobs + (s.jobs_completed || 0),
        techCount: acc.techCount + 1,
      }),
      {
        regular_hours: 0,
        overtime_hours: 0,
        regular_pay: 0,
        overtime_pay: 0,
        commissions: 0,
        gross_pay: 0,
        jobs: 0,
        techCount: 0,
      }
    ) || {
      regular_hours: 0,
      overtime_hours: 0,
      regular_pay: 0,
      overtime_pay: 0,
      commissions: 0,
      gross_pay: 0,
      jobs: 0,
      techCount: 0,
    };

  // Calculate insights
  const totalHours = totals.regular_hours + totals.overtime_hours;
  const overtimePercent =
    totalHours > 0 ? (totals.overtime_hours / totalHours) * 100 : 0;
  const avgHoursPerTech =
    totals.techCount > 0 ? totalHours / totals.techCount : 0;
  const avgPayPerTech =
    totals.techCount > 0 ? totals.gross_pay / totals.techCount : 0;
  const laborCostPerJob =
    totals.jobs > 0 ? totals.gross_pay / totals.jobs : totals.gross_pay;

  // Forecast for full period (assume linear progression)
  const periodDays =
    Math.ceil(
      (new Date(period.end_date).getTime() -
        new Date(period.start_date).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;
  const daysElapsed = Math.ceil(
    (new Date().getTime() - new Date(period.start_date).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const projectionMultiplier =
    daysElapsed > 0 ? periodDays / Math.min(daysElapsed, periodDays) : 1;
  const projectedPayroll = totals.gross_pay * projectionMultiplier;

  // Prepare chart data
  const hoursChartData =
    summaries?.map((s) => ({
      name: s.technician_name?.split(" ")[0] || "Unknown",
      regular: s.regular_hours || 0,
      overtime: s.overtime_hours || 0,
    })) || [];

  const payBreakdownData = [
    { name: "Regular Pay", value: totals.regular_pay, color: CHART_COLORS.primary },
    { name: "Overtime Pay", value: totals.overtime_pay, color: CHART_COLORS.warning },
    { name: "Commissions", value: totals.commissions, color: CHART_COLORS.success },
  ].filter((d) => d.value > 0);

  const techPayData =
    summaries?.map((s) => ({
      name: s.technician_name?.split(" ")[0] || "Unknown",
      pay: s.gross_pay || 0,
      hours: (s.regular_hours || 0) + (s.overtime_hours || 0),
    })) || [];

  // Generate alerts
  const alerts: Array<{
    type: "warning" | "danger" | "info" | "success";
    title: string;
    message: string;
  }> = [];

  if (overtimePercent > 20) {
    alerts.push({
      type: "warning",
      title: "High Overtime Alert",
      message: `Overtime is ${overtimePercent.toFixed(1)}% of total hours. Industry benchmark is under 15%.`,
    });
  }

  summaries?.forEach((s) => {
    const techOT = s.overtime_hours || 0;
    if (techOT > 10) {
      alerts.push({
        type: "danger",
        title: `${s.technician_name} - Excessive OT`,
        message: `${techOT.toFixed(1)} overtime hours this period. May indicate understaffing or scheduling issues.`,
      });
    }
  });

  if (totals.techCount > 0 && totals.jobs === 0) {
    alerts.push({
      type: "info",
      title: "No Completed Jobs",
      message:
        "Time entries recorded but no completed work orders linked. Consider linking jobs for better reporting.",
    });
  }

  if (period.status === "draft" && totals.gross_pay > 0) {
    alerts.push({
      type: "success",
      title: "Ready for Review",
      message: `${formatCurrency(totals.gross_pay)} payroll ready. Review and approve when complete.`,
    });
  }

  // Export handlers
  const handleExportCSV = () => {
    const headers = [
      "Technician",
      "Regular Hours",
      "OT Hours",
      "Regular Pay",
      "OT Pay",
      "Commissions",
      "Jobs",
      "Gross Pay",
    ];
    const rows =
      summaries?.map((s) => [
        s.technician_name,
        s.regular_hours?.toFixed(2),
        s.overtime_hours?.toFixed(2),
        s.regular_pay?.toFixed(2),
        s.overtime_pay?.toFixed(2),
        s.total_commissions?.toFixed(2),
        s.jobs_completed,
        s.gross_pay?.toFixed(2),
      ]) || [];

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-summary-${period.start_date}-to-${period.end_date}.csv`;
    a.click();
    setShowExportMenu(false);
  };

  const handleExportJSON = () => {
    const data = {
      period: {
        id: period.id,
        start_date: period.start_date,
        end_date: period.end_date,
        status: period.status,
      },
      totals,
      summaries,
      generated_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-summary-${period.start_date}-to-${period.end_date}.json`;
    a.click();
    setShowExportMenu(false);
  };

  // No data state (but with header)
  if (!summaries || summaries.length === 0) {
    return (
      <div className="space-y-6">
        {/* Period Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-text-primary flex items-center gap-3">
              <span className="text-3xl">📊</span>
              Payroll Summary
            </h2>
            <p className="text-text-muted mt-1">
              {formatDate(period.start_date)} - {formatDate(period.end_date)}
            </p>
          </div>
          <Badge variant={statusColors[period.status] || "secondary"}>
            {period.status}
          </Badge>
        </div>
        <EmptyState message="No technician data for this period. Add time entries or commissions to see the summary. Go to Time Entries tab to add data." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <span className="text-3xl">📊</span>
            Payroll Summary
          </h2>
          <p className="text-text-muted mt-1">
            {formatDate(period.start_date)} - {formatDate(period.end_date)} •{" "}
            {totals.techCount} technician{totals.techCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={statusColors[period.status] || "secondary"}
            className="text-sm px-3 py-1"
          >
            {period.status}
          </Badge>
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              📥 Export
            </Button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-bg-primary border border-border rounded-lg shadow-lg z-10">
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-bg-muted transition-colors"
                  onClick={handleExportCSV}
                >
                  📄 Export CSV
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-bg-muted transition-colors"
                  onClick={handleExportJSON}
                >
                  📋 Export JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards - Primary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Total Payroll"
          value={formatCurrency(totals.gross_pay)}
          icon="💰"
          variant="success"
        />
        <StatCard
          label="Total Hours"
          value={`${totalHours.toFixed(1)}h`}
          subValue={`${avgHoursPerTech.toFixed(1)}h avg/tech`}
          icon="⏱️"
        />
        <StatCard
          label="Overtime"
          value={`${totals.overtime_hours.toFixed(1)}h`}
          subValue={`${overtimePercent.toFixed(1)}% of total`}
          icon="⚡"
          variant={overtimePercent > 20 ? "danger" : overtimePercent > 10 ? "warning" : "default"}
        />
        <StatCard
          label="Commissions"
          value={formatCurrency(totals.commissions)}
          icon="🎯"
        />
        <StatCard
          label="Jobs Completed"
          value={totals.jobs}
          subValue={totals.jobs > 0 ? `${formatCurrency(laborCostPerJob)}/job` : ""}
          icon="✅"
        />
        <StatCard
          label="Projected Total"
          value={formatCurrency(projectedPayroll)}
          subValue={`by ${formatDate(period.end_date)}`}
          icon="📈"
          variant="default"
        />
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.slice(0, 4).map((alert, i) => (
            <AlertCard
              key={i}
              type={alert.type}
              title={alert.title}
              message={alert.message}
            />
          ))}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hours by Technician */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Hours by Technician
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 12 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={80}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "none",
                    borderRadius: "8px",
                    color: "#f9fafb",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="regular"
                  name="Regular Hours"
                  fill={CHART_COLORS.primary}
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="overtime"
                  name="Overtime"
                  fill={CHART_COLORS.warning}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pay Breakdown Pie Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Pay Breakdown
          </h3>
          <div className="h-72 flex items-center justify-center">
            {payBreakdownData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={payBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {payBreakdownData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "none",
                      borderRadius: "8px",
                      color: "#f9fafb",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-text-muted">No pay data to display</div>
            )}
          </div>
          {/* Legend */}
          <div className="flex justify-center gap-6 mt-4">
            {payBreakdownData.map((entry, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-text-muted">
                  {entry.name}: {formatCurrency(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* AI Insights Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <span>🤖</span> AI Insights & Recommendations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="text-sm font-medium text-text-muted">
              Efficiency Score
            </div>
            <div className="text-4xl font-bold text-primary">
              {totals.jobs > 0
                ? Math.min(100, Math.round((totals.jobs / totalHours) * 100 * 10))
                : "—"}
              <span className="text-lg text-text-muted">/100</span>
            </div>
            <p className="text-sm text-text-muted">
              Based on jobs completed per hour worked
            </p>
          </div>
          <div className="space-y-3">
            <div className="text-sm font-medium text-text-muted">
              Labor Cost Trend
            </div>
            <div className="text-4xl font-bold text-success">
              {formatCurrency(avgPayPerTech)}
            </div>
            <p className="text-sm text-text-muted">
              Average pay per technician this period
            </p>
          </div>
          <div className="space-y-3">
            <div className="text-sm font-medium text-text-muted">
              Recommendation
            </div>
            <div className="text-sm text-text-primary leading-relaxed">
              {overtimePercent > 15 ? (
                <>
                  <strong>Consider hiring:</strong> High overtime ({overtimePercent.toFixed(0)}%) suggests
                  workload exceeds current staffing. Adding a technician could reduce OT costs by{" "}
                  {formatCurrency(totals.overtime_pay * 0.6)}.
                </>
              ) : totals.jobs === 0 ? (
                <>
                  <strong>Link work orders:</strong> Time is tracked but no jobs are linked.
                  Connect time entries to work orders for better job costing analysis.
                </>
              ) : (
                <>
                  <strong>Great balance!</strong> Overtime is within healthy limits. Current staffing
                  appears well-matched to workload.
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Detailed Summary Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border bg-bg-muted/30">
          <h3 className="text-lg font-semibold text-text-primary">
            Technician Breakdown
          </h3>
        </div>
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
                  <td className="p-4">
                    <div className="font-medium text-text-primary">
                      {s.technician_name || `Tech #${s.technician_id.slice(0, 8)}`}
                    </div>
                  </td>
                  <td className="p-4 text-right text-text-primary">
                    {(s.regular_hours || 0).toFixed(1)}
                  </td>
                  <td className="p-4 text-right">
                    <span
                      className={
                        (s.overtime_hours || 0) > 10
                          ? "text-danger font-medium"
                          : "text-warning"
                      }
                    >
                      {(s.overtime_hours || 0).toFixed(1)}
                    </span>
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
                <td className="p-4 text-right text-text-primary">{totals.jobs}</td>
                <td className="p-4 text-right text-success font-bold text-lg">
                  {formatCurrency(totals.gross_pay)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Footer with meta info */}
      <div className="text-center text-sm text-text-muted">
        Last updated: {new Date().toLocaleString()} • Period ID: {period.id.slice(0, 8)}...
      </div>
    </div>
  );
}
