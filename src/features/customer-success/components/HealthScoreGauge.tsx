/**
 * Health Score Gauge Component
 *
 * A visual gauge showing customer health score with color-coded status.
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils.ts';
import type { HealthStatus, ScoreTrend } from '@/api/types/customerSuccess.ts';

interface HealthScoreGaugeProps {
  score: number;
  status?: HealthStatus | null;
  trend?: ScoreTrend | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const STATUS_COLORS: Record<HealthStatus, string> = {
  healthy: 'text-success',
  at_risk: 'text-warning',
  critical: 'text-danger',
  churned: 'text-text-muted',
};

const STATUS_BG_COLORS: Record<HealthStatus, string> = {
  healthy: 'bg-success/10',
  at_risk: 'bg-warning/10',
  critical: 'bg-danger/10',
  churned: 'bg-text-muted/10',
};

const STATUS_LABELS: Record<HealthStatus, string> = {
  healthy: 'Healthy',
  at_risk: 'At Risk',
  critical: 'Critical',
  churned: 'Churned',
};

const TREND_ICONS: Record<ScoreTrend, string> = {
  improving: '↑',
  stable: '→',
  declining: '↓',
};

const TREND_COLORS: Record<ScoreTrend, string> = {
  improving: 'text-success',
  stable: 'text-text-muted',
  declining: 'text-danger',
};

const SIZE_CLASSES = {
  sm: {
    container: 'w-16 h-16',
    text: 'text-lg font-bold',
    label: 'text-xs',
    ring: 'w-14 h-14',
  },
  md: {
    container: 'w-24 h-24',
    text: 'text-2xl font-bold',
    label: 'text-sm',
    ring: 'w-20 h-20',
  },
  lg: {
    container: 'w-32 h-32',
    text: 'text-4xl font-bold',
    label: 'text-base',
    ring: 'w-28 h-28',
  },
};

export function HealthScoreGauge({
  score,
  status,
  trend,
  size = 'md',
  showLabel = true,
  className,
}: HealthScoreGaugeProps) {
  const derivedStatus = useMemo<HealthStatus>(() => {
    if (status) return status;
    if (score >= 70) return 'healthy';
    if (score >= 40) return 'at_risk';
    if (score >= 20) return 'critical';
    return 'churned';
  }, [score, status]);

  const sizeClasses = SIZE_CLASSES[size];
  const strokeDasharray = 251.2; // Circumference of circle with r=40
  const strokeDashoffset = strokeDasharray - (strokeDasharray * score) / 100;

  const strokeColor = useMemo(() => {
    switch (derivedStatus) {
      case 'healthy': return '#22c55e';
      case 'at_risk': return '#f59e0b';
      case 'critical': return '#ef4444';
      case 'churned': return '#6b7280';
      default: return '#6b7280';
    }
  }, [derivedStatus]);

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className={cn('relative', sizeClasses.container)}>
        {/* Background circle */}
        <svg className="absolute inset-0" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-bg-tertiary"
          />
          {/* Progress arc */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 50 50)"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(sizeClasses.text, STATUS_COLORS[derivedStatus])}>
            {score}
          </span>
          {trend && (
            <span className={cn('text-xs', TREND_COLORS[trend])}>
              {TREND_ICONS[trend]}
            </span>
          )}
        </div>
      </div>

      {showLabel && (
        <div className="flex flex-col items-center">
          <span className={cn(
            'px-2 py-0.5 rounded-full',
            sizeClasses.label,
            STATUS_BG_COLORS[derivedStatus],
            STATUS_COLORS[derivedStatus]
          )}>
            {STATUS_LABELS[derivedStatus]}
          </span>
        </div>
      )}
    </div>
  );
}
