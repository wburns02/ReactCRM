/**
 * QueueStats Component
 *
 * Shows summary statistics for the CSM task queue - counts by priority, overdue, etc.
 */

import type { CSMQueueTask } from '../../../../api/types/customerSuccess';

interface QueueStatsProps {
  tasks: CSMQueueTask[];
  isLoading?: boolean;
}

export function QueueStats({ tasks, isLoading }: QueueStatsProps) {
  const stats = {
    total: tasks.length,
    urgent: tasks.filter(t => t.priority === 'urgent').length,
    high: tasks.filter(t => t.priority === 'high').length,
    overdue: tasks.filter(t => t.days_overdue && t.days_overdue > 0).length,
    dueToday: tasks.filter(t => {
      if (!t.due_date) return false;
      const due = new Date(t.due_date);
      const today = new Date();
      return due.toDateString() === today.toDateString();
    }).length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
  };

  const totalArr = tasks.reduce((sum, t) => sum + (t.customer_arr || 0), 0);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-bg-secondary rounded-lg border border-border p-4 animate-pulse">
            <div className="h-4 bg-bg-primary rounded w-20 mb-2" />
            <div className="h-8 bg-bg-primary rounded w-12" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
      {/* Total Tasks */}
      <div className="bg-bg-secondary rounded-lg border border-border p-4">
        <div className="text-sm text-text-muted mb-1">Total Tasks</div>
        <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
      </div>

      {/* Urgent */}
      <div className="bg-bg-secondary rounded-lg border border-red-500/30 p-4">
        <div className="flex items-center gap-1.5 text-sm text-red-400 mb-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Urgent
        </div>
        <div className="text-2xl font-bold text-red-400">{stats.urgent}</div>
      </div>

      {/* High Priority */}
      <div className="bg-bg-secondary rounded-lg border border-orange-500/30 p-4">
        <div className="flex items-center gap-1.5 text-sm text-orange-400 mb-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          High
        </div>
        <div className="text-2xl font-bold text-orange-400">{stats.high}</div>
      </div>

      {/* Overdue */}
      <div className="bg-bg-secondary rounded-lg border border-red-500/30 p-4">
        <div className="flex items-center gap-1.5 text-sm text-red-400 mb-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Overdue
        </div>
        <div className="text-2xl font-bold text-red-400">{stats.overdue}</div>
      </div>

      {/* Due Today */}
      <div className="bg-bg-secondary rounded-lg border border-yellow-500/30 p-4">
        <div className="flex items-center gap-1.5 text-sm text-yellow-400 mb-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Due Today
        </div>
        <div className="text-2xl font-bold text-yellow-400">{stats.dueToday}</div>
      </div>

      {/* Revenue at Risk */}
      <div className="bg-bg-secondary rounded-lg border border-border p-4">
        <div className="text-sm text-text-muted mb-1">Total ARR in Queue</div>
        <div className="text-2xl font-bold text-text-primary">
          ${(totalArr / 1000).toFixed(0)}K
        </div>
      </div>
    </div>
  );
}

export default QueueStats;
