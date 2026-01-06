/**
 * Nurture Campaign Manager Component
 *
 * Complete campaign management for customer success featuring:
 * - Email campaigns
 * - In-app messaging
 * - Webinar/event tracking
 * - A/B testing
 * - Campaign analytics
 * - Automated sequences
 */

import { useState } from 'react';
import { cn } from '@/lib/utils.ts';

// Types
export type CampaignType = 'email' | 'in_app' | 'webinar' | 'sms' | 'multi_channel';
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
export type CampaignGoal = 'onboarding' | 'adoption' | 'retention' | 'expansion' | 'reactivation' | 'education';

export interface Campaign {
  id: number;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  goal: CampaignGoal;
  description?: string;
  target_segment_id?: number;
  target_segment_name?: string;
  start_date?: string;
  end_date?: string;
  sent_count: number;
  open_rate?: number;
  click_rate?: number;
  conversion_rate?: number;
  steps: CampaignStep[];
  ab_test?: ABTest;
  created_at: string;
}

export interface CampaignStep {
  id: number;
  order: number;
  name: string;
  type: 'email' | 'delay' | 'condition' | 'action' | 'in_app';
  delay_days?: number;
  subject?: string;
  content?: string;
  condition?: string;
}

export interface ABTest {
  id: number;
  variant_a: { name: string; sent: number; conversions: number };
  variant_b: { name: string; sent: number; conversions: number };
  winner?: 'a' | 'b';
  confidence?: number;
}

// Sample data
const sampleCampaigns: Campaign[] = [
  {
    id: 1,
    name: 'New Customer Onboarding',
    type: 'multi_channel',
    status: 'active',
    goal: 'onboarding',
    description: 'Welcome new customers and guide them through setup',
    target_segment_name: 'New Customers (Last 30 Days)',
    start_date: '2026-01-01',
    sent_count: 145,
    open_rate: 68.5,
    click_rate: 42.3,
    conversion_rate: 85.2,
    steps: [
      { id: 1, order: 1, name: 'Welcome Email', type: 'email', subject: 'Welcome to our platform!' },
      { id: 2, order: 2, name: 'Wait 1 Day', type: 'delay', delay_days: 1 },
      { id: 3, order: 3, name: 'Setup Guide', type: 'email', subject: 'Quick start guide to get you running' },
      { id: 4, order: 4, name: 'In-app Tour', type: 'in_app', content: 'Interactive product tour' },
      { id: 5, order: 5, name: 'Wait 3 Days', type: 'delay', delay_days: 3 },
      { id: 6, order: 6, name: 'Check Progress', type: 'condition', condition: 'has_completed_setup' },
    ],
    ab_test: {
      id: 1,
      variant_a: { name: 'Video Tutorial', sent: 72, conversions: 58 },
      variant_b: { name: 'Written Guide', sent: 73, conversions: 51 },
      winner: 'a',
      confidence: 94.5,
    },
    created_at: '2025-12-15',
  },
  {
    id: 2,
    name: 'Feature Adoption Push',
    type: 'email',
    status: 'active',
    goal: 'adoption',
    description: 'Encourage adoption of underutilized features',
    target_segment_name: 'Low Feature Usage',
    sent_count: 234,
    open_rate: 52.1,
    click_rate: 28.7,
    conversion_rate: 15.3,
    steps: [
      { id: 1, order: 1, name: 'Feature Highlight', type: 'email', subject: 'Did you know you can do this?' },
      { id: 2, order: 2, name: 'Wait 5 Days', type: 'delay', delay_days: 5 },
      { id: 3, order: 3, name: 'Success Story', type: 'email', subject: 'See how others use this feature' },
    ],
    created_at: '2026-01-02',
  },
  {
    id: 3,
    name: 'At-Risk Re-engagement',
    type: 'multi_channel',
    status: 'active',
    goal: 'retention',
    description: 'Re-engage customers showing signs of churn',
    target_segment_name: 'At-Risk Customers',
    sent_count: 45,
    open_rate: 45.2,
    click_rate: 22.1,
    conversion_rate: 31.1,
    steps: [
      { id: 1, order: 1, name: 'Check-in Email', type: 'email', subject: 'We noticed you\'ve been away' },
      { id: 2, order: 2, name: 'CSM Alert', type: 'action', content: 'Notify assigned CSM' },
    ],
    created_at: '2026-01-03',
  },
  {
    id: 4,
    name: 'Quarterly Webinar Series',
    type: 'webinar',
    status: 'scheduled',
    goal: 'education',
    description: 'Educational webinars on best practices',
    target_segment_name: 'All Active Customers',
    start_date: '2026-01-20',
    sent_count: 0,
    steps: [],
    created_at: '2026-01-05',
  },
  {
    id: 5,
    name: 'Expansion Opportunity',
    type: 'email',
    status: 'draft',
    goal: 'expansion',
    description: 'Upsell to customers with high usage',
    target_segment_name: 'High Usage - Low Plan',
    sent_count: 0,
    steps: [],
    created_at: '2026-01-06',
  },
];

