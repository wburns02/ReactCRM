import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button.tsx';
import { useScheduleStore } from './store/scheduleStore.ts';
import { ScheduleDndContext } from './components/ScheduleDndContext.tsx';
import { ScheduleToolbar } from './components/ScheduleToolbar.tsx';
import { ScheduleStats } from './components/ScheduleStats.tsx';
import { WeekView } from './components/WeekView.tsx';
import { DayView } from './components/DayView.tsx';
import { TechView } from './components/TechView.tsx';
import { MapView } from './components/MapView.tsx';
import { ResourceTimeline } from './components/ResourceTimeline.tsx';
import { UnscheduledPanel } from './components/UnscheduledPanel.tsx';
import { UnscheduledOrdersTable } from './components/UnscheduledOrdersTable.tsx';
import { AIDispatchAssistant } from '@/features/ai-dispatch';

/**
 * Schedule Page - Main scheduling interface
 *
 * Features:
 * - Multiple views: Week, Day, Timeline, Tech, Map
 * - Unscheduled orders table at top with drag-drop
 * - Resource timeline with technicians as rows
 * - Technician, status, and region filtering
 * - Statistics dashboard with revenue, rating, utilization
 * - Route optimization placeholder
 */
export function SchedulePage() {
  const { currentView } = useScheduleStore();

  // Render the active view
  const renderView = () => {
    switch (currentView) {
      case 'week':
        return <WeekView />;
      case 'day':
        return <DayView />;
      case 'timeline':
        return <ResourceTimeline />;
      case 'tech':
        return <TechView />;
      case 'map':
        return <MapView />;
      default:
        return <WeekView />;
    }
  };

  return (
    <ScheduleDndContext>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Schedule</h1>
            <p className="text-sm text-text-secondary mt-1">
              View and manage work order appointments
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/work-orders/new">
              <Button variant="primary">+ New Work Order</Button>
            </Link>
            <Link to="/work-orders">
              <Button variant="secondary">View All</Button>
            </Link>
          </div>
        </div>

        {/* Unscheduled Work Orders Table - Top Section */}
        <UnscheduledOrdersTable />

        {/* Statistics Dashboard */}
        <ScheduleStats />

        {/* Toolbar with view tabs, navigation, and filters */}
        <ScheduleToolbar />

        {/* Active View */}
        {renderView()}

        {/* Legend (only for week/day/timeline views) */}
        {(currentView === 'week' || currentView === 'day' || currentView === 'timeline') && (
          <div className="mt-6 bg-bg-card border border-border rounded-lg p-4">
            <div className="flex flex-wrap items-center gap-6 text-xs">
              <span className="text-text-secondary font-medium">Priority:</span>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 border-l-4 border-l-red-500" />
                <span className="text-text-secondary">Emergency</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 border-l-4 border-l-orange-500" />
                <span className="text-text-secondary">Urgent</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 border-l-4 border-l-yellow-500" />
                <span className="text-text-secondary">High</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 border-l-4 border-l-blue-500" />
                <span className="text-text-secondary">Normal/Low</span>
              </div>
              <span className="text-text-secondary ml-4 font-medium">Drag:</span>
              <span className="text-text-secondary">
                Drag jobs from the table above onto the calendar
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Unscheduled Panel (slide-out) */}
      <UnscheduledPanel />

      {/* AI Dispatch Assistant - Floating button */}
      <AIDispatchAssistant />
    </ScheduleDndContext>
  );
}
