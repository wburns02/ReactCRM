/**
 * SmartScheduler Component
 * AI-powered scheduling suggestions with score-based ranking
 */

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { format, addDays, parseISO } from "date-fns";
import type { WorkOrder, SchedulingSuggestion } from "@/api/types/workOrder.ts";
import { useSchedulingSuggestions } from "./hooks/useScheduling.ts";

interface SmartSchedulerProps {
  workOrder: WorkOrder;
  onAssign?: (suggestion: SchedulingSuggestion) => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Get score color based on value
 */
function getScoreColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-warning";
  return "text-danger";
}

/**
 * Get score background color
 */
function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-success/10";
  if (score >= 60) return "bg-primary/10";
  if (score >= 40) return "bg-warning/10";
  return "bg-danger/10";
}

/**
 * Get badge variant for score
 */
function getScoreBadgeVariant(
  score: number,
): "success" | "info" | "warning" | "danger" {
  if (score >= 80) return "success";
  if (score >= 60) return "info";
  if (score >= 40) return "warning";
  return "danger";
}

export function SmartScheduler({
  workOrder,
  onAssign,
  onDismiss,
  className,
}: SmartSchedulerProps) {
  const [targetDate, setTargetDate] = useState(() => {
    // Default to tomorrow or scheduled date
    if (workOrder.scheduled_date) {
      return workOrder.scheduled_date;
    }
    return format(addDays(new Date(), 1), "yyyy-MM-dd");
  });

  const { suggestions, topSuggestion, isLoading } = useSchedulingSuggestions(
    workOrder,
    targetDate,
  );

  // Sort suggestions by score
  const sortedSuggestions = useMemo(() => {
    return [...suggestions].sort((a, b) => b.score - a.score);
  }, [suggestions]);

  // Get the top 3 suggestions
  const topSuggestions = sortedSuggestions.slice(0, 3);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-text-secondary mt-4">
            Analyzing scheduling options...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <CardTitle>Smart Scheduler</CardTitle>
          </div>
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Target date selector */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Target Date
          </label>
          <Input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            min={format(new Date(), "yyyy-MM-dd")}
          />
        </div>

        {/* Work order info */}
        <div className="p-3 bg-bg-muted rounded-lg">
          <div className="text-sm text-text-secondary">Scheduling for:</div>
          <div className="font-medium text-text-primary">
            {workOrder.customer_name || `Customer #${workOrder.customer_id}`}
          </div>
          <div className="text-sm text-text-secondary mt-1">
            {workOrder.job_type} | Priority: {workOrder.priority}
          </div>
          {workOrder.estimated_duration_hours && (
            <div className="text-sm text-text-muted">
              Est. duration: {workOrder.estimated_duration_hours}h
            </div>
          )}
        </div>

        {/* Best suggestion highlighted */}
        {topSuggestion && (
          <div className="border-2 border-success/50 rounded-lg overflow-hidden">
            <div className="bg-success/10 px-3 py-2 flex items-center gap-2">
              <span className="text-success">⭐</span>
              <span className="text-sm font-medium text-success">
                Best Match
              </span>
            </div>
            <SuggestionCard
              suggestion={topSuggestion}
              isTop
              onAssign={() => onAssign?.(topSuggestion)}
            />
          </div>
        )}

        {/* Other suggestions */}
        {topSuggestions.length > 1 && (
          <div>
            <div className="text-sm font-medium text-text-secondary mb-2">
              Other Options
            </div>
            <div className="space-y-2">
              {topSuggestions.slice(1).map((suggestion) => (
                <SuggestionCard
                  key={suggestion.technicianId}
                  suggestion={suggestion}
                  onAssign={() => onAssign?.(suggestion)}
                />
              ))}
            </div>
          </div>
        )}

        {/* All suggestions table */}
        {sortedSuggestions.length > 3 && (
          <div>
            <details className="group">
              <summary className="cursor-pointer text-sm text-primary hover:underline">
                View all {sortedSuggestions.length} technicians
              </summary>
              <div className="mt-2 max-h-[200px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-text-secondary font-medium">
                        Technician
                      </th>
                      <th className="text-right py-2 text-text-secondary font-medium">
                        Score
                      </th>
                      <th className="text-right py-2 text-text-secondary font-medium">
                        Time
                      </th>
                      <th className="text-right py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSuggestions.slice(3).map((suggestion) => (
                      <tr
                        key={suggestion.technicianId}
                        className="border-b border-border hover:bg-bg-hover"
                      >
                        <td className="py-2 text-text-primary">
                          {suggestion.technicianName}
                        </td>
                        <td className="py-2 text-right">
                          <span className={getScoreColor(suggestion.score)}>
                            {suggestion.score}
                          </span>
                        </td>
                        <td className="py-2 text-right text-text-secondary">
                          {suggestion.suggestedTime}
                        </td>
                        <td className="py-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onAssign?.(suggestion)}
                          >
                            Assign
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        )}

        {/* No suggestions */}
        {sortedSuggestions.length === 0 && (
          <div className="text-center py-8 text-text-muted">
            <div className="text-4xl mb-2">🤔</div>
            <div className="text-sm">
              No available technicians found for this date
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() =>
                setTargetDate(
                  format(addDays(parseISO(targetDate), 1), "yyyy-MM-dd"),
                )
              }
            >
              Try next day
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Individual suggestion card
 */
function SuggestionCard({
  suggestion,
  isTop = false,
  onAssign,
}: {
  suggestion: SchedulingSuggestion;
  isTop?: boolean;
  onAssign?: () => void;
}) {
  return (
    <div className={cn("p-3", !isTop && "border border-border rounded-lg")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              getScoreBgColor(suggestion.score),
            )}
          >
            <span
              className={cn(
                "text-lg font-bold",
                getScoreColor(suggestion.score),
              )}
            >
              {suggestion.technicianName.charAt(0)}
            </span>
          </div>

          {/* Info */}
          <div>
            <div className="font-medium text-text-primary">
              {suggestion.technicianName}
            </div>
            <div className="text-sm text-text-secondary">
              {suggestion.suggestedTime} on{" "}
              {format(parseISO(suggestion.suggestedDate), "MMM d")}
            </div>
          </div>
        </div>

        {/* Score badge */}
        <Badge
          variant={getScoreBadgeVariant(suggestion.score)}
          className="text-lg px-3 py-1"
        >
          {suggestion.score}
        </Badge>
      </div>

      {/* Reasons */}
      {suggestion.reasons.length > 0 && (
        <div className="mt-3 space-y-1">
          {suggestion.reasons.map((reason, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 text-sm text-text-secondary"
            >
              <span className="text-success">✓</span>
              <span>{reason}</span>
            </div>
          ))}
        </div>
      )}

      {/* Travel time */}
      {suggestion.estimatedTravelTime && (
        <div className="mt-2 flex items-center gap-2 text-sm text-text-muted">
          <span>🚗</span>
          <span>
            Est. travel: {suggestion.estimatedTravelTime} min
            {suggestion.proximity && ` (${suggestion.proximity.toFixed(1)} mi)`}
          </span>
        </div>
      )}

      {/* Assign button */}
      {onAssign && (
        <Button
          onClick={onAssign}
          className="w-full mt-3"
          variant={isTop ? "primary" : "outline"}
        >
          {isTop ? "Assign Best Match" : "Assign"}
        </Button>
      )}
    </div>
  );
}

/**
 * Compact suggestion widget for inline use
 */
export function SmartSchedulerInline({
  workOrder,
  onAssign,
  className,
}: {
  workOrder: WorkOrder;
  onAssign?: (suggestion: SchedulingSuggestion) => void;
  className?: string;
}) {
  const targetDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const { topSuggestion, isLoading } = useSchedulingSuggestions(
    workOrder,
    targetDate,
  );

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-sm text-text-muted",
          className,
        )}
      >
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
        <span>Finding best match...</span>
      </div>
    );
  }

  if (!topSuggestion) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between p-2 bg-success/10 rounded-lg",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">🤖</span>
        <span className="text-sm text-text-secondary">
          Suggested:{" "}
          <strong className="text-text-primary">
            {topSuggestion.technicianName}
          </strong>
          {" at "}
          <strong className="text-text-primary">
            {topSuggestion.suggestedTime}
          </strong>
        </span>
        <Badge variant="success" size="sm">
          {topSuggestion.score}
        </Badge>
      </div>
      {onAssign && (
        <Button
          size="sm"
          variant="primary"
          onClick={() => onAssign(topSuggestion)}
        >
          Assign
        </Button>
      )}
    </div>
  );
}
