import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';
import type { WorkOrderStatus } from '@/api/types/workOrder';
import { WORK_ORDER_STATUS_LABELS } from '@/api/types/workOrder';
import { getStatusClasses, getStatusColor } from '../utils/workOrderHelpers';

/**
 * Status descriptions for tooltip display
 */
const STATUS_DESCRIPTIONS: Record<WorkOrderStatus, string> = {
  draft: 'Work order is being prepared and not yet scheduled',
  scheduled: 'Work order has been scheduled for service',
  confirmed: 'Customer has confirmed the appointment',
  enroute: 'Technician is traveling to the job site',
  on_site: 'Technician has arrived at the location',
  in_progress: 'Work is currently being performed',
  completed: 'All work has been successfully completed',
  canceled: 'Work order has been canceled',
  requires_followup: 'Additional work or follow-up is needed',
};

export interface WorkOrderStatusBadgeProps {
  /** The work order status to display */
  status: WorkOrderStatus;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show a tooltip with status description */
  showTooltip?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show a dot indicator instead of text */
  dotOnly?: boolean;
}

/**
 * WorkOrderStatusBadge - Displays a color-coded badge for work order status
 *
 * Features:
 * - Color-coded by status using Tailwind classes
 * - Three size variants (sm, md, lg)
 * - Optional tooltip with status description
 * - Dot-only mode for compact display
 */
export function WorkOrderStatusBadge({
  status,
  size = 'md',
  showTooltip = false,
  className,
  dotOnly = false,
}: WorkOrderStatusBadgeProps) {
  const label = WORK_ORDER_STATUS_LABELS[status];
  const description = STATUS_DESCRIPTIONS[status];
  const statusClasses = getStatusClasses(status);

  // Dot-only mode for compact displays
  if (dotOnly) {
    const dotSizes = {
      sm: 'h-2 w-2',
      md: 'h-2.5 w-2.5',
      lg: 'h-3 w-3',
    };

    const dot = (
      <span
        className={cn(
          'inline-block rounded-full',
          dotSizes[size],
          className
        )}
        style={{ backgroundColor: getStatusColor(status) }}
        aria-label={label}
      />
    );

    if (showTooltip) {
      return (
        <Tooltip content={`${label}: ${description}`}>
          {dot}
        </Tooltip>
      );
    }

    return dot;
  }

  // Size-specific classes
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-0.5 text-xs',
    lg: 'px-2.5 py-1 text-sm',
  };

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        sizeClasses[size],
        statusClasses,
        className
      )}
    >
      {/* Status dot indicator */}
      <span
        className={cn(
          'rounded-full',
          size === 'sm' ? 'h-1.5 w-1.5' : size === 'md' ? 'h-2 w-2' : 'h-2.5 w-2.5'
        )}
        style={{ backgroundColor: getStatusColor(status) }}
      />
      {label}
    </span>
  );

  if (showTooltip) {
    return (
      <Tooltip content={description}>
        {badge}
      </Tooltip>
    );
  }

  return badge;
}

/**
 * Compact status indicator for table/list views
 */
export function StatusDot({
  status,
  className,
}: {
  status: WorkOrderStatus;
  className?: string;
}) {
  return (
    <WorkOrderStatusBadge
      status={status}
      dotOnly
      showTooltip
      className={className}
    />
  );
}

export default WorkOrderStatusBadge;
