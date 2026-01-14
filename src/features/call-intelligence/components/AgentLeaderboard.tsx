/**
 * AgentLeaderboard - Sortable table showing agent rankings
 * Displays agent performance metrics with sortable columns,
 * medal icons for top 3, and trend indicators
 */

import { memo, useState, useMemo, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Skeleton, SkeletonAvatar } from "@/components/ui/Skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import type { AgentPerformance } from "../types.ts";

// Medal icons for top 3 rankings
const RANK_MEDALS: Record<number, { icon: string; bgClass: string; textClass: string }> = {
  1: { icon: "🥇", bgClass: "bg-yellow-100", textClass: "text-yellow-700" },
  2: { icon: "🥈", bgClass: "bg-gray-100", textClass: "text-gray-600" },
  3: { icon: "🥉", bgClass: "bg-orange-100", textClass: "text-orange-700" },
};

// Sort configuration
type SortField = "rank" | "agent_name" | "avg_quality_score" | "avg_sentiment_score" | "total_calls" | "quality_trend";
type SortDirection = "asc" | "desc";

interface AgentLeaderboardProps {
  agents: AgentPerformance[];
  isLoading: boolean;
  onAgentClick?: (agentId: string) => void;
}

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

/**
 * Column header with sort functionality
 */
function SortableHeader({
  label,
  field,
  currentSort,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  currentSort: SortConfig;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = currentSort.field === field;

  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer select-none hover:bg-bg-muted/50 transition-colors",
        className
      )}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <span className="flex flex-col">
          <ChevronUp
            className={cn(
              "h-3 w-3 -mb-1",
              isActive && currentSort.direction === "asc"
                ? "text-primary"
                : "text-text-muted"
            )}
          />
          <ChevronDown
            className={cn(
              "h-3 w-3",
              isActive && currentSort.direction === "desc"
                ? "text-primary"
                : "text-text-muted"
            )}
          />
        </span>
      </div>
    </th>
  );
}

/**
 * Progress bar for quality score
 */
function QualityProgressBar({ value }: { value: number }) {
  const percentage = Math.min(Math.max(value ?? 0, 0), 100);

  // Color based on score
  const getColorClass = () => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-bg-muted rounded-full overflow-hidden min-w-[60px]">
        <div
          className={cn("h-full rounded-full transition-all duration-300", getColorClass())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-text-primary w-8 text-right">
        {percentage.toFixed(0)}
      </span>
    </div>
  );
}

/**
 * Sentiment badge with appropriate coloring
 */
function SentimentBadge({ score }: { score: number }) {
  // Score ranges from -100 to 100
  let variant: "success" | "warning" | "danger" | "default";
  let label: string;

  if (score >= 30) {
    variant = "success";
    label = "Positive";
  } else if (score >= -30) {
    variant = "warning";
    label = "Neutral";
  } else {
    variant = "danger";
    label = "Negative";
  }

  return (
    <Badge variant={variant} size="sm">
      {label}
    </Badge>
  );
}

/**
 * Trend indicator with arrow and percentage
 */
function TrendIndicator({
  trend,
  percentage,
}: {
  trend: "up" | "down" | "neutral";
  percentage: number;
}) {
  const absPercentage = Math.abs(percentage ?? 0);

  if (trend === "up") {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <TrendingUp className="h-4 w-4" />
        <span className="text-sm font-medium">+{absPercentage.toFixed(1)}%</span>
      </div>
    );
  }

  if (trend === "down") {
    return (
      <div className="flex items-center gap-1 text-red-600">
        <TrendingDown className="h-4 w-4" />
        <span className="text-sm font-medium">-{absPercentage.toFixed(1)}%</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-gray-500">
      <Minus className="h-4 w-4" />
      <span className="text-sm font-medium">0.0%</span>
    </div>
  );
}

/**
 * Agent avatar with fallback initials
 */
function AgentAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string;
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
      {initials}
    </div>
  );
}

/**
 * Rank display with medal for top 3
 */
function RankDisplay({ rank }: { rank: number }) {
  const medal = RANK_MEDALS[rank];

  if (medal) {
    return (
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-lg",
          medal.bgClass
        )}
      >
        {medal.icon}
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-bg-muted flex items-center justify-center text-sm font-medium text-text-secondary">
      {rank}
    </div>
  );
}

/**
 * Loading skeleton for a single table row
 */
