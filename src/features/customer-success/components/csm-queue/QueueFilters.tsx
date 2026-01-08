/**
 * QueueFilters Component
 *
 * Filter controls for the CSM task queue - filter by priority, type, due date, etc.
 */

import { useState } from 'react';
import type { CSMQueueFilters, CSMTaskQueuePriority, CSMTaskTypeCategory } from '../../../../api/types/customerSuccess';

interface QueueFiltersProps {
  filters: CSMQueueFilters;
  onFiltersChange: (filters: CSMQueueFilters) => void;
  taskTypeCounts?: Record<string, number>;
}

const priorityOptions: { value: CSMTaskQueuePriority; label: string; color: string }[] = [
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'standard', label: 'Standard', color: 'bg-blue-500' },
  { value: 'low', label: 'Low', color: 'bg-gray-500' },
];

const categoryOptions: { value: CSMTaskTypeCategory; label: string }[] = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'adoption', label: 'Adoption' },
  { value: 'retention', label: 'Retention' },
  { value: 'expansion', label: 'Expansion' },
  { value: 'renewal', label: 'Renewal' },
];

const dueDateOptions = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due Today' },
  { value: 'week', label: 'This Week' },
  { value: 'all', label: 'All' },
];

export function QueueFilters({ filters, onFiltersChange, taskTypeCounts }: QueueFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePriorityToggle = (priority: CSMTaskQueuePriority) => {
    const currentPriorities = Array.isArray(filters.priority)
      ? filters.priority
      : filters.priority
        ? [filters.priority]
        : [];

    const newPriorities = currentPriorities.includes(priority)
      ? currentPriorities.filter(p => p !== priority)
      : [...currentPriorities, priority];

    onFiltersChange({
      ...filters,
      priority: newPriorities.length > 0 ? newPriorities : undefined,
    });
  };

  const handleCategoryChange = (category: CSMTaskTypeCategory | undefined) => {
    onFiltersChange({
      ...filters,
      category,
    });
  };

  const handleDueDateChange = (option: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let due_before: string | undefined;
    let due_after: string | undefined;

    switch (option) {
      case 'overdue':
        due_before = today.toISOString().split('T')[0];
        break;
      case 'today':
        due_before = today.toISOString().split('T')[0];
        due_after = today.toISOString().split('T')[0];
        break;
      case 'week':
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        due_before = weekEnd.toISOString().split('T')[0];
        break;
      case 'all':
      default:
        break;
    }

    onFiltersChange({
      ...filters,
      due_before,
      due_after,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      page: 1,
      page_size: 20,
      sort_by: 'priority_score',
      sort_order: 'desc',
    });
  };

  const hasActiveFilters = !!(
    filters.priority ||
    filters.category ||
    filters.due_before ||
    filters.due_after ||
    filters.task_type_slug
  );

  const selectedPriorities = Array.isArray(filters.priority)
    ? filters.priority
    : filters.priority
      ? [filters.priority]
      : [];

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4 mb-4">
      {/* Quick Priority Filters */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-sm text-text-muted mr-2">Priority:</span>
        {priorityOptions.map(({ value, label, color }) => (
          <button
            key={value}
            onClick={() => handlePriorityToggle(value)}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all
              ${selectedPriorities.includes(value)
                ? `${color} text-white`
                : 'bg-bg-primary text-text-secondary hover:bg-bg-card'
              }
            `}
          >
            <span className={`w-2 h-2 rounded-full ${selectedPriorities.includes(value) ? 'bg-white' : color}`} />
            {label}
          </button>
        ))}
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-sm text-text-muted mr-2">Category:</span>
        <button
          onClick={() => handleCategoryChange(undefined)}
          className={`
            px-3 py-1.5 rounded-full text-sm font-medium transition-all
            ${!filters.category
              ? 'bg-primary text-white'
              : 'bg-bg-primary text-text-secondary hover:bg-bg-card'
            }
          `}
        >
          All
        </button>
        {categoryOptions.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleCategoryChange(value)}
            className={`
              px-3 py-1.5 rounded-full text-sm font-medium transition-all
              ${filters.category === value
                ? 'bg-primary text-white'
                : 'bg-bg-primary text-text-secondary hover:bg-bg-card'
              }
            `}
          >
            {label}
            {taskTypeCounts?.[value] !== undefined && (
              <span className="ml-1.5 text-xs opacity-70">({taskTypeCounts[value]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Expandable Advanced Filters */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        {isExpanded ? 'Hide' : 'Show'} Advanced Filters
      </button>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Due Date Filter */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Due Date</label>
              <select
                className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                onChange={(e) => handleDueDateChange(e.target.value)}
                defaultValue="all"
              >
                {dueDateOptions.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Sort By</label>
              <select
                className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                value={filters.sort_by || 'priority_score'}
                onChange={(e) => onFiltersChange({ ...filters, sort_by: e.target.value as CSMQueueFilters['sort_by'] })}
              >
                <option value="priority_score">Priority Score</option>
                <option value="due_date">Due Date</option>
                <option value="created_at">Created Date</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Sort Order</label>
              <select
                className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                value={filters.sort_order || 'desc'}
                onChange={(e) => onFiltersChange({ ...filters, sort_order: e.target.value as 'asc' | 'desc' })}
              >
                <option value="desc">Highest First</option>
                <option value="asc">Lowest First</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-border">
          <button
            onClick={clearFilters}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}

export default QueueFilters;
