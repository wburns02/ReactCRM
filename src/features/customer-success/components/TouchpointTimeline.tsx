/**
 * Touchpoint Timeline Component
 *
 * Displays customer touchpoints in a chronological timeline view.
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils.ts';
import type { Touchpoint, TouchpointSentiment } from '@/api/types/customerSuccess.ts';

interface TouchpointTimelineProps {
  touchpoints: Touchpoint[];
  onSelectTouchpoint?: (touchpoint: Touchpoint) => void;
  onAddTouchpoint?: () => void;
  maxItems?: number;
  className?: string;
}

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  call: { icon: '📞', label: 'Call', color: 'bg-blue-500' },
  email_sent: { icon: '📤', label: 'Email Sent', color: 'bg-cyan-500' },
  email_received: { icon: '📥', label: 'Email Received', color: 'bg-cyan-600' },
  meeting: { icon: '📅', label: 'Meeting', color: 'bg-purple-500' },
  video_call: { icon: '📹', label: 'Video Call', color: 'bg-indigo-500' },
  chat: { icon: '💬', label: 'Chat', color: 'bg-green-500' },
  support_ticket: { icon: '🎫', label: 'Support Ticket', color: 'bg-orange-500' },
  support_resolved: { icon: '✅', label: 'Ticket Resolved', color: 'bg-green-600' },
  nps_response: { icon: '📊', label: 'NPS Response', color: 'bg-violet-500' },
  csat_response: { icon: '⭐', label: 'CSAT Response', color: 'bg-yellow-500' },
  feature_request: { icon: '💡', label: 'Feature Request', color: 'bg-amber-500' },
  bug_report: { icon: '🐛', label: 'Bug Report', color: 'bg-red-500' },
  product_feedback: { icon: '📝', label: 'Product Feedback', color: 'bg-teal-500' },
  login: { icon: '🔐', label: 'Login', color: 'bg-gray-500' },
  feature_usage: { icon: '⚡', label: 'Feature Usage', color: 'bg-blue-400' },
  milestone_achieved: { icon: '🏆', label: 'Milestone', color: 'bg-yellow-600' },
  onboarding_step: { icon: '🚀', label: 'Onboarding', color: 'bg-blue-600' },
  training_completed: { icon: '🎓', label: 'Training', color: 'bg-green-500' },
  webinar_attended: { icon: '🎥', label: 'Webinar', color: 'bg-purple-600' },
  event_attended: { icon: '🎪', label: 'Event', color: 'bg-pink-500' },
  contract_signed: { icon: '📋', label: 'Contract Signed', color: 'bg-green-700' },
  renewal: { icon: '🔄', label: 'Renewal', color: 'bg-emerald-500' },
  upsell: { icon: '📈', label: 'Upsell', color: 'bg-lime-500' },
  downgrade: { icon: '📉', label: 'Downgrade', color: 'bg-orange-600' },
  churn_risk_identified: { icon: '⚠️', label: 'Churn Risk', color: 'bg-red-600' },
  health_score_change: { icon: '❤️', label: 'Health Change', color: 'bg-pink-600' },
  qbr: { icon: '📊', label: 'QBR', color: 'bg-indigo-600' },
  executive_sponsor_change: { icon: '👔', label: 'Sponsor Change', color: 'bg-slate-500' },
  stakeholder_change: { icon: '👥', label: 'Stakeholder Change', color: 'bg-slate-600' },
  invoice_sent: { icon: '💰', label: 'Invoice Sent', color: 'bg-emerald-600' },
  payment_received: { icon: '💵', label: 'Payment', color: 'bg-green-600' },
  payment_overdue: { icon: '⏰', label: 'Payment Overdue', color: 'bg-red-500' },
  referral_given: { icon: '🤝', label: 'Referral', color: 'bg-cyan-600' },
  case_study: { icon: '📖', label: 'Case Study', color: 'bg-violet-600' },
  testimonial: { icon: '💬', label: 'Testimonial', color: 'bg-pink-500' },
  social_mention: { icon: '📱', label: 'Social Mention', color: 'bg-blue-500' },
  escalation: { icon: '🚨', label: 'Escalation', color: 'bg-red-700' },
  executive_escalation: { icon: '🔴', label: 'Exec Escalation', color: 'bg-red-800' },
  product_launch: { icon: '🎉', label: 'Product Launch', color: 'bg-purple-500' },
  integration_added: { icon: '🔌', label: 'Integration', color: 'bg-blue-600' },
  api_usage: { icon: '🔧', label: 'API Usage', color: 'bg-gray-600' },
  custom: { icon: '⚙️', label: 'Custom', color: 'bg-gray-500' },
};

const SENTIMENT_CONFIG: Record<TouchpointSentiment, { label: string; className: string; icon: string }> = {
  very_positive: { label: 'Very Positive', className: 'text-success', icon: '😊' },
  positive: { label: 'Positive', className: 'text-green-500', icon: '🙂' },
  neutral: { label: 'Neutral', className: 'text-text-muted', icon: '😐' },
  negative: { label: 'Negative', className: 'text-warning', icon: '😕' },
  very_negative: { label: 'Very Negative', className: 'text-danger', icon: '😞' },
};

function TouchpointItem({
  touchpoint,
  onClick,
  isLast,
}: {
  touchpoint: Touchpoint;
  onClick?: () => void;
  isLast: boolean;
}) {
  const typeConfig = TYPE_CONFIG[touchpoint.touchpoint_type] || TYPE_CONFIG.custom;
  const sentimentConfig = touchpoint.sentiment ? SENTIMENT_CONFIG[touchpoint.sentiment] : null;

  const formattedDate = useMemo(() => {
    if (!touchpoint.occurred_at) return 'Unknown';
    const date = new Date(touchpoint.occurred_at);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    if (diffDays === 1) {
      return 'Yesterday';
    }
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [touchpoint.occurred_at]);

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border" />
      )}

      {/* Icon */}
      <div className={cn(
        'relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm z-10',
        typeConfig.color
      )}>
        {typeConfig.icon}
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex-1 pb-6 min-w-0',
          onClick && 'cursor-pointer'
        )}
        onClick={onClick}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-text-primary">{typeConfig.label}</span>
            {sentimentConfig && (
              <span className={cn('text-sm', sentimentConfig.className)}>
                {sentimentConfig.icon}
              </span>
            )}
          </div>
          <span className="text-xs text-text-muted whitespace-nowrap">{formattedDate}</span>
        </div>

        {touchpoint.subject && (
          <p className="text-sm font-medium text-text-secondary mb-1">{touchpoint.subject}</p>
        )}

        {touchpoint.summary && (
          <p className="text-sm text-text-secondary line-clamp-2">{touchpoint.summary}</p>
        )}

        {/* Metrics */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {touchpoint.duration_minutes && (
            <span className="text-xs text-text-muted">
              {touchpoint.duration_minutes} min
            </span>
          )}
          {touchpoint.channel && (
            <span className="text-xs text-text-muted capitalize">
              via {touchpoint.channel}
            </span>
          )}
          {touchpoint.sentiment_score !== null && touchpoint.sentiment_score !== undefined && (
            <span className={cn(
              'text-xs',
              touchpoint.sentiment_score > 0 ? 'text-success' :
              touchpoint.sentiment_score < 0 ? 'text-danger' : 'text-text-muted'
            )}>
              Score: {touchpoint.sentiment_score > 0 ? '+' : ''}{touchpoint.sentiment_score.toFixed(1)}
            </span>
          )}
        </div>

        {/* Outcomes or next steps */}
        {touchpoint.outcome && (
          <div className="mt-2 p-2 bg-bg-tertiary rounded text-xs text-text-secondary">
            <span className="font-medium">Outcome:</span> {touchpoint.outcome}
          </div>
        )}
      </div>
    </div>
  );
}

