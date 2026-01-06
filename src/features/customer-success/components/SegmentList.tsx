/**
 * Segment List Component
 *
 * Displays customer segments with filtering and management capabilities.
 */

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils.ts';
import type { Segment, SegmentType } from '@/api/types/customerSuccess.ts';

interface SegmentListProps {
  segments: Segment[];
  selectedSegmentId?: number | null;
  onSelectSegment?: (segment: Segment) => void;
  onCreateSegment?: () => void;
  onEditSegment?: (segment: Segment) => void;
  onDeleteSegment?: (segment: Segment) => void;
  className?: string;
}

const TYPE_BADGES: Record<SegmentType, { label: string; className: string }> = {
  static: { label: 'Static', className: 'bg-blue-500/10 text-blue-500' },
  dynamic: { label: 'Dynamic', className: 'bg-purple-500/10 text-purple-500' },
  ai_generated: { label: 'AI', className: 'bg-cyan-500/10 text-cyan-500' },
};

function SegmentCard({
  segment,
  isSelected,
  onClick,
  onEdit,
  onDelete,
}: {
  segment: Segment;
  isSelected: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
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
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-text-primary">{segment.name}</h3>
          <span className={cn('px-2 py-0.5 text-xs rounded-full', TYPE_BADGES[segment.segment_type].className)}>
            {TYPE_BADGES[segment.segment_type].label}
          </span>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1 text-text-muted hover:text-text-primary transition-colors"
                title="Edit segment"
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
                title="Delete segment"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {segment.description && (
        <p className="text-sm text-text-secondary mb-3 line-clamp-2">{segment.description}</p>
      )}

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-text-muted">
            {segment.customer_count ?? 0} customers
          </span>
        </div>

        {segment.is_active ? (
          <span className="text-success text-xs">Active</span>
        ) : (
          <span className="text-text-muted text-xs">Inactive</span>
        )}
      </div>
    </div>
  );
}

export function SegmentList({
  segments,
  selectedSegmentId,
  onSelectSegment,
  onCreateSegment,
  onEditSegment,
  onDeleteSegment,
  className,
}: SegmentListProps) {
  const [filterType, setFilterType] = useState<SegmentType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSegments = useMemo(() => {
    return segments.filter((segment) => {
      if (filterType !== 'all' && segment.segment_type !== filterType) {
        return false;
      }
      if (searchQuery && !segment.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [segments, filterType, searchQuery]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Segments</h2>
        {onCreateSegment && (
          <button
            onClick={onCreateSegment}
            className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Segment
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search segments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'static', 'dynamic', 'ai_generated'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                'px-3 py-2 text-sm rounded-lg transition-colors',
                filterType === type
                  ? 'bg-primary text-white'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
              )}
            >
              {type === 'all' ? 'All' : type === 'ai_generated' ? 'AI' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Segment Grid */}
      {filteredSegments.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-sm">No segments found</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredSegments.map((segment) => (
            <SegmentCard
              key={segment.id}
              segment={segment}
              isSelected={segment.id === selectedSegmentId}
              onClick={() => onSelectSegment?.(segment)}
              onEdit={onEditSegment ? () => onEditSegment(segment) : undefined}
              onDelete={onDeleteSegment ? () => onDeleteSegment(segment) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
