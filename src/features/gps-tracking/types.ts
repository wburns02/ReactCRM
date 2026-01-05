/**
 * GPS Tracking Types
 * Types for real-time technician location tracking and geofencing
 */
import { z } from 'zod';

/**
 * GPS Coordinates
 */
export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type Coordinates = z.infer<typeof coordinatesSchema>;

/**
 * Technician Location with metadata
 */
export const technicianLocationSchema = z.object({
  technicianId: z.string(),
  technicianName: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  heading: z.number().optional(),
  speed: z.number().optional(), // km/h
  accuracy: z.number().optional(), // meters
  timestamp: z.string(),
  status: z.enum(['active', 'idle', 'offline']).default('active'),
  currentWorkOrderId: z.string().optional(),
  batteryLevel: z.number().optional(), // 0-100
});

export type TechnicianLocationData = z.infer<typeof technicianLocationSchema>;

/**
 * Geofence zone definition
 */
export const geofenceZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['job_site', 'warehouse', 'restricted', 'service_area']),
  center: coordinatesSchema,
  radius: z.number().positive(), // meters
  color: z.string().optional(),
  isActive: z.boolean().default(true),
  workOrderId: z.string().optional(),
  customerId: z.string().optional(),
});

export type GeofenceZone = z.infer<typeof geofenceZoneSchema>;

/**
 * Geofence event when technician enters/exits a zone
 */
export const geofenceEventSchema = z.object({
  technicianId: z.string(),
  zoneId: z.string(),
  zoneName: z.string(),
  eventType: z.enum(['enter', 'exit']),
  timestamp: z.string(),
  coordinates: coordinatesSchema,
});

export type GeofenceEvent = z.infer<typeof geofenceEventSchema>;

/**
 * Location history point
 */
export interface LocationHistoryPoint {
  lat: number;
  lng: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

/**
 * Tracking session
 */
export interface TrackingSession {
  technicianId: string;
  startTime: string;
  endTime?: string;
  totalDistance: number; // km
  averageSpeed: number; // km/h
  locationPoints: LocationHistoryPoint[];
  geofenceEvents: GeofenceEvent[];
}

/**
 * GPS tracking settings
 */
export interface GPSTrackingSettings {
  updateInterval: number; // ms
  highAccuracy: boolean;
  trackInBackground: boolean;
  saveLocationHistory: boolean;
  geofencingEnabled: boolean;
}

/**
 * Default tracking settings
 */
export const DEFAULT_TRACKING_SETTINGS: GPSTrackingSettings = {
  updateInterval: 10000, // 10 seconds
  highAccuracy: true,
  trackInBackground: true,
  saveLocationHistory: true,
  geofencingEnabled: true,
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Check if a point is inside a geofence
 */
export function isPointInGeofence(
  point: Coordinates,
  geofence: GeofenceZone
): boolean {
  const distance = calculateDistance(point, geofence.center) * 1000; // Convert to meters
  return distance <= geofence.radius;
}

/**
 * Get bearing between two coordinates
 */
export function calculateBearing(
  from: Coordinates,
  to: Coordinates
): number {
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);

  const x = Math.sin(dLng) * Math.cos(lat2);
  const y =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const bearing = Math.atan2(x, y);
  return ((bearing * 180) / Math.PI + 360) % 360;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(coords: Coordinates): string {
  const latDir = coords.lat >= 0 ? 'N' : 'S';
  const lngDir = coords.lng >= 0 ? 'E' : 'W';
  return `${Math.abs(coords.lat).toFixed(6)}° ${latDir}, ${Math.abs(coords.lng).toFixed(6)}° ${lngDir}`;
}

/**
 * Estimate time of arrival based on distance and speed
 */
export function estimateETA(
  distanceKm: number,
  speedKmh: number
): { minutes: number; formatted: string } {
  if (speedKmh <= 0) {
    return { minutes: 0, formatted: 'Unknown' };
  }

  const minutes = Math.round((distanceKm / speedKmh) * 60);

  if (minutes < 60) {
    return { minutes, formatted: `${minutes} min` };
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return {
    minutes,
    formatted: `${hours}h ${remainingMinutes}m`,
  };
}
