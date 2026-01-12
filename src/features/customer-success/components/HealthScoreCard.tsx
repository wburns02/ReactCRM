/**
 * Health Score Card Component
 *
 * A card displaying customer health score with breakdown by component.
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils.ts";
import { HealthScoreGauge } from "./HealthScoreGauge.tsx";
import type { HealthScore } from "@/api/types/customerSuccess.ts";

interface HealthScoreCardProps {
  healthScore: HealthScore;
  showBreakdown?: boolean;
  showHistory?: boolean;
  className?: string;
}

const COMPONENT_LABELS: Record<string, string> = {
  product_adoption: "Product Adoption",
  engagement: "Engagement",
  relationship: "Relationship",
  financial: "Financial",
  support: "Support",
};

const COMPONENT_WEIGHTS: Record<string, number> = {
  product_adoption: 30,
  engagement: 25,
  relationship: 15,
  financial: 20,
  support: 10,
};

function ScoreBar({
  label,
  score,
  weight,
}: {
  label: string;
  score: number;
  weight: number;
}) {
  const barColor = useMemo(() => {
    if (score >= 70) return "bg-success";
    if (score >= 40) return "bg-warning";
    return "bg-danger";
  }, [score]);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-primary font-medium">
          {score} <span className="text-text-muted text-xs">({weight}%)</span>
        </span>
      </div>
      <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            barColor,
          )}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function HealthScoreCard({
  healthScore,
  showBreakdown = true,
  className,
}: HealthScoreCardProps) {
  const lastUpdated = useMemo(() => {
    if (!healthScore.calculated_at) return null;
    const date = new Date(healthScore.calculated_at);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [healthScore.calculated_at]);

  const components = [
    { key: "product_adoption", score: healthScore.product_adoption_score },
    { key: "engagement", score: healthScore.engagement_score },
    { key: "relationship", score: healthScore.relationship_score },
    { key: "financial", score: healthScore.financial_score },
    { key: "support", score: healthScore.support_score },
  ];

  return (
    <div
      className={cn(
        "bg-bg-secondary rounded-lg border border-border p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Health Score
          </h3>
          {lastUpdated && (
            <p className="text-xs text-text-muted mt-1">
              Updated {lastUpdated}
            </p>
          )}
        </div>
        <HealthScoreGauge
          score={healthScore.overall_score}
          status={healthScore.status}
          trend={healthScore.trend}
          size="md"
          showLabel={true}
        />
      </div>

      {showBreakdown && (
        <div className="space-y-3 pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-text-secondary">
            Score Breakdown
          </h4>
          {components.map(({ key, score }) => (
            <ScoreBar
              key={key}
              label={COMPONENT_LABELS[key]}
              score={score ?? 0}
              weight={COMPONENT_WEIGHTS[key]}
            />
          ))}
        </div>
      )}

      {healthScore.risk_factors && healthScore.risk_factors.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-danger mb-2">Risk Factors</h4>
          <ul className="space-y-1">
            {healthScore.risk_factors.map((factor, index) => (
              <li
                key={index}
                className="text-sm text-text-secondary flex items-start gap-2"
              >
                <span className="text-danger mt-0.5">•</span>
                {factor}
              </li>
            ))}
          </ul>
        </div>
      )}

      {healthScore.opportunities && healthScore.opportunities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-success mb-2">
            Opportunities
          </h4>
          <ul className="space-y-1">
            {healthScore.opportunities.map((opportunity, index) => (
              <li
                key={index}
                className="text-sm text-text-secondary flex items-start gap-2"
              >
                <span className="text-success mt-0.5">•</span>
                {opportunity}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
