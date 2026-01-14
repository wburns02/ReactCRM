import { useState, useEffect, useRef } from "react";
import { useFleetLocations, useVehicleHistory } from "../api.ts";
import { VehicleMarker } from "./VehicleMarker.tsx";
import { VehicleInfoPopup } from "./VehicleInfoPopup.tsx";
import type { Vehicle } from "../types.ts";

interface FleetMapProps {
  height?: string;
  showHistory?: boolean;
}

/**
 * Map showing all vehicles with real-time location updates
 * Note: This is a simplified map implementation.
 * In production, you would integrate with Google Maps, Mapbox, or Leaflet.
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

  const mapRef = useRef<HTMLDivElement>(null);
  const [mapBounds, setMapBounds] = useState({
    minLat: 0,
    maxLat: 0,
    minLng: 0,
    maxLng: 0,
  });

  // Calculate map bounds based on vehicle locations
  useEffect(() => {
    if (!vehicles || vehicles.length === 0) return;

    const lats = vehicles.map((v) => v.location.lat);
    const lngs = vehicles.map((v) => v.location.lng);

    setMapBounds({
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    });
  }, [vehicles]);

  // Convert lat/lng to pixel coordinates
  const latLngToPixel = (
    lat: number,
    lng: number,
  ): { x: number; y: number } => {
    if (!mapRef.current) return { x: 0, y: 0 };

    const bounds = mapBounds;
    const latRange = bounds.maxLat - bounds.minLat || 1;
    const lngRange = bounds.maxLng - bounds.minLng || 1;

    const padding = 50; // pixels
    const width = mapRef.current.clientWidth - padding * 2;
    const height = mapRef.current.clientHeight - padding * 2;

    const x = ((lng - bounds.minLng) / lngRange) * width + padding;
    const y = ((bounds.maxLat - lat) / latRange) * height + padding;

    return { x, y };
  };

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
          <p className="text-text-secondary">No vehicles available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-lg overflow-hidden border border-border"
      style={{ height }}
    >
      {/* Map Container - Simple grid background to represent map */}
      <div
        ref={mapRef}
        className="w-full h-full bg-gradient-to-br from-blue-50 to-green-50 relative"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      >
        {/* Vehicle Trail/Path (if history is available) */}
        {selectedVehicle && history && history.length > 0 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <path
              d={history
                .map((point, index) => {
                  const { x, y } = latLngToPixel(point.lat, point.lng);
                  return `${index === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ")}
              stroke="#3b82f6"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5,5"
              opacity="0.6"
            />
          </svg>
        )}

        {/* Vehicle Markers */}
        {vehicles.map((vehicle) => {
          const { x, y } = latLngToPixel(
            vehicle.location.lat,
            vehicle.location.lng,
          );

          return (
            <div
              key={vehicle.id}
              className="absolute"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <VehicleMarker
                vehicle={vehicle}
                onClick={setSelectedVehicle}
                isSelected={selectedVehicle?.id === vehicle.id}
              />
            </div>
          );
        })}

        {/* Info Popup */}
        {selectedVehicle && (
          <div className="absolute top-4 right-4 z-10">
            <VehicleInfoPopup
              vehicle={selectedVehicle}
              onClose={() => setSelectedVehicle(null)}
            />
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs">
          <div className="font-semibold mb-2 text-text-primary">
            Vehicle Status
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span>Moving</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span>Idling</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-danger" />
              <span>Stopped</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-text-muted" />
              <span>Offline</span>
            </div>
          </div>
        </div>

        {/* Live Update Indicator */}
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 text-xs flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="font-medium text-text-primary">Live Updates</span>
        </div>
      </div>
    </div>
  );
}
