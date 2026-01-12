import { useState } from "react";
import { FleetMap } from "./components/FleetMap.tsx";
import { useFleetLocations } from "./api.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { VEHICLE_STATUS_LABELS } from "./types.ts";

/**
 * Full-page fleet tracking map
 */
export function FleetMapPage() {
  const { data: vehicles } = useFleetLocations();
  const [showHistory, setShowHistory] = useState(true);

  const vehiclesByStatus = vehicles?.reduce(
    (acc, vehicle) => {
      acc[vehicle.status] = (acc[vehicle.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Fleet Tracking
          </h1>
          <p className="text-text-secondary">
            Real-time vehicle locations and status
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={showHistory}
              onChange={(e) => setShowHistory(e.target.checked)}
              className="rounded"
            />
            Show vehicle trails
          </label>
        </div>
      </div>

      {/* Stats Cards */}
      {vehicles && vehicles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="py-4">
              <div className="text-2xl font-bold text-text-primary">
                {vehicles.length}
              </div>
              <div className="text-sm text-text-secondary">Total Vehicles</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-2xl font-bold text-success">
                {vehiclesByStatus?.moving || 0}
              </div>
              <div className="text-sm text-text-secondary">Moving</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-2xl font-bold text-warning">
                {vehiclesByStatus?.idling || 0}
              </div>
              <div className="text-sm text-text-secondary">Idling</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-2xl font-bold text-danger">
                {vehiclesByStatus?.stopped || 0}
              </div>
              <div className="text-sm text-text-secondary">Stopped</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 min-h-0">
        <FleetMap height="100%" showHistory={showHistory} />
      </div>

      {/* Vehicle List */}
      {vehicles && vehicles.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>All Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="p-3 rounded-lg border border-border hover:bg-bg-hover transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-text-primary">
                        {vehicle.name}
                      </p>
                      {vehicle.driver_name && (
                        <p className="text-xs text-text-secondary">
                          Driver: {vehicle.driver_name}
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
                  <div className="text-xs text-text-muted">
                    <p>Speed: {Math.round(vehicle.location.speed)} mph</p>
                    <p>
                      Last update:{" "}
                      {new Date(
                        vehicle.location.updated_at,
                      ).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
