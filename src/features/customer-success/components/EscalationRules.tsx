/**
 * Escalation Rules Component
 *
 * Configure auto-escalation rules for survey responses.
 * Supports NPS score thresholds, sentiment detection, keyword triggers,
 * and automated action configuration.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils.ts';
import {
  useEscalationRules,
  useCreateEscalationRule,
  useUpdateEscalationRule,
  useDeleteEscalationRule,
  useToggleEscalationRule,
  type EscalationRule,
  type EscalationRuleFormData,
  type EscalationCondition,
  type EscalationRuleAction,
} from '@/api/hooks/useSurveyActions.ts';

// ============================================
// Types
// ============================================

interface EscalationRulesProps {
  className?: string;
}

type TriggerType = 'nps_score' | 'sentiment' | 'keywords' | 'combined';

// ============================================
// Configuration
// ============================================

const TRIGGER_TYPE_CONFIG: Record<TriggerType, { label: string; icon: string; description: string }> = {
  nps_score: {
    label: 'NPS Score',
    icon: '📊',
    description: 'Trigger based on NPS score threshold',
  },
  sentiment: {
    label: 'Sentiment',
    icon: '😔',
    description: 'Trigger based on detected sentiment',
  },
  keywords: {
    label: 'Keywords',
    icon: '🔍',
    description: 'Trigger when specific keywords are detected',
  },
  combined: {
    label: 'Combined',
    icon: '🔗',
    description: 'Multiple conditions combined',
  },
};

const ACTION_TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  create_task: { label: 'Create Task', icon: '📋' },
  send_alert: { label: 'Send Alert', icon: '🔔' },
  trigger_playbook: { label: 'Trigger Playbook', icon: '📖' },
  assign_csm: { label: 'Assign CSM', icon: '👤' },
  create_escalation: { label: 'Create Escalation', icon: '🚨' },
};

const SAMPLE_KEYWORDS = [
  'cancel',
  'competitor',
  'unhappy',
  'frustrated',
  'terrible',
  'worst',
  'switching',
  'leave',
  'disappointed',
  'refund',
];

// ============================================
// Helper Components
// ============================================

function RuleStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        'px-2 py-0.5 text-xs font-medium rounded-full',
        isActive ? 'bg-success/10 text-success' : 'bg-gray-500/10 text-gray-500'
      )}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function TriggerTypeBadge({ type }: { type: TriggerType }) {
  const config = TRIGGER_TYPE_CONFIG[type];
  return (
    <span className="flex items-center gap-1 text-xs text-text-secondary">
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}

// ============================================
// Rule Card Component
// ============================================

interface RuleCardProps {
  rule: EscalationRule;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  isToggling: boolean;
}

function RuleCard({ rule, onEdit, onDelete, onToggle, isToggling }: RuleCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getConditionSummary = (conditions: EscalationCondition[]): string => {
    return conditions
      .map((c) => {
        switch (c.type) {
          case 'score_lte':
            return `Score <= ${c.value}`;
          case 'score_gte':
            return `Score >= ${c.value}`;
          case 'sentiment_eq':
            return `Sentiment = ${c.value}`;
          case 'keyword_contains':
            return `Contains "${c.value}"`;
          case 'survey_type':
            return `Survey type = ${c.value}`;
          default:
            return String(c.type);
        }
      })
      .join(' AND ');
  };

  const getActionSummary = (actions: EscalationRuleAction[]): string => {
    return actions.map((a) => ACTION_TYPE_CONFIG[a.type]?.label || a.type).join(', ');
  };

  return (
    <div
      className={cn(
        'bg-bg-card rounded-xl border p-5 transition-all',
        rule.is_active ? 'border-border' : 'border-border opacity-60'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-bg-hover rounded-lg text-xl">
            {TRIGGER_TYPE_CONFIG[rule.trigger_type].icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-text-primary">{rule.name}</h3>
              <RuleStatusBadge isActive={rule.is_active} />
            </div>
            <TriggerTypeBadge type={rule.trigger_type} />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggle}
            disabled={isToggling}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              rule.is_active
                ? 'text-success hover:bg-success/10'
                : 'text-text-muted hover:bg-bg-hover'
            )}
            title={rule.is_active ? 'Deactivate' : 'Activate'}
          >
            {isToggling ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={rule.is_active ? 'M5 13l4 4L19 7' : 'M12 8v4l3 3'}
                />
              </svg>
            )}
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 text-text-muted hover:text-primary hover:bg-bg-hover rounded-lg transition-colors"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Description */}
      {rule.description && (
        <p className="text-sm text-text-secondary mb-3">{rule.description}</p>
      )}

      {/* Summary */}
      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <span className="text-xs font-medium text-text-muted w-16">When:</span>
          <span className="text-sm text-text-secondary">{getConditionSummary(rule.conditions)}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-xs font-medium text-text-muted w-16">Then:</span>
          <span className="text-sm text-text-secondary">{getActionSummary(rule.actions)}</span>
        </div>
      </div>

      {/* Expand/Collapse */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark"
      >
        <svg
          className={cn('w-4 h-4 transition-transform', showDetails && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        {showDetails ? 'Hide details' : 'Show details'}
      </button>

      {/* Details */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          <div>
            <p className="text-xs font-medium text-text-muted mb-1">Conditions:</p>
            <div className="space-y-1">
              {rule.conditions.map((condition, idx) => (
                <div key={idx} className="text-sm text-text-secondary bg-bg-hover rounded px-2 py-1">
                  {condition.operator && idx > 0 && (
                    <span className="text-primary font-medium mr-1">{condition.operator.toUpperCase()}</span>
                  )}
                  {condition.type}: {String(condition.value)}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-text-muted mb-1">Actions:</p>
            <div className="space-y-1">
              {rule.actions.map((action, idx) => (
                <div key={idx} className="text-sm text-text-secondary bg-bg-hover rounded px-2 py-1 flex items-center gap-1">
                  <span>{ACTION_TYPE_CONFIG[action.type]?.icon}</span>
                  <span>{ACTION_TYPE_CONFIG[action.type]?.label || action.type}</span>
                </div>
              ))}
            </div>
          </div>
          {rule.cooldown_hours && (
            <p className="text-xs text-text-muted">
              Cooldown: {rule.cooldown_hours} hours between triggers
            </p>
          )}
          <p className="text-xs text-text-muted">Priority: {rule.priority}</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// Create/Edit Rule Modal
// ============================================

interface RuleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule?: EscalationRule;
  onSubmit: (data: EscalationRuleFormData) => Promise<void>;
  isSubmitting: boolean;
}

function RuleFormModal({ isOpen, onClose, rule, onSubmit, isSubmitting }: RuleFormModalProps) {
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [triggerType, setTriggerType] = useState<TriggerType>(rule?.trigger_type || 'nps_score');
  const [isActive, setIsActive] = useState(rule?.is_active ?? true);
  const [priority, setPriority] = useState(rule?.priority ?? 0);
  const [cooldownHours, setCooldownHours] = useState(rule?.cooldown_hours ?? 24);

  // Condition state
  const [scoreThreshold, setScoreThreshold] = useState(
    rule?.conditions.find((c) => c.type === 'score_lte')?.value as number || 6
  );
  const [sentiment, setSentiment] = useState(
    (rule?.conditions.find((c) => c.type === 'sentiment_eq')?.value as string) || 'negative'
  );
  const [keywords, setKeywords] = useState<string[]>(
    rule?.conditions
      .filter((c) => c.type === 'keyword_contains')
      .map((c) => String(c.value)) || []
  );
  const [keywordInput, setKeywordInput] = useState('');

  // Action state
  const [selectedActions, setSelectedActions] = useState<string[]>(
    rule?.actions.map((a) => a.type) || ['create_task']
  );

  const handleAddKeyword = () => {
    if (keywordInput && !keywords.includes(keywordInput.toLowerCase())) {
      setKeywords([...keywords, keywordInput.toLowerCase()]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const handleToggleAction = (action: string) => {
    if (selectedActions.includes(action)) {
      setSelectedActions(selectedActions.filter((a) => a !== action));
    } else {
      setSelectedActions([...selectedActions, action]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const conditions: EscalationCondition[] = [];
    const actions: EscalationRuleAction[] = [];

    // Build conditions based on trigger type
    if (triggerType === 'nps_score' || triggerType === 'combined') {
      conditions.push({ type: 'score_lte', value: scoreThreshold });
    }
    if (triggerType === 'sentiment' || triggerType === 'combined') {
      conditions.push({ type: 'sentiment_eq', value: sentiment, operator: conditions.length > 0 ? 'and' : undefined });
    }
    if (triggerType === 'keywords' || triggerType === 'combined') {
      keywords.forEach((kw, _idx) => {
        conditions.push({
          type: 'keyword_contains',
          value: kw,
          operator: conditions.length > 0 ? 'or' : undefined,
        });
      });
    }

    // Build actions
    selectedActions.forEach((actionType) => {
      actions.push({
        type: actionType as EscalationRuleAction['type'],
        config: {},
      });
    });

    const formData: EscalationRuleFormData = {
      name,
      description: description || undefined,
      trigger_type: triggerType,
      is_active: isActive,
      conditions,
      actions,
      priority,
      cooldown_hours: cooldownHours,
    };

    await onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-bg-card rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-bg-card border-b border-border px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text-primary">
              {rule ? 'Edit Rule' : 'Create Escalation Rule'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-hover"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Rule Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Critical Detractor Alert"
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this rule do?"
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary resize-none"
              />
            </div>
          </div>

          {/* Trigger Type */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Trigger Type <span className="text-danger">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(TRIGGER_TYPE_CONFIG) as TriggerType[]).map((type) => {
                const config = TRIGGER_TYPE_CONFIG[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTriggerType(type)}
                    className={cn(
                      'p-3 rounded-lg border-2 text-left transition-all',
                      triggerType === type
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-border-hover'
                    )}
                  >
                    <span className="text-xl">{config.icon}</span>
                    <p className="text-sm font-medium text-text-primary mt-1">{config.label}</p>
                    <p className="text-xs text-text-muted">{config.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-text-secondary">Conditions</h3>

            {/* Score Threshold */}
            {(triggerType === 'nps_score' || triggerType === 'combined') && (
              <div className="p-4 bg-bg-hover rounded-lg">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  NPS Score Threshold
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={scoreThreshold}
                    onChange={(e) => setScoreThreshold(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-lg font-bold text-text-primary w-8">{scoreThreshold}</span>
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Trigger when score is {scoreThreshold} or below
                </p>
              </div>
            )}

            {/* Sentiment */}
            {(triggerType === 'sentiment' || triggerType === 'combined') && (
              <div className="p-4 bg-bg-hover rounded-lg">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Sentiment Threshold
                </label>
                <select
                  value={sentiment}
                  onChange={(e) => setSentiment(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary"
                >
                  <option value="very_negative">Very Negative</option>
                  <option value="negative">Negative</option>
                  <option value="neutral">Neutral or worse</option>
                </select>
              </div>
            )}

            {/* Keywords */}
            {(triggerType === 'keywords' || triggerType === 'combined') && (
              <div className="p-4 bg-bg-hover rounded-lg">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Trigger Keywords
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                    placeholder="Add keyword..."
                    className="flex-1 px-3 py-1.5 text-sm border border-border rounded bg-bg-primary text-text-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary-dark"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {keywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full flex items-center gap-1"
                    >
                      {kw}
                      <button type="button" onClick={() => handleRemoveKeyword(kw)}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
                <p className="text-xs text-text-muted">
                  Suggestions:{' '}
                  {SAMPLE_KEYWORDS.filter((k) => !keywords.includes(k))
                    .slice(0, 5)
                    .map((kw, idx) => (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => setKeywords([...keywords, kw])}
                        className="text-primary hover:underline"
                      >
                        {kw}
                        {idx < 4 && ', '}
                      </button>
                    ))}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Actions to Take
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ACTION_TYPE_CONFIG).map(([type, config]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleToggleAction(type)}
                  className={cn(
                    'p-3 rounded-lg border-2 text-left transition-all flex items-center gap-2',
                    selectedActions.includes(type)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-border-hover'
                  )}
                >
                  <span className="text-lg">{config.icon}</span>
                  <span className="text-sm font-medium text-text-primary">{config.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Settings Row */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Priority</label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Cooldown (hours)</label>
              <input
                type="number"
                value={cooldownHours}
                onChange={(e) => setCooldownHours(Number(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-text-primary">Active</span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-bg-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name || selectedActions.length === 0 || isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>{rule ? 'Save Changes' : 'Create Rule'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function EscalationRules({ className }: EscalationRulesProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);

  const { data: rules, isLoading, error } = useEscalationRules();
  const createMutation = useCreateEscalationRule();
  const updateMutation = useUpdateEscalationRule();
  const deleteMutation = useDeleteEscalationRule();
  const toggleMutation = useToggleEscalationRule();

  const handleCreate = async (data: EscalationRuleFormData) => {
    await createMutation.mutateAsync(data);
    setShowCreateModal(false);
  };

  const handleUpdate = async (data: EscalationRuleFormData) => {
    if (editingRule) {
      await updateMutation.mutateAsync({ id: editingRule.id, data });
      setEditingRule(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleToggle = async (rule: EscalationRule) => {
    await toggleMutation.mutateAsync({ id: rule.id, isActive: !rule.is_active });
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="animate-pulse">
          <div className="h-8 bg-bg-hover rounded w-48 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-bg-hover rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('p-6 bg-danger/10 rounded-xl text-center', className)}>
        <p className="text-danger">Failed to load escalation rules. Please try again.</p>
      </div>
    );
  }

  const ruleList = rules || [];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Escalation Rules
          </h2>
          <p className="text-sm text-text-muted">
            Configure automatic escalations based on survey responses
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Rule
        </button>
      </div>

      {/* Rules List */}
      {ruleList.length === 0 ? (
        <div className="py-12 text-center bg-bg-card rounded-xl border border-border">
          <svg
            className="w-16 h-16 mx-auto text-text-muted mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-lg font-medium text-text-primary mb-1">No Escalation Rules</p>
          <p className="text-sm text-text-muted mb-4">
            Create rules to automatically escalate based on survey responses
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
          >
            Create Your First Rule
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {ruleList.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={() => setEditingRule(rule)}
              onDelete={() => handleDelete(rule.id)}
              onToggle={() => handleToggle(rule)}
              isToggling={toggleMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <RuleFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
      />

      {/* Edit Modal */}
      {editingRule && (
        <RuleFormModal
          isOpen={true}
          onClose={() => setEditingRule(null)}
          rule={editingRule}
          onSubmit={handleUpdate}
          isSubmitting={updateMutation.isPending}
        />
      )}
    </div>
  );
}
