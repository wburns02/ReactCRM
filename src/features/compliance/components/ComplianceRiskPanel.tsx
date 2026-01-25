import { useState } from "react";
import {
  useComplianceRiskAssessment,
  useComplianceImprovementPlan,
} from "@/api/hooks/useComplianceAI";
import { Button } from "@/components/ui/Button";

/**
 * AI-powered compliance risk prediction panel
 * Displays risk assessment, predictions, and improvement recommendations
 */
export function ComplianceRiskPanel() {
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<"risk" | "plan">("risk");

  const {
    data: risk,
    isLoading: riskLoading,
    refetch,
  } = useComplianceRiskAssessment();
  const { data: plan, isLoading: planLoading } = useComplianceImprovementPlan();

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-green-500/20 text-green-400 border-green-500/30";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-400";
      case "medium":
        return "text-yellow-400";
      default:
        return "text-green-400";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "overdue":
        return "bg-red-500/20 text-red-400";
      case "urgent":
        return "bg-orange-500/20 text-orange-400";
      case "soon":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-blue-500/20 text-blue-400";
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors mb-4"
      >
        <span>✨</span>
        <span>AI Compliance Risk Prediction</span>
      </button>
    );
  }

  const isLoading = activeTab === "risk" ? riskLoading : planLoading;

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h4 className="font-medium text-text-primary">
            AI Compliance Intelligence
          </h4>
        </div>
        <button
          onClick={() => setShowPanel(false)}
          className="text-text-muted hover:text-text-primary text-sm"
        >
          Close
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("risk")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "risk"
              ? "bg-purple-600 text-white"
              : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
          }`}
        >
          Risk Assessment
        </button>
        <button
          onClick={() => setActiveTab("plan")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "plan"
              ? "bg-purple-600 text-white"
              : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
          }`}
        >
          Improvement Plan
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-text-secondary py-4">
          <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
          <span className="text-sm">Analyzing compliance data...</span>
        </div>
      )}

      {/* Risk Assessment Tab */}
      {activeTab === "risk" && risk && !isLoading && (
        <div className="space-y-4">
          {/* Risk Level & Score */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`p-4 rounded-lg border ${getRiskLevelColor(risk.overall_risk_level)}`}
            >
              <span className="text-xs block mb-1">Risk Level</span>
              <span className="text-xl font-bold uppercase">
                {risk.overall_risk_level}
              </span>
            </div>
            <div className="bg-bg-card border border-border rounded-lg p-4">
              <span className="text-xs text-text-muted block mb-1">
                Compliance Score
              </span>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-text-primary">
                  {risk.compliance_score}
                </span>
                <span className="text-sm text-text-muted mb-1">/100</span>
              </div>
            </div>
          </div>

          {/* Risk Factors */}
          {risk.risk_factors.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">
                Risk Factors
              </span>
              <div className="space-y-2">
                {risk.risk_factors.map((factor, i) => (
                  <div
                    key={i}
                    className="bg-bg-card border border-border rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-text-primary capitalize">
                        {factor.type}
                      </span>
                      <span
                        className={`text-xs ${getSeverityColor(factor.severity)}`}
                      >
                        {factor.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mb-2">
                      {factor.description}
                    </p>
                    <p className="text-xs text-purple-400">
                      → {factor.action_required}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Deadlines */}
          {risk.upcoming_deadlines.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">
                Upcoming Deadlines
              </span>
              <div className="space-y-2">
                {risk.upcoming_deadlines.map((deadline, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-bg-card border border-border rounded-lg p-2"
                  >
                    <div>
                      <span className="text-sm font-medium text-text-primary">
                        {deadline.item_name}
                      </span>
                      <span className="text-xs text-text-muted ml-2">
                        ({deadline.item_type})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">
                        {deadline.deadline}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${getUrgencyColor(deadline.urgency)}`}
                      >
                        {deadline.days_remaining < 0
                          ? "OVERDUE"
                          : `${deadline.days_remaining}d`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Predicted Violations */}
          {risk.predicted_violations.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">
                Predicted Violations
              </span>
              <div className="space-y-2">
                {risk.predicted_violations.map((violation, i) => (
                  <div
                    key={i}
                    className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-orange-400">
                        {violation.type}
                      </span>
                      <span className="text-sm text-text-secondary">
                        {violation.probability}% probability
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mb-2">
                      Timeframe: {violation.timeframe}
                    </p>
                    <div className="space-y-1">
                      {violation.prevention_steps.map((step, j) => (
                        <p key={j} className="text-xs text-text-secondary">
                          • {step}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {risk.recommendations.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">
                AI Recommendations
              </span>
              <div className="space-y-2">
                {risk.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="bg-bg-card border border-border rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          rec.priority === "high"
                            ? "bg-red-500/20 text-red-400"
                            : rec.priority === "medium"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {rec.priority}
                      </span>
                      <span className="text-xs text-text-muted">
                        {rec.category}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary mb-1">
                      {rec.description}
                    </p>
                    <div className="flex justify-between text-xs text-text-muted">
                      <span>Impact: {rec.impact}</span>
                      <span>{rec.estimated_effort}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Improvement Plan Tab */}
      {activeTab === "plan" && plan && !isLoading && (
        <div className="space-y-4">
          {/* Score Progress */}
          <div className="bg-bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-sm text-text-muted">Current Score</span>
                <span className="text-2xl font-bold text-text-primary ml-2">
                  {plan.current_score}
                </span>
              </div>
              <span className="text-2xl">→</span>
              <div className="text-right">
                <span className="text-sm text-text-muted">Target Score</span>
                <span className="text-2xl font-bold text-success ml-2">
                  {plan.target_score}
                </span>
              </div>
            </div>
            <div className="w-full h-3 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-green-500 rounded-full transition-all"
                style={{
                  width: `${(plan.current_score / plan.target_score) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-text-muted mt-2">
              Timeline: {plan.improvement_timeline}
            </p>
          </div>

          {/* Phases */}
          {plan.phases &&
            plan.phases.map(
              (
                phase: {
                  phase: number;
                  title: string;
                  duration: string;
                  tasks: string[];
                  expected_score_improvement: number;
                },
                i: number,
              ) => (
                <div
                  key={i}
                  className="bg-bg-card border border-border rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">
                        {phase.phase}
                      </span>
                      <span className="font-medium text-text-primary">
                        {phase.title}
                      </span>
                    </div>
                    <span className="text-xs text-text-muted">
                      {phase.duration}
                    </span>
                  </div>
                  <ul className="space-y-1 mb-2">
                    {phase.tasks.map((task: string, j: number) => (
                      <li
                        key={j}
                        className="flex items-start gap-2 text-sm text-text-secondary"
                      >
                        <span className="text-purple-400 mt-0.5">•</span>
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="text-xs text-success">
                    +{phase.expected_score_improvement} points expected
                  </div>
                </div>
              ),
            )}
        </div>
      )}

      <Button
        size="sm"
        variant="secondary"
        onClick={() => refetch()}
        className="w-full mt-4"
      >
        Refresh Analysis
      </Button>
    </div>
  );
}
