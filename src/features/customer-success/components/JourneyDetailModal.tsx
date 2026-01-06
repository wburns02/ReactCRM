/**
 * Journey Detail Modal Component
 *
 * Shows journey details and steps, with options to manage the journey.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils.ts';
import type { Journey, JourneyStep, JourneyStatus } from '@/api/types/customerSuccess.ts';

interface JourneyDetailModalProps {
  journey: Journey;
  isOpen: boolean;
  onClose: () => void;
  onToggleActive?: (journey: Journey) => void;
  onEdit?: (journey: Journey) => void;
}

const STATUS_CONFIG: Record<JourneyStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-500/10 text-gray-500' },
  active: { label: 'Active', className: 'bg-success/10 text-success' },
  paused: { label: 'Paused', className: 'bg-warning/10 text-warning' },
  archived: { label: 'Archived', className: 'bg-text-muted/10 text-text-muted' },
};

const JOURNEY_TYPE_CONFIG: Record<string, { label: string; icon: string; className: string }> = {
  onboarding: { label: 'Onboarding', icon: '🚀', className: 'bg-blue-500/10 text-blue-500' },
  adoption: { label: 'Adoption', icon: '📈', className: 'bg-green-500/10 text-green-500' },
  retention: { label: 'Retention', icon: '🔄', className: 'bg-cyan-500/10 text-cyan-500' },
  expansion: { label: 'Expansion', icon: '💎', className: 'bg-purple-500/10 text-purple-500' },
  renewal: { label: 'Renewal', icon: '📋', className: 'bg-amber-500/10 text-amber-500' },
  win_back: { label: 'Win Back', icon: '🎯', className: 'bg-red-500/10 text-red-500' },
  custom: { label: 'Custom', icon: '⚙️', className: 'bg-gray-500/10 text-gray-500' },
};

const STEP_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  email: { label: 'Email', icon: '📧', color: 'text-blue-500' },
  task: { label: 'Task', icon: '✅', color: 'text-green-500' },
  wait: { label: 'Wait', icon: '⏳', color: 'text-amber-500' },
  condition: { label: 'Condition', icon: '🔀', color: 'text-purple-500' },
  webhook: { label: 'Webhook', icon: '🔗', color: 'text-gray-500' },
  human_touchpoint: { label: 'Human Touch', icon: '👤', color: 'text-cyan-500' },
  in_app_message: { label: 'In-App Message', icon: '💬', color: 'text-indigo-500' },
  sms: { label: 'SMS', icon: '📱', color: 'text-teal-500' },
  notification: { label: 'Notification', icon: '🔔', color: 'text-orange-500' },
  update_field: { label: 'Update Field', icon: '📝', color: 'text-slate-500' },
  add_tag: { label: 'Add Tag', icon: '🏷️', color: 'text-pink-500' },
  enroll_journey: { label: 'Enroll Journey', icon: '🗺️', color: 'text-violet-500' },
  trigger_playbook: { label: 'Trigger Playbook', icon: '📘', color: 'text-rose-500' },
};

function StepCard({ step, index }: { step: JourneyStep; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const stepConfig = STEP_TYPE_CONFIG[step.step_type] || { label: step.step_type, icon: '📋', color: 'text-text-secondary' };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-start gap-4 text-left hover:bg-bg-tertiary/50 transition-colors"
      >
        {/* Step number */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
          {index + 1}
        </div>

        {/* Step info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-lg', stepConfig.color)}>{stepConfig.icon}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted">
              {stepConfig.label}
            </span>
            {step.wait_duration_hours && (
              <span className="text-xs text-text-muted">
                Wait {step.wait_duration_hours}h
              </span>
            )}
          </div>
          <h4 className="font-medium text-text-primary">{step.name}</h4>
          {step.description && (
            <p className="text-sm text-text-secondary mt-1 line-clamp-2">{step.description}</p>
          )}
        </div>

        {/* Expand icon */}
        <svg
          className={cn('w-5 h-5 text-text-muted transition-transform', isExpanded && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-border bg-bg-tertiary/30">
          <div className="pl-12 space-y-4">
            {step.condition_rules ? (
              <div>
                <h5 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                  Condition Rules
                </h5>
                <pre className="text-sm text-text-secondary whitespace-pre-wrap bg-bg-secondary p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(step.condition_rules as object, null, 2)}
                </pre>
              </div>
            ) : null}

            {step.action_config ? (
              <div>
                <h5 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                  Action Configuration
                </h5>
                <pre className="text-sm text-text-secondary whitespace-pre-wrap bg-bg-secondary p-3 rounded-lg border-l-4 border-primary overflow-x-auto">
                  {JSON.stringify(step.action_config as object, null, 2)}
                </pre>
              </div>
            ) : null}

            <div className="flex items-center gap-4 text-xs text-text-muted">
              {step.wait_until_time && (
                <span>Wait until: {step.wait_until_time}</span>
              )}
              {step.is_required && (
                <span className="text-warning">Required</span>
              )}
              {!step.is_active && (
                <span className="text-text-muted">Inactive</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function JourneyDetailModal({
  journey,
  isOpen,
  onClose,
  onToggleActive,
  onEdit,
}: JourneyDetailModalProps) {
  if (!isOpen) return null;

  const journeyType = JOURNEY_TYPE_CONFIG[journey.journey_type] || JOURNEY_TYPE_CONFIG.custom;
  const statusConfig = STATUS_CONFIG[journey.status];
  const steps = journey.steps || [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-20 px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-bg-primary border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn('px-2 py-0.5 text-xs rounded-full', journeyType.className)}>
                  {journeyType.icon} {journeyType.label}
                </span>
                <span className={cn('px-2 py-0.5 text-xs rounded-full', statusConfig.className)}>
                  {statusConfig.label}
                </span>
              </div>
              <h2 className="text-xl font-bold text-text-primary">{journey.name}</h2>
              {journey.description && (
                <p className="text-sm text-text-secondary mt-1">{journey.description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-primary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4 text-sm flex-wrap">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-text-secondary">{journey.step_count || steps.length} steps</span>
            </div>

            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-text-secondary">{journey.active_enrollments || journey.active_enrolled || 0} enrolled</span>
            </div>

            {journey.total_enrolled !== undefined && journey.total_enrolled > 0 && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-text-secondary">{journey.total_enrolled} total enrolled</span>
              </div>
            )}

            {journey.completed_count !== undefined && journey.completed_count > 0 && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-text-secondary">{journey.completed_count} completed</span>
              </div>
            )}

            {journey.conversion_rate !== null && journey.conversion_rate !== undefined && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className={cn(
                  journey.conversion_rate >= 50 ? 'text-success' :
                  journey.conversion_rate >= 25 ? 'text-warning' : 'text-danger'
                )}>
                  {journey.conversion_rate.toFixed(1)}% conversion
                </span>
              </div>
            )}

            {journey.avg_completion_days !== null && journey.avg_completion_days !== undefined && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-text-secondary">{journey.avg_completion_days.toFixed(1)} days avg</span>
              </div>
            )}
          </div>

          {/* Trigger info */}
          {journey.trigger_type && journey.trigger_type !== 'manual' && (
            <div className="mt-4 p-3 bg-bg-tertiary rounded-lg">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-text-primary">Trigger:</span>{' '}
                {journey.trigger_type.replace('_', ' ')}
                {journey.trigger_event && (
                  <span> on "{journey.trigger_event}"</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-4">
            Journey Steps
          </h3>
          {steps.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <p>No steps defined for this journey</p>
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map((step, index) => (
                <StepCard key={step.id || index} step={step} index={index} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-border bg-bg-secondary flex items-center justify-end gap-3">
          {onEdit && (
            <button
              onClick={() => onEdit(journey)}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Edit Journey
            </button>
          )}
          {onToggleActive && journey.status !== 'archived' && (
            <button
              onClick={() => onToggleActive(journey)}
              className={cn(
                'px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2',
                journey.status === 'active'
                  ? 'bg-warning/10 text-warning hover:bg-warning/20'
                  : 'bg-success/10 text-success hover:bg-success/20'
              )}
            >
              {journey.status === 'active' ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pause Journey
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Activate Journey
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
