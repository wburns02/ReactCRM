import { useState, useEffect } from "react";
import {
  useCurrentPayrollPeriod,
  usePayrollPeriods,
  usePayrollSummary,
  usePayrollDashboard,
  usePayrollOverview,
} from "@/api/hooks/usePayroll";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState.tsx";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { PayrollSummary } from "@/api/types/payroll";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
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
export function PayrollSummaryDashboard({
  onNavigateToTab,
}: {
  onNavigateToTab?: (tab: string) => void;
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");

  // Load current period (default) and all periods (for selector)
  const {
    data: currentPeriod,
    isLoading: periodLoading,
    error: periodError,
  } = useCurrentPayrollPeriod();

  const { data: allPeriods } = usePayrollPeriods();

  // Dashboard aggregate data (trends, comparison, pending counts)
  const { data: dashboardData } = usePayrollDashboard(12);

  // Overview fallback for when selected period has no data
  const { data: overviewData } = usePayrollOverview(30);

  // Sync selected period to current period on first load
  useEffect(() => {
    if (currentPeriod?.id && !selectedPeriodId) {
      setSelectedPeriodId(currentPeriod.id);
    }
  }, [currentPeriod?.id, selectedPeriodId]);

  // Use selected period (from dropdown) or fall back to current
  const period = selectedPeriodId
    ? allPeriods?.find((p) => p.id === selectedPeriodId) || currentPeriod
    : currentPeriod;

  const { data: summaries, isLoading: summaryLoading } = usePayrollSummary(
    selectedPeriodId || period?.id || ""
  );

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
      <EmptyState icon="📊" title="No Data Available" description="Could not load payroll period. Please try again or create a new period." />
    );
  }

  if (!period) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-text-primary flex items-center gap-3">
          <span className="text-3xl">📊</span>
          Payroll Summary
        </h2>
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="font-semibold text-xl text-text-primary mb-2">
            No Payroll Periods Found
          </h3>
          <p className="text-text-secondary max-w-md mx-auto mb-4">
            Create a payroll period first to start tracking hours, commissions, and pay.
          </p>
          {onNavigateToTab && (
            <Button variant="primary" onClick={() => onNavigateToTab("periods")}>
              Go to Pay Periods
            </Button>
          )}
        </Card>
      </div>
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
          commission_pay: number;
          backboard_total: number;
          backboard_count: number;
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
        commission_pay: acc.commission_pay + (s.commission_pay || 0),
        backboard_total: acc.backboard_total + (s.backboard_amount || 0),
        backboard_count: acc.backboard_count + (s.backboard_applied ? 1 : 0),
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
        commission_pay: 0,
        backboard_total: 0,
        backboard_count: 0,
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
      commission_pay: 0,
      backboard_total: 0,
      backboard_count: 0,
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
    { name: "Commission Pay", value: totals.commission_pay, color: CHART_COLORS.success },
    { name: "Backboard Guarantee", value: totals.backboard_total, color: CHART_COLORS.warning },
  ].filter((d) => d.value > 0);

  // Prepare trend chart data from dashboard endpoint
  const trendChartData = dashboardData?.trends?.map((t) => ({
    label: t.label,
    hours: t.total_hours,
    commissions: t.total_commissions / 100, // Scale down for dual-axis display
    overtime: t.overtime_hours,
    gross_pay: t.gross_pay,
  })) || [];

  // Generate alerts
  const alerts: Array<{
    type: "warning" | "danger" | "info" | "success";
    title: string;
    message: string;
  }> = [];

  // Backboard alerts - low commission periods
  summaries?.forEach((s) => {
    if (s.backboard_applied) {
      alerts.push({
        type: "warning",
        title: `${s.technician_name} - Backboard Applied`,
        message: `Commissions of ${formatCurrency(s.total_commissions)} are below the ${formatCurrency(s.backboard_threshold)} threshold. Backboard guarantee of ${formatCurrency(s.backboard_amount)} applied. No commission paid.`,
      });
    }
  });

  if (totals.backboard_count > 0) {
    alerts.push({
      type: "info",
      title: `Low Commission Period`,
      message: `${totals.backboard_count} of ${totals.techCount} technician${totals.techCount !== 1 ? "s" : ""} are on backboard guarantee this period. Consider reviewing job assignments.`,
    });
  }

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
      "Jobs",
      "Hours",
      "Commissions Earned",
      "Threshold",
      "Status",
      "Backboard",
      "Total Pay",
    ];
    const rows =
      summaries?.map((s) => [
        s.technician_name,
        s.jobs_completed,
        ((s.regular_hours || 0) + (s.overtime_hours || 0)).toFixed(2),
        (s.total_commissions || 0).toFixed(2),
        (s.backboard_threshold || 2307.69).toFixed(2),
        s.backboard_applied ? "Backboard" : "Commission",
        s.backboard_applied ? (s.backboard_amount || 0).toFixed(2) : "0.00",
        (s.gross_pay || 0).toFixed(2),
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

  // No data state (but with header + period selector + overview fallback)
  if (!summaries || summaries.length === 0) {
    return (
      <div className="space-y-6">
        {/* Period Header with Selector */}
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
          <div className="flex items-center gap-3">
            {allPeriods && allPeriods.length > 1 && (
              <select
                data-testid="period-selector"
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
              >
                {allPeriods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {formatDate(p.start_date)} - {formatDate(p.end_date)} ({p.status})
                  </option>
                ))}
              </select>
            )}
            <Badge variant={statusColors[period.status] || "secondary"}>
              {period.status}
            </Badge>
          </div>
        </div>

        {/* Diagnostic Empty State */}
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="font-semibold text-xl text-text-primary mb-2">
            No Data for This Period
          </h3>
          <p className="text-text-secondary max-w-md mx-auto mb-2">
            This period ({formatDate(period.start_date)} - {formatDate(period.end_date)}) has no time entries or commissions yet.
          </p>
          {allPeriods && allPeriods.length > 1 && (
            <p className="text-text-muted text-sm mb-4">
              Try selecting a different period from the dropdown above.
            </p>
          )}
          <div className="flex justify-center gap-3 mt-4">
            {onNavigateToTab && (
              <>
                <Button variant="primary" onClick={() => onNavigateToTab("time")}>
                  Go to Time Entries
                </Button>
                <Button variant="secondary" onClick={() => onNavigateToTab("commissions")}>
                  Go to Commissions
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Overview Fallback - show last 30 days if there's data */}
        {overviewData && overviewData.total_entries > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Last {overviewData.days} Days Overview
            </h3>
            <p className="text-text-muted text-sm mb-4">
              While this period is empty, here is a snapshot of recent activity across all periods.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{overviewData.total_hours.toFixed(1)}h</div>
                <div className="text-sm text-text-muted">Total Hours</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{formatCurrency(overviewData.total_commissions)}</div>
                <div className="text-sm text-text-muted">Total Commissions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-text-primary">{overviewData.total_entries}</div>
                <div className="text-sm text-text-muted">Time Entries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-text-primary">{overviewData.technician_count}</div>
                <div className="text-sm text-text-muted">Active Technicians</div>
              </div>
            </div>
            {overviewData.technicians.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-2 text-left text-text-muted">Technician</th>
                      <th className="p-2 text-right text-text-muted">Regular</th>
                      <th className="p-2 text-right text-text-muted">OT</th>
                      <th className="p-2 text-right text-text-muted">Commissions</th>
                      <th className="p-2 text-right text-text-muted">Entries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewData.technicians.map((t) => (
                      <tr key={t.technician_id} className="border-b border-border/50">
                        <td className="p-2 font-medium text-text-primary">{t.technician_name}</td>
                        <td className="p-2 text-right text-text-primary">{t.regular_hours.toFixed(1)}h</td>
                        <td className="p-2 text-right text-warning">{t.overtime_hours.toFixed(1)}h</td>
                        <td className="p-2 text-right text-success">{formatCurrency(t.total_commissions)}</td>
                        <td className="p-2 text-right text-text-muted">{t.entry_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Header with Selector and Actions */}
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
        <div className="flex items-center gap-3 flex-wrap">
          {/* Period Selector */}
          {allPeriods && allPeriods.length > 1 && (
            <select
              data-testid="period-selector"
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
            >
              {allPeriods.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatDate(p.start_date)} - {formatDate(p.end_date)} ({p.status})
                </option>
              ))}
            </select>
          )}

          {/* Pending Approvals Badges */}
          {dashboardData?.pending_counts && (
            <>
              {dashboardData.pending_counts.time_entries > 0 && (
                <button
                  onClick={() => onNavigateToTab?.("time")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-warning/15 text-warning border border-warning/30 hover:bg-warning/25 transition-colors cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                  {dashboardData.pending_counts.time_entries} pending entries
                </button>
              )}
              {dashboardData.pending_counts.commissions > 0 && (
                <button
                  onClick={() => onNavigateToTab?.("commissions")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  {dashboardData.pending_counts.commissions} pending commissions
                </button>
              )}
            </>
          )}

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
          trend={dashboardData?.comparison ? {
            value: Math.round(dashboardData.comparison.gross_pay_change_pct * 10) / 10,
            label: "vs prev period",
          } : undefined}
        />
        <StatCard
          label="Commission Earned"
          value={formatCurrency(totals.commissions)}
          subValue={`${totals.techCount - totals.backboard_count} above threshold`}
          icon="🎯"
          variant="success"
          trend={dashboardData?.comparison ? {
            value: Math.round(dashboardData.comparison.commissions_change_pct * 10) / 10,
            label: "vs prev period",
          } : undefined}
        />
        <StatCard
          label="Backboard Applied"
          value={formatCurrency(totals.backboard_total)}
          subValue={totals.backboard_count > 0 ? `${totals.backboard_count} tech${totals.backboard_count !== 1 ? "s" : ""} below threshold` : "None this period"}
          icon="🛡️"
          variant={totals.backboard_count > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Jobs Completed"
          value={totals.jobs}
          subValue={totals.jobs > 0 ? `${formatCurrency(laborCostPerJob)}/job` : ""}
          icon="✅"
        />
        <StatCard
          label="Total Hours"
          value={`${totalHours.toFixed(1)}h`}
          subValue={`${avgHoursPerTech.toFixed(1)}h avg/tech`}
          icon="⏱️"
          trend={dashboardData?.comparison ? {
            value: Math.round(dashboardData.comparison.hours_change_pct * 10) / 10,
            label: "vs prev period",
          } : undefined}
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
                      `${name || ""}: ${(((percent as number) || 0) * 100).toFixed(0)}%`
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
                    formatter={(value) => formatCurrency(Number(value))}
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

      {/* Cross-Period Trend Chart */}
      {trendChartData.length >= 2 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Payroll Trends Across Periods
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  label={{ value: "Hours", angle: -90, position: "insideLeft", fill: "#6b7280" }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  label={{ value: "Pay ($)", angle: 90, position: "insideRight", fill: "#6b7280" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "none",
                    borderRadius: "8px",
                    color: "#f9fafb",
                  }}
                  formatter={(value, name) => {
                    const v = Number(value) || 0;
                    if (name === "Commissions") return [formatCurrency(v * 100), name];
                    if (name === "Gross Pay") return [formatCurrency(v), name];
                    return [`${v.toFixed(1)}h`, name];
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="hours"
                  name="Total Hours"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="gross_pay"
                  name="Gross Pay"
                  stroke={CHART_COLORS.success}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="overtime"
                  name="Overtime Hours"
                  stroke={CHART_COLORS.warning}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

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
                  Jobs
                </th>
                <th className="p-4 text-right text-sm font-medium text-text-muted">
                  Hours
                </th>
                <th className="p-4 text-right text-sm font-medium text-text-muted">
                  Commissions Earned
                </th>
                <th className="p-4 text-right text-sm font-medium text-text-muted">
                  Threshold
                </th>
                <th className="p-4 text-center text-sm font-medium text-text-muted">
                  Status
                </th>
                <th className="p-4 text-right text-sm font-medium text-text-muted">
                  Backboard
                </th>
                <th className="p-4 text-right text-sm font-semibold text-text-primary">
                  Total Pay
                </th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s: PayrollSummary) => (
                <tr
                  key={s.technician_id}
                  className={`border-b border-border hover:bg-bg-muted/30 transition-colors ${
                    s.backboard_applied ? "bg-warning/5" : ""
                  }`}
                >
                  <td className="p-4">
                    <div className="font-medium text-text-primary">
                      {s.technician_name || "Unassigned"}
                    </div>
                  </td>
                  <td className="p-4 text-right text-text-primary">
                    {s.jobs_completed || 0}
                  </td>
                  <td className="p-4 text-right text-text-primary">
                    {((s.regular_hours || 0) + (s.overtime_hours || 0)).toFixed(1)}
                  </td>
                  <td className="p-4 text-right text-text-primary">
                    {formatCurrency(s.total_commissions || 0)}
                  </td>
                  <td className="p-4 text-right text-text-muted">
                    {formatCurrency(s.backboard_threshold || 2307.69)}
                  </td>
                  <td className="p-4 text-center">
                    {s.backboard_applied ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-warning/20 text-warning">
                        Backboard
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-success/20 text-success">
                        Commission
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {s.backboard_applied ? (
                      <span className="text-warning font-medium">
                        {formatCurrency(s.backboard_amount || 0)}
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
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
                <td className="p-4 text-right text-text-primary">{totals.jobs}</td>
                <td className="p-4 text-right text-text-primary">
                  {(totals.regular_hours + totals.overtime_hours).toFixed(1)}
                </td>
                <td className="p-4 text-right text-text-primary">
                  {formatCurrency(totals.commissions)}
                </td>
                <td className="p-4 text-right text-text-muted">—</td>
                <td className="p-4 text-center text-text-muted text-sm">
                  {totals.backboard_count > 0
                    ? `${totals.backboard_count} on backboard`
                    : "All commission"}
                </td>
                <td className="p-4 text-right text-warning">
                  {formatCurrency(totals.backboard_total)}
                </td>
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
