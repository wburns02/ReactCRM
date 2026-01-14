/**
 * RouteOptimizer Component
 * Displays optimal route between work orders with numbered stops, reordering, and time/distance estimates
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import * as L from "leaflet";
import type { WorkOrder } from "@/api/types/workOrder";
import { STATUS_COLORS, WORK_ORDER_STATUS_LABELS } from "@/api/types/workOrder";
import {
  calculateDistanceBetweenPoints,
  optimizeRouteOrder,
  formatDistance,
  formatDuration,
  type Coordinates,
  // calculateRouteInfo available for extended route analysis
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

export interface RouteStop {
  id: string;
  workOrder: WorkOrder;
  order: number;
  distanceFromPrevious?: number;
  durationFromPrevious?: number;
  cumulativeDistance?: number;
  cumulativeDuration?: number;
  arrivalTime?: string;
}

export interface RouteOptimizerProps {
  /** Work orders to route */
  workOrders: WorkOrder[];
  /** Starting point (technician location or depot) */
  startLocation?: Coordinates;
  /** Callback when route order changes */
  onRouteChange?: (orderedWorkOrders: WorkOrder[]) => void;
  /** Allow drag-and-drop reordering */
  enableReordering?: boolean;
  /** Auto-optimize on load */
  autoOptimize?: boolean;
  /** Map height */
  height?: string;
  /** Show route list panel */
  showRouteList?: boolean;
  /** Show total stats */
  showStats?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Start time for arrival calculations */
  startTime?: Date;
}

// ============================================
// Numbered Marker Icon
// ============================================

