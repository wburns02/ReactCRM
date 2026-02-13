import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/Badge.tsx";
import {
  useWorkOrders,
  useUpdateWorkOrderDuration,
} from "@/api/hooks/useWorkOrders.ts";
import { useTechnicians } from "@/api/hooks/useTechnicians.ts";
import {
  type WorkOrder,
  type WorkOrderStatus,
  type JobType,
  type Priority,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_SHORT,
  JOB_TYPE_LABELS,
} from "@/api/types/workOrder.ts";
import {
  formatDateKey,
  generateTimeSlots,
  SCHEDULE_CONFIG,
  type DropTargetData,
} from "@/api/types/schedule.ts";
import { useScheduleStore } from "../store/scheduleStore.ts";
import { useContextMenu } from "../context/ContextMenuContext.tsx";

/** Height of one hour slot in pixels */
const HOUR_HEIGHT = 64;

/** Minimum duration in hours */
const MIN_DURATION = 0.5;

/** Maximum duration in hours */
const MAX_DURATION = 8;

/**
 * Get priority color class
 */
function getPriorityBgColor(priority: Priority): string {
  switch (priority) {
    case "emergency":
      return "bg-red-100 border-red-400";
    case "urgent":
      return "bg-orange-100 border-orange-400";
    case "high":
      return "bg-yellow-100 border-yellow-400";
    default:
      return "bg-blue-100 border-blue-400";
  }
}

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
      return "warning";
    default:
      return "default";
  }
}

/**
 * Draggable and resizable work order block for day view
 */
function DraggableWorkOrderBlock({ workOrder }: { workOrder: WorkOrder }) {
  const updateDuration = useUpdateWorkOrderDuration();
  const { openMenu } = useContextMenu();
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDuration, setResizeDuration] = useState<number | null>(null);
  const startY = useRef(0);
  const startDuration = useRef(0);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `scheduled-${workOrder.id}`,
      data: {
        workOrder,
        isScheduled: true,
        originalDate: workOrder.scheduled_date,
        originalTechnician: workOrder.assigned_technician,
      },
      disabled: isResizing,
    });

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsResizing(true);
      startY.current = e.clientY;
      startDuration.current = workOrder.estimated_duration_hours || 1;
      setResizeDuration(startDuration.current);
    },
    [workOrder.estimated_duration_hours],
  );

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      const deltaY = e.clientY - startY.current;
      const deltaHours = deltaY / HOUR_HEIGHT;
      const newDuration = Math.max(
        MIN_DURATION,
        Math.min(MAX_DURATION, startDuration.current + deltaHours),
      );
      setResizeDuration(Math.round(newDuration * 2) / 2); // Round to nearest 0.5
    },
    [isResizing],
  );

  const handleResizeEnd = useCallback(() => {
    if (!isResizing || resizeDuration === null) return;
    setIsResizing(false);

    // Only update if duration changed
    if (resizeDuration !== (workOrder.estimated_duration_hours || 1)) {
      updateDuration.mutate({
        id: workOrder.id,
        durationHours: resizeDuration,
      });
    }
    setResizeDuration(null);
  }, [
    isResizing,
    resizeDuration,
    workOrder.id,
    workOrder.estimated_duration_hours,
    updateDuration,
  ]);

  // Add global mouse listeners when resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
      return () => {
        document.removeEventListener("mousemove", handleResizeMove);
        document.removeEventListener("mouseup", handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const displayDuration =
    resizeDuration ?? (workOrder.estimated_duration_hours || 1);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        height: `${displayDuration * HOUR_HEIGHT - 8}px`,
        minHeight: "56px",
      }}
      {...attributes}
      {...(isResizing ? {} : listeners)}
      onContextMenu={(e) => openMenu(e, workOrder)}
      data-testid={`scheduled-wo-${workOrder.id}`}
      className={`
        absolute inset-1 rounded border-l-4 p-1.5 overflow-hidden
        hover:shadow-md transition-shadow
        ${isResizing ? "cursor-ns-resize" : "cursor-grab active:cursor-grabbing"}
        ${getPriorityBgColor(workOrder.priority as Priority)}
        ${isDragging ? "shadow-lg ring-2 ring-primary z-50" : ""}
        ${isResizing ? "ring-2 ring-primary z-50" : ""}
      `}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-xs font-medium text-text-primary truncate">
          {workOrder.customer_name || `#${workOrder.customer_id}`}
        </span>
        <Badge
          variant={getStatusVariant(workOrder.status as WorkOrderStatus)}
          className="text-[9px] px-1 py-0 shrink-0"
        >
          {WORK_ORDER_STATUS_SHORT[workOrder.status] ||
            WORK_ORDER_STATUS_LABELS[workOrder.status as WorkOrderStatus]?.slice(0, 4)}
        </Badge>
      </div>
      <p className="text-[10px] text-text-secondary truncate">
        {JOB_TYPE_LABELS[workOrder.job_type as JobType]}
      </p>
      {isResizing && (
        <div className="absolute bottom-1 right-1 text-[9px] font-medium text-primary bg-white/80 px-1 rounded">
          {displayDuration}h
        </div>
      )}
      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-primary/20 transition-colors group"
        title="Drag to resize"
      >
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

/**
 * Droppable time slot cell
 */
