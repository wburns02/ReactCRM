/**
 * AI Insights Panel Component
 *
 * Features:
 * - List of AI-detected insights with icons
 * - Urgency indicators (Critical, High, Medium)
 * - One-click action buttons per insight
 * - "Analyzing..." loading state
 * - Refresh button to re-run analysis
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils.ts';

// Types
export type InsightUrgency = 'critical' | 'high' | 'medium' | 'low';
export type InsightCategory = 'churn_risk' | 'satisfaction' | 'engagement' | 'trend' | 'feedback' | 'opportunity';
export type InsightActionType = 'follow_up' | 'escalate' | 'schedule_call' | 'send_survey' | 'create_task' | 'view_details';

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  urgency: InsightUrgency;
  category: InsightCategory;
  affectedCustomers?: number;
  confidence: number; // 0-100
  suggestedAction: {
    type: InsightActionType;
    label: string;
  };
  createdAt: string;
  isNew?: boolean;
}

interface AIInsightsPanelProps {
  surveyId?: number;
  insights?: AIInsight[];
  onActionClick?: (insight: AIInsight, actionType: InsightActionType) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

// Urgency configuration
const URGENCY_CONFIG: Record<InsightUrgency, { label: string; color: string; bgColor: string; icon: string }> = {
  critical: { label: 'Critical', color: 'text-danger', bgColor: 'bg-danger/10', icon: '!!' },
  high: { label: 'High', color: 'text-warning', bgColor: 'bg-warning/10', icon: '!' },
  medium: { label: 'Medium', color: 'text-info', bgColor: 'bg-info/10', icon: '-' },
  low: { label: 'Low', color: 'text-text-muted', bgColor: 'bg-bg-hover', icon: '' },
};

// Category icons
function CategoryIcon({ category }: { category: InsightCategory }) {
  switch (category) {
    case 'churn_risk':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    case 'satisfaction':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'engagement':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      );
    case 'trend':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    case 'feedback':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case 'opportunity':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      );
  }
}

// Action button icons
function ActionIcon({ type }: { type: InsightActionType }) {
  switch (type) {
    case 'follow_up':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'escalate':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
        </svg>
      );
    case 'schedule_call':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      );
    case 'send_survey':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
    case 'create_task':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'view_details':
    default:
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      );
  }
}

// Sample insights generator
function generateSampleInsights(): AIInsight[] {
  return [
    {
      id: '1',
      title: '3 Detractors Need Immediate Attention',
      description: 'Three customers scored 0-4 and mentioned specific issues with support response times. Risk of churn within 30 days.',
      urgency: 'critical',
      category: 'churn_risk',
      affectedCustomers: 3,
      confidence: 92,
      suggestedAction: { type: 'escalate', label: 'Escalate Now' },
      createdAt: new Date().toISOString(),
      isNew: true,
    },
    {
      id: '2',
      title: 'NPS Declining in Enterprise Segment',
      description: 'Enterprise customers show a 12-point NPS decline over the past 2 weeks. Common theme: missing advanced reporting features.',
      urgency: 'high',
      category: 'trend',
      affectedCustomers: 15,
      confidence: 87,
      suggestedAction: { type: 'follow_up', label: 'Send Follow-up' },
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      isNew: true,
    },
    {
      id: '3',
      title: 'Positive Feedback Spike on New Feature',
      description: '78% of responses this week mentioned the new dashboard positively. Consider featuring in marketing.',
      urgency: 'medium',
      category: 'opportunity',
      affectedCustomers: 45,
      confidence: 94,
      suggestedAction: { type: 'view_details', label: 'View Feedback' },
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: '4',
      title: 'Support Satisfaction Below Threshold',
      description: 'Post-support CSAT dropped below 4.0. Common complaint: long wait times for technical issues.',
      urgency: 'high',
      category: 'satisfaction',
      affectedCustomers: 28,
      confidence: 89,
      suggestedAction: { type: 'create_task', label: 'Create Task' },
      createdAt: new Date(Date.now() - 14400000).toISOString(),
    },
    {
      id: '5',
      title: 'Low Response Rate in SMB Segment',
      description: 'Only 12% of SMB customers responded to the Q1 survey. Consider shortening survey or adding incentive.',
      urgency: 'medium',
      category: 'engagement',
      confidence: 76,
      suggestedAction: { type: 'send_survey', label: 'Resend Survey' },
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
}

// Insight Card Component
function InsightCard({
  insight,
  onAction,
}: {
  insight: AIInsight;
  onAction: (actionType: InsightActionType) => void;
}) {
  const urgencyConfig = URGENCY_CONFIG[insight.urgency];
  const timeAgo = getTimeAgo(insight.createdAt);

  return (
    <div className={cn(
      'relative bg-bg-hover rounded-lg p-4 border-l-4 transition-all hover:bg-bg-tertiary',
      insight.urgency === 'critical' && 'border-l-danger',
      insight.urgency === 'high' && 'border-l-warning',
      insight.urgency === 'medium' && 'border-l-info',
      insight.urgency === 'low' && 'border-l-text-muted'
    )}>
      {/* New Badge */}
      {insight.isNew && (
        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-primary text-white rounded">
          NEW
        </span>
      )}

      <div className="flex items-start gap-3">
        {/* Category Icon */}
        <div className={cn('p-2 rounded-lg', urgencyConfig.bgColor, urgencyConfig.color)}>
          <CategoryIcon category={insight.category} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-medium text-text-primary text-sm line-clamp-1">
              {insight.title}
            </h4>
            <span className={cn(
              'px-1.5 py-0.5 text-[10px] font-semibold rounded whitespace-nowrap',
              urgencyConfig.bgColor,
              urgencyConfig.color
            )}>
              {urgencyConfig.label}
            </span>
          </div>

          {/* Description */}
          <p className="text-xs text-text-muted mb-2 line-clamp-2">
            {insight.description}
          </p>

          {/* Meta Info */}
          <div className="flex items-center gap-3 text-[10px] text-text-muted mb-3">
            {insight.affectedCustomers !== undefined && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {insight.affectedCustomers} affected
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {insight.confidence}% confidence
            </span>
            <span>{timeAgo}</span>
          </div>

          {/* Action Button */}
          <button
            onClick={() => onAction(insight.suggestedAction.type)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              insight.urgency === 'critical'
                ? 'bg-danger text-white hover:bg-danger/90'
                : insight.urgency === 'high'
                ? 'bg-warning text-white hover:bg-warning/90'
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            <ActionIcon type={insight.suggestedAction.type} />
            {insight.suggestedAction.label}
          </button>
        </div>
      </div>
    </div>
  );
}

