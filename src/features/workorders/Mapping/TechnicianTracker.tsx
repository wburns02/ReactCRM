/**
 * TechnicianTracker Component
 * Shows live technician locations with avatars, status, and position updates
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import type { WorkOrder } from '@/api/types/workOrder';
import { STATUS_COLORS } from '@/api/types/workOrder';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

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

export interface TechnicianPosition {
  lat: number;
  lng: number;
  timestamp: string;
  heading?: number;
  speed?: number; // km/h
  accuracy?: number; // meters
}

export interface TrackedTechnician {
  id: string;
  name: string;
  avatarUrl?: string;
  phone?: string;
  status: 'active' | 'idle' | 'offline' | 'on_break';
  currentPosition: TechnicianPosition | null;
  positionHistory: TechnicianPosition[];
  currentWorkOrderId?: string;
  assignedWorkOrders?: WorkOrder[];
  vehicleInfo?: {
    id: string;
    name: string;
    licensePlate?: string;
  };
}

export interface TechnicianTrackerProps {
  /** Technicians to track */
  technicians: TrackedTechnician[];
  /** Update interval in ms (default: 15000) */
  updateInterval?: number;
  /** Callback when technician is clicked */
  onTechnicianClick?: (technician: TrackedTechnician) => void;
  /** Show position trail/history */
  showTrail?: boolean;
  /** Trail length (number of positions to show) */
  trailLength?: number;
  /** Map height */
  height?: string;
  /** Initial center */
  center?: { lat: number; lng: number };
  /** Initial zoom */
  zoom?: number;
  /** Show technician info cards */
  showInfoCards?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Fetch function for position updates */
  onRequestUpdate?: () => Promise<TrackedTechnician[]>;
}

// ============================================
// Status Colors
// ============================================

const TECHNICIAN_STATUS_COLORS = {
  active: '#22c55e',
  idle: '#f59e0b',
  offline: '#6b7280',
  on_break: '#8b5cf6',
} as const;

const TECHNICIAN_STATUS_LABELS = {
  active: 'Active',
  idle: 'Idle',
  offline: 'Offline',
  on_break: 'On Break',
} as const;

// ============================================
// Custom Marker Icons
// ============================================

