import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input.tsx";
import { Label } from "@/components/ui/Label.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import {
  calculateRICEScore,
  getPrioritySuggestion,
  TICKET_PRIORITY_LABELS,
} from "@/api/types/ticket.ts";

interface RICEScoringProps {
  reach?: number;
  impact?: number;
  confidence?: number;
  effort?: number;
  onReachChange: (value: number | undefined) => void;
  onImpactChange: (value: number | undefined) => void;
  onConfidenceChange: (value: number | undefined) => void;
  onEffortChange: (value: number | undefined) => void;
  errors?: {
    reach?: { message?: string };
    impact?: { message?: string };
    confidence?: { message?: string };
    effort?: { message?: string };
  };
}

/**
 * RICE scoring calculator component
 * Helps prioritize tickets using the RICE framework
 */
export function RICEScoring({
  reach = 0,
  impact = 0,
  confidence = 0,
  effort = 0,
  onReachChange,
  onImpactChange,
  onConfidenceChange,
  onEffortChange,
  errors,
}: RICEScoringProps) {
  const [riceScore, setRiceScore] = useState(0);

  useEffect(() => {
    if (reach && impact && confidence && effort && effort > 0) {
      const score = calculateRICEScore(reach, impact, confidence, effort);
      setRiceScore(Math.round(score * 100) / 100);
    } else {
      setRiceScore(0);
    }
  }, [reach, impact, confidence, effort]);

  const suggestedPriority =
    riceScore > 0 ? getPrioritySuggestion(riceScore) : null;

  return (
    <div className="space-y-4">
      <div className="bg-bg-muted rounded-lg p-4">
        <h4 className="text-sm font-medium text-text-primary mb-2">
          RICE Framework
        </h4>
        <p className="text-xs text-text-secondary mb-4">
          RICE helps prioritize features by scoring them on Reach, Impact,
          Confidence, and Effort. Score = (Reach × Impact × Confidence%) /
          Effort
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="reach">
              Reach (0-10)
              <span className="text-xs text-text-muted font-normal ml-1">
                How many users affected?
              </span>
            </Label>
            <Input
              id="reach"
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={reach || ""}
              onChange={(e) =>
                onReachChange(
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              error={!!errors?.reach}
              placeholder="0"
            />
            {errors?.reach && (
              <p className="text-sm text-danger">{errors.reach.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="impact">
              Impact (0-10)
              <span className="text-xs text-text-muted font-normal ml-1">
                How much will this help?
              </span>
            </Label>
            <Input
              id="impact"
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={impact || ""}
              onChange={(e) =>
                onImpactChange(
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              error={!!errors?.impact}
              placeholder="0"
            />
            {errors?.impact && (
              <p className="text-sm text-danger">{errors.impact.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confidence">
              Confidence (0-100%)
              <span className="text-xs text-text-muted font-normal ml-1">
                How sure are you?
              </span>
            </Label>
            <Input
              id="confidence"
              type="number"
              min="0"
              max="100"
              step="1"
              value={confidence || ""}
              onChange={(e) =>
                onConfidenceChange(
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              error={!!errors?.confidence}
              placeholder="0"
            />
            {errors?.confidence && (
              <p className="text-sm text-danger">{errors.confidence.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="effort">
              Effort (person-weeks)
              <span className="text-xs text-text-muted font-normal ml-1">
                How long will it take?
              </span>
            </Label>
            <Input
              id="effort"
              type="number"
              min="0.1"
              step="0.1"
              value={effort || ""}
              onChange={(e) =>
                onEffortChange(
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              error={!!errors?.effort}
              placeholder="0.1"
            />
            {errors?.effort && (
              <p className="text-sm text-danger">{errors.effort.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* RICE Score Display */}
      {riceScore > 0 && (
        <div className="bg-primary/10 border border-primary rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-text-primary mb-1">
                RICE Score
              </h4>
              <p className="text-2xl font-bold text-primary">{riceScore}</p>
            </div>
            {suggestedPriority && (
              <div className="text-right">
                <p className="text-xs text-text-secondary mb-1">
                  Suggested Priority
                </p>
                <Badge
                  variant={
                    suggestedPriority === "urgent"
                      ? "danger"
                      : suggestedPriority === "high"
                        ? "warning"
                        : suggestedPriority === "medium"
                          ? "info"
                          : "default"
                  }
                >
                  {TICKET_PRIORITY_LABELS[suggestedPriority]}
                </Badge>
              </div>
            )}
          </div>
          <p className="text-xs text-text-muted mt-2">
            Higher scores indicate higher priority work
          </p>
        </div>
      )}
    </div>
  );
}
