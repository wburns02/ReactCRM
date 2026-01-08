/**
 * SegmentCard Component
 *
 * Card component for displaying segment in a list/grid.
 * Shows segment info, metrics, and quick actions.
 */

import { cn } from '@/lib/utils.ts';
import type { Segment, SegmentType } from '@/api/types/customerSuccess.ts';

interface SegmentCardProps {
  segment: Segment;
  isSelected?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onViewMembers?: () => void;
  className?: string;
}

const TYPE_CONFIG: Record<SegmentType, { label: string; icon: React.ReactNode; className: string }> = {
  static: {
    label: 'Static',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  dynamic: {
    label: 'Dynamic',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  ai_generated: {
    label: 'AI',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    className: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  },
};

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

export function SegmentCard({
  segment,
  isSelected,
  onClick,
  onEdit,
  onDuplicate,
  onDelete,
  onViewMembers,
  className,
}: SegmentCardProps) {
  const typeConfig = TYPE_CONFIG[segment.segment_type];

  return (
    <div
      className={cn(
        'group relative bg-white dark:bg-gray-800 rounded-xl border transition-all cursor-pointer',
        isSelected
          ? 'border-primary shadow-lg ring-2 ring-primary/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:shadow-md',
        className
      )}
      onClick={onClick}
    >
      {/* Color Bar */}
      {segment.color && (
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
          style={{ backgroundColor: segment.color }}
        />
      )}

      <div className="p-4 pt-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {segment.name}
              </h3>
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full',
                typeConfig.className
              )}>
                {typeConfig.icon}
                {typeConfig.label}
              </span>
            </div>
            {segment.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                {segment.description}
              </p>
            )}
          </div>

          {/* Status Indicator */}
          <div className={cn(
            'w-2.5 h-2.5 rounded-full flex-shrink-0',
            segment.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
          )} title={segment.is_active ? 'Active' : 'Inactive'} />
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {segment.customer_count?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Customers</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(segment.total_arr)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total ARR</div>
          </div>
        </div>

        {/* Health & Risk */}
        <div className="flex items-center gap-4 text-sm">
          {segment.avg_health_score !== null && segment.avg_health_score !== undefined && (
            <div className="flex items-center gap-1.5">
              <div className={cn(
                'w-2 h-2 rounded-full',
                segment.avg_health_score >= 70 ? 'bg-green-500' :
                segment.avg_health_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
              )} />
              <span className="text-gray-600 dark:text-gray-300">
                {Math.round(segment.avg_health_score)} avg health
              </span>
            </div>
          )}

          {(segment.churn_risk_count ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 text-red-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{segment.churn_risk_count} at risk</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {segment.tags && segment.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {segment.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded"
              >
                {tag}
              </span>
            ))}
            {segment.tags.length > 3 && (
              <span className="px-2 py-0.5 text-gray-400 text-xs">
                +{segment.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Quick Actions - Show on hover */}
        <div
          className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-white dark:from-gray-800 via-white/95 dark:via-gray-800/95 to-transparent rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center gap-2">
            {onViewMembers && (
              <button
                onClick={onViewMembers}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-primary bg-gray-100 dark:bg-gray-700 hover:bg-primary/10 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Members
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-primary bg-gray-100 dark:bg-gray-700 hover:bg-primary/10 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            )}
            {onDuplicate && (
              <button
                onClick={onDuplicate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-primary bg-gray-100 dark:bg-gray-700 hover:bg-primary/10 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Duplicate
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-red-500 bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact segment card for lists
 */
export function SegmentCardCompact({
  segment,
  isSelected,
  onClick,
}: {
  segment: Segment;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const typeConfig = TYPE_CONFIG[segment.segment_type];

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-gray-200 dark:border-gray-700 hover:border-primary/50 bg-white dark:bg-gray-800'
      )}
      onClick={onClick}
    >
      {/* Color Indicator */}
      <div
        className="w-1 h-10 rounded-full flex-shrink-0"
        style={{ backgroundColor: segment.color || '#6366f1' }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white truncate">
            {segment.name}
          </span>
          <span className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded',
            typeConfig.className
          )}>
            {typeConfig.icon}
          </span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {segment.customer_count?.toLocaleString() || 0} customers
        </div>
      </div>

      {/* Health Score */}
      {segment.avg_health_score !== null && segment.avg_health_score !== undefined && (
        <div className={cn(
          'px-2 py-1 rounded text-sm font-medium',
          segment.avg_health_score >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
          segment.avg_health_score >= 40 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        )}>
          {Math.round(segment.avg_health_score)}
        </div>
      )}
    </div>
  );
}
