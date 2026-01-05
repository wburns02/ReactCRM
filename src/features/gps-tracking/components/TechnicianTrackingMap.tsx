/**
 * Technician Tracking Map
 * Real-time map showing technician locations
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { TechnicianLocationData, GeofenceZone, LocationHistoryPoint } from '../types';
import { formatCoordinates, estimateETA, calculateDistance } from '../types';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-expect-error - Leaflet type issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface TechnicianTrackingMapProps {
  /** Technician locations to display */
  locations: TechnicianLocationData[];
  /** Geofence zones to display */
  geofences?: GeofenceZone[];
  /** Selected technician ID */
  selectedTechnicianId?: string;
  /** Location history for selected technician */
  locationHistory?: LocationHistoryPoint[];
  /** Target destination for ETA calculation */
  destination?: { lat: number; lng: number; name?: string };
  /** Map height */
  height?: string;
  /** Callback when technician is selected */
  onSelectTechnician?: (technicianId: string | null) => void;
  /** Show route path for selected technician */
  showPath?: boolean;
  /** Enable clustering for many markers */
  enableClustering?: boolean;
}

// Technician status colors
const STATUS_COLORS = {
  active: '#22c55e', // green
  idle: '#f59e0b', // amber
  offline: '#9ca3af', // gray
};