function createTechnicianMarker(
  technician: TrackedTechnician,
  isSelected = false
): L.DivIcon {
  const color = TECHNICIAN_STATUS_COLORS[technician.status];
  const size = isSelected ? 56 : 48;
  const innerSize = size - 12;
  const heading = technician.currentPosition?.heading || 0;

  return L.divIcon({
    className: 'technician-marker',
    html: `
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
      ">
        <!-- Outer ring with heading indicator -->
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${heading}deg);
          ${technician.status === 'active' ? 'animation: techPulse 2s ease-in-out infinite;' : ''}
        ">
          <!-- Direction arrow -->
          ${technician.currentPosition?.speed && technician.currentPosition.speed > 2 ? `
            <div style="
              position: absolute;
              top: -6px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-bottom: 10px solid ${color};
            "></div>
          ` : ''}
        </div>

        <!-- Avatar or icon -->
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: ${innerSize}px;
          height: ${innerSize}px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        ">
          ${technician.avatarUrl
            ? `<img src="${technician.avatarUrl}" alt="${technician.name}" style="
                width: 100%;
                height: 100%;
                object-fit: cover;
              "/>`
            : `<svg width="${innerSize * 0.6}" height="${innerSize * 0.6}" viewBox="0 0 24 24" fill="${color}">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>`
          }
        </div>

        <!-- Speed indicator -->
        ${technician.currentPosition?.speed && technician.currentPosition.speed > 2 ? `
          <div style="
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            border-radius: 10px;
            padding: 1px 6px;
            font-size: 10px;
            font-weight: 600;
            color: ${color};
            box-shadow: 0 2px 4px rgba(0,0,0,0.15);
            white-space: nowrap;
          ">
            ${Math.round(technician.currentPosition.speed)} mph
          </div>
        ` : ''}
      </div>

      <style>
        @keyframes techPulse {
          0%, 100% { box-shadow: 0 4px 12px rgba(34, 197, 94, 0.25); }
          50% { box-shadow: 0 4px 24px rgba(34, 197, 94, 0.45); }
        }
      </style>
    `,
    iconSize: [size, size + 16],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

// ============================================
// Map Bounds Component
// ============================================

function MapBoundsUpdater({ technicians }: { technicians: TrackedTechnician[] }) {
  const map = useMap();

  useEffect(() => {
    const validTechnicians = technicians.filter((t) => t.currentPosition);
    if (validTechnicians.length > 0) {
      const bounds = L.latLngBounds(
        validTechnicians.map((t) => [t.currentPosition!.lat, t.currentPosition!.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, []);

  return null;
}

// ============================================
// Technician Popup Content
// ============================================

function TechnicianPopupContent({
  technician,
  onViewJobs,
}: {
  technician: TrackedTechnician;
  onViewJobs?: () => void;
}) {
  const statusColor = TECHNICIAN_STATUS_COLORS[technician.status];
  const statusLabel = TECHNICIAN_STATUS_LABELS[technician.status];

  return (
    <div className="min-w-[220px]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {technician.avatarUrl ? (
          <img
            src={technician.avatarUrl}
            alt={technician.name}
            className="w-12 h-12 rounded-full object-cover border-2"
            style={{ borderColor: statusColor }}
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${statusColor}20` }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill={statusColor}>
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        )}
        <div>
          <h3 className="font-semibold text-gray-900">{technician.name}</h3>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: statusColor }}
            />
            <span className="text-xs font-medium" style={{ color: statusColor }}>
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      {technician.currentPosition && (
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
          {technician.currentPosition.speed !== undefined && (
            <div>
              <span className="text-gray-400">Speed:</span>{' '}
              <span className="font-medium">{Math.round(technician.currentPosition.speed)} mph</span>
            </div>
          )}
          {technician.currentPosition.accuracy && (
            <div>
              <span className="text-gray-400">Accuracy:</span>{' '}
              <span className="font-medium">{Math.round(technician.currentPosition.accuracy)}m</span>
            </div>
          )}
        </div>
      )}

      {/* Vehicle Info */}
      {technician.vehicleInfo && (
        <div className="text-xs text-gray-600 mb-3 pb-3 border-b">
          <span className="text-gray-400">Vehicle:</span>{' '}
          <span className="font-medium">{technician.vehicleInfo.name}</span>
          {technician.vehicleInfo.licensePlate && (
            <span className="ml-1 text-gray-400">({technician.vehicleInfo.licensePlate})</span>
          )}
        </div>
      )}

      {/* Assigned Jobs */}
      {technician.assignedWorkOrders && technician.assignedWorkOrders.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-400 mb-1">Assigned Jobs:</p>
          <div className="space-y-1">
            {technician.assignedWorkOrders.slice(0, 3).map((wo) => (
              <div key={wo.id} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[wo.status] }}
                />
                <span className="truncate flex-1">
                  {wo.customer_name || wo.service_address_line1}
                </span>
              </div>
            ))}
            {technician.assignedWorkOrders.length > 3 && (
              <p className="text-xs text-gray-400">
                +{technician.assignedWorkOrders.length - 3} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Last Updated */}
      {technician.currentPosition && (
        <p className="text-xs text-gray-400">
          Updated {new Date(technician.currentPosition.timestamp).toLocaleTimeString()}
        </p>
      )}

      {/* Actions */}
      {onViewJobs && (
        <button
          onClick={onViewJobs}
          className="mt-3 w-full px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded hover:bg-blue-100 transition-colors"
        >
          View Assigned Jobs
        </button>
      )}
    </div>
  );
}

// ============================================
// Info Card Component
// ============================================

function TechnicianInfoCard({
  technician,
  isSelected,
  onClick,
}: {
  technician: TrackedTechnician;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const statusColor = TECHNICIAN_STATUS_COLORS[technician.status];

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
        isSelected ? 'bg-blue-50 ring-2 ring-blue-500' : 'bg-white hover:bg-gray-50'
      }`}
    >
      {/* Avatar */}
      <div className="relative">
        {technician.avatarUrl ? (
          <img
            src={technician.avatarUrl}
            alt={technician.name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${statusColor}20` }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={statusColor}>
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        )}
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
          style={{ backgroundColor: statusColor }}
        />
      </div>

      {/* Info */}
      <div className="text-left flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{technician.name}</p>
        <p className="text-xs text-gray-500">
          {technician.assignedWorkOrders?.length || 0} jobs assigned
        </p>
      </div>

      {/* Speed */}
      {technician.currentPosition?.speed && technician.currentPosition.speed > 2 && (
        <span className="text-xs font-medium text-gray-500">
          {Math.round(technician.currentPosition.speed)} mph
        </span>
      )}
    </button>
  );
}

