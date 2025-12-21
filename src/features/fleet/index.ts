/**
 * Fleet/Samsara GPS tracking module
 * Exports all public components and hooks
 */

export { FleetMapPage } from './FleetMapPage.tsx';
export { FleetMap } from './components/FleetMap.tsx';
export { VehicleMarker } from './components/VehicleMarker.tsx';
export { VehicleInfoPopup } from './components/VehicleInfoPopup.tsx';
export { LiveLocationBadge } from './components/LiveLocationBadge.tsx';

export { useFleetLocations, useVehicleHistory } from './api.ts';

export type {
  Vehicle,
  VehicleLocation,
  VehicleStatus,
  LocationHistoryPoint,
} from './types.ts';
