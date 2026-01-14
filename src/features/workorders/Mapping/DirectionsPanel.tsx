/**
 * DirectionsPanel Component
 * Turn-by-turn directions with step list, distances, and navigation button
 */
import { useMemo } from "react";
import {
  calculateBearing,
  calculateDistanceBetweenPoints,
  formatDistance,
  formatDuration,
  type Coordinates,
} from "./utils/routingUtils";

// ============================================
// Types
// ============================================

export interface DirectionStep {
  id: string;
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  maneuver: ManeuverType;
  startLocation: Coordinates;
  endLocation: Coordinates;
}

export type ManeuverType =
  | "depart"
  | "arrive"
  | "turn-left"
  | "turn-right"
  | "turn-slight-left"
  | "turn-slight-right"
  | "turn-sharp-left"
  | "turn-sharp-right"
  | "straight"
  | "merge"
  | "ramp"
  | "fork-left"
  | "fork-right"
  | "roundabout"
  | "u-turn";

export interface DirectionsPanelProps {
  /** Route steps */
  steps: DirectionStep[];
  /** Origin location */
  origin: Coordinates & { address?: string };
  /** Destination location */
  destination: Coordinates & { address?: string };
  /** Total distance in meters */
  totalDistance?: number;
  /** Total duration in seconds */
  totalDuration?: number;
  /** Current step index (for highlighting) */
  currentStepIndex?: number;
  /** Callback when step is clicked */
  onStepClick?: (step: DirectionStep, index: number) => void;
  /** Custom CSS class */
  className?: string;
  /** Panel height */
  height?: string;
  /** Show "Start Navigation" button */
  showNavigationButton?: boolean;
  /** Collapsed mode (just summary) */
  collapsed?: boolean;
  /** Toggle collapsed callback */
  onToggleCollapsed?: () => void;
}

// ============================================
// Maneuver Icons
// ============================================

function ManeuverIcon({
  maneuver,
  className = "",
}: {
  maneuver: ManeuverType;
  className?: string;
}) {
  const iconPaths: Record<ManeuverType, string> = {
    depart: "M12 2L4 12l1.41 1.41L11 7.83V22h2V7.83l5.59 5.58L20 12l-8-10z",
    arrive:
      "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
    "turn-left":
      "M14 7v2.17l-4.17-4.17 4.17-4.17V3h6v6h-2V5.83L12.83 11 19 17.17V15h2v6h-6v-2h2.17L11 12.83V7z",
    "turn-right":
      "M10 7v2.17l4.17-4.17-4.17-4.17V3H4v6h2V5.83L11.17 11 5 17.17V15H3v6h6v-2H6.83L13 12.83V7z",
    "turn-slight-left":
      "M18 18.5v-1.84L14.83 19.5l3.17 2.84v-1.84h4v-2h-4zm-4.41-8.5L17 14.41 15.59 15.83 12 12.24V20h-2V8c0-2.21 1.79-4 4-4v2c-1.1 0-2 .9-2 2v1.07l5.17 5.17 1.42-1.41L13.59 10z",
    "turn-slight-right":
      "M6 18.5v-1.84l3.17 2.84-3.17 2.84v-1.84H2v-2h4zm4.41-8.5L7 14.41l1.41 1.42 3.59-3.59V20h2V8c0-2.21-1.79-4-4-4v2c1.1 0 2 .9 2 2v1.07l-5.17 5.17-1.42-1.41L10.41 10z",
    "turn-sharp-left": "M16 5.83l-4-4V5H6v14h2V7h4v3.17l4-4z",
    "turn-sharp-right": "M8 5.83l4-4V5h6v14h-2V7h-4v3.17l-4-4z",
    straight: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z",
    merge:
      "M17 4l-1.41 1.41L17.17 7H8c-2.21 0-4 1.79-4 4v9h2v-9c0-1.1.9-2 2-2h9.17l-1.58 1.59L17 12l4-4-4-4z",
    ramp: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z",
    "fork-left": "M14 4l-4 4 1.41 1.41L13 7.83V18h2V4z M10 20h4v-2h-4z",
    "fork-right": "M10 4l4 4-1.41 1.41L11 7.83V18H9V4z M10 20h4v-2h-4z",
    roundabout:
      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z",
    "u-turn":
      "M18 9c0-3.31-2.69-6-6-6S6 5.69 6 9v7h2V9c0-2.21 1.79-4 4-4s4 1.79 4 4v7.17l-2.59-2.58L12 15l5 5 5-5-1.41-1.41L18 16.17V9z",
  };

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d={iconPaths[maneuver] || iconPaths.straight} />
    </svg>
  );
}

