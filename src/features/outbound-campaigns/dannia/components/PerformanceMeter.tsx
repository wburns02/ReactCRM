import { PERF_THRESHOLDS } from "../constants";

interface PerformanceMeterProps {
  connectRate: number;
  label?: string;
}

export function PerformanceMeter({ connectRate, label }: PerformanceMeterProps) {
  const percentage = Math.min(100, Math.max(0, connectRate));
  const status =
    connectRate >= PERF_THRESHOLDS.good
      ? "good"
      : connectRate >= PERF_THRESHOLDS.warning
        ? "warning"
        : "critical";

  const colors = {
    good: {
      bar: "bg-emerald-500",
      bg: "bg-emerald-100 dark:bg-emerald-950/30",
      text: "text-emerald-700 dark:text-emerald-400",
      label: "Good",
    },
    warning: {
      bar: "bg-amber-500",
      bg: "bg-amber-100 dark:bg-amber-950/30",
      text: "text-amber-700 dark:text-amber-400",
      label: "Warning",
    },
    critical: {
      bar: "bg-red-500",
      bg: "bg-red-100 dark:bg-red-950/30",
      text: "text-red-700 dark:text-red-400",
      label: "Low",
    },
  };

  const c = colors[status];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span className="text-text-secondary font-medium">
          {label ?? "Connect Rate"}
        </span>
        <span className={`font-bold ${c.text}`}>
          {connectRate.toFixed(0)}%
          <span className="ml-1 font-normal opacity-70">({c.label})</span>
        </span>
      </div>
      <div className={`w-full h-2.5 rounded-full ${c.bg} overflow-hidden`}>
        <div
          className={`h-full rounded-full ${c.bar} transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
