import { useState, type ReactNode } from 'react';
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge.tsx';
import { useAssignWorkOrder, useUnscheduleWorkOrder, workOrderKeys, scheduleKeys } from '@/api/hooks/useWorkOrders.ts';
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

interface DragData {
  workOrder: WorkOrder;
  isScheduled?: boolean;
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
 * Shows different label for scheduled (Moving) vs unscheduled (Scheduling)
 */
function DragOverlayCard({ workOrder, isScheduled }: { workOrder: WorkOrder; isScheduled: boolean }) {
  return (
    <div
      className={`
        bg-white rounded-lg border-2 border-primary border-l-4
        ${PRIORITY_COLORS[workOrder.priority as Priority] || PRIORITY_COLORS.normal}
        p-3 shadow-xl cursor-grabbing w-64
      `}
    >
      {/* Action label */}
      <div className="flex items-center gap-1 mb-2 text-[10px] text-primary font-semibold uppercase tracking-wide">
        {isScheduled ? (
          <>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Moving
          </>
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Scheduling
          </>
        )}
      </div>
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
      <div className="mt-1 text-[9px] text-text-muted">
        Press Escape to cancel
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
  const [activeDragData, setActiveDragData] = useState<DragData | null>(null);
  const queryClient = useQueryClient();
  const assignWorkOrder = useAssignWorkOrder();
  const unscheduleWorkOrder = useUnscheduleWorkOrder();

  // Configure drag sensors - pointer with 8px activation + keyboard for accessibility
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const workOrder = active.data.current?.workOrder as WorkOrder | undefined;
    const isScheduled = active.data.current?.isScheduled as boolean | undefined;
    if (workOrder) {
      setActiveDragData({ workOrder, isScheduled: !!isScheduled });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragData(null);

    if (!over) return;

    const workOrder = active.data.current?.workOrder as WorkOrder | undefined;
    if (!workOrder) return;

    // Check if dropped on unschedule zone
    const overData = over.data.current as { type?: string } | undefined;
    if (overData?.type === 'unschedule') {
      // Only unschedule if it was a scheduled work order
      if (active.data.current?.isScheduled) {
        // Optimistic update - add to unscheduled cache
        const previousLists = queryClient.getQueryData(workOrderKeys.lists());
        const previousUnscheduled = queryClient.getQueryData(scheduleKeys.unscheduled());

        queryClient.setQueryData(
          scheduleKeys.unscheduled(),
          (oldData: { items: WorkOrder[] } | undefined) => {
            if (!oldData) return { items: [{ ...workOrder, scheduled_date: null, status: 'draft' }], total: 1, page: 1, page_size: 200 };
            return {
              ...oldData,
              items: [...oldData.items, { ...workOrder, scheduled_date: null, status: 'draft' }],
            };
          }
        );

        // Remove from scheduled lists
        queryClient.setQueryData(workOrderKeys.lists(), (oldData: { items: WorkOrder[] } | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            items: oldData.items.map((wo: WorkOrder) =>
              wo.id === workOrder.id
                ? { ...wo, scheduled_date: null, assigned_technician: null, time_window_start: null, status: 'draft' }
                : wo
            ),
          };
        });

        // Perform actual API call
        unscheduleWorkOrder.mutate(workOrder.id, {
          onError: () => {
            // Rollback on error
            queryClient.setQueryData(workOrderKeys.lists(), previousLists);
            queryClient.setQueryData(scheduleKeys.unscheduled(), previousUnscheduled);
          },
        });
      }
      return;
    }

    // Get drop target data for scheduling
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
    setActiveDragData(null);
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
        {activeDragData ? (
          <DragOverlayCard
            workOrder={activeDragData.workOrder}
            isScheduled={!!activeDragData.isScheduled}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
