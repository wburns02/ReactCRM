/**
 * TaskCard Component
 *
 * Displays a single CSM task in the priority queue with visual priority indicators,
 * customer context, and quick actions.
 */

import { useState } from "react";
import type { CSMQueueTask } from "../../../../api/types/customerSuccess";

interface TaskCardProps {
  task: CSMQueueTask;
  isSelected?: boolean;
  onSelect: (task: CSMQueueTask) => void;
  onStart?: (taskId: number) => void;
  onSnooze?: (taskId: number) => void;
  onReschedule?: (taskId: number) => void;
}

const priorityConfig = {
  urgent: {
    badge: "URGENT",
    bgColor: "bg-red-500/20",
    textColor: "text-red-400",
    borderColor: "border-red-500/50",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  },
  high: {
    badge: "HIGH",
    bgColor: "bg-orange-500/20",
    textColor: "text-orange-400",
    borderColor: "border-orange-500/50",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  standard: {
    badge: "STANDARD",
    bgColor: "bg-blue-500/20",
    textColor: "text-blue-400",
    borderColor: "border-blue-500/50",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
  low: {
    badge: "LOW",
    bgColor: "bg-gray-500/20",
    textColor: "text-gray-400",
    borderColor: "border-gray-500/50",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
};

const healthStatusConfig = {
  healthy: { color: "text-green-400", bg: "bg-green-500/20" },
  at_risk: { color: "text-yellow-400", bg: "bg-yellow-500/20" },
  critical: { color: "text-red-400", bg: "bg-red-500/20" },
  churned: { color: "text-gray-400", bg: "bg-gray-500/20" },
};

export function TaskCard({
  task,
  isSelected,
  onSelect,
  onStart,
  onSnooze,
  onReschedule,
}: TaskCardProps) {
  const [showActions, setShowActions] = useState(false);
  const config = priorityConfig[task.priority];
  const healthConfig = task.customer_health_status
    ? healthStatusConfig[task.customer_health_status]
    : healthStatusConfig.healthy;

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDueDate = () => {
    if (!task.due_date) return null;
    const due = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil(
      (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0) {
      return {
        text: `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? "s" : ""} overdue`,
        isOverdue: true,
      };
    } else if (diffDays === 0) {
      return { text: "Due today", isOverdue: false };
    } else if (diffDays === 1) {
      return { text: "Due tomorrow", isOverdue: false };
    } else {
      return { text: `Due in ${diffDays} days`, isOverdue: false };
    }
  };

  const dueInfo = formatDueDate();

  return (
    <div
      className={`
        relative rounded-lg border p-4 cursor-pointer transition-all duration-200
        ${isSelected ? "ring-2 ring-primary border-primary bg-bg-card" : "border-border hover:border-border-hover bg-bg-secondary"}
        ${config.borderColor}
      `}
      onClick={() => onSelect(task)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Priority Badge */}
      <div className="flex items-center justify-between mb-3">
        <div
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold ${config.bgColor} ${config.textColor}`}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={config.icon}
            />
          </svg>
          {config.badge}
        </div>
        <span className="text-xs text-text-muted">
          Score: {task.priority_score}
        </span>
      </div>

      {/* Task Type */}
      <h3 className="font-semibold text-text-primary mb-2">
        {task.task_type_name}
      </h3>

      {/* Customer Info */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-text-primary">
            {task.customer_name}
          </span>
          {task.customer_tier && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-bg-primary text-text-muted uppercase">
              {task.customer_tier.replace("_", " ")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-text-muted">
          <span>ARR: {formatCurrency(task.customer_arr)}</span>
          {task.customer_health_score !== null && (
            <span className={`flex items-center gap-1 ${healthConfig.color}`}>
              <span className={`w-2 h-2 rounded-full ${healthConfig.bg}`} />
              Health: {task.customer_health_score}
            </span>
          )}
        </div>
      </div>

      {/* Due Date */}
      {dueInfo && (
        <div
          className={`text-sm mb-3 ${dueInfo.isOverdue ? "text-red-400 font-medium" : "text-text-muted"}`}
        >
          {dueInfo.isOverdue && (
            <svg
              className="w-4 h-4 inline mr-1"
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
          )}
          {dueInfo.text}
        </div>
      )}

      {/* Status Badge */}
      {task.status !== "pending" && (
        <div className="mb-3">
          <span
            className={`
            text-xs px-2 py-1 rounded-full
            ${task.status === "in_progress" ? "bg-blue-500/20 text-blue-400" : ""}
            ${task.status === "snoozed" ? "bg-purple-500/20 text-purple-400" : ""}
            ${task.status === "blocked" ? "bg-red-500/20 text-red-400" : ""}
          `}
          >
            {task.status === "in_progress" && "In Progress"}
            {task.status === "snoozed" && "Snoozed"}
            {task.status === "blocked" && "Blocked"}
          </span>
        </div>
      )}

      {/* Renewal Date (if close) */}
      {task.customer_renewal_date && (
        <div className="text-xs text-text-muted">
          Renewal: {new Date(task.customer_renewal_date).toLocaleDateString()}
        </div>
      )}

      {/* Quick Actions (on hover) */}
      {showActions && (
        <div className="absolute right-2 top-2 flex gap-1">
          {task.status === "pending" && onStart && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStart(task.id);
              }}
              className="p-1.5 rounded-md bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
              title="Start Task"
            >
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
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          )}
          {onSnooze && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSnooze(task.id);
              }}
              className="p-1.5 rounded-md bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
              title="Snooze"
            >
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          )}
          {onReschedule && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReschedule(task.id);
              }}
              className="p-1.5 rounded-md bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
              title="Reschedule"
            >
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TaskCard;
