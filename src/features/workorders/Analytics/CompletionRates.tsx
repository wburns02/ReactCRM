/**
 * CompletionRates - Work order completion metrics visualization
 * Shows pie chart by status, completion rate trend, cancellation rate, follow-up rate
 */

import { useState, useMemo, memo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import type { WorkOrderStatus } from "@/api/types/workOrder.ts";
import {
  formatPercentage,
  formatChartDate,
  STATUS_CHART_COLORS,
  CHART_COLORS,
  AXIS_STYLE,
  GRID_STYLE,
} from "./utils/chartConfig.ts";

export interface StatusDistribution {
  status: WorkOrderStatus;
  count: number;
  label: string;
}

export interface CompletionTrendPoint {
  date: string;
  completionRate: number;
  cancellationRate: number;
  followUpRate: number;
  total: number;
}

interface CompletionRatesProps {
  statusDistribution: StatusDistribution[];
  trendData: CompletionTrendPoint[];
  isLoading?: boolean;
  className?: string;
}

type ViewMode = "distribution" | "trend";

/**
 * Status label mapping
 */
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  enroute: "En Route",
  on_site: "On Site",
  in_progress: "In Progress",
  completed: "Completed",
  canceled: "Canceled",
  requires_followup: "Follow-up Required",
};

/**
 * Custom pie chart label
 */
function CustomPieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Don't show label for small slices

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: "12px", fontWeight: 600 }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

/**
 * Custom tooltip for pie chart
 */
function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; percent: number }[] }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-text-primary">
        {STATUS_LABELS[data.name] || data.name}
      </p>
      <p className="text-sm text-text-secondary">
        Count:{" "}
        <span className="font-semibold text-text-primary">{data.value}</span>
      </p>
      <p className="text-sm text-text-secondary">
        Percentage:{" "}
        <span className="font-semibold text-text-primary">
          {formatPercentage(data.percent * 100)}
        </span>
      </p>
    </div>
  );
}

/**
 * Custom tooltip for trend chart
 */
