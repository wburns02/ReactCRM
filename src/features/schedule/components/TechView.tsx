import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDroppable } from '@dnd-kit/core';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { Button } from '@/components/ui/Button.tsx';
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
import type { Technician } from '@/api/types/technician.ts';
import {
  getWeekDays,
  formatDateKey,
  formatTimeDisplay,
  type DropTargetData,
} from '@/api/types/schedule.ts';
import { useScheduleStore } from '../store/scheduleStore.ts';

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
    case 'requires_followup':
      return 'warning';
    default:
      return 'default';
  }
}

/**
 * Get priority color class
 */
function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 'emergency':
      return 'border-l-red-500';
    case 'urgent':
      return 'border-l-orange-500';
    case 'high':
      return 'border-l-yellow-500';
    default:
      return 'border-l-blue-500';
  }
}

/**
 * Calculate workload status
 */
function getWorkloadStatus(hours: number): { label: string; color: string } {
  if (hours >= 10) return { label: 'Overloaded', color: 'text-danger' };
  if (hours >= 8) return { label: 'Full', color: 'text-warning' };
  if (hours >= 4) return { label: 'Moderate', color: 'text-success' };
  if (hours > 0) return { label: 'Light', color: 'text-primary' };
  return { label: 'Available', color: 'text-text-muted' };
}

/**
 * Droppable technician card
 */
function DroppableTechCard({
  technician,
  dateKey,
  children,
}: {
  technician: Technician;
  dateKey: string;
  children: React.ReactNode;
}) {
  const techName = `${technician.first_name} ${technician.last_name}`;

  const { setNodeRef, isOver } = useDroppable({
    id: `tech-${technician.id}-${dateKey}`,
    data: {
      date: dateKey,
      technician: techName,
    } as DropTargetData,
  });

  return (
    <div
      ref={setNodeRef}
      className={`transition-all duration-150 ${isOver ? 'ring-2 ring-primary' : ''}`}
    >
      {children}
      {isOver && (
        <div className="mt-2 p-3 border-2 border-dashed border-primary rounded-lg text-center text-sm text-primary">
          Drop to assign to {technician.first_name}
        </div>
      )}
    </div>
  );
}

/**
 * Work Order Card
 */
