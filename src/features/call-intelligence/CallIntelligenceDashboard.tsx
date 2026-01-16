/**
 * Call Intelligence Dashboard
 * Main page component that assembles all call analytics components
 *
 * Layout:
 * +------------------------------------------------------------------+
 * | HEADER: Call Intelligence Dashboard    [Filters] [Export] [Refresh]
 * +------------------------------------------------------------------+
 * | KPI CARDS ROW (6 cards)                                          |
 * +------------------------------------------------------------------+
 * | SENTIMENT TREND (50%)  |  QUALITY HEATMAP (50%)                  |
 * +------------------------------------------------------------------+
 * | DISPOSITION DONUT (33%) | ESCALATION GAUGE (33%) | COACHING (33%)|
 * +------------------------------------------------------------------+
 * | AGENT LEADERBOARD (40%)  |  RECENT CALLS TABLE (60%)             |
 * +------------------------------------------------------------------+
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

// Import components
import { KPICards } from "./components/KPICards";
import { SentimentTrendChart } from "./components/SentimentTrendChart";
import { QualityHeatmap } from "./components/QualityHeatmap";
import { DispositionDonut } from "./components/DispositionDonut";
import { EscalationGauge } from "./components/EscalationGauge";
import { KPIDetailModal } from "./components/KPIDetailModal";
import { CallDetailModal } from "./components/CallDetailModal";

// Import hooks
import {
  useCallAnalytics,
  useCallsWithAnalysis,
  useAgentPerformance,
  useDispositionStats,
  useQualityHeatmap,
  useCoachingInsights,
  callIntelligenceKeys,
} from "./api";

// Import types
import type {
  DashboardFilters,
  CallWithAnalysis,
  AgentPerformance,
  EscalationRisk,
  CoachingInsights,
  TrainingRecommendation,
} from "./types";

// Helper to check if error is expected (404 or 500 from unimplemented endpoints)
function is404or500(error: unknown): boolean {
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as { response?: { status?: number } };
    const status = axiosError.response?.status;
    return status === 404 || status === 500;
  }
  return false;
}

// ============================================================================
// DASHBOARD FILTERS COMPONENT
// ============================================================================

interface DashboardFiltersProps {
  filters: Partial<DashboardFilters>;
  onFiltersChange: (filters: Partial<DashboardFilters>) => void;
  isOpen: boolean;
}

function DashboardFiltersPanel({
  filters,
  onFiltersChange,
  isOpen,
}: DashboardFiltersProps) {
  const handleDateRangeChange = useCallback(
    (range: "today" | "week" | "month" | "custom") => {
      const now = new Date();
      const endDate = new Date(now); // Don't mutate 'now'
      let startDate: Date;

      switch (range) {
        case "today":
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          return;
      }

      onFiltersChange({
        ...filters,
        dateRange: {
          start: startDate.toISOString().split("T")[0],
          end: endDate.toISOString().split("T")[0],
        },
      });
    },
    [filters, onFiltersChange]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date Range Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-secondary">
              Date Range:
            </span>
            <div className="flex gap-1">
              {(["today", "week", "month"] as const).map((range) => (
                <Button
                  key={range}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDateRangeChange(range)}
                  className={cn(
                    "capitalize",
                    filters.dateRange && "bg-bg-muted"
                  )}
                >
                  {range === "week" ? "Last 7 Days" : range === "month" ? "Last 30 Days" : "Today"}
                </Button>
              ))}
            </div>
          </div>

          {/* Sentiment Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-secondary">
              Sentiment:
            </span>
            <select
              className="h-8 px-3 text-sm rounded-md border border-border bg-bg-card"
              value={filters.sentiment?.[0] || "all"}
              onChange={(e) => {
                const value = e.target.value;
                onFiltersChange({
                  ...filters,
                  sentiment: value === "all" ? [] : [value as "positive" | "neutral" | "negative"],
                });
              }}
            >
              <option value="all">All</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>

          {/* Escalation Risk Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-secondary">
              Escalation Risk:
            </span>
            <select
              className="h-8 px-3 text-sm rounded-md border border-border bg-bg-card"
              value={filters.escalationRisk?.[0] || "all"}
              onChange={(e) => {
                const value = e.target.value;
                onFiltersChange({
                  ...filters,
                  escalationRisk: value === "all" ? [] : [value as EscalationRisk],
                });
              }}
            >
              <option value="all">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Clear Filters */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange({})}
            className="ml-auto"
          >
            Clear Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// AGENT LEADERBOARD COMPONENT
// ============================================================================

