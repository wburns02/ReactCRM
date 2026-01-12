/**
 * Action Queue Component - Prioritized Escalation List
 *
 * Shows escalations sorted by AI priority score with:
 * - Big action buttons
 * - Sentiment indicators
 * - SLA countdown timers
 * - Color-coded urgency
 *
 * Designed to answer "WHAT DO I DO NEXT?" at a glance
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { cn } from "@/lib/utils";

interface ActionQueueItem {
  escalation_id: number;
  customer_name: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  sentiment_emoji: string;
  sentiment_label: string;
  time_remaining_minutes: number | null;
  sla_status: string;
  sla_color: string;
  recommended_action: string;
  big_button_text: string;
  priority_score: number;
}

interface ActionQueueResponse {
  items: ActionQueueItem[];
  total: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
}

interface ActionQueueProps {
  onSelectEscalation: (id: number) => void;
  onActionTaken?: (id: number, action: string) => void;
}

function formatTimeRemaining(minutes: number | null): string {
  if (minutes === null) return "No SLA";
  if (minutes < 0) {
    const overdue = Math.abs(minutes);
    if (overdue < 60) return `${overdue}m overdue`;
    return `${Math.round(overdue / 60)}h overdue`;
  }
  if (minutes < 60) return `${minutes}m left`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h left`;
  return `${Math.round(minutes / 1440)}d left`;
}

function SeverityHeader({ counts }: { counts: ActionQueueResponse }) {
  return (
    <div className="flex gap-2 mb-6">
      {counts.critical_count > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-full">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-bold text-red-600">
            {counts.critical_count} Critical
          </span>
        </div>
      )}
      {counts.high_count > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-full">
          <span className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-sm font-bold text-orange-600">
            {counts.high_count} High
          </span>
        </div>
      )}
      {counts.medium_count > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-sm font-bold text-yellow-600">
            {counts.medium_count} Medium
          </span>
        </div>
      )}
      {counts.low_count > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm font-bold text-green-600">
            {counts.low_count} Low
          </span>
        </div>
      )}
    </div>
  );
}

function ActionCard({
  item,
  rank,
  onSelect,
  onAction,
}: {
  item: ActionQueueItem;
  rank: number;
  onSelect: () => void;
  onAction: () => void;
}) {
  const severityColors = {
    critical: "border-red-500 bg-red-500/5",
    high: "border-orange-500 bg-orange-500/5",
    medium: "border-yellow-500 bg-yellow-500/5",
    low: "border-green-500 bg-green-500/5",
  };

  const buttonColors = {
    critical: "bg-red-600 hover:bg-red-700",
    high: "bg-orange-500 hover:bg-orange-600",
    medium: "bg-yellow-500 hover:bg-yellow-600 text-black",
    low: "bg-primary hover:bg-primary-dark",
  };

  const slaColorClasses = {
    green: "text-success",
    yellow: "text-yellow-600",
    red: "text-red-600",
    gray: "text-gray-500",
  };

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-4 transition-all hover:shadow-lg cursor-pointer",
        severityColors[item.severity],
      )}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg",
              item.severity === "critical"
                ? "bg-red-500"
                : item.severity === "high"
                  ? "bg-orange-500"
                  : item.severity === "medium"
                    ? "bg-yellow-500 text-black"
                    : "bg-green-500",
            )}
          >
            {rank}
          </div>
          <div>
            <p className="font-bold text-text-primary">{item.customer_name}</p>
            <p className="text-sm text-text-muted line-clamp-1">{item.title}</p>
          </div>
        </div>
        <span className="text-3xl">{item.sentiment_emoji}</span>
      </div>

      {/* Status Row */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-text-muted">{item.sentiment_label}</span>
        <span
          className={cn(
            "text-sm font-bold",
            slaColorClasses[item.sla_color as keyof typeof slaColorClasses] ||
              "text-gray-500",
          )}
        >
          ⏰ {formatTimeRemaining(item.time_remaining_minutes)}
        </span>
      </div>

      {/* Action Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAction();
        }}
        className={cn(
          "w-full py-3 px-4 rounded-xl text-white font-bold text-lg transition-all",
          buttonColors[item.severity],
        )}
      >
        {item.big_button_text}
      </button>
    </div>
  );
}

function EmptyQueue() {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">🎉</div>
      <h3 className="text-2xl font-bold text-text-primary mb-2">
        All caught up!
      </h3>
      <p className="text-text-muted">
        No escalations need your attention right now.
      </p>
    </div>
  );
}

export function ActionQueue({
  onSelectEscalation,
  onActionTaken,
}: ActionQueueProps) {
  const [showAll, setShowAll] = useState(false);

  const { data, isLoading, error } = useQuery<ActionQueueResponse>({
    queryKey: ["action-queue"],
    queryFn: async () => {
      const response = await apiClient.get("/cs/escalations/ai/action-queue", {
        params: { assigned_to_me: true },
      });
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleAction = (id: number, action: string) => {
    if (onActionTaken) {
      onActionTaken(id, action);
    }
    // Open the escalation detail panel
    onSelectEscalation(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 bg-bg-card border border-border rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
        <p className="text-red-600">Failed to load action queue</p>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return <EmptyQueue />;
  }

  const displayItems = showAll ? data.items : data.items.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">
            Your Action Queue
          </h2>
          <p className="text-sm text-text-muted">
            {data.total} escalation{data.total !== 1 ? "s" : ""} need your
            attention
          </p>
        </div>
        <SeverityHeader counts={data} />
      </div>

      {/* Queue Items */}
      <div className="space-y-4">
        {displayItems.map((item, index) => (
          <ActionCard
            key={item.escalation_id}
            item={item}
            rank={index + 1}
            onSelect={() => onSelectEscalation(item.escalation_id)}
            onAction={() =>
              handleAction(item.escalation_id, item.recommended_action)
            }
          />
        ))}
      </div>

      {/* Show More Button */}
      {data.items.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-3 text-center text-primary hover:text-primary-dark font-medium"
        >
          {showAll ? "Show Less" : `Show ${data.items.length - 5} More`}
        </button>
      )}
    </div>
  );
}

export default ActionQueue;
