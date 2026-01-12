/**
 * Customer Health Overview Component
 *
 * Dashboard overview showing health score distribution and key metrics.
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils.ts";
import { HealthScoreGauge } from "./HealthScoreGauge.tsx";
import type { HealthStatus } from "@/api/types/customerSuccess.ts";

interface HealthDistribution {
  healthy: number;
  at_risk: number;
  critical: number;
  churned: number;
}

interface CustomerHealthOverviewProps {
  distribution: HealthDistribution;
  totalCustomers: number;
  averageScore: number;
  scoreChange?: number;
  className?: string;
}

const STATUS_CONFIG: Record<
  HealthStatus,
  { label: string; color: string; bgColor: string }
> = {
  healthy: { label: "Healthy", color: "text-success", bgColor: "bg-success" },
  at_risk: { label: "At Risk", color: "text-warning", bgColor: "bg-warning" },
  critical: { label: "Critical", color: "text-danger", bgColor: "bg-danger" },
  churned: {
    label: "Churned",
    color: "text-text-muted",
    bgColor: "bg-text-muted",
  },
};

function DistributionBar({
  distribution,
  total,
}: {
  distribution: HealthDistribution;
  total: number;
}) {
  const segments = useMemo(() => {
    if (total === 0) return [];
    return [
      { status: "healthy" as const, count: distribution.healthy },
      { status: "at_risk" as const, count: distribution.at_risk },
      { status: "critical" as const, count: distribution.critical },
      { status: "churned" as const, count: distribution.churned },
    ].filter((s) => s.count > 0);
  }, [distribution, total]);

  if (total === 0) {
    return (
      <div className="h-4 bg-bg-tertiary rounded-full overflow-hidden">
        <div className="h-full w-full bg-bg-tertiary" />
      </div>
    );
  }

  return (
    <div className="h-4 bg-bg-tertiary rounded-full overflow-hidden flex">
      {segments.map(({ status, count }) => (
        <div
          key={status}
          className={cn(
            "h-full transition-all duration-500",
            STATUS_CONFIG[status].bgColor,
          )}
          style={{ width: `${(count / total) * 100}%` }}
        />
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  change,
  color,
}: {
  label: string;
  value: number;
  change?: number;
  color?: string;
}) {
  return (
    <div className="bg-bg-tertiary rounded-lg p-3">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <span
          className={cn("text-2xl font-bold", color || "text-text-primary")}
        >
          {value}
        </span>
        {change !== undefined && (
          <span
            className={cn(
              "text-sm font-medium mb-0.5",
              change > 0
                ? "text-success"
                : change < 0
                  ? "text-danger"
                  : "text-text-muted",
            )}
          >
            {change > 0 ? "+" : ""}
            {change}%
          </span>
        )}
      </div>
    </div>
  );
}

export function CustomerHealthOverview({
  distribution,
  totalCustomers,
  averageScore,
  scoreChange,
  className,
}: CustomerHealthOverviewProps) {
  const percentages = useMemo(() => {
    if (totalCustomers === 0) {
      return { healthy: 0, at_risk: 0, critical: 0, churned: 0 };
    }
    return {
      healthy: Math.round((distribution.healthy / totalCustomers) * 100),
      at_risk: Math.round((distribution.at_risk / totalCustomers) * 100),
      critical: Math.round((distribution.critical / totalCustomers) * 100),
      churned: Math.round((distribution.churned / totalCustomers) * 100),
    };
  }, [distribution, totalCustomers]);

  return (
    <div
      className={cn(
        "bg-bg-secondary rounded-lg border border-border p-6",
        className,
      )}
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">
            Customer Health Overview
          </h2>
          <p className="text-sm text-text-muted mt-1">
            {totalCustomers} total customers
          </p>
        </div>
        <HealthScoreGauge score={averageScore} size="lg" showLabel={true} />
      </div>

      {/* Distribution Bar */}
      <div className="mb-6">
        <DistributionBar distribution={distribution} total={totalCustomers} />
      </div>

      {/* Distribution Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {(Object.keys(STATUS_CONFIG) as HealthStatus[]).map((status) => (
          <div key={status} className="flex items-center gap-2">
            <div
              className={cn(
                "w-3 h-3 rounded-full",
                STATUS_CONFIG[status].bgColor,
              )}
            />
            <div>
              <p
                className={cn(
                  "text-sm font-medium",
                  STATUS_CONFIG[status].color,
                )}
              >
                {distribution[status]}
              </p>
              <p className="text-xs text-text-muted">
                {STATUS_CONFIG[status].label} ({percentages[status]}%)
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Average Score"
          value={averageScore}
          change={scoreChange}
        />
        <StatCard
          label="Healthy"
          value={distribution.healthy}
          color="text-success"
        />
        <StatCard
          label="At Risk"
          value={distribution.at_risk}
          color="text-warning"
        />
        <StatCard
          label="Critical"
          value={distribution.critical}
          color="text-danger"
        />
      </div>
    </div>
  );
}
