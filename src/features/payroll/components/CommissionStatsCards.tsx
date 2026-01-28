import { Card, CardContent } from "@/components/ui/Card.tsx";
import type { CommissionStats } from "@/api/types/payroll.ts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CommissionStatsCardsProps {
  stats: CommissionStats | undefined;
  isLoading: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function TrendIndicator({
  value,
  suffix = "%",
}: {
  value: number;
  suffix?: string;
}) {
  if (value === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-text-muted">
        <Minus className="w-3 h-3" />
        No change
      </span>
    );
  }

  const isPositive = value > 0;
  return (
    <span
      className={`flex items-center gap-1 text-xs ${isPositive ? "text-success" : "text-danger"}`}
    >
      {isPositive ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {isPositive ? "+" : ""}
      {value.toFixed(1)}
      {suffix} vs last period
    </span>
  );
}

export function CommissionStatsCards({
  stats,
  isLoading,
}: CommissionStatsCardsProps) {
  const kpis = [
    {
      label: "Total Commissions",
      value: formatCurrency(stats?.total_commissions || 0),
      subValue: `${stats?.total_jobs || 0} jobs`,
      icon: "💰",
      color: "text-success",
      trend: stats?.comparison_to_last_period?.total_change_pct,
    },
    {
      label: "Pending Approval",
      value: formatCurrency(stats?.pending_amount || 0),
      subValue: `${stats?.pending_count || 0} commissions`,
      icon: "⏳",
      color: "text-warning",
    },
    {
      label: "Approved",
      value: formatCurrency(stats?.approved_amount || 0),
      subValue: `${stats?.approved_count || 0} commissions`,
      icon: "✅",
      color: "text-primary",
    },
    {
      label: "Average Per Job",
      value: formatCurrency(stats?.average_per_job || 0),
      icon: "📊",
      color: "text-info",
      trend: stats?.comparison_to_last_period?.average_change_pct,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <div className="animate-pulse">
                <div className="h-4 bg-bg-muted rounded w-24 mb-2"></div>
                <div className="h-8 bg-bg-muted rounded w-32 mb-1"></div>
                <div className="h-3 bg-bg-muted rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {kpis.map((kpi, index) => (
        <Card key={index}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{kpi.icon}</span>
              <span className="text-sm text-text-muted">{kpi.label}</span>
            </div>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            {kpi.subValue && (
              <p className="text-xs text-text-muted mt-1">{kpi.subValue}</p>
            )}
            {kpi.trend !== undefined && (
              <div className="mt-2">
                <TrendIndicator value={kpi.trend} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
