/**
 * DragDropScheduler Component
 * Drag and drop interface for scheduling work orders
 */

import { useState, useCallback, useMemo, type DragEvent } from 'react';
import { cn } from '@/lib/utils.ts';
import { Badge } from '@/components/ui/Badge.tsx';
import { Button } from '@/components/ui/Button.tsx';
import {
  format,
  addDays,
  startOfWeek,
  eachDayOfInterval,
  parseISO,
} from 'date-fns';
import type { WorkOrder } from '@/api/types/workOrder.ts';
import {
  STATUS_COLORS,
  JOB_TYPE_LABELS,
} from '@/api/types/workOrder.ts';
import { useAssignWorkOrder } from '@/api/hooks/useWorkOrders.ts';

interface DragDropSchedulerProps {
  workOrders: WorkOrder[];
  unscheduledWorkOrders?: WorkOrder[];
  technicians?: { id: string; name: string }[];
  onSchedule?: (workOrderId: string, date: string, technicianName?: string, time?: string) => void;
  onUnschedule?: (workOrderId: string) => void;
  daysToShow?: number;
  startDate?: Date;
  className?: string;
}

interface DragData {
  workOrderId: string;
  sourceDate?: string;
  sourceTechnician?: string;
}

export function DragDropScheduler({
  workOrders,
  unscheduledWorkOrders = [],
  technicians = [],
  onSchedule,
  onUnschedule,
  daysToShow = 7,
  startDate,
  className,
}: DragDropSchedulerProps) {
  const [draggedItem, setDraggedItem] = useState<DragData | null>(null);
  const [dropTarget, setDropTarget] = useState<{ date: string; technician?: string; time?: string } | null>(null);
  const [baseDate, setBaseDate] = useState(() => startDate || startOfWeek(new Date()));

  const assignMutation = useAssignWorkOrder();

  // Generate date range
  const dates = useMemo(() => {
    return eachDayOfInterval({
      start: baseDate,
      end: addDays(baseDate, daysToShow - 1),
    }).map((d) => format(d, 'yyyy-MM-dd'));
  }, [baseDate, daysToShow]);

  // Group scheduled work orders by date and technician
  const scheduledByDateTech = useMemo(() => {
    const map = new Map<string, WorkOrder[]>();

    workOrders.forEach((wo) => {
      if (wo.scheduled_date) {
        const tech = wo.assigned_technician || 'Unassigned';
        const key = `${wo.scheduled_date}_${tech}`;
        const existing = map.get(key) || [];
        existing.push(wo);
        map.set(key, existing);
      }
    });

    return map;
  }, [workOrders]);

  // Drag handlers
  const handleDragStart = useCallback((e: DragEvent, workOrder: WorkOrder) => {
    const data: DragData = {
      workOrderId: workOrder.id,
      sourceDate: workOrder.scheduled_date || undefined,
      sourceTechnician: workOrder.assigned_technician || undefined,
    };
    setDraggedItem(data);
    e.dataTransfer.setData('application/json', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDropTarget(null);
  }, []);

  const handleDragOver = useCallback((e: DragEvent, date: string, technician?: string, time?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ date, technician, time });
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent, targetDate: string, targetTechnician?: string, targetTime?: string) => {
      e.preventDefault();
      setDropTarget(null);

      try {
        const dataStr = e.dataTransfer.getData('application/json');
        const data: DragData = JSON.parse(dataStr);

        // Call the onSchedule callback or use mutation
        if (onSchedule) {
          onSchedule(data.workOrderId, targetDate, targetTechnician, targetTime);
        } else {
          await assignMutation.mutateAsync({
            id: data.workOrderId,
            date: targetDate,
            technician: targetTechnician,
            timeStart: targetTime,
          });
        }
      } catch (err) {
        console.error('Drop failed:', err);
      }
    },
    [onSchedule, assignMutation]
  );

  const handleUnscheduleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      setDropTarget(null);

      try {
        const dataStr = e.dataTransfer.getData('application/json');
        const data: DragData = JSON.parse(dataStr);

        if (onUnschedule) {
          onUnschedule(data.workOrderId);
        }
      } catch (err) {
        console.error('Unschedule failed:', err);
      }
    },
    [onUnschedule]
  );

  // Navigation
  const navigateWeek = (direction: 'prev' | 'next') => {
    setBaseDate((prev) => addDays(prev, direction === 'next' ? 7 : -7));
  };

  // Get effective technicians (use provided or extract from work orders)
  const effectiveTechnicians = useMemo(() => {
    if (technicians.length > 0) {
      return technicians;
    }

    const techSet = new Set<string>();
    workOrders.forEach((wo) => {
      if (wo.assigned_technician) {
        techSet.add(wo.assigned_technician);
      }
    });

    return Array.from(techSet).map((name) => ({ id: name, name }));
  }, [technicians, workOrders]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBaseDate(startOfWeek(new Date()))}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
          <span className="ml-4 text-sm font-medium text-text-primary">
            {format(baseDate, 'MMM d')} - {format(addDays(baseDate, daysToShow - 1), 'MMM d, yyyy')}
          </span>
        </div>
        {draggedItem && (
          <Badge variant="info">
            Dragging work order...
          </Badge>
        )}
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Unscheduled work orders panel */}
        <div
          className={cn(
            'w-64 flex-shrink-0 bg-bg-card border border-border rounded-lg overflow-hidden flex flex-col',
            draggedItem && 'ring-2 ring-warning ring-opacity-50'
          )}
          onDragOver={(e) => {
            if (draggedItem?.sourceDate) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }
          }}
          onDrop={handleUnscheduleDrop}
        >
          <div className="p-3 border-b border-border bg-bg-muted">
            <div className="flex items-center justify-between">
              <span className="font-medium text-text-primary">Unscheduled</span>
              <Badge variant="default">{unscheduledWorkOrders.length}</Badge>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {unscheduledWorkOrders.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm">
                {draggedItem?.sourceDate ? (
                  'Drop here to unschedule'
                ) : (
                  'No unscheduled work orders'
                )}
              </div>
            ) : (
              unscheduledWorkOrders.map((wo) => (
                <DraggableWorkOrderCard
                  key={wo.id}
                  workOrder={wo}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  isDragging={draggedItem?.workOrderId === wo.id}
                />
              ))
            )}
          </div>
        </div>

        {/* Schedule grid */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-max">
            {/* Date headers */}
            <div className="flex border-b border-border bg-bg-muted sticky top-0 z-10">
              <div className="w-32 flex-shrink-0 p-2 border-r border-border" />
              {dates.map((date) => {
                const isToday = date === format(new Date(), 'yyyy-MM-dd');
                return (
                  <div
                    key={date}
                    className={cn(
                      'w-40 flex-shrink-0 p-2 border-r border-border text-center',
                      isToday && 'bg-primary/10'
                    )}
                  >
                    <div className="text-xs text-text-secondary">
                      {format(parseISO(date), 'EEE')}
                    </div>
                    <div
                      className={cn(
                        'text-sm font-medium',
                        isToday && 'text-primary'
                      )}
                    >
                      {format(parseISO(date), 'MMM d')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Technician rows */}
            {effectiveTechnicians.length === 0 ? (
              <div className="flex">
                <div className="w-32 flex-shrink-0" />
                {dates.map((date) => (
                  <DropZone
                    key={date}
                    date={date}
                    workOrders={scheduledByDateTech.get(`${date}_Unassigned`) || []}
                    isDropTarget={dropTarget?.date === date && !dropTarget?.technician}
                    onDragOver={(e) => handleDragOver(e, date)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, date)}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    draggedItemId={draggedItem?.workOrderId}
                  />
                ))}
              </div>
            ) : (
              effectiveTechnicians.map((tech) => (
                <div key={tech.id} className="flex border-b border-border">
                  <div className="w-32 flex-shrink-0 p-2 border-r border-border bg-bg-card">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {tech.name.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-text-primary truncate">
                        {tech.name}
                      </span>
                    </div>
                  </div>
                  {dates.map((date) => (
                    <DropZone
                      key={`${tech.id}_${date}`}
                      date={date}
                      technicianName={tech.name}
                      workOrders={scheduledByDateTech.get(`${date}_${tech.name}`) || []}
                      isDropTarget={
                        dropTarget?.date === date && dropTarget?.technician === tech.name
                      }
                      onDragOver={(e) => handleDragOver(e, date, tech.name)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, date, tech.name)}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      draggedItemId={draggedItem?.workOrderId}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Draggable work order card
 */
function DraggableWorkOrderCard({
  workOrder,
  onDragStart,
  onDragEnd,
  isDragging,
  compact = false,
}: {
  workOrder: WorkOrder;
  onDragStart: (e: DragEvent, wo: WorkOrder) => void;
  onDragEnd: () => void;
  isDragging?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, workOrder)}
      onDragEnd={onDragEnd}
      className={cn(
        'p-2 rounded border-l-4 cursor-grab active:cursor-grabbing transition-all',
        'bg-bg-card border border-border hover:shadow-md',
        isDragging && 'opacity-50 ring-2 ring-primary',
        compact ? 'text-xs' : 'text-sm'
      )}
      style={{ borderLeftColor: STATUS_COLORS[workOrder.status] }}
    >
      <div className="font-medium text-text-primary truncate">
        {workOrder.customer_name || `Customer #${workOrder.customer_id}`}
      </div>
      {!compact && (
        <>
          <div className="text-text-secondary text-xs mt-1 truncate">
            {JOB_TYPE_LABELS[workOrder.job_type as keyof typeof JOB_TYPE_LABELS] || workOrder.job_type}
          </div>
          {workOrder.time_window_start && (
            <div className="text-text-muted text-xs">
              {workOrder.time_window_start.slice(0, 5)}
              {workOrder.estimated_duration_hours && ` (${workOrder.estimated_duration_hours}h)`}
            </div>
          )}
          <div className="flex items-center gap-1 mt-1">
            <Badge
              variant={
                workOrder.priority === 'emergency' || workOrder.priority === 'urgent'
                  ? 'danger'
                  : workOrder.priority === 'high'
                  ? 'warning'
                  : 'default'
              }
              size="sm"
            >
              {workOrder.priority}
            </Badge>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Drop zone for scheduling
 */
function DropZone({
  date,
  technicianName: _technicianName,
  workOrders,
  isDropTarget,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  draggedItemId,
}: {
  date: string;
  technicianName?: string;
  workOrders: WorkOrder[];
  isDropTarget: boolean;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent) => void;
  onDragStart: (e: DragEvent, wo: WorkOrder) => void;
  onDragEnd: () => void;
  draggedItemId?: string;
}) {
  const isToday = date === format(new Date(), 'yyyy-MM-dd');

  return (
    <div
      className={cn(
        'w-40 flex-shrink-0 min-h-[100px] p-1 border-r border-border transition-colors',
        isToday && 'bg-primary/5',
        isDropTarget && 'bg-primary/20 ring-2 ring-primary ring-inset'
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="space-y-1">
        {workOrders.map((wo) => (
          <DraggableWorkOrderCard
            key={wo.id}
            workOrder={wo}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isDragging={draggedItemId === wo.id}
            compact
          />
        ))}
        {workOrders.length === 0 && isDropTarget && (
          <div className="h-16 flex items-center justify-center text-xs text-primary font-medium border-2 border-dashed border-primary/50 rounded">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}
