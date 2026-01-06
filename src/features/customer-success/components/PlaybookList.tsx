/**
 * Playbook List Component
 *
 * Displays CS playbooks with execution status and management options.
 */

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils.ts';
import type { Playbook, PlaybookPriority } from '@/api/types/customerSuccess.ts';

interface PlaybookListProps {
  playbooks: Playbook[];
  selectedPlaybookId?: number | null;
  onSelectPlaybook?: (playbook: Playbook) => void;
  onCreatePlaybook?: () => void;
  onEditPlaybook?: (playbook: Playbook) => void;
  onDeletePlaybook?: (playbook: Playbook) => void;
  onTriggerPlaybook?: (playbook: Playbook) => void;
  className?: string;
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

const PRIORITY_CONFIG: Record<PlaybookPriority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'text-text-muted' },
  medium: { label: 'Medium', className: 'text-text-secondary' },
  high: { label: 'High', className: 'text-warning' },
  critical: { label: 'Critical', className: 'text-danger' },
};

function PlaybookCard({
  playbook,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  onTrigger,
}: {
  playbook: Playbook;
  isSelected: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onTrigger?: () => void;
}) {
  const category = CATEGORY_CONFIG[playbook.category];
  const priority = PRIORITY_CONFIG[playbook.priority];

  return (
    <div
      className={cn(
        'p-4 rounded-lg border cursor-pointer transition-all',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-bg-secondary hover:border-border-hover'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('px-2 py-0.5 text-xs rounded-full', category.className)}>
            {category.icon} {category.label}
          </span>
          <span className={cn('text-xs font-medium', priority.className)}>
            {priority.label}
          </span>
        </div>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {onTrigger && playbook.is_active && (
            <button
              onClick={onTrigger}
              className="p-1 text-primary hover:text-primary-hover transition-colors"
              title="Trigger playbook"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1 text-text-muted hover:text-text-primary transition-colors"
              title="Edit playbook"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 text-text-muted hover:text-danger transition-colors"
              title="Delete playbook"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <h3 className="font-medium text-text-primary mb-1">{playbook.name}</h3>

      {playbook.description && (
        <p className="text-sm text-text-secondary mb-3 line-clamp-2">{playbook.description}</p>
      )}

      <div className="flex items-center gap-4 text-sm flex-wrap">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-text-muted">
            {playbook.step_count ?? 0} steps
          </span>
        </div>

        {playbook.times_triggered !== undefined && playbook.times_triggered > 0 && (
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-text-muted">
              {playbook.times_triggered} runs
            </span>
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

        {!playbook.is_active && (
          <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded">
            Inactive
          </span>
        )}
      </div>

      {/* Trigger info */}
      {playbook.trigger_type && playbook.trigger_type !== 'manual' && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-text-muted">
            <span className="font-medium">Auto-trigger:</span>{' '}
            {playbook.trigger_type.replace('_', ' ')}
            {playbook.trigger_health_threshold && (
              <span> (health {'<'} {playbook.trigger_health_threshold})</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

export function PlaybookList({
  playbooks,
  selectedPlaybookId,
  onSelectPlaybook,
  onCreatePlaybook,
  onEditPlaybook,
  onDeletePlaybook,
  onTriggerPlaybook,
  className,
}: PlaybookListProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const filteredPlaybooks = useMemo(() => {
    return playbooks.filter((playbook) => {
      if (filterCategory !== 'all' && playbook.category !== filterCategory) {
        return false;
      }
      if (!showInactive && !playbook.is_active) {
        return false;
      }
      if (searchQuery && !playbook.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [playbooks, filterCategory, searchQuery, showInactive]);

  const categories: string[] = ['all', 'onboarding', 'adoption', 'expansion', 'renewal', 'churn_risk', 'churn_prevention'];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Playbooks</h2>
        {onCreatePlaybook && (
          <button
            onClick={onCreatePlaybook}
            className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Playbook
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search playbooks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-border"
            />
            Show inactive
          </label>
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                filterCategory === cat
                  ? 'bg-primary text-white'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
              )}
            >
              {cat === 'all' ? 'All' : CATEGORY_CONFIG[cat].label}
            </button>
          ))}
        </div>
      </div>

      {/* Playbook Grid */}
      {filteredPlaybooks.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-sm">No playbooks found</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredPlaybooks.map((playbook) => (
            <PlaybookCard
              key={playbook.id}
              playbook={playbook}
              isSelected={playbook.id === selectedPlaybookId}
              onClick={() => onSelectPlaybook?.(playbook)}
              onEdit={onEditPlaybook ? () => onEditPlaybook(playbook) : undefined}
              onDelete={onDeletePlaybook ? () => onDeletePlaybook(playbook) : undefined}
              onTrigger={onTriggerPlaybook ? () => onTriggerPlaybook(playbook) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