function createNumberedMarker(
  number: number,
  color: string,
  isSelected = false,
): L.DivIcon {
  const size = isSelected ? 40 : 36;

  return L.divIcon({
    className: "numbered-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${size * 0.4}px;
        font-family: system-ui, -apple-system, sans-serif;
        ${isSelected ? "transform: scale(1.1);" : ""}
      ">
        ${number}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function createStartMarker(): L.DivIcon {
  return L.divIcon({
    className: "start-marker",
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #10b981, #059669);
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}

// ============================================
// Map Bounds Component
// ============================================

function MapBoundsUpdater({
  stops,
  startLocation,
}: {
  stops: RouteStop[];
  startLocation?: Coordinates;
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [];

    if (startLocation) {
      points.push([startLocation.lat, startLocation.lng]);
    }

    stops.forEach((stop) => {
      if (stop.workOrder.service_latitude && stop.workOrder.service_longitude) {
        points.push([
          stop.workOrder.service_latitude,
          stop.workOrder.service_longitude,
        ]);
      }
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [map, stops, startLocation]);

  return null;
}

// ============================================
// Route List Item
// ============================================

function RouteListItem({
  stop,
  isFirst,
  isLast,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onClick,
  isSelected,
  enableReordering,
}: {
  stop: RouteStop;
  isFirst: boolean;
  isLast: boolean;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, index: number) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, index: number) => void;
  onClick?: () => void;
  isSelected?: boolean;
  enableReordering?: boolean;
}) {
  const statusColor = STATUS_COLORS[stop.workOrder.status];

  return (
    <div
      className={`relative pl-8 pb-4 ${!isLast ? "border-l-2 border-gray-200 ml-4" : "ml-4"}`}
      draggable={enableReordering}
      onDragStart={(e) => onDragStart?.(e, stop.order - 1)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop?.(e, stop.order - 1)}
    >
      {/* Step number */}
      <div
        className="absolute -left-4 top-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
        style={{ backgroundColor: statusColor }}
      >
        {stop.order}
      </div>

      {/* Content */}
      <button
        onClick={onClick}
        className={`w-full text-left p-3 rounded-lg transition-all ${
          isSelected
            ? "bg-blue-50 ring-2 ring-blue-500"
            : "bg-gray-50 hover:bg-gray-100"
        } ${isDragging ? "opacity-50" : ""}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">
              {stop.workOrder.customer_name || "Unknown Customer"}
            </h4>
            {stop.workOrder.service_address_line1 && (
              <p className="text-sm text-gray-600 truncate">
                {stop.workOrder.service_address_line1}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${statusColor}20`,
                  color: statusColor,
                }}
              >
                {WORK_ORDER_STATUS_LABELS[stop.workOrder.status]}
              </span>
              {stop.arrivalTime && (
                <span className="text-xs text-gray-500">
                  ETA: {stop.arrivalTime}
                </span>
              )}
            </div>
          </div>

          {/* Distance/Time from previous */}
          {!isFirst && stop.distanceFromPrevious !== undefined && (
            <div className="text-right text-xs text-gray-500 ml-2">
              <div>{formatDistance(stop.distanceFromPrevious)}</div>
              {stop.durationFromPrevious !== undefined && (
                <div>{formatDuration(stop.durationFromPrevious)}</div>
              )}
            </div>
          )}
        </div>

        {/* Drag handle */}
        {enableReordering && (
          <div className="absolute top-3 right-2 text-gray-400 cursor-move">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </div>
        )}
      </button>
    </div>
  );
}

// ============================================
// Main RouteOptimizer Component
// ============================================

export function RouteOptimizer({
  workOrders,
  startLocation,
  onRouteChange,
  enableReordering = true,
  autoOptimize = true,
  height = "500px",
  showRouteList = true,
  showStats = true,
  className = "",
  startTime = new Date(),
}: RouteOptimizerProps) {
  const [orderedWorkOrders, setOrderedWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedStopIndex, setSelectedStopIndex] = useState<number | null>(
    null,
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Filter work orders with valid coordinates
  const validWorkOrders = useMemo(
    () =>
      workOrders.filter(
        (wo) => wo.service_latitude != null && wo.service_longitude != null,
      ),
    [workOrders],
  );

  // Optimize route on load or when work orders change
  useEffect(() => {
    if (validWorkOrders.length === 0) {
      setOrderedWorkOrders([]);
      return;
    }

    if (autoOptimize && startLocation) {
      const coords = validWorkOrders.map((wo) => ({
        lat: wo.service_latitude!,
        lng: wo.service_longitude!,
      }));
      const optimizedCoords = optimizeRouteOrder(startLocation, coords);

      // Map back to work orders
      const optimized = optimizedCoords.map(
        (coord) =>
          validWorkOrders.find(
            (wo) =>
              wo.service_latitude === coord.lat &&
              wo.service_longitude === coord.lng,
          )!,
      );
      setOrderedWorkOrders(optimized);
    } else {
      setOrderedWorkOrders(validWorkOrders);
    }
  }, [validWorkOrders, startLocation, autoOptimize]);

  // Calculate route stops with distances and times
  const routeStops = useMemo((): RouteStop[] => {
    if (orderedWorkOrders.length === 0) return [];

    const stops: RouteStop[] = [];
    let cumulativeDistance = 0;
    let cumulativeDuration = 0;

    orderedWorkOrders.forEach((wo, index) => {
      let distanceFromPrevious = 0;
      let durationFromPrevious = 0;

      if (index === 0 && startLocation) {
        distanceFromPrevious = calculateDistanceBetweenPoints(startLocation, {
          lat: wo.service_latitude!,
          lng: wo.service_longitude!,
        });
      } else if (index > 0) {
        const prevWo = orderedWorkOrders[index - 1];
        distanceFromPrevious = calculateDistanceBetweenPoints(
          { lat: prevWo.service_latitude!, lng: prevWo.service_longitude! },
          { lat: wo.service_latitude!, lng: wo.service_longitude! },
        );
      }

      // Estimate duration (average 25 mph = ~11 m/s)
      durationFromPrevious = Math.round(distanceFromPrevious / 11);
      cumulativeDistance += distanceFromPrevious;
      cumulativeDuration += durationFromPrevious;

      // Calculate arrival time
      const arrivalDate = new Date(
        startTime.getTime() + cumulativeDuration * 1000,
      );
      const arrivalTime = arrivalDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      stops.push({
        id: wo.id,
        workOrder: wo,
        order: index + 1,
        distanceFromPrevious,
        durationFromPrevious,
        cumulativeDistance,
        cumulativeDuration,
        arrivalTime,
      });
    });

    return stops;
  }, [orderedWorkOrders, startLocation, startTime]);

  // Calculate total stats
  const routeStats = useMemo(() => {
    if (routeStops.length === 0)
      return { totalDistance: 0, totalDuration: 0, stopCount: 0 };

    const lastStop = routeStops[routeStops.length - 1];
    return {
      totalDistance: lastStop.cumulativeDistance || 0,
      totalDuration: lastStop.cumulativeDuration || 0,
      stopCount: routeStops.length,
    };
  }, [routeStops]);

  // Route line positions
  const routePositions = useMemo((): [number, number][] => {
    const positions: [number, number][] = [];

    if (startLocation) {
      positions.push([startLocation.lat, startLocation.lng]);
    }

    orderedWorkOrders.forEach((wo) => {
      if (wo.service_latitude && wo.service_longitude) {
        positions.push([wo.service_latitude, wo.service_longitude]);
      }
    });

    return positions;
  }, [orderedWorkOrders, startLocation]);

  // Handle optimize button
  const handleOptimize = useCallback(() => {
    if (!startLocation || validWorkOrders.length === 0) return;

    const coords = validWorkOrders.map((wo) => ({
      lat: wo.service_latitude!,
      lng: wo.service_longitude!,
    }));
    const optimizedCoords = optimizeRouteOrder(startLocation, coords);

    const optimized = optimizedCoords.map(
      (coord) =>
        validWorkOrders.find(
          (wo) =>
            wo.service_latitude === coord.lat &&
            wo.service_longitude === coord.lng,
        )!,
    );

    setOrderedWorkOrders(optimized);
    onRouteChange?.(optimized);
  }, [validWorkOrders, startLocation, onRouteChange]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) return;

    const newOrder = [...orderedWorkOrders];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, removed);

    setOrderedWorkOrders(newOrder);
    setDragIndex(null);
    onRouteChange?.(newOrder);
  };

  return (
    <div className={`flex gap-4 ${className}`}>
      {/* Map */}
      <div
        className="flex-1 relative rounded-xl overflow-hidden shadow-lg"
        style={{ height }}
      >
        <MapContainer
          center={[29.4252, -98.4946]}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />

          <MapBoundsUpdater stops={routeStops} startLocation={startLocation} />

          {/* Route line */}
          {routePositions.length > 1 && (
            <Polyline
              positions={routePositions}
              pathOptions={{
                color: "#3b82f6",
                weight: 4,
                opacity: 0.8,
              }}
            />
          )}

          {/* Start location marker */}
          {startLocation && (
            <Marker
              position={[startLocation.lat, startLocation.lng]}
              icon={createStartMarker()}
              zIndexOffset={1000}
            >
              <Popup>
                <div className="text-center">
                  <strong className="block">Start Location</strong>
                  <span className="text-xs text-gray-500">
                    {startTime.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Stop markers */}
          {routeStops.map((stop, index) => {
            const isSelected = index === selectedStopIndex;
            const markerIcon = createNumberedMarker(
              stop.order,
              STATUS_COLORS[stop.workOrder.status],
              isSelected,
            );

            return (
              <Marker
                key={stop.id}
                position={[
                  stop.workOrder.service_latitude!,
                  stop.workOrder.service_longitude!,
                ]}
                icon={markerIcon}
                eventHandlers={{
                  click: () => setSelectedStopIndex(index),
                }}
              >
                <Popup>
                  <div className="min-w-[180px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold">#{stop.order}</span>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${STATUS_COLORS[stop.workOrder.status]}20`,
                          color: STATUS_COLORS[stop.workOrder.status],
                        }}
                      >
                        {WORK_ORDER_STATUS_LABELS[stop.workOrder.status]}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900">
                      {stop.workOrder.customer_name || "Unknown"}
                    </h4>
                    {stop.workOrder.service_address_line1 && (
                      <p className="text-sm text-gray-600">
                        {stop.workOrder.service_address_line1}
                      </p>
                    )}
                    {stop.arrivalTime && (
                      <p className="text-xs text-blue-600 mt-2">
                        ETA: {stop.arrivalTime}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Stats overlay */}
        {showStats && (
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-4 py-3 z-[1000]">
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-gray-500">Stops:</span>{" "}
                <span className="font-semibold">{routeStats.stopCount}</span>
              </div>
              <div>
                <span className="text-gray-500">Distance:</span>{" "}
                <span className="font-semibold">
                  {formatDistance(routeStats.totalDistance)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Time:</span>{" "}
                <span className="font-semibold">
                  {formatDuration(routeStats.totalDuration)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Optimize button */}
        {startLocation && (
          <button
            onClick={handleOptimize}
            className="absolute top-4 right-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-[1000] flex items-center gap-2 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
            </svg>
            Optimize Route
          </button>
        )}
      </div>

      {/* Route List */}
      {showRouteList && (
        <div
          className="w-80 bg-gray-50 rounded-xl p-4 overflow-y-auto"
          style={{ height }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Route Order</h3>
            {enableReordering && (
              <span className="text-xs text-gray-500">Drag to reorder</span>
            )}
          </div>

          {routeStops.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mx-auto mb-2 text-gray-400"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <p className="text-sm">No stops to display</p>
            </div>
          ) : (
            <div className="pt-2">
              {routeStops.map((stop, index) => (
                <RouteListItem
                  key={stop.id}
                  stop={stop}
                  isFirst={index === 0}
                  isLast={index === routeStops.length - 1}
                  isDragging={dragIndex === index}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => setSelectedStopIndex(index)}
                  isSelected={index === selectedStopIndex}
                  enableReordering={enableReordering}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RouteOptimizer;
