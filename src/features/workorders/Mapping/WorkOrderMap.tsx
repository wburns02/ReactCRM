/**
 * WorkOrderMap Component
 * Full map displaying all work orders as markers with status colors and selection
 */
import { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import * as L from 'leaflet';
import type { WorkOrder, WorkOrderStatus } from '@/api/types/workOrder';
import { STATUS_COLORS, WORK_ORDER_STATUS_LABELS } from '@/api/types/workOrder';
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

export interface TechnicianLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'active' | 'idle' | 'offline';
  avatarUrl?: string;
  currentWorkOrderId?: string;
}

export interface WorkOrderMapProps {
  /** Work orders to display on the map */
  workOrders: WorkOrder[];
  /** Currently selected work order ID */
  selectedId?: string | null;
  /** Callback when a work order is selected */
  onSelect?: (workOrder: WorkOrder) => void;
  /** Show technician locations on map */
  showTechnicians?: boolean;
  /** Technician locations (if showTechnicians is true) */
  technicians?: TechnicianLocation[];
  /** Map height */
  height?: string;
  /** Initial center coordinates */
  center?: { lat: number; lng: number };
  /** Initial zoom level */
  zoom?: number;
  /** Show legend */
  showLegend?: boolean;
  /** Filter by status */
  statusFilter?: WorkOrderStatus[];
  /** Custom CSS class */
  className?: string;
  /** Callback when map is clicked (not on a marker) */
  onMapClick?: (lat: number, lng: number) => void;
}

// ============================================
// Custom Marker Icons
// ============================================

