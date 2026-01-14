/**
 * Chart configuration utilities for Work Order Analytics
 * Provides consistent styling and configuration across all charts
 */

// Color schemes for charts
export const CHART_COLORS = {
  primary: "#0091ae",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  purple: "#8b5cf6",
  pink: "#ec4899",
  teal: "#14b8a6",
  gray: "#6b7280",
};

// Status colors matching workOrder types
export const STATUS_CHART_COLORS: Record<string, string> = {
  completed: "#22c55e",
  scheduled: "#0091ae",
  in_progress: "#f59e0b",
  draft: "#6b7280",
  canceled: "#ef4444",
  confirmed: "#3b82f6",
  enroute: "#14b8a6",
  on_site: "#8b5cf6",
  requires_followup: "#ec4899",
};

// Color palette for multi-series charts
export const CHART_PALETTE = [
  "#0091ae",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

// Job type colors
export const JOB_TYPE_COLORS: Record<string, string> = {
  pumping: "#0091ae",
  inspection: "#3b82f6",
  repair: "#f59e0b",
  installation: "#8b5cf6",
  emergency: "#ef4444",
  maintenance: "#22c55e",
  grease_trap: "#14b8a6",
  camera_inspection: "#ec4899",
};

// Default chart margins
export const DEFAULT_MARGINS = {
  top: 10,
  right: 30,
  bottom: 0,
  left: 0,
};

export const MARGINS_WITH_LEGEND = {
  top: 10,
  right: 30,
  bottom: 20,
  left: 0,
};

export const MARGINS_ROTATED_AXIS = {
  top: 10,
  right: 30,
  bottom: 60,
  left: 0,
};

// Common axis styles
export const AXIS_STYLE = {
  stroke: "#6b7280",
  style: { fontSize: "12px" },
};

// Common grid styles
export const GRID_STYLE = {
  strokeDasharray: "3 3",
  stroke: "#e5e7eb",
};

// Tooltip styles
export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  },
  labelStyle: {
    color: "#111827",
    fontWeight: 600,
  },
};

// Gradient definitions for area charts
export const createGradient = (id: string, color: string) => ({
  id,
  color,
  stops: [
    { offset: "5%", opacity: 0.3 },
    { offset: "95%", opacity: 0 },
  ],
});

/**
 * Format currency for chart axes and tooltips
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format currency for compact display (e.g., $1.2k, $3.5M)
 */
export function formatCurrencyCompact(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}k`;
  }
  return `$${value}`;
}

/**
 * Format number for compact display
 */
export function formatNumberCompact(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return value.toString();
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format date for chart axes
 */
export function formatChartDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

/**
 * Format date with year
 */
export function formatChartDateLong(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Format time duration in hours/minutes
 */
export function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours.toFixed(0)}h`;
}

// Responsive breakpoints for charts
export const CHART_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

/**
 * Get responsive chart height based on container width
 */
export function getResponsiveHeight(width: number, baseHeight = 300): number {
  if (width < CHART_BREAKPOINTS.sm) {
    return baseHeight * 0.8;
  }
  if (width < CHART_BREAKPOINTS.md) {
    return baseHeight * 0.9;
  }
  return baseHeight;
}

/**
 * Get color by index from palette (cycles if index exceeds palette length)
 */
export function getChartColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}

/**
 * Create a gradient fill URL reference
 */
export function gradientUrl(id: string): string {
  return `url(#${id})`;
}

// KPI trend indicators
export type TrendDirection = "up" | "down" | "neutral";

export function getTrendDirection(
  current: number,
  previous: number,
): TrendDirection {
  const change = current - previous;
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "neutral";
}

export function getTrendColor(
  direction: TrendDirection,
  positiveIsGood = true,
): string {
  if (direction === "neutral") return CHART_COLORS.gray;
  if (direction === "up") {
    return positiveIsGood ? CHART_COLORS.success : CHART_COLORS.danger;
  }
  return positiveIsGood ? CHART_COLORS.danger : CHART_COLORS.success;
}

export function calculatePercentageChange(
  current: number,
  previous: number,
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
