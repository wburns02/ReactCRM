/**
 * Task List Component
 *
 * Displays CS tasks with filtering, sorting, and management capabilities.
 */

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils.ts';
import type { CSTask, TaskStatus, TaskPriority } from '@/api/types/customerSuccess.ts';

interface TaskListProps {
  tasks: CSTask[];
  selectedTaskId?: number | null;
  onSelectTask?: (task: CSTask) => void;
  onCompleteTask?: (task: CSTask) => void;
  onEditTask?: (task: CSTask) => void;
  onDeleteTask?: (task: CSTask) => void;
  showCustomerName?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-gray-500/10 text-gray-500' },
  in_progress: { label: 'In Progress', className: 'bg-blue-500/10 text-blue-500' },
  completed: { label: 'Completed', className: 'bg-success/10 text-success' },
  cancelled: { label: 'Cancelled', className: 'bg-text-muted/10 text-text-muted' },
  blocked: { label: 'Blocked', className: 'bg-danger/10 text-danger' },
  snoozed: { label: 'Snoozed', className: 'bg-purple-500/10 text-purple-500' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; className: string; order: number }> = {
  critical: { label: 'Critical', className: 'text-danger border-danger', order: 0 },
  high: { label: 'High', className: 'text-warning border-warning', order: 1 },
  medium: { label: 'Medium', className: 'text-text-secondary border-text-muted', order: 2 },
  low: { label: 'Low', className: 'text-text-muted border-text-muted/50', order: 3 },
};

const TYPE_ICONS: Record<string, string> = {
  call: '📞',
  email: '✉️',
  meeting: '📅',
  internal: '📋',
  review: '📋',
  follow_up: '🔄',
  check_in: '👋',
  escalation: '🚨',
  training: '🎓',
  product_demo: '💻',
  documentation: '📄',
  health_review: '❤️',
  renewal_prep: '📝',
  renewal: '🔄',
  expansion_opportunity: '💎',
  risk_assessment: '⚠️',
  qbr: '📊',
  qbr_prep: '📊',
  custom: '⚙️',
};

function TaskCard({
  task,
  isSelected,
  onClick,
  onComplete,
  onEdit,
  onDelete,
  showCustomerName,
}: {
  task: CSTask;
  isSelected: boolean;
  onClick?: () => void;
  onComplete?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showCustomerName?: boolean;
}) {
  const isOverdue = useMemo(() => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') {
      return false;
    }
    return new Date(task.due_date) < new Date();
  }, [task.due_date, task.status]);

  const dueLabel = useMemo(() => {
    if (!task.due_date) return null;
    const date = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDay = new Date(date);
    dueDay.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays <= 7) return `In ${diffDays} days`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [task.due_date]);

  const priority = PRIORITY_CONFIG[task.priority];
  const status = STATUS_CONFIG[task.status];

  return (
    <div
      className={cn(
        'p-4 rounded-lg border cursor-pointer transition-all',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-bg-secondary hover:border-border-hover',
        isOverdue && task.status !== 'completed' && 'border-l-4 border-l-danger'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        {onComplete && task.status !== 'completed' && task.status !== 'cancelled' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComplete();
            }}
            className={cn(
              'mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
              'hover:bg-primary/10',
              priority.className
            )}
          >
            {task.status === 'in_progress' && (
              <div className="w-2 h-2 rounded-full bg-current" />
            )}
          </button>
        )}
        {task.status === 'completed' && (
          <div className="mt-0.5 w-5 h-5 rounded bg-success flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={cn(
              'font-medium text-text-primary',
              task.status === 'completed' && 'line-through text-text-muted'
            )}>
              <span className="mr-1.5">{TYPE_ICONS[task.task_type]}</span>
              {task.title}
            </h3>
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="p-1 text-text-muted hover:text-text-primary transition-colors"
                  title="Edit task"
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
                  title="Delete task"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {task.description && (
            <p className="text-sm text-text-secondary mb-2 line-clamp-2">{task.description}</p>
          )}

          <div className="flex items-center gap-3 flex-wrap text-sm">
            <span className={cn('px-2 py-0.5 text-xs rounded-full', status.className)}>
              {status.label}
            </span>

            <span className={cn('text-xs font-medium', priority.className.split(' ')[0])}>
              {priority.label}
            </span>

            {dueLabel && (
              <span className={cn(
                'text-xs',
                isOverdue ? 'text-danger font-medium' : 'text-text-muted'
              )}>
                {dueLabel}
              </span>
            )}

            {showCustomerName && task.customer_name && (
              <span className="text-xs text-text-muted">
                {task.customer_name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TaskList({
  tasks,
  selectedTaskId,
  onSelectTask,
  onCompleteTask,
  onEditTask,
  onDeleteTask,
  showCustomerName = false,
  className,
}: TaskListProps) {
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all' | 'active'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'created'>('due_date');

  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      if (filterStatus === 'active') {
        if (task.status === 'completed' || task.status === 'cancelled') {
          return false;
        }
      } else if (filterStatus !== 'all' && task.status !== filterStatus) {
        return false;
      }
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'priority') {
        return PRIORITY_CONFIG[a.priority].order - PRIORITY_CONFIG[b.priority].order;
      }
      if (sortBy === 'due_date') {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      // created
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    });

    return filtered;
  }, [tasks, filterStatus, searchQuery, sortBy]);

  const taskCounts = useMemo(() => {
    return {
      all: tasks.length,
      active: tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length,
      overdue: tasks.filter(t => {
        if (!t.due_date || t.status === 'completed' || t.status === 'cancelled') return false;
        return new Date(t.due_date) < new Date();
      }).length,
    };
  }, [tasks]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Tasks</h2>
          <p className="text-sm text-text-muted">
            {taskCounts.active} active
            {taskCounts.overdue > 0 && (
              <span className="text-danger"> • {taskCounts.overdue} overdue</span>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="due_date">Sort by Due Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="created">Sort by Created</option>
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['active', 'all', 'pending', 'in_progress', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                filterStatus === status
                  ? 'bg-primary text-white'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
              )}
            >
              {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="text-sm">No tasks found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isSelected={task.id === selectedTaskId}
              onClick={() => onSelectTask?.(task)}
              onComplete={onCompleteTask ? () => onCompleteTask(task) : undefined}
              onEdit={onEditTask ? () => onEditTask(task) : undefined}
              onDelete={onDeleteTask ? () => onDeleteTask(task) : undefined}
              showCustomerName={showCustomerName}
            />
          ))}
        </div>
      )}
    </div>
  );
}
