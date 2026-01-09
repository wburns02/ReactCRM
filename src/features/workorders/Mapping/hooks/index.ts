/**
 * Mapping Hooks - Index
 * Re-exports all mapping-related hooks
 */

export { useGeolocation } from './useGeolocation';
export type {
  GeolocationPosition,
  GeolocationError,
  PermissionState,
  UseGeolocationOptions,
  UseGeolocationReturn,
} from './useGeolocation';

export { useMapbox, createMarkerIcon, createNumberedMarkerIcon, TILE_LAYERS } from './useMapbox';
export type {
  MapMarker,
  MapBounds,
  UseMapboxOptions,
  UseMapboxReturn,
} from './useMapbox';