// Time ago helper
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-bg-hover rounded-lg p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-bg-tertiary rounded-lg" />
            <div className="flex-1">
              <div className="h-4 w-3/4 bg-bg-tertiary rounded mb-2" />
              <div className="h-3 w-full bg-bg-tertiary rounded mb-2" />
              <div className="h-3 w-1/2 bg-bg-tertiary rounded mb-3" />
              <div className="h-6 w-24 bg-bg-tertiary rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Analyzing state component
function AnalyzingState() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12">
      {/* Animated brain icon */}
      <div className="relative mb-4">
        <svg className="w-16 h-16 text-primary animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        {/* Spinning ring */}
        <svg className="absolute inset-0 w-16 h-16 animate-spin" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="15 45" className="text-primary/30" />
        </svg>
      </div>
      <p className="text-lg font-medium text-text-primary">
        AI Analyzing{dots}
      </p>
      <p className="text-sm text-text-muted mt-1">
        Processing survey responses and detecting patterns
      </p>
    </div>
  );
}

export function AIInsightsPanel({
  surveyId: _surveyId,
  insights: propInsights,
  onActionClick,
  onRefresh,
  isLoading = false,
  className,
}: AIInsightsPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [filter, setFilter] = useState<InsightUrgency | 'all'>('all');

  // Initialize insights
  useEffect(() => {
    if (propInsights) {
      setInsights(propInsights);
    } else {
      // Load sample data
      setInsights(generateSampleInsights());
    }
  }, [propInsights]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsAnalyzing(true);
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 3000));
    setInsights(generateSampleInsights());
    setIsAnalyzing(false);
    onRefresh?.();
  }, [onRefresh]);

  // Handle action click
  const handleAction = useCallback((insight: AIInsight, actionType: InsightActionType) => {
    onActionClick?.(insight, actionType);
    // Mark as not new
    setInsights(prev =>
      prev.map(i => i.id === insight.id ? { ...i, isNew: false } : i)
    );
  }, [onActionClick]);

  // Filter insights
  const filteredInsights = useMemo(() => {
    if (filter === 'all') return insights;
    return insights.filter(i => i.urgency === filter);
  }, [insights, filter]);

  // Count by urgency
  const urgencyCounts = useMemo(() => {
    return insights.reduce(
      (acc, i) => {
        acc[i.urgency]++;
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0 }
    );
  }, [insights]);

  return (
    <div className={cn('bg-bg-card rounded-xl border border-border', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Insights
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {insights.length} insights detected
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isAnalyzing}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isAnalyzing
                ? 'bg-bg-hover text-text-muted cursor-not-allowed'
                : 'bg-bg-hover text-text-secondary hover:text-primary hover:bg-primary/10'
            )}
          >
            <svg
              className={cn('w-5 h-5', isAnalyzing && 'animate-spin')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Urgency Filter Pills */}
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
            All ({insights.length})
          </button>
          {urgencyCounts.critical > 0 && (
            <button
              onClick={() => setFilter('critical')}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                filter === 'critical'
                  ? 'bg-danger text-white'
                  : 'bg-danger/10 text-danger hover:bg-danger/20'
              )}
            >
              Critical ({urgencyCounts.critical})
            </button>
          )}
          {urgencyCounts.high > 0 && (
            <button
              onClick={() => setFilter('high')}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                filter === 'high'
                  ? 'bg-warning text-white'
                  : 'bg-warning/10 text-warning hover:bg-warning/20'
              )}
            >
              High ({urgencyCounts.high})
            </button>
          )}
          {urgencyCounts.medium > 0 && (
            <button
              onClick={() => setFilter('medium')}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                filter === 'medium'
                  ? 'bg-info text-white'
                  : 'bg-info/10 text-info hover:bg-info/20'
              )}
            >
              Medium ({urgencyCounts.medium})
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {isLoading ? (
          <LoadingSkeleton />
        ) : isAnalyzing ? (
          <AnalyzingState />
        ) : filteredInsights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg className="w-12 h-12 text-text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-text-secondary font-medium">No insights found</p>
            <p className="text-text-muted text-sm mt-1">
              {filter !== 'all' ? 'Try a different filter or ' : ''}
              Click refresh to re-analyze
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInsights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onAction={(actionType) => handleAction(insight, actionType)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AIInsightsPanel;
