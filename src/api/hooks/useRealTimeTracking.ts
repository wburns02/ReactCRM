/**
 * Real-Time Tracking Hook
 * Provides real-time technician location updates and ETA calculations
 * for both dispatch views and customer-facing tracking pages
 */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, withFallback } from "@/api/client";
import { useWebSocket } from "@/hooks/useWebSocket";
import type {
  CustomerTrackingData,
  TechnicianLocationUpdate,
  ETAInfo,
  TrackingSession,
} from "@/api/types/tracking";
import { formatETA, isArrivingSoon } from "@/api/types/tracking";
import {
  calculateDistance,
  estimateETA,
  type Coordinates,
} from "@/features/gps-tracking/types";

// ============================================
// Configuration
// ============================================

/** Default refresh interval for tracking data (30 seconds) */
const DEFAULT_REFRESH_INTERVAL = 30000;

/** Arriving soon distance threshold in km */
const ARRIVING_DISTANCE_THRESHOLD = 0.5;

// ============================================
// Types
// ============================================

export interface UseRealTimeTrackingOptions {
  /** Tracking token for customer-facing page */
  trackingToken?: string;
  /** Work order ID for dispatch view */
  workOrderId?: string;
  /** Polling interval in ms */
  refreshInterval?: number;
  /** Enable WebSocket for real-time updates */
  enableWebSocket?: boolean;
  /** Callback when technician location updates */
  onLocationUpdate?: (location: TechnicianLocationUpdate) => void;
  /** Callback when ETA updates */
  onETAUpdate?: (eta: ETAInfo) => void;
  /** Callback when status changes (arriving, on_site, etc.) */
  onStatusChange?: (status: TechnicianLocationUpdate["status"]) => void;
}

export interface UseRealTimeTrackingReturn {
  /** Full tracking data for customer page */
  trackingData: CustomerTrackingData | null;
  /** Current technician location */
  currentLocation: TechnicianLocationUpdate | null;
  /** Current ETA information */
  eta: ETAInfo | null;
  /** Location history for path drawing */
  locationHistory: TechnicianLocationUpdate[];
  /** Is data loading */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Is technician arriving soon */
  isArrivingSoon: boolean;
  /** Formatted ETA string */
  formattedETA: string;
  /** Refresh tracking data */
  refresh: () => void;
  /** Last update timestamp */
  lastUpdated: Date | null;
}

// ============================================
// API Functions
// ============================================

/**
 * Fetch tracking data by token (public endpoint)
 */
async function fetchTrackingByToken(
  token: string,
): Promise<CustomerTrackingData | null> {
  return withFallback(async () => {
    const { data } = await apiClient.get(`/tracking/public/${token}`);
    return data;
  }, null);
}

/**
 * Fetch tracking data by work order ID (authenticated)
 */
async function fetchTrackingByWorkOrder(
  workOrderId: string,
): Promise<CustomerTrackingData | null> {
  return withFallback(async () => {
    const { data } = await apiClient.get(`/tracking/work-order/${workOrderId}`);
    return data;
  }, null);
}

/**
 * Create tracking session for work order
 */
async function createTrackingSession(
  workOrderId: string,
): Promise<TrackingSession | null> {
  return withFallback(async () => {
    const { data } = await apiClient.post(`/tracking/sessions`, {
      work_order_id: workOrderId,
    });
    return data;
  }, null);
}

/**
 * Send tracking link via SMS
 */
async function sendTrackingLink(
  workOrderId: string,
  phoneNumber: string,
): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post(`/tracking/send-link`, {
    work_order_id: workOrderId,
    phone_number: phoneNumber,
  });
  return data;
}

// ============================================
// Main Hook
// ============================================

/**
 * Hook for real-time technician tracking
 *
 * Can be used in two modes:
 * 1. Customer mode: Pass trackingToken for public tracking page
 * 2. Dispatch mode: Pass workOrderId for internal dispatch view
 */
