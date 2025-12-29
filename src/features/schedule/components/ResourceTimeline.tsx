import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { format, startOfWeek, addDays, addHours, isSameDay, parseISO } from 'date-fns';
import { useWorkOrders } from '@/api/hooks/useWorkOrders.ts';
import { useTechnicians } from '@/api/hooks/useTechnicians.ts';
import { useScheduleStore } from '../store/scheduleStore.ts';
import {
  type WorkOrder,
  type Priority,
  type JobType,
  JOB_TYPE_LABELS,
} from '@/api/types/workOrder.ts';

/**
 * Priority color mapping
 */
const PRIORITY_COLORS: Record<Priority, string> = {
  emergency: 'bg-red-500 border-red-600',
  urgent: 'bg-orange-500 border-orange-600',
  high: 'bg-yellow-500 border-yellow-600',
  normal: 'bg-blue-500 border-blue-600',
  low: 'bg-gray-400 border-gray-500',
};

const PRIORITY_BG_COLORS: Record<Priority, string> = {
  emergency: 'bg-red-100',
  urgent: 'bg-orange-100',
  high: 'bg-yellow-100',
  normal: 'bg-blue-100',
  low: 'bg-gray-100',
};

/**
 * Technician row header
 */
interface TechnicianHeaderProps {
  technician: {
    id: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
  };
  workOrderCount: number;
  totalHours: number;
}

