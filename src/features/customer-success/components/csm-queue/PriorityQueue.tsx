/**
 * PriorityQueue Component
 *
 * Displays the prioritized list of CSM tasks with grouping by priority level.
 */

import { useMemo } from 'react';
import type { CSMQueueTask } from '../../../../api/types/customerSuccess';
import { TaskCard } from './TaskCard';

interface PriorityQueueProps {
  tasks: CSMQueueTask[];
  selectedTaskId?: number | null;
  onSelectTask: (task: CSMQueueTask) => void;
  onStartTask?: (taskId: number) => void;
  onSnoozeTask?: (taskId: number) => void;
  onRescheduleTask?: (taskId: number) => void;
  isLoading?: boolean;
  groupByPriority?: boolean;
}

const priorityLabels = {
  urgent: { label: 'Urgent Priority', description: 'Requires immediate attention' },
  high: { label: 'High Priority', description: 'Address within 24 hours' },
  standard: { label: 'Standard Priority', description: 'Address this week' },
  low: { label: 'Low Priority', description: 'When time permits' },
};

export function PriorityQueue({
  tasks,
  selectedTaskId,
  onSelectTask,
  onStartTask,
  onSnoozeTask,
  onRescheduleTask,
  isLoading,
  groupByPriority = true,
}: PriorityQueueProps) {
  // Group tasks by priority
  const groupedTasks = useMemo(() => {
    if (!groupByPriority) {
      return { all: tasks };
    }

    return tasks.reduce((acc, task) => {
      const priority = task.priority;
      if (!acc[priority]) {
        acc[priority] = [];
      }
      acc[priority].push(task);
      return acc;
    }, {} as Record<string, CSMQueueTask[]>);
  }, [tasks, groupByPriority]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-bg-secondary rounded-lg border border-border p-4 animate-pulse">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-20 bg-bg-primary rounded" />
              <div className="h-4 w-16 bg-bg-primary rounded ml-auto" />
            </div>
            <div className="h-5 w-48 bg-bg-primary rounded mb-2" />
            <div className="h-4 w-36 bg-bg-primary rounded mb-2" />
            <div className="flex gap-4">
              <div className="h-4 w-24 bg-bg-primary rounded" />
              <div className="h-4 w-24 bg-bg-primary rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 bg-bg-secondary rounded-lg border border-border">
        <svg className="w-16 h-16 mx-auto text-text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <h3 className="text-lg font-semibold text-text-primary mb-2">Queue is Empty</h3>
        <p className="text-text-muted max-w-md mx-auto">
          No tasks match your current filters. Try adjusting your filters or check back later.
        </p>
      </div>
    );
  }

  if (!groupByPriority) {
    return (
      <div className="space-y-3">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            isSelected={selectedTaskId === task.id}
            onSelect={onSelectTask}
            onStart={onStartTask}
            onSnooze={onSnoozeTask}
            onReschedule={onRescheduleTask}
          />
        ))}
      </div>
    );
  }

  const priorityOrder = ['urgent', 'high', 'standard', 'low'];

  return (
    <div className="space-y-6">
      {priorityOrder.map(priority => {
        const priorityTasks = groupedTasks[priority];
        if (!priorityTasks || priorityTasks.length === 0) return null;

        const { label, description } = priorityLabels[priority as keyof typeof priorityLabels];

        return (
          <div key={priority}>
            {/* Priority Group Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className={`
                  font-semibold
                  ${priority === 'urgent' ? 'text-red-400' : ''}
                  ${priority === 'high' ? 'text-orange-400' : ''}
                  ${priority === 'standard' ? 'text-blue-400' : ''}
                  ${priority === 'low' ? 'text-gray-400' : ''}
                `}>
                  {label}
                </h3>
                <span className="text-sm text-text-muted">({priorityTasks.length})</span>
              </div>
              <span className="text-xs text-text-muted">{description}</span>
            </div>

            {/* Tasks in this priority group */}
            <div className="space-y-3">
              {priorityTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isSelected={selectedTaskId === task.id}
                  onSelect={onSelectTask}
                  onStart={onStartTask}
                  onSnooze={onSnoozeTask}
                  onReschedule={onRescheduleTask}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PriorityQueue;
