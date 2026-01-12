import { Badge } from "@/components/ui/Badge.tsx";
import { VEHICLE_STATUS_LABELS } from "../types.ts";
import type { Vehicle } from "../types.ts";

interface VehicleInfoPopupProps {
  vehicle: Vehicle;
  onClose: () => void;
}

/**
 * Vehicle details popup shown when marker is clicked
 */
export function VehicleInfoPopup({ vehicle, onClose }: VehicleInfoPopupProps) {
  const formatSpeed = (mph: number): string => {
    return `${Math.round(mph)} mph`;
  };

  const formatLastUpdate = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-72 border border-gray-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-text-primary">
            {vehicle.name}
          </h3>
          {vehicle.driver_name && (
            <p className="text-sm text-text-secondary">
              Driver: {vehicle.driver_name}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary text-xl leading-none"
        >
          &times;
        </button>
      </div>

      {/* Status */}
      <div className="mb-3">
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

      {/* Details */}
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-text-secondary">Speed:</dt>
          <dd className="font-medium text-text-primary">
            {formatSpeed(vehicle.location.speed)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-secondary">Heading:</dt>
          <dd className="font-medium text-text-primary">
            {Math.round(vehicle.location.heading)}°
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-secondary">Last Update:</dt>
          <dd className="font-medium text-text-primary">
            {formatLastUpdate(vehicle.location.updated_at)}
          </dd>
        </div>
        {vehicle.vin && (
          <div className="flex justify-between">
            <dt className="text-text-secondary">VIN:</dt>
            <dd className="font-medium text-text-primary font-mono text-xs">
              {vehicle.vin}
            </dd>
          </div>
        )}
      </dl>

      {/* Coordinates (small text at bottom) */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-text-muted font-mono">
          {vehicle.location.lat.toFixed(6)}, {vehicle.location.lng.toFixed(6)}
        </p>
      </div>
    </div>
  );
}
