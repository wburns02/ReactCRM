import { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import {
  useOptimizeRoute,
  type RouteOptimizeResponse,
} from "@/api/hooks/useRouteOptimization";
import { useWorkOrders } from "@/api/hooks/useWorkOrders";
import { useScheduleStore } from "../store/scheduleStore";
import {
  formatDateKey,
  getWeekDays,
  getWorkOrderRegion,
} from "@/api/types/schedule";

/**
 * RouteOptimizationPanel
 *
 * Optimizes routes using haversine nearest-neighbor for the currently
 * visible week/day jobs, respecting region and technician filters.
 */
export function RouteOptimizationPanel() {
  const { currentDate, currentView, filters } = useScheduleStore();
  const optimizeRoute = useOptimizeRoute();
  const [result, setResult] = useState<RouteOptimizeResponse | null>(null);
  const [showWaypoints, setShowWaypoints] = useState(false);

  // Calculate date range based on current view
  const dateRange = useMemo(() => {
    if (currentView === "day") {
      const dateStr = formatDateKey(currentDate);
      return { from: dateStr, to: dateStr };
    }
    const weekDays = getWeekDays(currentDate);
    return {
      from: formatDateKey(weekDays[0]),
      to: formatDateKey(weekDays[6]),
    };
  }, [currentDate, currentView]);

  // Fetch work orders for the visible date range
  const { data: workOrdersData } = useWorkOrders({
    page: 1,
    page_size: 200,
    scheduled_date_from: dateRange.from,
    scheduled_date_to: dateRange.to,
  });

  // Filter jobs by region, technician, and status (same logic as views)
  const filteredJobs = useMemo(() => {
    return (workOrdersData?.items || []).filter((wo) => {
      if (!wo.id || !wo.status) return false;
      if (["draft", "canceled"].includes(wo.status)) return false;

      // Apply technician filter
      if (filters.technician && wo.assigned_technician !== filters.technician)
        return false;

      // Apply status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(wo.status))
        return false;

      // Apply region filter
      if (filters.region) {
        const woRegion = getWorkOrderRegion(wo);
        if (woRegion !== filters.region) return false;
      }

      return true;
    });
  }, [workOrdersData, filters]);

  const jobIds = filteredJobs.map((wo) => wo.id);
  const canOptimize = jobIds.length >= 2;

  const handleOptimize = async () => {
    if (!canOptimize) return;
    setResult(null);

    try {
      const res = await optimizeRoute.mutateAsync({
        job_ids: jobIds,
        start_address: "105 S Comanche St, San Marcos, TX 78666",
      });
      setResult(res);
    } catch (err) {
      console.error("Route optimization failed:", err);
    }
  };

  const handleReset = () => {
    setResult(null);
    setShowWaypoints(false);
    optimizeRoute.reset();
  };

  // Fuel savings estimate (avg 10 mpg for service truck, $3.50/gal)
  const fuelCost = result
    ? ((result.total_distance_miles / 10) * 3.5).toFixed(2)
    : null;

  return (
    <div
      className="bg-bg-card border border-border rounded-lg p-4 mb-6"
      data-testid="route-optimization-panel"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-text-primary">
            Route Optimization
          </span>
          {filteredJobs.length > 0 && (
            <span className="text-xs text-text-muted bg-bg-muted px-2 py-0.5 rounded-full">
              {filteredJobs.length} jobs
            </span>
          )}
          {filters.region && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {filters.region.replace(/_/g, " ")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {result && (
            <button
              onClick={handleReset}
              className="text-xs text-text-muted hover:text-text-primary"
            >
              Reset
            </button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={handleOptimize}
            disabled={!canOptimize || optimizeRoute.isPending}
            data-testid="optimize-route-button"
            className="flex items-center gap-1.5"
          >
            {optimizeRoute.isPending ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Optimizing...
              </>
            ) : (
              <>Optimize Route</>
            )}
          </Button>
        </div>
      </div>

      {!canOptimize && (
        <p className="text-xs text-text-muted mt-2">
          {filteredJobs.length === 0
            ? "No scheduled jobs for the current view/filters."
            : "Add 2 or more scheduled jobs to enable route optimization."}
        </p>
      )}

      {optimizeRoute.isError && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          Route optimization failed. Please try again.
        </div>
      )}

      {result && (
        <div
          className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg"
          data-testid="route-optimization-result"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm font-medium text-green-800">
                Route optimized
              </span>
              <span
                className="text-sm text-green-700"
                data-testid="route-total-distance"
              >
                {result.total_distance_miles.toFixed(1)} miles
              </span>
              <span
                className="text-sm text-green-700"
                data-testid="route-drive-minutes"
              >
                ~{result.estimated_drive_minutes} min driving
              </span>
              <span className="text-sm text-green-600">
                {result.ordered_job_ids.length} stops
              </span>
              {fuelCost && (
                <span className="text-sm text-green-600" data-testid="route-fuel-cost">
                  ~${fuelCost} fuel
                </span>
              )}
            </div>
            <button
              onClick={() => setShowWaypoints(!showWaypoints)}
              className="text-xs text-green-600 hover:text-green-800 underline"
              data-testid="toggle-waypoints"
            >
              {showWaypoints ? "Hide waypoints" : "Show waypoints"}
            </button>
          </div>

          {showWaypoints && result.waypoints.length > 0 && (
            <div
              className="mt-3 space-y-1.5"
              data-testid="waypoints-list"
            >
              {result.waypoints.map((wp, i) => (
                <div
                  key={wp.job_id}
                  className="flex items-center gap-3 text-sm"
                >
                  <span className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-green-800 truncate">
                    {wp.address || wp.job_id}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