function TimeSlotCell({
  date,
  hour,
  technicianName,
  workOrder,
  isLunchHour,
}: {
  date: string;
  hour: number;
  technicianName: string;
  workOrder?: WorkOrder;
  isLunchHour: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${date}-${technicianName}-${hour}`,
    data: {
      date,
      technician: technicianName,
      hour,
    } as DropTargetData,
  });

  // Render work order if assigned to this slot
  if (workOrder) {
    return (
      <div
        ref={setNodeRef}
        className={`
          relative h-16 border-b border-r border-border
          ${isLunchHour ? "bg-gray-100" : ""}
        `}
      >
        <DraggableWorkOrderBlock workOrder={workOrder} />
      </div>
    );
  }

  // Empty slot - droppable
  return (
    <div
      ref={setNodeRef}
      className={`
        h-16 border-b border-r border-border transition-colors
        ${isLunchHour ? "bg-gray-100" : "bg-white"}
        ${isOver ? "bg-primary/20 ring-2 ring-primary ring-inset" : ""}
      `}
    >
      {isOver && (
        <div className="h-full flex items-center justify-center text-xs text-primary font-medium">
          Drop here
        </div>
      )}
    </div>
  );
}

/**
 * Day View - Hourly schedule grid with technician columns
 */
export function DayView() {
  const { currentDate, filters } = useScheduleStore();
  const dateKey = formatDateKey(currentDate);

  // Fetch data with date filtering for current day only
  const {
    data: workOrdersData,
    isLoading,
    isFetching,
    isError,
  } = useWorkOrders({
    page: 1,
    page_size: 200,
    scheduled_date_from: dateKey,
    scheduled_date_to: dateKey,
  });

  const { data: techniciansData } = useTechnicians({
    page: 1,
    page_size: 100,
    active_only: true,
  });

  // Generate time slots
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  // Filter technicians
  const technicians = useMemo(() => {
    let techs = techniciansData?.items || [];
    if (filters.technician) {
      techs = techs.filter(
        (t) => `${t.first_name} ${t.last_name}` === filters.technician,
      );
    }
    return techs;
  }, [techniciansData, filters.technician]);

  // Group work orders by technician and hour
  const workOrdersByTechAndHour = useMemo(() => {
    const workOrders = workOrdersData?.items || [];
    const grouped: Record<string, Record<number, WorkOrder>> = {};

    // Initialize for all technicians
    technicians.forEach((tech) => {
      const techName = `${tech.first_name} ${tech.last_name}`;
      grouped[techName] = {};
    });

    // Group work orders
    workOrders.forEach((wo) => {
      if (wo.scheduled_date !== dateKey) return;
      if (!wo.assigned_technician) return;

      // Apply status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(wo.status))
        return;

      // Parse hour from time_window_start
      let hour: number = SCHEDULE_CONFIG.WORK_HOURS.start;
      if (wo.time_window_start) {
        const parsed = parseInt(wo.time_window_start.split(":")[0], 10);
        if (!isNaN(parsed)) hour = parsed;
      }

      if (!grouped[wo.assigned_technician]) {
        grouped[wo.assigned_technician] = {};
      }
      grouped[wo.assigned_technician][hour] = wo;
    });

    return grouped;
  }, [workOrdersData, dateKey, technicians, filters.statuses]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-border p-8 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-bg-muted rounded w-1/3 mx-auto" />
          <div className="h-64 bg-bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg border border-border p-8 text-center text-danger">
        Failed to load schedule
      </div>
    );
  }

  if (technicians.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-border p-8 text-center text-text-muted">
        No technicians available. Add technicians to see the day view.
      </div>
    );
  }

  return (
    <div className="relative" data-testid="day-view">
      {/* Loading overlay during navigation */}
      {isFetching && !isLoading && (
        <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center rounded-lg">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            <p className="text-sm text-gray-600">Loading day view...</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-border overflow-hidden">
        {/* Header row with technician names */}
        <div className="flex border-b border-border bg-bg-muted sticky top-0 z-10">
        {/* Time column header */}
        <div className="w-20 shrink-0 p-2 border-r border-border font-medium text-xs text-text-secondary">
          Time
        </div>
        {/* Technician column headers */}
        {technicians.map((tech) => (
          <div
            key={tech.id}
            className="flex-1 min-w-[150px] p-2 border-r border-border text-center"
          >
            <p className="font-medium text-sm text-text-primary">
              {tech.first_name} {tech.last_name}
            </p>
            <p className="text-xs text-text-muted">
              {tech.phone || "No phone"}
            </p>
          </div>
        ))}
      </div>

      {/* Time slots grid */}
      <div className="overflow-auto max-h-[calc(100vh-350px)]">
        {timeSlots.map((slot) => (
          <div key={slot.hour} className="flex">
            {/* Time label */}
            <div
              className={`
                w-20 shrink-0 p-2 border-r border-b border-border text-xs font-medium
                ${slot.isLunchHour ? "bg-gray-100 text-text-muted" : "text-text-secondary"}
              `}
            >
              {slot.label}
              {slot.isLunchHour && (
                <span className="block text-[10px] text-text-muted">Lunch</span>
              )}
            </div>
            {/* Technician cells */}
            {technicians.map((tech) => {
              const techName = `${tech.first_name} ${tech.last_name}`;
              const workOrder = workOrdersByTechAndHour[techName]?.[slot.hour];

              return (
                <div key={tech.id} className="flex-1 min-w-[150px]">
                  <TimeSlotCell
                    date={dateKey}
                    hour={slot.hour}
                    technicianName={techName}
                    workOrder={workOrder}
                    isLunchHour={slot.isLunchHour}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}
