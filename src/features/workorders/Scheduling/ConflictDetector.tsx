/**
 * ConflictDetector Component
 * Display scheduling conflicts and warnings for work orders
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils.ts";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import type { WorkOrder, SchedulingConflict } from "@/api/types/workOrder.ts";
import { useConflicts } from "./hooks/useScheduling.ts";

interface ConflictDetectorProps {
  workOrder: WorkOrder;
  allWorkOrders?: WorkOrder[];
  className?: string;
  compact?: boolean;
  onConflictClick?: (conflict: SchedulingConflict) => void;
}

/**
 * Get icon for conflict type
 */
function getConflictIcon(type: SchedulingConflict["type"]): string {
  switch (type) {
    case "overlap":
      return "⚠️";
    case "travel_time":
      return "🚗";
    case "capacity":
      return "📊";
    case "equipment":
      return "🔧";
    default:
      return "❗";
  }
}

/**
 * Get conflict type label
 */
function getConflictTypeLabel(type: SchedulingConflict["type"]): string {
  switch (type) {
    case "overlap":
      return "Time Overlap";
    case "travel_time":
      return "Travel Time";
    case "capacity":
      return "Capacity";
    case "equipment":
      return "Equipment";
    default:
      return "Conflict";
  }
}

export function ConflictDetector({
  workOrder,
  allWorkOrders: _allWorkOrders,
  className,
  compact = false,
  onConflictClick,
}: ConflictDetectorProps) {
  const { conflicts, hasErrors, hasWarnings } = useConflicts(workOrder);

  // Group conflicts by severity
  const groupedConflicts = useMemo(() => {
    const errors = conflicts.filter((c) => c.severity === "error");
    const warnings = conflicts.filter((c) => c.severity === "warning");
    return { errors, warnings };
  }, [conflicts]);

  // No conflicts - show success state
  if (conflicts.length === 0) {
    if (compact) return null;

    return (
      <div
        className={cn(
          "flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20",
          className,
        )}
      >
        <span className="text-success text-lg">✓</span>
        <span className="text-sm text-success font-medium">
          No scheduling conflicts detected
        </span>
      </div>
    );
  }

  // Compact mode - just badges
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {hasErrors && (
          <Badge variant="danger" size="sm">
            {groupedConflicts.errors.length} error
            {groupedConflicts.errors.length !== 1 ? "s" : ""}
          </Badge>
        )}
        {hasWarnings && (
          <Badge variant="warning" size="sm">
            {groupedConflicts.warnings.length} warning
            {groupedConflicts.warnings.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Summary header */}
      <div
        className={cn(
          "flex items-center justify-between p-3 rounded-lg",
          hasErrors
            ? "bg-danger/10 border border-danger/20"
            : "bg-warning/10 border border-warning/20",
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-lg",
              hasErrors ? "text-danger" : "text-warning",
            )}
          >
            {hasErrors ? "⚠️" : "⚡"}
          </span>
          <span
            className={cn(
              "text-sm font-medium",
              hasErrors ? "text-danger" : "text-warning",
            )}
          >
            {conflicts.length} scheduling conflict
            {conflicts.length !== 1 ? "s" : ""} detected
          </span>
        </div>
        <div className="flex items-center gap-2">
          {groupedConflicts.errors.length > 0 && (
            <Badge variant="danger" size="sm">
              {groupedConflicts.errors.length} error
              {groupedConflicts.errors.length !== 1 ? "s" : ""}
            </Badge>
          )}
          {groupedConflicts.warnings.length > 0 && (
            <Badge variant="warning" size="sm">
              {groupedConflicts.warnings.length} warning
              {groupedConflicts.warnings.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      {/* Errors */}
      {groupedConflicts.errors.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-danger uppercase tracking-wide">
            Errors (must resolve)
          </div>
          {groupedConflicts.errors.map((conflict, index) => (
            <ConflictCard
              key={`error-${index}`}
              conflict={conflict}
              onClick={() => onConflictClick?.(conflict)}
            />
          ))}
        </div>
      )}

      {/* Warnings */}
      {groupedConflicts.warnings.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-warning uppercase tracking-wide">
            Warnings (review recommended)
          </div>
          {groupedConflicts.warnings.map((conflict, index) => (
            <ConflictCard
              key={`warning-${index}`}
              conflict={conflict}
              onClick={() => onConflictClick?.(conflict)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Individual conflict card component
 */
function ConflictCard({
  conflict,
  onClick,
}: {
  conflict: SchedulingConflict;
  onClick?: () => void;
}) {
  const isError = conflict.severity === "error";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-all",
        isError
          ? "bg-danger/5 border-danger/20 hover:bg-danger/10"
          : "bg-warning/5 border-warning/20 hover:bg-warning/10",
        onClick && "cursor-pointer",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">
          {getConflictIcon(conflict.type)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "text-sm font-medium",
                isError ? "text-danger" : "text-warning",
              )}
            >
              {getConflictTypeLabel(conflict.type)}
            </span>
            {conflict.technicianId && (
              <Badge variant="default" size="sm">
                {conflict.technicianId}
              </Badge>
            )}
          </div>
          <p className="text-sm text-text-secondary">{conflict.message}</p>
        </div>
        {onClick && (
          <svg
            className={cn(
              "w-4 h-4 flex-shrink-0",
              isError ? "text-danger" : "text-warning",
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        )}
      </div>
    </button>
  );
}

/**
 * Inline conflict indicator for use in lists/tables
 */
export function ConflictIndicator({
  workOrder,
  className,
}: {
  workOrder: WorkOrder;
  className?: string;
}) {
  const { conflicts, hasErrors, hasWarnings } = useConflicts(workOrder);

  if (conflicts.length === 0) return null;

  return (
    <div
      className={cn("flex items-center", className)}
      title={conflicts.map((c) => c.message).join("\n")}
    >
      {hasErrors ? (
        <span className="text-danger text-sm">⚠️</span>
      ) : hasWarnings ? (
        <span className="text-warning text-sm">⚡</span>
      ) : null}
    </div>
  );
}

/**
 * Summary stats for multiple work orders
 */
export function ConflictSummary({
  workOrders: _workOrders,
  className,
}: {
  workOrders: WorkOrder[];
  className?: string;
}) {
  // This would need to check conflicts for all work orders
  // For now, just show a placeholder
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-text-primary">
            Scheduling Health
          </div>
          <Badge variant="success">All Clear</Badge>
        </div>
        <p className="text-xs text-text-secondary mt-2">
          Review individual work orders for potential conflicts
        </p>
      </CardContent>
    </Card>
  );
}
