/**
 * GeofenceManager Component
 * Visual geofence configuration with auto arrival/departure detection
 */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import * as L from "leaflet";
import type { WorkOrder } from "@/api/types/workOrder";
import {
  calculateDistanceBetweenPoints,
  isWithinGeofence,
  detectGeofenceCrossing,
  formatDistance,
  type Coordinates,
} from "./utils/routingUtils";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// @ts-expect-error - Leaflet type issue with default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ============================================
// Types
// ============================================

export interface Geofence {
  id: string;
  workOrderId?: string;
  center: Coordinates;
  radiusMeters: number;
  name?: string;
  color?: string;
  isActive?: boolean;
}

export interface GeofenceEvent {
  type: "enter" | "exit";
  geofenceId: string;
  workOrderId?: string;
  timestamp: Date;
  location: Coordinates;
}

export interface GeofenceManagerProps {
  /** Work order to create geofence for */
  workOrder?: WorkOrder;
  /** Custom geofence (if not using workOrder) */
  geofence?: Geofence;
  /** Current device/technician location */
  currentLocation?: Coordinates | null;
  /** Default radius in meters */
  defaultRadius?: number;
  /** Min radius in meters */
  minRadius?: number;
  /** Max radius in meters */
  maxRadius?: number;
  /** Callback when entering geofence */
  onEnter?: (event: GeofenceEvent) => void;
  /** Callback when exiting geofence */
  onExit?: (event: GeofenceEvent) => void;
  /** Callback when geofence is updated */
  onGeofenceUpdate?: (geofence: Geofence) => void;
  /** Allow editing geofence */
  editable?: boolean;
  /** Map height */
  height?: string;
  /** Show distance indicator */
  showDistance?: boolean;
  /** Show status indicator */
  showStatus?: boolean;
  /** Custom CSS class */
  className?: string;
}

// ============================================
// Geofence Colors
// ============================================

const GEOFENCE_COLORS = {
  default: "#3b82f6",
  inside: "#22c55e",
  outside: "#f59e0b",
  inactive: "#6b7280",
} as const;

// ============================================
// Custom Marker Icons
// ============================================

function createCenterMarker(isInside: boolean): L.DivIcon {
  const color = isInside ? GEOFENCE_COLORS.inside : GEOFENCE_COLORS.default;

  return L.divIcon({
    className: "geofence-center-marker",
    html: `
      <div style="
        position: relative;
        width: 36px;
        height: 46px;
      ">
        <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 28 18 28s18-14.5 18-28C36 8.06 27.94 0 18 0z" fill="${color}"/>
          <circle cx="18" cy="18" r="8" fill="white"/>
        </svg>
      </div>
    `,
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -46],
  });
}