// ============================================
// Direction Step Component
// ============================================

function DirectionStepItem({
  step,
  isActive,
  isLast,
  onClick,
}: {
  step: DirectionStep;
  isActive: boolean;
  isLast: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 p-3 text-left transition-colors ${
        isActive ? "bg-blue-50" : "hover:bg-gray-50"
      } ${!isLast ? "border-b border-gray-100" : ""}`}
    >
      {/* Step number and icon */}
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isActive
              ? "bg-blue-500 text-white"
              : step.maneuver === "arrive"
                ? "bg-green-500 text-white"
                : step.maneuver === "depart"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-600"
          }`}
        >
          <ManeuverIcon maneuver={step.maneuver} className="w-5 h-5" />
        </div>
        {!isLast && <div className="w-0.5 h-8 bg-gray-200 mt-1" />}
      </div>

      {/* Instruction */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${isActive ? "font-semibold text-blue-900" : "text-gray-900"}`}
        >
          {step.instruction}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span>{formatDistance(step.distance)}</span>
          <span>-</span>
          <span>{formatDuration(step.duration)}</span>
        </div>
      </div>
    </button>
  );
}

// ============================================
// Navigation Button Component
// ============================================

function NavigationButton({
  destination,
  className = "",
}: {
  destination: Coordinates & { address?: string };
  className?: string;
}) {
  const openNavigation = () => {
    // Try native apps first, then fallback to Google Maps web
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
    const appleMapsUrl = `maps://maps.apple.com/?daddr=${destination.lat},${destination.lng}`;

    // Detect platform
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    if (isIOS) {
      // Try Apple Maps first
      window.location.href = appleMapsUrl;
      setTimeout(() => {
        window.open(googleMapsUrl, "_blank");
      }, 500);
    } else if (isAndroid) {
      // Try Google Maps app via intent
      window.open(googleMapsUrl, "_blank");
    } else {
      // Desktop - open Google Maps in new tab
      window.open(googleMapsUrl, "_blank");
    }
  };

  return (
    <button
      onClick={openNavigation}
      className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors ${className}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.71 11.29l-9-9c-.39-.39-1.02-.39-1.41 0l-9 9c-.39.39-.39 1.02 0 1.41l9 9c.39.39 1.02.39 1.41 0l9-9c.39-.38.39-1.01 0-1.41zM14 14.5V12h-4v3H8v-4c0-.55.45-1 1-1h5V7.5l3.5 3.5-3.5 3.5z" />
      </svg>
      Start Navigation
    </button>
  );
}

// ============================================
// Generate Simplified Directions
// ============================================

