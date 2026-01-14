import { useState, memo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { AIDispatchSuggestion } from "@/api/hooks/useAIDispatch";
import { cn } from "@/lib/utils";

/**
 * Extended technician info for display
 */
interface TechnicianInfo {
  id: number;
  name: string;
  avatar_url?: string;
  skills: string[];
  current_location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  distance_miles?: number;
  eta_minutes?: number;
  jobs_today: number;
  is_available: boolean;
}

/**
 * Parts availability info
 */
interface PartsAvailability {
  item: string;
  in_stock: boolean;
  quantity_available: number;
  quantity_needed: number;
}

/**
 * Extended suggestion with additional display data
 */
interface ExtendedSuggestion extends AIDispatchSuggestion {
  technician_info?: TechnicianInfo;
  parts_availability?: PartsAvailability[];
  job_match_reasoning?: string[];
}

/**
 * Props for DispatchSuggestionCard
 */
interface DispatchSuggestionCardProps {
  suggestion: ExtendedSuggestion;
  onExecute: (suggestion: ExtendedSuggestion, actionId: string) => void;
  onDismiss: (suggestionId: string, reason?: string) => void;
  onModify?: (suggestion: ExtendedSuggestion) => void;
  isExecuting?: boolean;
  className?: string;
}

/**
 * Type icons for different suggestion types
 */
const TYPE_ICONS: Record<string, string> = {
  assign: "=",
  reschedule: "@",
  route_optimize: "#",
  parts_order: "$",
  follow_up: "%",
};

/**
 * Type labels for different suggestion types
 */
const TYPE_LABELS: Record<string, string> = {
  assign: "Assignment",
  reschedule: "Reschedule",
  route_optimize: "Route Optimization",
  parts_order: "Parts Order",
  follow_up: "Follow Up",
};

/**
 * DispatchSuggestionCard - Individual suggestion display with detailed information
 *
 * Features:
 * - Technician info (name, photo, skills, current location)
 * - Job match reasoning (why this tech for this job)
 * - ETA calculation display
 * - Accept/Reject/Modify buttons
 * - Parts availability indicator
 * - Confidence score visualization
 */
export const DispatchSuggestionCard = memo(function DispatchSuggestionCard({
  suggestion,
  onExecute,
  onDismiss,
  onModify,
  isExecuting = false,
  className,
}: DispatchSuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReasoningDetails, setShowReasoningDetails] = useState(false);
  const [dismissReason, setDismissReason] = useState<string | null>(null);

  // Confidence level styling
  const getConfidenceInfo = (confidence: number) => {
    if (confidence >= 0.8) {
      return {
        label: "High Confidence",
        color: "bg-success",
        textColor: "text-success",
        variant: "success" as const,
      };
    } else if (confidence >= 0.6) {
      return {
        label: "Medium Confidence",
        color: "bg-warning",
        textColor: "text-warning",
        variant: "warning" as const,
      };
    }
    return {
      label: "Low Confidence",
      color: "bg-text-muted",
      textColor: "text-text-muted",
      variant: "default" as const,
    };
  };

  const confidenceInfo = getConfidenceInfo(suggestion.confidence);
  const confidencePercent = Math.round(suggestion.confidence * 100);

  // Handle dismiss with optional reason
  const handleDismiss = () => {
    if (dismissReason !== null) {
      onDismiss(suggestion.id, dismissReason || undefined);
      setDismissReason(null);
    } else {
      setDismissReason("");
    }
  };

  // Cancel dismiss
  const cancelDismiss = () => {
    setDismissReason(null);
  };

  // Get primary and secondary actions
  const primaryAction = suggestion.actions.find((a) => a.type === "primary");
  const secondaryActions = suggestion.actions.filter(
    (a) => a.type === "secondary",
  );

  return (
    <Card
      className={cn(
        "overflow-hidden transition-shadow hover:shadow-md",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        {/* Type Icon */}
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg text-xl",
            "bg-primary/10 text-primary",
          )}
        >
          {TYPE_ICONS[suggestion.type] || "?"}
        </div>

        {/* Title and Description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-text-primary truncate">
              {suggestion.title}
            </h4>
            <Badge
              variant={confidenceInfo.variant}
              className="text-xs shrink-0"
            >
              {confidencePercent}%
            </Badge>
          </div>
          <p className="text-sm text-text-secondary line-clamp-2">
            {suggestion.description}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-text-muted">
              {TYPE_LABELS[suggestion.type] || suggestion.type}
            </span>
            {suggestion.estimated_impact?.time_saved_minutes && (
              <>
                <span className="text-text-muted">*</span>
                <span className="text-xs text-success">
                  Saves {suggestion.estimated_impact.time_saved_minutes} min
                </span>
              </>
            )}
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-text-muted hover:text-text-primary transition-colors shrink-0"
          aria-label={isExpanded ? "Collapse details" : "Expand details"}
        >
          <svg
            className={cn(
              "w-5 h-5 transition-transform",
              isExpanded && "rotate-180",
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-3 space-y-4 border-t border-border pt-3">
          {/* Technician Info */}
          {suggestion.technician_info && (
            <TechnicianInfoSection technician={suggestion.technician_info} />
          )}

          {/* Job Match Reasoning */}
          {(suggestion.job_match_reasoning || suggestion.reasoning) && (
            <div className="space-y-2">
              <button
                onClick={() => setShowReasoningDetails(!showReasoningDetails)}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Why this recommendation?
              </button>
              {showReasoningDetails && (
                <div className="bg-bg-muted rounded-lg p-3 text-sm text-text-secondary">
                  {suggestion.job_match_reasoning ? (
                    <ul className="list-disc list-inside space-y-1">
                      {suggestion.job_match_reasoning.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{suggestion.reasoning}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Parts Availability */}
          {suggestion.parts_availability &&
            suggestion.parts_availability.length > 0 && (
              <PartsAvailabilitySection parts={suggestion.parts_availability} />
            )}

          {/* Estimated Impact */}
          {suggestion.estimated_impact && (
            <EstimatedImpactSection impact={suggestion.estimated_impact} />
          )}

          {/* Confidence Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Confidence Score</span>
              <span className={confidenceInfo.textColor}>
                {confidenceInfo.label}
              </span>
            </div>
            <div className="h-2 bg-bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  confidenceInfo.color,
                )}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-4 py-3 bg-bg-muted border-t border-border flex items-center gap-2">
        {dismissReason !== null ? (
          // Dismiss reason input
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
              placeholder="Reason for dismissing (optional)"
              className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md bg-bg-card focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <Button size="sm" variant="secondary" onClick={cancelDismiss}>
              Cancel
            </Button>
            <Button size="sm" variant="danger" onClick={handleDismiss}>
              Dismiss
            </Button>
          </div>
        ) : (
          <>
            {/* Primary Action */}
            {primaryAction && (
              <Button
                size="sm"
                onClick={() => onExecute(suggestion, primaryAction.id)}
                disabled={isExecuting}
              >
                {isExecuting ? (
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-3 h-3 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Executing...
                  </span>
                ) : (
                  primaryAction.label
                )}
              </Button>
            )}

            {/* Secondary Actions */}
            {secondaryActions.map((action) => (
              <Button
                key={action.id}
                size="sm"
                variant="secondary"
                onClick={() => onExecute(suggestion, action.id)}
                disabled={isExecuting}
              >
                {action.label}
              </Button>
            ))}

            {/* Modify Button */}
            {onModify && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onModify(suggestion)}
                disabled={isExecuting}
              >
                Modify
              </Button>
            )}

            {/* Dismiss Button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              disabled={isExecuting}
              className="ml-auto text-text-muted hover:text-danger"
            >
              Dismiss
            </Button>
          </>
        )}
      </div>
    </Card>
  );
});

/**
 * Technician info section
 */
function TechnicianInfoSection({ technician }: { technician: TechnicianInfo }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-bg-muted/50 rounded-lg">
      {/* Avatar */}
      <div className="relative">
        {technician.avatar_url ? (
          <img
            src={technician.avatar_url}
            alt={technician.name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
            {technician.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </div>
        )}
        {/* Availability indicator */}
        <div
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white",
            technician.is_available ? "bg-success" : "bg-text-muted",
          )}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h5 className="font-medium text-text-primary">{technician.name}</h5>
          {technician.is_available ? (
            <Badge variant="success" className="text-xs">
              Available
            </Badge>
          ) : (
            <Badge variant="default" className="text-xs">
              Busy
            </Badge>
          )}
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-1 mt-1">
          {technician.skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="text-xs px-1.5 py-0.5 bg-bg-muted rounded text-text-secondary"
            >
              {skill}
            </span>
          ))}
          {technician.skills.length > 4 && (
            <span className="text-xs text-text-muted">
              +{technician.skills.length - 4} more
            </span>
          )}
        </div>

        {/* Location & ETA */}
        <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
          {technician.current_location?.address && (
            <span className="flex items-center gap-1">
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {technician.current_location.address}
            </span>
          )}
          {technician.distance_miles !== undefined && (
            <span>{technician.distance_miles.toFixed(1)} mi away</span>
          )}
          {technician.eta_minutes !== undefined && (
            <span className="text-primary font-medium">
              ETA: {technician.eta_minutes} min
            </span>
          )}
          <span>
            {technician.jobs_today} job{technician.jobs_today !== 1 ? "s" : ""}{" "}
            today
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Parts availability section
 */
function PartsAvailabilitySection({ parts }: { parts: PartsAvailability[] }) {
  const allAvailable = parts.every(
    (p) => p.in_stock && p.quantity_available >= p.quantity_needed,
  );
  const someAvailable = parts.some((p) => p.in_stock);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h5 className="text-sm font-medium text-text-primary">
          Parts Required
        </h5>
        {allAvailable ? (
          <Badge variant="success" className="text-xs">
            All In Stock
          </Badge>
        ) : someAvailable ? (
          <Badge variant="warning" className="text-xs">
            Partial Stock
          </Badge>
        ) : (
          <Badge variant="danger" className="text-xs">
            Out of Stock
          </Badge>
        )}
      </div>
      <div className="space-y-1">
        {parts.map((part, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                part.in_stock && part.quantity_available >= part.quantity_needed
                  ? "bg-success"
                  : part.in_stock
                    ? "bg-warning"
                    : "bg-danger",
              )}
            />
            <span className="text-text-secondary">{part.item}</span>
            <span className="text-xs text-text-muted ml-auto">
              {part.quantity_available}/{part.quantity_needed} available
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Estimated impact section
 */
function EstimatedImpactSection({
  impact,
}: {
  impact: NonNullable<AIDispatchSuggestion["estimated_impact"]>;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {impact.time_saved_minutes !== undefined &&
        impact.time_saved_minutes > 0 && (
          <div className="text-center p-2 bg-success/10 rounded-lg">
            <div className="text-lg font-semibold text-success">
              {impact.time_saved_minutes}
            </div>
            <div className="text-xs text-text-muted">min saved</div>
          </div>
        )}
      {impact.cost_saved !== undefined && impact.cost_saved > 0 && (
        <div className="text-center p-2 bg-success/10 rounded-lg">
          <div className="text-lg font-semibold text-success">
            ${impact.cost_saved}
          </div>
          <div className="text-xs text-text-muted">cost saved</div>
        </div>
      )}
      {impact.customer_satisfaction && (
        <div className="text-center p-2 bg-primary/10 rounded-lg">
          <div className="text-lg font-semibold text-primary">
            {impact.customer_satisfaction}
          </div>
          <div className="text-xs text-text-muted">satisfaction</div>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loader for DispatchSuggestionCard
 */
export function DispatchSuggestionCardSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex items-start gap-3 p-4 pb-3">
        <Skeleton variant="rounded" className="w-10 h-10" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton variant="text" className="h-5 w-48" />
            <Skeleton variant="rounded" className="h-5 w-12" />
          </div>
          <Skeleton variant="text" className="h-4 w-full" />
          <Skeleton variant="text" className="h-4 w-2/3" />
        </div>
      </div>
      <div className="px-4 py-3 bg-bg-muted border-t border-border flex items-center gap-2">
        <Skeleton variant="rounded" className="h-8 w-24" />
        <Skeleton variant="rounded" className="h-8 w-20" />
        <div className="ml-auto">
          <Skeleton variant="rounded" className="h-8 w-16" />
        </div>
      </div>
    </Card>
  );
}

/**
 * List of skeleton cards for loading state
 */
export function DispatchSuggestionCardSkeletonList({
  count = 3,
}: {
  count?: number;
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <DispatchSuggestionCardSkeleton key={i} />
      ))}
    </div>
  );
}
