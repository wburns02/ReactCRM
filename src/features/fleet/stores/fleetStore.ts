import { create } from "zustand";
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
 * Selector: get filtered vehicles
 */
export function useFilteredVehicles() {
  return useFleetStore((state) => {
    let vehicles = state.vehicles;

    // Filter by status
    if (state.filters.status.length > 0) {
      vehicles = vehicles.filter((v) =>
        state.filters.status.includes(v.status),
      );
    }

    // Filter by search
    if (state.filters.search) {
      const query = state.filters.search.toLowerCase();
      vehicles = vehicles.filter(
        (v) =>
          v.name.toLowerCase().includes(query) ||
          v.vin?.toLowerCase().includes(query) ||
          v.driver_name?.toLowerCase().includes(query),
      );
    }

    return vehicles;
  });
}

/**
 * Selector: get selected vehicle
 */
export function useSelectedVehicle() {
  return useFleetStore((state) =>
    state.vehicles.find((v) => v.id === state.selectedVehicleId) ?? null,
  );
}

/**
 * Selector: get vehicle status counts
 */
export function useVehicleStatusCounts() {
  return useFleetStore((state) => {
    const counts = { total: 0, moving: 0, idling: 0, stopped: 0, offline: 0 };
    for (const v of state.vehicles) {
      counts.total++;
      if (v.status in counts) {
        counts[v.status as keyof typeof counts]++;
      }
    }
    return counts;
  });
}
