import { useMemo } from "react";
import {
  useTechnicianDashboard,
  useTechCommissions,
  useTechCurrentPeriod,
} from "@/api/hooks/useTechPortal.ts";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ── Helpers ──────────────────────────────────────────────────

const formatCurrency = (n: number) =>
  "$" +
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

function commissionBadgeVariant(
  status: string | null | undefined,
): "warning" | "info" | "success" | "default" {
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
}

function commissionStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "paid":
      return "Paid";
    default:
      return status || "Unknown";
  }
}

// ── Progress Bar ─────────────────────────────────────────────

function ProgressBar({
  value,
  max,
  label,
  color = "bg-green-500",
}: {
  value: number;
  max: number;
  label?: string;
  color?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        {label && (
          <span className="text-sm text-text-secondary">{label}</span>
        )}
        <span className="text-sm font-semibold text-text-primary">{pct}%</span>
      </div>
      <div className="w-full bg-bg-muted rounded-full h-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Earnings Summary Card ────────────────────────────────────

function EarningsSummaryCard({
  commissionsEarned,
  nextPayday,
  backboardThreshold,
  onTrack,
  periodLabel,
}: {
  commissionsEarned: number;
  nextPayday: string | null | undefined;
  backboardThreshold: number;
  onTrack: boolean;
  periodLabel: string | null | undefined;
}) {
  return (
    <Card className="bg-gradient-to-br from-green-600 to-emerald-800 text-white border-0">
      <CardContent className="pt-6 pb-6">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
          <span className="text-2xl">💰</span> This Pay Period
        </h2>

        <div className="text-center mb-4">
          <p className="text-5xl font-black tracking-tight">
            {formatCurrency(commissionsEarned)}
          </p>
          <p className="text-green-200 text-sm mt-1">Earned so far</p>
        </div>

        {/* Backboard progress */}
        <div className="mb-4">
          <div className="w-full bg-white/20 rounded-full h-5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                onTrack ? "bg-yellow-400" : "bg-white/60"
              }`}
              style={{
                width: `${
                  backboardThreshold > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (commissionsEarned / backboardThreshold) * 100,
                        ),
                      )
                    : 0
                }%`,
              }}
            />
          </div>
          {onTrack ? (
            <p className="text-yellow-200 text-sm font-medium mt-2 text-center">
              You're above the guarantee! Keep it up!
            </p>
          ) : (
            <p className="text-green-200 text-sm mt-2 text-center">
              {formatCurrency(commissionsEarned)} of{" "}
              {formatCurrency(backboardThreshold)} guarantee
            </p>
          )}
        </div>

        <div className="flex justify-between text-sm">
          {nextPayday && (
            <div>
              <p className="text-green-200">Next Payday</p>
              <p className="font-bold text-lg">{nextPayday}</p>
            </div>
          )}
          {periodLabel && (
            <div className="text-right">
              <p className="text-green-200">Period</p>
              <p className="font-bold text-lg">{periodLabel}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Weekly Earnings Chart ────────────────────────────────────

function WeeklyEarningsChart({
  commissions,
}: {
  commissions: Array<{
    commission_amount: number | string | null | undefined;
    earned_date: string | null | undefined;
  }>;
}) {
  // Group commissions by week (last 4 weeks)
  const weeklyData = useMemo(() => {
    const now = new Date();
    const weeks: { label: string; earnings: number; start: Date }[] = [];

    for (let i = 3; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(start.getDate() - start.getDay() - i * 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);

      const weekLabel = start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      let total = 0;
      for (const c of commissions) {
        if (!c.earned_date) continue;
        const d = new Date(c.earned_date);
        if (d >= start && d < end) {
          total += Number(c.commission_amount) || 0;
        }
      }

      weeks.push({ label: weekLabel, earnings: Math.round(total * 100) / 100, start });
    }

    return weeks;
  }, [commissions]);

  if (commissions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-5 pb-5">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-4">
            <span className="text-2xl">📊</span> Weekly Earnings
          </h2>
          <div className="h-40 flex items-center justify-center">
            <p className="text-text-muted text-sm">
              No commission data yet this month
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-4">
          <span className="text-2xl">📊</span> Weekly Earnings
        </h2>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} barCategoryGap="25%">
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => `$${v}`}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Earned"]}
                contentStyle={{
                  borderRadius: 8,
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              />
              <Bar dataKey="earnings" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Commission Breakdown by Job Type (Pie) ───────────────────

function CommissionByType({
  commissions,
}: {
  commissions: Array<{
    job_type: string | null | undefined;
    commission_amount: number | string | null | undefined;
  }>;
}) {
  const pieData = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const c of commissions) {
      const type = c.job_type || "Other";
      totals[type] = (totals[type] || 0) + (Number(c.commission_amount) || 0);
    }
    return Object.entries(totals)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " "),
        value: Math.round(value * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value);
  }, [commissions]);

  if (pieData.length === 0) return null;

  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-4">
          <span className="text-2xl">🍕</span> Earnings by Job Type
        </h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={70}
                innerRadius={35}
                dataKey="value"
                label={({ name, value }) => `${name}: $${value}`}
                labelLine={false}
              >
                {pieData.map((_, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={PIE_COLORS[idx % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Earned"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center mt-2">
          {pieData.map((entry, idx) => (
            <div key={entry.name} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: PIE_COLORS[idx % PIE_COLORS.length],
                }}
              />
              <span className="text-text-secondary">{entry.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Commission List ──────────────────────────────────────────

function CommissionList({
  commissions,
}: {
  commissions: Array<{
    id: string;
    description: string | null | undefined;
    job_type: string | null | undefined;
    commission_amount: number | string | null | undefined;
    base_amount: number | string | null | undefined;
    rate: number | string | null | undefined;
    status: string | null | undefined;
    earned_date: string | null | undefined;
  }>;
}) {
  if (commissions.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-text-secondary">
            No commissions yet this period. Complete jobs to earn!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-5 pb-2">
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-4">
          <span className="text-2xl">📋</span> Commission Breakdown
        </h2>

        <div className="divide-y divide-border">
          {commissions.map((c) => {
            const amount = Number(c.commission_amount) || 0;
            const baseAmt = Number(c.base_amount) || 0;
            const rate = Number(c.rate) || 0;
            const dateStr = c.earned_date
              ? new Date(c.earned_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "";
            const jobLabel =
              c.description ||
              (c.job_type
                ? c.job_type.charAt(0).toUpperCase() +
                  c.job_type.slice(1).replace(/_/g, " ")
                : "Job");

            return (
              <div
                key={c.id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {jobLabel}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {dateStr && (
                      <span className="text-xs text-text-muted">{dateStr}</span>
                    )}
                    {baseAmt > 0 && rate > 0 && (
                      <span className="text-xs text-text-muted">
                        {formatCurrency(baseAmt)} x {Math.round(rate * 100)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={commissionBadgeVariant(c.status)} size="sm">
                    {commissionStatusLabel(c.status)}
                  </Badge>
                  <span className="text-lg font-bold text-green-600 whitespace-nowrap">
                    {formatCurrency(amount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── YTD Summary ──────────────────────────────────────────────

function YTDSummary({
  commissions,
}: {
  commissions: Array<{
    commission_amount: number | string | null | undefined;
    status: string | null | undefined;
  }>;
}) {
  const ytd = useMemo(() => {
    let total = 0;
    let paid = 0;
    let pending = 0;
    for (const c of commissions) {
      const amt = Number(c.commission_amount) || 0;
      total += amt;
      if (c.status === "paid") paid += amt;
      else pending += amt;
    }
    return { total, paid, pending };
  }, [commissions]);

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
      <CardContent className="pt-5 pb-5">
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-4">
          <span className="text-2xl">📅</span> Year to Date
        </h2>

        <div className="text-center mb-3">
          <p className="text-4xl font-black text-blue-700 dark:text-blue-400">
            {formatCurrency(ytd.total)}
          </p>
          <p className="text-sm text-text-muted mt-1">Total YTD Earnings</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-lg bg-white/60 dark:bg-white/5">
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(ytd.paid)}
            </p>
            <p className="text-xs text-text-muted">Paid Out</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/60 dark:bg-white/5">
            <p className="text-xl font-bold text-yellow-600">
              {formatCurrency(ytd.pending)}
            </p>
            <p className="text-xs text-text-muted">Pending</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Performance Section ──────────────────────────────────────

function PerformanceSection({
  jobsThisWeek,
  jobsLastWeek,
  avgDurationMinutes,
  completedJobs,
}: {
  jobsThisWeek: number;
  jobsLastWeek: number;
  avgDurationMinutes: number;
  completedJobs: number;
}) {
  // Simple efficiency score (0-100) based on how fast vs the 2-hour baseline
  const baselineMinutes = 120;
  const efficiencyScore =
    avgDurationMinutes > 0
      ? Math.min(100, Math.round((baselineMinutes / avgDurationMinutes) * 80))
      : 0;

  const trend = jobsThisWeek - jobsLastWeek;
  const trendIcon = trend > 0 ? "+" + trend : trend < 0 ? String(trend) : "0";
  const trendColor =
    trend > 0
      ? "text-green-600"
      : trend < 0
        ? "text-red-500"
        : "text-text-muted";

  const avgHours = avgDurationMinutes > 0 ? Math.floor(avgDurationMinutes / 60) : 0;
  const avgMins = avgDurationMinutes > 0 ? avgDurationMinutes % 60 : 0;
  const avgTimeStr =
    avgDurationMinutes > 0
      ? avgHours > 0
        ? `${avgHours}h ${avgMins}m`
        : `${avgMins}m`
      : "N/A";

  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-4">
          <span className="text-2xl">🏆</span> Performance
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* Efficiency */}
          <div className="text-center p-3 rounded-xl bg-gradient-to-b from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-950/30">
            <p className="text-3xl font-black text-purple-600">
              {efficiencyScore}
            </p>
            <p className="text-xs text-text-muted mt-1">Efficiency Score</p>
          </div>

          {/* Jobs Completed */}
          <div className="text-center p-3 rounded-xl bg-gradient-to-b from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-950/30">
            <p className="text-3xl font-black text-green-600">
              {completedJobs}
            </p>
            <p className="text-xs text-text-muted mt-1">Jobs Done</p>
          </div>

          {/* Avg Time */}
          <div className="text-center p-3 rounded-xl bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-950/30">
            <p className="text-3xl font-black text-blue-600">{avgTimeStr}</p>
            <p className="text-xs text-text-muted mt-1">Avg Job Time</p>
          </div>

          {/* Weekly Trend */}
          <div className="text-center p-3 rounded-xl bg-gradient-to-b from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-950/30">
            <p className={`text-3xl font-black ${trendColor}`}>{trendIcon}</p>
            <p className="text-xs text-text-muted mt-1">vs Last Week</p>
          </div>
        </div>

        {/* Goal Tracking */}
        <h3 className="text-base font-bold text-text-primary flex items-center gap-2 mb-3">
          <span className="text-xl">🎯</span> Goals
        </h3>
        <div className="space-y-3">
          <ProgressBar
            value={jobsThisWeek}
            max={10}
            label="Weekly jobs (target: 10)"
            color="bg-green-500"
          />
          <ProgressBar
            value={efficiencyScore}
            max={100}
            label="Efficiency (target: 100)"
            color="bg-purple-500"
          />
          <ProgressBar
            value={completedJobs}
            max={40}
            label="Monthly jobs (target: 40)"
            color="bg-blue-500"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────

function PayPageSkeleton() {
  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto">
      {/* Summary card */}
      <Skeleton className="h-56 rounded-xl" />
      {/* Chart */}
      <Skeleton className="h-64 rounded-xl" />
      {/* Pie */}
      <Skeleton className="h-56 rounded-xl" />
      {/* Commission list */}
      <Skeleton className="h-72 rounded-xl" />
      {/* YTD */}
      <Skeleton className="h-40 rounded-xl" />
      {/* Performance */}
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export function TechPayPage() {
  const { data: dashboard, isLoading: dashLoading } = useTechnicianDashboard();
  const { data: commissionData, isLoading: commissionsLoading } =
    useTechCommissions();
  const { data: currentPeriod, isLoading: periodLoading } =
    useTechCurrentPeriod();

  const isLoading = dashLoading || commissionsLoading || periodLoading;

  if (isLoading) return <PayPageSkeleton />;

  const pay = dashboard?.pay_this_period;
  const perf = dashboard?.performance;
  const stats = dashboard?.today_stats;
  const commissions = commissionData?.items ?? [];

  // Period info from either the dashboard or the payroll period endpoint
  const periodLabel =
    pay?.period_label ||
    (currentPeriod?.start_date && currentPeriod?.end_date
      ? `${new Date(currentPeriod.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(currentPeriod.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      : null);

  const commissionsEarned =
    pay?.commissions_earned ||
    Number(currentPeriod?.total_commissions) ||
    0;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-20">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">💰</span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Pay & Performance
          </h1>
          <p className="text-sm text-text-muted">
            Your earnings and how you're doing
          </p>
        </div>
      </div>

      {/* Section 1: Earnings Summary */}
      <EarningsSummaryCard
        commissionsEarned={commissionsEarned}
        nextPayday={pay?.next_payday}
        backboardThreshold={pay?.backboard_threshold || 2307.69}
        onTrack={pay?.on_track || false}
        periodLabel={periodLabel}
      />

      {/* Section 2: Weekly Earnings Chart */}
      <WeeklyEarningsChart commissions={commissions} />

      {/* Section 3: Earnings by Job Type (Pie) */}
      <CommissionByType commissions={commissions} />

      {/* Section 4: Commission Breakdown List */}
      <CommissionList commissions={commissions} />

      {/* Section 5: YTD Summary */}
      <YTDSummary commissions={commissions} />

      {/* Section 6: Performance & Goal Tracking */}
      <PerformanceSection
        jobsThisWeek={perf?.jobs_this_week || 0}
        jobsLastWeek={perf?.jobs_last_week || 0}
        avgDurationMinutes={perf?.avg_job_duration_minutes || 0}
        completedJobs={stats?.completed_jobs || 0}
      />
    </div>
  );
}
