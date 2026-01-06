/**
 * Escalation Management System Component
 *
 * Enterprise escalation handling featuring:
 * - Escalation workflow management
 * - SLA tracking and alerts
 * - After-hours routing
 * - Resolution metrics
 * - Escalation history
 * - Team notifications
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils.ts';

// Types
export type EscalationPriority = 'low' | 'medium' | 'high' | 'critical';
export type EscalationStatus = 'open' | 'in_progress' | 'pending_customer' | 'resolved' | 'closed';
export type EscalationType = 'technical' | 'billing' | 'service' | 'executive' | 'retention';

export interface Escalation {
  id: number;
  title: string;
  description: string;
  customer_id: number;
  customer_name: string;
  type: EscalationType;
  priority: EscalationPriority;
  status: EscalationStatus;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  sla_due_at?: string;
  sla_breached: boolean;
  resolution_time_hours?: number;
  notes: EscalationNote[];
  timeline: EscalationEvent[];
}

export interface EscalationNote {
  id: number;
  author: string;
  content: string;
  created_at: string;
  is_internal: boolean;
}

export interface EscalationEvent {
  id: number;
  action: string;
  actor: string;
  timestamp: string;
  details?: string;
}

export interface SLAConfig {
  priority: EscalationPriority;
  response_time_hours: number;
  resolution_time_hours: number;
}

// Sample data
const sampleEscalations: Escalation[] = [
  {
    id: 1,
    title: 'Critical production outage',
    description: 'Customer experiencing complete system unavailability',
    customer_id: 1,
    customer_name: 'Acme Corp',
    type: 'technical',
    priority: 'critical',
    status: 'in_progress',
    assigned_to: 'Sarah Johnson',
    created_at: '2026-01-06T08:30:00Z',
    updated_at: '2026-01-06T09:15:00Z',
    sla_due_at: '2026-01-06T12:30:00Z',
    sla_breached: false,
    notes: [
      { id: 1, author: 'Sarah Johnson', content: 'Investigating database connection issues', created_at: '2026-01-06T09:00:00Z', is_internal: true },
    ],
    timeline: [
      { id: 1, action: 'Escalation created', actor: 'System', timestamp: '2026-01-06T08:30:00Z' },
      { id: 2, action: 'Assigned to Sarah Johnson', actor: 'Auto-routing', timestamp: '2026-01-06T08:31:00Z' },
      { id: 3, action: 'Status changed to In Progress', actor: 'Sarah Johnson', timestamp: '2026-01-06T08:45:00Z' },
    ],
  },
  {
    id: 2,
    title: 'Billing discrepancy - overcharge',
    description: 'Customer claims they were charged twice for last month',
    customer_id: 2,
    customer_name: 'TechStart Inc',
    type: 'billing',
    priority: 'high',
    status: 'pending_customer',
    assigned_to: 'Mike Chen',
    created_at: '2026-01-05T14:00:00Z',
    updated_at: '2026-01-06T10:30:00Z',
    sla_due_at: '2026-01-06T14:00:00Z',
    sla_breached: false,
    notes: [],
    timeline: [],
  },
  {
    id: 3,
    title: 'Executive sponsor requesting meeting',
    description: 'VP of Operations wants to discuss contract renewal terms',
    customer_id: 3,
    customer_name: 'Global Services',
    type: 'executive',
    priority: 'high',
    status: 'open',
    created_at: '2026-01-06T07:00:00Z',
    updated_at: '2026-01-06T07:00:00Z',
    sla_due_at: '2026-01-06T19:00:00Z',
    sla_breached: false,
    notes: [],
    timeline: [],
  },
  {
    id: 4,
    title: 'Customer considering cancellation',
    description: 'Long-term customer mentioned switching to competitor',
    customer_id: 4,
    customer_name: 'Regional Solutions',
    type: 'retention',
    priority: 'critical',
    status: 'in_progress',
    assigned_to: 'Emily Davis',
    created_at: '2026-01-04T16:00:00Z',
    updated_at: '2026-01-06T11:00:00Z',
    sla_due_at: '2026-01-05T16:00:00Z',
    sla_breached: true,
    notes: [],
    timeline: [],
  },
  {
    id: 5,
    title: 'Service quality complaint',
    description: 'Multiple missed appointments in the past month',
    customer_id: 5,
    customer_name: 'Local Business Co',
    type: 'service',
    priority: 'medium',
    status: 'resolved',
    assigned_to: 'Tom Wilson',
    created_at: '2026-01-03T10:00:00Z',
    updated_at: '2026-01-05T15:00:00Z',
    resolution_time_hours: 53,
    sla_breached: false,
    notes: [],
    timeline: [],
  },
];

const slaConfigs: SLAConfig[] = [
  { priority: 'critical', response_time_hours: 1, resolution_time_hours: 4 },
  { priority: 'high', response_time_hours: 4, resolution_time_hours: 24 },
  { priority: 'medium', response_time_hours: 8, resolution_time_hours: 48 },
  { priority: 'low', response_time_hours: 24, resolution_time_hours: 72 },
];

// Components
function PriorityBadge({ priority }: { priority: EscalationPriority }) {
  const config = {
    critical: { bg: 'bg-danger', text: 'text-white', icon: '🔴' },
    high: { bg: 'bg-warning', text: 'text-white', icon: '🟠' },
    medium: { bg: 'bg-info', text: 'text-white', icon: '🟡' },
    low: { bg: 'bg-success', text: 'text-white', icon: '🟢' },
  };

  return (
    <span className={cn('px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1', config[priority].bg, config[priority].text)}>
      {config[priority].icon} {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

function StatusBadge({ status }: { status: EscalationStatus }) {
  const config = {
    open: { bg: 'bg-info/10', text: 'text-info' },
    in_progress: { bg: 'bg-warning/10', text: 'text-warning' },
    pending_customer: { bg: 'bg-purple-100', text: 'text-purple-700' },
    resolved: { bg: 'bg-success/10', text: 'text-success' },
    closed: { bg: 'bg-gray-100', text: 'text-gray-700' },
  };

  const labels = {
    open: 'Open',
    in_progress: 'In Progress',
    pending_customer: 'Pending Customer',
    resolved: 'Resolved',
    closed: 'Closed',
  };

  return (
    <span className={cn('px-2 py-1 text-xs font-medium rounded-full', config[status].bg, config[status].text)}>
      {labels[status]}
    </span>
  );
}

function TypeIcon({ type }: { type: EscalationType }) {
  const icons: Record<EscalationType, React.ReactNode> = {
    technical: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    billing: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    service: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    executive: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    retention: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  };

  return icons[type];
}

function SLAIndicator({ dueAt, breached }: { dueAt?: string; breached: boolean }) {
  if (!dueAt) return null;

  const now = new Date();
  const due = new Date(dueAt);
  const hoursRemaining = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (breached) {
    return (
      <div className="flex items-center gap-1 text-xs text-danger">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        SLA Breached
      </div>
    );
  }

  if (hoursRemaining < 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-danger">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Overdue by {Math.abs(Math.round(hoursRemaining))}h
      </div>
    );
  }

  if (hoursRemaining < 2) {
    return (
      <div className="flex items-center gap-1 text-xs text-danger">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {Math.round(hoursRemaining * 60)}m remaining
      </div>
    );
  }

  if (hoursRemaining < 8) {
    return (
      <div className="flex items-center gap-1 text-xs text-warning">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {Math.round(hoursRemaining)}h remaining
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-xs text-text-muted">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {Math.round(hoursRemaining)}h remaining
    </div>
  );
}

function EscalationCard({ escalation, onSelect }: { escalation: Escalation; onSelect: (e: Escalation) => void }) {
  return (
    <div
      onClick={() => onSelect(escalation)}
      className={cn(
        'bg-bg-card rounded-xl border p-6 hover:shadow-md transition-all cursor-pointer',
        escalation.sla_breached ? 'border-danger/50' : 'border-border'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            escalation.type === 'retention' ? 'bg-danger/10 text-danger' :
            escalation.type === 'executive' ? 'bg-primary/10 text-primary' :
            'bg-bg-hover text-text-secondary'
          )}>
            <TypeIcon type={escalation.type} />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary line-clamp-1">{escalation.title}</h3>
            <p className="text-sm text-text-muted">{escalation.customer_name}</p>
          </div>
        </div>
        <PriorityBadge priority={escalation.priority} />
      </div>

      <p className="text-sm text-text-secondary mb-4 line-clamp-2">{escalation.description}</p>

      <div className="flex items-center justify-between">
        <StatusBadge status={escalation.status} />
        <SLAIndicator dueAt={escalation.sla_due_at} breached={escalation.sla_breached} />
      </div>

      {escalation.assigned_to && (
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
            {escalation.assigned_to.charAt(0)}
          </div>
          <span className="text-sm text-text-muted">{escalation.assigned_to}</span>
        </div>
      )}
    </div>
  );
}

function EscalationMetrics({ escalations }: { escalations: Escalation[] }) {
  const open = escalations.filter(e => e.status === 'open' || e.status === 'in_progress').length;
  const breached = escalations.filter(e => e.sla_breached).length;
  const resolved = escalations.filter(e => e.status === 'resolved' || e.status === 'closed');
  const avgResolutionTime = resolved.length > 0
    ? resolved.reduce((sum, e) => sum + (e.resolution_time_hours || 0), 0) / resolved.length
    : 0;

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-bg-card rounded-xl border border-border p-4 text-center">
        <p className="text-3xl font-bold text-warning">{open}</p>
        <p className="text-sm text-text-muted">Open Escalations</p>
      </div>
      <div className="bg-bg-card rounded-xl border border-border p-4 text-center">
        <p className={cn('text-3xl font-bold', breached > 0 ? 'text-danger' : 'text-success')}>{breached}</p>
        <p className="text-sm text-text-muted">SLA Breached</p>
      </div>
      <div className="bg-bg-card rounded-xl border border-border p-4 text-center">
        <p className="text-3xl font-bold text-text-primary">{resolved.length}</p>
        <p className="text-sm text-text-muted">Resolved This Week</p>
      </div>
      <div className="bg-bg-card rounded-xl border border-border p-4 text-center">
        <p className="text-3xl font-bold text-text-primary">{avgResolutionTime.toFixed(1)}h</p>
        <p className="text-sm text-text-muted">Avg Resolution</p>
      </div>
    </div>
  );
}

function EscalationTimeline({ events }: { events: EscalationEvent[] }) {
  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={event.id} className="relative flex gap-3">
          {index < events.length - 1 && (
            <div className="absolute left-2 top-6 w-0.5 h-full bg-border" />
          )}
          <div className="w-4 h-4 rounded-full bg-primary flex-shrink-0 mt-1" />
          <div className="flex-1 pb-4">
            <p className="text-sm font-medium text-text-primary">{event.action}</p>
            <p className="text-xs text-text-muted">
              {event.actor} · {new Date(event.timestamp).toLocaleString()}
            </p>
            {event.details && (
              <p className="text-sm text-text-secondary mt-1">{event.details}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SLAConfigTable({ configs }: { configs: SLAConfig[] }) {
  return (
    <div className="bg-bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-medium text-text-primary">SLA Configuration</h3>
      </div>
      <table className="w-full">
        <thead className="bg-bg-hover">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-text-muted uppercase">Priority</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-text-muted uppercase">Response Time</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-text-muted uppercase">Resolution Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {configs.map((config) => (
            <tr key={config.priority}>
              <td className="px-4 py-2">
                <PriorityBadge priority={config.priority} />
              </td>
              <td className="px-4 py-2 text-sm text-text-primary">{config.response_time_hours}h</td>
              <td className="px-4 py-2 text-sm text-text-primary">{config.resolution_time_hours}h</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Main Component
export function EscalationManagement() {
  const navigate = useNavigate();
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
  const [filter, setFilter] = useState<EscalationPriority | 'all'>('all');
  const [showSLAConfig, setShowSLAConfig] = useState(false);

  const filteredEscalations = filter === 'all'
    ? sampleEscalations
    : sampleEscalations.filter(e => e.priority === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Escalation Management</h2>
          <p className="text-sm text-text-muted">Track and resolve customer escalations with SLA monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSLAConfig(!showSLAConfig)}
            className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-bg-hover"
          >
            SLA Config
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Escalation
          </button>
        </div>
      </div>

      {/* Metrics */}
      <EscalationMetrics escalations={sampleEscalations} />

      {/* SLA Config (Toggle) */}
      {showSLAConfig && <SLAConfigTable configs={slaConfigs} />}

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(['all', 'critical', 'high', 'medium', 'low'] as const).map((priority) => (
          <button
            key={priority}
            onClick={() => setFilter(priority)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize',
              filter === priority ? 'bg-primary text-white' : 'bg-bg-hover text-text-secondary hover:text-text-primary'
            )}
          >
            {priority}
          </button>
        ))}
      </div>

      {/* Escalations Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEscalations.map((escalation) => (
          <EscalationCard
            key={escalation.id}
            escalation={escalation}
            onSelect={setSelectedEscalation}
          />
        ))}
      </div>

      {/* Selected Escalation Detail */}
      {selectedEscalation && (
        <div className="bg-bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">{selectedEscalation.title}</h3>
              <p className="text-sm text-text-muted">{selectedEscalation.customer_name}</p>
            </div>
            <button
              onClick={() => setSelectedEscalation(null)}
              className="text-text-muted hover:text-text-primary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Timeline */}
            <div>
              <h4 className="font-medium text-text-secondary mb-4">Activity Timeline</h4>
              {selectedEscalation.timeline.length > 0 ? (
                <EscalationTimeline events={selectedEscalation.timeline} />
              ) : (
                <p className="text-sm text-text-muted">No activity recorded yet</p>
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <h4 className="font-medium text-text-secondary mb-4">Quick Actions</h4>
              <div className="space-y-2">
                <button
                  onClick={() => navigate(`/customers/${selectedEscalation.customer_id}`)}
                  className="w-full px-4 py-2 text-sm font-medium text-left bg-primary/10 text-primary rounded-lg hover:bg-primary/20 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Customer Profile
                </button>
                <button className="w-full px-4 py-2 text-sm font-medium text-left bg-bg-hover rounded-lg hover:bg-bg-hover/80 flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Assign to team member
                </button>
                <button className="w-full px-4 py-2 text-sm font-medium text-left bg-bg-hover rounded-lg hover:bg-bg-hover/80 flex items-center gap-2">
                  <svg className="w-4 h-4 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Add internal note
                </button>
                <button className="w-full px-4 py-2 text-sm font-medium text-left bg-bg-hover rounded-lg hover:bg-bg-hover/80 flex items-center gap-2">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mark as resolved
                </button>
                <button className="w-full px-4 py-2 text-sm font-medium text-left bg-danger/10 text-danger rounded-lg hover:bg-danger/20 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Escalate to leadership
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
