/**
 * ETADisplay Component
 * Dynamic ETA display with countdown and status indicators
 */
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ETAInfo, TechnicianLocationUpdate } from "@/api/types/tracking";
import {
  formatETA,
  formatArrivalTime,
  isArrivingSoon,
  LOCATION_STATUS_LABELS,
} from "@/api/types/tracking";

interface ETADisplayProps {
  /** ETA information */
  eta: ETAInfo | null;
  /** Current technician status */
  status?: TechnicianLocationUpdate["status"];
  /** Technician name */
  technicianName?: string;
  /** Show distance */
  showDistance?: boolean;
  /** Show arrival time */
  showArrivalTime?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

const STATUS_CONFIGS = {
  en_route: {
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    iconColor: "text-blue-500",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
    pulseColor: "bg-blue-500",
  },
  arriving: {
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-700",
    iconColor: "text-amber-500",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    ),
    pulseColor: "bg-amber-500",
  },
  on_site: {
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
    iconColor: "text-green-500",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
    ),
    pulseColor: "bg-green-500",
  },
  completed: {
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    textColor: "text-gray-700",
    iconColor: "text-gray-500",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    pulseColor: "bg-gray-500",
  },
};

export function ETADisplay({
  eta,
  status = "en_route",
  technicianName,
  showDistance = true,
  showArrivalTime = true,
  compact = false,
  className = "",
}: ETADisplayProps) {
  const [countdown, setCountdown] = useState<number | null>(null);

  // Update countdown every second for arriving soon
  useEffect(() => {
    if (!eta) {
      setCountdown(null);
      return;
    }

    const calculateRemaining = () => {
      const arrival = new Date(eta.estimatedArrivalTime).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((arrival - now) / 60000)); // minutes
      return remaining;
    };

    setCountdown(calculateRemaining());

    const interval = setInterval(() => {
      setCountdown(calculateRemaining());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [eta]);

  const config = STATUS_CONFIGS[status];
  const etaMinutes = countdown ?? eta?.durationRemaining ?? 0;
  const arriving = isArrivingSoon(etaMinutes);

  // Formatted values
  const formattedETA = useMemo(() => formatETA(etaMinutes), [etaMinutes]);
  const arrivalTime = useMemo(
    () => (eta ? formatArrivalTime(eta.estimatedArrivalTime) : null),
    [eta],
  );
  const distanceText = useMemo(() => {
    if (!eta) return null;
    const km = eta.distanceRemaining;
    if (km < 1) return `${Math.round(km * 1000)} meters`;
    return `${km.toFixed(1)} km`;
  }, [eta]);

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border",
          config.bgColor,
          config.borderColor,
          className,
        )}
      >
        <div
          className={cn("p-2 rounded-full", config.bgColor, config.iconColor)}
        >
          {config.icon}
        </div>
        <div className="flex-1">
          <p className={cn("text-lg font-bold", config.textColor)}>
            {status === "on_site" ? "Arrived!" : formattedETA}
          </p>
          <p className="text-sm text-gray-600">
            {LOCATION_STATUS_LABELS[status]}
          </p>
        </div>
        <div
          className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            config.pulseColor,
          )}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border-2 overflow-hidden",
        config.borderColor,
        arriving ? "animate-pulse-subtle" : "",
        className,
      )}
    >
      {/* Header */}
      <div className={cn("px-4 py-3 flex items-center gap-3", config.bgColor)}>
        <div
          className={cn(
            "p-2 rounded-full bg-white shadow-sm",
            config.iconColor,
          )}
        >
          {config.icon}
        </div>
        <div className="flex-1">
          <p className={cn("font-semibold", config.textColor)}>
            {LOCATION_STATUS_LABELS[status]}
          </p>
          {technicianName && (
            <p className="text-sm text-gray-600">{technicianName}</p>
          )}
        </div>
        <div
          className={cn(
            "w-3 h-3 rounded-full animate-pulse",
            config.pulseColor,
          )}
        />
      </div>

      {/* Main ETA Display */}
      <div className="bg-white px-4 py-6 text-center">
        {status === "on_site" ? (
          <div>
            <div className="text-5xl mb-2">
              <span role="img" aria-label="checkmark">
                &#10004;
              </span>
            </div>
            <p className="text-2xl font-bold text-green-600">Has Arrived!</p>
            <p className="text-gray-500 mt-1">Your technician is here</p>
          </div>
        ) : status === "completed" ? (
          <div>
            <div className="text-5xl mb-2">
              <span role="img" aria-label="check">
                &#9989;
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-700">Service Complete</p>
            <p className="text-gray-500 mt-1">Thank you for your business!</p>
          </div>
        ) : (
          <>
            <p
              className={cn(
                "text-5xl font-bold tracking-tight",
                config.textColor,
              )}
            >
              {formattedETA}
            </p>
            {arriving && (
              <p className="text-amber-600 font-medium mt-2 animate-pulse">
                Almost there!
              </p>
            )}
          </>
        )}
      </div>

      {/* Footer stats */}
      {(showArrivalTime || showDistance) &&
        status !== "on_site" &&
        status !== "completed" && (
          <div className="bg-gray-50 px-4 py-3 flex justify-center gap-6 border-t border-gray-100">
            {showArrivalTime && arrivalTime && (
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Arrives at
                </p>
                <p className="text-lg font-semibold text-gray-700">
                  {arrivalTime}
                </p>
              </div>
            )}
            {showDistance && distanceText && (
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Distance
                </p>
                <p className="text-lg font-semibold text-gray-700">
                  {distanceText}
                </p>
              </div>
            )}
          </div>
        )}

      {/* Custom animation */}
      <style>{`
        @keyframes pulse-subtle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.01); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

/**
 * Minimal ETA badge for inline use
 */
export function ETABadge({
  eta,
  status = "en_route",
  className = "",
}: {
  eta: ETAInfo | null;
  status?: TechnicianLocationUpdate["status"];
  className?: string;
}) {
  const config = STATUS_CONFIGS[status];
  const etaMinutes = eta?.durationRemaining ?? 0;
  const formattedETA = formatETA(etaMinutes);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium",
        config.bgColor,
        config.textColor,
        className,
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full animate-pulse",
          config.pulseColor,
        )}
      />
      {status === "on_site" ? "Arrived" : formattedETA}
    </span>
  );
}

export default ETADisplay;