export function useRealTimeTracking(
  options: UseRealTimeTrackingOptions = {},
): UseRealTimeTrackingReturn {
  const {
    trackingToken,
    workOrderId,
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
    enableWebSocket = true,
    onLocationUpdate,
    onETAUpdate,
    onStatusChange,
  } = options;

  // State
  const [locationHistory, setLocationHistory] = useState<
    TechnicianLocationUpdate[]
  >([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Refs for callbacks to avoid stale closures
  const onLocationUpdateRef = useRef(onLocationUpdate);
  const onETAUpdateRef = useRef(onETAUpdate);
  const onStatusChangeRef = useRef(onStatusChange);
  const lastStatusRef = useRef<TechnicianLocationUpdate["status"] | null>(null);

  // Keep refs in sync
  useEffect(() => {
    onLocationUpdateRef.current = onLocationUpdate;
    onETAUpdateRef.current = onETAUpdate;
    onStatusChangeRef.current = onStatusChange;
  }, [onLocationUpdate, onETAUpdate, onStatusChange]);

  // Determine which fetch function to use
  const queryKey = trackingToken
    ? ["tracking", "token", trackingToken]
    : workOrderId
      ? ["tracking", "workOrder", workOrderId]
      : null;

  const queryFn = trackingToken
    ? () => fetchTrackingByToken(trackingToken)
    : workOrderId
      ? () => fetchTrackingByWorkOrder(workOrderId)
      : null;

  // Query for tracking data
  const {
    data: trackingData,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKey || ["tracking", "none"],
    queryFn: queryFn || (() => Promise.resolve(null)),
    enabled: !!queryKey,
    refetchInterval: refreshInterval,
    refetchIntervalInBackground: true,
    staleTime: refreshInterval / 2,
  });

  // WebSocket for real-time updates
  useWebSocket({
    autoConnect: enableWebSocket && !!trackingData?.session?.id,
    onMessage: (message) => {
      if (message.type === "technician_location") {
        const location = message.payload as TechnicianLocationUpdate;

        // Only process if it matches our technician
        if (trackingData?.technician?.id === location.technicianId) {
          handleLocationUpdate(location);
        }
      }
    },
  });

  // Process location update
  const handleLocationUpdate = useCallback(
    (location: TechnicianLocationUpdate) => {
      // Add to history
      setLocationHistory((prev) => {
        // Prevent duplicates and limit history size
        const exists = prev.some(
          (l) =>
            l.timestamp === location.timestamp &&
            l.technicianId === location.technicianId,
        );
        if (exists) return prev;
        const updated = [...prev, location];
        return updated.slice(-100); // Keep last 100 points
      });

      setLastUpdated(new Date());

      // Trigger callbacks
      onLocationUpdateRef.current?.(location);

      // Check for status change
      if (lastStatusRef.current !== location.status) {
        lastStatusRef.current = location.status;
        onStatusChangeRef.current?.(location.status);
      }
    },
    [],
  );

  // Update history when initial data loads
  useEffect(() => {
    if (trackingData?.currentLocation) {
      handleLocationUpdate(trackingData.currentLocation);
    }
  }, [trackingData?.currentLocation, handleLocationUpdate]);

  // Calculate if arriving soon
  const arriving = useMemo(() => {
    const eta = trackingData?.eta;
    if (!eta) return false;
    return isArrivingSoon(eta.durationRemaining);
  }, [trackingData?.eta]);

  // Format ETA for display
  const formattedETAValue = useMemo(() => {
    const eta = trackingData?.eta;
    if (!eta) return "Calculating...";
    return formatETA(eta.durationRemaining);
  }, [trackingData?.eta]);

  // Trigger ETA callback when ETA updates
  useEffect(() => {
    if (trackingData?.eta) {
      onETAUpdateRef.current?.(trackingData.eta);
    }
  }, [trackingData?.eta]);

  // Refresh function
  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    trackingData: trackingData || null,
    currentLocation: trackingData?.currentLocation || null,
    eta: trackingData?.eta || null,
    locationHistory,
    isLoading,
    error: queryError ? (queryError as Error).message : null,
    isArrivingSoon: arriving,
    formattedETA: formattedETAValue,
    refresh,
    lastUpdated,
  };
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Hook to create a new tracking session
 */
export function useCreateTrackingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTrackingSession,
    onSuccess: (_data, workOrderId) => {
      queryClient.invalidateQueries({
        queryKey: ["tracking", "workOrder", workOrderId],
      });
    },
  });
}

