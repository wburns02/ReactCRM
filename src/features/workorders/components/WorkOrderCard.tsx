import { useCallback, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
// import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
} from '@/components/ui/Dropdown';
import type { WorkOrder, WorkOrderStatus } from '@/api/types/workOrder';
import { JOB_TYPE_LABELS, PRIORITY_LABELS } from '@/api/types/workOrder';
import { WorkOrderStatusBadge } from './WorkOrderStatusBadge';
import {
  getCustomerName,
  formatShortAddress,
  formatTimeWindow,
  getInitials,
  isPriorityUrgent,
  getPriorityClasses,
  isOverdue,
  isToday,
  calculateAge,
} from '../utils/workOrderHelpers';

// Icons
const GripVerticalIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="9" cy="5" r="1" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="5" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="19" r="1" />
  </svg>
);

const MoreVerticalIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
);

const EyeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EditIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);

const MapPinIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const ClockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CalendarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

export interface WorkOrderCardProps {
  /** The work order data to display */
  workOrder: WorkOrder;
  /** Whether this card is in a Kanban view (shows drag handle) */
  showDragHandle?: boolean;
  /** Whether this card is currently selected */
  isSelected?: boolean;
  /** Callback when card is clicked */
  onClick?: (workOrder: WorkOrder) => void;
  /** Callback when view action is clicked */
  onView?: (workOrder: WorkOrder) => void;
  /** Callback when edit action is clicked */
  onEdit?: (workOrder: WorkOrder) => void;
  /** Callback when status change is requested */
  onStatusChange?: (workOrder: WorkOrder, newStatus: WorkOrderStatus) => void;
  /** Additional CSS classes */
  className?: string;
  /** Display variant */
  variant?: 'default' | 'compact';
  /** Drag handle props for react-beautiful-dnd or similar */
  dragHandleProps?: Record<string, unknown>;
}

/**
 * WorkOrderCard - Individual work order card component
 *
 * Features:
 * - Status badge with color from STATUS_COLORS
 * - Priority indicator with pulsing animation for emergency
 * - Customer name, address, job type
 * - Assigned technician avatar
 * - Quick actions (view, edit, change status)
 * - Drag handle for Kanban view
 * - Mobile-responsive design
 */
