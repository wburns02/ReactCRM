/**
 * Journey List Component
 *
 * World-class journey listing with visual previews, filters, and management options.
 * Features: Grid/list views, advanced filters, journey previews, status indicators.
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

const STATUS_CONFIG: Record<JourneyStatus, { label: string; className: string; dotColor: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-500/10 text-gray-500', dotColor: 'bg-gray-500' },
  active: { label: 'Active', className: 'bg-success/10 text-success', dotColor: 'bg-success' },
  paused: { label: 'Paused', className: 'bg-warning/10 text-warning', dotColor: 'bg-warning' },
  archived: { label: 'Archived', className: 'bg-text-muted/10 text-text-muted', dotColor: 'bg-gray-400' },
};

const JOURNEY_TYPE_CONFIG: Record<string, { label: string; icon: string; className: string; gradient: string }> = {
  onboarding: { label: 'Onboarding', icon: '🚀', className: 'bg-blue-500/10 text-blue-500', gradient: 'from-blue-500 to-cyan-500' },
  adoption: { label: 'Adoption', icon: '📈', className: 'bg-green-500/10 text-green-500', gradient: 'from-green-500 to-emerald-500' },
  retention: { label: 'Retention', icon: '🔄', className: 'bg-cyan-500/10 text-cyan-500', gradient: 'from-cyan-500 to-blue-500' },
  expansion: { label: 'Expansion', icon: '💎', className: 'bg-purple-500/10 text-purple-500', gradient: 'from-purple-500 to-pink-500' },
  renewal: { label: 'Renewal', icon: '📋', className: 'bg-amber-500/10 text-amber-500', gradient: 'from-amber-500 to-orange-500' },
  win_back: { label: 'Win Back', icon: '🎯', className: 'bg-red-500/10 text-red-500', gradient: 'from-red-500 to-rose-500' },
  custom: { label: 'Custom', icon: '⚙️', className: 'bg-gray-500/10 text-gray-500', gradient: 'from-gray-500 to-slate-500' },
};

const STEP_TYPE_ICONS: Record<string, string> = {
  email: '📧',
  task: '✅',
  wait: '⏳',
  condition: '🔀',
  webhook: '🔗',
  human_touchpoint: '👤',
  in_app_message: '💬',
  sms: '📱',
  notification: '🔔',
  update_field: '📝',
  add_tag: '🏷️',
  enroll_journey: '🗺️',
  trigger_playbook: '📘',
  health_check: '💓',
  custom: '⚙️',
};

type ViewMode = 'grid' | 'list';
type SortOption = 'name' | 'steps' | 'enrolled' | 'recent';

function JourneyCard({
  journey,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  onToggleActive,
  viewMode,
}: {
  journey: Journey;
  isSelected: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleActive?: () => void;
  viewMode: ViewMode;
}) {
  const journeyType = JOURNEY_TYPE_CONFIG[journey.journey_type] || JOURNEY_TYPE_CONFIG.custom;
  const statusConfig = STATUS_CONFIG[journey.status];
  const stepCount = journey.steps?.length ?? journey.step_count ?? 0;
  const enrolledCount = journey.active_enrollments ?? 0;

  // Get unique step type icons for preview
  const stepTypePreview = useMemo(() => {
    if (!journey.steps || journey.steps.length === 0) return [];
    const types = new Set(journey.steps.map(s => s.step_type));
    return Array.from(types).slice(0, 5).map(type => STEP_TYPE_ICONS[type] || '⚙️');
  }, [journey.steps]);

  // Calculate journey duration from wait times
  const totalDuration = useMemo(() => {
    if (!journey.steps) return null;
    const hours = journey.steps.reduce((sum, step) => sum + (step.wait_duration_hours || 0), 0);
    if (hours === 0) return null;
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24 * 10) / 10;
    return `${days}d`;
  }, [journey.steps]);

  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          'p-4 rounded-lg border cursor-pointer transition-all',
          isSelected
            ? 'border-primary bg-primary/5 ring-1 ring-primary'
            : 'border-border bg-bg-secondary hover:border-border-hover hover:shadow-md'
        )}
        onClick={onClick}
      >
        <div className="flex items-center gap-4">
          {/* Journey Type Icon */}
          <div className={cn(
            'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl',
            'bg-gradient-to-br',
            journeyType.gradient
          )}>
            {journeyType.icon}
          </div>

          {/* Journey Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-text-primary truncate">{journey.name}</h3>
              <span className={cn(
                'px-2 py-0.5 text-xs rounded-full flex items-center gap-1',
                statusConfig.className
              )}>
                <div className={cn('w-1.5 h-1.5 rounded-full', statusConfig.dotColor, journey.status === 'active' && 'animate-pulse')} />
                {statusConfig.label}
              </span>
            </div>
            {journey.description && (
              <p className="text-sm text-text-secondary line-clamp-1">{journey.description}</p>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="font-semibold text-text-primary">{stepCount}</p>
              <p className="text-xs text-text-muted">steps</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-text-primary">{enrolledCount}</p>
              <p className="text-xs text-text-muted">enrolled</p>
            </div>
            {totalDuration && (
              <div className="text-center">
                <p className="font-semibold text-text-primary">{totalDuration}</p>
                <p className="text-xs text-text-muted">duration</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {onToggleActive && journey.status !== 'archived' && (
              <button
                onClick={onToggleActive}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  journey.status === 'active' ? 'text-success hover:bg-success/10' : 'text-text-muted hover:bg-bg-tertiary'
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
                className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
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
                className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                title="Delete journey"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div
      className={cn(
        'group relative rounded-xl border overflow-hidden cursor-pointer transition-all duration-200',
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-border hover:border-border-hover hover:shadow-lg'
      )}
      onClick={onClick}
    >
      {/* Header with gradient */}
      <div className={cn(
        'relative h-24 overflow-hidden',
        'bg-gradient-to-r',
        journeyType.gradient
      )}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`grid-${journey.id}`} width="16" height="16" patternUnits="userSpaceOnUse">
                <path d="M 16 0 L 0 0 0 16" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#grid-${journey.id})`} />
          </svg>
        </div>

        {/* Journey type badge */}
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white/20 text-white backdrop-blur-sm">
            {journeyType.icon} {journeyType.label}
          </span>
        </div>

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <span className={cn(
            'px-2 py-0.5 text-xs font-medium rounded-full backdrop-blur-sm flex items-center gap-1.5',
            'bg-white/20 text-white'
          )}>
            <div className={cn('w-1.5 h-1.5 rounded-full', statusConfig.dotColor, journey.status === 'active' && 'animate-pulse')} />
            {statusConfig.label}
          </span>
        </div>

        {/* Step type preview */}
        {stepTypePreview.length > 0 && (
          <div className="absolute bottom-3 left-3 flex gap-1">
            {stepTypePreview.map((icon, idx) => (
              <span
                key={idx}
                className="w-6 h-6 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-xs"
              >
                {icon}
              </span>
            ))}
            {journey.steps && journey.steps.length > 5 && (
              <span className="w-6 h-6 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-xs text-white font-medium">
                +{journey.steps.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="absolute bottom-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          {onToggleActive && journey.status !== 'archived' && (
            <button
              onClick={onToggleActive}
              className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
              title={journey.status === 'active' ? 'Pause' : 'Activate'}
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
              className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-red-500/80 transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 bg-bg-secondary">
        <h3 className="font-semibold text-text-primary line-clamp-1 mb-1">{journey.name}</h3>
        {journey.description && (
          <p className="text-sm text-text-secondary line-clamp-2 mb-3">{journey.description}</p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-text-muted font-medium">{stepCount}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-text-muted font-medium">{enrolledCount}</span>
            </div>

            {totalDuration && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-text-muted font-medium">{totalDuration}</span>
              </div>
            )}
          </div>

          {journey.conversion_rate !== null && journey.conversion_rate !== undefined && (
            <span className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              journey.conversion_rate >= 50 ? 'bg-success/10 text-success' :
              journey.conversion_rate >= 25 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'
            )}>
              {journey.conversion_rate.toFixed(0)}%
            </span>
          )}
        </div>

        {/* Trigger info */}
        {journey.trigger_type && journey.trigger_type !== 'manual' && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-text-muted flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Trigger: {journey.trigger_type.replace('_', ' ')}
            </p>
          </div>
        )}
      </div>
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
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('name');

  const filteredAndSortedJourneys = useMemo(() => {
    const filtered = journeys.filter((journey) => {
      if (filterStatus !== 'all' && journey.status !== filterStatus) {
        return false;
      }
      if (filterType !== 'all' && journey.journey_type !== filterType) {
        return false;
      }
      if (searchQuery && !journey.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'steps':
          return ((b.steps?.length ?? b.step_count ?? 0) - (a.steps?.length ?? a.step_count ?? 0));
        case 'enrolled':
          return ((b.active_enrollments ?? 0) - (a.active_enrollments ?? 0));
        case 'recent':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [journeys, filterStatus, filterType, searchQuery, sortBy]);

  // Get unique journey types for filter
  const journeyTypes = useMemo(() => {
    const types = new Set(journeys.map(j => j.journey_type));
    return Array.from(types);
  }, [journeys]);

  // Stats summary
  const stats = useMemo(() => ({
    total: journeys.length,
    active: journeys.filter(j => j.status === 'active').length,
    totalSteps: journeys.reduce((sum, j) => sum + (j.steps?.length ?? j.step_count ?? 0), 0),
    totalEnrolled: journeys.reduce((sum, j) => sum + (j.active_enrollments ?? 0), 0),
  }), [journeys]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Customer Journeys</h2>
          <p className="text-sm text-text-muted mt-0.5">
            {stats.total} journeys • {stats.active} active • {stats.totalSteps} steps • {stats.totalEnrolled} enrolled
          </p>
        </div>
        {onCreateJourney && (
          <button
            onClick={onCreateJourney}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Journey
          </button>
        )}
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search journeys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bg-tertiary border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex gap-1 flex-wrap">
          {(['all', 'active', 'draft', 'paused', 'archived'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                filterStatus === status
                  ? 'bg-primary text-white'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Type Filter */}
        {journeyTypes.length > 1 && (
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="all">All Types</option>
            {journeyTypes.map(type => (
              <option key={type} value={type}>
                {JOURNEY_TYPE_CONFIG[type]?.icon} {JOURNEY_TYPE_CONFIG[type]?.label || type}
              </option>
            ))}
          </select>
        )}

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
        >
          <option value="name">Sort by Name</option>
          <option value="steps">Sort by Steps</option>
          <option value="enrolled">Sort by Enrolled</option>
          <option value="recent">Sort by Recent</option>
        </select>

        {/* View Toggle */}
        <div className="flex gap-1 bg-bg-tertiary rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'grid' ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
            )}
            title="Grid view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'list' ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
            )}
            title="List view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Journey Grid/List */}
      {filteredAndSortedJourneys.length === 0 ? (
        <div className="text-center py-16 bg-bg-secondary rounded-xl border border-border">
          <svg className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <h3 className="text-lg font-medium text-text-primary mb-1">No journeys found</h3>
          <p className="text-sm text-text-muted mb-4">
            {searchQuery || filterStatus !== 'all' || filterType !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first journey to get started'}
          </p>
          {onCreateJourney && !searchQuery && filterStatus === 'all' && filterType === 'all' && (
            <button
              onClick={onCreateJourney}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Journey
            </button>
          )}
        </div>
      ) : (
        <div className={cn(
          viewMode === 'grid'
            ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
            : 'space-y-3'
        )}>
          {filteredAndSortedJourneys.map((journey) => (
            <JourneyCard
              key={journey.id}
              journey={journey}
              isSelected={journey.id === selectedJourneyId}
              onClick={() => onSelectJourney?.(journey)}
              onEdit={onEditJourney ? () => onEditJourney(journey) : undefined}
              onDelete={onDeleteJourney ? () => onDeleteJourney(journey) : undefined}
              onToggleActive={onToggleActive ? () => onToggleActive(journey) : undefined}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
