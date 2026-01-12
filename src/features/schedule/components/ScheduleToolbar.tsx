import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button.tsx";
import { Select } from "@/components/ui/Select.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import { useTechnicians } from "@/api/hooks/useTechnicians.ts";
import { useWorkOrders } from "@/api/hooks/useWorkOrders.ts";
import {
  useOptimizeRoutes,
  useApplyOptimizedRoutes,
  type TechnicianRoute,
} from "@/api/hooks/useRouteOptimization.ts";
import { useScheduleStore } from "../store/scheduleStore.ts";
import { formatWeekRange } from "@/api/types/schedule.ts";
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
    toggleUnscheduledPanel,
    unscheduledPanelOpen,
  } = useScheduleStore();

  // State for optimize modal/action
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [optimizedRoutes, setOptimizedRoutes] = useState<
    TechnicianRoute[] | null
  >(null);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);

  // Route optimization mutations
  const optimizeRoutes = useOptimizeRoutes();
  const applyOptimizedRoutes = useApplyOptimizedRoutes();

  // Fetch technicians for filter dropdown
  const { data: techniciansData } = useTechnicians({
    page: 1,
    page_size: 100,
    active_only: true,
  });
  const technicians = techniciansData?.items || [];

  // Fetch work orders to get unique regions
  const { data: workOrdersData } = useWorkOrders();

  // Get unique regions from work orders
  const regions = useMemo(() => {
    const cities = new Set<string>();
    (workOrdersData?.items || []).forEach((wo) => {
      if (wo.service_city) cities.add(wo.service_city);
    });
    return Array.from(cities).sort();
  }, [workOrdersData?.items]);

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

  // Handle optimize action
  const handleOptimize = async () => {
    setIsOptimizing(true);
    setOptimizeError(null);

    try {
      // Format date as YYYY-MM-DD
      const dateStr = currentDate.toISOString().split("T")[0];

      // Get technician IDs from filter or all active technicians
      const technicianIds: number[] = filters.technician
        ? technicians
            .filter(
              (t) => `${t.first_name} ${t.last_name}` === filters.technician,
            )
            .map((t) => Number(t.id))
        : technicians.map((t) => Number(t.id));

      const result = await optimizeRoutes.mutateAsync({
        date: dateStr,
        technician_ids: technicianIds,
        optimize_for: "balanced",
        include_breaks: true,
      });

      if (result.success && result.routes.length > 0) {
        setOptimizedRoutes(result.routes);
        setShowOptimizeModal(true);
      } else {
        setOptimizeError(
          result.message || "No routes to optimize for this date",
        );
      }
    } catch (error) {
      console.error("Route optimization failed:", error);
      setOptimizeError(
        error instanceof Error ? error.message : "Failed to optimize routes",
      );
    } finally {
      setIsOptimizing(false);
    }
  };

  // Apply optimized routes
  const handleApplyRoutes = async () => {
    if (!optimizedRoutes) return;

    try {
      const result = await applyOptimizedRoutes.mutateAsync(optimizedRoutes);
      if (result.success) {
        setShowOptimizeModal(false);
        setOptimizedRoutes(null);
        // Refresh the page to show updated routes
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to apply routes:", error);
      setOptimizeError(
        error instanceof Error
          ? error.message
          : "Failed to apply optimized routes",
      );
    }
  };

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
            className="w-32 text-sm"
          >
            <option value="">All Regions</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
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

          {/* Optimize Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="flex items-center gap-1"
          >
            {isOptimizing ? (
              <>
                <span className="animate-spin">⚙️</span>
                Optimizing...
              </>
            ) : (
              <>🚀 Optimize</>
            )}
          </Button>

          {/* Unscheduled Toggle (keeping for legacy panel support) */}
          <Button
            variant={unscheduledPanelOpen ? "primary" : "secondary"}
            size="sm"
            onClick={toggleUnscheduledPanel}
            className="hidden lg:flex"
          >
            📋 Panel
          </Button>
        </div>
      </div>

      {/* Error display */}
      {optimizeError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>⚠️ {optimizeError}</span>
          <button
            onClick={() => setOptimizeError(null)}
            className="text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Route Optimization Results Modal */}
      <Dialog
        open={showOptimizeModal}
        onClose={() => setShowOptimizeModal(false)}
      >
        <DialogContent size="xl" className="max-h-[80vh] overflow-y-auto">
          <DialogHeader onClose={() => setShowOptimizeModal(false)}>
            Route Optimization Results
          </DialogHeader>

          {optimizedRoutes && (
            <DialogBody>
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-700">
                      {optimizedRoutes.reduce(
                        (sum, r) => sum + r.stops.length,
                        0,
                      )}
                    </div>
                    <div className="text-sm text-green-600">Work Orders</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-700">
                      {optimizedRoutes
                        .reduce((sum, r) => sum + r.total_distance_miles, 0)
                        .toFixed(1)}{" "}
                      mi
                    </div>
                    <div className="text-sm text-blue-600">Total Distance</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-700">
                      {Math.round(
                        optimizedRoutes.reduce(
                          (sum, r) => sum + r.total_driving_time_minutes,
                          0,
                        ),
                      )}{" "}
                      min
                    </div>
                    <div className="text-sm text-purple-600">Driving Time</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-700">
                      {Math.round(
                        optimizedRoutes.reduce(
                          (sum, r) => sum + r.route_efficiency_score,
                          0,
                        ) / optimizedRoutes.length,
                      )}
                      %
                    </div>
                    <div className="text-sm text-yellow-600">Efficiency</div>
                  </div>
                </div>

                {/* Routes per Technician */}
                <div className="space-y-4">
                  {optimizedRoutes.map((route) => (
                    <div
                      key={route.technician_id}
                      className="border border-border rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">
                          {route.technician_name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-text-secondary">
                          <span>📍 {route.stops.length} stops</span>
                          <span>
                            🚗 {route.total_distance_miles.toFixed(1)} mi
                          </span>
                          <span>⏱️ {route.total_driving_time_minutes} min</span>
                        </div>
                      </div>

                      {/* Stops List */}
                      <div className="space-y-2">
                        {route.stops.map((stop, index) => (
                          <div
                            key={stop.work_order_id}
                            className="flex items-center gap-3 p-2 bg-bg-muted rounded"
                          >
                            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {stop.customer_name}
                              </div>
                              <div className="text-xs text-text-secondary">
                                {stop.address}
                              </div>
                            </div>
                            <div className="text-xs text-text-muted">
                              {stop.arrival_time} - {stop.departure_time}
                            </div>
                            <div className="text-xs text-text-secondary">
                              {stop.driving_time_minutes} min drive
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DialogBody>
          )}

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowOptimizeModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleApplyRoutes}
              disabled={applyOptimizedRoutes.isPending}
            >
              {applyOptimizedRoutes.isPending
                ? "Applying..."
                : "Apply Optimized Routes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