export function WorkOrderCard({
  workOrder,
  showDragHandle = false,
  isSelected = false,
  onClick,
  onView,
  onEdit,
  onStatusChange,
  className,
  variant = 'default',
  dragHandleProps,
}: WorkOrderCardProps) {
  const customerName = getCustomerName(workOrder);
  const address = formatShortAddress(workOrder);
  const timeWindow = formatTimeWindow(workOrder);
  const technicianInitials = getInitials(workOrder.assigned_technician);
  const isUrgent = isPriorityUrgent(workOrder.priority);
  const overdueStatus = isOverdue(workOrder);
  const isTodayJob = isToday(workOrder);

  const handleCardClick = useCallback(
    (e: MouseEvent) => {
      // Don't trigger if clicking on dropdown or buttons
      if ((e.target as HTMLElement).closest('[role="menu"]')) return;
      if ((e.target as HTMLElement).closest('button')) return;
      onClick?.(workOrder);
    },
    [onClick, workOrder]
  );

  // const _handleView = useCallback(
  //   (e: MouseEvent) => {
  //     e.stopPropagation();
  //     onView?.(workOrder);
  //   },
  //   [onView, workOrder]
  // );

  const handleEdit = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      onEdit?.(workOrder);
    },
    [onEdit, workOrder]
  );

  // Available status transitions based on current status
  const getAvailableStatuses = (): WorkOrderStatus[] => {
    const statusFlow: Record<WorkOrderStatus, WorkOrderStatus[]> = {
      draft: ['scheduled', 'canceled'],
      scheduled: ['confirmed', 'canceled', 'draft'],
      confirmed: ['enroute', 'canceled', 'scheduled'],
      enroute: ['on_site', 'canceled'],
      on_site: ['in_progress', 'canceled'],
      in_progress: ['completed', 'requires_followup', 'canceled'],
      completed: ['requires_followup'],
      canceled: ['draft', 'scheduled'],
      requires_followup: ['scheduled', 'completed'],
    };
    return statusFlow[workOrder.status] || [];
  };

  // Compact variant for list views
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border border-border bg-bg-card p-3',
          'hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer',
          isSelected && 'border-primary ring-1 ring-primary',
          overdueStatus && 'border-red-300 dark:border-red-800',
          className
        )}
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick?.(workOrder)}
      >
        {showDragHandle && (
          <div
            className="cursor-grab text-text-muted hover:text-text-secondary"
            {...dragHandleProps}
          >
            <GripVerticalIcon />
          </div>
        )}

        <WorkOrderStatusBadge status={workOrder.status} size="sm" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {customerName}
          </p>
          <p className="text-xs text-text-muted truncate">{address}</p>
        </div>

        {isUrgent && (
          <span
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
              getPriorityClasses(workOrder.priority),
              'animate-pulse'
            )}
          >
            <AlertTriangleIcon />
            {PRIORITY_LABELS[workOrder.priority]}
          </span>
        )}

        <div className="flex items-center gap-2">
          <Link
            to={`/workorders/${workOrder.id}`}
            className="p-1.5 text-text-muted hover:text-text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            <EyeIcon />
          </Link>
        </div>
      </div>
    );
  }

  // Default variant - full card
  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all cursor-pointer',
        'hover:shadow-md hover:border-primary/50',
        isSelected && 'border-primary ring-2 ring-primary/20',
        overdueStatus && 'border-red-300 dark:border-red-800',
        isUrgent && 'ring-2 ring-red-500/30',
        className
      )}
      onClick={handleCardClick}
    >
      {/* Priority indicator bar */}
      {isUrgent && (
        <div
          className={cn(
            'absolute top-0 left-0 right-0 h-1',
            workOrder.priority === 'emergency'
              ? 'bg-red-600 animate-pulse'
              : 'bg-red-500'
          )}
        />
      )}

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-2 mb-3">
          {showDragHandle && (
            <div
              className="cursor-grab text-text-muted hover:text-text-secondary mt-0.5"
              {...dragHandleProps}
            >
              <GripVerticalIcon />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <WorkOrderStatusBadge status={workOrder.status} size="sm" showTooltip />
              {overdueStatus && (
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                  OVERDUE
                </span>
              )}
              {isTodayJob && !overdueStatus && (
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  TODAY
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-text-primary truncate">
              {customerName}
            </h3>
          </div>

          {/* Quick actions dropdown */}
          <Dropdown>
            <DropdownTrigger className="p-1.5 rounded-md text-text-muted hover:bg-bg-hover hover:text-text-primary">
              <MoreVerticalIcon />
            </DropdownTrigger>
            <DropdownMenu align="end">
              <DropdownItem onClick={() => onView?.(workOrder)}>
                <span className="flex items-center gap-2">
                  <EyeIcon /> View Details
                </span>
              </DropdownItem>
              <DropdownItem onClick={() => onEdit?.(workOrder)}>
                <span className="flex items-center gap-2">
                  <EditIcon /> Edit
                </span>
              </DropdownItem>
              {getAvailableStatuses().length > 0 && (
                <>
                  <DropdownSeparator />
                  {getAvailableStatuses().map((status) => (
                    <DropdownItem
                      key={status}
                      onClick={() => onStatusChange?.(workOrder, status)}
                    >
                      <span className="flex items-center gap-2">
                        <WorkOrderStatusBadge status={status} dotOnly size="sm" />
                        Change to {status.replace('_', ' ')}
                      </span>
                    </DropdownItem>
                  ))}
                </>
              )}
            </DropdownMenu>
          </Dropdown>
        </div>

        {/* Job type and priority */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="inline-flex items-center px-2 py-0.5 bg-bg-muted rounded text-xs text-text-secondary">
            {JOB_TYPE_LABELS[workOrder.job_type]}
          </span>
          {workOrder.priority !== 'normal' && (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                getPriorityClasses(workOrder.priority),
                isUrgent && 'animate-pulse'
              )}
            >
              {isUrgent && <AlertTriangleIcon />}
              {PRIORITY_LABELS[workOrder.priority]}
            </span>
          )}
        </div>

        {/* Address */}
        <div className="flex items-start gap-2 mb-2 text-sm text-text-secondary">
          <MapPinIcon />
          <span className="truncate">{address}</span>
        </div>

        {/* Schedule info */}
        {workOrder.scheduled_date && (
          <div className="flex items-center gap-4 mb-3 text-sm text-text-secondary">
            <div className="flex items-center gap-1.5">
              <CalendarIcon />
              <span>
                {new Date(workOrder.scheduled_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            {timeWindow !== 'No time set' && (
              <div className="flex items-center gap-1.5">
                <ClockIcon />
                <span>{timeWindow}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          {/* Assigned technician */}
          <div className="flex items-center gap-2">
            {workOrder.assigned_technician ? (
              <Tooltip content={workOrder.assigned_technician}>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                    {technicianInitials}
                  </div>
                  <span className="text-sm text-text-secondary truncate max-w-[120px]">
                    {workOrder.assigned_technician}
                  </span>
                </div>
              </Tooltip>
            ) : (
              <span className="text-sm text-text-muted italic">Unassigned</span>
            )}
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center gap-1">
            <Tooltip content="View details">
              <Link
                to={`/workorders/${workOrder.id}`}
                className="p-1.5 rounded-md text-text-muted hover:bg-bg-hover hover:text-text-primary"
                onClick={(e) => e.stopPropagation()}
              >
                <EyeIcon />
              </Link>
            </Tooltip>
            <Tooltip content="Edit work order">
              <button
                type="button"
                className="p-1.5 rounded-md text-text-muted hover:bg-bg-hover hover:text-text-primary"
                onClick={handleEdit}
              >
                <EditIcon />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Age indicator */}
        {workOrder.created_at && (
          <div className="mt-2 text-xs text-text-muted">
            Created {calculateAge(workOrder.created_at)}
          </div>
        )}
      </div>
    </Card>
  );
}

export default WorkOrderCard;
