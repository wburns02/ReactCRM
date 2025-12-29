import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useWorkOrders } from '@/api/hooks/useWorkOrders.ts';
import { useTechnicians } from '@/api/hooks/useTechnicians.ts';
import { Badge } from '@/components/ui/Badge.tsx';
import { Button } from '@/components/ui/Button.tsx';
import {
  type WorkOrder,
  type WorkOrderStatus,
  type JobType,
  type Priority,
  WORK_ORDER_STATUS_LABELS,
  JOB_TYPE_LABELS,
  PRIORITY_LABELS,
} from '@/api/types/workOrder.ts';
import type { Technician } from '@/api/types/technician.ts';
import { useScheduleStore } from '../store/scheduleStore.ts';
import { formatTimeDisplay } from '@/api/types/schedule.ts';

// Fix Leaflet default marker icon issue with bundlers
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/**
 * Create custom colored marker icon
 */
function createColoredIcon(color: string, isLarge = false): L.DivIcon {
  const size = isLarge ? 36 : 28;
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

/**
 * Get marker color based on work order status
 */
function getStatusColor(status: WorkOrderStatus): string {
  switch (status) {
    case 'completed':
      return '#22c55e'; // green
    case 'canceled':
      return '#ef4444'; // red
    case 'in_progress':
    case 'on_site':
      return '#f59e0b'; // amber
    case 'enroute':
      return '#3b82f6'; // blue
    case 'scheduled':
    case 'confirmed':
      return '#0091ae'; // MAC blue
    case 'requires_followup':
      return '#8b5cf6'; // purple
    default:
      return '#6b7280'; // gray
  }
}


/**
 * Status badge variant helper
 */
function getStatusVariant(status: WorkOrderStatus): 'default' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'canceled':
      return 'danger';
    case 'enroute':
    case 'on_site':
    case 'in_progress':
    case 'requires_followup':
      return 'warning';
    default:
      return 'default';
  }
}

/**
 * Technician marker icon (home base)
 */
