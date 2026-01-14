/**
 * useGeolocation Hook
 * GPS tracking with high accuracy, permission handling, and error management
 */
import { useState, useEffect, useCallback, useRef } from "react";

// ============================================
// Types
// ============================================

export interface GeolocationPosition {
  lat: number;
  lng: number;
  accuracy: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
  type: "PERMISSION_DENIED" | "POSITION_UNAVAILABLE" | "TIMEOUT" | "UNKNOWN";
}

export type PermissionState = "prompt" | "granted" | "denied" | "unavailable";

export interface UseGeolocationOptions {
  /** Enable high accuracy mode (GPS vs network) */
  enableHighAccuracy?: boolean;
  /** Maximum age of cached position in ms */
  maximumAge?: number;
  /** Timeout for position request in ms */
  timeout?: number;
  /** Auto-start watching on mount */
  autoStart?: boolean;
  /** Callback when position updates */
  onPositionUpdate?: (position: GeolocationPosition) => void;
  /** Callback on error */
  onError?: (error: GeolocationError) => void;
}

export interface UseGeolocationReturn {
  /** Current position */
  position: GeolocationPosition | null;
  /** Last error */
  error: GeolocationError | null;
  /** Is currently tracking */
  isTracking: boolean;
  /** Is fetching initial position */
  isLoading: boolean;
  /** Permission state */
  permissionState: PermissionState;
  /** Start watching position */
  startTracking: () => void;
  /** Stop watching position */
  stopTracking: () => void;
  /** Get single position */
  getCurrentPosition: () => Promise<GeolocationPosition>;
  /** Request permission explicitly */
  requestPermission: () => Promise<PermissionState>;
  /** Clear any errors */
  clearError: () => void;
}

// ============================================
// Error Mapping
// ============================================

function mapGeolocationError(
  error: GeolocationPositionError,
): GeolocationError {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        code: error.code,
        message:
          "Location permission was denied. Please enable location access in your browser settings.",
        type: "PERMISSION_DENIED",
      };
    case error.POSITION_UNAVAILABLE:
      return {
        code: error.code,
        message:
          "Location information is unavailable. Please check your GPS or network connection.",
        type: "POSITION_UNAVAILABLE",
      };
    case error.TIMEOUT:
      return {
        code: error.code,
        message: "Location request timed out. Please try again.",
        type: "TIMEOUT",
      };
    default:
      return {
        code: error.code,
        message:
          error.message || "An unknown error occurred while getting location.",
        type: "UNKNOWN",
      };
  }
}

function mapGeolocationPosition(
  geoPosition: globalThis.GeolocationPosition,
): GeolocationPosition {
  const { coords, timestamp } = geoPosition;
  return {
    lat: coords.latitude,
    lng: coords.longitude,
    accuracy: coords.accuracy,
    altitude: coords.altitude,
    altitudeAccuracy: coords.altitudeAccuracy,
    heading: coords.heading,
    speed: coords.speed,
    timestamp,
  };
}

// ============================================
// Default Options
// ============================================

const DEFAULT_OPTIONS: Required<
  Omit<UseGeolocationOptions, "onPositionUpdate" | "onError">
> = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 10000,
  autoStart: false,
};

// ============================================
// Hook Implementation
// ============================================

