/**
 * TechnicianTracker
 * Dispatch view for tracking all technicians in real-time
 * Shows live map, ETA for each technician, and status updates
 */
import { useState, useCallback, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  useDispatchTracking,
  type DispatchTechnicianLocation,
} from "@/api/hooks/useRealTimeTracking";
import { TechnicianTrackingMap } from "@/features/gps-tracking/components/TechnicianTrackingMap";
import { ETABadge } from "./components/ETADisplay";
import { formatETA } from "@/api/types/tracking";
import { cn } from "@/lib/utils";

interface TechnicianTrackerProps {
  /** Height of the map */
  mapHeight?: string;
  /** Class name */
  className?: string;
  /** Callback when technician is selected */
  onSelectTechnician?: (technician: DispatchTechnicianLocation | null) => void;
}

const STATUS_LABELS = {
  active: "En Route",
  idle: "Idle",
  offline: "Offline",
};

const STATUS_COLORS = {
  active: "success",
  idle: "warning",
  offline: "default",
} as const;

export function TechnicianTracker({
  mapHeight = "500px",
  className,
  onSelectTechnician,
}: TechnicianTrackerProps) {
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "idle" | "offline"
  >("all");

  const {
    getAllTechnicians,
    getTechnician,
    getActiveTechnicians,
    isLoading,
    error,
    refresh,
    isConnected,
  } = useDispatchTracking();

  const technicians = getAllTechnicians();

  // Filter technicians
  const filteredTechnicians = useMemo(() => {
    return technicians.filter((tech) => {
      const matchesSearch =
        searchQuery === "" ||
        tech.technicianName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || tech.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [technicians, searchQuery, statusFilter]);

  // Convert for map display
  const mapLocations = useMemo(() => {
    return filteredTechnicians.map((tech) => ({
      technicianId: tech.technicianId,
      technicianName: tech.technicianName,
      lat: tech.lat,
      lng: tech.lng,
      heading: tech.heading,
      speed: tech.speed,
      timestamp: tech.timestamp,
      status: tech.status,
      currentWorkOrderId: tech.currentWorkOrderId,
    }));
  }, [filteredTechnicians]);

  // Handle technician selection
  const handleSelectTechnician = useCallback(
    (technicianId: string | null) => {
      setSelectedTechnicianId(technicianId);
      if (technicianId) {
        const tech = getTechnician(technicianId);
        onSelectTechnician?.(tech || null);
      } else {
        onSelectTechnician?.(null);
      }
    },
    [getTechnician, onSelectTechnician],
  );

  // Selected technician details
  const selectedTechnician = selectedTechnicianId
    ? getTechnician(selectedTechnicianId)
    : null;

  // Stats
  const activeTechnicians = getActiveTechnicians();
  const idleTechnicians = technicians.filter((t) => t.status === "idle");
  const offlineTechnicians = technicians.filter((t) => t.status === "offline");

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">
            Technician Tracking
          </h2>
          <p className="text-sm text-text-muted">
            Real-time GPS tracking of all field technicians
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
              isConnected
                ? "bg-success/10 text-success"
                : "bg-warning/10 text-warning",
            )}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-success animate-pulse" : "bg-warning",
              )}
            />
            {isConnected ? "Live" : "Reconnecting..."}
          </div>
          <Button variant="secondary" size="sm" onClick={() => void refresh()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card
          className={cn(
            "cursor-pointer transition-colors",
            statusFilter === "active" ? "ring-2 ring-success" : "",
          )}
          onClick={() =>
            setStatusFilter(statusFilter === "active" ? "all" : "active")
          }
        >
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-success">
              {activeTechnicians.length}
            </p>
            <p className="text-sm text-text-muted">En Route</p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "cursor-pointer transition-colors",
            statusFilter === "idle" ? "ring-2 ring-warning" : "",
          )}
          onClick={() =>
            setStatusFilter(statusFilter === "idle" ? "all" : "idle")
          }
        >
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-warning">
              {idleTechnicians.length}
            </p>
            <p className="text-sm text-text-muted">Idle</p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "cursor-pointer transition-colors",
            statusFilter === "offline" ? "ring-2 ring-gray-400" : "",
          )}
          onClick={() =>
            setStatusFilter(statusFilter === "offline" ? "all" : "offline")
          }
        >
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-400">
              {offlineTechnicians.length}
            </p>
            <p className="text-sm text-text-muted">Offline</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="Search technicians..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        {statusFilter !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="text-text-muted"
          >
            Clear filter
          </Button>
        )}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          {isLoading && technicians.length === 0 ? (
            <div
              className="bg-bg-muted rounded-lg flex items-center justify-center border border-border"
              style={{ height: mapHeight }}
            >
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-text-muted">
                  Loading technician locations...
                </p>
              </div>
            </div>
          ) : (
            <TechnicianTrackingMap
              locations={mapLocations}
              selectedTechnicianId={selectedTechnicianId || undefined}
              onSelectTechnician={handleSelectTechnician}
              height={mapHeight}
              showPath={true}
            />
          )}
        </div>

        {/* Technician list */}
        <div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Technicians ({filteredTechnicians.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[450px] overflow-y-auto divide-y divide-border">
                {filteredTechnicians.length === 0 ? (
                  <div className="p-6 text-center text-text-muted">
                    {searchQuery || statusFilter !== "all"
                      ? "No technicians match your filters"
                      : "No technicians online"}
                  </div>
                ) : (
                  filteredTechnicians.map((tech) => (
                    <button
                      key={tech.technicianId}
                      onClick={() =>
                        handleSelectTechnician(
                          tech.technicianId === selectedTechnicianId
                            ? null
                            : tech.technicianId,
                        )
                      }
                      className={cn(
                        "w-full p-4 text-left hover:bg-bg-muted transition-colors",
                        tech.technicianId === selectedTechnicianId
                          ? "bg-primary/5"
                          : "",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                            tech.status === "active"
                              ? "bg-success"
                              : tech.status === "idle"
                                ? "bg-warning"
                                : "bg-gray-400",
                          )}
                        >
                          {tech.technicianName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-text-primary truncate">
                              {tech.technicianName}
                            </span>
                            <Badge
                              variant={STATUS_COLORS[tech.status]}
                              className="text-xs"
                            >
                              {STATUS_LABELS[tech.status]}
                            </Badge>
                          </div>
                          {tech.currentWorkOrderId && (
                            <p className="text-xs text-text-muted mt-1 truncate">
                              WO #{tech.currentWorkOrderId.slice(0, 8)}
                            </p>
                          )}
                          {tech.speed !== undefined && tech.speed > 0 && (
                            <p className="text-xs text-text-muted mt-1">
                              {Math.round(tech.speed)} km/h
                            </p>
                          )}
                        </div>
                        {tech.eta && (
                          <ETABadge eta={tech.eta} status="en_route" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Selected technician details */}
      {selectedTechnician && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {selectedTechnician.technicianName} - Details
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelectTechnician(null)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-text-muted">Status</p>
                <Badge variant={STATUS_COLORS[selectedTechnician.status]}>
                  {STATUS_LABELS[selectedTechnician.status]}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-text-muted">Speed</p>
                <p className="font-medium">
                  {selectedTechnician.speed
                    ? `${Math.round(selectedTechnician.speed)} km/h`
                    : "Stationary"}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Coordinates</p>
                <p className="font-mono text-sm">
                  {selectedTechnician.lat.toFixed(5)},{" "}
                  {selectedTechnician.lng.toFixed(5)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Last Update</p>
                <p className="font-medium">
                  {new Date(selectedTechnician.timestamp).toLocaleTimeString()}
                </p>
              </div>
              {selectedTechnician.currentWorkOrderId && (
                <div className="col-span-2">
                  <p className="text-xs text-text-muted">Current Work Order</p>
                  <p className="font-medium text-primary">
                    #{selectedTechnician.currentWorkOrderId}
                  </p>
                </div>
              )}
              {selectedTechnician.eta && (
                <div className="col-span-2">
                  <p className="text-xs text-text-muted">ETA to Destination</p>
                  <p className="font-bold text-lg text-primary">
                    {formatETA(selectedTechnician.eta.durationRemaining)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-danger/10 border border-danger/20 rounded-lg p-4">
          <p className="text-danger font-medium">Error loading tracking data</p>
          <p className="text-sm text-text-secondary">{error}</p>
        </div>
      )}
    </div>
  );
}

export default TechnicianTracker;