function createWorkOrderMarker(status: WorkOrderStatus, isSelected = false): L.DivIcon {
  const color = STATUS_COLORS[status] || '#6b7280';
  const size = isSelected ? 40 : 32;
  const borderWidth = isSelected ? 4 : 3;
  const shadow = isSelected ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.3)';

  return L.divIcon({
    className: 'work-order-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        border: ${borderWidth}px solid white;
        box-shadow: ${shadow};
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        ${isSelected ? 'transform: scale(1.1);' : ''}
      ">
        <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="white">
          <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function createTechnicianMarker(status: TechnicianLocation['status'], avatarUrl?: string): L.DivIcon {
  const statusColors = {
    active: '#22c55e',
    idle: '#f59e0b',
    offline: '#6b7280',
  };
  const color = statusColors[status];

  return L.divIcon({
    className: 'technician-marker',
    html: `
      <div style="
        width: 44px;
        height: 44px;
        background: linear-gradient(135deg, ${color}, ${color}dd);
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: ${status === 'active' ? 'pulse 2s ease-in-out infinite' : 'none'};
      ">
        ${avatarUrl
          ? `<img src="${avatarUrl}" alt="Technician" style="
              width: 34px;
              height: 34px;
              border-radius: 50%;
              object-fit: cover;
            "/>`
          : `<svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>`
        }
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { box-shadow: 0 4px 12px rgba(34, 197, 94, 0.25); }
          50% { box-shadow: 0 4px 20px rgba(34, 197, 94, 0.5); }
        }
      </style>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

// ============================================
// Map Event Handler Component
// ============================================

function MapEventHandler({
  onMapClick,
}: {
  onMapClick?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ============================================
// Map Bounds Updater Component
// ============================================

function MapBoundsUpdater({
  workOrders,
  selectedId,
}: {
  workOrders: WorkOrder[];
  selectedId?: string | null;
}) {
  const map = useMap();
  const initialFitDone = useRef(false);

  useEffect(() => {
    // Fit bounds to all work orders on initial load
    if (!initialFitDone.current && workOrders.length > 0) {
      const validOrders = workOrders.filter(
        (wo) => wo.service_latitude != null && wo.service_longitude != null
      );

      if (validOrders.length > 0) {
        const bounds = L.latLngBounds(
          validOrders.map((wo) => [wo.service_latitude!, wo.service_longitude!])
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        initialFitDone.current = true;
      }
    }
  }, [map, workOrders]);

  useEffect(() => {
    // Pan to selected work order
    if (selectedId) {
      const selected = workOrders.find((wo) => wo.id === selectedId);
      if (selected?.service_latitude != null && selected?.service_longitude != null) {
        map.panTo([selected.service_latitude, selected.service_longitude]);
      }
    }
  }, [map, workOrders, selectedId]);

  return null;
}

// ============================================
// Work Order Popup Content
// ============================================

function WorkOrderPopupContent({ workOrder }: { workOrder: WorkOrder }) {
  const statusColor = STATUS_COLORS[workOrder.status];
  const statusLabel = WORK_ORDER_STATUS_LABELS[workOrder.status];

  return (
    <div className="min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
        <span className="text-xs font-medium text-gray-600">{statusLabel}</span>
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">
        {workOrder.customer_name || 'Unknown Customer'}
      </h3>
      {workOrder.service_address_line1 && (
        <p className="text-sm text-gray-600 mb-1">{workOrder.service_address_line1}</p>
      )}
      {workOrder.service_city && workOrder.service_state && (
        <p className="text-sm text-gray-500">
          {workOrder.service_city}, {workOrder.service_state}
        </p>
      )}
      {workOrder.scheduled_date && (
        <p className="text-xs text-blue-600 mt-2">
          {new Date(workOrder.scheduled_date).toLocaleDateString()}
          {workOrder.time_window_start && ` at ${workOrder.time_window_start}`}
        </p>
      )}
    </div>
  );
}

// ============================================
// Legend Component
// ============================================

function MapLegend({ statusFilter }: { statusFilter?: WorkOrderStatus[] }) {
  const statuses: WorkOrderStatus[] = statusFilter || [
    'scheduled',
    'confirmed',
    'enroute',
    'on_site',
    'in_progress',
    'completed',
  ];

  return (
    <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[1000]">
      <h4 className="text-xs font-semibold text-gray-700 mb-2">Status</h4>
      <div className="space-y-1.5">
        {statuses.map((status) => (
          <div key={status} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[status] }}
            />
            <span className="text-xs text-gray-600">
              {WORK_ORDER_STATUS_LABELS[status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Main WorkOrderMap Component
// ============================================

export function WorkOrderMap({
  workOrders,
  selectedId,
  onSelect,
  showTechnicians = false,
  technicians = [],
  height = '500px',
  center = { lat: 29.4252, lng: -98.4946 }, // San Antonio, TX
  zoom = 10,
  showLegend = true,
  statusFilter,
  className = '',
  onMapClick,
}: WorkOrderMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Filter work orders with valid coordinates
  const validWorkOrders = useMemo(() => {
    let filtered = workOrders.filter(
      (wo) => wo.service_latitude != null && wo.service_longitude != null
    );

    if (statusFilter && statusFilter.length > 0) {
      filtered = filtered.filter((wo) => statusFilter.includes(wo.status));
    }

    return filtered;
  }, [workOrders, statusFilter]);

  // Handle marker click
  const handleMarkerClick = useCallback(
    (workOrder: WorkOrder) => {
      onSelect?.(workOrder);
    },
    [onSelect]
  );

  // Render work order markers
  const renderWorkOrderMarkers = () => {
    return validWorkOrders.map((workOrder) => {
      const isSelected = workOrder.id === selectedId;
      const isHovered = workOrder.id === hoveredId;
      const markerIcon = createWorkOrderMarker(workOrder.status, isSelected || isHovered);

      return (
        <Marker
          key={workOrder.id}
          position={[workOrder.service_latitude!, workOrder.service_longitude!]}
          icon={markerIcon}
          eventHandlers={{
            click: () => handleMarkerClick(workOrder),
            mouseover: () => setHoveredId(workOrder.id),
            mouseout: () => setHoveredId(null),
          }}
        >
          <Popup>
            <WorkOrderPopupContent workOrder={workOrder} />
          </Popup>
        </Marker>
      );
    });
  };

  // Render technician markers
  const renderTechnicianMarkers = () => {
    if (!showTechnicians) return null;

    return technicians.map((tech) => {
      const markerIcon = createTechnicianMarker(tech.status, tech.avatarUrl);

      return (
        <Marker
          key={`tech-${tech.id}`}
          position={[tech.lat, tech.lng]}
          icon={markerIcon}
          zIndexOffset={1000} // Technicians on top
        >
          <Popup>
            <div className="min-w-[150px]">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    tech.status === 'active'
                      ? 'bg-green-500'
                      : tech.status === 'idle'
                      ? 'bg-amber-500'
                      : 'bg-gray-400'
                  }`}
                />
                <span className="text-xs font-medium capitalize">{tech.status}</span>
              </div>
              <h3 className="font-semibold text-gray-900">{tech.name}</h3>
            </div>
          </Popup>
        </Marker>
      );
    });
  };

  return (
    <div
      className={`relative rounded-xl overflow-hidden shadow-lg ${className}`}
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

        <MapBoundsUpdater workOrders={validWorkOrders} selectedId={selectedId} />
        <MapEventHandler onMapClick={onMapClick} />

        {/* Work Order Markers */}
        {renderWorkOrderMarkers()}

        {/* Technician Markers */}
        {renderTechnicianMarkers()}
      </MapContainer>

      {/* Legend */}
      {showLegend && <MapLegend statusFilter={statusFilter} />}

      {/* Work Order Count */}
      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2 z-[1000]">
        <p className="text-sm font-medium text-gray-700">
          {validWorkOrders.length} work order{validWorkOrders.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}

export default WorkOrderMap;