function WorkOrderCard({ workOrder }: { workOrder: WorkOrder }) {
  return (
    <Link
      to={`/work-orders/${workOrder.id}`}
      className={`
        block p-3 rounded-lg border-l-4 bg-white
        hover:shadow-md transition-shadow
        ${getPriorityColor(workOrder.priority as Priority)}
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-text-primary text-sm truncate">
            {workOrder.customer_name || `Customer #${workOrder.customer_id}`}
          </p>
        </div>
        <Badge
          variant={getStatusVariant(workOrder.status as WorkOrderStatus)}
          className="text-xs shrink-0"
        >
          {WORK_ORDER_STATUS_LABELS[workOrder.status as WorkOrderStatus]}
        </Badge>
      </div>

      <p className="text-xs text-text-secondary mb-1">
        {JOB_TYPE_LABELS[workOrder.job_type as JobType]}
      </p>

      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>
          {workOrder.scheduled_date}
          {workOrder.time_window_start && ` @ ${formatTimeDisplay(workOrder.time_window_start)}`}
        </span>
        {workOrder.estimated_duration_hours && (
          <span>{workOrder.estimated_duration_hours}h</span>
        )}
      </div>

      {workOrder.service_city && (
        <p className="text-xs text-text-muted mt-1 truncate">
          {workOrder.service_city}, {workOrder.service_state}
        </p>
      )}
    </Link>
  );
}

/**
 * Technician Card with work orders
 */
function TechnicianCard({
  technician,
  workOrders,
  weekDays,
  selectedDate,
}: {
  technician: Technician;
  workOrders: WorkOrder[];
  weekDays: Date[];
  selectedDate: Date;
}) {
  const [expanded, setExpanded] = useState(true);
  const dateKey = formatDateKey(selectedDate);

  // Calculate stats for the week
  const stats = useMemo(() => {
    let totalHours = 0;
    let completedCount = 0;
    let pendingCount = 0;

    workOrders.forEach((wo) => {
      totalHours += wo.estimated_duration_hours || 1;
      if (wo.status === 'completed') {
        completedCount++;
      } else if (wo.status !== 'canceled') {
        pendingCount++;
      }
    });

    return { totalHours, completedCount, pendingCount };
  }, [workOrders]);

  // Group work orders by date
  const workOrdersByDate = useMemo(() => {
    const grouped: Record<string, WorkOrder[]> = {};

    weekDays.forEach((day) => {
      grouped[formatDateKey(day)] = [];
    });

    workOrders.forEach((wo) => {
      if (wo.scheduled_date && grouped[wo.scheduled_date]) {
        grouped[wo.scheduled_date].push(wo);
      }
    });

    // Sort each day's work orders by time
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => {
        const timeA = a.time_window_start || '99:99';
        const timeB = b.time_window_start || '99:99';
        return timeA.localeCompare(timeB);
      });
    });

    return grouped;
  }, [workOrders, weekDays]);

  const workloadStatus = getWorkloadStatus(stats.totalHours);

  return (
    <DroppableTechCard technician={technician} dateKey={dateKey}>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                {technician.first_name[0]}{technician.last_name[0]}
              </div>
              <div>
                <CardTitle className="text-base">
                  {technician.first_name} {technician.last_name}
                </CardTitle>
                <p className="text-xs text-text-muted">
                  {technician.phone || 'No phone'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-2 mb-4 text-center">
            <div className="bg-bg-muted rounded-lg p-2">
              <p className="text-lg font-bold text-text-primary">{stats.totalHours}h</p>
              <p className="text-xs text-text-muted">Total</p>
            </div>
            <div className="bg-bg-muted rounded-lg p-2">
              <p className="text-lg font-bold text-success">{stats.completedCount}</p>
              <p className="text-xs text-text-muted">Done</p>
            </div>
            <div className="bg-bg-muted rounded-lg p-2">
              <p className="text-lg font-bold text-primary">{stats.pendingCount}</p>
              <p className="text-xs text-text-muted">Pending</p>
            </div>
            <div className="bg-bg-muted rounded-lg p-2">
              <p className={`text-sm font-medium ${workloadStatus.color}`}>
                {workloadStatus.label}
              </p>
              <p className="text-xs text-text-muted">Status</p>
            </div>
          </div>

          {/* Vehicle & Region Info */}
          <div className="flex items-center gap-4 text-xs text-text-secondary mb-4">
            {technician.assigned_vehicle && (
              <span>Vehicle: {technician.assigned_vehicle}</span>
            )}
            {technician.home_region && (
              <span>Region: {technician.home_region}</span>
            )}
          </div>

          {/* Work Orders List */}
          {expanded && (
            <div className="space-y-4">
              {weekDays.map((day) => {
                const dayKey = formatDateKey(day);
                const dayOrders = workOrdersByDate[dayKey] || [];
                const isToday = dayKey === formatDateKey(new Date());

                if (dayOrders.length === 0) return null;

                return (
                  <div key={dayKey}>
                    <div
                      className={`
                        text-xs font-medium mb-2 flex items-center gap-2
                        ${isToday ? 'text-primary' : 'text-text-secondary'}
                      `}
                    >
                      <span>
                        {day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      {isToday && <Badge variant="default">Today</Badge>}
                      <span className="text-text-muted">({dayOrders.length} jobs)</span>
                    </div>
                    <div className="space-y-2">
                      {dayOrders.map((wo) => (
                        <WorkOrderCard key={wo.id} workOrder={wo} />
                      ))}
                    </div>
                  </div>
                );
              })}

              {workOrders.length === 0 && (
                <div className="text-center text-text-muted py-4">
                  No work orders this week
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </DroppableTechCard>
  );
}

/**
 * TechView - Technician-centric schedule view
 *
 * Shows each technician with their weekly workload and assigned work orders.
 * Supports drag-and-drop to assign work orders to technicians.
 */
export function TechView() {
  const { currentDate, filters } = useScheduleStore();

  // Fetch work orders
  const { data: workOrdersData, isLoading: woLoading, isError: woError } = useWorkOrders({
    page: 1,
    page_size: 200,
  });

  // Fetch technicians
  const { data: techniciansData, isLoading: techLoading } = useTechnicians({
    page: 1,
    page_size: 100,
    active_only: true,
  });

  // Generate week days
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  // Filter and group work orders by technician for the week
  const workOrdersByTechnician = useMemo(() => {
    if (!workOrdersData?.items || !techniciansData?.items) return {};

    const weekStart = formatDateKey(weekDays[0]);
    const weekEnd = formatDateKey(weekDays[6]);

    const grouped: Record<string, WorkOrder[]> = {};

    // Initialize for all technicians
    techniciansData.items.forEach((tech) => {
      const techName = `${tech.first_name} ${tech.last_name}`;
      grouped[techName] = [];
    });

    // Group work orders
    workOrdersData.items.forEach((wo) => {
      if (!wo.assigned_technician) return;
      if (!wo.scheduled_date) return;

      // Check if within the week
      if (wo.scheduled_date < weekStart || wo.scheduled_date > weekEnd) return;

      // Apply status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(wo.status)) return;

      if (!grouped[wo.assigned_technician]) {
        grouped[wo.assigned_technician] = [];
      }
      grouped[wo.assigned_technician].push(wo);
    });

    return grouped;
  }, [workOrdersData, techniciansData, weekDays, filters.statuses]);

  // Filter technicians
  const technicians = useMemo(() => {
    let techs = techniciansData?.items || [];

    // Apply technician filter
    if (filters.technician) {
      techs = techs.filter(
        (t) => `${t.first_name} ${t.last_name}` === filters.technician
      );
    }

    // Sort by workload (most busy first)
    return techs.sort((a, b) => {
      const aName = `${a.first_name} ${a.last_name}`;
      const bName = `${b.first_name} ${b.last_name}`;
      const aCount = workOrdersByTechnician[aName]?.length || 0;
      const bCount = workOrdersByTechnician[bName]?.length || 0;
      return bCount - aCount;
    });
  }, [techniciansData, filters.technician, workOrdersByTechnician]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    let totalWorkOrders = 0;
    let totalHours = 0;
    let techsWithWork = 0;

    Object.values(workOrdersByTechnician).forEach((orders) => {
      totalWorkOrders += orders.length;
      orders.forEach((wo) => {
        totalHours += wo.estimated_duration_hours || 1;
      });
      if (orders.length > 0) techsWithWork++;
    });

    return {
      totalWorkOrders,
      totalHours,
      techsWithWork,
      activeTechs: technicians.length,
    };
  }, [workOrdersByTechnician, technicians]);

  if (woLoading || techLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-bg-muted rounded-lg h-48" />
        ))}
      </div>
    );
  }

  if (woError) {
    return (
      <div className="bg-white rounded-lg border border-border p-8 text-center text-danger">
        Failed to load schedule data
      </div>
    );
  }

  if (technicians.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-border p-8 text-center text-text-muted">
        No active technicians found. Add technicians to see the technician view.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Overview Stats */}
      <div className="bg-white rounded-lg border border-border p-4">
        <h3 className="text-sm font-medium text-text-secondary mb-3">Week Overview</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{overallStats.totalWorkOrders}</p>
            <p className="text-xs text-text-muted">Work Orders</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-text-primary">{overallStats.totalHours}h</p>
            <p className="text-xs text-text-muted">Total Hours</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">{overallStats.techsWithWork}</p>
            <p className="text-xs text-text-muted">Techs Assigned</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-text-secondary">{overallStats.activeTechs}</p>
            <p className="text-xs text-text-muted">Active Techs</p>
          </div>
        </div>
      </div>

      {/* Technician Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {technicians.map((tech) => {
          const techName = `${tech.first_name} ${tech.last_name}`;
          const workOrders = workOrdersByTechnician[techName] || [];

          return (
            <TechnicianCard
              key={tech.id}
              technician={tech}
              workOrders={workOrders}
              weekDays={weekDays}
              selectedDate={currentDate}
            />
          );
        })}
      </div>

      {/* Instructions */}
      <div className="bg-bg-muted rounded-lg p-4 text-center text-sm text-text-secondary">
        <p>
          Drag work orders from the <strong>Unscheduled Panel</strong> onto a technician card to assign them.
        </p>
      </div>
    </div>
  );
}
