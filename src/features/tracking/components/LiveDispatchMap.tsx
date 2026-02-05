/**
 * Live Dispatch Map Component
 * Real-time map showing technician locations, work orders, and geofences
 */

import { useState, useEffect, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import { cn } from "@/lib/utils.ts";
import {
  useDispatchMapData,
  useLocationHistory,
} from "@/hooks/useGPSTracking.ts";
import type {
  DispatchMapTechnician,
  DispatchMapWorkOrder,
  DispatchMapVehicle,
  Geofence,
} from "@/api/types/gpsTracking.ts";
import {
  MapPin,
  Truck,
  User,
  Clock,
  Battery,
  Navigation,
  AlertTriangle,
  Phone,
  ChevronRight,
  RefreshCw,
  Layers,
  EyeOff,
} from "lucide-react";

// Custom marker icons
const createTechnicianIcon = (status: string, isStale: boolean) => {
  const color = isStale
    ? "#9CA3AF"
    : status === "en_route"
      ? "#3B82F6"
      : status === "on_site"
        ? "#10B981"
        : "#6B7280";
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background-color: ${color};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
};

const VEHICLE_STATUS_COLORS: Record<string, string> = {
  moving: "#10b981",
  idling: "#eab308",
  stopped: "#ef4444",
  offline: "#9ca3af",
};

const createVehicleIcon = (status: string) => {
  const color = VEHICLE_STATUS_COLORS[status] || "#9ca3af";
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background-color: ${color};
        width: 34px;
        height: 34px;
        border-radius: 6px;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(0deg);
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="0.5">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -19],
  });
};

const createWorkOrderIcon = (status: string, priority: string) => {
  const color =
    priority === "urgent"
      ? "#EF4444"
      : priority === "high"
        ? "#F59E0B"
        : "#6B7280";
  const fill =
    status === "completed"
      ? "#10B981"
      : status === "in_progress"
        ? "#3B82F6"
        : color;
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background-color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid ${fill};
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="${fill}">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3" fill="white"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

interface MapControllerProps {
  center: [number, number];
  zoom: number;
}

function MapController({ center, zoom }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);

  return null;
}

interface TechnicianPopupProps {
  technician: DispatchMapTechnician;
  onViewHistory?: (techId: number) => void;
}

