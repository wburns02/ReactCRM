/**
 * Churn Risk Indicator Component
 *
 * Visual indicator for customer churn risk featuring:
 * - Risk score gauge
 * - Contributing factors
 * - Trend analysis
 * - Recommended actions
 */

import { cn } from "@/lib/utils.ts";

interface ChurnRiskFactor {
  name: string;
  impact: "high" | "medium" | "low";
  description: string;
  trend: "improving" | "stable" | "worsening";
}

interface ChurnRiskData {
  score: number;
  trend: "improving" | "stable" | "worsening";
  predictedChurnDate?: string;
  factors: ChurnRiskFactor[];
  recommendations: string[];
}

interface ChurnRiskIndicatorProps {
  data?: ChurnRiskData;
  customerId?: number;
  customerName?: string;
  compact?: boolean;
  isLoading?: boolean;
}

function getRiskLevel(score: number): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (score >= 70)
    return { label: "Critical", color: "text-danger", bgColor: "bg-danger" };
  if (score >= 50)
    return { label: "High", color: "text-warning", bgColor: "bg-warning" };
  if (score >= 30)
    return {
      label: "Medium",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500",
    };
  return { label: "Low", color: "text-success", bgColor: "bg-success" };
}

function getTrendIcon(trend: "improving" | "stable" | "worsening") {
  switch (trend) {
    case "improving":
      return (
        <span className="text-success flex items-center gap-1">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          Improving
        </span>
      );
    case "worsening":
      return (
        <span className="text-danger flex items-center gap-1">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
            />
          </svg>
          Worsening
        </span>
      );
    default:
      return (
        <span className="text-text-muted flex items-center gap-1">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 12H4"
            />
          </svg>
          Stable
        </span>
      );
  }
}

const defaultData: ChurnRiskData = {
  score: 0,
  trend: "stable",
  predictedChurnDate: undefined,
  factors: [],
  recommendations: [],
};

export function ChurnRiskIndicator({
  data = defaultData,
  customerName,
  compact = false,
  isLoading,
}: ChurnRiskIndicatorProps) {
  const riskLevel = getRiskLevel(data.score);

  if (isLoading) {
    return (
      <div className="bg-bg-card rounded-xl border border-border p-6 animate-pulse">
        <div className="h-6 w-32 bg-bg-hover rounded mb-4" />
        <div className="h-32 bg-bg-hover rounded" />
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12">
          <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-bg-hover"
            />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${data.score} 100`}
              className={riskLevel.color}
            />
          </svg>
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center text-sm font-bold",
              riskLevel.color,
            )}
          >
            {data.score}
          </span>
        </div>
        <div>
          <p className={cn("font-medium", riskLevel.color)}>
            {riskLevel.label} Risk
          </p>
          <div className="text-xs">{getTrendIcon(data.trend)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card rounded-xl border border-border p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Churn Risk Analysis
          </h3>
          {customerName && (
            <p className="text-sm text-text-muted">{customerName}</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-text-muted mb-1">Overall Trend</div>
          {getTrendIcon(data.trend)}
        </div>
      </div>

      {/* Risk Score Gauge */}
      <div className="flex items-center gap-8 mb-6">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-bg-hover"
            />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeDasharray={`${data.score} 100`}
              strokeLinecap="round"
              className={riskLevel.color}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-3xl font-bold", riskLevel.color)}>
              {data.score}
            </span>
            <span className="text-xs text-text-muted">Risk Score</span>
          </div>
        </div>
        <div className="flex-1">
          <div
            className={cn(
              "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-2",
              riskLevel.bgColor,
              "bg-opacity-10",
              riskLevel.color,
            )}
          >
            {riskLevel.label} Risk
          </div>
          {data.predictedChurnDate && (
            <p className="text-sm text-text-muted">
              Predicted churn:{" "}
              <span className="text-danger font-medium">
                {data.predictedChurnDate}
              </span>
            </p>
          )}
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
              <span>Low</span>
              <span>Critical</span>
            </div>
            <div className="h-2 rounded-full bg-gradient-to-r from-success via-warning to-danger relative">
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-current shadow-sm"
                style={{ left: `${data.score}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Risk Factors */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-text-secondary mb-3">
          Contributing Factors
        </h4>
        <div className="space-y-3">
          {data.factors.map((factor, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 bg-bg-hover rounded-lg"
            >
              <div
                className={cn(
                  "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                  factor.impact === "high"
                    ? "bg-danger"
                    : factor.impact === "medium"
                      ? "bg-warning"
                      : "bg-success",
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-text-primary">
                    {factor.name}
                  </p>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded",
                      factor.impact === "high"
                        ? "bg-danger/10 text-danger"
                        : factor.impact === "medium"
                          ? "bg-warning/10 text-warning"
                          : "bg-success/10 text-success",
                    )}
                  >
                    {factor.impact}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {factor.description}
                </p>
                <div className="text-xs mt-1">{getTrendIcon(factor.trend)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <h4 className="text-sm font-medium text-text-secondary mb-3">
          Recommended Actions
        </h4>
        <ul className="space-y-2">
          {data.recommendations.map((rec, index) => (
            <li
              key={index}
              className="flex items-start gap-2 text-sm text-text-primary"
            >
              <svg
                className="w-5 h-5 text-primary flex-shrink-0"
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
              {rec}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