function createDeviceMarker(isInside: boolean): L.DivIcon {
  const color = isInside ? GEOFENCE_COLORS.inside : GEOFENCE_COLORS.outside;

  return L.divIcon({
    className: "device-marker",
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: ${color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: devicePulse 2s ease-in-out infinite;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
      <style>
        @keyframes devicePulse {
          0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 2px 16px ${color}80; }
        }
      </style>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// ============================================
// Map Interaction Component
// ============================================

function MapClickHandler({
  onCenterChange,
  enabled,
}: {
  onCenterChange: (coords: Coordinates) => void;
  enabled: boolean;
}) {
  useMapEvents({
    click: (e) => {
      if (enabled) {
        onCenterChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

function MapBoundsUpdater({
  center,
  radiusMeters,
  currentLocation,
}: {
  center: Coordinates;
  radiusMeters: number;
  currentLocation?: Coordinates | null;
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [[center.lat, center.lng]];
    if (currentLocation) {
      points.push([currentLocation.lat, currentLocation.lng]);
    }

    // Add points at radius boundary
    const latOffset = (radiusMeters / 111000) * 1.2;
    const lngOffset =
      (radiusMeters / (111000 * Math.cos((center.lat * Math.PI) / 180))) * 1.2;
    points.push([center.lat + latOffset, center.lng]);
    points.push([center.lat - latOffset, center.lng]);
    points.push([center.lat, center.lng + lngOffset]);
    points.push([center.lat, center.lng - lngOffset]);

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  }, [map, center, radiusMeters, currentLocation]);

  return null;
}

// ============================================
// Radius Slider Component
// ============================================

function RadiusSlider({
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <label className="font-medium text-gray-700">Geofence Radius</label>
        <span className="text-blue-600 font-semibold">
          {formatDistance(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatDistance(min)}</span>
        <span>{formatDistance(max)}</span>
      </div>
    </div>
  );
}

// ============================================
// Status Indicator Component
// ============================================

function GeofenceStatus({
  isInside,
  distance,
  lastEvent,
}: {
  isInside: boolean;
  distance: number;
  lastEvent?: GeofenceEvent | null;
}) {
  return (
    <div
      className={`rounded-lg p-4 ${
        isInside
          ? "bg-green-50 border border-green-200"
          : "bg-amber-50 border border-amber-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isInside ? "bg-green-500" : "bg-amber-500"
          }`}
        >
          {isInside ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
            </svg>
          )}
        </div>
        <div>
          <h4
            className={`font-semibold ${
              isInside ? "text-green-800" : "text-amber-800"
            }`}
          >
            {isInside ? "Inside Geofence" : "Outside Geofence"}
          </h4>
          <p
            className={`text-sm ${
              isInside ? "text-green-600" : "text-amber-600"
            }`}
          >
            {isInside
              ? "Technician is at the job site"
              : `${formatDistance(distance)} from location`}
          </p>
        </div>
      </div>

      {lastEvent && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Last {lastEvent.type === "enter" ? "arrived" : "departed"}:{" "}
            {lastEvent.timestamp.toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// Main GeofenceManager Component
// ============================================

export function GeofenceManager({
  workOrder,
  geofence: initialGeofence,
  currentLocation,
  defaultRadius = 100,
  minRadius = 25,
  maxRadius = 500,
  onEnter,
  onExit,
  onGeofenceUpdate,
  editable = true,
  height = "400px",
  showDistance = true,
  showStatus = true,
  className = "",
}: GeofenceManagerProps) {
  // Initialize geofence from workOrder or prop
  const initialCenter: Coordinates = useMemo(() => {
    if (initialGeofence) {
      return initialGeofence.center;
    }
    if (workOrder?.service_latitude && workOrder?.service_longitude) {
      return {
        lat: workOrder.service_latitude,
        lng: workOrder.service_longitude,
      };
    }
    return { lat: 29.4252, lng: -98.4946 }; // Default to San Antonio
  }, [workOrder, initialGeofence]);

  // State
  const [center, setCenter] = useState<Coordinates>(initialCenter);
  const [radius, setRadius] = useState(
    initialGeofence?.radiusMeters || defaultRadius,
  );
  const [isEditingCenter, setIsEditingCenter] = useState(false);
  const [lastEvent, setLastEvent] = useState<GeofenceEvent | null>(null);

  // Refs for tracking location changes
  const previousLocationRef = useRef<Coordinates | null>(null);
  const onEnterRef = useRef(onEnter);
  const onExitRef = useRef(onExit);

  // Keep callback refs in sync
  useEffect(() => {
    onEnterRef.current = onEnter;
    onExitRef.current = onExit;
  }, [onEnter, onExit]);

  // Current geofence object
  const geofence: Geofence = useMemo(
    () => ({
      id: initialGeofence?.id || workOrder?.id || "geofence-1",
      workOrderId: workOrder?.id,
      center,
      radiusMeters: radius,
      name: initialGeofence?.name || workOrder?.customer_name || "Geofence",
      color: initialGeofence?.color || GEOFENCE_COLORS.default,
      isActive: initialGeofence?.isActive ?? true,
    }),
    [center, radius, workOrder, initialGeofence],
  );

  // Check if current location is inside geofence
  const isInside = useMemo(() => {
    if (!currentLocation) return false;
    return isWithinGeofence(currentLocation, geofence);
  }, [currentLocation, geofence]);

  // Calculate distance to center
  const distanceToCenter = useMemo(() => {
    if (!currentLocation) return 0;
    return calculateDistanceBetweenPoints(currentLocation, center);
  }, [currentLocation, center]);

  // Distance to boundary (negative if inside)
  const distanceToBoundary = useMemo(() => {
    return distanceToCenter - radius;
  }, [distanceToCenter, radius]);

  // Detect geofence crossing
  useEffect(() => {
    if (!currentLocation) return;

    const crossing = detectGeofenceCrossing(
      previousLocationRef.current,
      currentLocation,
      geofence,
    );

    if (crossing) {
      const event: GeofenceEvent = {
        type: crossing,
        geofenceId: geofence.id,
        workOrderId: geofence.workOrderId,
        timestamp: new Date(),
        location: currentLocation,
      };

      setLastEvent(event);

      if (crossing === "enter") {
        onEnterRef.current?.(event);
      } else {
        onExitRef.current?.(event);
      }
    }

    previousLocationRef.current = currentLocation;
  }, [currentLocation, geofence]);

  // Handle center change
  const handleCenterChange = useCallback(
    (newCenter: Coordinates) => {
      setCenter(newCenter);
      setIsEditingCenter(false);
      onGeofenceUpdate?.({
        ...geofence,
        center: newCenter,
      });
    },
    [geofence, onGeofenceUpdate],
  );

  // Handle radius change
  const handleRadiusChange = useCallback(
    (newRadius: number) => {
      setRadius(newRadius);
      onGeofenceUpdate?.({
        ...geofence,
        radiusMeters: newRadius,
      });
    },
    [geofence, onGeofenceUpdate],
  );

  // Geofence circle color
  const circleColor = isInside
    ? GEOFENCE_COLORS.inside
    : GEOFENCE_COLORS.default;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Map */}
      <div
        className="relative rounded-xl overflow-hidden shadow-lg"
        style={{ height }}
      >
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={16}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />

          <MapBoundsUpdater
            center={center}
            radiusMeters={radius}
            currentLocation={currentLocation}
          />

          <MapClickHandler
            onCenterChange={handleCenterChange}
            enabled={editable && isEditingCenter}
          />

          {/* Geofence circle */}
          <Circle
            center={[center.lat, center.lng]}
            radius={radius}
            pathOptions={{
              color: circleColor,
              fillColor: circleColor,
              fillOpacity: 0.15,
              weight: 2,
              dashArray: isInside ? undefined : "6, 6",
            }}
          />

          {/* Center marker */}
          <Marker
            position={[center.lat, center.lng]}
            icon={createCenterMarker(isInside)}
            draggable={editable}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                handleCenterChange({ lat: position.lat, lng: position.lng });
              },
            }}
          >
            <Popup>
              <div className="text-center">
                <strong className="block">
                  {workOrder?.customer_name || "Job Site"}
                </strong>
                {workOrder?.service_address_line1 && (
                  <span className="text-xs text-gray-500">
                    {workOrder.service_address_line1}
                  </span>
                )}
              </div>
            </Popup>
          </Marker>

          {/* Current location marker */}
          {currentLocation && (
            <Marker
              position={[currentLocation.lat, currentLocation.lng]}
              icon={createDeviceMarker(isInside)}
            >
              <Popup>
                <div className="text-center">
                  <strong className="block">Current Location</strong>
                  <span className="text-xs text-gray-500">
                    {formatDistance(distanceToCenter)} from center
                  </span>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Edit center button */}
        {editable && (
          <button
            onClick={() => setIsEditingCenter(!isEditingCenter)}
            className={`absolute top-4 right-4 px-3 py-2 rounded-lg shadow-lg z-[1000] transition-colors ${
              isEditingCenter
                ? "bg-blue-500 text-white"
                : "bg-white hover:bg-gray-50 text-gray-700"
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
              </svg>
              {isEditingCenter ? "Click Map to Set" : "Move Center"}
            </span>
          </button>
        )}

        {/* Distance indicator */}
        {showDistance && currentLocation && (
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2 z-[1000]">
            <p className="text-sm">
              <span className="text-gray-500">Distance:</span>{" "}
              <span
                className={`font-semibold ${
                  isInside ? "text-green-600" : "text-amber-600"
                }`}
              >
                {formatDistance(distanceToCenter)}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      {editable && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <RadiusSlider
            value={radius}
            min={minRadius}
            max={maxRadius}
            onChange={handleRadiusChange}
          />
        </div>
      )}

      {/* Status */}
      {showStatus && currentLocation && (
        <GeofenceStatus
          isInside={isInside}
          distance={
            distanceToBoundary > 0 ? distanceToBoundary : distanceToCenter
          }
          lastEvent={lastEvent}
        />
      )}
    </div>
  );
}

// ============================================
// useGeofenceMonitor Hook
// ============================================

export interface UseGeofenceMonitorOptions {
  geofence: Geofence;
  currentLocation: Coordinates | null;
  onEnter?: (event: GeofenceEvent) => void;
  onExit?: (event: GeofenceEvent) => void;
}

export function useGeofenceMonitor({
  geofence,
  currentLocation,
  onEnter,
  onExit,
}: UseGeofenceMonitorOptions) {
  const previousLocationRef = useRef<Coordinates | null>(null);
  const [isInside, setIsInside] = useState(false);
  const [lastEvent, setLastEvent] = useState<GeofenceEvent | null>(null);

  useEffect(() => {
    if (!currentLocation) return;

    // Check current status
    const inside = isWithinGeofence(currentLocation, geofence);
    setIsInside(inside);

    // Detect crossing
    const crossing = detectGeofenceCrossing(
      previousLocationRef.current,
      currentLocation,
      geofence,
    );

    if (crossing) {
      const event: GeofenceEvent = {
        type: crossing,
        geofenceId: geofence.id,
        workOrderId: geofence.workOrderId,
        timestamp: new Date(),
        location: currentLocation,
      };

      setLastEvent(event);

      if (crossing === "enter") {
        onEnter?.(event);
      } else {
        onExit?.(event);
      }
    }

    previousLocationRef.current = currentLocation;
  }, [currentLocation, geofence, onEnter, onExit]);

  const distanceToCenter = useMemo(() => {
    if (!currentLocation) return 0;
    return calculateDistanceBetweenPoints(currentLocation, geofence.center);
  }, [currentLocation, geofence.center]);

  return {
    isInside,
    distanceToCenter,
    distanceToBoundary: distanceToCenter - geofence.radiusMeters,
    lastEvent,
  };
}

export default GeofenceManager;