function TechnicianPopup({ technician, onViewHistory }: TechnicianPopupProps) {
  const statusColors: Record<string, string> = {
    available: "bg-gray-500",
    en_route: "bg-blue-500",
    on_site: "bg-green-500",
    break: "bg-yellow-500",
  };

  return (
    <div className="min-w-[240px]">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn(
            "w-3 h-3 rounded-full",
            statusColors[technician.status] || "bg-gray-400",
          )}
        />
        <span className="font-semibold text-gray-900">{technician.name}</span>
      </div>

      <div className="space-y-1 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4" />
          <span className="capitalize">
            {technician.status.replace("_", " ")}
          </span>
        </div>

        {technician.speed !== undefined && technician.speed > 0 && (
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            <span>{Math.round(technician.speed)} mph</span>
          </div>
        )}

        {technician.battery_level !== undefined && (
          <div className="flex items-center gap-2">
            <Battery
              className={cn(
                "w-4 h-4",
                technician.battery_level < 20 ? "text-red-500" : "",
              )}
            />
            <span>{technician.battery_level}%</span>
          </div>
        )}

        {technician.current_job_address && (
          <div className="flex items-start gap-2 mt-2 pt-2 border-t">
            <MapPin className="w-4 h-4 mt-0.5" />
            <span className="text-xs">{technician.current_job_address}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
          <Clock className="w-3 h-3" />
          <span>
            Updated {new Date(technician.last_updated).toLocaleTimeString()}
          </span>
          {technician.is_stale && (
            <AlertTriangle className="w-3 h-3 text-yellow-500" />
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-3 pt-2 border-t">
        <button
          onClick={() => onViewHistory?.(technician.id)}
          className="flex-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center justify-center gap-1"
        >
          <Clock className="w-3 h-3" /> History
        </button>
        <a
          href={`tel:${technician.id}`}
          className="flex-1 px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100 flex items-center justify-center gap-1"
        >
          <Phone className="w-3 h-3" /> Call
        </a>
      </div>
    </div>
  );
}

interface WorkOrderPopupProps {
  workOrder: DispatchMapWorkOrder;
  onViewDetails?: (woId: number) => void;
}

function WorkOrderPopup({ workOrder, onViewDetails }: WorkOrderPopupProps) {
  const priorityColors: Record<string, string> = {
    urgent: "bg-red-500",
    high: "bg-orange-500",
    normal: "bg-gray-500",
    low: "bg-blue-500",
  };

  return (
    <div className="min-w-[220px]">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-gray-900">WO #{workOrder.id}</span>
        <span
          className={cn(
            "px-2 py-0.5 rounded text-xs text-white",
            priorityColors[workOrder.priority] || "bg-gray-500",
          )}
        >
          {workOrder.priority}
        </span>
      </div>

      <div className="space-y-1 text-sm text-gray-600">
        <div className="font-medium">{workOrder.customer_name}</div>
        <div className="text-xs">{workOrder.address}</div>
        <div className="text-xs text-gray-500">{workOrder.service_type}</div>

        {workOrder.scheduled_time && (
          <div className="flex items-center gap-1 text-xs">
            <Clock className="w-3 h-3" />
            {new Date(workOrder.scheduled_time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}

        {workOrder.assigned_technician_name && (
          <div className="flex items-center gap-1 text-xs mt-1">
            <User className="w-3 h-3" />
            {workOrder.assigned_technician_name}
          </div>
        )}
      </div>

      <button
        onClick={() => onViewDetails?.(workOrder.id)}
        className="w-full mt-3 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-1"
      >
        View Details <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}

interface VehiclePopupProps {
  vehicle: DispatchMapVehicle;
}

function VehiclePopup({ vehicle }: VehiclePopupProps) {
  const statusLabels: Record<string, string> = {
    moving: "Moving",
    idling: "Idling",
    stopped: "Stopped",
    offline: "Offline",
  };
  const statusColors: Record<string, string> = {
    moving: "bg-green-500",
    idling: "bg-yellow-500",
    stopped: "bg-red-500",
    offline: "bg-gray-400",
  };

  return (
    <div className="min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn(
            "w-3 h-3 rounded-full",
            statusColors[vehicle.status] || "bg-gray-400",
          )}
        />
        <span className="font-semibold text-gray-900">{vehicle.name}</span>
      </div>

      <div className="space-y-1 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4" />
          <span>{statusLabels[vehicle.status] || vehicle.status}</span>
        </div>

        {vehicle.speed > 0 && (
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            <span>{Math.round(vehicle.speed)} mph</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
          <Clock className="w-3 h-3" />
          <span>
            Updated {new Date(vehicle.updated_at).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t">
        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
          Samsara GPS
        </span>
      </div>
    </div>
  );
}

interface LiveDispatchMapProps {
  className?: string;
  onTechnicianSelect?: (techId: number) => void;
  onWorkOrderSelect?: (woId: number) => void;
}

export function LiveDispatchMap({
  className,
  onTechnicianSelect: _onTechnicianSelect,
  onWorkOrderSelect,
}: LiveDispatchMapProps) {
  const [showTechnicians, setShowTechnicians] = useState(true);
  const [showWorkOrders, setShowWorkOrders] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showGeofences, setShowGeofences] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<
    number | null
  >(null);
  const [showHistory, setShowHistory] = useState(false);

  const {
    data: mapData,
    isLoading,
    refetch,
    dataUpdatedAt,
  } = useDispatchMapData();
  const { data: historyData } = useLocationHistory(
    selectedTechnicianId || 0,
    undefined,
    undefined,
  );

  const handleViewHistory = useCallback((techId: number) => {
    setSelectedTechnicianId(techId);
    setShowHistory(true);
  }, []);

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-[500px] bg-gray-100 rounded-lg",
          className,
        )}
      >
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading map data...</span>
        </div>
      </div>
    );
  }

  const center: [number, number] = [
    mapData?.center_latitude || 32.0,
    mapData?.center_longitude || -96.0,
  ];

  return (
    <div className={cn("relative", className)}>
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <div className="bg-white rounded-lg shadow-lg p-2 space-y-2">
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-gray-100 rounded flex items-center gap-2 text-sm"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <div className="border-t pt-2">
            <button
              onClick={() => setShowTechnicians(!showTechnicians)}
              className={cn(
                "p-2 rounded flex items-center gap-2 text-sm w-full",
                showTechnicians
                  ? "bg-blue-50 text-blue-600"
                  : "hover:bg-gray-100",
              )}
              title="Toggle Technicians"
            >
              <Truck className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowWorkOrders(!showWorkOrders)}
              className={cn(
                "p-2 rounded flex items-center gap-2 text-sm w-full",
                showWorkOrders
                  ? "bg-green-50 text-green-600"
                  : "hover:bg-gray-100",
              )}
              title="Toggle Work Orders"
            >
              <MapPin className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowVehicles(!showVehicles)}
              className={cn(
                "p-2 rounded flex items-center gap-2 text-sm w-full",
                showVehicles
                  ? "bg-emerald-50 text-emerald-600"
                  : "hover:bg-gray-100",
              )}
              title="Toggle Vehicles (Samsara)"
            >
              <Navigation className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowGeofences(!showGeofences)}
              className={cn(
                "p-2 rounded flex items-center gap-2 text-sm w-full",
                showGeofences
                  ? "bg-purple-50 text-purple-600"
                  : "hover:bg-gray-100",
              )}
              title="Toggle Geofences"
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overlay */}
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-green-500" />
            <span>
              {mapData?.vehicles?.filter((v) => v.status !== "offline").length || 0} Vehicles
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>
              {mapData?.technicians.filter((t) => !t.is_stale).length || 0}{" "}
              Techs
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span>{mapData?.work_orders.length || 0} Jobs</span>
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={center}
        zoom={mapData?.zoom_level || 10}
        className="h-[600px] rounded-lg"
        style={{ zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController center={center} zoom={mapData?.zoom_level || 10} />

        {/* Geofences */}
        {showGeofences &&
          mapData?.geofences.map(
            (geofence: Geofence) =>
              geofence.center_latitude &&
              geofence.center_longitude &&
              geofence.radius_meters && (
                <Circle
                  key={geofence.id}
                  center={[geofence.center_latitude, geofence.center_longitude]}
                  radius={geofence.radius_meters}
                  pathOptions={{
                    color:
                      geofence.geofence_type === "office"
                        ? "#3B82F6"
                        : geofence.geofence_type === "customer_site"
                          ? "#10B981"
                          : "#9333EA",
                    fillOpacity: 0.1,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <div className="font-semibold">{geofence.name}</div>
                      <div className="text-gray-500 capitalize">
                        {geofence.geofence_type.replace("_", " ")}
                      </div>
                    </div>
                  </Popup>
                </Circle>
              ),
          )}

        {/* Work Orders */}
        {showWorkOrders &&
          mapData?.work_orders.map((wo: DispatchMapWorkOrder) => (
            <Marker
              key={`wo-${wo.id}`}
              position={[wo.latitude, wo.longitude]}
              icon={createWorkOrderIcon(wo.status, wo.priority)}
            >
              <Popup>
                <WorkOrderPopup
                  workOrder={wo}
                  onViewDetails={onWorkOrderSelect}
                />
              </Popup>
            </Marker>
          ))}

        {/* Technicians */}
        {showTechnicians &&
          mapData?.technicians.map((tech: DispatchMapTechnician) => (
            <Marker
              key={`tech-${tech.id}`}
              position={[tech.latitude, tech.longitude]}
              icon={createTechnicianIcon(tech.status, tech.is_stale)}
            >
              <Popup>
                <TechnicianPopup
                  technician={tech}
                  onViewHistory={handleViewHistory}
                />
              </Popup>
            </Marker>
          ))}

        {/* Samsara Vehicles */}
        {showVehicles &&
          mapData?.vehicles?.map((vehicle: DispatchMapVehicle) => (
            <Marker
              key={`veh-${vehicle.id}`}
              position={[vehicle.latitude, vehicle.longitude]}
              icon={createVehicleIcon(vehicle.status)}
            >
              <Popup>
                <VehiclePopup vehicle={vehicle} />
              </Popup>
            </Marker>
          ))}

        {/* Location History Trail */}
        {showHistory &&
          historyData?.points &&
          historyData.points.length > 1 && (
            <Polyline
              positions={historyData.points.map((p) => [
                p.latitude,
                p.longitude,
              ])}
              pathOptions={{
                color: "#3B82F6",
                weight: 3,
                opacity: 0.7,
                dashArray: "5, 10",
              }}
            />
          )}
      </MapContainer>

      {/* History Panel */}
      {showHistory && selectedTechnicianId && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">Route History</h4>
            <button
              onClick={() => setShowHistory(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
          {historyData ? (
            <div className="text-sm space-y-1">
              <div>
                Distance: {historyData.total_distance_miles.toFixed(1)} miles
              </div>
              <div>Duration: {historyData.total_duration_minutes} minutes</div>
              {historyData.average_speed_mph && (
                <div>
                  Avg Speed: {historyData.average_speed_mph.toFixed(1)} mph
                </div>
              )}
              <div className="text-xs text-gray-400">
                {historyData.points.length} points
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Loading history...</div>
          )}
        </div>
      )}
    </div>
  );
}

export default LiveDispatchMap;
