/**
 * Customer Tracking Page
 * Public page for customers to track their technician
 * Similar to Uber/DoorDash tracking experience
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { cn } from '@/lib/utils.ts';
import { usePublicTracking } from '@/hooks/useGPSTracking.ts';
import {
  Truck, MapPin, Clock, CheckCircle, Phone, Navigation,
  RefreshCw, AlertCircle, User
} from 'lucide-react';

// Custom icons for the tracking map
const technicianIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 4px solid white;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 2s infinite;
    ">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
        <circle cx="7" cy="17" r="2"/>
        <circle cx="17" cy="17" r="2"/>
      </svg>
    </div>
  `,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

const destinationIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

interface MapUpdaterProps {
  techLat?: number;
  techLng?: number;
  destLat: number;
  destLng: number;
}

function MapUpdater({ techLat, techLng, destLat, destLng }: MapUpdaterProps) {
  const map = useMap();

  useEffect(() => {
    if (techLat && techLng) {
      const bounds = L.latLngBounds(
        [techLat, techLng],
        [destLat, destLng]
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView([destLat, destLng], 14);
    }
  }, [map, techLat, techLng, destLat, destLng]);

  return null;
}

const statusConfig: Record<string, { color: string; bgColor: string; icon: typeof Truck; message: string }> = {
  scheduled: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: Clock,
    message: 'Your service is scheduled',
  },
  en_route: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: Truck,
    message: 'Your technician is on the way!',
  },
  arriving_soon: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: Navigation,
    message: 'Almost there!',
  },
  arrived: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: MapPin,
    message: 'Your technician has arrived',
  },
  in_progress: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: User,
    message: 'Service in progress',
  },
  completed: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: CheckCircle,
    message: 'Service completed!',
  },
};

export function CustomerTrackingPage() {
  const { token } = useParams<{ token: string }>();
  const { data: trackingInfo, isLoading, error, refetch } = usePublicTracking(token || '');
  const [_lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading tracking information...</p>
        </div>
      </div>
    );
  }

  if (error || !trackingInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Tracking Link Not Found
          </h1>
          <p className="text-gray-600">
            This tracking link may have expired or is invalid. Please contact our office for assistance.
          </p>
        </div>
      </div>
    );
  }

  const config = statusConfig[trackingInfo.status] || statusConfig.scheduled;
  const StatusIcon = config.icon;

  const showMap = trackingInfo.technician_latitude &&
                  trackingInfo.technician_longitude &&
                  trackingInfo.status !== 'completed';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Track Your Service</h1>
              <p className="text-sm text-gray-500">{trackingInfo.service_type}</p>
            </div>
            <button
              onClick={() => refetch()}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <RefreshCw className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Status Card */}
        <div className={cn('rounded-2xl p-6 shadow-sm', config.bgColor)}>
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm',
              config.color
            )}>
              <StatusIcon className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <h2 className={cn('text-xl font-semibold', config.color)}>
                {config.message}
              </h2>
              <p className="text-gray-600 mt-1">{trackingInfo.status_message}</p>
            </div>
          </div>

          {/* ETA Display */}
          {trackingInfo.eta_minutes !== undefined && trackingInfo.status === 'en_route' && (
            <div className="mt-6 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl font-bold text-gray-900">
                  {trackingInfo.eta_minutes}
                </div>
                <div className="text-gray-500 mt-1">minutes away</div>
                {trackingInfo.eta_arrival_time && (
                  <div className="text-sm text-gray-400 mt-1">
                    Arriving around {trackingInfo.eta_arrival_time}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        {showMap && (
          <div className="rounded-2xl overflow-hidden shadow-sm bg-white">
            <MapContainer
              center={[trackingInfo.destination_latitude, trackingInfo.destination_longitude]}
              zoom={14}
              className="h-[300px]"
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />

              <MapUpdater
                techLat={trackingInfo.technician_latitude}
                techLng={trackingInfo.technician_longitude}
                destLat={trackingInfo.destination_latitude}
                destLng={trackingInfo.destination_longitude}
              />

              {/* Technician Marker */}
              {trackingInfo.technician_latitude && trackingInfo.technician_longitude && (
                <Marker
                  position={[trackingInfo.technician_latitude, trackingInfo.technician_longitude]}
                  icon={technicianIcon}
                />
              )}

              {/* Destination Marker */}
              <Marker
                position={[trackingInfo.destination_latitude, trackingInfo.destination_longitude]}
                icon={destinationIcon}
              />

              {/* Route Line */}
              {trackingInfo.technician_latitude && trackingInfo.technician_longitude && (
                <Polyline
                  positions={[
                    [trackingInfo.technician_latitude, trackingInfo.technician_longitude],
                    [trackingInfo.destination_latitude, trackingInfo.destination_longitude]
                  ]}
                  pathOptions={{
                    color: '#3B82F6',
                    weight: 4,
                    opacity: 0.6,
                    dashArray: '10, 10',
                  }}
                />
              )}
            </MapContainer>

            {/* Distance Display */}
            {trackingInfo.distance_miles && (
              <div className="px-4 py-3 bg-gray-50 text-center text-sm text-gray-600">
                {trackingInfo.distance_miles.toFixed(1)} miles away
              </div>
            )}
          </div>
        )}

        {/* Technician Card */}
        {trackingInfo.technician_name && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
                {trackingInfo.technician_photo_url ? (
                  <img
                    src={trackingInfo.technician_photo_url}
                    alt={trackingInfo.technician_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-7 h-7 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">
                  {trackingInfo.technician_name}
                </div>
                <div className="text-sm text-gray-500">Your Service Technician</div>
              </div>
              <a
                href="tel:+1234567890"
                className="p-3 bg-green-50 rounded-full text-green-600 hover:bg-green-100"
              >
                <Phone className="w-5 h-5" />
              </a>
            </div>
          </div>
        )}

        {/* Service Details */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Service Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Service Type</span>
              <span className="text-gray-900">{trackingInfo.service_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Scheduled Date</span>
              <span className="text-gray-900">{trackingInfo.scheduled_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Work Order</span>
              <span className="text-gray-900">#{trackingInfo.work_order_id}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-4">
          <p>Last updated: {new Date(trackingInfo.last_updated).toLocaleTimeString()}</p>
          <p className="mt-1">Powered by ECBTX CRM</p>
        </div>
      </main>

      {/* Add custom styles for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 8px 24px rgba(59, 130, 246, 0.6);
          }
        }
      `}</style>
    </div>
  );
}

export default CustomerTrackingPage;