function TechnicianHeader({ technician, workOrderCount, totalHours }: TechnicianHeaderProps) {
  return (
    <div className="sticky left-0 z-10 bg-bg-card border-r border-border p-3 min-w-[180px]">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${technician.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
        <span className="font-medium text-sm text-text-primary truncate">
          {technician.first_name} {technician.last_name}
        </span>
      </div>
      <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
        <span>{workOrderCount} jobs</span>
        <span>{totalHours.toFixed(1)}h</span>
      </div>
    </div>
  );
}

/**
 * Droppable time slot cell
 */
interface TimeSlotCellProps {
  technicianId: string;
  date: Date;
  hour: number;
  workOrders: WorkOrder[];
}

function TimeSlotCell({ technicianId, date, hour, workOrders }: TimeSlotCellProps) {
  const cellId = `${technicianId}-${format(date, 'yyyy-MM-dd')}-${hour}`;

  const { setNodeRef, isOver } = useDroppable({
    id: cellId,
    data: {
      technicianId,
      date: format(date, 'yyyy-MM-dd'),
      hour,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[60px] border-r border-b border-border p-1
        transition-colors
        ${isOver ? 'bg-primary/20 ring-2 ring-primary ring-inset' : 'hover:bg-bg-hover'}
        ${hour === 12 ? 'border-r-2 border-r-border' : ''}
      `}
    >
      {workOrders.map((wo) => (
        <WorkOrderBlock key={wo.id} workOrder={wo} />
      ))}
    </div>
  );
}

/**
 * Work order block displayed in timeline
 */
function WorkOrderBlock({ workOrder }: { workOrder: WorkOrder }) {
  const priority = (workOrder.priority as Priority) || 'normal';
  const duration = workOrder.estimated_duration_hours || 1;

  return (
    <div
      className={`
        p-1.5 rounded text-xs mb-1 cursor-pointer
        border-l-4 ${PRIORITY_COLORS[priority]}
        ${PRIORITY_BG_COLORS[priority]}
        hover:shadow-md transition-shadow
      `}
      style={{
        minWidth: `${Math.max(duration, 1) * 60 - 8}px`,
      }}
      title={`${workOrder.customer_name} - ${JOB_TYPE_LABELS[workOrder.job_type as JobType] || workOrder.job_type}`}
    >
      <div className="font-medium text-text-primary truncate">
        {workOrder.customer_name || `WO #${workOrder.id}`}
      </div>
      <div className="text-text-muted truncate">
        {JOB_TYPE_LABELS[workOrder.job_type as JobType] || workOrder.job_type}
      </div>
    </div>
  );
}

/**
 * ResourceTimeline - Week view with technicians as rows
 *
 * Shows a resource timeline where:
 * - Rows = Technicians
 * - Columns = Days of the week with hourly slots
 * - Work orders are displayed as blocks on the timeline
 * - Droppable cells allow scheduling via drag-drop
 */
export function ResourceTimeline() {
  const { currentDate, filters } = useScheduleStore();
  const { data: workOrdersData } = useWorkOrders();
  const { data: techniciansData } = useTechnicians();

  // Calculate week dates
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Business hours (7 AM to 6 PM)
  const hours = Array.from({ length: 12 }, (_, i) => i + 7);

  // Get technicians
  const technicians = useMemo(() => {
    let techs = techniciansData?.items || [];

    // Filter by selected technician name
    if (filters.technician) {
      techs = techs.filter((t) =>
        `${t.first_name} ${t.last_name}` === filters.technician
      );
    }

    return techs;
  }, [techniciansData?.items, filters.technician]);

  // Group work orders by technician and date/time
  const workOrdersByTechAndSlot = useMemo(() => {
    const map = new Map<string, WorkOrder[]>();
    const workOrders = workOrdersData?.items || [];

    workOrders.forEach((wo) => {
      if (!wo.assigned_technician || !wo.scheduled_date) return;

      // Filter by status
      if (filters.status && wo.status !== filters.status) return;

      const scheduledDate = parseISO(wo.scheduled_date);
      // Parse time from time_window_start if available
      const scheduledHour = wo.time_window_start
        ? parseInt(wo.time_window_start.split(':')[0], 10)
        : 8; // Default to 8 AM

      const key = `${wo.assigned_technician}-${format(scheduledDate, 'yyyy-MM-dd')}-${scheduledHour}`;

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(wo);
    });

    return map;
  }, [workOrdersData?.items, filters.status]);

  // Calculate stats per technician
  const techStats = useMemo(() => {
    const stats = new Map<string, { count: number; hours: number }>();
    const workOrders = workOrdersData?.items || [];

    workOrders.forEach((wo) => {
      if (!wo.assigned_technician) return;

      const techName = wo.assigned_technician;
      if (!stats.has(techName)) {
        stats.set(techName, { count: 0, hours: 0 });
      }

      const s = stats.get(techName)!;
      s.count++;
      s.hours += wo.estimated_duration_hours || 0;
    });

    return stats;
  }, [workOrdersData?.items]);

  // Get work orders for a specific slot
  const getWorkOrdersForSlot = (techName: string, date: Date, hour: number) => {
    const key = `${techName}-${format(date, 'yyyy-MM-dd')}-${hour}`;
    return workOrdersByTechAndSlot.get(key) || [];
  };

  if (technicians.length === 0) {
    return (
      <div className="bg-bg-card border border-border rounded-lg p-8 text-center text-text-muted">
        No technicians found. Add technicians to see the schedule.
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
      {/* Timeline container */}
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Header row - dates */}
          <div className="flex border-b border-border sticky top-0 z-20 bg-bg-card">
            {/* Empty corner cell */}
            <div className="sticky left-0 z-30 bg-bg-card border-r border-border min-w-[180px] p-3">
              <span className="font-medium text-sm text-text-secondary">Technicians</span>
            </div>

            {/* Day headers */}
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className="flex-1 min-w-[720px] border-r border-border last:border-r-0"
              >
                <div
                  className={`
                    p-2 text-center font-medium text-sm border-b border-border
                    ${isSameDay(day, new Date()) ? 'bg-primary/10 text-primary' : 'text-text-primary'}
                  `}
                >
                  {format(day, 'EEE, MMM d')}
                </div>

                {/* Hour headers */}
                <div className="flex">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className={`
                        flex-1 p-1 text-center text-xs text-text-muted border-r border-border
                        ${hour === 12 ? 'border-r-2 font-medium' : ''}
                      `}
                    >
                      {format(addHours(new Date().setHours(0, 0, 0, 0), hour), 'ha')}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Technician rows */}
          {technicians.map((tech) => {
            const techName = `${tech.first_name} ${tech.last_name}`;
            const stats = techStats.get(techName) || { count: 0, hours: 0 };

            return (
              <div key={tech.id} className="flex border-b border-border last:border-b-0">
                {/* Technician info */}
                <TechnicianHeader
                  technician={tech}
                  workOrderCount={stats.count}
                  totalHours={stats.hours}
                />

                {/* Day columns */}
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className="flex-1 min-w-[720px] flex"
                  >
                    {/* Hour cells */}
                    {hours.map((hour) => (
                      <div key={hour} className="flex-1">
                        <TimeSlotCell
                          technicianId={tech.id}
                          date={day}
                          hour={hour}
                          workOrders={getWorkOrdersForSlot(techName, day, hour)}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-border bg-bg-subtle flex items-center gap-4 text-xs">
        <span className="text-text-secondary font-medium">Priority:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded" />
          <span className="text-text-muted">Emergency</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-orange-500 rounded" />
          <span className="text-text-muted">Urgent</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-500 rounded" />
          <span className="text-text-muted">High</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span className="text-text-muted">Normal</span>
        </div>
        <span className="text-text-muted ml-auto">
          Scroll horizontally to see all hours • Drop jobs from table above
        </span>
      </div>
    </div>
  );
}
