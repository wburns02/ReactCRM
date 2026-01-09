/**
 * GPS & Mapping Components - Index
 * Central export for all mapping-related components, hooks, and utilities
 */

// ============================================
// Components
// ============================================

// MiniMap - Compact map widget
export { MiniMap, MiniMapSkeleton, MiniMapWithAddress } from './MiniMap';
export type { MiniMapProps, MiniMapWithAddressProps } from './MiniMap';

// WorkOrderMap - Full map with jobs and clustering
export { WorkOrderMap } from './WorkOrderMap';
export type { WorkOrderMapProps, TechnicianLocation } from './WorkOrderMap';

// TechnicianTracker - Live technician locations
export { TechnicianTracker } from './TechnicianTracker';
export type {
  TechnicianTrackerProps,
  TrackedTechnician,
  TechnicianPosition,
} from './TechnicianTracker';

// RouteOptimizer - Optimal route display
export { RouteOptimizer } from './RouteOptimizer';
export type { RouteOptimizerProps, RouteStop } from './RouteOptimizer';

// ETACalculator - Real-time ETA display
export { ETACalculator, ETACalculatorSkeleton } from './ETACalculator';
export type { ETACalculatorProps, ETAData } from './ETACalculator';

// DirectionsPanel - Turn-by-turn directions
export { DirectionsPanel, generateSimplifiedDirections } from './DirectionsPanel';
export type {
  DirectionsPanelProps,
  DirectionStep,
  ManeuverType,
} from './DirectionsPanel';

// GeofenceManager - Auto arrival/departure
export { GeofenceManager, useGeofenceMonitor } from './GeofenceManager';
export type {
  GeofenceManagerProps,
  Geofence,
  GeofenceEvent,
  UseGeofenceMonitorOptions,
} from './GeofenceManager';

// ============================================
// Hooks
// ============================================

export {
  useGeolocation,
  useMapbox,
  createMarkerIcon,
  createNumberedMarkerIcon,
  TILE_LAYERS,
} from './hooks';

export type {
  GeolocationPosition,
  GeolocationError,
  PermissionState,
  UseGeolocationOptions,
  UseGeolocationReturn,
  MapMarker,
  MapBounds,
  UseMapboxOptions,
  UseMapboxReturn,
} from './hooks';

// ============================================
// Utilities
// ============================================

export {
  // Distance calculations
  calculateDistance,
  calculateDistanceBetweenPoints,
  calculateRouteDistance,
  // Travel time
  estimateTravelTime,
  estimateTravelTimeBetweenPoints,
  calculateETA,
  // Formatting
  formatDistance,
  formatDistanceKm,
  formatDuration,
  formatETATime,
  // Geofence
  isWithinGeofence,
  getDistanceToGeofenceBoundary,
  detectGeofenceCrossing,
  // Route optimization
  optimizeRouteOrder,
  calculateRouteInfo,
  // Bearing & Direction
  calculateBearing,
  getCompassDirection,
  getCompassDirectionFull,
  // Utility
  getCenterPoint,
  getBoundingBox,
  isValidCoordinate,
} from './utils/routingUtils';

export type {
  Coordinates,
  Geofence as GeofenceZone,
  RouteSegment,
  RouteInfo,
  TravelTimeEstimate,
} from './utils/routingUtils';
