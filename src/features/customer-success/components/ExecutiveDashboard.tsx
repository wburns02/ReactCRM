/**
 * Executive Dashboard Component
 *
 * High-level view for Customer Success executives featuring:
 * - KPI Cards (NPS, Churn, Adoption, TTV, Engagement, Expansion)
 * - NPS Trend Chart
 * - Churn Risk Summary
 * - Top At-Risk Accounts
 * - Success Metrics Overview
 */

import { useState } from 'react';
import { ExecutiveKPICards } from './ExecutiveKPICards.tsx';
import { NPSTrendChart } from './NPSTrendChart.tsx';
import { ChurnRiskIndicator } from './ChurnRiskIndicator.tsx';
import { cn } from '@/lib/utils.ts';
import { useAtRiskCustomers, useCSDashboardOverview } from '@/api/hooks/useCustomerSuccess.ts';

interface ExecutiveDashboardProps {
  isLoading?: boolean;
}

interface MetricCard {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down';
  good?: 'up' | 'down';
}

function MetricsRow({ metrics }: { metrics: MetricCard[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((metric, index) => {
        const isPositive = metric.trend === metric.good;
        return (
          <div key={index} className="bg-bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-text-muted mb-1">{metric.label}</p>
            <p className="text-2xl font-bold text-text-primary">{metric.value}</p>
            {metric.change !== undefined && (
              <p className={cn(
                'text-xs mt-1 flex items-center gap-1',
                isPositive ? 'text-success' : 'text-danger'
              )}>
                {metric.trend === 'up' ? '↑' : '↓'} {Math.abs(metric.change)}%
                <span className="text-text-muted">vs last period</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TopAccountsTable({ accounts }: { accounts: Array<{
  id: number;
  name: string;
  health_score: number;
  risk_factors: string[];
  arr: number;
  days_until_renewal?: number;
}> }) {
  return (
    <div className="bg-bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="font-semibold text-text-primary">Top At-Risk Accounts</h3>
        <p className="text-sm text-text-muted">Accounts requiring immediate attention</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-bg-hover">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Account</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Health</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">ARR</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Risk Factors</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Renewal</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {accounts.map((account) => (
              <tr key={account.id} className="hover:bg-bg-hover transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-text-primary">{account.name}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                      account.health_score >= 70 ? 'bg-success/10 text-success' :
                      account.health_score >= 40 ? 'bg-warning/10 text-warning' :
                      'bg-danger/10 text-danger'
                    )}>
                      {account.health_score}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-text-primary font-medium">
                  ${(account.arr / 1000).toFixed(0)}K
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {account.risk_factors.slice(0, 2).map((factor, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs bg-danger/10 text-danger rounded">
                        {factor}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-text-secondary">
                  {account.days_until_renewal ? `${account.days_until_renewal}d` : '-'}
                </td>
                <td className="px-6 py-4">
                  <button className="text-primary hover:text-primary-dark text-sm font-medium">
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ExecutiveDashboard({ isLoading: propsLoading }: ExecutiveDashboardProps) {
  const [npsPeriod, setNpsPeriod] = useState<'7d' | '30d' | '90d' | '12m'>('30d');
  const { data: dashboardData, isLoading: dashboardLoading } = useCSDashboardOverview();
  const { data: atRiskData, isLoading: atRiskLoading } = useAtRiskCustomers({ limit: 5 });

  const isLoading = propsLoading || dashboardLoading;

  // Sample data for top accounts (would come from API)
  const topAccounts = atRiskData?.items?.slice(0, 5).map((item: { customer_id: number; customer_name: string; overall_score: number }) => ({
    id: item.customer_id,
    name: item.customer_name,
    health_score: item.overall_score,
    risk_factors: ['Low engagement', 'Support issues'],
    arr: 50000 + Math.random() * 100000,
    days_until_renewal: Math.floor(30 + Math.random() * 60),
  })) || [];

  // Calculate total customers from health distribution
  const totalCustomers = dashboardData?.health_distribution
    ? Object.values(dashboardData.health_distribution).reduce((sum, val) => sum + val, 0)
    : 100;

  // Aggregate metrics
  const aggregateMetrics: MetricCard[] = [
    {
      label: 'Total Customers',
      value: totalCustomers,
      change: 5.2,
      trend: 'up',
      good: 'up',
    },
    {
      label: 'Active Playbooks',
      value: dashboardData?.active_playbook_executions || 24,
      change: 12.3,
      trend: 'up',
      good: 'up',
    },
    {
      label: 'Customer Lifetime Value',
      value: '$45.2K',
      change: 8.1,
      trend: 'up',
      good: 'up',
    },
    {
      label: 'Avg. Resolution Time',
      value: '2.4h',
      change: 15.0,
      trend: 'down',
      good: 'down',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Executive Overview</h2>
          <p className="text-sm text-text-muted">Key metrics and insights for leadership</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-bg-hover transition-colors">
            Export Report
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors">
            Schedule Review
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <ExecutiveKPICards isLoading={isLoading} />

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <NPSTrendChart
          period={npsPeriod}
          onPeriodChange={setNpsPeriod}
          isLoading={isLoading}
        />
        <ChurnRiskIndicator isLoading={isLoading} />
      </div>

      {/* Aggregate Metrics */}
      <MetricsRow metrics={aggregateMetrics} />

      {/* At-Risk Accounts Table */}
      {!atRiskLoading && topAccounts.length > 0 && (
        <TopAccountsTable accounts={topAccounts} />
      )}

      {/* Bottom Section - Quick Insights */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Health Distribution */}
        <div className="bg-bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4">Health Distribution</h3>
          <div className="space-y-3">
            {[
              { label: 'Healthy', count: dashboardData?.health_distribution?.healthy || 43, color: 'bg-success' },
              { label: 'At Risk', count: dashboardData?.health_distribution?.at_risk || 46, color: 'bg-warning' },
              { label: 'Critical', count: dashboardData?.health_distribution?.critical || 11, color: 'bg-danger' },
            ].map((item) => {
              const total = (dashboardData?.health_distribution?.healthy || 43) +
                           (dashboardData?.health_distribution?.at_risk || 46) +
                           (dashboardData?.health_distribution?.critical || 11);
              const percent = total > 0 ? (item.count / total) * 100 : 0;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-text-secondary">{item.label}</span>
                    <span className="font-medium text-text-primary">{item.count}</span>
                  </div>
                  <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', item.color)}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Renewals */}
        <div className="bg-bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4">Upcoming Renewals</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-bg-hover rounded-lg">
              <div>
                <p className="text-sm font-medium text-text-primary">Next 30 Days</p>
                <p className="text-xs text-text-muted">12 customers · $234K ARR</p>
              </div>
              <span className="text-lg font-bold text-warning">12</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-bg-hover rounded-lg">
              <div>
                <p className="text-sm font-medium text-text-primary">31-60 Days</p>
                <p className="text-xs text-text-muted">8 customers · $156K ARR</p>
              </div>
              <span className="text-lg font-bold text-primary">8</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-bg-hover rounded-lg">
              <div>
                <p className="text-sm font-medium text-text-primary">61-90 Days</p>
                <p className="text-xs text-text-muted">15 customers · $412K ARR</p>
              </div>
              <span className="text-lg font-bold text-success">15</span>
            </div>
          </div>
        </div>

        {/* Success Team Performance */}
        <div className="bg-bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4">Team Performance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-text-secondary">Tasks Completed</span>
                <span className="font-medium text-text-primary">89%</span>
              </div>
              <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                <div className="h-full bg-success rounded-full" style={{ width: '89%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-text-secondary">Response Rate</span>
                <span className="font-medium text-text-primary">94%</span>
              </div>
              <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: '94%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-text-secondary">Customer Satisfaction</span>
                <span className="font-medium text-text-primary">4.7/5</span>
              </div>
              <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                <div className="h-full bg-info rounded-full" style={{ width: '94%' }} />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-text-muted">
              <span className="font-medium text-text-primary">{dashboardData?.open_tasks || 0}</span> open tasks ·
              <span className={cn(
                'font-medium ml-1',
                (dashboardData?.overdue_tasks || 0) > 0 ? 'text-danger' : 'text-success'
              )}>{dashboardData?.overdue_tasks || 0}</span> overdue
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
