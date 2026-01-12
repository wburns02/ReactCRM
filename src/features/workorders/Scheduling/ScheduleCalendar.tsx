/**
 * ScheduleCalendar Component
 * Full calendar view with Month/Week/Day views for work order scheduling
 */

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from "date-fns";
import type { WorkOrder, WorkOrderStatus } from "@/api/types/workOrder.ts";
import {
  STATUS_COLORS,
  WORK_ORDER_STATUS_LABELS,
} from "@/api/types/workOrder.ts";

type ViewMode = "month" | "week" | "day";

interface ScheduleCalendarProps {
  workOrders: WorkOrder[];
  onSelectWorkOrder?: (workOrder: WorkOrder) => void;
  onDateChange?: (date: Date) => void;
  onSelectDate?: (date: Date) => void;
  selectedDate?: Date;
  className?: string;
}

/**
 * Get status badge variant based on work order status
 */
function getStatusVariant(
  status: WorkOrderStatus,
): "default" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "completed":
      return "success";
    case "canceled":
      return "danger";
    case "in_progress":
    case "on_site":
      return "info";
    case "enroute":
    case "requires_followup":
      return "warning";
    default:
      return "default";
  }
}

export function ScheduleCalendar({
  workOrders,
  onSelectWorkOrder,
  onDateChange,
  onSelectDate,
  selectedDate: externalSelectedDate,
  className,
}: ScheduleCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [internalSelectedDate, setInternalSelectedDate] = useState<Date | null>(
    null,
  );

  const selectedDate = externalSelectedDate || internalSelectedDate;

  // Group work orders by date
  const workOrdersByDate = useMemo(() => {
    const map = new Map<string, WorkOrder[]>();
    workOrders.forEach((wo) => {
      if (wo.scheduled_date) {
        const dateKey = wo.scheduled_date;
        const existing = map.get(dateKey) || [];
        existing.push(wo);
        map.set(dateKey, existing);
      }
    });
    return map;
  }, [workOrders]);

  // Navigation handlers
  const navigate = useCallback(
    (direction: "prev" | "next") => {
      const newDate =
        direction === "prev"
          ? viewMode === "month"
            ? subMonths(currentDate, 1)
            : viewMode === "week"
              ? subWeeks(currentDate, 1)
              : subDays(currentDate, 1)
          : viewMode === "month"
            ? addMonths(currentDate, 1)
            : viewMode === "week"
              ? addWeeks(currentDate, 1)
              : addDays(currentDate, 1);

      setCurrentDate(newDate);
      onDateChange?.(newDate);
    },
    [currentDate, viewMode, onDateChange],
  );

  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    onDateChange?.(today);
  }, [onDateChange]);

  const handleDateSelect = useCallback(
    (date: Date) => {
      setInternalSelectedDate(date);
      onSelectDate?.(date);
    },
    [onSelectDate],
  );

  // Get calendar days based on view mode
  const calendarDays = useMemo(() => {
    if (viewMode === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart);
      const calendarEnd = endOfWeek(monthEnd);
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      return [currentDate];
    }
  }, [currentDate, viewMode]);

  // Render calendar header
  const renderHeader = () => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate("prev")}>
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Button>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Today
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("next")}>
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Button>
        <h2 className="text-lg font-semibold text-text-primary ml-4">
          {viewMode === "month"
            ? format(currentDate, "MMMM yyyy")
            : viewMode === "week"
              ? `Week of ${format(startOfWeek(currentDate), "MMM d, yyyy")}`
              : format(currentDate, "EEEE, MMMM d, yyyy")}
        </h2>
      </div>
      <div className="flex items-center gap-1 bg-bg-muted rounded-lg p-1">
        {(["month", "week", "day"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
              viewMode === mode
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  );

  // Render month view
  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
      {/* Day headers */}
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
        <div
          key={day}
          className="bg-bg-muted p-2 text-center text-xs font-medium text-text-secondary"
        >
          {day}
        </div>
      ))}
      {/* Calendar days */}
      {calendarDays.map((day) => {
        const dateKey = format(day, "yyyy-MM-dd");
        const dayWorkOrders = workOrdersByDate.get(dateKey) || [];
        const isCurrentMonth = isSameMonth(day, currentDate);
        const isSelected = selectedDate && isSameDay(day, selectedDate);

        return (
          <div
            key={dateKey}
            onClick={() => handleDateSelect(day)}
            className={cn(
              "bg-bg-card min-h-[100px] p-2 cursor-pointer transition-colors hover:bg-bg-hover",
              !isCurrentMonth && "opacity-50",
              isSelected && "ring-2 ring-primary ring-inset",
              isToday(day) && "bg-primary/5",
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={cn(
                  "text-sm font-medium",
                  isToday(day)
                    ? "bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center"
                    : "text-text-primary",
                )}
              >
                {format(day, "d")}
              </span>
              {dayWorkOrders.length > 0 && (
                <Badge variant="default" size="sm">
                  {dayWorkOrders.length}
                </Badge>
              )}
            </div>
            <div className="space-y-1 max-h-[60px] overflow-y-auto">
              {dayWorkOrders.slice(0, 3).map((wo) => (
                <button
                  key={wo.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectWorkOrder?.(wo);
                  }}
                  className="w-full text-left"
                >
                  <div
                    className="text-xs px-1.5 py-0.5 rounded truncate"
                    style={{
                      backgroundColor: `${STATUS_COLORS[wo.status]}20`,
                      color: STATUS_COLORS[wo.status],
                    }}
                  >
                    {wo.time_window_start?.slice(0, 5)}{" "}
                    {wo.customer_name || `#${wo.customer_id}`}
                  </div>
                </button>
              ))}
              {dayWorkOrders.length > 3 && (
                <div className="text-xs text-text-muted px-1.5">
                  +{dayWorkOrders.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Render week view
  const renderWeekView = () => (
    <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
      {/* Day headers */}
      {calendarDays.map((day) => (
        <div
          key={format(day, "yyyy-MM-dd")}
          className={cn(
            "bg-bg-muted p-3 text-center",
            isToday(day) && "bg-primary/10",
          )}
        >
          <div className="text-xs font-medium text-text-secondary">
            {format(day, "EEE")}
          </div>
          <div
            className={cn(
              "text-lg font-semibold",
              isToday(day)
                ? "bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                : "text-text-primary",
            )}
          >
            {format(day, "d")}
          </div>
        </div>
      ))}
      {/* Day content */}
      {calendarDays.map((day) => {
        const dateKey = format(day, "yyyy-MM-dd");
        const dayWorkOrders = workOrdersByDate.get(dateKey) || [];
        const isSelected = selectedDate && isSameDay(day, selectedDate);

        return (
          <div
            key={dateKey}
            onClick={() => handleDateSelect(day)}
            className={cn(
              "bg-bg-card min-h-[300px] p-2 cursor-pointer transition-colors hover:bg-bg-hover",
              isSelected && "ring-2 ring-primary ring-inset",
            )}
          >
            <div className="space-y-1">
              {dayWorkOrders.map((wo) => (
                <button
                  key={wo.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectWorkOrder?.(wo);
                  }}
                  className="w-full text-left"
                >
                  <div
                    className="p-2 rounded text-xs border-l-2"
                    style={{
                      backgroundColor: `${STATUS_COLORS[wo.status]}10`,
                      borderLeftColor: STATUS_COLORS[wo.status],
                    }}
                  >
                    <div className="font-medium text-text-primary truncate">
                      {wo.time_window_start?.slice(0, 5) || "TBD"}
                    </div>
                    <div className="text-text-secondary truncate">
                      {wo.customer_name || `Customer #${wo.customer_id}`}
                    </div>
                    <Badge
                      variant={getStatusVariant(wo.status)}
                      size="sm"
                      className="mt-1"
                    >
                      {WORK_ORDER_STATUS_LABELS[wo.status]}
                    </Badge>
                  </div>
                </button>
              ))}
              {dayWorkOrders.length === 0 && (
                <div className="text-center py-8 text-text-muted text-sm">
                  No appointments
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Render day view
  const renderDayView = () => {
    const dateKey = format(currentDate, "yyyy-MM-dd");
    const dayWorkOrders = workOrdersByDate.get(dateKey) || [];

    // Time slots from 6am to 8pm
    const timeSlots = Array.from({ length: 15 }, (_, i) => i + 6);

    return (
      <div className="bg-bg-card rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-[60px_1fr]">
          {timeSlots.map((hour) => {
            const slotWorkOrders = dayWorkOrders.filter((wo) => {
              if (!wo.time_window_start) return false;
              const [woHour] = wo.time_window_start.split(":").map(Number);
              return woHour === hour;
            });

            return (
              <div key={hour} className="contents">
                {/* Time label */}
                <div className="border-b border-r border-border p-2 text-xs text-text-secondary text-right pr-3">
                  {format(new Date().setHours(hour, 0), "h a")}
                </div>
                {/* Slot content */}
                <div className="border-b border-border p-2 min-h-[60px]">
                  {slotWorkOrders.map((wo) => (
                    <button
                      key={wo.id}
                      onClick={() => onSelectWorkOrder?.(wo)}
                      className="w-full text-left mb-1"
                    >
                      <div
                        className="p-2 rounded border-l-4"
                        style={{
                          backgroundColor: `${STATUS_COLORS[wo.status]}10`,
                          borderLeftColor: STATUS_COLORS[wo.status],
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-text-primary">
                            {wo.customer_name || `Customer #${wo.customer_id}`}
                          </span>
                          <Badge
                            variant={getStatusVariant(wo.status)}
                            size="sm"
                          >
                            {WORK_ORDER_STATUS_LABELS[wo.status]}
                          </Badge>
                        </div>
                        <div className="text-xs text-text-secondary mt-1">
                          {wo.time_window_start?.slice(0, 5)} -{" "}
                          {wo.time_window_end?.slice(0, 5) || "TBD"}
                          {wo.estimated_duration_hours && (
                            <span className="ml-2">
                              ({wo.estimated_duration_hours}h)
                            </span>
                          )}
                        </div>
                        {wo.service_city && (
                          <div className="text-xs text-text-muted mt-1">
                            {wo.service_city}, {wo.service_state}
                          </div>
                        )}
                        {wo.assigned_technician && (
                          <div className="text-xs text-text-muted">
                            Tech: {wo.assigned_technician}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("", className)}>
      {renderHeader()}
      {viewMode === "month" && renderMonthView()}
      {viewMode === "week" && renderWeekView()}
      {viewMode === "day" && renderDayView()}
    </div>
  );
}
