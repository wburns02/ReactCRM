import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge.tsx';
import { useWorkOrders } from '@/api/hooks/useWorkOrders.ts';
import { useTechnicians } from '@/api/hooks/useTechnicians.ts';
import {
  type WorkOrder,
  type WorkOrderStatus,
  type JobType,
  type Priority,
  WORK_ORDER_STATUS_LABELS,
  JOB_TYPE_LABELS,
} from '@/api/types/workOrder.ts';
import {
  formatDateKey,
  generateTimeSlots,
  SCHEDULE_CONFIG,
  type DropTargetData,
} from '@/api/types/schedule.ts';
import { useScheduleStore } from '../store/scheduleStore.ts';

/**
 * Get priority color class
 */
function getPriorityBgColor(priority: Priority): string {
  switch (priority) {
    case 'emergency':
      return 'bg-red-100 border-red-400';
    case 'urgent':
      return 'bg-orange-100 border-orange-400';
    case 'high':
      return 'bg-yellow-100 border-yellow-400';
    default:
      return 'bg-blue-100 border-blue-400';
  }
}

/**
 * Get status badge variant
 */
function getStatusVariant(status: WorkOrderStatus): 'default' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'canceled':
      return 'danger';
    case 'enroute':
    case 'on_site':
    case 'in_progress':
      return 'warning';
    default:
      return 'default';
  }
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
    const durationHours = workOrder.estimated_duration_hours || 1;

    return (
      <div
        ref={setNodeRef}
        className={`
          relative h-16 border-b border-r border-border
          ${isLunchHour ? 'bg-gray-100' : ''}
        `}
      >
        <Link
          to={`/app/work-orders/${workOrder.id}`}
          className={`
            absolute inset-1 rounded border-l-4 p-1.5 overflow-hidden
            hover:shadow-md transition-shadow cursor-pointer
            ${getPriorityBgColor(workOrder.priority as Priority)}
          `}
          style={{
            height: `calc(${durationHours * 100}% - 8px)`,
            minHeight: '56px',
          }}
        >
          <div className="flex items-start justify-between gap-1">
            <span className="text-xs font-medium text-text-primary truncate">
              {workOrder.customer_name || `#${workOrder.customer_id}`}
            </span>
            <Badge
              variant={getStatusVariant(workOrder.status as WorkOrderStatus)}
              className="text-[9px] px-1 py-0 shrink-0"
            >
              {WORK_ORDER_STATUS_LABELS[workOrder.status as WorkOrderStatus]?.slice(0, 3)}
            </Badge>
          </div>
          <p className="text-[10px] text-text-secondary truncate">
            {JOB_TYPE_LABELS[workOrder.job_type as JobType]}
          </p>
        </Link>
      </div>
    );
  }

  // Empty slot - droppable
  return (
    <div
      ref={setNodeRef}
      className={`
        h-16 border-b border-r border-border transition-colors
        ${isLunchHour ? 'bg-gray-100' : 'bg-white'}
        ${isOver ? 'bg-primary/20 ring-2 ring-primary ring-inset' : ''}
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

  // Fetch data
  const { data: workOrdersData, isLoading, isError } = useWorkOrders({
    page: 1,
    page_size: 200,
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
        (t) => `${t.first_name} ${t.last_name}` === filters.technician
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
      if (filters.statuses.length > 0 && !filters.statuses.includes(wo.status)) return;

      // Parse hour from time_window_start
      let hour: number = SCHEDULE_CONFIG.WORK_HOURS.start;
      if (wo.time_window_start) {
        const parsed = parseInt(wo.time_window_start.split(':')[0], 10);
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
            <p className="text-xs text-text-muted">{tech.phone || 'No phone'}</p>
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
                ${slot.isLunchHour ? 'bg-gray-100 text-text-muted' : 'text-text-secondary'}
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
  );
}
