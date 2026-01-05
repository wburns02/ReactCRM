/**
 * GPS Tracking Feature
 * Real-time technician location tracking with geofencing
 */

// Types
export type {
  Coordinates,
  TechnicianLocationData,
  GeofenceZone,
  GeofenceEvent,
  LocationHistoryPoint,
  TrackingSession,
  GPSTrackingSettings,
} from './types';

// Utilities
export {
  coordinatesSchema,
  technicianLocationSchema,
  geofenceZoneSchema,
  geofenceEventSchema,
  DEFAULT_TRACKING_SETTINGS,
  calculateDistance,
  isPointInGeofence,
  calculateBearing,
  formatCoordinates,
  estimateETA,
} from './types';

// Hooks
export { useGPSBroadcast, type UseGPSBroadcastOptions, type UseGPSBroadcastReturn } from './useGPSBroadcast';

// Components
export { TechnicianTrackingMap } from './components/TechnicianTrackingMap';
export { GPSTrackingPanel } from './components/GPSTrackingPanel';
