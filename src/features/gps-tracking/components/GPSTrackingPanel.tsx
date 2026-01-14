/**
 * GPS Tracking Control Panel
 * UI for technicians to enable/disable location sharing
 */
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/utils";
import { useGPSBroadcast } from "../useGPSBroadcast";
import type { GeofenceZone } from "../types";
import { formatCoordinates } from "../types";

interface GPSTrackingPanelProps {
  /** Technician ID */
  technicianId: string;
  /** Technician name */
  technicianName?: string;
  /** Current work order ID */
  workOrderId?: string;
  /** Geofence zones to monitor */
  geofences?: GeofenceZone[];
  /** Compact mode for mobile */
  compact?: boolean;
  /** Class name */
  className?: string;
}

export function GPSTrackingPanel({
  technicianId,
  technicianName,
  workOrderId,
  geofences = [],
  compact = false,
  className,
}: GPSTrackingPanelProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [highAccuracy, setHighAccuracy] = useState(true);

  const {
    isTracking,
    currentLocation,
    locationHistory,
    totalDistance,
    error,
    isSupported,
    permissionStatus,
    startTracking,
    stopTracking,
    requestPermission,
  } = useGPSBroadcast({
    technicianId,
    technicianName,
    workOrderId,
    geofences,
    settings: { highAccuracy },
  });

  // Request permission on mount if needed
  useEffect(() => {
    if (permissionStatus === "prompt") {
      // Don't auto-request, wait for user action
    }
  }, [permissionStatus]);

  const handleToggleTracking = async () => {
    if (isTracking) {
      stopTracking();
    } else {
      if (permissionStatus === "denied") {
        // Show instructions to enable location
        return;
      }
      if (permissionStatus === "prompt") {
        const granted = await requestPermission();
        if (!granted) return;
      }
      startTracking();
    }
  };

  if (!isSupported) {
    return (
      <Card className={cn("bg-warning/10 border-warning/20", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <p className="font-medium text-text-primary">GPS Not Available</p>
              <p className="text-sm text-text-secondary">
                Your browser doesn't support location services.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border border-border bg-bg-card",
          className,
        )}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            isTracking ? "bg-success/20" : "bg-bg-muted",
          )}
        >
          <span className={cn("text-lg", isTracking ? "animate-pulse" : "")}>
            📍
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">Location Sharing</span>
            <Badge
              variant={isTracking ? "success" : "default"}
              className="text-xs"
            >
              {isTracking ? "Active" : "Off"}
            </Badge>
          </div>
          {isTracking && currentLocation && (
            <p className="text-xs text-text-muted truncate">
              {formatCoordinates({
                lat: currentLocation.lat,
                lng: currentLocation.lng,
              })}
            </p>
          )}
        </div>
        <Switch
          checked={isTracking}
          onCheckedChange={handleToggleTracking}
          disabled={permissionStatus === "denied"}
        />
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">GPS Location Sharing</CardTitle>
          <Badge variant={isTracking ? "success" : "default"}>
            {isTracking ? "Tracking" : "Stopped"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission denied warning */}
        {permissionStatus === "denied" && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg p-3">
            <p className="text-sm text-danger font-medium">
              Location Permission Denied
            </p>
            <p className="text-xs text-text-secondary mt-1">
              Please enable location access in your browser settings to use GPS
              tracking.
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg p-3">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Main toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-bg-muted">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                isTracking
                  ? "bg-success text-white"
                  : "bg-bg-card border border-border",
              )}
            >
              <span
                className={cn("text-xl", isTracking ? "animate-pulse" : "")}
              >
                📍
              </span>
            </div>
            <div>
              <p className="font-medium">
                {isTracking
                  ? "Location sharing active"
                  : "Location sharing off"}
              </p>
              <p className="text-sm text-text-muted">
                {isTracking
                  ? "Your location is visible to dispatch"
                  : "Turn on to share your location"}
              </p>
            </div>
          </div>
          <Button
            variant={isTracking ? "secondary" : "primary"}
            onClick={handleToggleTracking}
            disabled={permissionStatus === "denied"}
          >
            {isTracking ? "Stop" : "Start"}
          </Button>
        </div>

        {/* Current location */}
        {isTracking && currentLocation && (
          <div className="border border-border rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Location</span>
              <span className="text-xs text-text-muted">
                Updated{" "}
                {new Date(currentLocation.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-text-muted">Coordinates:</span>
                <p className="font-mono text-xs">
                  {currentLocation.lat.toFixed(6)},{" "}
                  {currentLocation.lng.toFixed(6)}
                </p>
              </div>
              <div>
                <span className="text-text-muted">Accuracy:</span>
                <p>±{Math.round(currentLocation.accuracy || 0)}m</p>
              </div>
              {currentLocation.speed !== undefined && (
                <div>
                  <span className="text-text-muted">Speed:</span>
                  <p>{Math.round(currentLocation.speed)} km/h</p>
                </div>
              )}
              <div>
                <span className="text-text-muted">Status:</span>
                <Badge
                  variant={
                    currentLocation.status === "active"
                      ? "success"
                      : currentLocation.status === "idle"
                        ? "warning"
                        : "default"
                  }
                  className="ml-1"
                >
                  {currentLocation.status}
                </Badge>
              </div>
            </div>

            {/* Google Maps link */}
            <a
              href={`https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline block"
            >
              View on Google Maps →
            </a>
          </div>
        )}

        {/* Session stats */}
        {isTracking && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-bg-muted text-center">
              <p className="text-2xl font-bold text-primary">
                {totalDistance.toFixed(2)}
              </p>
              <p className="text-xs text-text-muted">km traveled</p>
            </div>
            <div className="p-3 rounded-lg bg-bg-muted text-center">
              <p className="text-2xl font-bold text-primary">
                {locationHistory.length}
              </p>
              <p className="text-xs text-text-muted">location points</p>
            </div>
          </div>
        )}

        {/* Settings toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-sm text-primary hover:underline"
        >
          {showSettings ? "Hide settings" : "Show settings"}
        </button>

        {/* Settings */}
        {showSettings && (
          <div className="border border-border rounded-lg p-3 space-y-3">
            <h4 className="font-medium text-sm">Tracking Settings</h4>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">High Accuracy Mode</p>
                <p className="text-xs text-text-muted">
                  Uses GPS for better accuracy
                </p>
              </div>
              <Switch
                checked={highAccuracy}
                onCheckedChange={setHighAccuracy}
                disabled={isTracking}
              />
            </div>

            {geofences.length > 0 && (
              <div>
                <p className="text-sm mb-2">
                  Monitored Zones ({geofences.length})
                </p>
                <div className="space-y-1">
                  {geofences.slice(0, 3).map((zone) => (
                    <div
                      key={zone.id}
                      className="flex items-center gap-2 text-xs"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: zone.color || "#3b82f6" }}
                      />
                      <span>{zone.name}</span>
                      <span className="text-text-muted">({zone.radius}m)</span>
                    </div>
                  ))}
                  {geofences.length > 3 && (
                    <p className="text-xs text-text-muted">
                      +{geofences.length - 3} more zones
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GPSTrackingPanel;
