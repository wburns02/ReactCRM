/**
 * TrackingMap Component
 * Customer-facing map showing technician location and route to destination
 */
import { useState, useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { TechnicianLocationUpdate } from "@/api/types/tracking";
import type { Coordinates } from "@/features/gps-tracking/types";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// @ts-expect-error - Leaflet type issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface TrackingMapProps {
  /** Current technician location */
  technicianLocation: TechnicianLocationUpdate | null;
  /** Destination coordinates (customer address) */
  destination: Coordinates & { address?: string };
  /** Technician name for marker */
  technicianName?: string;
  /** Technician photo URL */
  technicianPhotoUrl?: string;
  /** Location history for path */
  locationHistory?: TechnicianLocationUpdate[];
  /** Map height */
  height?: string;
  /** Show path trail */
  showPath?: boolean;
  /** Custom CSS class */
  className?: string;
}

// Technician vehicle marker (van/truck icon)
function createTechnicianMarker(heading?: number, photoUrl?: string) {
  const rotation = heading || 0;

  return L.divIcon({
    className: "custom-technician-marker",
    html: `
      <div style="
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(${rotation}deg);
        animation: pulse 2s ease-in-out infinite;
      ">
        ${
          photoUrl
            ? `<img src="${photoUrl}" alt="Technician" style="
                width: 36px;
                height: 36px;
                border-radius: 50%;
                object-fit: cover;
                transform: rotate(-${rotation}deg);
              "/>`
            : `<svg width="24" height="24" viewBox="0 0 24 24" fill="white" style="transform: rotate(-${rotation}deg);">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>`
        }
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25); }
          50% { box-shadow: 0 4px 20px rgba(59, 130, 246, 0.5); }
        }
      </style>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });
}

// Destination marker (home/pin icon)
const destinationMarkerIcon = L.divIcon({
  className: "custom-destination-marker",
  html: `
    <div style="
      position: relative;
      width: 40px;
      height: 52px;
    ">
      <div style="
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
        </div>
      </div>
    </div>
  `,
  iconSize: [40, 52],
  iconAnchor: [20, 52],
  popupAnchor: [0, -52],
});

// Map bounds updater component
function MapBoundsUpdater({
  technicianLocation,
  destination,
}: {
  technicianLocation: TechnicianLocationUpdate | null;
  destination: Coordinates;
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [[destination.lat, destination.lng]];

    if (technicianLocation) {
      points.push([technicianLocation.lat, technicianLocation.lng]);
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }, [map, technicianLocation, destination]);

  return null;
}

export function TrackingMap({
  technicianLocation,
  destination,
  technicianName,
  technicianPhotoUrl,
  locationHistory = [],
  height = "400px",
  showPath = true,
  className = "",
}: TrackingMapProps) {
  // Default center on destination
  const [mapCenter] = useState<[number, number]>([
    destination.lat,
    destination.lng,
  ]);
  const [zoom] = useState(14);

  // Path polyline positions from history
  const pathPositions = useMemo(() => {
    if (!showPath || locationHistory.length === 0) return [];
    return locationHistory.map(
      (point) => [point.lat, point.lng] as [number, number],
    );
  }, [showPath, locationHistory]);

  // Route line from technician to destination
  const routeLine = useMemo(() => {
    if (!technicianLocation) return [];
    return [
      [technicianLocation.lat, technicianLocation.lng] as [number, number],
      [destination.lat, destination.lng] as [number, number],
    ];
  }, [technicianLocation, destination]);

  // Technician marker
  const technicianMarker = useMemo(() => {
    return createTechnicianMarker(
      technicianLocation?.heading,
      technicianPhotoUrl,
    );
  }, [technicianLocation?.heading, technicianPhotoUrl]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden shadow-lg ${className}`}
      style={{ height }}
    >
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
        attributionControl={false}
      >
        {/* Map tiles - using Carto Light for clean look */}
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />

        <MapBoundsUpdater
          technicianLocation={technicianLocation}
          destination={destination}
        />

        {/* Destination accuracy circle */}
        <Circle
          center={[destination.lat, destination.lng]}
          radius={50}
          pathOptions={{
            color: "#ef4444",
            fillColor: "#ef4444",
            fillOpacity: 0.1,
            weight: 2,
            dashArray: "4, 4",
          }}
        />

        {/* Route line to destination */}
        {routeLine.length > 0 && (
          <Polyline
            positions={routeLine}
            pathOptions={{
              color: "#3b82f6",
              weight: 4,
              opacity: 0.7,
              dashArray: "8, 12",
            }}
          />
        )}

        {/* Location history path */}
        {pathPositions.length > 1 && (
          <Polyline
            positions={pathPositions}
            pathOptions={{
              color: "#22c55e",
              weight: 3,
              opacity: 0.5,
            }}
          />
        )}

        {/* Destination marker */}
        <Marker
          position={[destination.lat, destination.lng]}
          icon={destinationMarkerIcon}
        >
          <Popup>
            <div className="text-center">
              <strong className="block text-sm">Your Location</strong>
              {destination.address && (
                <span className="text-xs text-gray-600">
                  {destination.address}
                </span>
              )}
            </div>
          </Popup>
        </Marker>

        {/* Technician marker */}
        {technicianLocation && (
          <Marker
            position={[technicianLocation.lat, technicianLocation.lng]}
            icon={technicianMarker}
          >
            <Popup>
              <div className="text-center p-1">
                <strong className="block text-sm">
                  {technicianName || "Your Technician"}
                </strong>
                {technicianLocation.speed !== undefined &&
                  technicianLocation.speed > 0 && (
                    <span className="text-xs text-gray-600 block">
                      {Math.round(technicianLocation.speed)} mph
                    </span>
                  )}
                <span className="text-xs text-gray-500">
                  Updated{" "}
                  {new Date(technicianLocation.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Live indicator */}
      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md flex items-center gap-2 z-[1000]">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs font-medium text-gray-700">Live Tracking</span>
      </div>

      {/* Technician status badge */}
      {technicianLocation && (
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md z-[1000]">
          <div className="flex items-center gap-2">
            {technicianPhotoUrl ? (
              <img
                src={technicianPhotoUrl}
                alt={technicianName}
                className="w-8 h-8 rounded-full object-cover border-2 border-blue-500"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {technicianName || "Your Technician"}
              </p>
              <p className="text-xs text-blue-600 font-medium capitalize">
                {technicianLocation.status.replace("_", " ")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrackingMap;
