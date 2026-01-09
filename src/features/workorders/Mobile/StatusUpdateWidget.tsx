/**
 * StatusUpdateWidget - One-tap status update for mobile
 *
 * Features:
 * - Current status display
 * - Next logical status button
 * - Quick notes input
 * - Timestamp auto-capture
 * - Works at 375px width minimum
 * - Large touch targets (44px min)
 */

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { WorkOrderStatus } from '@/api/types/workOrder';
import {
  WORK_ORDER_STATUS_LABELS,
  STATUS_COLORS,
} from '@/api/types/workOrder';

// ============================================
// Types
// ============================================

interface StatusUpdateWidgetProps {
  currentStatus: WorkOrderStatus;
  onStatusChange: (status: WorkOrderStatus, notes?: string) => Promise<void>;
  disabled?: boolean;
  showQuickNotes?: boolean;
  compact?: boolean;
}

// ============================================
// Status Flow Configuration
// ============================================

const STATUS_FLOW: Record<WorkOrderStatus, WorkOrderStatus | null> = {
  draft: 'scheduled',
  scheduled: 'confirmed',
  confirmed: 'enroute',
  enroute: 'on_site',
  on_site: 'in_progress',
  in_progress: 'completed',
  completed: null,
  canceled: null,
  requires_followup: 'scheduled',
};

const STATUS_ACTION_LABELS: Record<WorkOrderStatus, string> = {
  draft: 'Schedule',
  scheduled: 'Confirm',
  confirmed: 'Start Route',
  enroute: 'Arrived',
  on_site: 'Start Work',
  in_progress: 'Complete',
  completed: 'Completed',
  canceled: 'Canceled',
  requires_followup: 'Re-Schedule',
};

