/**
 * At-Risk Customers Table Component
 *
 * Displays customers at risk with health scores, risk factors, and actions.
 */

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils.ts';
import { HealthScoreGauge } from './HealthScoreGauge.tsx';
import type { HealthStatus, ScoreTrend } from '@/api/types/customerSuccess.ts';

interface AtRiskCustomer {
  id: number;
  customer_id: number;
  customer_name: string;
  overall_score: number;
  status: HealthStatus;
  trend: ScoreTrend | null;
  risk_factors: string[];
  days_at_risk?: number;
  renewal_date?: string;
  arr?: number;
  assigned_csm?: string;
  last_touchpoint?: string;
}

interface AtRiskTableProps {
  customers: AtRiskCustomer[];
  onSelectCustomer?: (customer: AtRiskCustomer) => void;
  onTriggerPlaybook?: (customer: AtRiskCustomer) => void;
  onCreateTask?: (customer: AtRiskCustomer) => void;
  className?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function AtRiskTable({
  customers,
  onSelectCustomer,
  onTriggerPlaybook,
  onCreateTask,
  className,
}: AtRiskTableProps) {
  const [sortField, setSortField] = useState<'score' | 'arr' | 'renewal' | 'days'>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<HealthStatus | 'all'>('all');

  const sortedCustomers = useMemo(() => {
    let filtered = customers;
    if (filterStatus !== 'all') {
      filtered = customers.filter(c => c.status === filterStatus);
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'score':
          comparison = a.overall_score - b.overall_score;
          break;
        case 'arr':
          comparison = (a.arr || 0) - (b.arr || 0);
          break;
        case 'renewal':
          if (!a.renewal_date && !b.renewal_date) comparison = 0;
          else if (!a.renewal_date) comparison = 1;
          else if (!b.renewal_date) comparison = -1;
          else comparison = new Date(a.renewal_date).getTime() - new Date(b.renewal_date).getTime();
          break;
        case 'days':
          comparison = (a.days_at_risk || 0) - (b.days_at_risk || 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [customers, sortField, sortDirection, filterStatus]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortHeader = ({ field, children }: { field: typeof sortField; children: React.ReactNode }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:text-text-primary transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <svg className={cn('w-4 h-4', sortDirection === 'desc' && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </div>
    </th>
  );

  const totalARR = useMemo(() => {
    return sortedCustomers.reduce((sum, c) => sum + (c.arr || 0), 0);
  }, [sortedCustomers]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">At-Risk Customers</h2>
          <p className="text-sm text-text-muted">
            {sortedCustomers.length} customers • {formatCurrency(totalARR)} ARR at risk
          </p>
        </div>
        <div className="flex gap-2">
          {(['all', 'critical', 'at_risk'] as const).map((status) => (
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
              {status === 'all' ? 'All' : status === 'at_risk' ? 'At Risk' : 'Critical'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {sortedCustomers.length === 0 ? (
        <div className="text-center py-12 bg-bg-secondary rounded-lg border border-border">
          <svg className="w-12 h-12 mx-auto mb-4 text-success opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-text-muted text-sm">No at-risk customers found</p>
        </div>
      ) : (
        <div className="bg-bg-secondary rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-tertiary border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Customer
                  </th>
                  <SortHeader field="score">Score</SortHeader>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Risk Factors
                  </th>
                  <SortHeader field="arr">ARR</SortHeader>
                  <SortHeader field="renewal">Renewal</SortHeader>
                  <SortHeader field="days">Days at Risk</SortHeader>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedCustomers.map((customer) => {
                  const renewalDays = customer.renewal_date ? daysUntil(customer.renewal_date) : null;
                  const isUrgent = customer.status === 'critical' || (renewalDays !== null && renewalDays <= 30);

                  return (
                    <tr
                      key={customer.id}
                      className={cn(
                        'hover:bg-bg-tertiary/50 transition-colors',
                        onSelectCustomer && 'cursor-pointer',
                        isUrgent && 'bg-danger/5'
                      )}
                      onClick={() => onSelectCustomer?.(customer)}
                    >
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-text-primary">{customer.customer_name}</p>
                          {customer.assigned_csm && (
                            <p className="text-xs text-text-muted mt-0.5">CSM: {customer.assigned_csm}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <HealthScoreGauge
                          score={customer.overall_score}
                          status={customer.status}
                          trend={customer.trend}
                          size="sm"
                          showLabel={false}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(customer.risk_factors || []).slice(0, 2).map((factor, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-danger/10 text-danger text-xs rounded-full"
                            >
                              {factor}
                            </span>
                          ))}
                          {(customer.risk_factors || []).length > 2 && (
                            <span className="px-2 py-0.5 bg-bg-tertiary text-text-muted text-xs rounded-full">
                              +{(customer.risk_factors || []).length - 2}
                            </span>
                          )}
                          {(!customer.risk_factors || customer.risk_factors.length === 0) && (
                            <span className="text-text-muted text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {customer.arr ? (
                          <span className="font-medium text-text-primary">
                            {formatCurrency(customer.arr)}
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {customer.renewal_date ? (
                          <div>
                            <p className="text-sm text-text-primary">{formatDate(customer.renewal_date)}</p>
                            {renewalDays !== null && (
                              <p className={cn(
                                'text-xs',
                                renewalDays <= 30 ? 'text-danger font-medium' :
                                renewalDays <= 90 ? 'text-warning' : 'text-text-muted'
                              )}>
                                {renewalDays < 0 ? `${Math.abs(renewalDays)}d overdue` :
                                 renewalDays === 0 ? 'Today' :
                                 `${renewalDays}d left`}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {customer.days_at_risk !== undefined ? (
                          <span className={cn(
                            'text-sm font-medium',
                            customer.days_at_risk > 30 ? 'text-danger' :
                            customer.days_at_risk > 14 ? 'text-warning' : 'text-text-secondary'
                          )}>
                            {customer.days_at_risk}d
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          {onTriggerPlaybook && (
                            <button
                              onClick={() => onTriggerPlaybook(customer)}
                              className="p-1.5 text-text-muted hover:text-primary transition-colors"
                              title="Trigger playbook"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </button>
                          )}
                          {onCreateTask && (
                            <button
                              onClick={() => onCreateTask(customer)}
                              className="p-1.5 text-text-muted hover:text-primary transition-colors"
                              title="Create task"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
