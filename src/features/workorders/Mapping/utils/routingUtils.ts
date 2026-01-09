/**
 * Routing Utilities
 * Distance calculations, travel time estimation, and geofence utilities
 */

// ============================================
// Types
// ============================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Geofence {
  id: string;
  center: Coordinates;
  radiusMeters: number;
}

export interface RouteSegment {
  from: Coordinates;
  to: Coordinates;
  distanceMeters: number;
  durationSeconds: number;
}

export interface RouteInfo {
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  segments: RouteSegment[];
}

export interface TravelTimeEstimate {
  durationSeconds: number;
  durationMinutes: number;
  formatted: string;
}

// ============================================
// Constants
// ============================================

/** Earth's radius in meters */
const EARTH_RADIUS_METERS = 6371000;

/** Average driving speed in meters per second (25 mph = ~11 m/s) */
const AVERAGE_DRIVING_SPEED_MPS = 11;

/** Walking speed in meters per second (~3 mph) - reserved for pedestrian routing */
// const _WALKING_SPEED_MPS = 1.4;

/** Speed multiplier for different road types */
const SPEED_MULTIPLIERS = {
  urban: 0.7,    // Slower due to traffic lights, stops
  suburban: 0.9, // Moderate traffic
  rural: 1.1,    // Faster, less traffic
  highway: 1.5,  // Highway speeds
} as const;

// ============================================
// Distance Calculations
// ============================================

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 First point latitude
 * @param lng1 First point longitude
 * @param lat2 Second point latitude
 * @param lng2 Second point longitude
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculate distance between two coordinate objects
 */
export function calculateDistanceBetweenPoints(
  point1: Coordinates,
  point2: Coordinates
): number {
  return calculateDistance(point1.lat, point1.lng, point2.lat, point2.lng);
}

/**
 * Calculate total distance of a route (sequence of points)
 */
export function calculateRouteDistance(points: Coordinates[]): number {
  if (points.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalDistance += calculateDistanceBetweenPoints(points[i], points[i + 1]);
  }

  return totalDistance;
}

// ============================================
// Travel Time Estimation
// ============================================

/**
 * Estimate travel time based on distance
 * @param distanceMeters Distance in meters
 * @param speedMultiplier Optional speed multiplier (default: 1 for average driving)
 * @returns Travel time estimate
 */
export function estimateTravelTime(
  distanceMeters: number,
  speedMultiplier = 1
): TravelTimeEstimate {
  const speedMps = AVERAGE_DRIVING_SPEED_MPS * speedMultiplier;
  const durationSeconds = Math.round(distanceMeters / speedMps);
  const durationMinutes = Math.round(durationSeconds / 60);

  return {
    durationSeconds,
    durationMinutes,
    formatted: formatDuration(durationSeconds),
  };
}

/**
 * Estimate travel time between two points
 */
export function estimateTravelTimeBetweenPoints(
  from: Coordinates,
  to: Coordinates,
  roadType: keyof typeof SPEED_MULTIPLIERS = 'urban'
): TravelTimeEstimate {
  const distance = calculateDistanceBetweenPoints(from, to);
  return estimateTravelTime(distance, SPEED_MULTIPLIERS[roadType]);
}

/**
 * Calculate ETA from current location to destination
 */
export function calculateETA(
  currentLocation: Coordinates,
  destination: Coordinates,
  currentSpeed?: number // meters per second
): Date {
  const distance = calculateDistanceBetweenPoints(currentLocation, destination);
  const speed = currentSpeed && currentSpeed > 0 ? currentSpeed : AVERAGE_DRIVING_SPEED_MPS;
  const durationSeconds = distance / speed;

  return new Date(Date.now() + durationSeconds * 1000);
}

// ============================================
// Formatting Functions
// ============================================

/**
 * Format distance for display
 * @param meters Distance in meters
 * @returns Formatted distance string
 */
export function formatDistance(meters: number): string {
  if (meters < 0) return '0 m';

  // Less than 1000 meters, show in meters
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  // Convert to miles (1 mile = 1609.34 meters)
  const miles = meters / 1609.34;

  if (miles < 10) {
    return `${miles.toFixed(1)} mi`;
  }

  return `${Math.round(miles)} mi`;
}

/**
 * Format distance in kilometers
 */
export function formatDistanceKm(meters: number): string {
  if (meters < 0) return '0 m';

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  const km = meters / 1000;
  if (km < 10) {
    return `${km.toFixed(1)} km`;
  }

  return `${Math.round(km)} km`;
}

/**
 * Format duration for display
 * @param seconds Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) return '0 min';

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    if (minutes < 1) return '< 1 min';
    return `${minutes} min`;
  }

  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hr' : `${hours} hrs`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

/**
 * Format ETA time for display
 */
