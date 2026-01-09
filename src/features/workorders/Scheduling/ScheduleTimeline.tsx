/**
 * ScheduleTimeline Component
 * Vertical daily timeline showing work orders with technician lanes
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils.ts';
import { Badge } from '@/components/ui/Badge.tsx';
import { format, parseISO } from 'date-fns';
import type { WorkOrder, WorkOrderStatus } from '@/api/types/workOrder.ts';
import { STATUS_COLORS, WORK_ORDER_STATUS_LABELS, JOB_TYPE_LABELS } from '@/api/types/workOrder.ts';

interface ScheduleTimelineProps {
  date: string;
  workOrders: WorkOrder[];
  onSelectWorkOrder?: (workOrder: WorkOrder) => void;
  groupByTechnician?: boolean;
  startHour?: number;
  endHour?: number;
  className?: string;
}

/**
 * Get status badge variant
 */
function getStatusVariant(status: WorkOrderStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'canceled':
      return 'danger';
    case 'in_progress':
    case 'on_site':
      return 'info';
    case 'enroute':
    case 'requires_followup':
      return 'warning';
    default:
      return 'default';
  }
}

/**
 * Parse time string to hours (decimal)
 */
function parseTimeToHours(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
}

export function ScheduleTimeline({
  date,
  workOrders,
  onSelectWorkOrder,
  groupByTechnician = false,
  startHour = 6,
  endHour = 20,
  className,
}: ScheduleTimelineProps) {
  // Filter work orders for the given date
  const dayWorkOrders = useMemo(() => {
    return workOrders.filter((wo) => wo.scheduled_date === date);
  }, [workOrders, date]);

  // Group by technician if enabled
  const groupedWorkOrders = useMemo(() => {
    if (!groupByTechnician) {
      return { 'All Jobs': dayWorkOrders };
    }

    const groups: Record<string, WorkOrder[]> = {};
    dayWorkOrders.forEach((wo) => {
      const tech = wo.assigned_technician || 'Unassigned';
      if (!groups[tech]) {
        groups[tech] = [];
      }
      groups[tech].push(wo);
    });

    return groups;
  }, [dayWorkOrders, groupByTechnician]);

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots: number[] = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(hour);
    }
    return slots;
  }, [startHour, endHour]);

  const totalHours = endHour - startHour;
  const hourHeight = 60; // pixels per hour

  // Calculate position and height for a work order
  const getWorkOrderStyle = (wo: WorkOrder) => {
    if (!wo.time_window_start) return null;

    const startTime = parseTimeToHours(wo.time_window_start);
    const duration = wo.estimated_duration_hours || 1;
    const top = (startTime - startHour) * hourHeight;
    const height = Math.max(duration * hourHeight - 4, 24); // Min height 24px

    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  // Format time for display
  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:00 ${ampm}`;
  };

  // Get current time indicator position
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const isToday = date === format(now, 'yyyy-MM-dd');
  const currentTimeTop =
    isToday && currentHour >= startHour && currentHour <= endHour
      ? (currentHour - startHour) * hourHeight
      : null;

  const technicianLanes = Object.keys(groupedWorkOrders);

  return (
    <div className={cn('bg-bg-card rounded-lg border border-border overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-muted">
        <h3 className="font-semibold text-text-primary">
          {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
        </h3>
        <Badge variant="default">
          {dayWorkOrders.length} job{dayWorkOrders.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Timeline container */}
      <div className="flex overflow-x-auto">
        {/* Time labels column */}
        <div className="flex-shrink-0 w-16 border-r border-border bg-bg-muted">
          {timeSlots.map((hour) => (
            <div
              key={hour}
              className="h-[60px] border-b border-border px-2 flex items-start pt-1"
            >
              <span className="text-xs text-text-secondary font-medium">
                {formatHour(hour)}
              </span>
            </div>
          ))}
        </div>

        {/* Technician lanes */}
        <div className="flex flex-1">
          {technicianLanes.map((tech) => (
            <div
              key={tech}
              className={cn(
                'flex-1 min-w-[200px] border-r border-border last:border-r-0',
                technicianLanes.length > 1 && 'max-w-[300px]'
              )}
            >
              {/* Lane header */}
              {groupByTechnician && (
                <div className="sticky top-0 bg-bg-muted border-b border-border px-3 py-2 z-10">
                  <span className="text-sm font-medium text-text-primary">{tech}</span>
                  <span className="text-xs text-text-secondary ml-2">
                    ({groupedWorkOrders[tech].length})
                  </span>
                </div>
              )}

              {/* Timeline grid */}
              <div
                className="relative"
                style={{ height: `${totalHours * hourHeight}px` }}
              >
                {/* Hour grid lines */}
                {timeSlots.map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full border-b border-border"
                    style={{ top: `${(hour - startHour) * hourHeight}px`, height: `${hourHeight}px` }}
                  />
                ))}

                {/* Current time indicator */}
                {currentTimeTop !== null && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: `${currentTimeTop}px` }}
                  >
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-danger" />
                      <div className="flex-1 h-px bg-danger" />
                    </div>
                  </div>
                )}

                {/* Work order cards */}
                {groupedWorkOrders[tech].map((wo) => {
                  const style = getWorkOrderStyle(wo);
                  if (!style) return null;

                  return (
                    <button
                      key={wo.id}
                      onClick={() => onSelectWorkOrder?.(wo)}
                      className="absolute left-1 right-1 z-10 text-left overflow-hidden"
                      style={style}
                    >
                      <div
                        className={cn(
                          'h-full rounded border-l-4 p-2 shadow-sm transition-shadow hover:shadow-md',
                          'overflow-hidden'
                        )}
                        style={{
                          backgroundColor: `${STATUS_COLORS[wo.status]}15`,
                          borderLeftColor: STATUS_COLORS[wo.status],
                        }}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-text-primary truncate">
                              {wo.customer_name || `Customer #${wo.customer_id}`}
                            </div>
                            <div className="text-xs text-text-secondary truncate">
                              {wo.time_window_start?.slice(0, 5)}
                              {wo.estimated_duration_hours && ` (${wo.estimated_duration_hours}h)`}
                            </div>
                          </div>
                        </div>
                        {parseFloat(style.height) >= 50 && (
                          <div className="mt-1">
                            <Badge
                              variant={getStatusVariant(wo.status)}
                              size="sm"
                              className="text-[10px]"
                            >
                              {WORK_ORDER_STATUS_LABELS[wo.status]}
                            </Badge>
                          </div>
                        )}
                        {parseFloat(style.height) >= 80 && wo.service_city && (
                          <div className="text-[10px] text-text-muted mt-1 truncate">
                            {wo.service_city}, {wo.service_state}
                          </div>
                        )}
                        {parseFloat(style.height) >= 100 && wo.job_type && (
                          <div className="text-[10px] text-text-muted truncate">
                            {JOB_TYPE_LABELS[wo.job_type as keyof typeof JOB_TYPE_LABELS] || wo.job_type}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Empty state for unscheduled times */}
                {groupedWorkOrders[tech].filter((wo) => wo.time_window_start).length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-text-muted">
                      <div className="text-2xl mb-2">📅</div>
                      <div className="text-sm">No scheduled jobs</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary footer */}
      <div className="border-t border-border bg-bg-muted px-4 py-2">
        <div className="flex items-center justify-between text-sm">
          <div className="text-text-secondary">
            Total hours:{' '}
            <span className="font-medium text-text-primary">
              {dayWorkOrders
                .reduce((sum, wo) => sum + (wo.estimated_duration_hours || 1), 0)
                .toFixed(1)}
              h
            </span>
          </div>
          <div className="flex items-center gap-4">
            {Object.entries(
              dayWorkOrders.reduce((acc, wo) => {
                acc[wo.status] = (acc[wo.status] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([status, count]) => (
              <div key={status} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[status as WorkOrderStatus] }}
                />
                <span className="text-xs text-text-secondary">
                  {count} {WORK_ORDER_STATUS_LABELS[status as WorkOrderStatus]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
