/**
 * Disposition Donut Chart Component
 * Displays call disposition distribution as a donut chart with interactive features
 */

import { useMemo, useState, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Sector,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { DispositionStats, DispositionCategory } from "../types";

// Default colors by category
const DEFAULT_CATEGORY_COLORS: Record<DispositionCategory, string> = {
  positive: "#10b981", // emerald
  neutral: "#6b7280", // gray
  negative: "#ef4444", // red
};

interface DispositionDonutProps {
  data: DispositionStats[];
  totalCalls: number;
  isLoading: boolean;
  onSliceClick?: (dispositionId: string) => void;
}

/**
 * Get color for a disposition, falling back to category default
 */
function getDispositionColor(disposition: DispositionStats): string {
  if (disposition.color) {
    return disposition.color;
  }
  return (
    DEFAULT_CATEGORY_COLORS[disposition.category] ||
    DEFAULT_CATEGORY_COLORS.neutral
  );
}

/**
 * Custom tooltip component props
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DispositionStats }>;
}

/**
 * Custom tooltip component
 */
function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-bg-card border border-border rounded-lg shadow-lg p-3 min-w-[180px]">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: getDispositionColor(data) }}
        />
        <span className="text-sm font-semibold text-text-primary">
          {data.disposition_name}
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Count</span>
          <span className="font-medium text-text-primary">{data.count}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Percentage</span>
          <span className="font-medium text-text-primary">
            {(data.percentage ?? 0).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Auto-applied</span>
          <span className="font-medium text-text-primary">
            {data.auto_applied_count}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Confidence</span>
          <span className="font-medium text-text-primary">
            {((data.avg_confidence ?? 0) * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Active shape renderer for hover state
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderActiveShape(props: any) {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
  } = props;

  return (
    <g>
      {/* Highlighted outer ring */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.9}
      />
      {/* Inner glow effect */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={innerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.3}
      />
      {/* Percentage label near the slice */}
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fill="#111827"
        className="text-lg font-bold"
      >
        {(payload?.percentage ?? 0).toFixed(1)}%
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        fill="#6b7280"
        className="text-xs"
      >
        {payload.disposition_name}
      </text>
    </g>
  );
}

/**
 * Loading skeleton for the donut chart
 */
function DonutSkeleton() {
  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Donut skeleton */}
      <div className="relative">
        <Skeleton variant="circular" className="h-48 w-48" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Skeleton variant="circular" className="h-24 w-24 bg-bg-card" />
        </div>
      </div>
      {/* Legend skeleton */}
      <div className="w-full space-y-2 pt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton variant="circular" className="h-3 w-3" />
              <Skeleton variant="text" className="h-4 w-24" />
            </div>
            <Skeleton variant="text" className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Legend component showing all dispositions with counts
 */
function DispositionLegend({
  data,
  activeIndex,
  onItemHover,
  onItemClick,
}: {
  data: DispositionStats[];
  activeIndex: number | null;
  onItemHover: (index: number | null) => void;
  onItemClick: (dispositionId: string) => void;
}) {
  return (
    <div className="w-full space-y-1.5 pt-4">
      {data.map((item, index) => (
        <button
          key={item.disposition_id}
          type="button"
          className={`
            w-full flex items-center justify-between p-2 rounded-md
            transition-all duration-200 cursor-pointer
            hover:bg-bg-muted
            ${activeIndex === index ? "bg-bg-muted" : ""}
          `}
          onMouseEnter={() => onItemHover(index)}
          onMouseLeave={() => onItemHover(null)}
          onClick={() => onItemClick(item.disposition_id)}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full transition-transform duration-200"
              style={{
                backgroundColor: getDispositionColor(item),
                transform: activeIndex === index ? "scale(1.2)" : "scale(1)",
              }}
            />
            <span className="text-sm text-text-primary font-medium">
              {item.disposition_name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">
              {item.count.toLocaleString()}
            </span>
            <span className="text-sm font-medium text-text-primary min-w-[40px] text-right">
              {(item.percentage ?? 0).toFixed(1)}%
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

/**
 * Disposition Donut Chart
 * Interactive donut chart showing disposition distribution with hover effects
 */
export function DispositionDonut({
  data,
  totalCalls,
  isLoading,
  onSliceClick,
}: DispositionDonutProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Convert data to chart-compatible format with index signature for Recharts
  const chartData = useMemo(() => {
    return data.map(
      (item) =>
        ({
          ...item,
          // Add index signature compatible properties
        }) as DispositionStats & Record<string, unknown>,
    );
  }, [data]);

  // Memoize colors array for the pie chart
  const colors = useMemo(() => {
    return data.map(getDispositionColor);
  }, [data]);

  // Handle pie segment hover
  const onPieEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index);
  }, []);

  const onPieLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  // Handle slice click
  const handleSliceClick = useCallback(
    (entry: DispositionStats) => {
      if (onSliceClick) {
        onSliceClick(entry.disposition_id);
      }
    },
    [onSliceClick],
  );

  // Handle legend item hover
  const handleLegendHover = useCallback((index: number | null) => {
    setActiveIndex(index);
  }, []);

  // Handle legend item click
  const handleLegendClick = useCallback(
    (dispositionId: string) => {
      if (onSliceClick) {
        onSliceClick(dispositionId);
      }
    },
    [onSliceClick],
  );

  // Render function for each cell - handles active shape
  const renderCell = useCallback(
    (entry: DispositionStats, index: number) => {
      const isActive = activeIndex === index;
      return (
        <Cell
          key={`cell-${entry.disposition_id}`}
          fill={colors[index]}
          stroke="white"
          strokeWidth={2}
          style={{
            filter: isActive
              ? "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.15))"
              : "none",
            transition: "filter 200ms ease-out",
            cursor: onSliceClick ? "pointer" : "default",
          }}
        />
      );
    },
    [activeIndex, colors, onSliceClick],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disposition Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <DonutSkeleton />
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-text-secondary">
            No disposition data available
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="disposition_name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={activeIndex !== null ? 108 : 100}
                  paddingAngle={2}
                  activeShape={renderActiveShape}
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  onClick={(_, index) => handleSliceClick(data[index])}
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {data.map((entry, index) => renderCell(entry, index))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                {/* Center label - rendered as SVG text */}
                {activeIndex === null && (
                  <text
                    x="50%"
                    y="45%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x="50%"
                      dy="-0.2em"
                      fontSize="24"
                      fontWeight="bold"
                      fill="#111827"
                    >
                      {totalCalls.toLocaleString()}
                    </tspan>
                    <tspan x="50%" dy="1.4em" fontSize="12" fill="#6b7280">
                      Total Calls
                    </tspan>
                  </text>
                )}
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <DispositionLegend
              data={data}
              activeIndex={activeIndex}
              onItemHover={handleLegendHover}
              onItemClick={handleLegendClick}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DispositionDonut;