export function TouchpointTimeline({
  touchpoints,
  onSelectTouchpoint,
  onAddTouchpoint,
  maxItems,
  className,
}: TouchpointTimelineProps) {
  const sortedTouchpoints = useMemo(() => {
    const sorted = [...touchpoints].sort((a, b) => {
      const aTime = a.occurred_at ? new Date(a.occurred_at).getTime() : 0;
      const bTime = b.occurred_at ? new Date(b.occurred_at).getTime() : 0;
      return bTime - aTime;
    });
    return maxItems ? sorted.slice(0, maxItems) : sorted;
  }, [touchpoints, maxItems]);

  const hasMore = maxItems && touchpoints.length > maxItems;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Activity Timeline</h2>
          <p className="text-sm text-text-muted">{touchpoints.length} touchpoints</p>
        </div>
        {onAddTouchpoint && (
          <button
            onClick={onAddTouchpoint}
            className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Log Activity
          </button>
        )}
      </div>

      {/* Timeline */}
      {sortedTouchpoints.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">No activity recorded yet</p>
        </div>
      ) : (
        <div className="pt-2">
          {sortedTouchpoints.map((touchpoint, index) => (
            <TouchpointItem
              key={touchpoint.id}
              touchpoint={touchpoint}
              onClick={onSelectTouchpoint ? () => onSelectTouchpoint(touchpoint) : undefined}
              isLast={index === sortedTouchpoints.length - 1}
            />
          ))}
        </div>
      )}

      {/* Show more */}
      {hasMore && (
        <div className="text-center">
          <button className="text-sm text-primary hover:text-primary-hover">
            View all {touchpoints.length} activities
          </button>
        </div>
      )}
    </div>
  );
}
