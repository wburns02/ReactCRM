/**
 * Actionable Alerts Component
 *
 * One-click resolution actions for AI-detected survey detractors.
 * Shows actionable cards with customer info, score, issue summary,
 * and quick action buttons.
 */

import { useState } from "react";
import { cn } from "@/lib/utils.ts";
import { QuickActionButtons } from "./QuickActionButtons.tsx";
import { CreateActionModal } from "./CreateActionModal.tsx";
import {
  useDetractorQueue,
  useDismissDetractorAlert,
  type DetractorAlert,
  type DetractorQueueFilters,
  type SurveyActionType,
} from "@/api/hooks/useSurveyActions.ts";

// ============================================
// Types
// ============================================

interface ActionableAlertsProps {
  filters?: DetractorQueueFilters;
  onViewCustomer?: (customerId: number) => void;
  className?: string;
}

// ============================================
// Helper Components
// ============================================

function RiskLevelBadge({ level }: { level: DetractorAlert["risk_level"] }) {
  const config = {
    critical: { bg: "bg-danger", text: "text-white", label: "Critical Risk" },
    high: { bg: "bg-warning", text: "text-white", label: "High Risk" },
    medium: { bg: "bg-info/80", text: "text-white", label: "Medium Risk" },
    low: { bg: "bg-gray-500", text: "text-white", label: "Low Risk" },
  };

  const { bg, text, label } = config[level];

  return (
    <span
      className={cn("px-2 py-0.5 text-xs font-medium rounded-full", bg, text)}
    >
      {label}
    </span>
  );
}

function SentimentIndicator({
  sentiment,
}: {
  sentiment?: DetractorAlert["sentiment"];
}) {
  if (!sentiment) return null;

  const config = {
    very_negative: { color: "text-danger", icon: "😠", label: "Very Negative" },
    negative: { color: "text-warning", icon: "😟", label: "Negative" },
    neutral: { color: "text-text-muted", icon: "😐", label: "Neutral" },
    positive: { color: "text-success", icon: "🙂", label: "Positive" },
    very_positive: {
      color: "text-success",
      icon: "😊",
      label: "Very Positive",
    },
  };

  const { color, icon, label } = config[sentiment];

  return (
    <span className={cn("flex items-center gap-1 text-xs", color)}>
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const getColor = () => {
    if (score <= 3) return "bg-danger text-white";
    if (score <= 6) return "bg-warning text-white";
    if (score <= 8) return "bg-info text-white";
    return "bg-success text-white";
  };

  return (
    <div
      className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold",
        getColor(),
      )}
    >
      {score}
    </div>
  );
}

function TimeAgo({ timestamp }: { timestamp: string }) {
  const getTimeAgo = () => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return <span className="text-xs text-text-muted">{getTimeAgo()}</span>;
}

// ============================================
// Alert Card Component
// ============================================

interface AlertCardProps {
  alert: DetractorAlert;
  onDismiss: (alertId: number, reason?: string) => void;
  onCreateAction: (alert: DetractorAlert, actionType: SurveyActionType) => void;
  onViewCustomer?: (customerId: number) => void;
  isDismissing: boolean;
}