/**
 * Hook to send tracking link via SMS
 */
export function useSendTrackingLink() {
  return useMutation({
    mutationFn: ({
      workOrderId,
      phoneNumber,
    }: {
      workOrderId: string;
      phoneNumber: string;
    }) => sendTrackingLink(workOrderId, phoneNumber),
  });
}

// ============================================
// Dispatch View Hooks
// ============================================

export interface DispatchTechnicianLocation {
  technicianId: string;
  technicianName: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  status: "active" | "idle" | "offline";
  currentWorkOrderId?: string;
  eta?: ETAInfo;
  timestamp: string;
}

/**
 * Hook for dispatch view - tracks all active technicians
 */
export function useDispatchTracking() {
  const [technicians, setTechnicians] = useState<
    Map<string, DispatchTechnicianLocation>
  >(new Map());

  // Query for all active technician locations
  const {
    data: locationData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["dispatch", "technicians", "locations"],
    queryFn: async () => {
      return withFallback(async () => {
        const { data } = await apiClient.get("/tracking/dispatch/active");
        return data as DispatchTechnicianLocation[];
      }, []);
    },
    refetchInterval: 15000, // More frequent for dispatch
    staleTime: 10000,
  });

  // Update technicians map when data changes
  useEffect(() => {
    if (locationData && Array.isArray(locationData)) {
      const newMap = new Map<string, DispatchTechnicianLocation>();
      locationData.forEach((tech) => {
        newMap.set(tech.technicianId, tech);
      });
      setTechnicians(newMap);
    }
  }, [locationData]);

  // WebSocket for real-time updates
  const wsConnection = useWebSocket({
    autoConnect: true,
    onMessage: (message) => {
      if (message.type === "technician_location") {
        const location = message.payload as DispatchTechnicianLocation;
        setTechnicians((prev) => {
          const updated = new Map(prev);
          updated.set(location.technicianId, location);
          return updated;
        });
      }
    },
  });

  const getAllTechnicians = useCallback(() => {
    return Array.from(technicians.values());
  }, [technicians]);

  const getTechnician = useCallback(
    (id: string) => {
      return technicians.get(id);
    },
    [technicians],
  );

  const getActiveTechnicians = useCallback(() => {
    return getAllTechnicians().filter((t) => t.status === "active");
  }, [getAllTechnicians]);

  return {
    technicians,
    getAllTechnicians,
    getTechnician,
    getActiveTechnicians,
    isLoading,
    error: error ? (error as Error).message : null,
    refresh: refetch,
    isConnected: wsConnection.isConnected,
  };
}

// ============================================
// ETA Calculation Utilities
// ============================================

/**
 * Calculate ETA between two points
 * Uses simple distance-based calculation with average speed
 */
export function calculateETAFromDistance(
  origin: Coordinates,
  destination: Coordinates,
  currentSpeed?: number,
): ETAInfo {
  const distance = calculateDistance(origin, destination);
  const speed = currentSpeed && currentSpeed > 0 ? currentSpeed : 40; // Default 40 km/h
  const eta = estimateETA(distance, speed);

  const now = new Date();
  const arrivalTime = new Date(now.getTime() + eta.minutes * 60 * 1000);

  return {
    estimatedArrivalTime: arrivalTime.toISOString(),
    distanceRemaining: distance,
    durationRemaining: eta.minutes,
    trafficCondition: "moderate",
    lastUpdated: now.toISOString(),
  };
}

/**
 * Get location status based on distance to destination
 */
export function getLocationStatus(
  currentLocation: Coordinates,
  destination: Coordinates,
): TechnicianLocationUpdate["status"] {
  const distance = calculateDistance(currentLocation, destination);

  if (distance < 0.05) return "on_site"; // Within 50 meters
  if (distance < ARRIVING_DISTANCE_THRESHOLD) return "arriving";
  return "en_route";
}

export default useRealTimeTracking;
