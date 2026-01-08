/**
 * Detractor Queue Component
 *
 * Priority list of unhappy customers featuring:
 * - Table/list of detractors (score 0-6)
 * - Customer name, score, feedback preview
 * - Time since response
 * - Action status (needs action / in progress / resolved)
 * - Quick action buttons per row
 */

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils.ts';

// Types
export type DetractorActionStatus = 'needs_action' | 'in_progress' | 'resolved' | 'escalated';

export interface Detractor {
  id: number;
  customerId: number;
  customerName: string;
  companyName?: string;
  email?: string;
  score: number;
  feedback: string;
  surveyName?: string;
  respondedAt: string;
  actionStatus: DetractorActionStatus;
  assignedTo?: string;
  mrr?: number;
  segment?: 'enterprise' | 'mid_market' | 'smb';
  lastContactDate?: string;
}

interface DetractorQueueProps {
  detractors?: Detractor[];
  onContactCustomer?: (detractor: Detractor) => void;
  onEscalate?: (detractor: Detractor) => void;
  onMarkResolved?: (detractor: Detractor) => void;
  onViewCustomer?: (detractor: Detractor) => void;
  onUpdateStatus?: (detractor: Detractor, status: DetractorActionStatus) => void;
  isLoading?: boolean;
  className?: string;
}

// Status configuration
const STATUS_CONFIG: Record<DetractorActionStatus, { label: string; color: string; bgColor: string }> = {
  needs_action: { label: 'Needs Action', color: 'text-danger', bgColor: 'bg-danger/10' },
  in_progress: { label: 'In Progress', color: 'text-warning', bgColor: 'bg-warning/10' },
  resolved: { label: 'Resolved', color: 'text-success', bgColor: 'bg-success/10' },
  escalated: { label: 'Escalated', color: 'text-primary', bgColor: 'bg-primary/10' },
};

// Segment badges
const SEGMENT_CONFIG: Record<string, { label: string; color: string }> = {
  enterprise: { label: 'Enterprise', color: 'text-primary bg-primary/10' },
  mid_market: { label: 'Mid-Market', color: 'text-info bg-info/10' },
  smb: { label: 'SMB', color: 'text-text-secondary bg-bg-hover' },
};

// Sample data generator
function generateSampleDetractors(): Detractor[] {
  const names = [
    { name: 'John Smith', company: 'TechCorp Industries' },
    { name: 'Sarah Johnson', company: 'Digital Solutions Ltd' },
    { name: 'Mike Williams', company: 'Acme Manufacturing' },
    { name: 'Emily Davis', company: 'Global Services Inc' },
    { name: 'Robert Brown', company: 'StartupXYZ' },
    { name: 'Lisa Anderson', company: 'Enterprise Co' },
    { name: 'David Wilson', company: 'Local Business LLC' },
    { name: 'Jennifer Taylor', company: 'Mega Corp' },
  ];

  const feedbacks = [
    'The support response time has been terrible. Waited 3 days for a simple question.',
    'Product keeps crashing. Very frustrating when trying to meet deadlines.',
    'Missing key features that were promised during the sales process.',
    'Billing issues continue to be a problem. Overcharged twice this month.',
    'The new UI update is confusing and made our workflow much slower.',
    'Integration with our CRM is broken after the last update.',
    'Customer service representative was unhelpful and dismissive.',
    'Performance degradation noticed over the past few weeks.',
  ];

  const segments: ('enterprise' | 'mid_market' | 'smb')[] = ['enterprise', 'mid_market', 'smb'];
  const statuses: DetractorActionStatus[] = ['needs_action', 'needs_action', 'in_progress', 'escalated'];

  return names.map((n, i) => ({
    id: i + 1,
    customerId: 100 + i,
    customerName: n.name,
    companyName: n.company,
    email: `${n.name.toLowerCase().replace(' ', '.')}@${n.company.toLowerCase().replace(/\s+/g, '')}.com`,
    score: Math.floor(Math.random() * 7), // 0-6 for detractors
    feedback: feedbacks[i],
    surveyName: 'Q1 2026 NPS Survey',
    respondedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    actionStatus: statuses[Math.floor(Math.random() * statuses.length)],
    assignedTo: i % 3 === 0 ? 'Alex Thompson' : i % 3 === 1 ? 'Maria Garcia' : undefined,
    mrr: Math.floor(Math.random() * 10000) + 1000,
    segment: segments[Math.floor(Math.random() * segments.length)],
    lastContactDate: i % 2 === 0 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
  }));
}

