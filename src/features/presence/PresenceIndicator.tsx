import { cn } from '@/lib/utils.ts';
import { Tooltip } from '@/components/ui/Tooltip.tsx';

/**
 * Online status indicator sizes
 */
type IndicatorSize = 'sm' | 'md' | 'lg';

/**
 * Props for PresenceIndicator
 */
interface PresenceIndicatorProps {
  /** Whether the user is online */
  isOnline: boolean;
  /** Size of the indicator */
  size?: IndicatorSize;
  /** Additional CSS classes */
  className?: string;
  /** Show tooltip with status text */
  showTooltip?: boolean;
  /** Custom tooltip content */
  tooltipContent?: string;
  /** Whether to show pulse animation */
  showPulse?: boolean;
}

/**
 * PresenceIndicator - Shows online/offline status with a colored dot
 *
 * Displays a green dot for online users and gray for offline.
 * Includes optional pulse animation for active status.
 */
export function PresenceIndicator({
  isOnline,
  size = 'md',
  className,
  showTooltip = false,
  tooltipContent,
  showPulse = true,
}: PresenceIndicatorProps) {
  const sizeClasses: Record<IndicatorSize, string> = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  const indicator = (
    <span
      className={cn(
        'relative inline-flex rounded-full',
        sizeClasses[size],
        isOnline ? 'bg-success' : 'bg-text-muted',
        className
      )}
      aria-label={isOnline ? 'Online' : 'Offline'}
    >
      {isOnline && showPulse && (
        <span
          className={cn(
            'absolute inset-0 rounded-full bg-success animate-ping opacity-75'
          )}
        />
      )}
    </span>
  );

  if (showTooltip) {
    return (
      <Tooltip content={tooltipContent || (isOnline ? 'Online' : 'Offline')}>
        {indicator}
      </Tooltip>
    );
  }

  return indicator;
}

/**
 * Props for UserStatusBadge
 */
interface UserStatusBadgeProps {
  /** User's display name */
  name: string;
  /** Whether the user is online */
  isOnline: boolean;
  /** Last seen timestamp */
  lastSeen?: Date;
  /** Additional CSS classes */
  className?: string;
}

/**
 * UserStatusBadge - Displays user name with online status
 */
export function UserStatusBadge({
  name,
  isOnline,
  lastSeen,
  className,
}: UserStatusBadgeProps) {
  const formatLastSeen = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <PresenceIndicator isOnline={isOnline} size="sm" />
      <span className="text-sm text-text-primary">{name}</span>
      {!isOnline && lastSeen && (
        <span className="text-xs text-text-muted">
          {formatLastSeen(lastSeen)}
        </span>
      )}
    </div>
  );
}