function createTechnicianIcon(): L.DivIcon {
  return L.divIcon({
    className: 'technician-marker',
    html: `
      <div style="
        background-color: #104b95;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 16px;
        font-weight: bold;
      ">T</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

/**
 * Component to fit map bounds to markers
 */
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();

  useMemo(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);

  return null;
}

/**
 * Work Order Marker with popup
 */
function WorkOrderMarker({ workOrder }: { workOrder: WorkOrder }) {
  const icon = createColoredIcon(getStatusColor(workOrder.status as WorkOrderStatus));

  return (
    <Marker
      position={[workOrder.service_latitude!, workOrder.service_longitude!]}
      icon={icon}
    >
      <Popup>
        <div className="min-w-[200px]">
          <div className="flex items-center justify-between gap-2 mb-2">
            <Badge variant={getStatusVariant(workOrder.status as WorkOrderStatus)}>
              {WORK_ORDER_STATUS_LABELS[workOrder.status as WorkOrderStatus]}
            </Badge>
            <span className="text-xs text-gray-500">
              {PRIORITY_LABELS[workOrder.priority as Priority]}
            </span>
          </div>

          <h3 className="font-semibold text-gray-900 mb-1">
            {workOrder.customer_name || `Customer #${workOrder.customer_id}`}
          </h3>

          <p className="text-sm text-gray-600 mb-2">
            {JOB_TYPE_LABELS[workOrder.job_type as JobType]}
          </p>

          {workOrder.scheduled_date && (
            <p className="text-xs text-gray-500 mb-1">
              {workOrder.scheduled_date}
              {workOrder.time_window_start && ` at ${formatTimeDisplay(workOrder.time_window_start)}`}
            </p>
          )}

          {workOrder.assigned_technician && (
            <p className="text-xs text-gray-500 mb-2">
              Tech: {workOrder.assigned_technician}
            </p>
          )}

          {workOrder.service_address_line1 && (
            <p className="text-xs text-gray-400 mb-3">
              {workOrder.service_address_line1}
              {workOrder.service_city && `, ${workOrder.service_city}`}
            </p>
          )}

          <Link to={`/app/work-orders/${workOrder.id}`}>
            <Button variant="primary" size="sm" className="w-full">
              View Details
            </Button>
          </Link>
        </div>
      </Popup>
    </Marker>
  );
}

/**
 * Technician Marker with popup
 */
function TechnicianMarker({ technician }: { technician: Technician }) {
  const icon = createTechnicianIcon();

  return (
    <Marker
      position={[technician.home_latitude!, technician.home_longitude!]}
      icon={icon}
    >
      <Popup>
        <div className="min-w-[180px]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">
              {technician.first_name[0]}{technician.last_name[0]}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {technician.first_name} {technician.last_name}
              </h3>
              <p className="text-xs text-gray-500">Home Base</p>
            </div>
          </div>

          {technician.phone && (
            <p className="text-sm text-gray-600 mb-1">{technician.phone}</p>
          )}

          {technician.assigned_vehicle && (
            <p className="text-xs text-gray-500 mb-2">
              Vehicle: {technician.assigned_vehicle}
            </p>
          )}

          {technician.home_city && (
            <p className="text-xs text-gray-400">
              {technician.home_city}, {technician.home_state}
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

/**
 * Map Legend
 */
function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3 text-xs">
      <div className="font-semibold mb-2 text-gray-900">Work Order Status</div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#0091ae' }} />
          <span>Scheduled/Confirmed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
          <span>En Route</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
          <span>On Site/In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }} />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
          <span>Requires Follow-up</span>
        </div>
      </div>
      <div className="border-t border-gray-200 mt-2 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-white text-[8px] font-bold">
            T
          </div>
          <span>Technician Home</span>
        </div>
      </div>
    </div>
  );
}

/**
 * MapView - Interactive map showing work orders and technician locations
 */
export function MapView() {
  const { filters } = useScheduleStore();
  const [showTechnicians, setShowTechnicians] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  // Fetch work orders
  const { data: workOrdersData, isLoading: woLoading, isError: woError } = useWorkOrders({
    page: 1,
    page_size: 200,
  });

  // Fetch technicians
  const { data: techniciansData, isLoading: techLoading } = useTechnicians({
    active_only: true,
    page_size: 100,
  });

  // Filter work orders for the current week and with location data
  const workOrdersWithLocation = useMemo(() => {
    if (!workOrdersData?.items) return [];

    return workOrdersData.items.filter((wo) => {
      // Must have location data
      if (!wo.service_latitude || !wo.service_longitude) return false;

      // Apply technician filter
      if (filters.technician && wo.assigned_technician !== filters.technician) return false;

      // Apply status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(wo.status)) return false;

      // Hide completed unless toggled on
      if (!showCompleted && wo.status === 'completed') return false;

      // For the map, show scheduled work orders (within a reasonable date range)
      // Show all if no date filter, or show for the selected date range
      if (wo.scheduled_date) {
        // Show work orders from 7 days ago to 7 days ahead
        const woDate = new Date(wo.scheduled_date);
        const rangeStart = new Date();
        rangeStart.setDate(rangeStart.getDate() - 7);
        const rangeEnd = new Date();
        rangeEnd.setDate(rangeEnd.getDate() + 7);
        if (woDate < rangeStart || woDate > rangeEnd) return false;
      }

      return true;
    });
  }, [workOrdersData, filters, showCompleted]);

  // Filter technicians with location data
  const techniciansWithLocation = useMemo(() => {
    if (!techniciansData?.items || !showTechnicians) return [];

    return techniciansData.items.filter(
      (tech) => tech.home_latitude && tech.home_longitude && tech.is_active
    );
  }, [techniciansData, showTechnicians]);

  // Calculate map bounds
  const bounds = useMemo(() => {
    const allPoints: [number, number][] = [];

    workOrdersWithLocation.forEach((wo) => {
      allPoints.push([wo.service_latitude!, wo.service_longitude!]);
    });

    techniciansWithLocation.forEach((tech) => {
      allPoints.push([tech.home_latitude!, tech.home_longitude!]);
    });

    if (allPoints.length === 0) return null;
    if (allPoints.length === 1) {
      // Single point - create a small bounds around it
      const [lat, lng] = allPoints[0];
      return L.latLngBounds(
        [lat - 0.1, lng - 0.1],
        [lat + 0.1, lng + 0.1]
      );
    }

    return L.latLngBounds(allPoints);
  }, [workOrdersWithLocation, techniciansWithLocation]);

  // Default center (Austin, TX area)
  const defaultCenter: [number, number] = [30.2672, -97.7431];

  if (woLoading || techLoading) {
    return (
      <div className="bg-bg-muted rounded-lg flex items-center justify-center h-[600px]">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">Loading...</div>
          <p className="text-text-secondary">Loading map data...</p>
        </div>
      </div>
    );
  }

  if (woError) {
    return (
      <div className="bg-bg-muted rounded-lg flex items-center justify-center h-[600px]">
        <div className="text-center">
          <p className="text-danger mb-2">Failed to load work orders</p>
          <p className="text-sm text-text-muted">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-3 space-y-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showTechnicians}
            onChange={(e) => setShowTechnicians(e.target.checked)}
            className="rounded"
          />
          <span>Show Technicians</span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="rounded"
          />
          <span>Show Completed</span>
        </label>
      </div>

      {/* Stats */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-lg shadow-lg px-4 py-2 text-sm">
        <span className="font-medium">{workOrdersWithLocation.length}</span> work orders
        {showTechnicians && (
          <>
            {' · '}
            <span className="font-medium">{techniciansWithLocation.length}</span> technicians
          </>
        )}
      </div>

      {/* Map Container */}
      <div className="rounded-lg overflow-hidden border border-border" style={{ height: '600px' }}>
        <MapContainer
          center={defaultCenter}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Fit bounds to markers */}
          <FitBounds bounds={bounds} />

          {/* Work Order Markers */}
          {workOrdersWithLocation.map((wo) => (
            <WorkOrderMarker key={wo.id} workOrder={wo} />
          ))}

          {/* Technician Markers */}
          {techniciansWithLocation.map((tech) => (
            <TechnicianMarker key={tech.id} technician={tech} />
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <MapLegend />

      {/* Empty state */}
      {workOrdersWithLocation.length === 0 && techniciansWithLocation.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
          <div className="text-center p-6">
            <p className="text-text-secondary mb-2">No locations to display</p>
            <p className="text-sm text-text-muted">
              Work orders need service address coordinates to appear on the map
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
