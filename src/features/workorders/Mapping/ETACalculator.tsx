/**
 * ETACalculator Component
 * Real-time ETA display with countdown timer that updates as technician moves
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  calculateDistanceBetweenPoints,
  formatDistance,
  formatDuration,
  formatETATime,
  calculateETA,
  type Coordinates,
} from './utils/routingUtils';

// ============================================
// Types
// ============================================

export interface ETACalculatorProps {
  /** Current technician location */
  technicianLocation: Coordinates | null;
  /** Destination location */
  destinationLocation: Coordinates;
  /** Current speed in m/s (optional, will estimate if not provided) */
  currentSpeed?: number;
  /** Callback when ETA updates */
  onETAUpdate?: (eta: ETAData) => void;
  /** Update interval in ms */
  updateInterval?: number;
  /** Display variant */
  variant?: 'compact' | 'detailed' | 'minimal';
  /** Show distance */
  showDistance?: boolean;
  /** Show countdown timer */
  showCountdown?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Arriving soon threshold in meters */
  arrivingSoonThreshold?: number;
  /** Callback when technician is arriving soon */
  onArrivingSoon?: () => void;
  /** Callback when technician has arrived */
  onArrived?: () => void;
}

export interface ETAData {
  /** Estimated arrival time */
  arrivalTime: Date;
  /** Formatted arrival time string */
  formattedArrivalTime: string;
  /** Distance remaining in meters */
  distanceRemaining: number;
  /** Formatted distance string */
  formattedDistance: string;
  /** Duration remaining in seconds */
  durationRemaining: number;
  /** Formatted duration string */
  formattedDuration: string;
  /** Status: 'en_route' | 'arriving' | 'arrived' */
  status: 'en_route' | 'arriving' | 'arrived';
  /** Last updated timestamp */
  lastUpdated: Date;
}

// ============================================
// ETA Status Colors
// ============================================

const STATUS_COLORS = {
  en_route: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    accent: 'text-blue-500',
    border: 'border-blue-200',
  },
  arriving: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    accent: 'text-amber-500',
    border: 'border-amber-200',
  },
  arrived: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    accent: 'text-green-500',
    border: 'border-green-200',
  },
};

// ============================================
// Countdown Timer Component
// ============================================

