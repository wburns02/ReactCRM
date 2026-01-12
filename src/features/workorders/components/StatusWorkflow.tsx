import { useState } from "react";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Select } from "@/components/ui/Select.tsx";
import {
  type WorkOrderStatus,
  WORK_ORDER_STATUS_LABELS,
} from "@/api/types/workOrder.ts";
import { useUpdateWorkOrderStatus } from "@/api/hooks/useWorkOrders.ts";

/**
 * Define valid status transitions for the work order workflow
 *
 * Workflow:
 * DRAFT -> SCHEDULED -> CONFIRMED -> ENROUTE -> ON_SITE -> IN_PROGRESS -> COMPLETED
 *                                                                      -> REQUIRES_FOLLOWUP
 * Any status -> CANCELED (except COMPLETED)
 */
const STATUS_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  draft: ["scheduled", "canceled"],
  scheduled: ["draft", "confirmed", "canceled"],
  confirmed: ["scheduled", "enroute", "canceled"],
  enroute: ["confirmed", "on_site", "canceled"],
  on_site: ["enroute", "in_progress", "canceled"],
  in_progress: ["on_site", "completed", "requires_followup", "canceled"],
  completed: [], // Terminal state - no transitions allowed
  canceled: ["draft"], // Can only go back to draft to restart
  requires_followup: ["in_progress", "completed", "canceled"],
};

/**
 * Get quick action buttons for common workflow transitions
 */
function getQuickActions(currentStatus: WorkOrderStatus): {
  status: WorkOrderStatus;
  label: string;
  variant: "primary" | "secondary" | "danger";
}[] {
  switch (currentStatus) {
    case "draft":
      return [{ status: "scheduled", label: "Schedule", variant: "primary" }];
    case "scheduled":
      return [{ status: "confirmed", label: "Confirm", variant: "primary" }];
    case "confirmed":
      return [{ status: "enroute", label: "Start Route", variant: "primary" }];
    case "enroute":
      return [{ status: "on_site", label: "Arrived", variant: "primary" }];
    case "on_site":
      return [
        { status: "in_progress", label: "Start Work", variant: "primary" },
      ];
    case "in_progress":
      return [
        { status: "completed", label: "Complete", variant: "primary" },
        {
          status: "requires_followup",
          label: "Needs Follow-up",
          variant: "secondary",
        },
      ];
    case "requires_followup":
      return [{ status: "completed", label: "Complete", variant: "primary" }];
    default:
      return [];
  }
}

/**
 * Get badge variant based on status
 */
function getStatusVariant(
  status: WorkOrderStatus,
): "default" | "success" | "warning" | "danger" {
  switch (status) {
    case "completed":
      return "success";
    case "canceled":
      return "danger";
    case "enroute":
    case "on_site":
    case "in_progress":
    case "requires_followup":
      return "warning";
    default:
      return "default";
  }
}

interface StatusWorkflowProps {
  workOrderId: string;
  currentStatus: WorkOrderStatus;
  onStatusChange?: (newStatus: WorkOrderStatus) => void;
}

/**
 * StatusWorkflow - Visual workflow component for work order status management
 *
 * Provides:
 * - Current status display with badge
 * - Quick action buttons for common transitions
 * - Dropdown for all valid transitions
 * - Loading state during updates
 */
