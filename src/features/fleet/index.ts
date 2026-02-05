/**
 * Fleet/Samsara GPS tracking module
 * Exports all public components and hooks
 */

export { FleetMapPage } from "./FleetMapPage.tsx";
export { FleetMap } from "./components/FleetMap.tsx";
export { FleetSidebar } from "./components/FleetSidebar.tsx";
export { VehicleInfoPopup } from "./components/VehicleInfoPopup.tsx";
export { LiveLocationBadge } from "./components/LiveLocationBadge.tsx";

export { useFleetLocations, useVehicleHistory } from "./api.ts";
export { useFleetSSE } from "./hooks/useFleetSSE.ts";
export {
  useFleetStore,
  useFilteredVehicles,
  useSelectedVehicle,
  useVehicleStatusCounts,
} from "./stores/fleetStore.ts";

export type {
  Vehicle,
  VehicleLocation,
  VehicleStatus,
  LocationHistoryPoint,
} from "./types.ts";
