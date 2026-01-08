/**
 * GPS Tracking Feature Exports
 * Includes internal dispatch views and customer-facing tracking pages
 */

// Pages
export { TrackingDashboard } from './TrackingDashboard.tsx';
export { TechnicianTracker } from './TechnicianTracker.tsx';
// CustomerTrackingPage is exported from components
export { CustomerTrackingPage } from './components/CustomerTrackingPage.tsx';

// Components
export { LiveDispatchMap } from './components/LiveDispatchMap.tsx';
export { TechnicianGPSCapture } from './components/TechnicianGPSCapture.tsx';
export { TrackingMap } from './components/TrackingMap.tsx';
export { ETADisplay, ETABadge } from './components/ETADisplay.tsx';

// Re-export hooks from api
export {
  useRealTimeTracking,
  useDispatchTracking,
  useCreateTrackingSession,
  useSendTrackingLink,
  calculateETAFromDistance,
  getLocationStatus,
} from '@/api/hooks/useRealTimeTracking.ts';

// Re-export types
export type {
  CustomerTrackingData,
  TechnicianLocationUpdate,
  ETAInfo,
  TrackingSession,
  TechnicianProfile,
  TrackingLinkStatus,
} from '@/api/types/tracking.ts';

export {
  TRACKING_STATUS_LABELS,
  TRACKING_STATUS_COLORS,
  LOCATION_STATUS_LABELS,
  formatETA,
  formatArrivalTime,
  isArrivingSoon,
  ARRIVING_SOON_THRESHOLD,
  generateTrackingLink,
  generateTrackingSMS,
} from '@/api/types/tracking.ts';
