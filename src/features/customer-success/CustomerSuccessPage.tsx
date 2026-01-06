/**
 * Customer Success Page
 *
 * Main dashboard for the Customer Success Platform.
 * Provides overview of health scores, at-risk customers, tasks, and activities.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils.ts';
import { CustomerHealthOverview } from './components/CustomerHealthOverview.tsx';
import { AtRiskTable } from './components/AtRiskTable.tsx';
import { TaskList } from './components/TaskList.tsx';
import { TouchpointTimeline } from './components/TouchpointTimeline.tsx';
import { SegmentList } from './components/SegmentList.tsx';
import { JourneyList } from './components/JourneyList.tsx';
import { PlaybookList } from './components/PlaybookList.tsx';
import {
  useCSDashboardOverview,
  useAtRiskCustomers,
  useCSTasks,
  useSegments,
  useJourneys,
  usePlaybooks,
} from '@/api/hooks/useCustomerSuccess.ts';

type TabId = 'overview' | 'segments' | 'journeys' | 'playbooks';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'segments',
    label: 'Segments',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: 'journeys',
    label: 'Journeys',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    id: 'playbooks',
    label: 'Playbooks',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
];

function OverviewTab() {
  const { data: dashboardData, isLoading: dashboardLoading } = useCSDashboardOverview();
  const { data: atRiskData } = useAtRiskCustomers({ limit: 10 });
  const { data: tasksData } = useCSTasks({ status: 'pending' });

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Default values if no data
  const distribution = dashboardData?.health_distribution || { healthy: 0, at_risk: 0, critical: 0, churned: 0 };
  const totalCustomers = Object.values(distribution).reduce((sum, val) => sum + val, 0);
  const averageScore = dashboardData?.avg_health_score || 0;

  return (
    <div className="space-y-6">
      {/* Health Overview */}
      <CustomerHealthOverview
        distribution={distribution}
        totalCustomers={totalCustomers}
        averageScore={Math.round(averageScore)}
        scoreChange={undefined}
      />

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* At-Risk Customers */}
        <div className="lg:col-span-2">
          <AtRiskTable
            customers={atRiskData?.items || []}
            onSelectCustomer={(customer) => {
              console.log('Selected customer:', customer);
            }}
            onTriggerPlaybook={(customer) => {
              console.log('Trigger playbook for:', customer);
            }}
            onCreateTask={(customer) => {
              console.log('Create task for:', customer);
            }}
          />
        </div>

        {/* Tasks */}
        <div className="bg-bg-secondary rounded-lg border border-border p-4">
          <TaskList
            tasks={tasksData?.items || []}
            showCustomerName={true}
            onCompleteTask={(task) => {
              console.log('Complete task:', task);
            }}
          />
        </div>

        {/* Recent Activity */}
        <div className="bg-bg-secondary rounded-lg border border-border p-4">
          <TouchpointTimeline
            touchpoints={[]}
            maxItems={5}
          />
        </div>
      </div>

      {/* Quick Stats */}
      {dashboardData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-bg-secondary rounded-lg border border-border p-4">
            <p className="text-sm text-text-muted mb-1">Active Playbooks</p>
            <p className="text-2xl font-bold text-text-primary">
              {dashboardData.active_playbook_executions || 0}
            </p>
          </div>
          <div className="bg-bg-secondary rounded-lg border border-border p-4">
            <p className="text-sm text-text-muted mb-1">Active Journeys</p>
            <p className="text-2xl font-bold text-text-primary">
              {dashboardData.active_journey_enrollments || 0}
            </p>
          </div>
          <div className="bg-bg-secondary rounded-lg border border-border p-4">
            <p className="text-sm text-text-muted mb-1">Open Tasks</p>
            <p className="text-2xl font-bold text-text-primary">
              {dashboardData.open_tasks || 0}
            </p>
          </div>
          <div className="bg-bg-secondary rounded-lg border border-border p-4">
            <p className="text-sm text-text-muted mb-1">Overdue Tasks</p>
            <p className={cn(
              'text-2xl font-bold',
              (dashboardData.overdue_tasks || 0) > 0 ? 'text-danger' : 'text-success'
            )}>
              {dashboardData.overdue_tasks || 0}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SegmentsTab() {
  const { data: segmentsData, isLoading } = useSegments();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <SegmentList
      segments={segmentsData?.items || []}
      onSelectSegment={(segment) => {
        console.log('Selected segment:', segment);
      }}
      onCreateSegment={() => {
        console.log('Create segment');
      }}
      onEditSegment={(segment) => {
        console.log('Edit segment:', segment);
      }}
    />
  );
}

function JourneysTab() {
  const { data: journeysData, isLoading } = useJourneys();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <JourneyList
      journeys={journeysData?.items || []}
      onSelectJourney={(journey) => {
        console.log('Selected journey:', journey);
      }}
      onCreateJourney={() => {
        console.log('Create journey');
      }}
      onEditJourney={(journey) => {
        console.log('Edit journey:', journey);
      }}
      onToggleActive={(journey) => {
        console.log('Toggle journey:', journey);
      }}
    />
  );
}

function PlaybooksTab() {
  const { data: playbooksData, isLoading } = usePlaybooks();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <PlaybookList
      playbooks={playbooksData?.items || []}
      onSelectPlaybook={(playbook) => {
        console.log('Selected playbook:', playbook);
      }}
      onCreatePlaybook={() => {
        console.log('Create playbook');
      }}
      onEditPlaybook={(playbook) => {
        console.log('Edit playbook:', playbook);
      }}
      onTriggerPlaybook={(playbook) => {
        console.log('Trigger playbook:', playbook);
      }}
    />
  );
}

export function CustomerSuccessPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-bg-secondary border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-text-primary">Customer Success</h1>
            <p className="text-sm text-text-muted mt-1">
              Monitor customer health, manage playbooks, and drive success outcomes
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'segments' && <SegmentsTab />}
        {activeTab === 'journeys' && <JourneysTab />}
        {activeTab === 'playbooks' && <PlaybooksTab />}
      </div>
    </div>
  );
}
