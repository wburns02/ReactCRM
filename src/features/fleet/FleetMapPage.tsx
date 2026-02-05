import { FleetMap } from "./components/FleetMap.tsx";
import { FleetSidebar } from "./components/FleetSidebar.tsx";
import { useFleetLocations } from "./api.ts";
import { useFleetSSE } from "./hooks/useFleetSSE.ts";
import {
  useFleetStore,
  useVehicleStatusCounts,
} from "./stores/fleetStore.ts";
import { VEHICLE_STATUS_COLORS } from "./types.ts";

/**
 * Full-page fleet tracking map with sidebar
 */
export function FleetMapPage() {
  // Initialize data fetching and SSE
  const { isLoading, error } = useFleetLocations();
  useFleetSSE();

  const counts = useVehicleStatusCounts();
  const sseConnected = useFleetStore((s) => s.sseConnected);
  const showTrails = useFleetStore((s) => s.showTrails);
  const toggleTrails = useFleetStore((s) => s.toggleTrails);
  const showLabels = useFleetStore((s) => s.showLabels);
  const toggleLabels = useFleetStore((s) => s.toggleLabels);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-muted">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary font-medium">
            Loading fleet locations...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-muted">
        <div className="text-center max-w-md">
          <p className="text-danger text-lg font-semibold mb-2">
            Failed to load fleet locations
          </p>
          <p className="text-sm text-text-muted">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top stats bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-900 border-b border-border">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-lg font-semibold text-text-primary leading-tight">
              Fleet Tracking
            </h1>
            <p className="text-xs text-text-muted">
              Real-time vehicle locations
            </p>
          </div>

          {/* Status summary chips */}
          <div className="hidden md:flex items-center gap-3">
            {(
              [
                ["Total", counts.total, "#6366f1"],
                ["Moving", counts.moving, VEHICLE_STATUS_COLORS.moving],
                ["Idling", counts.idling, VEHICLE_STATUS_COLORS.idling],
                ["Stopped", counts.stopped, VEHICLE_STATUS_COLORS.stopped],
                ["Offline", counts.offline, VEHICLE_STATUS_COLORS.offline],
              ] as const
            ).map(([label, count, color]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-bold" style={{ color }}>
                  {count}
                </span>
                <span className="text-xs text-text-muted">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showTrails}
              onChange={toggleTrails}
              className="rounded"
            />
            Trails
          </label>
          <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={toggleLabels}
              className="rounded"
            />
            Labels
          </label>

          {/* Connection indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-bg-hover text-xs">
            <div
              className={`w-2 h-2 rounded-full ${
                sseConnected
                  ? "bg-green-500 animate-pulse"
                  : "bg-yellow-500"
              }`}
            />
            <span className="text-text-muted">
              {sseConnected ? "Live" : "Polling"}
            </span>
          </div>
        </div>
      </div>

      {/* Main content: sidebar + map */}
      <div className="flex-1 flex min-h-0">
        <FleetSidebar />
        <div className="flex-1 min-w-0">
          <FleetMap height="100%" />
        </div>
      </div>
    </div>
  );
}
