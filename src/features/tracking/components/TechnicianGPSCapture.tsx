/**
 * Technician GPS Capture Component
 * Mobile component for capturing and sending GPS location
 * Runs in the technician's mobile app/view
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils.ts";
import {
  useUpdateLocation,
  useUpdateLocationBatch,
  useTechnicianGPSConfig,
} from "@/hooks/useGPSTracking.ts";
import type { LocationUpdate } from "@/api/types/gpsTracking.ts";
import {
  Navigation,
  Signal,
  SignalZero,
  Battery,
  Clock,
  Play,
  Pause,
  Upload,
  AlertTriangle,
  CheckCircle,
  Wifi,
  WifiOff,
} from "lucide-react";

interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp: number;
}

interface TechnicianGPSCaptureProps {
  technicianId: number;
  workOrderId?: number;
  currentStatus?: string;
  onLocationUpdate?: (position: GPSPosition) => void;
  className?: string;
}

export function TechnicianGPSCapture({
  technicianId,
  workOrderId,
  currentStatus = "available",
  onLocationUpdate,
  className,
}: TechnicianGPSCaptureProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<GPSPosition | null>(
    null,
  );
  const [gpsStatus, setGpsStatus] = useState<
    "acquiring" | "active" | "error" | "idle"
  >("idle");
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedLocations, setQueuedLocations] = useState<LocationUpdate[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: config } = useTechnicianGPSConfig(technicianId);
  const updateLocation = useUpdateLocation();
  const updateLocationBatch = useUpdateLocationBatch();

  // Get battery level if available
  useEffect(() => {
    if ("getBattery" in navigator) {
      (
        navigator as Navigator & {
          getBattery: () => Promise<{ level: number; charging: boolean }>;
        }
      )
        .getBattery()
        .then((battery) => {
          setBatteryLevel(Math.round(battery.level * 100));
        })
        .catch(() => {
          // Battery API not available
        });
    }
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sync queued locations when online
  useEffect(() => {
    if (isOnline && queuedLocations.length > 0) {
      syncQueuedLocations();
    }
  }, [isOnline, queuedLocations.length]);

  const syncQueuedLocations = useCallback(async () => {
    if (queuedLocations.length === 0) return;

    try {
      await updateLocationBatch.mutateAsync(queuedLocations);
      setQueuedLocations([]);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error("Failed to sync locations:", error);
    }
  }, [queuedLocations, updateLocationBatch]);

  const sendLocation = useCallback(
    async (position: GPSPosition) => {
      const locationUpdate: LocationUpdate = {
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        altitude: position.altitude,
        speed: position.speed ? position.speed * 2.237 : undefined, // Convert m/s to mph
        heading: position.heading ?? undefined,
        battery_level: batteryLevel ?? undefined,
        captured_at: new Date(position.timestamp).toISOString(),
        current_status: currentStatus,
        work_order_id: workOrderId,
      };

      if (isOnline) {
        try {
          await updateLocation.mutateAsync(locationUpdate);
          setLastSyncTime(new Date());
          setErrorMessage(null);
        } catch {
          // Queue for later if online sync fails
          setQueuedLocations((prev) => [...prev, locationUpdate]);
        }
      } else {
        // Queue for later sync
        setQueuedLocations((prev) => [...prev, locationUpdate]);
      }

      onLocationUpdate?.(position);
    },
    [
      isOnline,
      batteryLevel,
      currentStatus,
      workOrderId,
      updateLocation,
      onLocationUpdate,
    ],
  );

  const handlePositionSuccess = useCallback(
    (position: GeolocationPosition) => {
      const gpsPosition: GPSPosition = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude ?? undefined,
        speed: position.coords.speed ?? undefined,
        heading: position.coords.heading ?? undefined,
        timestamp: position.timestamp,
      };

      setCurrentPosition(gpsPosition);
      setGpsStatus("active");
      setErrorMessage(null);
      sendLocation(gpsPosition);
    },
    [sendLocation],
  );

  const handlePositionError = useCallback((error: GeolocationPositionError) => {
    setGpsStatus("error");
    switch (error.code) {
      case error.PERMISSION_DENIED:
        setErrorMessage(
          "Location permission denied. Please enable location services.",
        );
        break;
      case error.POSITION_UNAVAILABLE:
        setErrorMessage("Location unavailable. Please check GPS settings.");
        break;
      case error.TIMEOUT:
        setErrorMessage("Location request timed out. Retrying...");
        break;
      default:
        setErrorMessage("Unable to get location.");
    }
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by this browser.");
      return;
    }

    setIsTracking(true);
    setGpsStatus("acquiring");

    const options: PositionOptions = {
      enableHighAccuracy: config?.high_accuracy_mode ?? true,
      timeout: 10000,
      maximumAge: 0,
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      handlePositionSuccess,
      handlePositionError,
      options,
    );

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      handlePositionError,
      options,
    );

    // Set up periodic sync
    const interval =
      currentStatus === "en_route" || currentStatus === "on_site"
        ? (config?.active_interval ?? 30) * 1000
        : (config?.idle_interval ?? 300) * 1000;

    syncIntervalRef.current = setInterval(() => {
      if (currentPosition) {
        sendLocation(currentPosition);
      }
    }, interval);
  }, [
    config,
    currentStatus,
    currentPosition,
    handlePositionSuccess,
    handlePositionError,
    sendLocation,
  ]);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    setGpsStatus("idle");

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    // Send final location if available
    if (currentPosition) {
      sendLocation(currentPosition);
    }
  }, [currentPosition, sendLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  const getStatusIcon = () => {
    switch (gpsStatus) {
      case "acquiring":
        return <Signal className="w-5 h-5 text-yellow-500 animate-pulse" />;
      case "active":
        return <Signal className="w-5 h-5 text-green-500" />;
      case "error":
        return <SignalZero className="w-5 h-5 text-red-500" />;
      default:
        return <Signal className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className={cn("bg-white rounded-xl shadow-sm p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-blue-500" />
          <span className="font-semibold text-gray-900">GPS Tracking</span>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          {getStatusIcon()}
        </div>
      </div>

      {/* Current Position */}
      {currentPosition && (
        <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Position</span>
            <span className="font-mono text-gray-900">
              {currentPosition.latitude.toFixed(6)},{" "}
              {currentPosition.longitude.toFixed(6)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Accuracy</span>
            <span
              className={cn(
                "font-medium",
                currentPosition.accuracy <= 10
                  ? "text-green-600"
                  : currentPosition.accuracy <= 50
                    ? "text-yellow-600"
                    : "text-red-600",
              )}
            >
              ±{Math.round(currentPosition.accuracy)}m
            </span>
          </div>
          {currentPosition.speed !== undefined && currentPosition.speed > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Speed</span>
              <span className="text-gray-900">
                {Math.round(currentPosition.speed * 2.237)} mph
              </span>
            </div>
          )}
        </div>
      )}

      {/* Status Indicators */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <Battery
            className={cn(
              "w-5 h-5 mx-auto mb-1",
              batteryLevel !== null && batteryLevel < 20
                ? "text-red-500"
                : "text-gray-400",
            )}
          />
          <div className="text-xs text-gray-500">Battery</div>
          <div className="text-sm font-medium">
            {batteryLevel !== null ? `${batteryLevel}%` : "--"}
          </div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <Upload className="w-5 h-5 mx-auto mb-1 text-gray-400" />
          <div className="text-xs text-gray-500">Queued</div>
          <div className="text-sm font-medium">{queuedLocations.length}</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <Clock className="w-5 h-5 mx-auto mb-1 text-gray-400" />
          <div className="text-xs text-gray-500">Last Sync</div>
          <div className="text-sm font-medium">
            {lastSyncTime
              ? lastSyncTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--"}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-700 text-sm mb-4">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Offline Queue Warning */}
      {!isOnline && queuedLocations.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg text-yellow-700 text-sm mb-4">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span>
            {queuedLocations.length} locations queued for sync when online
          </span>
        </div>
      )}

      {/* Sync Success */}
      {updateLocation.isSuccess && (
        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-green-700 text-sm mb-4">
          <CheckCircle className="w-4 h-4" />
          <span>Location synced successfully</span>
        </div>
      )}

      {/* Control Button */}
      <button
        onClick={isTracking ? stopTracking : startTracking}
        disabled={gpsStatus === "acquiring"}
        className={cn(
          "w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors",
          isTracking
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-blue-500 hover:bg-blue-600 text-white",
          gpsStatus === "acquiring" && "opacity-50 cursor-not-allowed",
        )}
      >
        {gpsStatus === "acquiring" ? (
          <>
            <Signal className="w-5 h-5 animate-pulse" />
            Acquiring GPS...
          </>
        ) : isTracking ? (
          <>
            <Pause className="w-5 h-5" />
            Stop Tracking
          </>
        ) : (
          <>
            <Play className="w-5 h-5" />
            Start Tracking
          </>
        )}
      </button>

      {/* Manual Sync Button */}
      {queuedLocations.length > 0 && isOnline && (
        <button
          onClick={syncQueuedLocations}
          disabled={updateLocationBatch.isPending}
          className="w-full mt-2 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
        >
          <Upload
            className={cn(
              "w-4 h-4",
              updateLocationBatch.isPending && "animate-pulse",
            )}
          />
          Sync {queuedLocations.length} Queued Locations
        </button>
      )}

      {/* Tracking Status Footer */}
      <div className="mt-4 pt-4 border-t text-xs text-gray-400 text-center">
        {isTracking ? (
          <span>
            Updating every{" "}
            {currentStatus === "en_route" || currentStatus === "on_site"
              ? (config?.active_interval ?? 30)
              : (config?.idle_interval ?? 300)}{" "}
            seconds
          </span>
        ) : (
          <span>Tracking is paused</span>
        )}
      </div>
    </div>
  );
}

export default TechnicianGPSCapture;
