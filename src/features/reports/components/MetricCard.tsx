import { memo } from "react";

/**
 * MetricCard - Display a key metric with optional change percentage
 *
 * Memoized for performance in dashboards with many cards.
 */

interface MetricCardProps {
  title: string;
  value: string | number;
  changePercent?: number | null;
  icon?: string;
  format?: "number" | "currency" | "percent";
  className?: string;
}

export const MetricCard = memo(function MetricCard({
  title,
  value,
  changePercent,
  icon,
  format = "number",
  className = "",
}: MetricCardProps) {
  // Format the value based on type
  const formattedValue = (() => {
    if (typeof value === "string") return value;

    switch (format) {
      case "currency":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case "percent":
        return `${value.toFixed(1)}%`;
      default:
        return new Intl.NumberFormat("en-US").format(value);
    }
  })();

  // Determine change color and arrow
  const changeColor =
    changePercent === null || changePercent === undefined
      ? "text-text-muted"
      : changePercent >= 0
        ? "text-success"
        : "text-danger";

  const changeArrow =
    changePercent === null || changePercent === undefined
      ? ""
      : changePercent >= 0
        ? "↑"
        : "↓";

  return (
    <div
      className={`bg-bg-card border border-border rounded-lg p-6 ${className}`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold text-text-primary">{formattedValue}</p>
        {changePercent !== null && changePercent !== undefined && (
          <div
            className={`text-sm font-medium ${changeColor} flex items-center gap-1`}
          >
            <span>{changeArrow}</span>
            <span>{Math.abs(changePercent).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
});
