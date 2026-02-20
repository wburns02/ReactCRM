/**
 * DispatchMap — all Leaflet rendering for the CommandCenter.
 * Extracted from CommandCenter.tsx to keep map concerns isolated.
 */
import { useMemo, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import {
  type WorkOrder,
  type JobType,
  JOB_TYPE_LABELS,
} from "@/api/types/workOrder.ts";
import type { Technician } from "@/api/types/technician.ts";

// Fix Leaflet default marker icon issue - DISABLE default markers entirely
// We only use custom DivIcon markers for technicians
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  iconRetinaUrl:
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  shadowUrl: "",
});

// San Marcos, TX center (company location)
const COMPANY_CENTER: [number, number] = [29.8833, -97.9414];

// ============================================
// Technician Status Types
// ============================================
export type TechnicianStatus = "available" | "busy" | "offline";

export interface TechnicianWithStatus extends Technician {
  status: TechnicianStatus;
  currentJob?: WorkOrder;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create custom colored marker icon for technicians
 */
function createTechnicianIcon(
  status: TechnicianStatus,
  initials: string = "T",
  isDropTarget: boolean = false,
): L.DivIcon {
  const colors: Record<TechnicianStatus, string> = {
    available: "#22c55e", // green
    busy: "#f59e0b", // yellow/amber
    offline: "#6b7280", // gray
  };

  const borderColor = isDropTarget ? "#3b82f6" : "white";
  const borderWidth = isDropTarget ? "4px" : "3px";
  const scale = isDropTarget ? "scale(1.2)" : "scale(1)";
  const boxShadow = isDropTarget
    ? "0 0 20px rgba(59, 130, 246, 0.8), 0 2px 8px rgba(0,0,0,0.5)"
    : "0 2px 8px rgba(0,0,0,0.5)";

  return L.divIcon({
    className: "technician-marker",
    html: `
      <div style="
        background-color: ${colors[status]};
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: ${borderWidth} solid ${borderColor};
        box-shadow: ${boxShadow};
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
        transform: ${scale};
      ">${initials}</div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}

/**
 * Generate deterministic mock coordinates for technicians without lat/lng
 */
function generateTechCoordinates(tech: Technician): [number, number] {
  if (tech.home_latitude && tech.home_longitude) {
    return [tech.home_latitude, tech.home_longitude];
  }
  // Generate based on ID
  const seedNum =
    typeof tech.id === "string"
      ? parseInt(tech.id, 10) || tech.id.length
      : Number(tech.id);
  const latOffset = (((seedNum * 13) % 60) - 30) / 1000;
  const lngOffset = (((seedNum * 23) % 60) - 30) / 1000;
  return [COMPANY_CENTER[0] + latOffset, COMPANY_CENTER[1] + lngOffset];
}

// ============================================
// Leaflet Sub-Components
// ============================================

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useMemo(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [map, bounds]);
  return null;
}

/**
 * Technician Marker on Map - ONLY technicians, with drop target support
 */
function TechnicianMapMarker({
  tech,
  isDropTarget,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  tech: TechnicianWithStatus;
  isDropTarget: boolean;
  onDragOver: (techId: string) => void;
  onDragLeave: () => void;
  onDrop: (techId: string) => void;
}) {
  const position = generateTechCoordinates(tech);
  const initials = `${tech.first_name?.[0] || ""}${tech.last_name?.[0] || ""}`;
  const icon = createTechnicianIcon(tech.status, initials, isDropTarget);
  const markerRef = useRef<L.Marker>(null);

  // Set up drop zone on the marker's DOM element
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const element = marker.getElement();
    if (!element) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }
      onDragOver(tech.id);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDragLeave();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDrop(tech.id);
    };

    element.addEventListener("dragover", handleDragOver);
    element.addEventListener("dragleave", handleDragLeave);
    element.addEventListener("drop", handleDrop);

    return () => {
      element.removeEventListener("dragover", handleDragOver);
      element.removeEventListener("dragleave", handleDragLeave);
      element.removeEventListener("drop", handleDrop);
    };
  }, [tech.id, onDragOver, onDragLeave, onDrop]);

  return (
    <Marker ref={markerRef} position={position} icon={icon}>
      <Popup>
        <div className="min-w-[220px] p-1">
          <div className="flex items-center gap-2 mb-3">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                tech.status === "available" && "bg-green-500",
                tech.status === "busy" && "bg-yellow-500",
                tech.status === "offline" && "bg-gray-400",
              )}
            >
              {initials}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {tech.first_name} {tech.last_name}
              </h3>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full capitalize",
                  tech.status === "available" && "bg-green-100 text-green-700",
                  tech.status === "busy" && "bg-yellow-100 text-yellow-700",
                  tech.status === "offline" && "bg-gray-100 text-gray-600",
                )}
              >
                {tech.status}
              </span>
            </div>
          </div>

          {tech.phone && (
            <p className="text-sm text-gray-600 mb-2">📞 {tech.phone}</p>
          )}

          {tech.skills && tech.skills.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-gray-500 mb-1">Skills:</p>
              <div className="flex flex-wrap gap-1">
                {tech.skills.slice(0, 3).map((skill, i) => (
                  <span
                    key={i}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
                  >
                    {typeof skill === "string"
                      ? skill
                      : (skill as { name: string }).name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {tech.currentJob && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <p className="font-medium text-yellow-800">📋 Current Job:</p>
              <p className="text-yellow-700">
                {tech.currentJob.customer_name || `WO #${tech.currentJob.id}`}
              </p>
              <p className="text-yellow-600">
                {JOB_TYPE_LABELS[tech.currentJob.job_type as JobType]}
              </p>
            </div>
          )}

          {tech.assigned_vehicle && (
            <p className="text-xs text-gray-500 mt-2">
              🚐 {tech.assigned_vehicle}
            </p>
          )}

          {tech.status === "available" && (
            <div className="mt-3 pt-2 border-t border-gray-200">
              <p className="text-xs text-green-600 font-medium">
                ✓ Ready for assignment - drag a job here
              </p>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

// ============================================
// Exported Map Component
// ============================================

/**
 * Live Technician Map Section - ONLY shows technician markers
 */
export function LiveTechnicianMap({
  technicians,
  isLoading,
  dropTargetTechId,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  technicians: TechnicianWithStatus[];
  isLoading: boolean;
  dropTargetTechId: string | null;
  onDragOver: (techId: string) => void;
  onDragLeave: () => void;
  onDrop: (techId: string) => void;
}) {
  const bounds = useMemo(() => {
    if (technicians.length === 0) return null;
    const points = technicians.map((t) => generateTechCoordinates(t));
    if (points.length === 1) {
      return L.latLngBounds(
        [points[0][0] - 0.05, points[0][1] - 0.05],
        [points[0][0] + 0.05, points[0][1] + 0.05],
      );
    }
    return L.latLngBounds(points);
  }, [technicians]);

  if (isLoading) {
    return (
      <Card className="h-[400px]">
        <CardHeader>
          <CardTitle>Live Technician Map</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <Skeleton className="w-full h-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const statusCounts = {
    available: technicians.filter((t) => t.status === "available").length,
    busy: technicians.filter((t) => t.status === "busy").length,
    offline: technicians.filter((t) => t.status === "offline").length,
  };

  return (
    <Card
      className={cn(
        "h-[400px] transition-all",
        dropTargetTechId && "ring-2 ring-blue-500 ring-offset-2",
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Live Technician Map</CardTitle>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success" />
              Available ({statusCounts.available})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-warning" />
              Busy ({statusCounts.busy})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-text-muted" />
              Offline ({statusCounts.offline})
            </span>
          </div>
        </div>
        {dropTargetTechId && (
          <p className="text-xs text-blue-600 font-medium mt-1 animate-pulse">
            Drop on a technician to assign the job
          </p>
        )}
      </CardHeader>
      <CardContent className="h-[320px] p-0">
        <div className="h-full rounded-b-lg overflow-hidden">
          <MapContainer
            center={COMPANY_CENTER}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds bounds={bounds} />
            {/* ONLY render technician markers - NO customer markers */}
            {technicians.map((tech) => (
              <TechnicianMapMarker
                key={tech.id}
                tech={tech}
                isDropTarget={dropTargetTechId === tech.id}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              />
            ))}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
