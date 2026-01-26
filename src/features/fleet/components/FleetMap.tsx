import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import * as L from "leaflet";
import { useFleetLocations, useVehicleHistory } from "../api.ts";
import { VehicleInfoPopup } from "./VehicleInfoPopup.tsx";
import { VEHICLE_STATUS_COLORS } from "../types.ts";
import type { Vehicle } from "../types.ts";

interface FleetMapProps {
  height?: string;
  showHistory?: boolean;
}

/**
 * Create a custom arrow marker icon for vehicles
 * Color-coded by status, rotated by heading
 */
function createVehicleIcon(status: string, heading: number): L.DivIcon {
  const color =
    VEHICLE_STATUS_COLORS[status as keyof typeof VEHICLE_STATUS_COLORS] ||
    "#9ca3af";

  // SVG arrow pointing up, will be rotated by heading
  const svg = `
    <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${heading}deg);">
      <path d="M18 4 L28 28 L18 22 L8 28 Z" fill="${color}" stroke="white" stroke-width="2"/>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: "vehicle-marker",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

/**
 * Component to fit map bounds to all vehicles
 */
function FitBounds({ vehicles }: { vehicles: Vehicle[] }) {
  const map = useMap();

  useEffect(() => {
    if (vehicles.length === 0) return;

    const bounds = L.latLngBounds(
      vehicles.map((v) => [v.location.lat, v.location.lng] as L.LatLngTuple),
    );

    // Add padding so markers aren't at the edge
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [vehicles, map]);

  return null;
}

/**
 * Map showing all vehicles with real-time location updates
 * Uses Leaflet with OpenStreetMap tiles
 */
export function FleetMap({
  height = "600px",
  showHistory = true,
}: FleetMapProps) {
  const { data: vehicles, isLoading, error } = useFleetLocations();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const { data: history } = useVehicleHistory(
    selectedVehicle?.id,
    showHistory ? 1 : undefined,
  );

  // Default center (Texas - adjust based on your fleet location)
  const defaultCenter: [number, number] = [30.2672, -97.7431]; // Austin, TX
  const defaultZoom = 10;

  if (isLoading) {
    return (
      <div
        className="bg-bg-muted rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">🔄</div>
          <p className="text-text-secondary">Loading fleet locations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-bg-muted rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center">
          <p className="text-danger mb-2">Failed to load fleet locations</p>
          <p className="text-sm text-text-muted">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  if (!vehicles || vehicles.length === 0) {
    return (
      <div
        className="bg-bg-muted rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center">
          <div className="text-4xl mb-3">🚛</div>
          <p className="text-text-secondary font-medium">
            No vehicles available
          </p>
          <p className="text-sm text-text-muted mt-1">
            Ensure Samsara is configured and vehicles are active
          </p>
        </div>
      </div>
    );
  }

  // Calculate center from vehicles if available
  const centerLat =
    vehicles.reduce((sum, v) => sum + v.location.lat, 0) / vehicles.length;
  const centerLng =
    vehicles.reduce((sum, v) => sum + v.location.lng, 0) / vehicles.length;
  const center: [number, number] =
    vehicles.length > 0 ? [centerLat, centerLng] : defaultCenter;

  // Build history polyline points
  const historyPoints: [number, number][] =
    history?.map((p) => [p.lat, p.lng]) || [];

  return (
    <div
      className="relative rounded-lg overflow-hidden border border-border"
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={defaultZoom}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        {/* OpenStreetMap tiles - free, no API key needed */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto-fit bounds to vehicles */}
        <FitBounds vehicles={vehicles} />

        {/* Vehicle history trail */}
        {selectedVehicle && historyPoints.length > 1 && (
          <Polyline
            positions={historyPoints}
            color="#3b82f6"
            weight={3}
            opacity={0.7}
            dashArray="8, 8"
          />
        )}

        {/* Vehicle markers */}
        {vehicles.map((vehicle) => (
          <Marker
            key={vehicle.id}
            position={[vehicle.location.lat, vehicle.location.lng]}
            icon={createVehicleIcon(vehicle.status, vehicle.location.heading)}
            eventHandlers={{
              click: () => setSelectedVehicle(vehicle),
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <VehicleInfoPopup
                  vehicle={vehicle}
                  onClose={() => setSelectedVehicle(null)}
                />
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend overlay */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs z-[1000]">
        <div className="font-semibold mb-2 text-text-primary">
          Vehicle Status
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: VEHICLE_STATUS_COLORS.moving }}
            />
            <span>Moving</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: VEHICLE_STATUS_COLORS.idling }}
            />
            <span>Idling</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: VEHICLE_STATUS_COLORS.stopped }}
            />
            <span>Stopped</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: VEHICLE_STATUS_COLORS.offline }}
            />
            <span>Offline</span>
          </div>
        </div>
      </div>

      {/* Live update indicator */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 text-xs flex items-center gap-2 z-[1000]">
        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        <span className="font-medium text-text-primary">Live Updates</span>
        <span className="text-text-muted">• {vehicles.length} vehicles</span>
      </div>

      {/* Selected vehicle info panel */}
      {selectedVehicle && (
        <div className="absolute top-4 right-4 z-[1000]">
          <VehicleInfoPopup
            vehicle={selectedVehicle}
            onClose={() => setSelectedVehicle(null)}
          />
        </div>
      )}
    </div>
  );
}
