/**
 * GPS Broadcast Hook
 * Broadcasts technician location to the server via WebSocket
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import type {
  TechnicianLocationData,
  GPSTrackingSettings,
  GeofenceZone,
  GeofenceEvent,
  Coordinates,
  LocationHistoryPoint,
} from "./types";
import {
  DEFAULT_TRACKING_SETTINGS,
  isPointInGeofence,
  calculateDistance,
  calculateBearing,
} from "./types";

export interface UseGPSBroadcastOptions {
  /** Technician ID to broadcast for */
  technicianId: string;
  /** Technician name for display */
  technicianName?: string;
  /** Current work order ID if on a job */
  workOrderId?: string;
  /** Geofence zones to monitor */
  geofences?: GeofenceZone[];
  /** Custom settings */
  settings?: Partial<GPSTrackingSettings>;
  /** Callback when location is updated */
  onLocationUpdate?: (location: TechnicianLocationData) => void;
  /** Callback when entering/exiting a geofence */
  onGeofenceEvent?: (event: GeofenceEvent) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export interface UseGPSBroadcastReturn {
  /** Whether tracking is active */
  isTracking: boolean;
  /** Current location */
  currentLocation: TechnicianLocationData | null;
  /** Location history */
  locationHistory: LocationHistoryPoint[];
  /** Total distance traveled in current session (km) */
  totalDistance: number;
  /** Last error */
  error: string | null;
  /** Is browser location supported */
  isSupported: boolean;
  /** Permission status */
  permissionStatus: PermissionState | null;
  /** Start tracking */
  startTracking: () => void;
  /** Stop tracking */
  stopTracking: () => void;
  /** Request location permission */
  requestPermission: () => Promise<boolean>;
  /** Get current position once */
  getCurrentPosition: () => Promise<TechnicianLocationData | null>;
}

/**
 * Hook for broadcasting technician GPS location
 */