// ============================================
// Main TechnicianTracker Component
// ============================================

export function TechnicianTracker({
  technicians: initialTechnicians,
  updateInterval = 15000,
  onTechnicianClick,
  showTrail = false,
  trailLength = 10,
  height = '500px',
  center = { lat: 29.4252, lng: -98.4946 },
  zoom = 11,
  showInfoCards = true,
  className = '',
  onRequestUpdate,
}: TechnicianTrackerProps) {
  const [technicians, setTechnicians] = useState(initialTechnicians);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Update technicians when prop changes
  useEffect(() => {
    setTechnicians(initialTechnicians);
  }, [initialTechnicians]);

  // Periodic updates
  useEffect(() => {
    if (!onRequestUpdate) return;

    const interval = setInterval(async () => {
      try {
        const updated = await onRequestUpdate();
        setTechnicians(updated);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Failed to update technician positions:', error);
      }
    }, updateInterval);

    return () => clearInterval(interval);
  }, [updateInterval, onRequestUpdate]);

  // Handle technician click
  const handleTechnicianClick = useCallback(
    (technician: TrackedTechnician) => {
      setSelectedTechId(technician.id);
      onTechnicianClick?.(technician);
    },
    [onTechnicianClick]
  );

  // Get technicians with valid positions
  const validTechnicians = useMemo(
    () => technicians.filter((t) => t.currentPosition),
    [technicians]
  );

  // Online/Offline counts
  const onlineCount = technicians.filter((t) => t.status !== 'offline').length;
  const activeCount = technicians.filter((t) => t.status === 'active').length;

  return (
    <div className={`flex gap-4 ${className}`}>
      {/* Map */}
      <div
        className="flex-1 relative rounded-xl overflow-hidden shadow-lg"
        style={{ height }}
      >
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          <MapBoundsUpdater technicians={validTechnicians} />

          {/* Position trails */}
          {showTrail &&
            validTechnicians.map((tech) => {
              if (tech.positionHistory.length < 2) return null;
              const positions = tech.positionHistory
                .slice(-trailLength)
                .map((p) => [p.lat, p.lng] as [number, number]);
              return (
                <Polyline
                  key={`trail-${tech.id}`}
                  positions={positions}
                  pathOptions={{
                    color: TECHNICIAN_STATUS_COLORS[tech.status],
                    weight: 3,
                    opacity: 0.5,
                    dashArray: '6, 6',
                  }}
                />
              );
            })}

          {/* Technician markers */}
          {validTechnicians.map((tech) => {
            const isSelected = tech.id === selectedTechId;
            const markerIcon = createTechnicianMarker(tech, isSelected);

            return (
              <Marker
                key={tech.id}
                position={[tech.currentPosition!.lat, tech.currentPosition!.lng]}
                icon={markerIcon}
                eventHandlers={{
                  click: () => handleTechnicianClick(tech),
                }}
              >
                <Popup>
                  <TechnicianPopupContent
                    technician={tech}
                    onViewJobs={() => handleTechnicianClick(tech)}
                  />
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Status indicator */}
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2 z-[1000]">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-gray-700">
                <strong>{activeCount}</strong> active
              </span>
            </div>
            <div className="text-gray-400">|</div>
            <div className="text-gray-600">
              <strong>{onlineCount}</strong>/{technicians.length} online
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Updated {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Info Cards Sidebar */}
      {showInfoCards && (
        <div
          className="w-72 bg-gray-50 rounded-xl p-3 overflow-y-auto"
          style={{ height }}
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-3 px-1">
            Field Technicians ({technicians.length})
          </h3>
          <div className="space-y-2">
            {technicians.map((tech) => (
              <TechnicianInfoCard
                key={tech.id}
                technician={tech}
                isSelected={tech.id === selectedTechId}
                onClick={() => handleTechnicianClick(tech)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TechnicianTracker;
