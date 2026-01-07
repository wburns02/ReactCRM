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
import { ExecutiveDashboard } from './components/ExecutiveDashboard.tsx';
import { SurveySystem } from './components/SurveySystem.tsx';
import { NurtureCampaignManager } from './components/NurtureCampaignManager.tsx';
import { EscalationManagement } from './components/EscalationManagement.tsx';
import { CollaborationHub } from './components/CollaborationHub.tsx';
import {
  useCSDashboardOverview,
  useAtRiskCustomers,
  useCSTasks,
  useSegments,
  useJourneys,
  usePlaybooks,
  useSeedJourneySteps,
} from '@/api/hooks/useCustomerSuccess.ts';
import { PlaybookDetailModal } from './components/PlaybookDetailModal.tsx';
import { TriggerPlaybookModal } from './components/TriggerPlaybookModal.tsx';
import { JourneyDetailModal } from './components/JourneyDetailModal.tsx';
import { SegmentDetailModal } from './components/SegmentDetailModal.tsx';
import type { Playbook, Journey, Segment } from '@/api/types/customerSuccess.ts';

type TabId = 'executive' | 'overview' | 'surveys' | 'campaigns' | 'escalations' | 'segments' | 'journeys' | 'playbooks' | 'collaboration';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: 'executive',
    label: 'Executive',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
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
    id: 'surveys',
    label: 'Surveys',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'escalations',
    label: 'Escalations',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
  {
    id: 'collaboration',
    label: 'Team Hub',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
            customers={(atRiskData?.items || []).map((item: { customer_id: number; overall_score: number; health_status: string; churn_probability?: number; score_trend?: string }) => ({
              id: item.customer_id,
              customer_id: item.customer_id,
              customer_name: `Customer #${item.customer_id}`,
              overall_score: item.overall_score,
              status: item.health_status as 'healthy' | 'at_risk' | 'critical' | 'churned',
              trend: item.score_trend as 'improving' | 'stable' | 'declining' | null,
              risk_factors: [],
              churn_probability: item.churn_probability,
            }))}
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
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);

  const handleSelectSegment = (segment: Segment) => {
    setSelectedSegment(segment);
  };

  const handleCloseModal = () => {
    setSelectedSegment(null);
  };

  const handleEditSegment = (segment: Segment) => {
    alert(`Edit segment: ${segment.name}\n\nSegment editing is coming soon!`);
  };

  const handleCreateSegment = () => {
    alert('Create new segment\n\nSegment creation is coming soon!');
  };

  const handleViewMembers = (segment: Segment) => {
    alert(`View members of "${segment.name}"\n\n${segment.customer_count || 0} customers in this segment.\n\nMember list view is coming soon!`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <SegmentList
        segments={segmentsData?.items || []}
        selectedSegmentId={selectedSegment?.id}
        onSelectSegment={handleSelectSegment}
        onCreateSegment={handleCreateSegment}
        onEditSegment={handleEditSegment}
      />

      {/* Segment Detail Modal */}
      {selectedSegment && (
        <SegmentDetailModal
          segment={selectedSegment}
          isOpen={true}
          onClose={handleCloseModal}
          onEdit={handleEditSegment}
          onViewMembers={handleViewMembers}
        />
      )}
    </>
  );
}

