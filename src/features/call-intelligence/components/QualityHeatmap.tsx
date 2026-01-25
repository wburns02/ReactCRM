/**
 * Quality Heatmap Component
 * Displays quality scores by agent over time in a heatmap grid
 */

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { QualityHeatmapData } from "../types";

interface QualityHeatmapProps {
  data: QualityHeatmapData[];
  isLoading: boolean;
  onCellClick?: (agentId: string, date: string) => void;
}

// Score color mapping based on quality ranges
function getScoreColor(score: number | null): string {
  if (score === null) return "bg-gray-100 dark:bg-gray-800";
  if (score < 40) return "bg-[#ef4444]"; // red/critical
  if (score < 55) return "bg-[#f97316]"; // orange/poor
  if (score < 70) return "bg-[#f59e0b]"; // amber/average
  if (score < 85) return "bg-[#22c55e]"; // green/good
  return "bg-[#10b981]"; // emerald/excellent
}

function getScoreTextColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  // Use white text for better contrast on colored backgrounds
  return "text-white";
}

function getScoreLabel(score: number): string {
  if (score < 40) return "Critical";
  if (score < 55) return "Poor";
  if (score < 70) return "Average";
  if (score < 85) return "Good";
  return "Excellent";
}

// Format date for display (e.g., "Mon 13")
function formatDayLabel(dateString: string): string {
  const date = new Date(dateString);
  const day = date.toLocaleDateString("en-US", { weekday: "short" });
  const dayNum = date.getDate();
  return `${day} ${dayNum}`;
}

// Loading skeleton component
function HeatmapSkeleton() {
  return (
    <div className="animate-pulse">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: "150px repeat(7, 1fr) 60px" }}
      >
        {/* Header row skeleton */}
        <div className="h-8" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        ))}
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />

        {/* Data rows skeleton */}
        {Array.from({ length: 5 }).map((_, row) => (
          <>
            <div
              key={`name-${row}`}
              className="h-10 bg-gray-200 dark:bg-gray-700 rounded"
            />
            {Array.from({ length: 7 }).map((_, col) => (
              <div
                key={`cell-${row}-${col}`}
                className="h-10 bg-gray-200 dark:bg-gray-700 rounded"
              />
            ))}
            <div
              key={`avg-${row}`}
              className="h-10 bg-gray-200 dark:bg-gray-700 rounded"
            />
          </>
        ))}
      </div>
    </div>
  );
}

// Tooltip component
interface TooltipProps {
  score: number;
  callCount: number;
  agentName: string;
  date: string;
  position: { x: number; y: number };
}

