import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils.ts';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'stage' | 'primary' | 'secondary';
  /** For stage variant, pass the stage value */
  stage?: string;
}

/**
 * Badge component for status indicators
 */
export function Badge({ className, variant = 'default', stage, children, ...props }: BadgeProps) {
  // Stage-specific colors
  const stageColors: Record<string, string> = {
    new_lead: 'bg-stage-new-lead/10 text-stage-new-lead',
    contacted: 'bg-stage-contacted/10 text-stage-contacted',
    qualified: 'bg-stage-qualified/10 text-stage-qualified',
    quoted: 'bg-stage-quoted/10 text-stage-quoted',
    negotiation: 'bg-stage-negotiation/10 text-stage-negotiation',
    won: 'bg-stage-won/10 text-stage-won',
    lost: 'bg-stage-lost/10 text-stage-lost',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        {
          'bg-bg-muted text-text-secondary': variant === 'default',
          'bg-success-light text-success': variant === 'success',
          'bg-warning-light text-warning': variant === 'warning',
          'bg-danger-light text-danger': variant === 'danger',
          'bg-info-light text-info': variant === 'info',
          'bg-primary/10 text-primary': variant === 'primary',
          'bg-bg-muted text-text-primary': variant === 'secondary',
        },
        variant === 'stage' && stage && stageColors[stage],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