export function StatusWorkflow({
  workOrderId,
  currentStatus,
  onStatusChange,
}: StatusWorkflowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const updateStatus = useUpdateWorkOrderStatus();

  const validTransitions = STATUS_TRANSITIONS[currentStatus] || [];
  const quickActions = getQuickActions(currentStatus);

  const handleStatusChange = async (newStatus: WorkOrderStatus) => {
    await updateStatus.mutateAsync({ id: workOrderId, status: newStatus });
    onStatusChange?.(newStatus);
  };

  const handleSelectChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const newStatus = e.target.value as WorkOrderStatus;
    if (newStatus && newStatus !== currentStatus) {
      await handleStatusChange(newStatus);
    }
  };

  // If completed or no transitions available, show read-only status
  if (validTransitions.length === 0) {
    return (
      <div className="bg-bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-2">
              Status
            </h4>
            <Badge
              variant={getStatusVariant(currentStatus)}
              className="text-sm"
            >
              {WORK_ORDER_STATUS_LABELS[currentStatus]}
            </Badge>
          </div>
          {currentStatus === "completed" && (
            <span className="text-2xl">Completed!</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
          Status Workflow
        </h4>
        <Badge variant={getStatusVariant(currentStatus)}>
          {WORK_ORDER_STATUS_LABELS[currentStatus]}
        </Badge>
      </div>

      {/* Quick Action Buttons */}
      {quickActions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {quickActions.map((action) => (
            <Button
              key={action.status}
              variant={action.variant}
              size="sm"
              onClick={() => handleStatusChange(action.status)}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? "Updating..." : action.label}
            </Button>
          ))}
        </div>
      )}

      {/* Expandable Options */}
      <div className="border-t border-border pt-3">
        {isExpanded ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Select
                value=""
                onChange={handleSelectChange}
                disabled={updateStatus.isPending}
                className="flex-1"
              >
                <option value="">Change status to...</option>
                {validTransitions.map((status) => (
                  <option key={status} value={status}>
                    {WORK_ORDER_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
              >
                Cancel
              </Button>
            </div>

            {/* Cancel option if not already canceled */}
            {currentStatus !== "canceled" &&
              validTransitions.includes("canceled") && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleStatusChange("canceled")}
                  disabled={updateStatus.isPending}
                  className="w-full"
                >
                  Cancel Work Order
                </Button>
              )}
          </div>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="text-sm text-text-link hover:underline"
          >
            More options...
          </button>
        )}
      </div>

      {/* Workflow Progress Indicator */}
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          {(
            [
              "draft",
              "scheduled",
              "confirmed",
              "enroute",
              "on_site",
              "in_progress",
              "completed",
            ] as WorkOrderStatus[]
          ).map((status, _index) => {
            const isActive = status === currentStatus;
            const isPast =
              getStatusOrder(status) < getStatusOrder(currentStatus);
            const isCanceled = currentStatus === "canceled";

            return (
              <div
                key={status}
                className={`
                  flex flex-col items-center
                  ${isActive ? "text-primary font-medium" : ""}
                  ${isPast ? "text-success" : ""}
                  ${!isActive && !isPast ? "text-text-muted" : ""}
                  ${isCanceled ? "opacity-50" : ""}
                `}
              >
                <div
                  className={`
                    w-3 h-3 rounded-full mb-1
                    ${isActive ? "bg-primary ring-2 ring-primary/30" : ""}
                    ${isPast ? "bg-success" : ""}
                    ${!isActive && !isPast ? "bg-border" : ""}
                  `}
                />
                <span className="text-[10px] hidden sm:block">
                  {getShortLabel(status)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Get numeric order for status comparison
 */
function getStatusOrder(status: WorkOrderStatus): number {
  const order: Record<WorkOrderStatus, number> = {
    draft: 0,
    scheduled: 1,
    confirmed: 2,
    enroute: 3,
    on_site: 4,
    in_progress: 5,
    completed: 6,
    canceled: -1,
    requires_followup: 5.5,
  };
  return order[status] ?? 0;
}

/**
 * Get short label for workflow progress indicator
 */
function getShortLabel(status: WorkOrderStatus): string {
  const labels: Record<WorkOrderStatus, string> = {
    draft: "Draft",
    scheduled: "Sched",
    confirmed: "Conf",
    enroute: "Route",
    on_site: "Site",
    in_progress: "Work",
    completed: "Done",
    canceled: "Cancel",
    requires_followup: "Follow",
  };
  return labels[status] ?? status;
}