const STATUS_ICONS: Record<WorkOrderStatus, React.ReactNode> = {
  draft: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  scheduled: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  confirmed: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  enroute: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  on_site: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  in_progress: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  completed: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  canceled: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  requires_followup: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

// ============================================
// Quick Notes Component
// ============================================

interface QuickNotesInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function QuickNotesInput({ value, onChange, placeholder }: QuickNotesInputProps) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Add a quick note...'}
        className="w-full px-3 py-2 pr-10 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] touch-manipulation"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary touch-manipulation"
          aria-label="Clear note"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ============================================
// Status Progress Bar
// ============================================

interface StatusProgressBarProps {
  currentStatus: WorkOrderStatus;
}

function StatusProgressBar({ currentStatus }: StatusProgressBarProps) {
  const allStatuses: WorkOrderStatus[] = [
    'scheduled',
    'confirmed',
    'enroute',
    'on_site',
    'in_progress',
    'completed',
  ];

  const currentIndex = allStatuses.indexOf(currentStatus);

  return (
    <div className="flex items-center gap-1">
      {allStatuses.map((status, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;

        return (
          <div
            key={status}
            className={cn(
              'flex-1 h-1.5 rounded-full transition-colors',
              isCompleted && 'bg-success',
              isCurrent && 'bg-primary',
              isPending && 'bg-bg-muted'
            )}
            title={WORK_ORDER_STATUS_LABELS[status]}
          />
        );
      })}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function StatusUpdateWidget({
  currentStatus,
  onStatusChange,
  disabled = false,
  showQuickNotes = true,
  compact = false,
}: StatusUpdateWidgetProps) {
  const [quickNote, setQuickNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAllStatuses, setShowAllStatuses] = useState(false);

  const nextStatus = STATUS_FLOW[currentStatus];
  const canProgress = nextStatus !== null && !disabled;

  // Handle status update
  const handleStatusUpdate = useCallback(
    async (targetStatus: WorkOrderStatus) => {
      if (disabled || isUpdating) return;

      setIsUpdating(true);
      try {
        const note = quickNote.trim();
        await onStatusChange(targetStatus, note || undefined);
        setQuickNote('');
        setShowAllStatuses(false);
      } finally {
        setIsUpdating(false);
      }
    },
    [disabled, isUpdating, quickNote, onStatusChange]
  );

  // Get available statuses for manual selection
  const availableStatuses = useMemo(() => {
    const statuses: WorkOrderStatus[] = [
      'scheduled',
      'confirmed',
      'enroute',
      'on_site',
      'in_progress',
      'completed',
      'requires_followup',
    ];
    return statuses.filter((s) => s !== currentStatus);
  }, [currentStatus]);

  // Compact mode for inline display
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant="default"
          style={{
            backgroundColor: `${STATUS_COLORS[currentStatus]}20`,
            color: STATUS_COLORS[currentStatus],
          }}
        >
          {WORK_ORDER_STATUS_LABELS[currentStatus]}
        </Badge>
        {canProgress && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleStatusUpdate(nextStatus)}
            disabled={isUpdating}
            className="min-h-[36px] touch-manipulation"
          >
            {isUpdating ? '...' : STATUS_ACTION_LABELS[currentStatus]}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <StatusProgressBar currentStatus={currentStatus} />

      {/* Current Status Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="p-2 rounded-lg"
            style={{
              backgroundColor: `${STATUS_COLORS[currentStatus]}20`,
              color: STATUS_COLORS[currentStatus],
            }}
          >
            {STATUS_ICONS[currentStatus]}
          </span>
          <div>
            <p className="text-sm text-text-secondary">Current Status</p>
            <p className="font-semibold text-text-primary">
              {WORK_ORDER_STATUS_LABELS[currentStatus]}
            </p>
          </div>
        </div>

        {/* Toggle all statuses button */}
        <button
          onClick={() => setShowAllStatuses(!showAllStatuses)}
          className="p-2 text-text-secondary hover:text-text-primary touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={showAllStatuses ? 'Hide status options' : 'Show all status options'}
        >
          <svg
            className={cn('w-5 h-5 transition-transform', showAllStatuses && 'rotate-180')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Quick Notes Input */}
      {showQuickNotes && canProgress && (
        <QuickNotesInput
          value={quickNote}
          onChange={setQuickNote}
          placeholder="Add note with status update..."
        />
      )}

      {/* Next Status Button */}
      {canProgress && !showAllStatuses && (
        <Button
          variant="primary"
          size="lg"
          onClick={() => handleStatusUpdate(nextStatus)}
          disabled={isUpdating}
          className="w-full min-h-[56px] touch-manipulation text-base font-semibold"
        >
          <span
            className="p-1 rounded"
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
            }}
          >
            {STATUS_ICONS[nextStatus]}
          </span>
          <span>{isUpdating ? 'Updating...' : STATUS_ACTION_LABELS[currentStatus]}</span>
        </Button>
      )}

      {/* All Status Options */}
      {showAllStatuses && (
        <div className="grid grid-cols-2 gap-2">
          {availableStatuses.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusUpdate(status)}
              disabled={isUpdating}
              className={cn(
                'flex items-center gap-2 p-3 rounded-lg border border-border min-h-[48px] touch-manipulation transition-colors',
                'hover:bg-bg-hover active:bg-bg-muted',
                isUpdating && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[status] }}
              />
              <span className="text-sm font-medium text-text-primary">
                {WORK_ORDER_STATUS_LABELS[status]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Completed State */}
      {!canProgress && currentStatus === 'completed' && (
        <div className="flex items-center justify-center gap-2 p-4 bg-success/10 rounded-lg">
          <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-semibold text-success">Job Completed</span>
        </div>
      )}

      {/* Canceled State */}
      {!canProgress && currentStatus === 'canceled' && (
        <div className="flex items-center justify-center gap-2 p-4 bg-danger/10 rounded-lg">
          <svg className="w-6 h-6 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="font-semibold text-danger">Job Canceled</span>
        </div>
      )}

      {/* Timestamp */}
      <p className="text-xs text-text-secondary text-center">
        Last update will be timestamped automatically
      </p>
    </div>
  );
}

export default StatusUpdateWidget;