export function useGPSBroadcast(
  options: UseGPSBroadcastOptions,
): UseGPSBroadcastReturn {
  const {
    technicianId,
    technicianName,
    workOrderId,
    geofences = [],
    settings: customSettings,
    onLocationUpdate,
    onGeofenceEvent,
    onError,
  } = options;

  const settings = { ...DEFAULT_TRACKING_SETTINGS, ...customSettings };
  const ws = useWebSocket({ autoConnect: true });

  // State
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] =
    useState<TechnicianLocationData | null>(null);
  const [locationHistory, setLocationHistory] = useState<
    LocationHistoryPoint[]
  >([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionState | null>(null);

  // Refs
  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<Coordinates | null>(null);
  const previousGeofencesRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check browser support
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setIsSupported(false);
      setError("Geolocation is not supported by your browser");
    }

    // Check permission status
    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          setPermissionStatus(result.state);
          result.onchange = () => {
            setPermissionStatus(result.state);
          };
        })
        .catch(() => {
          // Permissions API not fully supported
        });
    }
  }, []);

  /**
   * Request location permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          setPermissionStatus("granted");
          resolve(true);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setPermissionStatus("denied");
          }
          resolve(false);
        },
        { timeout: 10000 },
      );
    });
  }, [isSupported]);

  /**
   * Process a position update
   */
  const processPosition = useCallback(
    (position: GeolocationPosition) => {
      const coords: Coordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      // Calculate heading and distance from last position
      let heading: number | undefined;
      let distanceTraveled = 0;

      if (lastPositionRef.current) {
        heading = calculateBearing(lastPositionRef.current, coords);
        distanceTraveled = calculateDistance(lastPositionRef.current, coords);
      }

      // Build location data
      const locationData: TechnicianLocationData = {
        technicianId,
        technicianName,
        lat: coords.lat,
        lng: coords.lng,
        heading: heading ?? position.coords.heading ?? undefined,
        speed: position.coords.speed ? position.coords.speed * 3.6 : undefined, // Convert m/s to km/h
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString(),
        status: "active",
        currentWorkOrderId: workOrderId,
      };

      // Update state
      setCurrentLocation(locationData);
      setError(null);

      // Update history if enabled
      if (settings.saveLocationHistory) {
        const historyPoint: LocationHistoryPoint = {
          lat: coords.lat,
          lng: coords.lng,
          timestamp: locationData.timestamp,
          speed: locationData.speed,
          heading: locationData.heading,
        };
        setLocationHistory((prev) => [...prev, historyPoint]);
      }

      // Update distance
      if (distanceTraveled > 0.001) {
        // Ignore small movements (< 1 meter)
        setTotalDistance((prev) => prev + distanceTraveled);
      }

      // Check geofences
      if (settings.geofencingEnabled && geofences.length > 0) {
        checkGeofences(coords, locationData.timestamp);
      }

      // Broadcast via WebSocket
      if (ws.isConnected) {
        ws.send("technician_location", locationData);
      }

      // Call callback
      onLocationUpdate?.(locationData);

      // Update last position
      lastPositionRef.current = coords;
    },
    [
      technicianId,
      technicianName,
      workOrderId,
      settings,
      geofences,
      ws,
      onLocationUpdate,
    ],
  );

  /**
   * Check if technician has entered or exited any geofences
   */
  const checkGeofences = useCallback(
    (coords: Coordinates, timestamp: string) => {
      const currentGeofences = new Set<string>();

      geofences.forEach((zone) => {
        if (!zone.isActive) return;

        const isInside = isPointInGeofence(coords, zone);

        if (isInside) {
          currentGeofences.add(zone.id);

          // Check if just entered
          if (!previousGeofencesRef.current.has(zone.id)) {
            const event: GeofenceEvent = {
              technicianId,
              zoneId: zone.id,
              zoneName: zone.name,
              eventType: "enter",
              timestamp,
              coordinates: coords,
            };
            onGeofenceEvent?.(event);

            // Broadcast geofence event
            if (ws.isConnected) {
              ws.send("system_message", { action: "geofence_event", ...event });
            }
          }
        } else {
          // Check if just exited
          if (previousGeofencesRef.current.has(zone.id)) {
            const event: GeofenceEvent = {
              technicianId,
              zoneId: zone.id,
              zoneName: zone.name,
              eventType: "exit",
              timestamp,
              coordinates: coords,
            };
            onGeofenceEvent?.(event);

            // Broadcast geofence event
            if (ws.isConnected) {
              ws.send("system_message", { action: "geofence_event", ...event });
            }
          }
        }
      });

      previousGeofencesRef.current = currentGeofences;
    },
    [technicianId, geofences, onGeofenceEvent, ws],
  );

  /**
   * Handle position error
   */
  const handlePositionError = useCallback(
    (err: GeolocationPositionError) => {
      let errorMessage = "Unable to get your location";

      switch (err.code) {
        case err.PERMISSION_DENIED:
          errorMessage =
            "Location permission denied. Please enable location access.";
          setPermissionStatus("denied");
          break;
        case err.POSITION_UNAVAILABLE:
          errorMessage = "Location information is unavailable.";
          break;
        case err.TIMEOUT:
          errorMessage = "Location request timed out.";
          break;
      }

      setError(errorMessage);
      onError?.(errorMessage);

      // Update status to idle on error
      if (currentLocation) {
        const idleLocation = { ...currentLocation, status: "idle" as const };
        setCurrentLocation(idleLocation);

        if (ws.isConnected) {
          ws.send("technician_location", idleLocation);
        }
      }
    },
    [currentLocation, onError, ws],
  );

  /**
   * Start GPS tracking
   */
  const startTracking = useCallback(() => {
    if (!isSupported) {
      setError("Geolocation is not supported");
      return;
    }

    if (isTracking) return;

    setIsTracking(true);
    setError(null);
    setLocationHistory([]);
    setTotalDistance(0);
    lastPositionRef.current = null;
    previousGeofencesRef.current = new Set();

    // Use watchPosition for continuous tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      processPosition,
      handlePositionError,
      {
        enableHighAccuracy: settings.highAccuracy,
        timeout: 15000,
        maximumAge: 0,
      },
    );

    // Also set up interval for periodic updates (in case watchPosition doesn't fire)
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        processPosition,
        handlePositionError,
        {
          enableHighAccuracy: settings.highAccuracy,
          timeout: 10000,
          maximumAge: settings.updateInterval / 2,
        },
      );
    }, settings.updateInterval);
  }, [isSupported, isTracking, settings, processPosition, handlePositionError]);

  /**
   * Stop GPS tracking
   */
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsTracking(false);

    // Send offline status
    if (currentLocation && ws.isConnected) {
      ws.send("technician_location", {
        ...currentLocation,
        status: "offline",
        timestamp: new Date().toISOString(),
      });
    }
  }, [currentLocation, ws]);

  /**
   * Get current position once (without starting tracking)
   */
  const getCurrentPosition =
    useCallback(async (): Promise<TechnicianLocationData | null> => {
      if (!isSupported) return null;

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const locationData: TechnicianLocationData = {
              technicianId,
              technicianName,
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              heading: position.coords.heading ?? undefined,
              speed: position.coords.speed
                ? position.coords.speed * 3.6
                : undefined,
              accuracy: position.coords.accuracy,
              timestamp: new Date().toISOString(),
              status: "active",
              currentWorkOrderId: workOrderId,
            };
            resolve(locationData);
          },
          () => {
            resolve(null);
          },
          {
            enableHighAccuracy: settings.highAccuracy,
            timeout: 10000,
            maximumAge: 0,
          },
        );
      });
    }, [isSupported, technicianId, technicianName, workOrderId, settings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
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
    getCurrentPosition,
  };
}

export default useGPSBroadcast;