interface AgentLeaderboardProps {
  agents: AgentPerformance[];
  isLoading: boolean;
  onAgentClick?: (agentId: string) => void;
}

function AgentLeaderboard({
  agents,
  isLoading,
  onAgentClick,
}: AgentLeaderboardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agent Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-bg-muted">
                <Skeleton variant="circular" className="w-10 h-10" />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="text" className="h-4 w-32" />
                  <Skeleton variant="text" className="h-3 w-24" />
                </div>
                <Skeleton variant="text" className="h-6 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (agents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agent Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-text-secondary">
            No agent performance data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by quality score descending
  const sortedAgents = [...agents].sort(
    (a, b) => b.avg_quality_score - a.avg_quality_score
  );

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return "bg-yellow-100 text-yellow-700";
    if (rank === 2) return "bg-gray-100 text-gray-700";
    if (rank === 3) return "bg-orange-100 text-orange-700";
    return "bg-bg-muted text-text-secondary";
  };

  const getTrendIcon = (trend: "up" | "down" | "neutral") => {
    if (trend === "up") return <span className="text-green-500">&#9650;</span>;
    if (trend === "down") return <span className="text-red-500">&#9660;</span>;
    return <span className="text-gray-400">&#8226;</span>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedAgents.slice(0, 10).map((agent, index) => (
            <button
              key={agent.agent_id}
              type="button"
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-bg-muted transition-colors cursor-pointer text-left"
              onClick={() => onAgentClick?.(agent.agent_id)}
            >
              {/* Rank badge */}
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                  getRankBadgeClass(index + 1)
                )}
              >
                {index + 1}
              </div>

              {/* Agent avatar/initials */}
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                {agent.agent_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>

              {/* Agent info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary truncate">
                  {agent.agent_name}
                </p>
                <p className="text-sm text-text-secondary">
                  {agent.total_calls} calls
                </p>
              </div>

              {/* Quality score */}
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-text-primary">
                    {(agent.avg_quality_score ?? 0).toFixed(0)}
                  </span>
                  {getTrendIcon(agent.quality_trend)}
                </div>
                <p className="text-xs text-text-secondary">Quality Score</p>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COACHING INSIGHTS PANEL COMPONENT
// ============================================================================

interface CoachingInsightsPanelProps {
  insights: CoachingInsights | undefined;
  isLoading: boolean;
  onInsightClick?: (insight: string) => void;
}

function CoachingInsightsPanel({
  insights,
  isLoading,
  onInsightClick,
}: CoachingInsightsPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Coaching Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton variant="text" className="h-4 w-32" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" className="h-8 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Coaching Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-text-secondary">
            No coaching insights available
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPriorityBadge = (priority: TrainingRecommendation["priority"]) => {
    const classes = {
      high: "bg-red-100 text-red-700",
      medium: "bg-yellow-100 text-yellow-700",
      low: "bg-green-100 text-green-700",
    };
    return classes[priority];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coaching Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Top Strengths */}
          <div>
            <h4 className="text-sm font-semibold text-text-secondary mb-2">
              Team Strengths
            </h4>
            <div className="flex flex-wrap gap-2">
              {(insights?.top_strengths ?? []).slice(0, 3).map((strength) => (
                <span
                  key={strength.name}
                  className="px-2 py-1 bg-green-50 text-green-700 text-sm rounded-full"
                >
                  {strength.name}
                </span>
              ))}
            </div>
          </div>

          {/* Areas for Improvement */}
          <div>
            <h4 className="text-sm font-semibold text-text-secondary mb-2">
              Focus Areas
            </h4>
            <div className="flex flex-wrap gap-2">
              {(insights?.top_improvements ?? []).slice(0, 3).map((improvement) => (
                <span
                  key={improvement.name}
                  className="px-2 py-1 bg-amber-50 text-amber-700 text-sm rounded-full"
                >
                  {improvement.name}
                </span>
              ))}
            </div>
          </div>

          {/* Recommended Training */}
          {(insights?.recommended_training ?? []).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-text-secondary mb-2">
                Recommended Training
              </h4>
              <div className="space-y-2">
                {(insights?.recommended_training ?? []).slice(0, 3).map((training) => (
                  <button
                    key={training.module}
                    type="button"
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-bg-muted hover:bg-bg-hover transition-colors text-left"
                    onClick={() => onInsightClick?.(training.module)}
                  >
                    <span className="text-sm text-text-primary">
                      {training.module}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary">
                        {training.agents_affected} agents
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 text-xs rounded",
                          getPriorityBadge(training.priority)
                        )}
                      >
                        {training.priority}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// RECENT CALLS TABLE COMPONENT
// ============================================================================

interface RecentCallsTableProps {
  calls: CallWithAnalysis[];
  isLoading: boolean;
  onCallClick?: (callId: string) => void;
}

function RecentCallsTable({
  calls,
  isLoading,
  onCallClick,
}: RecentCallsTableProps) {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-600";
      case "negative":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getRiskBadgeClass = (risk: string) => {
    switch (risk) {
      case "low":
        return "bg-green-100 text-green-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "high":
        return "bg-orange-100 text-orange-700";
      case "critical":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 rounded-lg bg-bg-muted"
              >
                <Skeleton variant="text" className="h-4 w-20" />
                <Skeleton variant="text" className="h-4 w-32 flex-1" />
                <Skeleton variant="text" className="h-4 w-16" />
                <Skeleton variant="rounded" className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (calls.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-text-secondary">
            No recent calls available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Calls</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 font-medium text-text-secondary">
                  Time
                </th>
                <th className="text-left py-3 px-2 font-medium text-text-secondary">
                  Customer
                </th>
                <th className="text-left py-3 px-2 font-medium text-text-secondary">
                  Agent
                </th>
                <th className="text-left py-3 px-2 font-medium text-text-secondary">
                  Duration
                </th>
                <th className="text-center py-3 px-2 font-medium text-text-secondary" title="Recording Available">
                  <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </th>
                <th className="text-left py-3 px-2 font-medium text-text-secondary">
                  Sentiment
                </th>
                <th className="text-left py-3 px-2 font-medium text-text-secondary">
                  Quality
                </th>
                <th className="text-left py-3 px-2 font-medium text-text-secondary">
                  Risk
                </th>
                <th className="text-left py-3 px-2 font-medium text-text-secondary">
                  Disposition
                </th>
              </tr>
            </thead>
            <tbody>
              {calls.slice(0, 10).map((call) => (
                <tr
                  key={call.id}
                  className="border-b border-border hover:bg-bg-muted cursor-pointer transition-colors"
                  onClick={() => onCallClick?.(call.id)}
                >
                  <td className="py-3 px-2 text-text-secondary">
                    {formatTime(call.start_time)}
                  </td>
                  <td className="py-3 px-2">
                    <span className="font-medium text-text-primary">
                      {call.customer_name || call.from_number}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-text-secondary">
                    {call.agent_name || "Unknown"}
                  </td>
                  <td className="py-3 px-2 text-text-secondary">
                    {formatDuration(call.duration_seconds)}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {(call.has_recording || call.recording_url) && (
                      <span title="Recording available">
                        <svg className="w-4 h-4 mx-auto text-green-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.06 7.44-7 7.93V20h4v2H8v-2h4v-4.07z" />
                        </svg>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    <span className={cn("font-medium", getSentimentColor(call.sentiment))}>
                      {call.sentiment}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="font-medium text-text-primary">
                      {(call.quality_score ?? 0).toFixed(0)}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span
                      className={cn(
                        "px-2 py-0.5 text-xs rounded capitalize",
                        getRiskBadgeClass(call.escalation_risk)
                      )}
                    >
                      {call.escalation_risk}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-text-secondary">
                    {call.disposition || "-"}
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

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export function CallIntelligenceDashboard() {
  const queryClient = useQueryClient();

  // Filter state
  const [filters, setFilters] = useState<Partial<DashboardFilters>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showRecordingsOnly, setShowRecordingsOnly] = useState(true); // Default to RingCentral calls with recordings

  // Modal state
  const [selectedCall, setSelectedCall] = useState<CallWithAnalysis | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // KPI Detail Modal state
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
  const [isKPIModalOpen, setIsKPIModalOpen] = useState(false);

  // Fetch data using hooks
  const analyticsQuery = useCallAnalytics();
  const callsQuery = useCallsWithAnalysis({
    page: 1,
    page_size: 100, // Increased to show more calls in KPI detail modal
    hasRecording: showRecordingsOnly ? true : undefined,
    ...filters,
  });
  const agentPerformanceQuery = useAgentPerformance();
  const dispositionStatsQuery = useDispositionStats();
  const qualityHeatmapQuery = useQualityHeatmap(14);
  const coachingInsightsQuery = useCoachingInsights();

  // Extract data from queries with robust error handling
  const metrics = analyticsQuery.data?.metrics;
  const calls = Array.isArray(callsQuery.data?.items) ? callsQuery.data.items : [];
  const totalCallsInQuery = callsQuery.data?.total || 0;
  const agents = Array.isArray(agentPerformanceQuery.data?.agents) ? agentPerformanceQuery.data.agents : [];
  const dispositions = Array.isArray(dispositionStatsQuery.data?.dispositions) ? dispositionStatsQuery.data.dispositions : [];
  const totalDispositionCalls = dispositionStatsQuery.data?.total_calls || 0;
  const heatmapData = Array.isArray(qualityHeatmapQuery.data?.data) ? qualityHeatmapQuery.data.data : [];
  const coachingInsights = coachingInsightsQuery.data?.insights;

  // Auto-refresh dashboard every 60 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: callIntelligenceKeys.all });
    }, 60_000); // 60 seconds

    return () => clearInterval(interval);
  }, [queryClient]);

  // Calculate escalation risk data from metrics
  const escalationData = useMemo(() => {
    if (!metrics) {
      return {
        riskScore: 0,
        riskCounts: { low: 0, medium: 0, high: 0, critical: 0 },
      };
    }

    // Calculate overall risk score based on escalation rate and critical calls
    const riskScore = Math.min(
      100,
      metrics.escalation_rate + (metrics.critical_risk_calls > 0 ? 20 : 0)
    );

    // Estimate risk distribution (this would come from the API in production)
    const totalCalls = metrics.total_calls || 1;
    const highRisk = metrics.high_risk_calls || 0;
    const criticalRisk = metrics.critical_risk_calls || 0;
    const mediumRisk = Math.floor(
      totalCalls * (metrics.escalation_rate / 100) - highRisk - criticalRisk
    );
    const lowRisk = totalCalls - highRisk - criticalRisk - Math.max(0, mediumRisk);

    return {
      riskScore,
      riskCounts: {
        low: Math.max(0, lowRisk),
        medium: Math.max(0, mediumRisk),
        high: highRisk,
        critical: criticalRisk,
      },
    };
  }, [metrics]);

  // Refresh all data
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: callIntelligenceKeys.all });
  }, [queryClient]);

  // Export data as CSV
  const handleExport = useCallback(() => {
    if (!calls.length) return;

    const headers = [
      "Time",
      "Customer",
      "Agent",
      "Duration",
      "Sentiment",
      "Quality Score",
      "Escalation Risk",
      "Disposition",
    ];

    const rows = calls.map((call) => [
      call.start_time,
      call.customer_name || call.from_number,
      call.agent_name || "Unknown",
      call.duration_seconds,
      call.sentiment,
      (call.quality_score ?? 0).toFixed(0),
      call.escalation_risk,
      call.disposition || "",
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n"
    );

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `call-intelligence-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [calls]);

  // Handle call click
  const handleCallClick = useCallback((callId: string) => {
    const call = calls.find((c) => c.id === callId);
    if (call) {
      setSelectedCall(call);
      setIsModalOpen(true);
    }
  }, [calls]);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedCall(null);
  }, []);

  // Handle KPI card click - open detail modal
  const handleKPIClick = useCallback((metricId: string) => {
    console.log("KPI clicked:", metricId);
    setSelectedKPI(metricId);
    setIsKPIModalOpen(true);
  }, []);

  // Handle KPI modal close
  const handleKPIModalClose = useCallback(() => {
    setIsKPIModalOpen(false);
    setSelectedKPI(null);
  }, []);

  // Handle sentiment chart point click
  const handleSentimentClick = useCallback((date: string) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: { start: date, end: date },
    }));
  }, []);

  // Handle quality heatmap cell click
  const handleHeatmapClick = useCallback((agentId: string, date: string) => {
    console.log("Heatmap cell clicked:", agentId, date);
    setFilters((prev) => ({
      ...prev,
      agents: [agentId],
      dateRange: { start: date, end: date },
    }));
  }, []);

  // Handle disposition slice click
  const handleDispositionClick = useCallback((dispositionId: string) => {
    setFilters((prev) => ({
      ...prev,
      dispositions: [dispositionId],
    }));
  }, []);

  // Handle escalation risk click
  const handleEscalationClick = useCallback((risk: EscalationRisk) => {
    setFilters((prev) => ({
      ...prev,
      escalationRisk: [risk],
    }));
  }, []);

  // Handle agent click
  const handleAgentClick = useCallback((agentId: string) => {
    setFilters((prev) => ({
      ...prev,
      agents: [agentId],
    }));
  }, []);

  // Check if any query is loading
  const isAnyLoading =
    analyticsQuery.isLoading ||
    callsQuery.isLoading ||
    agentPerformanceQuery.isLoading ||
    dispositionStatsQuery.isLoading ||
    qualityHeatmapQuery.isLoading ||
    coachingInsightsQuery.isLoading;

  // Note: With withFallback, queries gracefully return default data on 404/500
  // so hasError will be false for expected missing endpoints.
  // We only show errors for truly unexpected failures (non-404/500 errors)
  const hasUnexpectedError =
    (analyticsQuery.isError && !is404or500(analyticsQuery.error)) ||
    (callsQuery.isError && !is404or500(callsQuery.error)) ||
    (agentPerformanceQuery.isError && !is404or500(agentPerformanceQuery.error)) ||
    (dispositionStatsQuery.isError && !is404or500(dispositionStatsQuery.error)) ||
    (qualityHeatmapQuery.isError && !is404or500(qualityHeatmapQuery.error)) ||
    (coachingInsightsQuery.isError && !is404or500(coachingInsightsQuery.error));

  return (
    <div className="min-h-screen bg-bg-page">
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Call Intelligence Dashboard
            </h1>
            <p className="text-text-secondary mt-1">
              AI-powered call analytics and insights
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Recording Filter Toggle */}
            <Button
              variant={showRecordingsOnly ? "primary" : "ghost"}
              size="sm"
              onClick={() => setShowRecordingsOnly((prev) => !prev)}
              title={showRecordingsOnly ? "Showing RingCentral calls with recordings" : "Showing all calls"}
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              {showRecordingsOnly ? "With Recordings" : "All Calls"}
              {totalCallsInQuery > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-white/20">
                  {totalCallsInQuery}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters((prev) => !prev)}
              className={cn(showFilters && "bg-bg-muted")}
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filters
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              disabled={!calls.length}
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRefresh}
              disabled={isAnyLoading}
            >
              <svg
                className={cn(
                  "w-4 h-4 mr-2",
                  isAnyLoading && "animate-spin"
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </Button>
          </div>
        </header>

        {/* Error Alert - Only shows for unexpected errors, not missing endpoints */}
        {hasUnexpectedError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium">
                Some data failed to load. Please try refreshing.
              </span>
            </div>
          </div>
        )}

        {/* Filters Panel */}
        <DashboardFiltersPanel
          filters={filters}
          onFiltersChange={setFilters}
          isOpen={showFilters}
        />

        {/* KPI Cards Row */}
        <section className="mb-6">
          <KPICards
            metrics={metrics}
            isLoading={analyticsQuery.isLoading}
            onCardClick={handleKPIClick}
          />
        </section>

        {/* Sentiment Trend & Quality Heatmap Row */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <SentimentTrendChart
            data={metrics?.sentiment_trend || []}
            isLoading={analyticsQuery.isLoading}
            onPointClick={handleSentimentClick}
          />
          <QualityHeatmap
            data={heatmapData}
            isLoading={qualityHeatmapQuery.isLoading}
            onCellClick={handleHeatmapClick}
          />
        </section>

        {/* Disposition, Escalation, Coaching Row */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <DispositionDonut
            data={dispositions}
            totalCalls={totalDispositionCalls}
            isLoading={dispositionStatsQuery.isLoading}
            onSliceClick={handleDispositionClick}
          />
          <EscalationGauge
            riskScore={escalationData.riskScore}
            riskCounts={escalationData.riskCounts}
            isLoading={analyticsQuery.isLoading}
            onRiskClick={handleEscalationClick}
          />
          <CoachingInsightsPanel
            insights={coachingInsights}
            isLoading={coachingInsightsQuery.isLoading}
          />
        </section>

        {/* Agent Leaderboard & Recent Calls Row */}
        <section id="recent-calls-section" className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <AgentLeaderboard
              agents={agents}
              isLoading={agentPerformanceQuery.isLoading}
              onAgentClick={handleAgentClick}
            />
          </div>
          <div className="lg:col-span-3">
            <RecentCallsTable
              calls={calls}
              isLoading={callsQuery.isLoading}
              onCallClick={handleCallClick}
            />
          </div>
        </section>

        {/* Call Detail Modal */}
        <CallDetailModal
          call={selectedCall}
          isOpen={isModalOpen}
          onClose={handleModalClose}
        />

        {/* KPI Detail Modal */}
        <KPIDetailModal
          isOpen={isKPIModalOpen}
          onClose={handleKPIModalClose}
          metricId={selectedKPI}
          metrics={metrics}
          calls={calls}
          isLoading={callsQuery.isLoading}
        />
      </div>
    </div>
  );
}

export default CallIntelligenceDashboard;
