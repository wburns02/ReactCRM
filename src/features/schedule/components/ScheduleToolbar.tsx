import { Button } from '@/components/ui/Button.tsx';
import { Select } from '@/components/ui/Select.tsx';
import { useTechnicians } from '@/api/hooks/useTechnicians.ts';
import { useScheduleStore } from '../store/scheduleStore.ts';
import { formatWeekRange } from '@/api/types/schedule.ts';
import { WORK_ORDER_STATUS_LABELS, type WorkOrderStatus } from '@/api/types/workOrder.ts';

/**
 * View tab button
 */
function ViewTab({
  label,
  shortcut,
  isActive,
  onClick,
}: {
  label: string;
  shortcut: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 text-sm font-medium rounded-md transition-colors
        ${
          isActive
            ? 'bg-primary text-white'
            : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
        }
      `}
      title={`${label} (${shortcut})`}
    >
      {label}
    </button>
  );
}

/**
 * Schedule Toolbar - Controls for view switching, navigation, and filtering
 */
export function ScheduleToolbar() {
  const {
    currentView,
    setView,
    currentDate,
    goToToday,
    goToPreviousWeek,
    goToNextWeek,
    goToPreviousDay,
    goToNextDay,
    filters,
    setTechnicianFilter,
    setStatusFilter,
    toggleUnscheduledPanel,
    unscheduledPanelOpen,
  } = useScheduleStore();

  // Fetch technicians for filter dropdown
  const { data: techniciansData } = useTechnicians({ page: 1, page_size: 100, active_only: true });
  const technicians = techniciansData?.items || [];

  // Navigation based on current view
  const handlePrevious = () => {
    if (currentView === 'day') {
      goToPreviousDay();
    } else {
      goToPreviousWeek();
    }
  };

  const handleNext = () => {
    if (currentView === 'day') {
      goToNextDay();
    } else {
      goToNextWeek();
    }
  };

  // Format date display based on view
  const getDateDisplay = () => {
    if (currentView === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return formatWeekRange(currentDate);
  };

  // Status options for multi-select (simplified for now)
  const statusOptions: WorkOrderStatus[] = [
    'draft',
    'scheduled',
    'confirmed',
    'enroute',
    'on_site',
    'in_progress',
    'completed',
  ];

  return (
    <div className="bg-bg-card border border-border rounded-lg p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-bg-muted p-1 rounded-lg">
          <ViewTab
            label="Week"
            shortcut="W"
            isActive={currentView === 'week'}
            onClick={() => setView('week')}
          />
          <ViewTab
            label="Day"
            shortcut="D"
            isActive={currentView === 'day'}
            onClick={() => setView('day')}
          />
          <ViewTab
            label="Tech"
            shortcut="T"
            isActive={currentView === 'tech'}
            onClick={() => setView('tech')}
          />
          <ViewTab
            label="Map"
            shortcut="M"
            isActive={currentView === 'map'}
            onClick={() => setView('map')}
          />
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handlePrevious}>
            ← {currentView === 'day' ? 'Prev' : 'Previous'}
          </Button>
          <Button variant="ghost" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={handleNext}>
            Next →
          </Button>
        </div>

        {/* Current Date Display */}
        <div className="text-center min-w-[240px]">
          <h2 className="font-semibold text-text-primary">{getDateDisplay()}</h2>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          {/* Technician Filter */}
          <Select
            value={filters.technician || ''}
            onChange={(e) => setTechnicianFilter(e.target.value || null)}
            className="w-40 text-sm"
          >
            <option value="">All Technicians</option>
            {technicians.map((t) => (
              <option key={t.id} value={`${t.first_name} ${t.last_name}`}>
                {t.first_name} {t.last_name}
              </option>
            ))}
          </Select>

          {/* Status Filter */}
          <Select
            value={filters.statuses[0] || ''}
            onChange={(e) => setStatusFilter(e.target.value ? [e.target.value] : [])}
            className="w-36 text-sm"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {WORK_ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>

          {/* Unscheduled Toggle */}
          <Button
            variant={unscheduledPanelOpen ? 'primary' : 'secondary'}
            size="sm"
            onClick={toggleUnscheduledPanel}
          >
            Unscheduled
          </Button>
        </div>
      </div>
    </div>
  );
}
