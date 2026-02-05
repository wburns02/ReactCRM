import { useFleetStore, useFilteredVehicles, useVehicleStatusCounts } from "../stores/fleetStore.ts";
import { VEHICLE_STATUS_COLORS, VEHICLE_STATUS_LABELS } from "../types.ts";
import type { VehicleStatus } from "../types.ts";
import { Badge } from "@/components/ui/Badge.tsx";

const STATUS_ORDER: VehicleStatus[] = ["moving", "idling", "stopped", "offline"];

/**
 * Fleet sidebar with search, filters, and vehicle list
 */
export function FleetSidebar() {
  const vehicles = useFilteredVehicles();
  const counts = useVehicleStatusCounts();
  const selectedVehicleId = useFleetStore((s) => s.selectedVehicleId);
  const selectVehicle = useFleetStore((s) => s.selectVehicle);
  const filters = useFleetStore((s) => s.filters);
  const setFilters = useFleetStore((s) => s.setFilters);
  const sseConnected = useFleetStore((s) => s.sseConnected);

  const formatTimeAgo = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const toggleStatusFilter = (status: VehicleStatus) => {
    const current = filters.status;
    if (current.includes(status)) {
      setFilters({ status: current.filter((s) => s !== status) });
    } else {
      setFilters({ status: [...current, status] });
    }
  };

  return (
    <div className="w-80 flex flex-col bg-white dark:bg-gray-900 border-r border-border overflow-hidden">
      {/* Header with connection status */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-text-primary">Vehicles</h2>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${
                sseConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"
              }`}
            />
            <span className="text-xs text-text-muted">
              {sseConnected ? "Live" : "Polling"}
            </span>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search vehicles..."
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-hover text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
        />

        {/* Status filter chips */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {STATUS_ORDER.map((status) => {
            const isActive =
              filters.status.length === 0 || filters.status.includes(status);
            const count = counts[status] || 0;
            return (
              <button
                key={status}
                onClick={() => toggleStatusFilter(status)}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? "ring-1 ring-offset-1"
                    : "opacity-50 hover:opacity-75"
                }`}
                style={{
                  backgroundColor: isActive
                    ? VEHICLE_STATUS_COLORS[status] + "20"
                    : undefined,
                  color: VEHICLE_STATUS_COLORS[status],
                  ...(isActive
                    ? { ringColor: VEHICLE_STATUS_COLORS[status] }
                    : {}),
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: VEHICLE_STATUS_COLORS[status] }}
                />
                {VEHICLE_STATUS_LABELS[status]}
                <span className="font-bold">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vehicle list */}
      <div className="flex-1 overflow-y-auto">
        {vehicles.length === 0 ? (
          <div className="p-6 text-center text-text-muted text-sm">
            No vehicles match filters
          </div>
        ) : (
          <div className="divide-y divide-border">
            {vehicles.map((vehicle) => {
              const isSelected = vehicle.id === selectedVehicleId;
              return (
                <button
                  key={vehicle.id}
                  onClick={() =>
                    selectVehicle(isSelected ? null : vehicle.id)
                  }
                  className={`w-full text-left px-4 py-3 transition-colors hover:bg-bg-hover ${
                    isSelected
                      ? "bg-primary/5 border-l-4 border-l-primary"
                      : "border-l-4 border-l-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-text-primary truncate">
                        {vehicle.name}
                      </p>
                      {vehicle.driver_name && (
                        <p className="text-xs text-text-secondary truncate">
                          {vehicle.driver_name}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={
                        vehicle.status === "moving"
                          ? "success"
                          : vehicle.status === "stopped"
                            ? "danger"
                            : vehicle.status === "idling"
                              ? "warning"
                              : "default"
                      }
                    >
                      {VEHICLE_STATUS_LABELS[vehicle.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
                    <span>{Math.round(vehicle.location.speed)} mph</span>
                    <span>{formatTimeAgo(vehicle.location.updated_at)}</span>
                    {vehicle.vin && (
                      <span className="font-mono truncate">
                        {vehicle.vin.slice(-6)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="p-3 border-t border-border bg-bg-hover">
        <div className="flex justify-between text-xs text-text-muted">
          <span>{counts.total} vehicles</span>
          <span>
            {counts.moving} moving / {counts.stopped + counts.offline} inactive
          </span>
        </div>
      </div>
    </div>
  );
}