// Components
function CampaignTypeIcon({ type }: { type: CampaignType }) {
  const icons: Record<CampaignType, React.ReactNode> = {
    email: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    in_app: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    webinar: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    sms: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    multi_channel: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  };
  return icons[type];
}

function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const config = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
    scheduled: { bg: 'bg-info/10', text: 'text-info' },
    active: { bg: 'bg-success/10', text: 'text-success' },
    paused: { bg: 'bg-warning/10', text: 'text-warning' },
    completed: { bg: 'bg-primary/10', text: 'text-primary' },
  };

  return (
    <span className={cn('px-2 py-1 text-xs font-medium rounded-full capitalize', config[status].bg, config[status].text)}>
      {status}
    </span>
  );
}

function GoalBadge({ goal }: { goal: CampaignGoal }) {
  const icons: Record<CampaignGoal, string> = {
    onboarding: '🚀',
    adoption: '📈',
    retention: '🔄',
    expansion: '💰',
    reactivation: '🔔',
    education: '📚',
  };

  return (
    <span className="flex items-center gap-1 text-xs text-text-muted">
      <span>{icons[goal]}</span>
      <span className="capitalize">{goal}</span>
    </span>
  );
}

function MetricCard({ label, value, suffix }: { label: string; value: number | string | undefined; suffix?: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-text-primary">
        {value !== undefined ? value : '-'}
        {suffix && <span className="text-sm text-text-muted">{suffix}</span>}
      </p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}

function CampaignCard({ campaign, onSelect }: { campaign: Campaign; onSelect: (c: Campaign) => void }) {
  return (
    <div
      onClick={() => onSelect(campaign)}
      className="bg-bg-card rounded-xl border border-border p-6 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <CampaignTypeIcon type={campaign.type} />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">{campaign.name}</h3>
            <GoalBadge goal={campaign.goal} />
          </div>
        </div>
        <CampaignStatusBadge status={campaign.status} />
      </div>

      {campaign.description && (
        <p className="text-sm text-text-muted mb-4 line-clamp-2">{campaign.description}</p>
      )}

      <div className="grid grid-cols-4 gap-4 mb-4">
        <MetricCard label="Sent" value={campaign.sent_count} />
        <MetricCard label="Open Rate" value={campaign.open_rate?.toFixed(1)} suffix="%" />
        <MetricCard label="Click Rate" value={campaign.click_rate?.toFixed(1)} suffix="%" />
        <MetricCard label="Conversion" value={campaign.conversion_rate?.toFixed(1)} suffix="%" />
      </div>

      {campaign.target_segment_name && (
        <div className="pt-4 border-t border-border">
          <span className="text-xs text-text-muted">
            Target: <span className="text-text-secondary">{campaign.target_segment_name}</span>
          </span>
        </div>
      )}

      {campaign.ab_test && (
        <div className="mt-3 px-3 py-2 bg-info/5 rounded-lg border border-info/20">
          <div className="flex items-center gap-2 text-xs text-info">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            A/B Test Running · {campaign.ab_test.confidence}% confidence
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignWorkflow({ steps }: { steps: CampaignStep[] }) {
  const getStepIcon = (type: string) => {
    switch (type) {
      case 'email':
        return '📧';
      case 'delay':
        return '⏳';
      case 'condition':
        return '🔀';
      case 'action':
        return '⚡';
      case 'in_app':
        return '💬';
      default:
        return '📝';
    }
  };

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={step.id} className="relative">
          {index > 0 && (
            <div className="absolute left-5 -top-4 w-0.5 h-4 bg-border" />
          )}
          <div className="flex items-start gap-3 p-3 bg-bg-hover rounded-lg">
            <div className="w-10 h-10 flex items-center justify-center bg-bg-card rounded-full border border-border text-lg">
              {getStepIcon(step.type)}
            </div>
            <div className="flex-1">
              <p className="font-medium text-text-primary">{step.name}</p>
              <p className="text-xs text-text-muted capitalize">{step.type}</p>
              {step.subject && (
                <p className="text-sm text-text-secondary mt-1">"{step.subject}"</p>
              )}
              {step.delay_days && (
                <p className="text-sm text-text-secondary mt-1">Wait {step.delay_days} day{step.delay_days > 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ABTestResults({ test }: { test: ABTest }) {
  const totalA = test.variant_a.sent;
  const totalB = test.variant_b.sent;
  const convRateA = totalA > 0 ? (test.variant_a.conversions / totalA) * 100 : 0;
  const convRateB = totalB > 0 ? (test.variant_b.conversions / totalB) * 100 : 0;

  return (
    <div className="bg-bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary">A/B Test Results</h3>
        {test.winner && (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-success/10 text-success">
            Winner: Variant {test.winner.toUpperCase()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className={cn(
          'p-4 rounded-lg border',
          test.winner === 'a' ? 'border-success bg-success/5' : 'border-border'
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-text-primary">Variant A</span>
            {test.winner === 'a' && <span className="text-success text-xs">Winner</span>}
          </div>
          <p className="text-sm text-text-muted mb-2">{test.variant_a.name}</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-text-primary">{convRateA.toFixed(1)}%</span>
            <span className="text-sm text-text-muted">{test.variant_a.conversions}/{test.variant_a.sent}</span>
          </div>
        </div>

        <div className={cn(
          'p-4 rounded-lg border',
          test.winner === 'b' ? 'border-success bg-success/5' : 'border-border'
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-text-primary">Variant B</span>
            {test.winner === 'b' && <span className="text-success text-xs">Winner</span>}
          </div>
          <p className="text-sm text-text-muted mb-2">{test.variant_b.name}</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-text-primary">{convRateB.toFixed(1)}%</span>
            <span className="text-sm text-text-muted">{test.variant_b.conversions}/{test.variant_b.sent}</span>
          </div>
        </div>
      </div>

      {test.confidence && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Statistical Confidence</span>
            <span className={cn(
              'font-medium',
              test.confidence >= 95 ? 'text-success' : test.confidence >= 80 ? 'text-warning' : 'text-text-secondary'
            )}>
              {test.confidence}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Component
export function NurtureCampaignManager() {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [filter, setFilter] = useState<CampaignGoal | 'all'>('all');

  const filteredCampaigns = filter === 'all'
    ? sampleCampaigns
    : sampleCampaigns.filter(c => c.goal === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Nurture Campaigns</h2>
          <p className="text-sm text-text-muted">Automated customer engagement sequences</p>
        </div>
        <button className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Campaign
        </button>
      </div>

      {/* Goal Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
            filter === 'all' ? 'bg-primary text-white' : 'bg-bg-hover text-text-secondary hover:text-text-primary'
          )}
        >
          All Campaigns
        </button>
        {(['onboarding', 'adoption', 'retention', 'expansion', 'reactivation', 'education'] as CampaignGoal[]).map((goal) => (
          <button
            key={goal}
            onClick={() => setFilter(goal)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors capitalize',
              filter === goal ? 'bg-primary text-white' : 'bg-bg-hover text-text-secondary hover:text-text-primary'
            )}
          >
            {goal}
          </button>
        ))}
      </div>

      {/* Campaign Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {filteredCampaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            onSelect={setSelectedCampaign}
          />
        ))}
      </div>

      {/* Selected Campaign Detail */}
      {selectedCampaign && (
        <div className="bg-bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">{selectedCampaign.name}</h3>
              <p className="text-sm text-text-muted">{selectedCampaign.description}</p>
            </div>
            <button
              onClick={() => setSelectedCampaign(null)}
              className="text-text-muted hover:text-text-primary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Workflow */}
            <div>
              <h4 className="font-medium text-text-secondary mb-4">Campaign Workflow</h4>
              {selectedCampaign.steps.length > 0 ? (
                <CampaignWorkflow steps={selectedCampaign.steps} />
              ) : (
                <p className="text-sm text-text-muted">No steps configured yet</p>
              )}
            </div>

            {/* A/B Test Results */}
            {selectedCampaign.ab_test && (
              <ABTestResults test={selectedCampaign.ab_test} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