export function useGeolocation(
  options: UseGeolocationOptions = {},
): UseGeolocationReturn {
  const {
    enableHighAccuracy = DEFAULT_OPTIONS.enableHighAccuracy,
    maximumAge = DEFAULT_OPTIONS.maximumAge,
    timeout = DEFAULT_OPTIONS.timeout,
    autoStart = DEFAULT_OPTIONS.autoStart,
    onPositionUpdate,
    onError,
  } = options;

  // State
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionState, setPermissionState] =
    useState<PermissionState>("prompt");

  // Refs
  const watchIdRef = useRef<number | null>(null);
  const onPositionUpdateRef = useRef(onPositionUpdate);
  const onErrorRef = useRef(onError);

  // Keep callback refs in sync
  useEffect(() => {
    onPositionUpdateRef.current = onPositionUpdate;
    onErrorRef.current = onError;
  }, [onPositionUpdate, onError]);

  // Check if geolocation is available
  const isGeolocationAvailable =
    typeof navigator !== "undefined" && "geolocation" in navigator;

  // Position options for geolocation API
  const positionOptions: PositionOptions = {
    enableHighAccuracy,
    maximumAge,
    timeout,
  };

  // Check permission status
  const checkPermission = useCallback(async (): Promise<PermissionState> => {
    if (!isGeolocationAvailable) {
      setPermissionState("unavailable");
      return "unavailable";
    }

    try {
      // Use Permissions API if available
      if ("permissions" in navigator) {
        const result = await navigator.permissions.query({
          name: "geolocation",
        });
        const state = result.state as PermissionState;
        setPermissionState(state);

        // Listen for permission changes
        result.addEventListener("change", () => {
          setPermissionState(result.state as PermissionState);
        });

        return state;
      }
      // Fallback: assume prompt if Permissions API not available
      return "prompt";
    } catch {
      // Permissions API not supported, assume prompt
      return "prompt";
    }
  }, [isGeolocationAvailable]);

  // Success handler
  const handleSuccess = useCallback(
    (geoPosition: globalThis.GeolocationPosition) => {
      const mappedPosition = mapGeolocationPosition(geoPosition);
      setPosition(mappedPosition);
      setError(null);
      setIsLoading(false);
      onPositionUpdateRef.current?.(mappedPosition);
    },
    [],
  );

  // Error handler
  const handleError = useCallback((geoError: GeolocationPositionError) => {
    const mappedError = mapGeolocationError(geoError);
    setError(mappedError);
    setIsLoading(false);

    if (mappedError.type === "PERMISSION_DENIED") {
      setPermissionState("denied");
    }

    onErrorRef.current?.(mappedError);
  }, []);

  // Get current position once
  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!isGeolocationAvailable) {
        const unavailableError: GeolocationError = {
          code: 0,
          message: "Geolocation is not supported by this browser.",
          type: "POSITION_UNAVAILABLE",
        };
        setError(unavailableError);
        reject(unavailableError);
        return;
      }

      setIsLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (geoPosition) => {
          const mappedPosition = mapGeolocationPosition(geoPosition);
          setPosition(mappedPosition);
          setError(null);
          setIsLoading(false);
          setPermissionState("granted");
          onPositionUpdateRef.current?.(mappedPosition);
          resolve(mappedPosition);
        },
        (geoError) => {
          const mappedError = mapGeolocationError(geoError);
          setError(mappedError);
          setIsLoading(false);
          if (mappedError.type === "PERMISSION_DENIED") {
            setPermissionState("denied");
          }
          onErrorRef.current?.(mappedError);
          reject(mappedError);
        },
        positionOptions,
      );
    });
  }, [isGeolocationAvailable, positionOptions]);

  // Start watching position
  const startTracking = useCallback(() => {
    if (!isGeolocationAvailable) {
      setError({
        code: 0,
        message: "Geolocation is not supported by this browser.",
        type: "POSITION_UNAVAILABLE",
      });
      return;
    }

    // Stop existing watch if any
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setIsTracking(true);
    setIsLoading(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (geoPosition) => {
        handleSuccess(geoPosition);
        setPermissionState("granted");
      },
      handleError,
      positionOptions,
    );
  }, [isGeolocationAvailable, positionOptions, handleSuccess, handleError]);

  // Stop watching position
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setIsLoading(false);
  }, []);

  // Request permission explicitly
  const requestPermission = useCallback(async (): Promise<PermissionState> => {
    if (!isGeolocationAvailable) {
      setPermissionState("unavailable");
      return "unavailable";
    }

    try {
      // Trigger permission prompt by getting current position
      await getCurrentPosition();
      setPermissionState("granted");
      return "granted";
    } catch (err) {
      const geoError = err as GeolocationError;
      if (geoError.type === "PERMISSION_DENIED") {
        setPermissionState("denied");
        return "denied";
      }
      // Other errors don't necessarily mean permission denied
      return permissionState;
    }
  }, [isGeolocationAvailable, getCurrentPosition, permissionState]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart) {
      startTracking();
    }
  }, [autoStart, startTracking]);

  // Check initial permission state
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    position,
    error,
    isTracking,
    isLoading,
    permissionState,
    startTracking,
    stopTracking,
    getCurrentPosition,
    requestPermission,
    clearError,
  };
}

export default useGeolocation;
