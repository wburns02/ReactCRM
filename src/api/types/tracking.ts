/**
 * Real-Time Technician Tracking Types
 * Types for customer-facing tracking pages and dispatch tracking views
 */
import { z } from 'zod';

/**
 * Tracking link status
 */
export const trackingLinkStatusSchema = z.enum([
  'pending',
  'active',
  'expired',
  'completed',
  'cancelled',
]);
export type TrackingLinkStatus = z.infer<typeof trackingLinkStatusSchema>;

/**
 * Tracking session for a work order
 */
export const trackingSessionSchema = z.object({
  id: z.string(),
  workOrderId: z.string(),
  technicianId: z.string(),
  trackingToken: z.string(),
  status: trackingLinkStatusSchema,
  createdAt: z.string(),
  expiresAt: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});
export type TrackingSession = z.infer<typeof trackingSessionSchema>;

/**
 * Technician profile for customer-facing display
 */
export const technicianProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  photoUrl: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  rating: z.number().nullable().optional(),
  yearsExperience: z.number().nullable().optional(),
  certifications: z.array(z.string()).optional(),
});
export type TechnicianProfile = z.infer<typeof technicianProfileSchema>;

/**
 * Location update from technician
 */
export const technicianLocationUpdateSchema = z.object({
  technicianId: z.string(),
  lat: z.number(),
  lng: z.number(),
  heading: z.number().optional(),
  speed: z.number().optional(), // km/h
  accuracy: z.number().optional(), // meters
  timestamp: z.string(),
  status: z.enum(['en_route', 'arriving', 'on_site', 'completed']),
});
export type TechnicianLocationUpdate = z.infer<typeof technicianLocationUpdateSchema>;

/**
 * ETA information
 */
export const etaInfoSchema = z.object({
  estimatedArrivalTime: z.string(), // ISO timestamp
  distanceRemaining: z.number(), // km
  durationRemaining: z.number(), // minutes
  trafficCondition: z.enum(['light', 'moderate', 'heavy']).optional(),
  lastUpdated: z.string(),
});
export type ETAInfo = z.infer<typeof etaInfoSchema>;

/**
 * Customer tracking page data
 * All data needed for the public tracking page
 */
export const customerTrackingDataSchema = z.object({
  session: trackingSessionSchema,
  technician: technicianProfileSchema,
  workOrder: z.object({
    id: z.string(),
    jobType: z.string(),
    scheduledDate: z.string().nullable(),
    timeWindowStart: z.string().nullable(),
    timeWindowEnd: z.string().nullable(),
    status: z.string(),
  }),
  customer: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    city: z.string().optional(),
    state: z.string().optional(),
  }),
  destination: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string(),
  }),
  currentLocation: technicianLocationUpdateSchema.nullable(),
  eta: etaInfoSchema.nullable(),
  companyInfo: z.object({
    name: z.string(),
    phone: z.string().optional(),
    logoUrl: z.string().optional(),
  }).optional(),
});
export type CustomerTrackingData = z.infer<typeof customerTrackingDataSchema>;

/**
 * Tracking status for display
 */
export const TRACKING_STATUS_LABELS: Record<TrackingLinkStatus, string> = {
  pending: 'Waiting to Start',
  active: 'En Route',
  expired: 'Link Expired',
  completed: 'Service Complete',
  cancelled: 'Cancelled',
};

export const TRACKING_STATUS_COLORS: Record<TrackingLinkStatus, string> = {
  pending: '#f59e0b', // amber
  active: '#22c55e', // green
  expired: '#9ca3af', // gray
  completed: '#3b82f6', // blue
  cancelled: '#ef4444', // red
};

/**
 * Location status for ETA display
 */
export const LOCATION_STATUS_LABELS = {
  en_route: 'On the Way',
  arriving: 'Almost There!',
  on_site: 'Has Arrived',
  completed: 'Service Complete',
};

/**
 * Calculate formatted ETA string
 */
export function formatETA(minutes: number): string {
  if (minutes <= 0) return 'Arriving now';
  if (minutes < 60) return `${Math.round(minutes)} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format time for display (e.g., "2:30 PM")
 */
export function formatArrivalTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Arriving soon threshold in minutes
 */
export const ARRIVING_SOON_THRESHOLD = 5;

/**
 * Check if technician is arriving soon
 */
export function isArrivingSoon(etaMinutes: number): boolean {
  return etaMinutes > 0 && etaMinutes <= ARRIVING_SOON_THRESHOLD;
}

/**
 * Generate tracking link URL
 */
export function generateTrackingLink(token: string, baseUrl?: string): string {
  const base = baseUrl || window.location.origin;
  return `${base}/track/${token}`;
}

/**
 * SMS template for tracking link
 */
export function generateTrackingSMS(
  customerName: string,
  technicianName: string,
  trackingUrl: string,
  companyName = 'ECBTX'
): string {
  return `Hi ${customerName}! ${technicianName} from ${companyName} is on the way. Track their arrival in real-time: ${trackingUrl}`;
}
