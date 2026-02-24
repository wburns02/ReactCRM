import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { ActivityLogEntry, ActivityType } from "@/api/types/workOrder";
import { formatRelativeTime } from "../utils/workOrderHelpers";

// Activity type icons
const ActivityIcons: Record<ActivityType, () => React.JSX.Element> = {
  created: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  ),
  status_change: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v6m0 0-3-3m3 3 3-3" />
      <path d="M12 21v-6m0 0 3 3m-3-3-3 3" />
    </svg>
  ),
  assigned: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  rescheduled: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  ),
  note_added: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10,9 9,9 8,9" />
    </svg>
  ),
  photo_added: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  ),
  signature_captured: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  ),
  payment_received: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  invoice_sent: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  customer_notified: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  technician_enroute: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  ),
  arrived: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  completed: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
};

// Activity type colors
const ActivityColors: Record<ActivityType, string> = {
  created: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
  status_change:
    "bg-violet-100 text-violet-600 dark:bg-violet-900 dark:text-violet-300",
  assigned: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900 dark:text-cyan-300",
  rescheduled:
    "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300",
  note_added: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  photo_added: "bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300",
  signature_captured:
    "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300",
  payment_received:
    "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300",
  invoice_sent:
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300",
  customer_notified:
    "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300",
  technician_enroute:
    "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300",
  arrived: "bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-300",
  completed:
    "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300",
};

export interface WorkOrderTimelineProps {
  /** Array of activity log entries */
  activities: ActivityLogEntry[];
  /** Maximum number of items to show initially (rest are collapsible) */
  initialVisibleCount?: number;
  /** Whether to show the expand/collapse button */
  collapsible?: boolean;
  /** Whether to show user names */
  showUserNames?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback when an activity is clicked */
  onActivityClick?: (activity: ActivityLogEntry) => void;
}

/**
 * WorkOrderTimeline - Activity timeline component
 *
 * Features:
 * - Chronological list of ActivityLogEntry items
 * - Icons for each activity type
 * - Relative timestamps
 * - Expandable details
 * - Collapsible for long histories
 */
export function WorkOrderTimeline({
  activities,
  initialVisibleCount = 5,
  collapsible = true,
  showUserNames = true,
  className,
  onActivityClick,
}: WorkOrderTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(
    null,
  );

  // Sort activities by timestamp (newest first)
  const sortedActivities = useMemo(
    () =>
      [...activities].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    [activities],
  );

  // Determine which activities to show
  const visibleActivities = useMemo(() => {
    if (!collapsible || isExpanded) {
      return sortedActivities;
    }
    return sortedActivities.slice(0, initialVisibleCount);
  }, [sortedActivities, collapsible, isExpanded, initialVisibleCount]);

  const hiddenCount = sortedActivities.length - initialVisibleCount;

  const toggleActivityDetails = (activityId: string) => {
    setExpandedActivityId((prev) => (prev === activityId ? null : activityId));
  };

  if (activities.length === 0) {
    return (
      <div className={cn("text-center py-8 text-text-muted", className)}>
        <p>No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

      {/* Activity items */}
      <div className="space-y-4">
        {visibleActivities.map((activity, index) => {
          const IconComponent = ActivityIcons[activity.type] ?? ActivityIcons.created;
          const colorClass = ActivityColors[activity.type] ?? ActivityColors.created;
          const isActivityExpanded = expandedActivityId === activity.id;
          const hasMetadata =
            activity.metadata && Object.keys(activity.metadata).length > 0;

          return (
            <div
              key={activity.id}
              className={cn(
                "relative pl-10",
                onActivityClick && "cursor-pointer",
                index === 0 && "pt-0",
              )}
              onClick={() => onActivityClick?.(activity)}
            >
              {/* Icon */}
              <div
                className={cn(
                  "absolute left-0 w-8 h-8 rounded-full flex items-center justify-center",
                  colorClass,
                  "ring-4 ring-bg-card",
                )}
              >
                <IconComponent />
              </div>

              {/* Content */}
              <div
                className={cn(
                  "bg-bg-card rounded-lg border border-border p-3",
                  "hover:border-primary/30 transition-colors",
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm text-text-primary">
                    {activity.description}
                  </p>
                  <span className="text-xs text-text-muted whitespace-nowrap">
                    {formatRelativeTime(activity.timestamp)}
                  </span>
                </div>

                {showUserNames && activity.userName && (
                  <p className="text-xs text-text-muted">
                    by {activity.userName}
                  </p>
                )}

                {/* Expandable metadata */}
                {hasMetadata && (
                  <>
                    <button
                      type="button"
                      className="mt-2 text-xs text-primary hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleActivityDetails(activity.id);
                      }}
                    >
                      {isActivityExpanded ? "Hide details" : "Show details"}
                    </button>

                    {isActivityExpanded && (
                      <div className="mt-2 p-2 bg-bg-muted rounded text-xs text-text-secondary">
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify(activity.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expand/Collapse button */}
      {collapsible && hiddenCount > 0 && (
        <div className="mt-4 pl-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-text-muted hover:text-text-primary"
          >
            {isExpanded
              ? "Show less"
              : `Show ${hiddenCount} more activit${hiddenCount === 1 ? "y" : "ies"}`}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * TimelineItem - Standalone timeline item for custom use
 */
export interface TimelineItemProps {
  icon?: React.ReactNode;
  iconClassName?: string;
  title: string;
  timestamp?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function TimelineItem({
  icon,
  iconClassName,
  title,
  timestamp,
  description,
  children,
  className,
}: TimelineItemProps) {
  return (
    <div className={cn("relative pl-10", className)}>
      {/* Icon */}
      <div
        className={cn(
          "absolute left-0 w-8 h-8 rounded-full flex items-center justify-center",
          "bg-bg-muted text-text-secondary",
          "ring-4 ring-bg-card",
          iconClassName,
        )}
      >
        {icon || (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="4" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="bg-bg-card rounded-lg border border-border p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-medium text-text-primary">{title}</p>
          {timestamp && (
            <span className="text-xs text-text-muted whitespace-nowrap">
              {formatRelativeTime(timestamp)}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-text-muted">{description}</p>
        )}
        {children}
      </div>
    </div>
  );
}

export default WorkOrderTimeline;
