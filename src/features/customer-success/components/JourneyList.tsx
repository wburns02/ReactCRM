/**
 * Journey List Component
 *
 * Displays customer journeys with status indicators and management options.
 */

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils.ts';
import type { Journey, JourneyStatus } from '@/api/types/customerSuccess.ts';

interface JourneyListProps {
  journeys: Journey[];
  selectedJourneyId?: number | null;
  onSelectJourney?: (journey: Journey) => void;
  onCreateJourney?: () => void;
  onEditJourney?: (journey: Journey) => void;
  onDeleteJourney?: (journey: Journey) => void;
  onToggleActive?: (journey: Journey) => void;
  className?: string;
}

const STATUS_CONFIG: Record<JourneyStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-500/10 text-gray-500' },
  active: { label: 'Active', className: 'bg-success/10 text-success' },
  paused: { label: 'Paused', className: 'bg-warning/10 text-warning' },
  archived: { label: 'Archived', className: 'bg-text-muted/10 text-text-muted' },
};

function JourneyCard({
  journey,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  journey: Journey;
  isSelected: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleActive?: () => void;
}) {
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
          <h3 className="font-medium text-text-primary">{journey.name}</h3>
          <span className={cn('px-2 py-0.5 text-xs rounded-full', STATUS_CONFIG[journey.status].className)}>
            {STATUS_CONFIG[journey.status].label}
          </span>
        </div>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {onToggleActive && journey.status !== 'archived' && (
            <button
              onClick={onToggleActive}
              className={cn(
                'p-1 transition-colors',
                journey.status === 'active' ? 'text-success hover:text-success/70' : 'text-text-muted hover:text-text-primary'
              )}
              title={journey.status === 'active' ? 'Pause journey' : 'Activate journey'}
            >
              {journey.status === 'active' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1 text-text-muted hover:text-text-primary transition-colors"
              title="Edit journey"
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
              title="Delete journey"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {journey.description && (
        <p className="text-sm text-text-secondary mb-3 line-clamp-2">{journey.description}</p>
      )}

      <div className="flex items-center gap-4 text-sm flex-wrap">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-text-muted">
            {journey.steps?.length ?? journey.step_count ?? 0} steps
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-text-muted">
            {journey.active_enrollments ?? 0} enrolled
          </span>
        </div>

        {journey.conversion_rate !== null && journey.conversion_rate !== undefined && (
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-text-muted">
              {journey.conversion_rate.toFixed(1)}% conversion
            </span>
          </div>
        )}
      </div>

      {/* Journey trigger info */}
      {journey.trigger_type && journey.trigger_type !== 'manual' && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-text-muted">
            <span className="font-medium">Trigger:</span>{' '}
            {journey.trigger_type.replace('_', ' ')}
          </p>
        </div>
      )}
    </div>
  );
}

export function JourneyList({
  journeys,
  selectedJourneyId,
  onSelectJourney,
  onCreateJourney,
  onEditJourney,
  onDeleteJourney,
  onToggleActive,
  className,
}: JourneyListProps) {
  const [filterStatus, setFilterStatus] = useState<JourneyStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredJourneys = useMemo(() => {
    return journeys.filter((journey) => {
      if (filterStatus !== 'all' && journey.status !== filterStatus) {
        return false;
      }
      if (searchQuery && !journey.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [journeys, filterStatus, searchQuery]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Customer Journeys</h2>
        {onCreateJourney && (
          <button
            onClick={onCreateJourney}
            className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Journey
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search journeys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'active', 'draft', 'paused', 'archived'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                'px-3 py-2 text-sm rounded-lg transition-colors',
                filterStatus === status
                  ? 'bg-primary text-white'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Journey Grid */}
      {filteredJourneys.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p className="text-sm">No journeys found</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredJourneys.map((journey) => (
            <JourneyCard
              key={journey.id}
              journey={journey}
              isSelected={journey.id === selectedJourneyId}
              onClick={() => onSelectJourney?.(journey)}
              onEdit={onEditJourney ? () => onEditJourney(journey) : undefined}
              onDelete={onDeleteJourney ? () => onDeleteJourney(journey) : undefined}
              onToggleActive={onToggleActive ? () => onToggleActive(journey) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
