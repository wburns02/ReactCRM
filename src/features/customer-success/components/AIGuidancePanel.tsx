/**
 * AI Guidance Panel - "WHAT DO I DO NOW?" Component
 *
 * The heart of the foolproof escalation system - designed so a 12-year-old
 * can achieve 95% CSAT and 85 NPS.
 *
 * Features:
 * - Giant action button with clear next step
 * - Sentiment indicator with emoji
 * - Script/playbook with exact words to say
 * - What NOT to do warnings
 * - Similar resolved cases for reference
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { cn } from '@/lib/utils';

interface AIGuidance {
  escalation_id: number;
  summary: string;
  sentiment: {
    score: number;
    label: string;
    emoji: string;
    confidence: number;
    key_phrases: string[];
  };
  recommended_action: {
    type: string;
    urgency: string;
    urgency_minutes: number;
    reason: string;
    predicted_success: number;
    time_estimate_minutes: number;
    big_button_text: string;
  };
  script: {
    opening: string;
    key_points: string[];
    empathy_statements: string[];
    closing: string;
    what_not_to_say: string[];
  };
  win_condition: string;
  playbook: {
    id: string;
    name: string;
    success_rate: number;
    steps: Array<{
      order: number;
      action: string;
      description: string;
      script?: string;
    }>;
  } | null;
  similar_cases: Array<{
    id: number;
    title: string;
    outcome: string;
    resolution_time_hours: number | null;
    resolution_summary: string | null;
  }>;
  priority_score: number;
  sla_status: {
    status: string;
    color: string;
    message: string;
    hours_remaining?: number;
  };
  customer_context: {
    name: string;
    tenure_days: number;
    lifetime_value: number | null;
    past_escalations: number;
  };
}

interface AIGuidancePanelProps {
  escalationId: number;
  onActionTaken?: (action: string) => void;
}

function SentimentIndicator({ sentiment }: { sentiment: AIGuidance['sentiment'] }) {
  const getBackgroundColor = () => {
    if (sentiment.score < -0.5) return 'bg-red-500/10 border-red-500/30';
    if (sentiment.score < -0.2) return 'bg-orange-500/10 border-orange-500/30';
    if (sentiment.score < 0.2) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-green-500/10 border-green-500/30';
  };

  return (
    <div className={cn('p-4 rounded-xl border-2', getBackgroundColor())}>
      <div className="flex items-center gap-3">
        <span className="text-4xl">{sentiment.emoji}</span>
        <div>
          <p className="text-lg font-bold text-text-primary">{sentiment.label}</p>
          <p className="text-sm text-text-muted">
            {Math.round(sentiment.confidence * 100)}% confidence
          </p>
        </div>
      </div>
      {sentiment.key_phrases.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {sentiment.key_phrases.map((phrase, i) => (
            <span
              key={i}
              className="px-2 py-1 text-xs bg-bg-hover rounded-full text-text-secondary"
            >
              "{phrase}"
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function BigActionButton({
  action,
  onAction,
}: {
  action: AIGuidance['recommended_action'];
  onAction: () => void;
}) {
  const urgencyColors = {
    immediate: 'bg-red-600 hover:bg-red-700 animate-pulse',
    urgent: 'bg-orange-500 hover:bg-orange-600',
    high: 'bg-yellow-500 hover:bg-yellow-600 text-black',
    normal: 'bg-primary hover:bg-primary-dark',
  };

  return (
    <div className="space-y-3">
      <button
        onClick={onAction}
        className={cn(
          'w-full py-6 px-8 rounded-2xl text-white text-2xl font-bold transition-all shadow-lg hover:shadow-xl',
          urgencyColors[action.urgency as keyof typeof urgencyColors] || urgencyColors.normal
        )}
      >
        {action.big_button_text}
      </button>
      <div className="flex justify-between text-sm">
        <span className="text-text-muted">
          {action.urgency === 'immediate' && '⚡ Do this within 15 minutes'}
          {action.urgency === 'urgent' && '⏰ Do this within 1 hour'}
          {action.urgency === 'high' && '📅 Do this within 4 hours'}
          {action.urgency === 'normal' && '📋 Do this within 24 hours'}
        </span>
        <span className="text-success font-medium">
          {Math.round(action.predicted_success * 100)}% success rate
        </span>
      </div>
      <p className="text-sm text-text-secondary">{action.reason}</p>
    </div>
  );
}

function ScriptViewer({ script }: { script: AIGuidance['script'] }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Opening */}
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-semibold text-text-primary flex items-center gap-2">
            <span className="text-lg">👋</span> Opening
          </h4>
          <button
            onClick={() => copyText(script.opening, 'opening')}
            className="text-xs text-primary hover:text-primary-dark"
          >
            {copied === 'opening' ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-text-secondary italic">"{script.opening}"</p>
      </div>

      {/* Key Points */}
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <h4 className="font-semibold text-text-primary flex items-center gap-2 mb-3">
          <span className="text-lg">📝</span> Key Points to Cover
        </h4>
        <ul className="space-y-2">
          {script.key_points.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
              <span className="text-primary font-bold">{i + 1}.</span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* Empathy Statements */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <h4 className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-3">
          <span className="text-lg">💙</span> Empathy Statements
        </h4>
        <ul className="space-y-2">
          {script.empathy_statements.map((statement, i) => (
            <li
              key={i}
              className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 p-2 rounded"
              onClick={() => copyText(statement, `empathy-${i}`)}
            >
              <span>💬</span>
              "{statement}"
              {copied === `empathy-${i}` && (
                <span className="text-xs text-success ml-auto">Copied!</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Closing */}
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-semibold text-text-primary flex items-center gap-2">
            <span className="text-lg">🎯</span> Closing
          </h4>
          <button
            onClick={() => copyText(script.closing, 'closing')}
            className="text-xs text-primary hover:text-primary-dark"
          >
            {copied === 'closing' ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-text-secondary italic">"{script.closing}"</p>
      </div>

      {/* What NOT to Say */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <h4 className="font-semibold text-red-800 dark:text-red-300 flex items-center gap-2 mb-3">
          <span className="text-lg">🚫</span> What NOT to Say
        </h4>
        <ul className="space-y-2">
          {script.what_not_to_say.map((warning, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
              <span>✗</span>
              {warning}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PlaybookChecklist({ playbook }: { playbook: AIGuidance['playbook'] }) {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  if (!playbook) return null;

  const toggleStep = (order: number) => {
    setCompletedSteps((prev) =>
      prev.includes(order) ? prev.filter((s) => s !== order) : [...prev, order]
    );
  };

  const progress = (completedSteps.length / playbook.steps.length) * 100;

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="font-semibold text-text-primary">{playbook.name}</h4>
          <p className="text-sm text-text-muted">
            {Math.round(playbook.success_rate * 100)}% success rate
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-primary">
            {completedSteps.length}/{playbook.steps.length}
          </span>
          <p className="text-xs text-text-muted">steps completed</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-bg-hover rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-success transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {playbook.steps.map((step) => (
          <div
            key={step.order}
            onClick={() => toggleStep(step.order)}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all',
              completedSteps.includes(step.order)
                ? 'bg-success/10 border border-success/30'
                : 'bg-bg-hover hover:bg-bg-hover/80'
            )}
          >
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                completedSteps.includes(step.order)
                  ? 'bg-success text-white'
                  : 'bg-bg-card border-2 border-border'
              )}
            >
              {completedSteps.includes(step.order) ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <span className="text-xs font-bold text-text-muted">{step.order}</span>
              )}
            </div>
            <div className="flex-1">
              <p
                className={cn(
                  'font-medium',
                  completedSteps.includes(step.order)
                    ? 'text-success line-through'
                    : 'text-text-primary'
                )}
              >
                {step.description}
              </p>
              {step.script && !completedSteps.includes(step.order) && (
                <p className="text-sm text-text-muted italic mt-1">"{step.script}"</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimilarCases({ cases }: { cases: AIGuidance['similar_cases'] }) {
  if (cases.length === 0) return null;

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <h4 className="font-semibold text-text-primary flex items-center gap-2 mb-3">
        <span className="text-lg">📚</span> Similar Resolved Cases
      </h4>
      <div className="space-y-3">
        {cases.map((c) => (
          <div key={c.id} className="p-3 bg-bg-hover rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-text-primary text-sm">{c.title}</span>
              <span
                className={cn(
                  'px-2 py-0.5 text-xs rounded-full',
                  c.outcome === 'saved'
                    ? 'bg-success/10 text-success'
                    : 'bg-blue-500/10 text-blue-500'
                )}
              >
                {c.outcome}
              </span>
            </div>
            {c.resolution_summary && (
              <p className="text-xs text-text-muted">{c.resolution_summary}</p>
            )}
            {c.resolution_time_hours && (
              <p className="text-xs text-text-muted mt-1">
                Resolved in {c.resolution_time_hours.toFixed(1)}h
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SLACountdown({ slaStatus }: { slaStatus: AIGuidance['sla_status'] }) {
  const colorClasses = {
    green: 'bg-success/10 text-success border-success/30',
    yellow: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
    red: 'bg-red-500/10 text-red-600 border-red-500/30',
    gray: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
  };

  return (
    <div
      className={cn(
        'p-3 rounded-xl border-2 text-center',
        colorClasses[slaStatus.color as keyof typeof colorClasses] || colorClasses.gray
      )}
    >
      <p className="text-sm font-medium">{slaStatus.message}</p>
      <p className="text-xs opacity-70 capitalize">{slaStatus.status.replace('_', ' ')}</p>
    </div>
  );
}

function WinCondition({ condition }: { condition: string }) {
  return (
    <div className="bg-gradient-to-r from-success/10 to-primary/10 border border-success/30 rounded-xl p-4">
      <h4 className="font-semibold text-success flex items-center gap-2 mb-2">
        <span className="text-lg">🏆</span> Success Looks Like
      </h4>
      <p className="text-text-primary">{condition}</p>
    </div>
  );
}

export function AIGuidancePanel({ escalationId, onActionTaken }: AIGuidancePanelProps) {
  const [activeTab, setActiveTab] = useState<'guidance' | 'script' | 'playbook'>('guidance');

  const { data: guidance, isLoading, error } = useQuery<AIGuidance>({
    queryKey: ['escalation-guidance', escalationId],
    queryFn: async () => {
      const response = await apiClient.get(`/cs/escalations/${escalationId}/ai-guidance`);
      return response.data;
    },
    enabled: !!escalationId,
    refetchInterval: 60000, // Refresh every minute
  });

  const handleAction = () => {
    if (guidance && onActionTaken) {
      onActionTaken(guidance.recommended_action.type);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-bg-card border border-border rounded-xl p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-text-muted">Analyzing escalation...</p>
      </div>
    );
  }

  if (error || !guidance) {
    return (
      <div className="bg-bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-text-muted">Unable to load AI guidance</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <div className="bg-gradient-to-r from-primary/10 to-info/10 rounded-xl p-6 border border-primary/20">
        <h2 className="text-2xl font-bold text-text-primary mb-2">WHAT DO I DO NOW?</h2>
        <p className="text-lg text-text-secondary">{guidance.summary}</p>
        <div className="flex gap-4 mt-4">
          <SLACountdown slaStatus={guidance.sla_status} />
          <div className="flex-1">
            <SentimentIndicator sentiment={guidance.sentiment} />
          </div>
        </div>
      </div>

      {/* Big Action Button */}
      <BigActionButton action={guidance.recommended_action} onAction={handleAction} />

      {/* Win Condition */}
      <WinCondition condition={guidance.win_condition} />

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: 'guidance', label: '📋 Quick Guide', icon: null },
          { id: 'script', label: '📝 Full Script', icon: null },
          { id: 'playbook', label: '✅ Playbook', icon: guidance.playbook ? ` (${guidance.playbook.steps.length} steps)` : '' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              'px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            )}
          >
            {tab.label}
            {tab.icon}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'guidance' && (
          <div className="space-y-4">
            {/* Customer Context */}
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <h4 className="font-semibold text-text-primary flex items-center gap-2 mb-3">
                <span className="text-lg">👤</span> Customer Context
              </h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-text-primary">
                    {guidance.customer_context.tenure_days}
                  </p>
                  <p className="text-xs text-text-muted">days as customer</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">
                    ${guidance.customer_context.lifetime_value?.toLocaleString() || '0'}
                  </p>
                  <p className="text-xs text-text-muted">lifetime value</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">
                    {guidance.customer_context.past_escalations}
                  </p>
                  <p className="text-xs text-text-muted">past escalations</p>
                </div>
              </div>
            </div>

            {/* Quick Script */}
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <h4 className="font-semibold text-text-primary flex items-center gap-2 mb-3">
                <span className="text-lg">💬</span> Say This First
              </h4>
              <p className="text-lg text-text-secondary italic bg-primary/5 p-4 rounded-lg border border-primary/20">
                "{guidance.script.opening}"
              </p>
            </div>

            {/* Key Points */}
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <h4 className="font-semibold text-text-primary flex items-center gap-2 mb-3">
                <span className="text-lg">🎯</span> Key Points
              </h4>
              <ul className="space-y-2">
                {guidance.script.key_points.slice(0, 3).map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-text-secondary">
                    <span className="text-primary font-bold">{i + 1}.</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <SimilarCases cases={guidance.similar_cases} />
          </div>
        )}

        {activeTab === 'script' && <ScriptViewer script={guidance.script} />}

        {activeTab === 'playbook' && (
          guidance.playbook ? (
            <PlaybookChecklist playbook={guidance.playbook} />
          ) : (
            <div className="text-center py-12 text-text-muted">
              No matching playbook for this escalation type
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default AIGuidancePanel;
