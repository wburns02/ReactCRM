import { useState, type ReactNode } from 'react';
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge.tsx';
import { useAssignWorkOrder, workOrderKeys, scheduleKeys } from '@/api/hooks/useWorkOrders.ts';
import {
  type WorkOrder,
  type Priority,
  type JobType,
  JOB_TYPE_LABELS,
  PRIORITY_LABELS,
} from '@/api/types/workOrder.ts';
import { type DropTargetData } from '@/api/types/schedule.ts';

interface ScheduleDndContextProps {
  children: ReactNode;
}

/**
 * Priority color mapping for drag overlay
 */
const PRIORITY_COLORS: Record<Priority, string> = {
  emergency: 'border-l-red-500',
  urgent: 'border-l-orange-500',
  high: 'border-l-yellow-500',
  normal: 'border-l-blue-500',
  low: 'border-l-gray-400',
};

/**
 * Drag overlay card shown while dragging
 */
function DragOverlayCard({ workOrder }: { workOrder: WorkOrder }) {
  return (
    <div
      className={`
        bg-white rounded-lg border-2 border-primary border-l-4
        ${PRIORITY_COLORS[workOrder.priority as Priority] || PRIORITY_COLORS.normal}
        p-3 shadow-xl cursor-grabbing w-64
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-medium text-sm text-text-primary truncate">
          {workOrder.customer_name || `Customer #${workOrder.customer_id}`}
        </span>
        <Badge variant="default" className="text-[10px] shrink-0">
          {JOB_TYPE_LABELS[workOrder.job_type as JobType] || workOrder.job_type}
        </Badge>
      </div>
      <div className="text-xs text-text-secondary">
        {workOrder.service_city && `${workOrder.service_city}`}
        {workOrder.estimated_duration_hours && ` • ${workOrder.estimated_duration_hours}h`}
      </div>
      <div className="mt-2 text-xs font-medium text-primary">
        {PRIORITY_LABELS[workOrder.priority as Priority]} Priority
      </div>
    </div>
  );
}

/**
 * Schedule DnD Context - Provides drag-drop functionality for schedule views
 *
 * Wrap schedule components with this to enable:
 * - Dragging work orders from unscheduled panel
 * - Dropping onto schedule grid cells
 * - Optimistic updates with rollback on error
 */
export function ScheduleDndContext({ children }: ScheduleDndContextProps) {
  const [activeWorkOrder, setActiveWorkOrder] = useState<WorkOrder | null>(null);
  const queryClient = useQueryClient();
  const assignWorkOrder = useAssignWorkOrder();

  // Configure drag sensors - require 8px movement to start drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const workOrder = active.data.current?.workOrder as WorkOrder | undefined;
    setActiveWorkOrder(workOrder || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveWorkOrder(null);

    if (!over) return;

    const workOrder = active.data.current?.workOrder as WorkOrder | undefined;
    if (!workOrder) return;

    // Get drop target data
    const dropData = over.data.current as DropTargetData | undefined;
    if (!dropData?.date) return;

    // Don't do anything if dropped on same date/tech
    if (
      workOrder.scheduled_date === dropData.date &&
      workOrder.assigned_technician === dropData.technician
    ) {
      return;
    }

    // Build time string if hour is specified (day view)
    let timeStart: string | undefined;
    if (dropData.hour !== undefined) {
      timeStart = `${String(dropData.hour).padStart(2, '0')}:00`;
    }

    // Optimistic update - update cache immediately
    const previousData = queryClient.getQueryData(workOrderKeys.lists());

    queryClient.setQueryData(workOrderKeys.lists(), (oldData: { items: WorkOrder[] } | undefined) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        items: oldData.items.map((wo: WorkOrder) =>
          wo.id === workOrder.id
            ? {
                ...wo,
                scheduled_date: dropData.date,
                assigned_technician: dropData.technician || wo.assigned_technician,
                time_window_start: timeStart || wo.time_window_start,
                status: 'scheduled',
              }
            : wo
        ),
      };
    });

    // Also update unscheduled cache
    queryClient.setQueryData(
      scheduleKeys.unscheduled(),
      (oldData: { items: WorkOrder[] } | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          items: oldData.items.filter((wo: WorkOrder) => wo.id !== workOrder.id),
        };
      }
    );

    // Perform actual API call
    assignWorkOrder.mutate(
      {
        id: workOrder.id,
        date: dropData.date,
        technician: dropData.technician,
        timeStart,
      },
      {
        onError: () => {
          // Rollback on error
          queryClient.setQueryData(workOrderKeys.lists(), previousData);
          queryClient.invalidateQueries({ queryKey: scheduleKeys.unscheduled() });
        },
      }
    );
  };

  const handleDragCancel = () => {
    setActiveWorkOrder(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}

      {/* Drag overlay - shown while dragging */}
      <DragOverlay dropAnimation={null}>
        {activeWorkOrder ? <DragOverlayCard workOrder={activeWorkOrder} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
