import { useMemo } from "react";
import { useDroppable, useDraggable } from "@dnd-kit/core";

import { CSS } from "@dnd-kit/utilities";
import { Card, CardHeader, CardContent } from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { useWorkOrders } from "@/api/hooks/useWorkOrders.ts";
import {
  type WorkOrder,
  type WorkOrderStatus,
  type JobType,
  type Priority,
  WORK_ORDER_STATUS_LABELS,
  JOB_TYPE_LABELS,
} from "@/api/types/workOrder.ts";
import {
  getWeekDays,
  formatDateKey,
  formatTimeDisplay,
  type DropTargetData,
} from "@/api/types/schedule.ts";
import { useScheduleStore } from "../store/scheduleStore.ts";

/**
 * Get status badge variant
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

/**
 * Get priority color class
 */
function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case "emergency":
      return "border-l-danger bg-danger/5";
    case "urgent":
      return "border-l-orange-500 bg-orange-500/5";
    case "high":
      return "border-l-warning bg-warning/5";
    default:
      return "border-l-primary bg-bg-card";
  }
}

/**
 * Draggable scheduled work order card
 * Can be dragged back to unscheduled or to a different day/tech
 */
function DraggableScheduledCard({ workOrder }: { workOrder: WorkOrder }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `scheduled-${workOrder.id}`,
      data: {
        workOrder,
        isScheduled: true,
        originalDate: workOrder.scheduled_date,
        originalTechnician: workOrder.assigned_technician,
      },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-testid={`scheduled-wo-${workOrder.id}`}
      className={`
        block p-2 rounded border-l-4 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing
        ${getPriorityColor(workOrder.priority as Priority)}
        ${isDragging ? "shadow-lg ring-2 ring-primary" : ""}
      `}
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <span className="text-xs font-medium text-text-primary truncate">
          {formatTimeDisplay(workOrder.time_window_start)}
        </span>
        <Badge
          variant={getStatusVariant(workOrder.status as WorkOrderStatus)}
          className="text-[10px] px-1 py-0"
        >
          {WORK_ORDER_STATUS_LABELS[workOrder.status as WorkOrderStatus]?.slice(
            0,
            4,
          ) || workOrder.status}
        </Badge>
      </div>
      <p className="text-xs text-text-primary font-medium truncate">
        {workOrder.customer_name || `Customer #${workOrder.customer_id}`}
      </p>
      <p className="text-[10px] text-text-secondary truncate">
        {JOB_TYPE_LABELS[workOrder.job_type as JobType] || workOrder.job_type}
      </p>
      {workOrder.assigned_technician && (
        <p className="text-[10px] text-text-muted truncate mt-1">
          {workOrder.assigned_technician}
        </p>
      )}
    </div>
  );
}

/**
 * Droppable day column
 */
function DroppableDay({
  date,
  isToday,
  workOrders,
  isLoading,
  isError,
  technician,
}: {
  date: Date;
  isToday: boolean;
  workOrders: WorkOrder[];
  isLoading: boolean;
  isError: boolean;
  technician?: string;
}) {
  const dateKey = formatDateKey(date);

  // Make this day a drop target
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateKey}${technician ? `-${technician}` : ""}`,
    data: {
      date: dateKey,
      technician,
    } as DropTargetData,
  });

  return (
    <div ref={setNodeRef}>
      <Card
        className={`
          ${isToday ? "ring-2 ring-primary" : ""}
          ${isOver ? "ring-2 ring-primary bg-primary/5" : ""}
          transition-all duration-150
        `}
      >
        <CardHeader
          className={`py-3 ${isToday ? "bg-primary-light" : "bg-bg-muted"}`}
        >
          <div className="text-center">
            <p className="text-xs text-text-secondary uppercase">
              {date.toLocaleDateString("en-US", { weekday: "short" })}
            </p>
            <p
              className={`text-lg font-semibold ${isToday ? "text-primary" : "text-text-primary"}`}
            >
              {date.getDate()}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-2 min-h-[300px]">
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-16 bg-bg-muted rounded" />
              <div className="h-16 bg-bg-muted rounded" />
            </div>
          ) : isError ? (
            <p className="text-xs text-danger text-center py-4">
              Failed to load
            </p>
          ) : workOrders.length === 0 ? (
            <div
              className={`
              text-xs text-text-muted text-center py-4 h-full min-h-[200px]
              flex items-center justify-center
              ${isOver ? "bg-primary/10 rounded border-2 border-dashed border-primary" : ""}
            `}
            >
              {isOver ? "Drop to schedule" : "No appointments"}
            </div>
          ) : (
            <div className="space-y-2">
              {workOrders.map((wo) => (
                <DraggableScheduledCard key={wo.id} workOrder={wo} />
              ))}
              {/* Drop zone at bottom when there are items */}
              {isOver && (
                <div className="h-16 bg-primary/10 rounded border-2 border-dashed border-primary flex items-center justify-center text-xs text-primary">
                  Drop here
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Week View Component - 7-day calendar grid with drag-drop support
 */
export function WeekView() {
  const { currentDate, filters } = useScheduleStore();

  // Fetch work orders
  const {
    data: workOrdersData,
    isLoading,
    isError,
  } = useWorkOrders({
    page: 1,
    page_size: 200,
  });

  // Generate week days
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const today = formatDateKey(new Date());

  // Group work orders by date
  const workOrdersByDate = useMemo(() => {
    const workOrders = workOrdersData?.items || [];
    const grouped: Record<string, WorkOrder[]> = {};

    // Initialize all days
    weekDays.forEach((day) => {
      grouped[formatDateKey(day)] = [];
    });

    // Group work orders
    workOrders.forEach((wo) => {
      if (!wo.scheduled_date) return;

      // Apply technician filter
      if (filters.technician && wo.assigned_technician !== filters.technician)
        return;

      // Apply status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(wo.status))
        return;

      const dateKey = wo.scheduled_date;
      if (grouped[dateKey]) {
        grouped[dateKey].push(wo);
      }
    });

    // Sort each day by time
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => {
        const timeA = a.time_window_start || "99:99";
        const timeB = b.time_window_start || "99:99";
        return timeA.localeCompare(timeB);
      });
    });

    return grouped;
  }, [workOrdersData, weekDays, filters]);

  return (
    <div className="grid grid-cols-7 gap-4">
      {weekDays.map((day) => {
        const dateKey = formatDateKey(day);
        const isToday = dateKey === today;
        const dayOrders = workOrdersByDate[dateKey] || [];

        return (
          <DroppableDay
            key={dateKey}
            date={day}
            isToday={isToday}
            workOrders={dayOrders}
            isLoading={isLoading}
            isError={isError}
            technician={filters.technician || undefined}
          />
        );
      })}
    </div>
  );
}
