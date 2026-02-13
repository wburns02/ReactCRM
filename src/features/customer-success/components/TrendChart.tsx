/**
 * Trend Chart Component
 *
 * NPS/CSAT over time line chart featuring:
 * - Simple line chart using inline SVG
 * - Shows last 30 days trend
 * - Hover tooltips (CSS-based)
 * - Benchmark line for industry average
 * - Multiple metric support
 */

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils.ts";

// Types
export type MetricType = "nps" | "csat" | "ces" | "response_rate";

export interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  metricType?: MetricType;
  benchmarkValue?: number;
  benchmarkLabel?: string;
  title?: string;
  subtitle?: string;
  height?: number;
  showGrid?: boolean;
  showArea?: boolean;
  showDots?: boolean;
  color?: string;
  onPointClick?: (point: TrendDataPoint, index: number) => void;
  className?: string;
}

// Metric configurations
const METRIC_CONFIG: Record<
  MetricType,
  {
    label: string;
    min: number;
    max: number;
    benchmark: number;
    format: (v: number) => string;
  }
> = {
  nps: {
    label: "NPS Score",
    min: -100,
    max: 100,
    benchmark: 32, // Industry average
    format: (v) => (v >= 0 ? `+${v}` : `${v}`),
  },
  csat: {
    label: "CSAT Score",
    min: 0,
    max: 5,
    benchmark: 4.0,
    format: (v) => v.toFixed(1),
  },
  ces: {
    label: "CES Score",
    min: 1,
    max: 7,
    benchmark: 5.0,
    format: (v) => v.toFixed(1),
  },
  response_rate: {
    label: "Response Rate",
    min: 0,
    max: 100,
    benchmark: 30,
    format: (v) => `${v}%`,
  },
};

// Generate sample data
function generateSampleData(
  days: number,
  metricType: MetricType,
): TrendDataPoint[] {
  const config = METRIC_CONFIG[metricType];
  const range = config.max - config.min;
  const midpoint = (config.max + config.min) / 2;

  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));

    // Generate realistic trending data with some randomness
    const trend = Math.sin(i / 5) * (range * 0.1);
    const noise = (Math.random() - 0.5) * (range * 0.1);
    let value = midpoint + trend + noise;

    // Clamp to range
    value = Math.max(config.min, Math.min(config.max, value));

    // Round appropriately
    if (metricType === "nps") {
      value = Math.round(value);
    } else if (metricType === "response_rate") {
      value = Math.round(value);
    } else {
      value = Math.round(value * 10) / 10;
    }

    return {
      date: date.toISOString().split("T")[0],
      value,
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    };
  });
}

// Tooltip component
function Tooltip({
  point,
  x,
  y,
  visible,
  metricType,
}: {
  point: TrendDataPoint | null;
  x: number;
  y: number;
  visible: boolean;
  metricType: MetricType;
}) {
  if (!visible || !point) return null;

  const config = METRIC_CONFIG[metricType];

  return (
    <div
      className="absolute z-20 pointer-events-none transition-opacity duration-150"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -100%)",
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="bg-bg-primary border border-border rounded-lg shadow-lg px-3 py-2 text-center mb-2">
        <p className="text-xs text-text-muted">{point.label || point.date}</p>
        <p className="text-sm font-bold text-text-primary">
          {config.format(point.value)}
        </p>
      </div>
    </div>
  );
}

