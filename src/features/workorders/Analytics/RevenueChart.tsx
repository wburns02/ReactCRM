/**
 * RevenueChart - Revenue over time visualization
 * Line/bar chart with daily/weekly/monthly toggle and period comparison
 */

import { useState, useMemo, memo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
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
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatChartDate,
  CHART_COLORS,
  AXIS_STYLE,
  GRID_STYLE,
} from "./utils/chartConfig.ts";

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  previousRevenue?: number;
  workOrders: number;
  previousWorkOrders?: number;
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
  isLoading?: boolean;
  showComparison?: boolean;
  className?: string;
}

type ChartType = "line" | "bar" | "area";
type GroupBy = "daily" | "weekly" | "monthly";

/**
 * Custom tooltip component
 */
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; name: string; value: number; color: string }>; label?: string; showComparison?: boolean }) {
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
            {entry.dataKey.includes("revenue") ||
            entry.dataKey.includes("Revenue")
              ? formatCurrency(entry.value)
              : entry.value.toLocaleString()}
          </span>
        </p>
      ))}
      {showComparison && payload.length >= 2 && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-xs text-text-muted">
            {payload[0]?.value > payload[1]?.value
              ? `+${((payload[0].value / payload[1].value - 1) * 100).toFixed(1)}% vs prev period`
              : `${((payload[0].value / payload[1].value - 1) * 100).toFixed(1)}% vs prev period`}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Group data by time period
 */
function groupDataByPeriod(
  data: RevenueDataPoint[],
  groupBy: GroupBy,
): RevenueDataPoint[] {
  if (groupBy === "daily") return data;

  const grouped = new Map<string, RevenueDataPoint>();

  data.forEach((point) => {
    const date = new Date(point.date);
    let key: string;

    if (groupBy === "weekly") {
      // Get week start (Sunday)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split("T")[0];
    } else {
      // Monthly - use first day of month
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
    }

    const existing = grouped.get(key) || {
      date: key,
      revenue: 0,
      previousRevenue: 0,
      workOrders: 0,
      previousWorkOrders: 0,
    };

    existing.revenue += point.revenue;
    existing.previousRevenue =
      (existing.previousRevenue || 0) + (point.previousRevenue || 0);
    existing.workOrders += point.workOrders;
    existing.previousWorkOrders =
      (existing.previousWorkOrders || 0) + (point.previousWorkOrders || 0);

    grouped.set(key, existing);
  });

  return Array.from(grouped.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

/**
 * Format date based on grouping
 */
function formatDateByGroup(dateStr: string, groupBy: GroupBy): string {
  const date = new Date(dateStr);

  if (groupBy === "daily") {
    return formatChartDate(dateStr);
  }

  if (groupBy === "weekly") {
    return `Week of ${formatChartDate(dateStr)}`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Loading skeleton
 */
function LoadingSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" className="h-6 w-40" />
          <div className="flex gap-2">
            <Skeleton variant="rounded" className="h-8 w-20" />
            <Skeleton variant="rounded" className="h-8 w-20" />
            <Skeleton variant="rounded" className="h-8 w-20" />
          </div>
        </div>
        <Skeleton variant="rounded" className="h-[300px]" />
      </div>
    </Card>
  );
}

/**
 * Main RevenueChart component
 */
export const RevenueChart = memo(function RevenueChart({
  data,
  isLoading = false,
  showComparison = false,
  className = "",
}: RevenueChartProps) {
  const [chartType, setChartType] = useState<ChartType>("area");
  const [groupBy, setGroupBy] = useState<GroupBy>("daily");

  const groupedData = useMemo(() => {
    return groupDataByPeriod(data, groupBy);
  }, [data, groupBy]);

  const chartData = useMemo(() => {
    return groupedData.map((point) => ({
      ...point,
      dateLabel: formatDateByGroup(point.date, groupBy),
    }));
  }, [groupedData, groupBy]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = data.reduce((sum, d) => sum + d.workOrders, 0);
    const avgRevenue = totalRevenue / (data.length || 1);
    const maxRevenue = Math.max(...data.map((d) => d.revenue));

    return { totalRevenue, totalOrders, avgRevenue, maxRevenue };
  }, [data]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (data.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-lg">Revenue Over Time</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">&#128200;</div>
            <h3 className="text-lg font-medium text-text-primary mb-2">
              No revenue data available
            </h3>
            <p className="text-text-secondary">
              Revenue data will appear once work orders are completed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 30, bottom: 0, left: 0 },
    };

    const xAxisProps = {
      dataKey: "dateLabel",
      ...AXIS_STYLE,
      tick: { fontSize: 11 },
      angle: groupBy === "daily" ? -45 : 0,
      textAnchor: groupBy === "daily" ? ("end" as const) : ("middle" as const),
      height: groupBy === "daily" ? 60 : 30,
    };

    const yAxisProps = {
      ...AXIS_STYLE,
      tickFormatter: formatCurrencyCompact,
    };

    if (chartType === "bar") {
      return (
        <BarChart {...commonProps}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip
            content={<CustomTooltip showComparison={showComparison} />}
          />
          <Legend />
          <Bar
            dataKey="revenue"
            fill={CHART_COLORS.primary}
            name="Revenue"
            radius={[4, 4, 0, 0]}
          />
          {showComparison && (
            <Bar
              dataKey="previousRevenue"
              fill={CHART_COLORS.gray}
              name="Previous Period"
              radius={[4, 4, 0, 0]}
              opacity={0.5}
            />
          )}
        </BarChart>
      );
    }

    if (chartType === "line") {
      return (
        <LineChart {...commonProps}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip
            content={<CustomTooltip showComparison={showComparison} />}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            name="Revenue"
            dot={{ fill: CHART_COLORS.primary, r: 4 }}
            activeDot={{ r: 6 }}
          />
          {showComparison && (
            <Line
              type="monotone"
              dataKey="previousRevenue"
              stroke={CHART_COLORS.gray}
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Previous Period"
              dot={{ fill: CHART_COLORS.gray, r: 3 }}
            />
          )}
        </LineChart>
      );
    }

    // Default: area chart
    return (
      <AreaChart {...commonProps}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={CHART_COLORS.primary}
              stopOpacity={0.3}
            />
            <stop
              offset="95%"
              stopColor={CHART_COLORS.primary}
              stopOpacity={0}
            />
          </linearGradient>
          {showComparison && (
            <linearGradient id="previousGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={CHART_COLORS.gray}
                stopOpacity={0.2}
              />
              <stop
                offset="95%"
                stopColor={CHART_COLORS.gray}
                stopOpacity={0}
              />
            </linearGradient>
          )}
        </defs>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis {...xAxisProps} />
        <YAxis {...yAxisProps} />
        <Tooltip content={<CustomTooltip showComparison={showComparison} />} />
        <Legend />
        {showComparison && (
          <Area
            type="monotone"
            dataKey="previousRevenue"
            stroke={CHART_COLORS.gray}
            strokeWidth={1}
            fill="url(#previousGradient)"
            name="Previous Period"
          />
        )}
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          fill="url(#revenueGradient)"
          name="Revenue"
        />
      </AreaChart>
    );
  };

  return (
    <Card className={`p-6 ${className}`}>
      <CardHeader className="p-0 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Revenue Over Time</CardTitle>
            <p className="text-sm text-text-secondary mt-1">
              Total: {formatCurrency(stats.totalRevenue)} from{" "}
              {stats.totalOrders} orders
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Group by selector */}
            <div className="flex items-center gap-1 bg-bg-muted rounded-md p-0.5">
              {(["daily", "weekly", "monthly"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setGroupBy(option)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    groupBy === option
                      ? "bg-bg-card text-text-primary shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
            {/* Chart type selector */}
            <div className="flex items-center gap-1 bg-bg-muted rounded-md p-0.5">
              {(["area", "line", "bar"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    chartType === type
                      ? "bg-bg-card text-text-primary shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {type === "area" ? "Area" : type === "line" ? "Line" : "Bar"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ResponsiveContainer width="100%" height={300}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

export default RevenueChart;
