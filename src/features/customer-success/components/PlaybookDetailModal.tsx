/**
 * Playbook Detail Modal Component
 *
 * Shows playbook details and steps, with option to trigger for a customer.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils.ts';
import type { Playbook, PlaybookStep } from '@/api/types/customerSuccess.ts';

interface PlaybookDetailModalProps {
  playbook: Playbook;
  isOpen: boolean;
  onClose: () => void;
  onTrigger?: (playbook: Playbook) => void;
  onEdit?: (playbook: Playbook) => void;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; className: string }> = {
  onboarding: { label: 'Onboarding', icon: '🚀', className: 'bg-blue-500/10 text-blue-500' },
  adoption: { label: 'Adoption', icon: '📈', className: 'bg-green-500/10 text-green-500' },
  expansion: { label: 'Expansion', icon: '💎', className: 'bg-purple-500/10 text-purple-500' },
  renewal: { label: 'Renewal', icon: '🔄', className: 'bg-cyan-500/10 text-cyan-500' },
  risk_mitigation: { label: 'Risk', icon: '⚠️', className: 'bg-warning/10 text-warning' },
  churn_prevention: { label: 'Churn Prevention', icon: '🛡️', className: 'bg-danger/10 text-danger' },
  churn_risk: { label: 'Churn Risk', icon: '⚠️', className: 'bg-danger/10 text-danger' },
  qbr: { label: 'QBR', icon: '📊', className: 'bg-indigo-500/10 text-indigo-500' },
  escalation: { label: 'Escalation', icon: '🚨', className: 'bg-red-500/10 text-red-500' },
  winback: { label: 'Winback', icon: '🎯', className: 'bg-amber-500/10 text-amber-500' },
  executive_sponsor: { label: 'Exec Sponsor', icon: '👔', className: 'bg-slate-500/10 text-slate-500' },
  champion_change: { label: 'Champion Change', icon: '🔄', className: 'bg-orange-500/10 text-orange-500' },
  implementation: { label: 'Implementation', icon: '🔧', className: 'bg-teal-500/10 text-teal-500' },
  training: { label: 'Training', icon: '🎓', className: 'bg-violet-500/10 text-violet-500' },
  custom: { label: 'Custom', icon: '⚙️', className: 'bg-gray-500/10 text-gray-500' },
};

const STEP_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  call: { label: 'Call', icon: '📞', color: 'text-blue-500' },
  email: { label: 'Email', icon: '📧', color: 'text-green-500' },
  meeting: { label: 'Meeting', icon: '📅', color: 'text-purple-500' },
  internal: { label: 'Internal', icon: '📝', color: 'text-gray-500' },
  review: { label: 'Review', icon: '👀', color: 'text-amber-500' },
  documentation: { label: 'Documentation', icon: '📄', color: 'text-cyan-500' },
  training: { label: 'Training', icon: '🎓', color: 'text-violet-500' },
  health_review: { label: 'Health Review', icon: '💊', color: 'text-red-500' },
  check_in: { label: 'Check-in', icon: '✅', color: 'text-teal-500' },
};

function StepCard({ step, index }: { step: PlaybookStep; index: number }) {
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
            {step.due_days && (
              <span className="text-xs text-text-muted">
                Due in {step.due_days} day{step.due_days !== 1 ? 's' : ''}
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
            {step.instructions && (
              <div>
                <h5 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                  Instructions
                </h5>
                <div className="text-sm text-text-secondary whitespace-pre-wrap bg-bg-secondary p-3 rounded-lg">
                  {step.instructions}
                </div>
              </div>
            )}

            {step.talk_track && (
              <div>
                <h5 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                  Talk Track
                </h5>
                <div className="text-sm text-text-secondary whitespace-pre-wrap bg-bg-secondary p-3 rounded-lg border-l-4 border-primary">
                  {step.talk_track}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-text-muted">
              {step.default_assignee_role && (
                <span>Assignee: {step.default_assignee_role}</span>
              )}
              {step.days_from_start !== undefined && step.days_from_start > 0 && (
                <span>Starts day {step.days_from_start}</span>
              )}
              {step.is_required && (
                <span className="text-warning">Required</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PlaybookDetailModal({
  playbook,
  isOpen,
  onClose,
  onTrigger,
  onEdit,
}: PlaybookDetailModalProps) {
  if (!isOpen) return null;

  const category = CATEGORY_CONFIG[playbook.category] || CATEGORY_CONFIG.custom;
  const steps = playbook.steps || [];

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
                <span className={cn('px-2 py-0.5 text-xs rounded-full', category.className)}>
                  {category.icon} {category.label}
                </span>
                {!playbook.is_active && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-bg-tertiary text-text-muted">
                    Inactive
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-text-primary">{playbook.name}</h2>
              {playbook.description && (
                <p className="text-sm text-text-secondary mt-1">{playbook.description}</p>
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
          <div className="flex items-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-text-secondary">{steps.length} steps</span>
            </div>

            {playbook.estimated_hours && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-text-secondary">{playbook.estimated_hours}h estimated</span>
              </div>
            )}

            {playbook.target_completion_days && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-text-secondary">{playbook.target_completion_days} days target</span>
              </div>
            )}

            {playbook.times_triggered !== undefined && playbook.times_triggered > 0 && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-text-secondary">{playbook.times_triggered} runs</span>
              </div>
            )}

            {playbook.success_rate !== null && playbook.success_rate !== undefined && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className={cn(
                  playbook.success_rate >= 70 ? 'text-success' :
                  playbook.success_rate >= 40 ? 'text-warning' : 'text-danger'
                )}>
                  {playbook.success_rate.toFixed(0)}% success
                </span>
              </div>
            )}
          </div>

          {/* Trigger info */}
          {playbook.trigger_type && playbook.trigger_type !== 'manual' && (
            <div className="mt-4 p-3 bg-bg-tertiary rounded-lg">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-text-primary">Auto-trigger:</span>{' '}
                {playbook.trigger_type.replace('_', ' ')}
                {playbook.trigger_health_threshold && (
                  <span> when health score {'<'} {playbook.trigger_health_threshold}</span>
                )}
                {playbook.trigger_days_to_renewal && (
                  <span> {playbook.trigger_days_to_renewal} days before renewal</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-4">
            Playbook Steps
          </h3>
          {steps.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <p>No steps defined for this playbook</p>
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
              onClick={() => onEdit(playbook)}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Edit Playbook
            </button>
          )}
          {onTrigger && playbook.is_active && (
            <button
              onClick={() => onTrigger(playbook)}
              className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Trigger Playbook
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