function Tooltip({
  score,
  callCount,
  agentName,
  date,
  position,
}: TooltipProps) {
  return (
    <div
      className="fixed z-50 px-3 py-2 text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg shadow-lg pointer-events-none"
      style={{
        left: position.x + 10,
        top: position.y - 10,
        transform: "translateY(-100%)",
      }}
    >
      <div className="font-medium">{agentName}</div>
      <div className="text-gray-300 dark:text-gray-600">
        {formatDayLabel(date)}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="font-semibold">{(score ?? 0).toFixed(0)}</span>
        <span
          className={cn(
            "text-xs px-1.5 py-0.5 rounded",
            (score ?? 0) >= 85
              ? "bg-emerald-500/20 text-emerald-300"
              : (score ?? 0) >= 70
                ? "bg-green-500/20 text-green-300"
                : (score ?? 0) >= 55
                  ? "bg-amber-500/20 text-amber-300"
                  : (score ?? 0) >= 40
                    ? "bg-orange-500/20 text-orange-300"
                    : "bg-red-500/20 text-red-300",
          )}
        >
          {getScoreLabel(score)}
        </span>
      </div>
      <div className="text-gray-400 dark:text-gray-500 text-xs mt-1">
        {callCount} call{callCount !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

export function QualityHeatmap({
  data,
  isLoading,
  onCellClick,
}: QualityHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipProps | null>(null);

  // Extract unique dates from data (sorted chronologically)
  const dates = useMemo(() => {
    const allDates = new Set<string>();
    data.forEach((agent) => {
      agent.daily_scores.forEach((score) => {
        allDates.add(score.date);
      });
    });
    return Array.from(allDates).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );
  }, [data]);

  // Calculate row averages for each agent
  const rowAverages = useMemo(() => {
    return data.map((agent) => {
      const scores = agent.daily_scores.filter(
        (s) => s.score !== null && s.call_count > 0,
      );
      if (scores.length === 0) return null;
      const sum = scores.reduce((acc, s) => acc + s.score, 0);
      return sum / scores.length;
    });
  }, [data]);

  // Calculate column averages for each date
  const columnAverages = useMemo(() => {
    return dates.map((date) => {
      const scoresForDate = data
        .map((agent) => agent.daily_scores.find((s) => s.date === date))
        .filter((s) => s && s.score !== null && s.call_count > 0) as {
        score: number;
      }[];

      if (scoresForDate.length === 0) return null;
      const sum = scoresForDate.reduce((acc, s) => acc + s.score, 0);
      return sum / scoresForDate.length;
    });
  }, [data, dates]);

  // Calculate overall average
  const overallAverage = useMemo(() => {
    const validAverages = rowAverages.filter((avg) => avg !== null) as number[];
    if (validAverages.length === 0) return null;
    return (
      validAverages.reduce((acc, avg) => acc + avg, 0) / validAverages.length
    );
  }, [rowAverages]);

  const handleMouseEnter = (
    e: React.MouseEvent,
    agent: QualityHeatmapData,
    score: { date: string; score: number; call_count: number },
  ) => {
    setTooltip({
      score: score.score,
      callCount: score.call_count,
      agentName: agent.agent_name,
      date: score.date,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (tooltip) {
      setTooltip((prev) =>
        prev ? { ...prev, position: { x: e.clientX, y: e.clientY } } : null,
      );
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  const handleCellClick = (agentId: string, date: string) => {
    if (onCellClick) {
      onCellClick(agentId, date);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quality Scores by Agent</CardTitle>
        </CardHeader>
        <CardContent>
          <HeatmapSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quality Scores by Agent</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-text-secondary">
            No quality data available for the selected period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quality Scores by Agent</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <span className="text-text-secondary">Score:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-[#ef4444]" />
            <span className="text-text-secondary">0-39</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-[#f97316]" />
            <span className="text-text-secondary">40-54</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-[#f59e0b]" />
            <span className="text-text-secondary">55-69</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-[#22c55e]" />
            <span className="text-text-secondary">70-84</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-[#10b981]" />
            <span className="text-text-secondary">85-100</span>
          </div>
        </div>

        {/* Scrollable container for many agents */}
        <div className="overflow-x-auto">
          <div
            className="grid gap-1 min-w-max"
            style={{
              gridTemplateColumns: `150px repeat(${dates.length}, minmax(60px, 1fr)) 70px`,
            }}
          >
            {/* Header row */}
            <div className="text-sm font-medium text-text-secondary px-2 py-2">
              Agent
            </div>
            {dates.map((date) => (
              <div
                key={date}
                className="text-sm font-medium text-text-secondary text-center px-1 py-2"
              >
                {formatDayLabel(date)}
              </div>
            ))}
            <div className="text-sm font-medium text-text-secondary text-center px-2 py-2">
              Avg
            </div>

            {/* Data rows */}
            {data.map((agent, rowIndex) => (
              <>
                {/* Agent name */}
                <div
                  key={`name-${agent.agent_id}`}
                  className="text-sm font-medium text-text-primary px-2 py-2 truncate"
                  title={agent.agent_name}
                >
                  {agent.agent_name}
                </div>

                {/* Score cells */}
                {dates.map((date) => {
                  const scoreData = agent.daily_scores.find(
                    (s) => s.date === date,
                  );
                  const score = scoreData?.score ?? null;
                  const callCount = scoreData?.call_count ?? 0;
                  const hasData = score !== null && callCount > 0;

                  return (
                    <div
                      key={`${agent.agent_id}-${date}`}
                      className={cn(
                        "flex items-center justify-center rounded text-sm font-medium h-10 transition-all",
                        hasData
                          ? getScoreColor(score)
                          : "bg-gray-100 dark:bg-gray-800",
                        hasData ? getScoreTextColor(score) : "text-gray-400",
                        hasData &&
                          onCellClick &&
                          "cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-1",
                      )}
                      onMouseEnter={(e) =>
                        hasData &&
                        scoreData &&
                        handleMouseEnter(e, agent, scoreData)
                      }
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                      onClick={() =>
                        hasData && handleCellClick(agent.agent_id, date)
                      }
                    >
                      {hasData ? (score ?? 0).toFixed(0) : "-"}
                    </div>
                  );
                })}

                {/* Row average */}
                <div
                  key={`avg-${agent.agent_id}`}
                  className={cn(
                    "flex items-center justify-center rounded text-sm font-semibold h-10 border-l-2 border-gray-200 dark:border-gray-700",
                    rowAverages[rowIndex] !== null
                      ? getScoreColor(rowAverages[rowIndex])
                      : "bg-gray-100 dark:bg-gray-800",
                    rowAverages[rowIndex] !== null
                      ? getScoreTextColor(rowAverages[rowIndex])
                      : "text-gray-400",
                  )}
                >
                  {rowAverages[rowIndex] !== null
                    ? rowAverages[rowIndex]!.toFixed(0)
                    : "-"}
                </div>
              </>
            ))}

            {/* Column averages row */}
            <div className="text-sm font-semibold text-text-primary px-2 py-2 border-t-2 border-gray-200 dark:border-gray-700">
              Daily Avg
            </div>
            {columnAverages.map((avg, index) => (
              <div
                key={`col-avg-${dates[index]}`}
                className={cn(
                  "flex items-center justify-center rounded text-sm font-semibold h-10 border-t-2 border-gray-200 dark:border-gray-700",
                  avg !== null
                    ? getScoreColor(avg)
                    : "bg-gray-100 dark:bg-gray-800",
                  avg !== null ? getScoreTextColor(avg) : "text-gray-400",
                )}
              >
                {avg !== null ? avg.toFixed(0) : "-"}
              </div>
            ))}

            {/* Overall average */}
            <div
              className={cn(
                "flex items-center justify-center rounded text-sm font-bold h-10 border-t-2 border-l-2 border-gray-200 dark:border-gray-700",
                overallAverage !== null
                  ? getScoreColor(overallAverage)
                  : "bg-gray-100 dark:bg-gray-800",
                overallAverage !== null
                  ? getScoreTextColor(overallAverage)
                  : "text-gray-400",
              )}
            >
              {overallAverage !== null ? overallAverage.toFixed(0) : "-"}
            </div>
          </div>
        </div>

        {/* Tooltip */}
        {tooltip && <Tooltip {...tooltip} />}
      </CardContent>
    </Card>
  );
}

export default QualityHeatmap;