// Custom marker icon creator
function createTechnicianIcon(status: TechnicianLocationData['status'], isSelected: boolean) {
  const color = STATUS_COLORS[status];
  const size = isSelected ? 40 : 32;
  const borderWidth = isSelected ? 4 : 2;

  return L.divIcon({
    className: 'custom-technician-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${color};
        border: ${borderWidth}px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: ${isSelected ? '16px' : '14px'};
        ${isSelected ? 'animation: pulse 1.5s ease-in-out infinite;' : ''}
      ">
        <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

// Destination marker icon
const destinationIcon = L.divIcon({
  className: 'custom-destination-marker',
  html: `
    <div style="
      width: 36px;
      height: 36px;
      background: #ef4444;
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="transform: rotate(45deg); color: white; font-size: 16px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

// Map center updater component
function MapBoundsUpdater({ locations, destination }: { locations: TechnicianLocationData[]; destination?: { lat: number; lng: number } }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0 && !destination) return;

    const points: [number, number][] = locations.map((loc) => [loc.lat, loc.lng]);
    if (destination) {
      points.push([destination.lat, destination.lng]);
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [map, locations, destination]);

  return null;
}

export function TechnicianTrackingMap({
  locations,
  geofences = [],
  selectedTechnicianId,
  locationHistory = [],
  destination,
  height = '500px',
  onSelectTechnician,
  showPath = true,
}: TechnicianTrackingMapProps) {
  const [mapCenter] = useState<[number, number]>([27.9506, -82.4572]); // Tampa, FL default
  const [zoom] = useState(12);

  // Get selected technician
  const selectedTechnician = useMemo(
    () => locations.find((loc) => loc.technicianId === selectedTechnicianId),
    [locations, selectedTechnicianId]
  );

  // Calculate ETA if destination and selected technician
  const eta = useMemo(() => {
    if (!selectedTechnician || !destination) return null;

    const distance = calculateDistance(
      { lat: selectedTechnician.lat, lng: selectedTechnician.lng },
      destination
    );

    const speed = selectedTechnician.speed || 40; // Default 40 km/h
    return estimateETA(distance, speed);
  }, [selectedTechnician, destination]);

  // Path polyline positions
  const pathPositions = useMemo(() => {
    if (!showPath || locationHistory.length === 0) return [];
    return locationHistory.map((point) => [point.lat, point.lng] as [number, number]);
  }, [showPath, locationHistory]);

  const handleMarkerClick = useCallback(
    (technicianId: string) => {
      onSelectTechnician?.(selectedTechnicianId === technicianId ? null : technicianId);
    },
    [selectedTechnicianId, onSelectTechnician]
  );

  if (locations.length === 0) {
    return (
      <div
        className="bg-bg-muted rounded-lg flex items-center justify-center border border-border"
        style={{ height }}
      >
        <div className="text-center p-8">
          <div className="text-4xl mb-4">📍</div>
          <p className="text-text-secondary font-medium">No technicians online</p>
          <p className="text-sm text-text-muted mt-1">
            Technician locations will appear here when they're tracking
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-border" style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsUpdater locations={locations} destination={destination} />

        {/* Geofence zones */}
        {geofences.map((zone) => (
          <Circle
            key={zone.id}
            center={[zone.center.lat, zone.center.lng]}
            radius={zone.radius}
            pathOptions={{
              color: zone.color || '#3b82f6',
              fillColor: zone.color || '#3b82f6',
              fillOpacity: 0.15,
              weight: 2,
              dashArray: zone.type === 'restricted' ? '5, 5' : undefined,
            }}
          >
            <Popup>
              <div className="text-sm">
                <strong>{zone.name}</strong>
                <div className="text-text-muted capitalize">{zone.type.replace('_', ' ')}</div>
                <div className="text-text-muted">Radius: {zone.radius}m</div>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Location history path */}
        {pathPositions.length > 1 && (
          <Polyline
            positions={pathPositions}
            pathOptions={{
              color: '#3b82f6',
              weight: 3,
              opacity: 0.6,
              dashArray: '5, 10',
            }}
          />
        )}

        {/* Technician markers */}
        {locations.map((location) => (
          <Marker
            key={location.technicianId}
            position={[location.lat, location.lng]}
            icon={createTechnicianIcon(
              location.status,
              location.technicianId === selectedTechnicianId
            )}
            eventHandlers={{
              click: () => handleMarkerClick(location.technicianId),
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <div className="font-semibold text-base mb-2">
                  {location.technicianName || `Tech #${location.technicianId.slice(0, 6)}`}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        location.status === 'active'
                          ? 'success'
                          : location.status === 'idle'
                          ? 'warning'
                          : 'default'
                      }
                    >
                      {location.status}
                    </Badge>
                  </div>
                  {location.speed !== undefined && location.speed > 0 && (
                    <div className="text-text-muted">
                      Speed: {Math.round(location.speed)} km/h
                    </div>
                  )}
                  <div className="text-text-muted text-xs font-mono">
                    {formatCoordinates({ lat: location.lat, lng: location.lng })}
                  </div>
                  {location.accuracy && (
                    <div className="text-text-muted text-xs">
                      Accuracy: ±{Math.round(location.accuracy)}m
                    </div>
                  )}
                  <div className="text-text-muted text-xs">
                    Updated: {new Date(location.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Destination marker */}
        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
            <Popup>
              <div className="text-sm">
                <strong>{destination.name || 'Destination'}</strong>
                {eta && (
                  <div className="mt-1 text-primary font-medium">
                    ETA: {eta.formatted}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs z-[1000]">
        <div className="font-semibold mb-2 text-text-primary">Technician Status</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: STATUS_COLORS.active }} />
            <span>Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: STATUS_COLORS.idle }} />
            <span>Idle</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: STATUS_COLORS.offline }} />
            <span>Offline</span>
          </div>
        </div>
      </div>

      {/* Live indicator */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 text-xs flex items-center gap-2 z-[1000]">
        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        <span className="font-medium text-text-primary">
          {locations.filter((l) => l.status === 'active').length} Active
        </span>
      </div>

      {/* ETA Card */}
      {selectedTechnician && destination && eta && (
        <Card className="absolute top-4 right-4 z-[1000] w-64">
          <div className="p-3">
            <div className="text-xs text-text-muted mb-1">Estimated Arrival</div>
            <div className="text-2xl font-bold text-primary">{eta.formatted}</div>
            <div className="text-sm text-text-secondary mt-1">
              {selectedTechnician.technicianName || 'Technician'} → {destination.name || 'Job Site'}
            </div>
            {selectedTechnician.speed && selectedTechnician.speed > 0 && (
              <div className="text-xs text-text-muted mt-2">
                Current speed: {Math.round(selectedTechnician.speed)} km/h
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

export default TechnicianTrackingMap;
