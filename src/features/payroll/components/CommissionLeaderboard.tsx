import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { useCommissionLeaderboard } from "@/api/hooks/usePayroll.ts";
import { TrendingUp, TrendingDown, Minus, Trophy, Users } from "lucide-react";

type SortField =
  | "rank"
  | "total_earned"
  | "jobs_completed"
  | "average_commission";

const RANK_MEDALS: Record<
  number,
  { icon: string; bgClass: string; textClass: string }
> = {
  1: { icon: "🥇", bgClass: "bg-yellow-100", textClass: "text-yellow-700" },
  2: { icon: "🥈", bgClass: "bg-gray-100", textClass: "text-gray-600" },
  3: { icon: "🥉", bgClass: "bg-orange-100", textClass: "text-orange-700" },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function TrendIndicator({
  trend,
  percentage,
}: {
  trend: "up" | "down" | "neutral";
  percentage: number;
}) {
  if (trend === "neutral") {
    return (
      <span className="flex items-center text-text-muted">
        <Minus className="w-3 h-3" />
      </span>
    );
  }

  return (
    <span
      className={`flex items-center gap-0.5 text-xs ${
        trend === "up" ? "text-success" : "text-danger"
      }`}
    >
      {trend === "up" ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {percentage.toFixed(0)}%
    </span>
  );
}

function RankDisplay({ rank }: { rank: number }) {
  const medal = RANK_MEDALS[rank];

  if (medal) {
    return (
      <div
        className={`w-8 h-8 rounded-full ${medal.bgClass} flex items-center justify-center`}
      >
        <span className="text-lg">{medal.icon}</span>
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-bg-muted flex items-center justify-center">
      <span className="text-sm font-medium text-text-muted">#{rank}</span>
    </div>
  );
}

function RankChange({ change }: { change: number }) {
  if (change === 0) {
    return <span className="text-xs text-text-muted">-</span>;
  }

  return (
    <span className={`text-xs ${change > 0 ? "text-success" : "text-danger"}`}>
      {change > 0 ? "+" : ""}
      {change}
    </span>
  );
}

export function CommissionLeaderboard() {
  const { data: entries, isLoading, error } = useCommissionLeaderboard();
  const [sortBy, setSortBy] = useState<SortField>("rank");

  const sortedEntries = [...(entries || [])].sort((a, b) => {
    switch (sortBy) {
      case "total_earned":
        return b.total_earned - a.total_earned;
      case "jobs_completed":
        return b.jobs_completed - a.jobs_completed;
      case "average_commission":
        return b.average_commission - a.average_commission;
      default:
        return a.rank - b.rank;
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            Top Earners
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex items-center gap-3 p-2"
              >
                <div className="w-8 h-8 rounded-full bg-bg-muted"></div>
                <div className="flex-1">
                  <div className="h-4 bg-bg-muted rounded w-32 mb-1"></div>
                  <div className="h-3 bg-bg-muted rounded w-20"></div>
                </div>
                <div className="h-5 bg-bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !entries || entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            Top Earners
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto mb-3 text-text-muted" />
            <p className="text-text-secondary">
              No commission data available yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            Top Earners This Period
          </CardTitle>
          <div className="flex gap-1">
            {[
              { field: "rank" as SortField, label: "Rank" },
              { field: "total_earned" as SortField, label: "Earned" },
              { field: "jobs_completed" as SortField, label: "Jobs" },
            ].map((opt) => (
              <Button
                key={opt.field}
                variant={sortBy === opt.field ? "primary" : "ghost"}
                size="sm"
                onClick={() => setSortBy(opt.field)}
                className="text-xs px-2 py-1"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-muted uppercase border-b border-border">
                <th className="pb-2">Rank</th>
                <th className="pb-2">Technician</th>
                <th className="pb-2 text-right">Jobs</th>
                <th className="pb-2 text-right">Total Earned</th>
                <th className="pb-2 text-right">Avg/Job</th>
                <th className="pb-2 text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedEntries.map((entry) => (
                <tr key={entry.technician_id} className="hover:bg-bg-muted/30">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <RankDisplay rank={entry.rank} />
                      <RankChange change={entry.rank_change} />
                    </div>
                  </td>
                  <td className="py-3">
                    <div>
                      <p className="font-medium text-text-primary">
                        {entry.technician_name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {(entry.commission_rate * 100).toFixed(0)}% rate
                      </p>
                    </div>
                  </td>
                  <td className="py-3 text-right text-text-primary">
                    {entry.jobs_completed}
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-bold text-success">
                      {formatCurrency(entry.total_earned)}
                    </span>
                  </td>
                  <td className="py-3 text-right text-text-secondary">
                    {formatCurrency(entry.average_commission)}
                  </td>
                  <td className="py-3 text-right">
                    <TrendIndicator
                      trend={entry.trend}
                      percentage={entry.trend_percentage}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