export function generateSimplifiedDirections(
  points: Coordinates[],
  destination: Coordinates & { address?: string },
): DirectionStep[] {
  if (points.length < 2) return [];

  const steps: DirectionStep[] = [];

  // Add depart step
  steps.push({
    id: "step-0",
    instruction: "Start heading to your destination",
    distance: 0,
    duration: 0,
    maneuver: "depart",
    startLocation: points[0],
    endLocation: points[0],
  });

  // Generate intermediate steps based on bearing changes
  for (let i = 1; i < points.length - 1; i++) {
    const prevBearing = calculateBearing(points[i - 1], points[i]);
    const nextBearing = calculateBearing(points[i], points[i + 1]);
    const bearingChange = ((nextBearing - prevBearing + 540) % 360) - 180;

    let maneuver: ManeuverType = "straight";
    let turnInstruction = "Continue straight";

    if (Math.abs(bearingChange) > 150) {
      maneuver = "u-turn";
      turnInstruction = "Make a U-turn";
    } else if (bearingChange > 60) {
      maneuver = "turn-right";
      turnInstruction = "Turn right";
    } else if (bearingChange > 20) {
      maneuver = "turn-slight-right";
      turnInstruction = "Turn slightly right";
    } else if (bearingChange < -60) {
      maneuver = "turn-left";
      turnInstruction = "Turn left";
    } else if (bearingChange < -20) {
      maneuver = "turn-slight-left";
      turnInstruction = "Turn slightly left";
    }

    const distance = calculateDistanceBetweenPoints(points[i], points[i + 1]);
    const duration = Math.round(distance / 11); // ~25 mph

    steps.push({
      id: `step-${i}`,
      instruction: `${turnInstruction} and continue for ${formatDistance(distance)}`,
      distance,
      duration,
      maneuver,
      startLocation: points[i],
      endLocation: points[i + 1],
    });
  }

  // Add arrive step
  const lastDistance =
    points.length > 1
      ? calculateDistanceBetweenPoints(
          points[points.length - 2],
          points[points.length - 1],
        )
      : 0;

  steps.push({
    id: `step-${points.length}`,
    instruction: destination.address
      ? `Arrive at ${destination.address}`
      : "Arrive at your destination",
    distance: lastDistance,
    duration: Math.round(lastDistance / 11),
    maneuver: "arrive",
    startLocation: points[points.length - 2] || points[0],
    endLocation: destination,
  });

  return steps;
}

// ============================================
// Main DirectionsPanel Component
// ============================================

export function DirectionsPanel({
  steps,
  origin,
  destination,
  totalDistance,
  totalDuration,
  currentStepIndex = 0,
  onStepClick,
  className = "",
  height = "400px",
  showNavigationButton = true,
  collapsed = false,
  onToggleCollapsed,
}: DirectionsPanelProps) {
  // Calculate totals if not provided
  const calculatedDistance = useMemo(() => {
    if (totalDistance !== undefined) return totalDistance;
    return steps.reduce((sum, step) => sum + step.distance, 0);
  }, [steps, totalDistance]);

  const calculatedDuration = useMemo(() => {
    if (totalDuration !== undefined) return totalDuration;
    return steps.reduce((sum, step) => sum + step.duration, 0);
  }, [steps, totalDuration]);

  if (steps.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mx-auto mb-2 text-gray-400"
          >
            <path d="M21.71 11.29l-9-9c-.39-.39-1.02-.39-1.41 0l-9 9c-.39.39-.39 1.02 0 1.41l9 9c.39.39 1.02.39 1.41 0l9-9c.39-.38.39-1.01 0-1.41z" />
          </svg>
          <p>No directions available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl shadow-lg overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="p-4 bg-gray-50 border-b">
        <button
          onClick={onToggleCollapsed}
          className="w-full flex items-center justify-between"
        >
          <div>
            <h3 className="font-semibold text-gray-900">Directions</h3>
            <p className="text-sm text-gray-500">
              {formatDistance(calculatedDistance)} -{" "}
              {formatDuration(calculatedDuration)}
            </p>
          </div>
          {onToggleCollapsed && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`text-gray-400 transition-transform ${
                collapsed ? "rotate-180" : ""
              }`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </button>
      </div>

      {/* Locations */}
      {!collapsed && (
        <div className="p-4 border-b bg-white">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <div className="w-0.5 h-8 bg-gray-200" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-xs text-gray-500">From</p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {origin.address || "Your Location"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">To</p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {destination.address || "Destination"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Steps */}
      {!collapsed && (
        <div className="overflow-y-auto" style={{ maxHeight: height }}>
          {steps.map((step, index) => (
            <DirectionStepItem
              key={step.id}
              step={step}
              isActive={index === currentStepIndex}
              isLast={index === steps.length - 1}
              onClick={() => onStepClick?.(step, index)}
            />
          ))}
        </div>
      )}

      {/* Navigation Button */}
      {showNavigationButton && (
        <div className="p-4 border-t bg-gray-50">
          <NavigationButton destination={destination} />
        </div>
      )}
    </div>
  );
}

export default DirectionsPanel;