function JourneysTab() {
  const { data: journeysData, isLoading, refetch } = useJourneys();
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
  const seedMutation = useSeedJourneySteps();

  const handleSelectJourney = (journey: Journey) => {
    setSelectedJourney(journey);
  };

  const handleCloseModal = () => {
    setSelectedJourney(null);
  };

  const handleEditJourney = (journey: Journey) => {
    alert(`Edit journey: ${journey.name}\n\nJourney editing is coming soon!`);
  };

  const handleCreateJourney = () => {
    alert('Create new journey\n\nJourney creation is coming soon!');
  };

  const handleToggleActive = (journey: Journey) => {
    const newStatus = journey.status === 'active' ? 'paused' : 'active';
    alert(`${newStatus === 'active' ? 'Activating' : 'Pausing'} journey: ${journey.name}\n\nThis action would ${newStatus === 'active' ? 'start' : 'pause'} the journey and ${newStatus === 'active' ? 'allow new enrollments' : 'stop processing for enrolled customers'}.\n\nJourney status toggling is coming soon!`);
    // Close modal after action feedback
    setSelectedJourney(null);
  };

  const handleSeedSteps = async () => {
    try {
      const result = await seedMutation.mutateAsync();
      if (result.journeys.length === 0) {
        alert('All journeys already have steps!');
      } else {
        const details = result.journeys.map(j => `• ${j.journey_name}: ${j.steps_added} steps`).join('\n');
        alert(`Successfully seeded journey steps!\n\n${details}`);
      }
      refetch();
    } catch (error) {
      alert(`Failed to seed journey steps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Check if any journeys are empty (no steps)
  const hasEmptyJourneys = journeysData?.items?.some(j => !j.steps || j.steps.length === 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Seed Steps Button - show if there are empty journeys */}
      {hasEmptyJourneys && (
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Some journeys have no steps configured
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                Click the button to populate journeys with comprehensive best-practice steps
              </p>
            </div>
            <button
              onClick={handleSeedSteps}
              disabled={seedMutation.isPending}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {seedMutation.isPending ? 'Seeding...' : 'Seed Journey Steps'}
            </button>
          </div>
        </div>
      )}

      <JourneyList
        journeys={journeysData?.items || []}
        selectedJourneyId={selectedJourney?.id}
        onSelectJourney={handleSelectJourney}
        onCreateJourney={handleCreateJourney}
        onEditJourney={handleEditJourney}
        onToggleActive={handleToggleActive}
      />

      {/* Journey Detail Modal */}
      {selectedJourney && (
        <JourneyDetailModal
          journey={selectedJourney}
          isOpen={true}
          onClose={handleCloseModal}
          onToggleActive={handleToggleActive}
          onEdit={handleEditJourney}
        />
      )}
    </>
  );
}

function PlaybooksTab() {
  const { data: playbooksData, isLoading } = usePlaybooks();
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
  const [playbookToTrigger, setPlaybookToTrigger] = useState<Playbook | null>(null);

  const handleSelectPlaybook = (playbook: Playbook) => {
    setSelectedPlaybook(playbook);
  };

  const handleCloseModal = () => {
    setSelectedPlaybook(null);
  };

  const handleTriggerPlaybook = (playbook: Playbook) => {
    setPlaybookToTrigger(playbook);
    // Close detail modal if open
    setSelectedPlaybook(null);
  };

  const handleCloseTriggerModal = () => {
    setPlaybookToTrigger(null);
  };

  const handleEditPlaybook = (playbook: Playbook) => {
    // For now, show alert - full edit form would be a larger feature
    alert(`Edit playbook: ${playbook.name}\n\nPlaybook editing is coming soon!`);
  };

  const handleCreatePlaybook = () => {
    // For now, show alert - full create form would be a larger feature
    alert('Create new playbook\n\nPlaybook creation is coming soon!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <PlaybookList
        playbooks={playbooksData?.items || []}
        selectedPlaybookId={selectedPlaybook?.id}
        onSelectPlaybook={handleSelectPlaybook}
        onCreatePlaybook={handleCreatePlaybook}
        onEditPlaybook={handleEditPlaybook}
        onTriggerPlaybook={handleTriggerPlaybook}
      />

      {/* Playbook Detail Modal */}
      {selectedPlaybook && (
        <PlaybookDetailModal
          playbook={selectedPlaybook}
          isOpen={true}
          onClose={handleCloseModal}
          onTrigger={handleTriggerPlaybook}
          onEdit={handleEditPlaybook}
        />
      )}

      {/* Trigger Playbook Modal with Customer Selection */}
      {playbookToTrigger && (
        <TriggerPlaybookModal
          playbook={playbookToTrigger}
          isOpen={true}
          onClose={handleCloseTriggerModal}
          onSuccess={handleCloseTriggerModal}
        />
      )}
    </>
  );
}

export function CustomerSuccessPage() {
  const [activeTab, setActiveTab] = useState<TabId>('executive');

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
        {activeTab === 'executive' && <ExecutiveDashboard />}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'surveys' && <SurveySystem />}
        {activeTab === 'campaigns' && <NurtureCampaignManager />}
        {activeTab === 'escalations' && <EscalationManagement />}
        {activeTab === 'segments' && <SegmentsTab />}
        {activeTab === 'journeys' && <JourneysTab />}
        {activeTab === 'playbooks' && <PlaybooksTab />}
        {activeTab === 'collaboration' && <CollaborationHub />}
      </div>
    </div>
  );
}
