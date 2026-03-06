import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { useTechnicians } from "@/api/hooks/useTechnicians.ts";
import { useScheduleAhead } from "@/api/hooks/useRouteOptimization.ts";
import { useScheduleStore } from "../store/scheduleStore.ts";
import {
  formatWeekRange,
  REGIONS,
  type Region,
} from "@/api/types/schedule.ts";
import {
  WORK_ORDER_STATUS_LABELS,
  type WorkOrderStatus,
} from "@/api/types/workOrder.ts";

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
            ? "bg-primary text-white"
            : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
        }
      `}
      title={`${label} (${shortcut})`}
    >
      {label}
    </button>
  );
}

/** Job type filter pill */
function JobTypeTab({
  label,
  color,
  isActive,
  onClick,
}: {
  label: string;
  color: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1 text-xs font-medium rounded-full border transition-colors
        ${isActive
          ? `${color} text-white border-transparent`
          : `bg-transparent border-current ${color.replace("bg-", "text-")} hover:opacity-80`
        }
      `}
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
    setRegionFilter,
    setJobTypeFilter,
    toggleUnscheduledPanel,
    unscheduledPanelOpen,
  } = useScheduleStore();

  const queryClient = useQueryClient();
  const scheduleAhead = useScheduleAhead();
  const [scheduleAheadResult, setScheduleAheadResult] = useState<{
    created_count: number;
    contracts_processed: number;
    skipped_existing: number;
  } | null>(null);

  // Fetch technicians for filter dropdown
  const { data: techniciansData } = useTechnicians({
    page: 1,
    page_size: 100,
    active_only: true,
  });
  const technicians = techniciansData?.items || [];

  // Region entries from config
  const regionEntries = Object.entries(REGIONS) as [Region, (typeof REGIONS)[Region]][];

  // Navigation based on current view
  const handlePrevious = () => {
    if (currentView === "day") {
      goToPreviousDay();
    } else {
      goToPreviousWeek();
    }
  };

  const handleNext = () => {
    if (currentView === "day") {
      goToNextDay();
    } else {
      goToNextWeek();
    }
  };

  // Format date display based on view
  const getDateDisplay = () => {
    if (currentView === "day") {
      return currentDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    return formatWeekRange(currentDate);
  };

  // Status options for filter
  const statusOptions: WorkOrderStatus[] = [
    "draft",
    "scheduled",
    "confirmed",
    "enroute",
    "on_site",
    "in_progress",
    "completed",
  ];

  return (
    <div className="bg-bg-card border border-border rounded-lg p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-bg-muted p-1 rounded-lg">
          <ViewTab
            label="Week"
            shortcut="W"
            isActive={currentView === "week"}
            onClick={() => setView("week")}
          />
          <ViewTab
            label="Day"
            shortcut="D"
            isActive={currentView === "day"}
            onClick={() => setView("day")}
          />
          <ViewTab
            label="Timeline"
            shortcut="L"
            isActive={currentView === "timeline"}
            onClick={() => setView("timeline")}
          />
          <ViewTab
            label="Tech"
            shortcut="T"
            isActive={currentView === "tech"}
            onClick={() => setView("tech")}
          />
          <ViewTab
            label="Map"
            shortcut="M"
            isActive={currentView === "map"}
            onClick={() => setView("map")}
          />
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handlePrevious}>
            ← {currentView === "day" ? "Prev" : "Previous"}
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
          <h2 className="font-semibold text-text-primary">
            {getDateDisplay()}
          </h2>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          {/* Region Filter */}
          <Select
            value={filters.region || ""}
            onChange={(e) => setRegionFilter(e.target.value || null)}
            className="w-40 text-sm"
          >
            <option value="">All Regions</option>
            {regionEntries.map(([key, config]) => (
              <option key={key} value={key}>
                {config.name}
              </option>
            ))}
          </Select>

          {/* Technician Filter */}
          <Select
            value={filters.technician || ""}
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
            value={filters.statuses[0] || ""}
            onChange={(e) =>
              setStatusFilter(e.target.value ? [e.target.value] : [])
            }
            className="w-36 text-sm"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {WORK_ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>

          {/* Schedule Ahead */}
          <Button
            variant="secondary"
            size="sm"
            disabled={scheduleAhead.isPending}
            data-testid="schedule-ahead-button"
            onClick={async () => {
              try {
                const res = await scheduleAhead.mutateAsync({ months_ahead: 12 });
                setScheduleAheadResult(res);
                queryClient.invalidateQueries({ queryKey: ["workOrders"] });
              } catch {
                // error handled by mutation state
              }
            }}
          >
            {scheduleAhead.isPending ? "Generating..." : "Schedule Ahead"}
          </Button>

          {/* Unscheduled Toggle */}
          <Button
            variant={unscheduledPanelOpen ? "primary" : "secondary"}
            size="sm"
            onClick={toggleUnscheduledPanel}
            className="hidden lg:flex"
          >
            Panel
          </Button>
        </div>
      </div>

      {/* Job Type Filter Tabs - Color-coded */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
        <span className="text-xs text-text-muted font-medium mr-1">Type:</span>
        <JobTypeTab
          label="All Jobs"
          color="bg-gray-600"
          isActive={!filters.jobType}
          onClick={() => setJobTypeFilter(null)}
        />
        <JobTypeTab
          label="Pumping"
          color="bg-blue-600"
          isActive={filters.jobType === "pumping"}
          onClick={() => setJobTypeFilter(filters.jobType === "pumping" ? null : "pumping")}
        />
        <JobTypeTab
          label="Maintenance"
          color="bg-green-600"
          isActive={filters.jobType === "maintenance"}
          onClick={() => setJobTypeFilter(filters.jobType === "maintenance" ? null : "maintenance")}
        />
        <JobTypeTab
          label="Inspection"
          color="bg-emerald-600"
          isActive={filters.jobType === "inspection"}
          onClick={() => setJobTypeFilter(filters.jobType === "inspection" ? null : "inspection")}
        />
        <JobTypeTab
          label="Repair"
          color="bg-red-600"
          isActive={filters.jobType === "repair"}
          onClick={() => setJobTypeFilter(filters.jobType === "repair" ? null : "repair")}
        />
        <JobTypeTab
          label="Emergency"
          color="bg-orange-600"
          isActive={filters.jobType === "emergency"}
          onClick={() => setJobTypeFilter(filters.jobType === "emergency" ? null : "emergency")}
        />
        <JobTypeTab
          label="Real Estate"
          color="bg-purple-600"
          isActive={filters.jobType === "real_estate_inspection"}
          onClick={() => setJobTypeFilter(filters.jobType === "real_estate_inspection" ? null : "real_estate_inspection")}
        />
      </div>

      {/* Schedule Ahead Result */}
      {scheduleAheadResult && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-green-800">
            Created {scheduleAheadResult.created_count} inspections from{" "}
            {scheduleAheadResult.contracts_processed} contracts
            {scheduleAheadResult.skipped_existing > 0 &&
              ` (${scheduleAheadResult.skipped_existing} skipped — already scheduled)`}
          </span>
          <button
            onClick={() => setScheduleAheadResult(null)}
            className="text-xs text-green-600 hover:text-green-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}
      {scheduleAhead.isError && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Failed to generate schedule. Please try again.
        </div>
      )}
    </div>
  );
}
