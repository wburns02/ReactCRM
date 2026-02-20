import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  useOptimizeRoute,
  type RouteOptimizeResponse,
} from "@/api/hooks/useRouteOptimization";
import { useWorkOrders } from "@/api/hooks/useWorkOrders";

/**
 * RouteOptimizationPanel
 *
 * A compact panel in the Schedule page that lets dispatchers optimize the
 * order of today's (or visible) jobs using a haversine nearest-neighbor
 * algorithm on the backend.
 *
 * - Visible when there are 2+ scheduled work orders
 * - Click "Optimize Route" → spinner → result banner
 * - Shows: X miles, ~Y minutes driving, reordered waypoints
 */
export function RouteOptimizationPanel() {
  const { data: workOrdersData } = useWorkOrders();
  const optimizeRoute = useOptimizeRoute();
  const [result, setResult] = useState<RouteOptimizeResponse | null>(null);
  const [showWaypoints, setShowWaypoints] = useState(false);

  // Get scheduled job IDs (any status except draft/canceled)
  const scheduledJobs = (workOrdersData?.items || []).filter(
    (wo) =>
      wo.status &&
      !["draft", "canceled"].includes(wo.status) &&
      wo.id,
  );

  const jobIds = scheduledJobs.map((wo) => wo.id);
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
          {canOptimize && (
            <span className="text-xs text-text-muted bg-bg-muted px-2 py-0.5 rounded-full">
              {jobIds.length} jobs
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
          Add 2 or more scheduled jobs to enable route optimization.
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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