export function formatETATime(eta: Date): string {
  return eta.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ============================================
// Geofence Functions
// ============================================

/**
 * Check if a location is within a geofence
 * @param location Current location
 * @param geofence Geofence definition
 * @returns True if location is inside geofence
 */
export function isWithinGeofence(
  location: Coordinates,
  geofence: Geofence
): boolean {
  const distance = calculateDistanceBetweenPoints(location, geofence.center);
  return distance <= geofence.radiusMeters;
}

/**
 * Get distance to geofence boundary
 * Positive = outside, Negative = inside
 */
export function getDistanceToGeofenceBoundary(
  location: Coordinates,
  geofence: Geofence
): number {
  const distance = calculateDistanceBetweenPoints(location, geofence.center);
  return distance - geofence.radiusMeters;
}

/**
 * Check if location crossed geofence boundary
 */
export function detectGeofenceCrossing(
  previousLocation: Coordinates | null,
  currentLocation: Coordinates,
  geofence: Geofence
): 'enter' | 'exit' | null {
  if (!previousLocation) return null;

  const wasInside = isWithinGeofence(previousLocation, geofence);
  const isInside = isWithinGeofence(currentLocation, geofence);

  if (!wasInside && isInside) return 'enter';
  if (wasInside && !isInside) return 'exit';
  return null;
}

// ============================================
// Route Optimization
// ============================================

/**
 * Calculate optimal route order using nearest neighbor algorithm
 * @param start Starting point
 * @param points Points to visit
 * @returns Ordered array of points
 */
export function optimizeRouteOrder(
  start: Coordinates,
  points: Coordinates[]
): Coordinates[] {
  if (points.length <= 1) return [...points];

  const remaining = [...points];
  const ordered: Coordinates[] = [];
  let currentPoint = start;

  while (remaining.length > 0) {
    // Find nearest point
    let nearestIndex = 0;
    let nearestDistance = calculateDistanceBetweenPoints(currentPoint, remaining[0]);

    for (let i = 1; i < remaining.length; i++) {
      const distance = calculateDistanceBetweenPoints(currentPoint, remaining[i]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    // Move to nearest point
    currentPoint = remaining[nearestIndex];
    ordered.push(currentPoint);
    remaining.splice(nearestIndex, 1);
  }

  return ordered;
}

/**
 * Calculate route info for a sequence of points
 */
export function calculateRouteInfo(points: Coordinates[]): RouteInfo {
  const segments: RouteSegment[] = [];
  let totalDistanceMeters = 0;
  let totalDurationSeconds = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    const distanceMeters = calculateDistanceBetweenPoints(from, to);
    const durationSeconds = Math.round(distanceMeters / AVERAGE_DRIVING_SPEED_MPS);

    segments.push({
      from,
      to,
      distanceMeters,
      durationSeconds,
    });

    totalDistanceMeters += distanceMeters;
    totalDurationSeconds += durationSeconds;
  }

  return {
    totalDistanceMeters,
    totalDurationSeconds,
    segments,
  };
}

// ============================================
// Bearing & Direction
// ============================================

/**
 * Calculate bearing between two points
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(from: Coordinates, to: Coordinates): number {
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const x = Math.sin(dLng) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const bearing = Math.atan2(x, y);
  return (toDegrees(bearing) + 360) % 360;
}

/**
 * Get compass direction from bearing
 */
export function getCompassDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Get full compass direction name
 */
export function getCompassDirectionFull(bearing: number): string {
  const directions = [
    'North', 'Northeast', 'East', 'Southeast',
    'South', 'Southwest', 'West', 'Northwest'
  ];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

// ============================================
// Utility Functions
// ============================================

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Get center point of multiple coordinates
 */
export function getCenterPoint(points: Coordinates[]): Coordinates {
  if (points.length === 0) {
    return { lat: 0, lng: 0 };
  }

  if (points.length === 1) {
    return { ...points[0] };
  }

  let totalLat = 0;
  let totalLng = 0;

  for (const point of points) {
    totalLat += point.lat;
    totalLng += point.lng;
  }

  return {
    lat: totalLat / points.length,
    lng: totalLng / points.length,
  };
}

/**
 * Get bounding box for a set of coordinates
 */
export function getBoundingBox(points: Coordinates[]): {
  north: number;
  south: number;
  east: number;
  west: number;
} | null {
  if (points.length === 0) return null;

  let north = points[0].lat;
  let south = points[0].lat;
  let east = points[0].lng;
  let west = points[0].lng;

  for (const point of points) {
    north = Math.max(north, point.lat);
    south = Math.min(south, point.lat);
    east = Math.max(east, point.lng);
    west = Math.min(west, point.lng);
  }

  return { north, south, east, west };
}

/**
 * Validate coordinates
 */
export function isValidCoordinate(coord: Coordinates): boolean {
  return (
    typeof coord.lat === 'number' &&
    typeof coord.lng === 'number' &&
    !isNaN(coord.lat) &&
    !isNaN(coord.lng) &&
    coord.lat >= -90 &&
    coord.lat <= 90 &&
    coord.lng >= -180 &&
    coord.lng <= 180
  );
}
