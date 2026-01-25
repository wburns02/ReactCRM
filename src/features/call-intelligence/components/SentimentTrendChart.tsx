/**
 * Sentiment Trend Chart Component
 * Displays sentiment distribution over time using a stacked area chart
 */

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  AXIS_STYLE,
  GRID_STYLE,
  TOOLTIP_STYLE,
  formatChartDate,
  DEFAULT_MARGINS,
} from "@/features/workorders/Analytics/utils/chartConfig";
import type { TrendDataPoint } from "../types";

// Sentiment colors
const SENTIMENT_COLORS = {
  positive: "#22c55e",
  neutral: "#6b7280",
  negative: "#ef4444",
} as const;

interface SentimentTrendChartProps {
  data: TrendDataPoint[];
  isLoading: boolean;
  height?: number;
  onPointClick?: (date: string) => void;
}

/**
 * Custom tooltip component for the sentiment trend chart
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0]?.payload as TrendDataPoint | undefined;
  if (!data) return null;

  const total =
    (data.positive ?? 0) + (data.neutral ?? 0) + (data.negative ?? 0);
  const getPercentage = (value: number | undefined) => {
    if (!value || total === 0) return 0;
    return ((value / total) * 100).toFixed(1);
  };

  const dateLabel = typeof label === "string" ? label : String(label ?? "");

  return (
    <div
      style={{
        ...TOOLTIP_STYLE.contentStyle,
        padding: "12px 16px",
        minWidth: "180px",
      }}
    >
      <p style={{ ...TOOLTIP_STYLE.labelStyle, marginBottom: "8px" }}>
        {formatChartDate(dateLabel)}
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: SENTIMENT_COLORS.positive }}
            />
            <span className="text-sm text-text-secondary">Positive</span>
          </div>
          <span className="text-sm font-medium text-text-primary">
            {data.positive ?? 0} ({getPercentage(data.positive)}%)
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: SENTIMENT_COLORS.neutral }}
            />
            <span className="text-sm text-text-secondary">Neutral</span>
          </div>
          <span className="text-sm font-medium text-text-primary">
            {data.neutral ?? 0} ({getPercentage(data.neutral)}%)
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: SENTIMENT_COLORS.negative }}
            />
            <span className="text-sm text-text-secondary">Negative</span>
          </div>
          <span className="text-sm font-medium text-text-primary">
            {data.negative ?? 0} ({getPercentage(data.negative)}%)
          </span>
        </div>
        <div className="mt-2 pt-2 border-t border-border flex justify-between">
          <span className="text-sm font-medium text-text-secondary">Total</span>
          <span className="text-sm font-semibold text-text-primary">
            {total}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for the chart
 */
function ChartSkeleton({ height }: { height: number }) {
  return (
    <div className="space-y-4">
      {/* Chart area skeleton */}
      <div className="relative" style={{ height }}>
        <Skeleton variant="rounded" className="w-full h-full" />
        {/* Simulated chart bars */}
        <div className="absolute inset-0 p-4 flex flex-col justify-end">
          <div className="flex items-end gap-1 h-full">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col gap-0.5"
                style={{ height: `${40 + (i % 3) * 15}%` }}
              >
                <div className="w-full flex-1 bg-bg-muted/50 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* X-axis labels skeleton */}
      <div className="flex justify-between px-8">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} variant="text" className="h-3 w-10" />
        ))}
      </div>
    </div>
  );
}

/**
 * Sentiment Trend Chart
 * Displays a stacked area chart showing sentiment distribution over time
 */
export function SentimentTrendChart({
  data,
  isLoading,
  height = 300,
  onPointClick,
}: SentimentTrendChartProps) {
  // Memoize gradient IDs to prevent re-renders
  const gradientIds = useMemo(
    () => ({
      positive: "sentimentGradientPositive",
      neutral: "sentimentGradientNeutral",
      negative: "sentimentGradientNegative",
    }),
    [],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (chartData: any) => {
    if (onPointClick && chartData?.activeLabel) {
      const label = String(chartData.activeLabel);
      onPointClick(label);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sentiment Trends</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ChartSkeleton height={height} />
        ) : data.length === 0 ? (
          <div
            className="flex items-center justify-center text-text-secondary"
            style={{ height }}
          >
            No sentiment data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart
              data={data}
              margin={DEFAULT_MARGINS}
              onClick={handleClick}
            >
              {/* Gradient definitions */}
              <defs>
                <linearGradient
                  id={gradientIds.positive}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={SENTIMENT_COLORS.positive}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={SENTIMENT_COLORS.positive}
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient
                  id={gradientIds.neutral}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={SENTIMENT_COLORS.neutral}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={SENTIMENT_COLORS.neutral}
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient
                  id={gradientIds.negative}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={SENTIMENT_COLORS.negative}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={SENTIMENT_COLORS.negative}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid {...GRID_STYLE} vertical={false} />

              <XAxis
                dataKey="date"
                tickFormatter={formatChartDate}
                {...AXIS_STYLE}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                dy={10}
              />

              <YAxis
                {...AXIS_STYLE}
                tickLine={false}
                axisLine={false}
                width={40}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Stacked areas - order matters for layering */}
              <Area
                type="monotone"
                dataKey="negative"
                stackId="1"
                stroke={SENTIMENT_COLORS.negative}
                fill={`url(#${gradientIds.negative})`}
                strokeWidth={2}
                animationBegin={0}
                animationDuration={800}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="neutral"
                stackId="1"
                stroke={SENTIMENT_COLORS.neutral}
                fill={`url(#${gradientIds.neutral})`}
                strokeWidth={2}
                animationBegin={200}
                animationDuration={800}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="positive"
                stackId="1"
                stroke={SENTIMENT_COLORS.positive}
                fill={`url(#${gradientIds.positive})`}
                strokeWidth={2}
                animationBegin={400}
                animationDuration={800}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default SentimentTrendChart;
