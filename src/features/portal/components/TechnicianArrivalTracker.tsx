/**
 * Technician Arrival Tracker Component
 * Shows real-time technician location and ETA to customers
 */
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { useTechnicianLocation } from "@/api/hooks/usePortal";
import type { TechnicianLocation } from "@/api/types/portal";

interface TechnicianArrivalTrackerProps {
  workOrderId: string;
  technicianName?: string;
  technicianPhone?: string;
  customerLat?: number;
  customerLng?: number;
}

export function TechnicianArrivalTracker({
  workOrderId,
  technicianName,
  technicianPhone,
  customerLat,
  customerLng,
}: TechnicianArrivalTrackerProps) {
  const { data: location, isLoading } = useTechnicianLocation(workOrderId);
  const [showMap, setShowMap] = useState(false);

  // Animation for pulsing effect
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (location?.status === "en_route") {
      const interval = setInterval(() => setPulse((p) => !p), 1000);
      return () => clearInterval(interval);
    }
  }, [location?.status]);

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!location) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="text-center py-6 text-text-muted">
            <p className="text-3xl mb-2">📍</p>
            <p>Technician location not available</p>
            <p className="text-sm mt-1">
              Tracking will begin when the technician is en route
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusInfo = (status: TechnicianLocation["status"]) => {
    switch (status) {
      case "en_route":
        return {
          label: "On the way",
          color: "bg-blue-500",
          icon: "🚗",
          description: "Your technician is heading to your location",
        };
      case "arrived":
        return {
          label: "Arrived",
          color: "bg-green-500",
          icon: "✅",
          description: "Your technician has arrived!",
        };
      case "working":
        return {
          label: "Working",
          color: "bg-yellow-500",
          icon: "🔧",
          description: "Service is in progress",
        };
      default:
        return {
          label: "Offline",
          color: "bg-gray-400",
          icon: "📍",
          description: "Technician tracking unavailable",
        };
    }
  };

  const statusInfo = getStatusInfo(location.status);

  // Calculate distance if we have customer coordinates
  const distance =
    customerLat && customerLng
      ? calculateDistance(location.lat, location.lng, customerLat, customerLng)
      : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Status Header */}
        <div className={`${statusInfo.color} text-white p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`text-3xl ${location.status === "en_route" && pulse ? "animate-bounce" : ""}`}
              >
                {statusInfo.icon}
              </span>
              <div>
                <h3 className="font-semibold text-lg">{statusInfo.label}</h3>
                <p className="text-sm opacity-90">{statusInfo.description}</p>
              </div>
            </div>
            {location.eta_minutes !== undefined &&
              location.status === "en_route" && (
                <div className="text-right">
                  <p className="text-3xl font-bold">{location.eta_minutes}</p>
                  <p className="text-xs opacity-90">min away</p>
                </div>
              )}
          </div>
        </div>

        {/* Technician Info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                👷
              </div>
              <div>
                <p className="font-medium text-text-primary">
                  {location.technician_name ||
                    technicianName ||
                    "Your Technician"}
                </p>
                {technicianPhone && (
                  <a
                    href={`tel:${technicianPhone}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {technicianPhone}
                  </a>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {technicianPhone && (
                <a
                  href={`tel:${technicianPhone}`}
                  className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200"
                >
                  📞
                </a>
              )}
              {technicianPhone && (
                <a
                  href={`sms:${technicianPhone}`}
                  className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200"
                >
                  💬
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Live Stats */}
        <div className="p-4 grid grid-cols-3 gap-4 text-center">
          {distance !== null && (
            <div>
              <p className="text-xs text-text-muted">Distance</p>
              <p className="font-semibold text-text-primary">
                {distance < 1
                  ? `${(distance * 5280).toFixed(0)} ft`
                  : `${distance.toFixed(1)} mi`}
              </p>
            </div>
          )}
          {location.speed !== undefined && location.speed > 0 && (
            <div>
              <p className="text-xs text-text-muted">Speed</p>
              <p className="font-semibold text-text-primary">
                {Math.round(location.speed)} mph
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-text-muted">Last Update</p>
            <p className="font-semibold text-text-primary">
              {formatTimeAgo(location.timestamp)}
            </p>
          </div>
        </div>

        {/* Toggle Map View */}
        <div className="px-4 pb-4">
          <button
            onClick={() => setShowMap(!showMap)}
            className="w-full py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {showMap ? "Hide Map" : "Show Map"} 🗺️
          </button>
        </div>

        {/* Map Placeholder */}
        {showMap && (
          <div className="h-64 bg-gradient-to-b from-blue-100 to-blue-50 flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl mb-2">🗺️</p>
              <p className="text-text-muted">Live map showing technician at</p>
              <p className="font-mono text-sm text-text-secondary">
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </p>
              {customerLat && customerLng && (
                <a
                  href={`https://www.google.com/maps/dir/${location.lat},${location.lng}/${customerLat},${customerLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-sm text-primary hover:underline"
                >
                  Open in Google Maps
                </a>
              )}
            </div>
          </div>
        )}

        {/* Progress Indicator for en_route */}
        {location.status === "en_route" &&
          location.eta_minutes !== undefined && (
            <div className="px-4 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-lg">🚗</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-1000"
                    style={{
                      width: `${Math.max(10, 100 - location.eta_minutes * 2)}%`,
                    }}
                  />
                </div>
                <span className="text-lg">📍</span>
              </div>
              <p className="text-center text-xs text-text-muted mt-2">
                Estimated arrival in {location.eta_minutes} minute
                {location.eta_minutes !== 1 ? "s" : ""}
              </p>
            </div>
          )}

        {/* Arrival Alert */}
        {location.status === "arrived" && (
          <div className="p-4 bg-green-50 border-t border-green-200">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔔</span>
              <p className="text-green-800">
                Your technician has arrived! They should be at your door
                momentarily.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Calculate distance between two points in miles
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Format timestamp as "X ago"
 */
function formatTimeAgo(timestamp: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(timestamp).getTime()) / 1000,
  );

  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default TechnicianArrivalTracker;
