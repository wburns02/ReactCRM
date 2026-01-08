/**
 * SegmentDetail Component
 *
 * Detailed view of a segment with:
 * - Member list with pagination
 * - Segment analytics (size over time, churn risk, revenue)
 * - Quick actions (Email All, Create Call List, Export, etc.)
 * - AI insights specific to this segment
 */

import { useState } from 'react';
import { cn } from '@/lib/utils.ts';
import type { Segment, SegmentType, SegmentRuleSet } from '@/api/types/customerSuccess.ts';
import { useSegmentMembers, useSegmentAnalytics } from '@/hooks/useSegments.ts';
import { RuleSummary } from './components/RuleGroup.tsx';

interface SegmentDetailProps {
  segment: Segment;
  onEdit?: () => void;
  onViewBuilder?: () => void;
  onClose?: () => void;
  className?: string;
}

const TYPE_CONFIG: Record<SegmentType, { label: string; icon: React.ReactNode; className: string }> = {
  static: {
    label: 'Static',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  dynamic: {
    label: 'Dynamic',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  ai_generated: {
    label: 'AI Generated',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

type TabId = 'members' | 'analytics' | 'insights';

export function SegmentDetail({
  segment,
  onEdit,
  onViewBuilder,
  onClose,
  className,
}: SegmentDetailProps) {
  const [activeTab, setActiveTab] = useState<TabId>('members');
  const [memberPage, setMemberPage] = useState(1);
  const [memberSearch, setMemberSearch] = useState('');

  const { data: membersData, isLoading: membersLoading } = useSegmentMembers(segment.id, {
    page: memberPage,
    page_size: 10,
    search: memberSearch,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useSegmentAnalytics(segment.id);

  const typeConfig = TYPE_CONFIG[segment.segment_type];

  return (
    <div className={cn('flex flex-col h-full bg-white dark:bg-gray-900', className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            {/* Color bar */}
            {segment.color && (
              <div
                className="w-12 h-1 rounded-full mb-3"
                style={{ backgroundColor: segment.color }}
              />
            )}

            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full',
                typeConfig.className
              )}>
                {typeConfig.icon}
                {typeConfig.label}
              </span>
              {segment.is_active ? (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Active
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  Inactive
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {segment.name}
            </h2>
            {segment.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {segment.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onViewBuilder && (
              <button
                onClick={onViewBuilder}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                title="View in Builder"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                title="Edit Segment"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {segment.customer_count?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Customers</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(segment.total_arr)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total ARR</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {segment.avg_health_score?.toFixed(0) || '-'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Avg Health</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className={cn(
              'text-2xl font-bold',
              (segment.churn_risk_count || 0) > 0 ? 'text-red-500' : 'text-green-500'
            )}>
              {segment.churn_risk_count || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">At Risk</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 mt-4">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email All
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call List
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Trigger Playbook
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-6">
        <div className="flex gap-6">
          {[
            { id: 'members' as TabId, label: 'Members', count: membersData?.total },
            { id: 'analytics' as TabId, label: 'Analytics' },
            { id: 'insights' as TabId, label: 'AI Insights' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Members Tab */}
        {activeTab === 'members' && (
          <MembersTab
            members={membersData?.items || []}
            total={membersData?.total || 0}
            page={memberPage}
            pageSize={10}
            search={memberSearch}
            isLoading={membersLoading}
            onPageChange={setMemberPage}
            onSearchChange={setMemberSearch}
          />
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <AnalyticsTab
            analytics={analyticsData}
            isLoading={analyticsLoading}
          />
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <InsightsTab segment={segment} />
        )}
      </div>
    </div>
  );
}

// ============================================
// Tab Components
// ============================================

interface MembersTabProps {
  members: Array<{
    id: number;
    customer_id: number;
    customer_name: string;
    email: string;
    health_score: number | null;
    health_status: string | null;
    arr: number | null;
    joined_segment_at: string | null;
    churn_risk: number | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
  search: string;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
}

function MembersTab({
  members,
  total,
  page,
  pageSize,
  search,
  isLoading,
  onPageChange,
  onSearchChange,
}: MembersTabProps) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search members..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {total} members
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No members found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Health</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ARR</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Churn Risk</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Joined</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{member.customer_name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{member.email}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {member.health_score !== null && (
                      <span className={cn(
                        'px-2 py-1 rounded text-sm font-medium',
                        member.health_score >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        member.health_score >= 40 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      )}>
                        {member.health_score}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">
                    {formatCurrency(member.arr)}
                  </td>
                  <td className="py-3 px-4">
                    {member.churn_risk !== null && (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              member.churn_risk > 0.7 ? 'bg-red-500' :
                              member.churn_risk > 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                            )}
                            style={{ width: `${member.churn_risk * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {(member.churn_risk * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                    {member.joined_segment_at ? new Date(member.joined_segment_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className={cn(
              'px-4 py-2 text-sm rounded-lg transition-colors',
              page === 1
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className={cn(
              'px-4 py-2 text-sm rounded-lg transition-colors',
              page === totalPages
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

interface AnalyticsTabProps {
  analytics: {
    size_over_time: Array<{ date: string; count: number }>;
    health_distribution: Record<string, number>;
    arr_distribution: { total: number; average: number; median: number };
    churn_risk: { high: number; medium: number; low: number };
    top_industries: Array<{ name: string; count: number }>;
    engagement_trend: Array<{ date: string; score: number }>;
  } | undefined;
  isLoading: boolean;
}

function AnalyticsTab({ analytics, isLoading }: AnalyticsTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No analytics data available
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Size Over Time Chart */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">Segment Size Over Time</h4>
        <div className="h-40 flex items-end gap-1">
          {analytics.size_over_time.map((point, index) => {
            const max = Math.max(...analytics.size_over_time.map(p => p.count));
            const height = (point.count / max) * 100;
            return (
              <div
                key={index}
                className="flex-1 bg-primary rounded-t transition-all hover:bg-primary-hover"
                style={{ height: `${height}%` }}
                title={`${point.date}: ${point.count}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
          {analytics.size_over_time.length > 0 && (
            <>
              <span>{new Date(analytics.size_over_time[0].date).toLocaleDateString()}</span>
              <span>{new Date(analytics.size_over_time[analytics.size_over_time.length - 1].date).toLocaleDateString()}</span>
            </>
          )}
        </div>
      </div>

      {/* Health Distribution */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">Health Distribution</h4>
        <div className="space-y-3">
          {Object.entries(analytics.health_distribution).map(([status, count]) => {
            const total = Object.values(analytics.health_distribution).reduce((a, b) => a + b, 0);
            const percent = total > 0 ? (count / total) * 100 : 0;
            const colors: Record<string, string> = {
              healthy: 'bg-green-500',
              at_risk: 'bg-yellow-500',
              critical: 'bg-red-500',
              churned: 'bg-gray-500',
            };
            return (
              <div key={status}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-300 capitalize">{status.replace('_', ' ')}</span>
                  <span className="text-gray-900 dark:text-white font-medium">{count}</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', colors[status] || 'bg-gray-400')}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ARR Distribution */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">Revenue Metrics</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(analytics.arr_distribution.total)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total ARR</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(analytics.arr_distribution.average)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Average ARR</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(analytics.arr_distribution.median)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Median ARR</div>
          </div>
        </div>
      </div>

      {/* Churn Risk */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">Churn Risk Distribution</h4>
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">High Risk</span>
              <span className="ml-auto font-medium text-gray-900 dark:text-white">{analytics.churn_risk.high}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Medium Risk</span>
              <span className="ml-auto font-medium text-gray-900 dark:text-white">{analytics.churn_risk.medium}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Low Risk</span>
              <span className="ml-auto font-medium text-gray-900 dark:text-white">{analytics.churn_risk.low}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Industries */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 md:col-span-2">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">Top Industries</h4>
        <div className="flex flex-wrap gap-2">
          {analytics.top_industries.map((industry) => (
            <div
              key={industry.name}
              className="px-3 py-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-white">{industry.name}</span>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{industry.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface InsightsTabProps {
  segment: Segment;
}

function InsightsTab({ segment }: InsightsTabProps) {
  // Demo insights
  const insights = [
    {
      id: '1',
      type: 'opportunity',
      title: 'Expansion Opportunity',
      description: `${Math.floor((segment.customer_count || 0) * 0.15)} customers in this segment are showing high product adoption and may be ready for upselling.`,
      action: 'View Opportunities',
    },
    {
      id: '2',
      type: 'risk',
      title: 'Engagement Drop Detected',
      description: 'Average engagement score for this segment has dropped 8% over the last 30 days.',
      action: 'Investigate',
    },
    {
      id: '3',
      type: 'recommendation',
      title: 'Recommended Playbook',
      description: 'Based on segment characteristics, consider running the "Quarterly Business Review" playbook.',
      action: 'View Playbook',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Segment Rules Summary */}
      {segment.rules != null ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Segment Definition</h4>
          <RuleSummary ruleSet={segment.rules as SegmentRuleSet} />
        </div>
      ) : null}

      {/* AI Insights */}
      <div className="space-y-4">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={cn(
              'p-4 rounded-xl border',
              insight.type === 'opportunity' && 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
              insight.type === 'risk' && 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
              insight.type === 'recommendation' && 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'p-2 rounded-lg',
                insight.type === 'opportunity' && 'bg-green-500/20 text-green-600 dark:text-green-400',
                insight.type === 'risk' && 'bg-red-500/20 text-red-600 dark:text-red-400',
                insight.type === 'recommendation' && 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
              )}>
                {insight.type === 'opportunity' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                )}
                {insight.type === 'risk' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                {insight.type === 'recommendation' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h5 className="font-medium text-gray-900 dark:text-white">{insight.title}</h5>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{insight.description}</p>
                <button className="mt-3 text-sm font-medium text-primary hover:text-primary-hover">
                  {insight.action} &rarr;
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