function LeaderboardRowSkeleton() {
  return (
    <tr className="border-b border-border">
      <td className="px-4 py-3">
        <Skeleton variant="circular" className="h-8 w-8" />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <SkeletonAvatar size="sm" />
          <Skeleton variant="text" className="h-4 w-24" />
        </div>
      </td>
      <td className="px-4 py-3">
        <Skeleton variant="rounded" className="h-2 w-20" />
      </td>
      <td className="px-4 py-3">
        <Skeleton variant="rounded" className="h-5 w-16" />
      </td>
      <td className="px-4 py-3">
        <Skeleton variant="text" className="h-4 w-12" />
      </td>
      <td className="px-4 py-3">
        <Skeleton variant="text" className="h-4 w-16" />
      </td>
    </tr>
  );
}

/**
 * Loading state with 5 skeleton rows
 */
function LeaderboardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Leaderboard</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider w-16">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Quality Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Sentiment
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Calls
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <LeaderboardRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main AgentLeaderboard component
 */
export const AgentLeaderboard = memo(function AgentLeaderboard({
  agents,
  isLoading,
  onAgentClick,
}: AgentLeaderboardProps) {
  // Default sort: quality score descending
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "avg_quality_score",
    direction: "desc",
  });

  // Handle column header click for sorting
  const handleSort = useCallback((field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "desc" ? "asc" : "desc",
    }));
  }, []);

  // Sort agents based on current configuration
  const sortedAgents = useMemo(() => {
    if (!agents || agents.length === 0) return [];

    const sorted = [...agents].sort((a, b) => {
      let comparison = 0;

      switch (sortConfig.field) {
        case "rank":
          comparison = a.rank - b.rank;
          break;
        case "agent_name":
          comparison = a.agent_name.localeCompare(b.agent_name);
          break;
        case "avg_quality_score":
          comparison = a.avg_quality_score - b.avg_quality_score;
          break;
        case "avg_sentiment_score":
          comparison = a.avg_sentiment_score - b.avg_sentiment_score;
          break;
        case "total_calls":
          comparison = a.total_calls - b.total_calls;
          break;
        case "quality_trend":
          comparison = a.trend_percentage - b.trend_percentage;
          break;
        default:
          comparison = 0;
      }

      return sortConfig.direction === "desc" ? -comparison : comparison;
    });

    return sorted;
  }, [agents, sortConfig]);

  // Loading state
  if (isLoading) {
    return <LeaderboardSkeleton />;
  }

  // Empty state
  if (!agents || agents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agent Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-text-muted">
            <span className="text-4xl block mb-3">👥</span>
            <p className="text-sm">No agent performance data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Leaderboard</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-bg-muted/50">
                <SortableHeader
                  label="#"
                  field="rank"
                  currentSort={sortConfig}
                  onSort={handleSort}
                  className="w-16"
                />
                <SortableHeader
                  label="Agent"
                  field="agent_name"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Quality Score"
                  field="avg_quality_score"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Sentiment"
                  field="avg_sentiment_score"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Calls"
                  field="total_calls"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Trend"
                  field="quality_trend"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
              </tr>
            </thead>
            <tbody>
              {sortedAgents.map((agent) => {
                // Determine if this is a top 3 agent (based on original rank)
                const isTopThree = agent.rank <= 3;
                const medal = RANK_MEDALS[agent.rank];

                return (
                  <tr
                    key={agent.agent_id}
                    className={cn(
                      "border-b border-border transition-colors cursor-pointer",
                      "hover:bg-bg-muted/50",
                      isTopThree && medal && `${medal.bgClass}/30`
                    )}
                    onClick={() => onAgentClick?.(agent.agent_id)}
                    data-testid={`agent-row-${agent.agent_id}`}
                  >
                    {/* Rank */}
                    <td className="px-4 py-3">
                      <RankDisplay rank={agent.rank} />
                    </td>

                    {/* Agent Name + Avatar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <AgentAvatar
                          name={agent.agent_name}
                          avatarUrl={agent.avatar_url}
                        />
                        <div>
                          <p className="font-medium text-text-primary">
                            {agent.agent_name}
                          </p>
                          {agent.rank_change !== 0 && (
                            <p
                              className={cn(
                                "text-xs",
                                agent.rank_change > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              )}
                            >
                              {agent.rank_change > 0 ? "+" : ""}
                              {agent.rank_change} from last period
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Quality Score with Progress Bar */}
                    <td className="px-4 py-3">
                      <QualityProgressBar value={agent.avg_quality_score} />
                    </td>

                    {/* Sentiment Badge */}
                    <td className="px-4 py-3">
                      <SentimentBadge score={agent.avg_sentiment_score} />
                    </td>

                    {/* Call Count */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-text-primary">
                        {agent.total_calls.toLocaleString()}
                      </span>
                    </td>

                    {/* Trend Indicator */}
                    <td className="px-4 py-3">
                      <TrendIndicator
                        trend={agent.quality_trend}
                        percentage={agent.trend_percentage}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
});

export default AgentLeaderboard;
