/**
 * Performance Scorecard
 * Technician performance metrics and KPI trends
 */
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
// Badge available for future use
// import { Badge } from '@/components/ui/Badge';
import { usePerformanceSummary } from "@/api/hooks/useAnalytics";
import type { TechnicianScore, KPITrend } from "@/api/types/analytics";
import { formatCurrency, cn } from "@/lib/utils";

type SortField =
  | "overall_rank"
  | "first_time_fix_rate"
  | "customer_satisfaction"
  | "revenue_generated";

export function PerformanceScorecard() {
  const [sortBy, setSortBy] = useState<SortField>("overall_rank");
  const { data: summary, isLoading } = usePerformanceSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Performance Scorecard
          </h1>
          <p className="text-text-secondary">
            Track technician performance and key metrics
          </p>
        </div>
        <Button variant="outline">Export Report</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-40 bg-background-secondary animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : summary ? (
        <>
          {/* Team Averages */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              label="First Time Fix Rate"
              value={`${(summary.team_averages.first_time_fix_rate * 100).toFixed(1)}%`}
              target={85}
              actual={summary.team_averages.first_time_fix_rate * 100}
              icon="🔧"
            />
            <KPICard
              label="Customer Satisfaction"
              value={`${summary.team_averages.customer_satisfaction.toFixed(1)}/5`}
              target={4.5}
              actual={summary.team_averages.customer_satisfaction}
              maxTarget={5}
              icon="⭐"
            />
            <KPICard
              label="Repeat Visit Rate"
              value={`${(summary.team_averages.repeat_visit_rate * 100).toFixed(1)}%`}
              target={10}
              actual={summary.team_averages.repeat_visit_rate * 100}
              lowerIsBetter
              icon="🔄"
            />
            <KPICard
              label="Utilization Rate"
              value={`${(summary.team_averages.utilization_rate * 100).toFixed(0)}%`}
              target={75}
              actual={summary.team_averages.utilization_rate * 100}
              icon="📊"
            />
          </div>

          {/* KPI Trends */}
          <KPITrendsCard trends={summary.kpi_trends} />

          {/* Technician Leaderboard */}
          <TechnicianLeaderboard
            scores={summary.technician_scores}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-text-secondary">
            No performance data available
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPICard({
  label,
  value,
  target,
  actual,
  maxTarget,
  lowerIsBetter = false,
  icon,
}: {
  label: string;
  value: string;
  target: number;
  actual: number;
  maxTarget?: number;
  lowerIsBetter?: boolean;
  icon: string;
}) {
  const isOnTarget = lowerIsBetter ? actual <= target : actual >= target;
  const progress = maxTarget
    ? (actual / maxTarget) * 100
    : lowerIsBetter
      ? Math.min(100, (target / actual) * 100)
      : Math.min(100, (actual / target) * 100);

  return (
    <Card
      className={cn(isOnTarget ? "border-success/50" : "border-warning/50")}
    >
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{icon}</span>
          <span className="text-xs text-text-muted uppercase">{label}</span>
        </div>
        <p
          className={cn(
            "text-2xl font-bold",
            isOnTarget ? "text-success" : "text-warning",
          )}
        >
          {value}
        </p>
        <div className="mt-2">
          <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full",
                isOnTarget ? "bg-success" : "bg-warning",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-text-muted mt-1">
            Target: {lowerIsBetter ? "≤" : "≥"}
            {target}
            {maxTarget ? "" : "%"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function KPITrendsCard({ trends }: { trends: KPITrend[] }) {
  const [selectedMetric, setSelectedMetric] = useState(trends[0]?.metric || "");
  const selectedTrend = trends.find((t) => t.metric === selectedMetric);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>KPI Trends</CardTitle>
          <div className="flex gap-1">
            {trends.map((trend) => (
              <Button
                key={trend.metric}
                variant={selectedMetric === trend.metric ? "primary" : "ghost"}
                size="sm"
                onClick={() => setSelectedMetric(trend.metric)}
              >
                {formatMetricLabel(trend.metric)}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedTrend ? (
          <div className="space-y-4">
            {/* Current vs Previous */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">Current</p>
                <p className="text-3xl font-bold">
                  {formatMetricValue(
                    selectedTrend.metric,
                    selectedTrend.current_value,
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-muted">Previous</p>
                <p className="text-xl text-text-secondary">
                  {formatMetricValue(
                    selectedTrend.metric,
                    selectedTrend.previous_value,
                  )}
                </p>
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 px-3 py-1 rounded-full",
                  selectedTrend.trend === "up"
                    ? "bg-success/20 text-success"
                    : selectedTrend.trend === "down"
                      ? "bg-error/20 text-error"
                      : "bg-text-muted/20 text-text-muted",
                )}
              >
                <span>
                  {selectedTrend.trend === "up"
                    ? "↑"
                    : selectedTrend.trend === "down"
                      ? "↓"
                      : "→"}
                </span>
                <span className="font-medium">
                  {selectedTrend.change_pct >= 0 ? "+" : ""}
                  {selectedTrend.change_pct.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Mini chart (placeholder) */}
            <div className="h-32 bg-background-secondary rounded-lg flex items-end justify-between p-4 gap-1">
              {selectedTrend.data_points.slice(-14).map((point, i) => {
                const max = Math.max(
                  ...selectedTrend.data_points.map((p) => p.value),
                );
                const height = (point.value / max) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-primary rounded-t"
                    style={{ height: `${height}%` }}
                    title={`${point.date}: ${point.value}`}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-text-secondary">
            Select a metric to view trends
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TechnicianLeaderboard({
  scores,
  sortBy,
  onSortChange,
}: {
  scores: TechnicianScore[];
  sortBy: SortField;
  onSortChange: (field: SortField) => void;
}) {
  const sortedScores = [...scores].sort((a, b) => {
    if (sortBy === "overall_rank") return a.overall_rank - b.overall_rank;
    return b[sortBy] - a[sortBy];
  });

  const sortOptions: { field: SortField; label: string }[] = [
    { field: "overall_rank", label: "Rank" },
    { field: "first_time_fix_rate", label: "FTFR" },
    { field: "customer_satisfaction", label: "CSAT" },
    { field: "revenue_generated", label: "Revenue" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Technician Leaderboard</CardTitle>
          <div className="flex gap-1">
            {sortOptions.map((opt) => (
              <Button
                key={opt.field}
                variant={sortBy === opt.field ? "primary" : "ghost"}
                size="sm"
                onClick={() => onSortChange(opt.field)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 font-medium">Rank</th>
                <th className="text-left py-3 px-2 font-medium">Technician</th>
                <th className="text-right py-3 px-2 font-medium">Jobs</th>
                <th className="text-right py-3 px-2 font-medium">FTFR</th>
                <th className="text-right py-3 px-2 font-medium">CSAT</th>
                <th className="text-right py-3 px-2 font-medium">Repeat %</th>
                <th className="text-right py-3 px-2 font-medium">
                  Utilization
                </th>
                <th className="text-right py-3 px-2 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {sortedScores.map((tech) => (
                <tr
                  key={tech.technician_id}
                  className="border-b border-border hover:bg-background-secondary/50"
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {tech.overall_rank <= 3 ? (
                        <span
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold",
                            tech.overall_rank === 1
                              ? "bg-yellow-500"
                              : tech.overall_rank === 2
                                ? "bg-gray-400"
                                : "bg-amber-700",
                          )}
                        >
                          {tech.overall_rank}
                        </span>
                      ) : (
                        <span className="w-6 h-6 flex items-center justify-center text-text-muted">
                          {tech.overall_rank}
                        </span>
                      )}
                      {tech.rank_change !== 0 && (
                        <span
                          className={cn(
                            "text-xs",
                            tech.rank_change > 0
                              ? "text-success"
                              : "text-error",
                          )}
                        >
                          {tech.rank_change > 0 ? "↑" : "↓"}
                          {Math.abs(tech.rank_change)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span className="font-medium">{tech.technician_name}</span>
                  </td>
                  <td className="text-right py-3 px-2">
                    {tech.jobs_completed}
                  </td>
                  <td className="text-right py-3 px-2">
                    <MetricBadge
                      value={tech.first_time_fix_rate * 100}
                      thresholds={{ good: 85, warning: 75 }}
                      suffix="%"
                    />
                  </td>
                  <td className="text-right py-3 px-2">
                    <MetricBadge
                      value={tech.customer_satisfaction}
                      thresholds={{ good: 4.5, warning: 4.0 }}
                      maxDecimals={1}
                      suffix="/5"
                    />
                  </td>
                  <td className="text-right py-3 px-2">
                    <MetricBadge
                      value={tech.repeat_visit_rate * 100}
                      thresholds={{ good: 10, warning: 15 }}
                      lowerIsBetter
                      suffix="%"
                    />
                  </td>
                  <td className="text-right py-3 px-2">
                    <MetricBadge
                      value={tech.utilization_rate * 100}
                      thresholds={{ good: 75, warning: 60 }}
                      suffix="%"
                      maxDecimals={0}
                    />
                  </td>
                  <td className="text-right py-3 px-2 font-medium">
                    {formatCurrency(tech.revenue_generated)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricBadge({
  value,
  thresholds,
  lowerIsBetter = false,
  suffix = "",
  maxDecimals = 1,
}: {
  value: number;
  thresholds: { good: number; warning: number };
  lowerIsBetter?: boolean;
  suffix?: string;
  maxDecimals?: number;
}) {
  const isGood = lowerIsBetter
    ? value <= thresholds.good
    : value >= thresholds.good;
  const isWarning = lowerIsBetter
    ? value <= thresholds.warning && value > thresholds.good
    : value >= thresholds.warning && value < thresholds.good;

  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-xs font-medium",
        isGood
          ? "bg-success/20 text-success"
          : isWarning
            ? "bg-warning/20 text-warning"
            : "bg-error/20 text-error",
      )}
    >
      {value.toFixed(maxDecimals)}
      {suffix}
    </span>
  );
}

function formatMetricLabel(metric: string): string {
  const labels: Record<string, string> = {
    first_time_fix_rate: "FTFR",
    customer_satisfaction: "CSAT",
    repeat_visit_rate: "Repeat Rate",
    utilization_rate: "Utilization",
    revenue: "Revenue",
    jobs_completed: "Jobs",
  };
  return labels[metric] || metric;
}

function formatMetricValue(metric: string, value: number): string {
  if (metric.includes("rate") || metric.includes("utilization")) {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (metric === "customer_satisfaction") {
    return `${value.toFixed(1)}/5`;
  }
  if (metric === "revenue") {
    return formatCurrency(value);
  }
  return value.toFixed(0);
}