function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-text-primary mb-2">{label}</p>
      {payload.map((entry, index: number) => (
        <p key={index} className="text-sm text-text-secondary">
          <span
            className="inline-block w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}:{" "}
          <span className="font-semibold text-text-primary">
            {formatPercentage(entry.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

/**
 * Status distribution pie chart
 */
const StatusPieChart = memo(function StatusPieChart({
  data,
}: {
  data: StatusDistribution[];
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const pieData = data.map((d) => ({
    name: d.status,
    value: d.count,
    label: d.label,
    percent: d.count / total,
  }));

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6">
      <div className="w-full lg:w-1/2">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={CustomPieLabel}
              labelLine={false}
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={STATUS_CHART_COLORS[entry.name] || CHART_COLORS.gray}
                />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="w-full lg:w-1/2 grid grid-cols-2 gap-2">
        {pieData.map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-bg-muted transition-colors"
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{
                backgroundColor:
                  STATUS_CHART_COLORS[item.name] || CHART_COLORS.gray,
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-text-primary truncate">
                {STATUS_LABELS[item.name] || item.name}
              </p>
              <p className="text-xs text-text-secondary">
                {item.value} ({formatPercentage(item.percent * 100)})
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

/**
 * Completion rate trend chart
 */
const TrendChart = memo(function TrendChart({
  data,
}: {
  data: CompletionTrendPoint[];
}) {
  const chartData = data.map((point) => ({
    ...point,
    dateLabel: formatChartDate(point.date),
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart
        data={chartData}
        margin={{ top: 10, right: 30, bottom: 0, left: 0 }}
      >
        <CartesianGrid {...GRID_STYLE} />
        <XAxis dataKey="dateLabel" {...AXIS_STYLE} tick={{ fontSize: 11 }} />
        <YAxis
          {...AXIS_STYLE}
          domain={[0, 100]}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip content={<TrendTooltip />} />
        <Legend />
        <Line
          type="monotone"
          dataKey="completionRate"
          stroke={CHART_COLORS.success}
          strokeWidth={2}
          name="Completion Rate"
          dot={{ fill: CHART_COLORS.success, r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="cancellationRate"
          stroke={CHART_COLORS.danger}
          strokeWidth={2}
          name="Cancellation Rate"
          dot={{ fill: CHART_COLORS.danger, r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="followUpRate"
          stroke={CHART_COLORS.warning}
          strokeWidth={2}
          name="Follow-up Rate"
          dot={{ fill: CHART_COLORS.warning, r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

/**
 * Summary stats cards
 */
const SummaryStats = memo(function SummaryStats({
  statusDistribution,
  trendData,
}: {
  statusDistribution: StatusDistribution[];
  trendData: CompletionTrendPoint[];
}) {
  const stats = useMemo(() => {
    const total = statusDistribution.reduce((sum, d) => sum + d.count, 0);
    const completed =
      statusDistribution.find((d) => d.status === "completed")?.count || 0;
    const canceled =
      statusDistribution.find((d) => d.status === "canceled")?.count || 0;
    const followUp =
      statusDistribution.find((d) => d.status === "requires_followup")?.count ||
      0;

    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const cancellationRate = total > 0 ? (canceled / total) * 100 : 0;
    const followUpRate = total > 0 ? (followUp / total) * 100 : 0;

    // Calculate trend (compare last point to first)
    let completionTrend = 0;
    if (trendData.length >= 2) {
      const first = trendData[0].completionRate;
      const last = trendData[trendData.length - 1].completionRate;
      completionTrend = last - first;
    }

    return {
      completionRate,
      cancellationRate,
      followUpRate,
      completionTrend,
      total,
    };
  }, [statusDistribution, trendData]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-bg-muted rounded-lg p-4">
        <p className="text-sm text-text-secondary mb-1">Completion Rate</p>
        <p className="text-2xl font-bold text-success">
          {formatPercentage(stats.completionRate)}
        </p>
        {stats.completionTrend !== 0 && (
          <Badge
            variant={stats.completionTrend > 0 ? "success" : "danger"}
            className="mt-1 text-xs"
          >
            {stats.completionTrend > 0 ? "\u25B2" : "\u25BC"}{" "}
            {Math.abs(stats.completionTrend).toFixed(1)}%
          </Badge>
        )}
      </div>
      <div className="bg-bg-muted rounded-lg p-4">
        <p className="text-sm text-text-secondary mb-1">Cancellation Rate</p>
        <p className="text-2xl font-bold text-danger">
          {formatPercentage(stats.cancellationRate)}
        </p>
      </div>
      <div className="bg-bg-muted rounded-lg p-4">
        <p className="text-sm text-text-secondary mb-1">Follow-up Rate</p>
        <p className="text-2xl font-bold text-warning">
          {formatPercentage(stats.followUpRate)}
        </p>
      </div>
      <div className="bg-bg-muted rounded-lg p-4">
        <p className="text-sm text-text-secondary mb-1">Total Work Orders</p>
        <p className="text-2xl font-bold text-text-primary">
          {stats.total.toLocaleString()}
        </p>
      </div>
    </div>
  );
});

/**
 * Loading skeleton
 */
function LoadingSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <Skeleton variant="text" className="h-6 w-40" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" className="h-20" />
          ))}
        </div>
        <Skeleton variant="rounded" className="h-[250px]" />
      </div>
    </Card>
  );
}

/**
 * Main CompletionRates component
 */
export const CompletionRates = memo(function CompletionRates({
  statusDistribution,
  trendData,
  isLoading = false,
  className = "",
}: CompletionRatesProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("distribution");

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (statusDistribution.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-lg">Completion Rates</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">&#128202;</div>
            <h3 className="text-lg font-medium text-text-primary mb-2">
              No completion data available
            </h3>
            <p className="text-text-secondary">
              Completion metrics will appear once work orders are processed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <CardHeader className="p-0 mb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Completion Rates</CardTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("distribution")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === "distribution"
                  ? "bg-primary text-white"
                  : "bg-bg-muted text-text-secondary hover:bg-bg-hover"
              }`}
            >
              Distribution
            </button>
            <button
              onClick={() => setViewMode("trend")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === "trend"
                  ? "bg-primary text-white"
                  : "bg-bg-muted text-text-secondary hover:bg-bg-hover"
              }`}
            >
              Trend
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <SummaryStats
          statusDistribution={statusDistribution}
          trendData={trendData}
        />
        {viewMode === "distribution" ? (
          <StatusPieChart data={statusDistribution} />
        ) : (
          <TrendChart data={trendData} />
        )}
      </CardContent>
    </Card>
  );
});

export default CompletionRates;