export function TrendChart({
  data: propData,
  metricType = "nps",
  benchmarkValue,
  benchmarkLabel,
  title,
  subtitle,
  height = 200,
  showGrid = true,
  showArea = true,
  showDots = true,
  color,
  onPointClick,
  className,
}: TrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const data = useMemo(() => {
    if (propData && propData.length > 0) return propData;
    return [];
  }, [propData]);

  const config = METRIC_CONFIG[metricType];
  const actualBenchmark = benchmarkValue ?? config.benchmark;
  const actualBenchmarkLabel = benchmarkLabel ?? "Industry Avg";

  // Calculate chart dimensions and paths
  const { linePath, areaPath, points, yAxisLabels, minY, maxY } =
    useMemo(() => {
      if (data.length === 0) {
        return {
          linePath: "",
          areaPath: "",
          points: [],
          yAxisLabels: [],
          minY: config.min,
          maxY: config.max,
        };
      }

      const values = data.map((d) => d.value);
      let min = Math.min(...values, actualBenchmark);
      let max = Math.max(...values, actualBenchmark);

      // Add padding
      const padding = (max - min) * 0.1 || 10;
      min = Math.max(config.min, min - padding);
      max = Math.min(config.max, max + padding);

      const width = 100;
      const chartHeight = 100;

      const pts = data.map((d, i) => {
        const x = data.length > 1 ? (i / (data.length - 1)) * width : width / 2;
        const y = chartHeight - ((d.value - min) / (max - min)) * chartHeight;
        return { x, y, data: d };
      });

      const line = pts
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
        .join(" ");
      const area = `${line} L ${width} ${chartHeight} L 0 ${chartHeight} Z`;

      // Generate Y-axis labels
      const numLabels = 5;
      const labels = Array.from({ length: numLabels }, (_, i) => {
        const value = min + ((max - min) / (numLabels - 1)) * i;
        return {
          value,
          y: chartHeight - ((value - min) / (max - min)) * chartHeight,
        };
      }).reverse();

      return {
        linePath: line,
        areaPath: area,
        points: pts,
        yAxisLabels: labels,
        minY: min,
        maxY: max,
      };
    }, [data, config, actualBenchmark]);

  // Calculate benchmark line position
  const benchmarkY = useMemo(() => {
    return 100 - ((actualBenchmark - minY) / (maxY - minY)) * 100;
  }, [actualBenchmark, minY, maxY]);

  // Determine line color
  const lineColor = useMemo(() => {
    if (color) return color;
    const latestValue = data[data.length - 1]?.value ?? 0;
    if (metricType === "nps") {
      if (latestValue >= 50) return "#22c55e";
      if (latestValue >= 0) return "#f59e0b";
      return "#ef4444";
    }
    if (metricType === "csat" || metricType === "ces") {
      if (latestValue >= 4) return "#22c55e";
      if (latestValue >= 3) return "#f59e0b";
      return "#ef4444";
    }
    return "#3b82f6"; // Default blue
  }, [data, metricType, color]);

  // Handle mouse events
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const index = Math.round((x / 100) * (points.length - 1));

      if (index >= 0 && index < points.length) {
        setHoveredIndex(index);
        setTooltipPosition({
          x: (points[index].x / 100) * rect.width,
          y: (points[index].y / 100) * (height - 40),
        });
      }
    },
    [points, height],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  const handleClick = useCallback(
    (index: number) => {
      if (onPointClick && data[index]) {
        onPointClick(data[index], index);
      }
    },
    [onPointClick, data],
  );

  // Calculate stats
  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const latest = data[data.length - 1].value;
    const first = data[0].value;
    const avg = data.reduce((sum, d) => sum + d.value, 0) / data.length;
    const change = latest - first;

    return {
      latest,
      average:
        metricType === "nps" ? Math.round(avg) : Math.round(avg * 10) / 10,
      change,
      changePercent:
        first !== 0 ? Math.round((change / Math.abs(first)) * 100) : 0,
    };
  }, [data, metricType]);

  return (
    <div
      className={cn(
        "bg-bg-card rounded-xl border border-border p-6",
        className,
      )}
    >
      {/* Header */}
      {(title || subtitle) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && (
              <h4 className="font-semibold text-text-primary">{title}</h4>
            )}
            {subtitle && (
              <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>
            )}
          </div>
          {stats && (
            <div className="text-right">
              <p className="text-2xl font-bold" style={{ color: lineColor }}>
                {config.format(stats.latest)}
              </p>
              <p
                className={cn(
                  "text-xs font-medium",
                  stats.change >= 0 ? "text-success" : "text-danger",
                )}
              >
                {stats.change >= 0 ? "+" : ""}
                {config.format(stats.change)} ({stats.changePercent}%)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Chart Container */}
      <div className="relative" style={{ height: height - 40 }}>
        {/* Tooltip */}
        <Tooltip
          point={hoveredIndex !== null ? data[hoveredIndex] : null}
          x={tooltipPosition.x}
          y={tooltipPosition.y}
          visible={hoveredIndex !== null}
          metricType={metricType}
        />

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between text-[10px] text-text-muted pr-2">
          {yAxisLabels.map((label, i) => (
            <span key={i} className="text-right">
              {config.format(label.value)}
            </span>
          ))}
        </div>

        {/* SVG Chart */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full ml-10"
          style={{ width: "calc(100% - 40px)" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Area gradient */}
            <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {showGrid &&
            [0, 25, 50, 75, 100].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.1}
                className="text-border"
              />
            ))}

          {/* Benchmark line */}
          <line
            x1="0"
            y1={benchmarkY}
            x2="100"
            y2={benchmarkY}
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 2"
            className="text-text-muted"
          />
          <text
            x="2"
            y={benchmarkY - 3}
            className="fill-text-muted"
            style={{ fontSize: "8px" }}
          >
            {actualBenchmarkLabel}
          </text>

          {/* Area fill */}
          {showArea && linePath && (
            <path d={areaPath} fill="url(#trendAreaGradient)" />
          )}

          {/* Main line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={lineColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Data points */}
          {showDots &&
            points.map((point, i) => (
              <g key={i}>
                {/* Larger invisible hit area */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => handleClick(i)}
                />
                {/* Visible dot */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={hoveredIndex === i ? "2.5" : "1.5"}
                  fill={lineColor}
                  className="transition-all duration-150"
                />
                {/* Highlight ring on hover */}
                {hoveredIndex === i && (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill="none"
                    stroke={lineColor}
                    strokeWidth="1"
                    strokeOpacity="0.5"
                  />
                )}
              </g>
            ))}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 ml-10 text-[10px] text-text-muted">
        {data.length > 0 && (
          <>
            <span>{data[0].label || data[0].date}</span>
            {data.length > 2 && (
              <span>
                {data[Math.floor(data.length / 2)].label ||
                  data[Math.floor(data.length / 2)].date}
              </span>
            )}
            <span>
              {data[data.length - 1].label || data[data.length - 1].date}
            </span>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-0.5 rounded"
            style={{ backgroundColor: lineColor }}
          />
          <span className="text-text-muted">{config.label}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded border-dashed border-t border-text-muted" />
          <span className="text-text-muted">
            {actualBenchmarkLabel}: {config.format(actualBenchmark)}
          </span>
        </span>
      </div>
    </div>
  );
}

// Compact sparkline version
export function TrendSparkline({
  data,
  metricType = "nps",
  width = 80,
  height = 24,
  showChange = true,
  className,
}: {
  data: TrendDataPoint[];
  metricType?: MetricType;
  width?: number;
  height?: number;
  showChange?: boolean;
  className?: string;
}) {
  const config = METRIC_CONFIG[metricType];

  const { linePath, color, change } = useMemo(() => {
    if (data.length < 2) {
      return { linePath: "", color: "#6b7280", change: 0 };
    }

    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = data
      .map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((d.value - min) / range) * height;
        return `${x},${y}`;
      })
      .join(" ");

    const firstVal = data[0].value;
    const lastVal = data[data.length - 1].value;
    const diff = lastVal - firstVal;
    const clr = diff >= 0 ? "#22c55e" : "#ef4444";

    return { linePath: points, color: clr, change: diff };
  }, [data, width, height]);

  if (data.length < 2) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          points={linePath}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showChange && (
        <span
          className={cn(
            "text-xs font-medium",
            change >= 0 ? "text-success" : "text-danger",
          )}
        >
          {change >= 0 ? "+" : ""}
          {config.format(change)}
        </span>
      )}
    </div>
  );
}

export default TrendChart;