function AlertCard({
  alert,
  onDismiss,
  onCreateAction,
  onViewCustomer,
  isDismissing,
}: AlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDismissInput, setShowDismissInput] = useState(false);
  const [dismissReason, setDismissReason] = useState("");

  const handleDismiss = () => {
    if (showDismissInput) {
      onDismiss(alert.id, dismissReason || undefined);
      setShowDismissInput(false);
      setDismissReason("");
    } else {
      setShowDismissInput(true);
    }
  };

  return (
    <div
      className={cn(
        "bg-bg-card rounded-xl border p-5 transition-all",
        alert.risk_level === "critical"
          ? "border-danger/50 bg-danger/5"
          : alert.risk_level === "high"
            ? "border-warning/50 bg-warning/5"
            : "border-border",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <ScoreBadge score={alert.score} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-text-primary">
                {alert.customer_name}
              </h3>
              <RiskLevelBadge level={alert.risk_level} />
            </div>
            <div className="flex items-center gap-3 text-sm text-text-muted">
              <span>{alert.survey_name}</span>
              <span>|</span>
              <TimeAgo timestamp={alert.response_submitted_at} />
            </div>
          </div>
        </div>
        <SentimentIndicator sentiment={alert.sentiment} />
      </div>

      {/* Feedback Quote */}
      {alert.feedback && (
        <div className="mb-4 p-3 bg-bg-hover rounded-lg">
          <p className="text-sm text-text-secondary italic">
            "{alert.feedback}"
          </p>
        </div>
      )}

      {/* AI Summary */}
      {alert.ai_summary && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <span className="text-xs font-medium text-primary">
              AI Analysis
            </span>
          </div>
          <p className="text-sm text-text-secondary">{alert.ai_summary}</p>
        </div>
      )}

      {/* Key Issues */}
      {alert.key_issues && alert.key_issues.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-text-muted mb-2">
            Key Issues Detected:
          </p>
          <div className="flex flex-wrap gap-2">
            {alert.key_issues.map((issue, idx) => (
              <span
                key={idx}
                className="px-2 py-1 text-xs bg-danger/10 text-danger rounded-full"
              >
                {issue}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-4">
        <p className="text-xs font-medium text-text-muted mb-2">Take Action:</p>
        <QuickActionButtons
          customerId={alert.customer_id}
          responseId={alert.response_id}
          suggestedActions={alert.suggested_actions}
          onActionClick={(actionType) => onCreateAction(alert, actionType)}
          size="sm"
        />
      </div>

      {/* Expand/Collapse for more details */}
      {alert.actions_taken && alert.actions_taken.length > 0 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark mb-3"
        >
          <svg
            className={cn(
              "w-4 h-4 transition-transform",
              isExpanded && "rotate-180",
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
          {alert.actions_taken.length} action
          {alert.actions_taken.length !== 1 ? "s" : ""} taken
        </button>
      )}

      {isExpanded && alert.actions_taken && alert.actions_taken.length > 0 && (
        <div className="mb-4 p-3 bg-bg-hover rounded-lg">
          <p className="text-xs font-medium text-text-muted mb-2">
            Actions Taken:
          </p>
          <div className="space-y-2">
            {alert.actions_taken.map((action) => (
              <div
                key={action.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-text-secondary">
                  {action.title} - {action.assigned_to_name || "Unassigned"}
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5 text-xs rounded-full",
                    action.status === "completed"
                      ? "bg-success/10 text-success"
                      : action.status === "in_progress"
                        ? "bg-warning/10 text-warning"
                        : "bg-gray-100 text-gray-600",
                  )}
                >
                  {action.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        {onViewCustomer && (
          <button
            onClick={() => onViewCustomer(alert.customer_id)}
            className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            View Customer
          </button>
        )}

        {showDismissInput ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
              placeholder="Reason (optional)"
              className="px-2 py-1 text-sm border border-border rounded bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleDismiss}
              disabled={isDismissing}
              className="px-3 py-1 text-sm text-white bg-text-muted rounded hover:bg-text-secondary disabled:opacity-50"
            >
              {isDismissing ? "Dismissing..." : "Confirm"}
            </button>
            <button
              onClick={() => {
                setShowDismissInput(false);
                setDismissReason("");
              }}
              className="p-1 text-text-muted hover:text-text-primary"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={handleDismiss}
            className="text-sm text-text-muted hover:text-text-primary flex items-center gap-1"
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
                d="M5 13l4 4L19 7"
              />
            </svg>
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Filter Bar Component
// ============================================

interface FilterBarProps {
  filters: DetractorQueueFilters;
  onFilterChange: (filters: DetractorQueueFilters) => void;
  totalCount: number;
}

function FilterBar({ filters, onFilterChange, totalCount }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-6">
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-muted">Risk Level:</span>
        <div className="flex gap-1">
          {(["all", "critical", "high", "medium", "low"] as const).map(
            (level) => (
              <button
                key={level}
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    risk_level: level === "all" ? undefined : level,
                  })
                }
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-full transition-colors",
                  (level === "all" && !filters.risk_level) ||
                    filters.risk_level === level
                    ? "bg-primary text-white"
                    : "bg-bg-hover text-text-secondary hover:text-text-primary",
                )}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-text-muted">Max Score:</span>
        <select
          value={filters.score_max ?? ""}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              score_max: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          className="px-2 py-1 text-sm border border-border rounded bg-bg-primary text-text-primary"
        >
          <option value="">Any</option>
          <option value="3">0-3 (Detractors)</option>
          <option value="6">0-6 (At Risk)</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={filters.has_actions === false}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                has_actions: e.target.checked ? false : undefined,
              })
            }
            className="rounded border-border"
          />
          No actions taken
        </label>
      </div>

      <div className="ml-auto text-sm text-text-muted">
        {totalCount} alert{totalCount !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function ActionableAlerts({
  filters: initialFilters = {},
  onViewCustomer,
  className,
}: ActionableAlertsProps) {
  const [filters, setFilters] = useState<DetractorQueueFilters>({
    is_dismissed: false,
    ...initialFilters,
  });
  const [selectedAlert, setSelectedAlert] = useState<DetractorAlert | null>(
    null,
  );
  const [selectedActionType, setSelectedActionType] =
    useState<SurveyActionType | null>(null);

  const { data, isLoading, error } = useDetractorQueue(filters);
  const dismissMutation = useDismissDetractorAlert();

  const handleDismiss = (alertId: number, reason?: string) => {
    dismissMutation.mutate({ alertId, reason });
  };

  const handleCreateAction = (
    alert: DetractorAlert,
    actionType: SurveyActionType,
  ) => {
    setSelectedAlert(alert);
    setSelectedActionType(actionType);
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="animate-pulse">
          <div className="h-8 bg-bg-hover rounded w-48 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-bg-hover rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-6 bg-danger/10 rounded-xl text-center", className)}>
        <p className="text-danger">Failed to load alerts. Please try again.</p>
      </div>
    );
  }

  const alerts = data?.items || [];
  const total = data?.total || 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <svg
              className="w-6 h-6 text-warning"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Actionable Alerts
          </h2>
          <p className="text-sm text-text-muted">
            AI-detected detractors requiring immediate attention
          </p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        totalCount={total}
      />

      {/* Alert List */}
      {alerts.length === 0 ? (
        <div className="py-12 text-center bg-bg-card rounded-xl border border-border">
          <svg
            className="w-16 h-16 mx-auto text-success mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-lg font-medium text-text-primary mb-1">
            All Clear!
          </p>
          <p className="text-sm text-text-muted">
            No actionable alerts at the moment.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onDismiss={handleDismiss}
              onCreateAction={handleCreateAction}
              onViewCustomer={onViewCustomer}
              isDismissing={dismissMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > (filters.page_size || 10) && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() =>
              setFilters({ ...filters, page: (filters.page || 1) - 1 })
            }
            disabled={!filters.page || filters.page <= 1}
            className="px-4 py-2 text-sm border border-border rounded-lg disabled:opacity-50 hover:bg-bg-hover"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-text-muted">
            Page {filters.page || 1} of{" "}
            {Math.ceil(total / (filters.page_size || 10))}
          </span>
          <button
            onClick={() =>
              setFilters({ ...filters, page: (filters.page || 1) + 1 })
            }
            disabled={
              (filters.page || 1) >=
              Math.ceil(total / (filters.page_size || 10))
            }
            className="px-4 py-2 text-sm border border-border rounded-lg disabled:opacity-50 hover:bg-bg-hover"
          >
            Next
          </button>
        </div>
      )}

      {/* Create Action Modal */}
      {selectedAlert && selectedActionType && (
        <CreateActionModal
          isOpen={true}
          onClose={() => {
            setSelectedAlert(null);
            setSelectedActionType(null);
          }}
          customerId={selectedAlert.customer_id}
          customerName={selectedAlert.customer_name}
          responseId={selectedAlert.response_id}
          surveyId={selectedAlert.survey_id}
          initialActionType={selectedActionType}
          context={{
            score: selectedAlert.score,
            feedback: selectedAlert.feedback,
            sentiment: selectedAlert.sentiment,
          }}
        />
      )}
    </div>
  );
}