// Time ago helper
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return 'Yesterday';
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

// Score badge component
function ScoreBadge({ score }: { score: number }) {
  const getColor = () => {
    if (score <= 2) return 'bg-danger text-white';
    if (score <= 4) return 'bg-danger/80 text-white';
    return 'bg-danger/60 text-white';
  };

  return (
    <span className={cn(
      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
      getColor()
    )}>
      {score}
    </span>
  );
}

// Action dropdown
function ActionDropdown({
  detractor,
  onContact,
  onEscalate,
  onResolve,
  onView,
}: {
  detractor: Detractor;
  onContact: () => void;
  onEscalate: () => void;
  onResolve: () => void;
  onView: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 bg-bg-card border border-border rounded-lg shadow-lg z-20 py-1">
            <button
              onClick={() => { onView(); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm text-text-secondary hover:bg-bg-hover flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Customer
            </button>
            <button
              onClick={() => { onContact(); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm text-text-secondary hover:bg-bg-hover flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Customer
            </button>
            <button
              onClick={() => { onEscalate(); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm text-warning hover:bg-warning/10 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
              </svg>
              Escalate
            </button>
            {detractor.actionStatus !== 'resolved' && (
              <button
                onClick={() => { onResolve(); setIsOpen(false); }}
                className="w-full px-4 py-2 text-left text-sm text-success hover:bg-success/10 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Mark Resolved
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Detractor Row Component
function DetractorRow({
  detractor,
  onContact,
  onEscalate,
  onResolve,
  onView,
}: {
  detractor: Detractor;
  onContact: () => void;
  onEscalate: () => void;
  onResolve: () => void;
  onView: () => void;
}) {
  const statusConfig = STATUS_CONFIG[detractor.actionStatus];
  const segmentConfig = detractor.segment ? SEGMENT_CONFIG[detractor.segment] : null;

  return (
    <div className={cn(
      'flex items-start gap-4 p-4 border-b border-border last:border-0 hover:bg-bg-hover/50 transition-colors',
      detractor.actionStatus === 'needs_action' && 'bg-danger/5'
    )}>
      {/* Score */}
      <ScoreBadge score={detractor.score} />

      {/* Customer Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-text-primary truncate">{detractor.customerName}</h4>
          {segmentConfig && (
            <span className={cn('px-1.5 py-0.5 text-[10px] font-medium rounded', segmentConfig.color)}>
              {segmentConfig.label}
            </span>
          )}
        </div>
        {detractor.companyName && (
          <p className="text-sm text-text-secondary mb-1">{detractor.companyName}</p>
        )}
        <p className="text-sm text-text-muted line-clamp-2 mb-2">"{detractor.feedback}"</p>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span>{getTimeAgo(detractor.respondedAt)}</span>
          {detractor.mrr && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ${detractor.mrr.toLocaleString()}/mo
            </span>
          )}
          {detractor.assignedTo && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {detractor.assignedTo}
            </span>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <span className={cn(
        'px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap',
        statusConfig.bgColor,
        statusConfig.color
      )}>
        {statusConfig.label}
      </span>

      {/* Quick Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onContact}
          title="Contact Customer"
          className="p-2 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </button>
        <ActionDropdown
          detractor={detractor}
          onContact={onContact}
          onEscalate={onEscalate}
          onResolve={onResolve}
          onView={onView}
        />
      </div>
    </div>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
          <div className="w-8 h-8 bg-bg-hover rounded-full" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-bg-hover rounded mb-2" />
            <div className="h-3 w-full bg-bg-hover rounded mb-2" />
            <div className="h-3 w-24 bg-bg-hover rounded" />
          </div>
          <div className="h-6 w-20 bg-bg-hover rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function DetractorQueue({
  detractors: propDetractors,
  onContactCustomer,
  onEscalate,
  onMarkResolved,
  onViewCustomer,
  onUpdateStatus,
  isLoading = false,
  className,
}: DetractorQueueProps) {
  const [detractors, setDetractors] = useState<Detractor[]>([]);
  const [filter, setFilter] = useState<DetractorActionStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'time' | 'mrr'>('score');

  // Initialize detractors
  useState(() => {
    if (propDetractors) {
      setDetractors(propDetractors);
    } else {
      setDetractors(generateSampleDetractors());
    }
  });

  // Use prop detractors if provided, otherwise use local state
  const activeDetractors = propDetractors || detractors;

  // Filter and sort detractors
  const filteredDetractors = useMemo(() => {
    let result = filter === 'all'
      ? activeDetractors
      : activeDetractors.filter(d => d.actionStatus === filter);

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return a.score - b.score; // Lower scores first
        case 'time':
          return new Date(b.respondedAt).getTime() - new Date(a.respondedAt).getTime();
        case 'mrr':
          return (b.mrr || 0) - (a.mrr || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [activeDetractors, filter, sortBy]);

  // Count by status
  const statusCounts = useMemo(() => {
    return activeDetractors.reduce(
      (acc, d) => {
        acc[d.actionStatus]++;
        return acc;
      },
      { needs_action: 0, in_progress: 0, resolved: 0, escalated: 0 }
    );
  }, [activeDetractors]);

  // Handle status update
  const handleStatusUpdate = useCallback((detractor: Detractor, newStatus: DetractorActionStatus) => {
    if (propDetractors) {
      onUpdateStatus?.(detractor, newStatus);
    } else {
      setDetractors(prev =>
        prev.map(d => d.id === detractor.id ? { ...d, actionStatus: newStatus } : d)
      );
    }
  }, [propDetractors, onUpdateStatus]);

  return (
    <div className={cn('bg-bg-card rounded-xl border border-border', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <svg className="w-5 h-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Detractor Queue
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {activeDetractors.length} detractors - {statusCounts.needs_action} need immediate action
            </p>
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'score' | 'time' | 'mrr')}
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-bg-primary text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="score">Sort by Score</option>
            <option value="time">Sort by Time</option>
            <option value="mrr">Sort by MRR</option>
          </select>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-full transition-colors',
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-bg-hover text-text-secondary hover:text-text-primary'
            )}
          >
            All ({activeDetractors.length})
          </button>
          <button
            onClick={() => setFilter('needs_action')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-full transition-colors',
              filter === 'needs_action'
                ? 'bg-danger text-white'
                : 'bg-danger/10 text-danger hover:bg-danger/20'
            )}
          >
            Needs Action ({statusCounts.needs_action})
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-full transition-colors',
              filter === 'in_progress'
                ? 'bg-warning text-white'
                : 'bg-warning/10 text-warning hover:bg-warning/20'
            )}
          >
            In Progress ({statusCounts.in_progress})
          </button>
          <button
            onClick={() => setFilter('escalated')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-full transition-colors',
              filter === 'escalated'
                ? 'bg-primary text-white'
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            Escalated ({statusCounts.escalated})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-full transition-colors',
              filter === 'resolved'
                ? 'bg-success text-white'
                : 'bg-success/10 text-success hover:bg-success/20'
            )}
          >
            Resolved ({statusCounts.resolved})
          </button>
        </div>
      </div>

      {/* Detractor List */}
      <div className="max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <LoadingSkeleton />
        ) : filteredDetractors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg className="w-12 h-12 text-success mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-text-secondary font-medium">
              {filter === 'all' ? 'No detractors found' : `No ${filter.replace('_', ' ')} detractors`}
            </p>
            <p className="text-text-muted text-sm mt-1">
              {filter === 'all' ? 'Great job! All customers are happy.' : 'Try a different filter.'}
            </p>
          </div>
        ) : (
          <div>
            {filteredDetractors.map((detractor) => (
              <DetractorRow
                key={detractor.id}
                detractor={detractor}
                onContact={() => onContactCustomer?.(detractor)}
                onEscalate={() => {
                  handleStatusUpdate(detractor, 'escalated');
                  onEscalate?.(detractor);
                }}
                onResolve={() => {
                  handleStatusUpdate(detractor, 'resolved');
                  onMarkResolved?.(detractor);
                }}
                onView={() => onViewCustomer?.(detractor)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {!isLoading && filteredDetractors.length > 0 && (
        <div className="px-6 py-3 border-t border-border bg-bg-hover/50">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>
              Showing {filteredDetractors.length} of {activeDetractors.length} detractors
            </span>
            <span className="flex items-center gap-4">
              <span>
                Total at-risk MRR: ${filteredDetractors.reduce((sum, d) => sum + (d.mrr || 0), 0).toLocaleString()}/mo
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default DetractorQueue;
