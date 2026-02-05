import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiClient } from "@/api/client.ts";
import {
  vehicleSchema,
  locationHistoryPointSchema,
  type Vehicle,
  type LocationHistoryPoint,
} from "./types.ts";
import { useFleetStore } from "./stores/fleetStore.ts";

/**
 * Query keys for fleet/Samsara
 */
export const fleetKeys = {
  all: ["fleet"] as const,
  vehicles: () => [...fleetKeys.all, "vehicles"] as const,
  vehicle: (id: string) => [...fleetKeys.all, "vehicle", id] as const,
  vehicleHistory: (id: string, hours?: number) =>
    [...fleetKeys.vehicle(id), "history", hours] as const,
};

/**
 * Get all fleet vehicle locations.
 * Populates the Zustand store on success.
 * Polling interval increases when SSE is connected (SSE provides real-time updates).
 */
export function useFleetLocations() {
  const setVehicles = useFleetStore((s) => s.setVehicles);
  const sseConnected = useFleetStore((s) => s.sseConnected);

  const query = useQuery({
    queryKey: fleetKeys.vehicles(),
    queryFn: async (): Promise<Vehicle[]> => {
      const { data } = await apiClient.get("/samsara/vehicles");

      if (import.meta.env.DEV) {
        if (Array.isArray(data)) {
          data.forEach((item, index) => {
            const result = vehicleSchema.safeParse(item);
            if (!result.success) {
              console.warn(`Vehicle ${index} validation failed:`, result.error);
            }
          });
        }
      }

      return data;
    },
    staleTime: 30_000,
    // When SSE is connected, poll less frequently (fallback only)
    // When SSE is disconnected, poll every 10 seconds for fresher data
    refetchInterval: sseConnected ? 60_000 : 10_000,
  });

  // Sync TanStack Query data into Zustand store
  useEffect(() => {
    if (query.data) {
      setVehicles(query.data);
    }
  }, [query.data, setVehicles]);

  return query;
}

/**
 * Get vehicle location history
 * @param vehicleId - Vehicle ID
 * @param hours - Number of hours of history to fetch (default: 1)
 */
export function useVehicleHistory(
  vehicleId: string | undefined,
  hours: number = 1,
) {
  return useQuery({
    queryKey: fleetKeys.vehicleHistory(vehicleId!, hours),
    queryFn: async (): Promise<LocationHistoryPoint[]> => {
      const params = new URLSearchParams();
      params.set("hours", String(hours));

      const url = `/samsara/vehicles/${vehicleId}/history?${params.toString()}`;
      const { data } = await apiClient.get(url);

      if (import.meta.env.DEV) {
        if (Array.isArray(data)) {
          data.forEach((item, index) => {
            const result = locationHistoryPointSchema.safeParse(item);
            if (!result.success) {
              console.warn(
                `Location history point ${index} validation failed:`,
                result.error,
              );
            }
          });
        }
      }

      return data;
    },
    enabled: !!vehicleId,
    staleTime: 60_000,
  });
}
