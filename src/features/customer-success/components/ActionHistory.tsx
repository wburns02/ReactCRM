/**
 * Action History Component
 *
 * Shows a timeline of actions taken on survey responses.
 * Displays who took action, when, what type, resolution status, and notes.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils.ts';
import {
  useResponseActions,
  useCompleteSurveyAction,
  type SurveyAction,
  type SurveyActionType,
  type ActionStatus,
} from '@/api/hooks/useSurveyActions.ts';

// ============================================
// Types
// ============================================

interface ActionHistoryProps {
  responseId: number;
  className?: string;
}

interface ActionHistoryListProps {
  actions: SurveyAction[];
  onCompleteAction?: (actionId: number) => void;
  isCompletingId?: number;
}

// ============================================
// Action Type Configuration
// ============================================

const ACTION_TYPE_CONFIG: Record<SurveyActionType, { label: string; icon: string; color: string }> = {
  schedule_callback: { label: 'Callback Scheduled', icon: '📞', color: 'text-blue-500' },
  create_ticket: { label: 'Ticket Created', icon: '🎫', color: 'text-orange-500' },
  generate_offer: { label: 'Offer Generated', icon: '💰', color: 'text-green-500' },
  book_appointment: { label: 'Appointment Booked', icon: '📅', color: 'text-purple-500' },
  send_email: { label: 'Email Sent', icon: '📧', color: 'text-cyan-500' },
  create_task: { label: 'Task Created', icon: '📋', color: 'text-indigo-500' },
  trigger_playbook: { label: 'Playbook Triggered', icon: '📖', color: 'text-pink-500' },
  assign_csm: { label: 'CSM Assigned', icon: '👤', color: 'text-teal-500' },
  escalate: { label: 'Escalated', icon: '🚨', color: 'text-danger' },
};

const STATUS_CONFIG: Record<ActionStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pending', bg: 'bg-gray-500/10', text: 'text-gray-500' },
  in_progress: { label: 'In Progress', bg: 'bg-warning/10', text: 'text-warning' },
  completed: { label: 'Completed', bg: 'bg-success/10', text: 'text-success' },
  cancelled: { label: 'Cancelled', bg: 'bg-text-muted/10', text: 'text-text-muted' },
  failed: { label: 'Failed', bg: 'bg-danger/10', text: 'text-danger' },
};

// ============================================
// Helper Components
// ============================================

function StatusBadge({ status }: { status: ActionStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', config.bg, config.text)}>
      {config.label}
    </span>
  );
}

function TimelineIcon({ actionType, status }: { actionType: SurveyActionType; status: ActionStatus }) {
  const config = ACTION_TYPE_CONFIG[actionType];
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed' || status === 'cancelled';

  return (
    <div
      className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center text-lg',
        isCompleted
          ? 'bg-success/10'
          : isFailed
          ? 'bg-danger/10'
          : 'bg-bg-hover'
      )}
    >
      {config.icon}
    </div>
  );
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function formatFullTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ============================================
// Action Timeline Item
// ============================================

interface TimelineItemProps {
  action: SurveyAction;
  isLast: boolean;
  onComplete?: () => void;
  isCompleting?: boolean;
}

function TimelineItem({ action, isLast, onComplete, isCompleting }: TimelineItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [outcomeNotes, setOutcomeNotes] = useState('');

  const config = ACTION_TYPE_CONFIG[action.action_type];

  const handleCompleteSubmit = () => {
    if (onComplete && outcome) {
      onComplete();
      setShowCompleteForm(false);
    }
  };

  return (
    <div className="relative flex gap-4">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-5 top-12 w-0.5 h-[calc(100%-3rem)] bg-border" />
      )}

      {/* Icon */}
      <TimelineIcon actionType={action.action_type} status={action.status} />

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="bg-bg-card border border-border rounded-lg p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('font-medium', config.color)}>{config.label}</span>
                <StatusBadge status={action.status} />
              </div>
              <p className="text-sm font-medium text-text-primary">{action.title}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted" title={formatFullTimestamp(action.created_at)}>
                {formatTimestamp(action.created_at)}
              </p>
              {action.assigned_to_name && (
                <p className="text-xs text-text-secondary mt-1">
                  Assigned to {action.assigned_to_name}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          {action.description && (
            <p className="text-sm text-text-secondary mb-3">{action.description}</p>
          )}

          {/* Reason */}
          {action.reason && (
            <div className="mb-3 p-2 bg-bg-hover rounded text-sm">
              <span className="text-text-muted">Reason: </span>
              <span className="text-text-secondary">{action.reason}</span>
            </div>
          )}

          {/* Completed Info */}
          {action.status === 'completed' && action.completed_at && (
            <div className="mb-3 p-3 bg-success/5 border border-success/20 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium text-success">Completed</span>
                <span className="text-xs text-text-muted">
                  {formatFullTimestamp(action.completed_at)}
                </span>
              </div>
              {action.outcome && (
                <p className="text-sm text-text-secondary">
                  Outcome: <span className="font-medium">{action.outcome}</span>
                </p>
              )}
              {action.outcome_notes && (
                <p className="text-sm text-text-muted mt-1">{action.outcome_notes}</p>
              )}
            </div>
          )}

          {/* Notes (Expandable) */}
          {action.notes && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark mb-2"
            >
              <svg
                className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {isExpanded ? 'Hide notes' : 'Show notes'}
            </button>
          )}
          {isExpanded && action.notes && (
            <div className="p-3 bg-bg-hover rounded-lg text-sm text-text-secondary">
              {action.notes}
            </div>
          )}

          {/* Actions */}
          {(action.status === 'pending' || action.status === 'in_progress') && onComplete && (
            <div className="mt-3 pt-3 border-t border-border">
              {showCompleteForm ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">
                      Outcome <span className="text-danger">*</span>
                    </label>
                    <select
                      value={outcome}
                      onChange={(e) => setOutcome(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-border rounded bg-bg-primary text-text-primary"
                    >
                      <option value="">Select outcome...</option>
                      <option value="successful">Successful</option>
                      <option value="partially_successful">Partially Successful</option>
                      <option value="unsuccessful">Unsuccessful</option>
                      <option value="customer_satisfied">Customer Satisfied</option>
                      <option value="follow_up_needed">Follow-up Needed</option>
                      <option value="escalated">Escalated</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
                    <textarea
                      value={outcomeNotes}
                      onChange={(e) => setOutcomeNotes(e.target.value)}
                      placeholder="Add outcome notes..."
                      rows={2}
                      className="w-full px-2 py-1.5 text-sm border border-border rounded bg-bg-primary text-text-primary resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCompleteSubmit}
                      disabled={!outcome || isCompleting}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-success rounded hover:bg-success/90 disabled:opacity-50"
                    >
                      {isCompleting ? 'Completing...' : 'Mark Complete'}
                    </button>
                    <button
                      onClick={() => setShowCompleteForm(false)}
                      className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded hover:bg-bg-hover"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCompleteForm(true)}
                  className="px-3 py-1.5 text-xs font-medium text-success border border-success/30 rounded hover:bg-success/10 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Mark as Complete
                </button>
              )}
            </div>
          )}

          {/* Created By */}
          {action.created_by_name && (
            <p className="mt-3 pt-3 border-t border-border text-xs text-text-muted">
              Created by {action.created_by_name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Action History List
// ============================================

function ActionHistoryList({ actions, onCompleteAction, isCompletingId }: ActionHistoryListProps) {
  if (actions.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted">
        <svg
          className="w-12 h-12 mx-auto mb-3 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm">No actions taken yet</p>
      </div>
    );
  }

  // Sort by created_at descending (most recent first)
  const sortedActions = [...actions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-0">
      {sortedActions.map((action, idx) => (
        <TimelineItem
          key={action.id}
          action={action}
          isLast={idx === sortedActions.length - 1}
          onComplete={onCompleteAction ? () => onCompleteAction(action.id) : undefined}
          isCompleting={isCompletingId === action.id}
        />
      ))}
    </div>
  );
}

// ============================================
// Summary Stats
// ============================================

function ActionSummary({ actions }: { actions: SurveyAction[] }) {
  const total = actions.length;
  const completed = actions.filter((a) => a.status === 'completed').length;
  const pending = actions.filter((a) => a.status === 'pending' || a.status === 'in_progress').length;
  const failed = actions.filter((a) => a.status === 'failed' || a.status === 'cancelled').length;

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <div className="bg-bg-hover rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-text-primary">{total}</p>
        <p className="text-xs text-text-muted">Total Actions</p>
      </div>
      <div className="bg-success/10 rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-success">{completed}</p>
        <p className="text-xs text-text-muted">Completed</p>
      </div>
      <div className="bg-warning/10 rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-warning">{pending}</p>
        <p className="text-xs text-text-muted">In Progress</p>
      </div>
      <div className="bg-danger/10 rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-danger">{failed}</p>
        <p className="text-xs text-text-muted">Failed</p>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function ActionHistory({ responseId, className }: ActionHistoryProps) {
  const { data: actions, isLoading, error } = useResponseActions(responseId);
  const completeMutation = useCompleteSurveyAction();

  const handleCompleteAction = (actionId: number) => {
    completeMutation.mutate({
      actionId,
      outcome: 'successful',
      outcome_notes: undefined,
    });
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="animate-pulse">
          <div className="h-6 bg-bg-hover rounded w-32 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 bg-bg-hover rounded-full" />
                <div className="flex-1">
                  <div className="h-24 bg-bg-hover rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('p-4 bg-danger/10 rounded-lg text-danger text-sm', className)}>
        Failed to load action history. Please try again.
      </div>
    );
  }

  const actionList = actions || [];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Action History
        </h3>
      </div>

      {/* Summary */}
      {actionList.length > 0 && <ActionSummary actions={actionList} />}

      {/* Timeline */}
      <ActionHistoryList
        actions={actionList}
        onCompleteAction={handleCompleteAction}
        isCompletingId={completeMutation.isPending ? undefined : undefined}
      />
    </div>
  );
}

// ============================================
// Standalone Timeline Component (for embedding)
// ============================================

interface ActionTimelineProps {
  actions: SurveyAction[];
  showSummary?: boolean;
  className?: string;
}

export function ActionTimeline({ actions, showSummary = false, className }: ActionTimelineProps) {
  return (
    <div className={className}>
      {showSummary && actions.length > 0 && <ActionSummary actions={actions} />}
      <ActionHistoryList actions={actions} />
    </div>
  );
}