function CountdownTimer({
  durationSeconds,
  className = '',
}: {
  durationSeconds: number;
  className?: string;
}) {
  const [remaining, setRemaining] = useState(durationSeconds);

  useEffect(() => {
    setRemaining(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    if (remaining <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [remaining]);

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  const formatNum = (n: number) => n.toString().padStart(2, '0');

  if (remaining <= 0) {
    return <span className={`font-mono ${className}`}>--:--</span>;
  }

  if (hours > 0) {
    return (
      <span className={`font-mono ${className}`}>
        {formatNum(hours)}:{formatNum(minutes)}:{formatNum(seconds)}
      </span>
    );
  }

  return (
    <span className={`font-mono ${className}`}>
      {formatNum(minutes)}:{formatNum(seconds)}
    </span>
  );
}

// ============================================
// Progress Bar Component
// ============================================

function ETAProgressBar({
  progress,
  status,
}: {
  progress: number;
  status: ETAData['status'];
}) {
  const progressColor = {
    en_route: 'bg-blue-500',
    arriving: 'bg-amber-500',
    arrived: 'bg-green-500',
  };

  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full ${progressColor[status]} transition-all duration-500 ease-out`}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}

// ============================================
// Main ETACalculator Component
// ============================================

export function ETACalculator({
  technicianLocation,
  destinationLocation,
  currentSpeed,
  onETAUpdate,
  updateInterval = 5000,
  variant = 'detailed',
  showDistance = true,
  showCountdown = true,
  className = '',
  arrivingSoonThreshold = 500, // 500 meters
  onArrivingSoon,
  onArrived,
}: ETACalculatorProps) {
  const [etaData, setEtaData] = useState<ETAData | null>(null);
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [hasNotifiedArrivingSoon, setHasNotifiedArrivingSoon] = useState(false);
  const [hasNotifiedArrived, setHasNotifiedArrived] = useState(false);

  // Calculate ETA
  const calculateETAData = useCallback((): ETAData | null => {
    if (!technicianLocation) return null;

    const distance = calculateDistanceBetweenPoints(
      technicianLocation,
      destinationLocation
    );

    // Set initial distance on first calculation
    if (initialDistance === null) {
      setInitialDistance(distance);
    }

    // Determine status
    let status: ETAData['status'] = 'en_route';
    if (distance < 50) {
      status = 'arrived';
    } else if (distance < arrivingSoonThreshold) {
      status = 'arriving';
    }

    // Calculate ETA
    const eta = calculateETA(technicianLocation, destinationLocation, currentSpeed);
    const durationRemaining = Math.max(
      0,
      Math.round((eta.getTime() - Date.now()) / 1000)
    );

    return {
      arrivalTime: eta,
      formattedArrivalTime: formatETATime(eta),
      distanceRemaining: distance,
      formattedDistance: formatDistance(distance),
      durationRemaining,
      formattedDuration: formatDuration(durationRemaining),
      status,
      lastUpdated: new Date(),
    };
  }, [
    technicianLocation,
    destinationLocation,
    currentSpeed,
    initialDistance,
    arrivingSoonThreshold,
  ]);

  // Update ETA periodically
  useEffect(() => {
    const updateETA = () => {
      const newETA = calculateETAData();
      if (newETA) {
        setEtaData(newETA);
        onETAUpdate?.(newETA);

        // Check for status callbacks
        if (newETA.status === 'arriving' && !hasNotifiedArrivingSoon) {
          setHasNotifiedArrivingSoon(true);
          onArrivingSoon?.();
        }
        if (newETA.status === 'arrived' && !hasNotifiedArrived) {
          setHasNotifiedArrived(true);
          onArrived?.();
        }
      }
    };

    // Initial calculation
    updateETA();

    // Set up interval
    const interval = setInterval(updateETA, updateInterval);

    return () => clearInterval(interval);
  }, [
    calculateETAData,
    updateInterval,
    onETAUpdate,
    onArrivingSoon,
    onArrived,
    hasNotifiedArrivingSoon,
    hasNotifiedArrived,
  ]);

  // Calculate progress percentage
  const progress = useMemo(() => {
    if (!etaData || !initialDistance || initialDistance === 0) return 0;
    const traveled = initialDistance - etaData.distanceRemaining;
    return (traveled / initialDistance) * 100;
  }, [etaData, initialDistance]);

  // No location available
  if (!technicianLocation || !etaData) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg ${className}`}>
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
          <div>
            <p className="text-sm font-medium">Waiting for location...</p>
            <p className="text-xs">Technician location not available</p>
          </div>
        </div>
      </div>
    );
  }

  const colors = STATUS_COLORS[etaData.status];

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className={`text-sm font-medium ${colors.text}`}>
          ETA: {etaData.formattedArrivalTime}
        </span>
        {showCountdown && etaData.status !== 'arrived' && (
          <span className="text-xs text-gray-500">
            (<CountdownTimer durationSeconds={etaData.durationRemaining} />)
          </span>
        )}
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div
        className={`p-3 rounded-lg border ${colors.bg} ${colors.border} ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {etaData.status === 'arrived' ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={colors.accent}
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={colors.accent}
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            )}
            <div>
              <p className={`text-sm font-semibold ${colors.text}`}>
                {etaData.status === 'arrived'
                  ? 'Arrived!'
                  : `ETA: ${etaData.formattedArrivalTime}`}
              </p>
            </div>
          </div>
          {showCountdown && etaData.status !== 'arrived' && (
            <CountdownTimer
              durationSeconds={etaData.durationRemaining}
              className={`text-lg font-bold ${colors.accent}`}
            />
          )}
        </div>
        {showDistance && etaData.status !== 'arrived' && (
          <p className={`text-xs mt-1 ${colors.text} opacity-75`}>
            {etaData.formattedDistance} away
          </p>
        )}
      </div>
    );
  }

  // Detailed variant (default)
  return (
    <div
      className={`p-4 rounded-xl border ${colors.bg} ${colors.border} ${className}`}
    >
      {/* Status Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              etaData.status === 'arrived'
                ? 'bg-green-500'
                : etaData.status === 'arriving'
                ? 'bg-amber-500'
                : 'bg-blue-500'
            }`}
          >
            {etaData.status === 'arrived' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
              </svg>
            )}
          </div>
          <div>
            <p className={`font-semibold ${colors.text}`}>
              {etaData.status === 'arrived'
                ? 'Technician Has Arrived'
                : etaData.status === 'arriving'
                ? 'Almost There!'
                : 'On The Way'}
            </p>
            <p className="text-xs text-gray-500">
              Updated {etaData.lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Countdown */}
        {showCountdown && etaData.status !== 'arrived' && (
          <div className="text-right">
            <CountdownTimer
              durationSeconds={etaData.durationRemaining}
              className={`text-2xl font-bold ${colors.accent}`}
            />
            <p className="text-xs text-gray-500">remaining</p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {etaData.status !== 'arrived' && (
        <div className="mb-4">
          <ETAProgressBar progress={progress} status={etaData.status} />
        </div>
      )}

      {/* Stats Row */}
      {etaData.status !== 'arrived' && (
        <div className="grid grid-cols-3 gap-4 text-center">
          {showDistance && (
            <div>
              <p className={`text-lg font-semibold ${colors.text}`}>
                {etaData.formattedDistance}
              </p>
              <p className="text-xs text-gray-500">Distance</p>
            </div>
          )}
          <div>
            <p className={`text-lg font-semibold ${colors.text}`}>
              {etaData.formattedDuration}
            </p>
            <p className="text-xs text-gray-500">Travel Time</p>
          </div>
          <div>
            <p className={`text-lg font-semibold ${colors.text}`}>
              {etaData.formattedArrivalTime}
            </p>
            <p className="text-xs text-gray-500">Arrival</p>
          </div>
        </div>
      )}

      {/* Arrived Message */}
      {etaData.status === 'arrived' && (
        <div className="text-center py-2">
          <p className="text-sm text-gray-600">
            Your technician is at the location and ready to assist you.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// ETACalculator Skeleton
// ============================================

export function ETACalculatorSkeleton({
  variant = 'detailed',
  className = '',
}: {
  variant?: 'compact' | 'detailed' | 'minimal';
  className?: string;
}) {
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`p-3 rounded-lg bg-gray-50 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl bg-gray-50 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
          <div>
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-1" />
            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="text-right">
          <div className="h-8 w-20 bg-gray-200 rounded animate-pulse mb-1" />
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="h-2 bg-gray-200 rounded-full mb-4 animate-pulse" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center">
            <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mx-auto mb-1" />
            <div className="h-3 w-12 bg-gray-200 rounded animate-pulse mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default ETACalculator;
