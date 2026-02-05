import { create } from "zustand";
import { useMemo } from "react";
import type { Vehicle, VehicleStatus } from "../types.ts";

export type MapStyle = "streets" | "dark" | "satellite";

interface FleetFilters {
  status: VehicleStatus[];
  search: string;
}

interface FleetState {
  // Data
  vehicles: Vehicle[];
  selectedVehicleId: string | null;

  // UI state
  filters: FleetFilters;
  mapStyle: MapStyle;
  showTrails: boolean;
  showLabels: boolean;
  sseConnected: boolean;

  // Actions
  setVehicles: (vehicles: Vehicle[]) => void;
  updateVehicles: (vehicles: Vehicle[]) => void;
  selectVehicle: (id: string | null) => void;
  setFilters: (filters: Partial<FleetFilters>) => void;
  setMapStyle: (style: MapStyle) => void;
  toggleTrails: () => void;
  toggleLabels: () => void;
  setSseConnected: (connected: boolean) => void;
}

export const useFleetStore = create<FleetState>((set) => ({
  // Initial state
  vehicles: [],
  selectedVehicleId: null,
  filters: { status: [], search: "" },
  mapStyle: "streets",
  showTrails: true,
  showLabels: true,
  sseConnected: false,

  // Actions
  setVehicles: (vehicles) => set({ vehicles }),

  updateVehicles: (vehicles) =>
    set((state) => {
      // Merge new data — replace existing by id, add new
      const map = new Map(state.vehicles.map((v) => [v.id, v]));
      for (const v of vehicles) {
        map.set(v.id, v);
      }
      return { vehicles: Array.from(map.values()) };
    }),

  selectVehicle: (id) => set({ selectedVehicleId: id }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  setMapStyle: (mapStyle) => set({ mapStyle }),
  toggleTrails: () => set((state) => ({ showTrails: !state.showTrails })),
  toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
  setSseConnected: (sseConnected) => set({ sseConnected }),
}));

/**
 * Selector: get filtered vehicles.
 * Uses separate subscriptions + useMemo to avoid new array refs on unrelated state changes.
 */
export function useFilteredVehicles(): Vehicle[] {
  const vehicles = useFleetStore((s) => s.vehicles);
  const filters = useFleetStore((s) => s.filters);

  return useMemo(() => {
    let result = vehicles;

    if (filters.status.length > 0) {
      result = result.filter((v) => filters.status.includes(v.status));
    }

    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(query) ||
          v.vin?.toLowerCase().includes(query) ||
          v.driver_name?.toLowerCase().includes(query),
      );
    }

    return result;
  }, [vehicles, filters]);
}

/**
 * Selector: get selected vehicle.
 * Only recomputes when vehicles or selectedVehicleId changes.
 */
export function useSelectedVehicle(): Vehicle | null {
  const vehicles = useFleetStore((s) => s.vehicles);
  const selectedVehicleId = useFleetStore((s) => s.selectedVehicleId);

  return useMemo(() => {
    if (!selectedVehicleId) return null;
    return vehicles.find((v) => v.id === selectedVehicleId) ?? null;
  }, [vehicles, selectedVehicleId]);
}

/**
 * Selector: get vehicle status counts.
 * Only recomputes when vehicles change, returns stable object via useMemo.
 */
export function useVehicleStatusCounts() {
  const vehicles = useFleetStore((s) => s.vehicles);

  return useMemo(() => {
    const counts = { total: 0, moving: 0, idling: 0, stopped: 0, offline: 0 };
    for (const v of vehicles) {
      counts.total++;
      if (v.status in counts) {
        counts[v.status as keyof typeof counts]++;
      }
    }
    return counts;
  }, [vehicles]);
}
