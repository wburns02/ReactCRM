import { useState } from "react";
import { useContractAnalysis, useRenewalRecommendations } from "@/api/hooks/useContractAI";
import { Button } from "@/components/ui/Button";

interface ContractInsightsPanelProps {
  contractId: string;
}

/**
 * AI-powered contract analysis panel
 * Displays key terms, risks, obligations, and renewal recommendations
 */
export function ContractInsightsPanel({ contractId }: ContractInsightsPanelProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<"analysis" | "renewal">("analysis");

  const { data: analysis, isLoading: analysisLoading, refetch } = useContractAnalysis(
    showPanel ? contractId : undefined
  );
  const { data: renewal, isLoading: renewalLoading } = useRenewalRecommendations(
    showPanel && activeTab === "renewal" ? contractId : undefined
  );

  const getRiskColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-green-500/20 text-green-400 border-green-500/30";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "fulfilled":
      case "met":
        return "text-green-400";
      case "pending":
        return "text-yellow-400";
      case "overdue":
      case "not_met":
        return "text-red-400";
      default:
        return "text-text-muted";
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case "high":
        return "bg-purple-500/20 text-purple-400";
      case "medium":
        return "bg-blue-500/20 text-blue-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getComplianceOverallColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "at_risk":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-red-500/20 text-red-400 border-red-500/30";
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors"
      >
        <span>✨</span>
        <span>AI Contract Analysis</span>
      </button>
    );
  }

  const isLoading = activeTab === "analysis" ? analysisLoading : renewalLoading;

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h4 className="font-medium text-text-primary">AI Contract Analysis</h4>
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
          onClick={() => setActiveTab("analysis")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "analysis"
              ? "bg-purple-600 text-white"
              : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
          }`}
        >
          Analysis
        </button>
        <button
          onClick={() => setActiveTab("renewal")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "renewal"
              ? "bg-purple-600 text-white"
              : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
          }`}
        >
          Renewal
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-text-secondary py-4">
          <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
          <span className="text-sm">Analyzing contract...</span>
        </div>
      )}

      {/* Analysis Tab */}
      {activeTab === "analysis" && analysis && !isLoading && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-bg-card border border-border rounded-lg p-3">
            <span className="text-xs text-text-muted block mb-2">Summary</span>
            <p className="text-sm text-text-secondary">{analysis.summary}</p>
          </div>

          {/* Compliance Status */}
          <div className={`p-3 rounded-lg border ${getComplianceOverallColor(analysis.compliance_status.overall)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Compliance Status</span>
              <span className="text-sm uppercase">{analysis.compliance_status.overall}</span>
            </div>
            <div className="space-y-1">
              {analysis.compliance_status.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{item.requirement}</span>
                  <span className={getStatusColor(item.status)}>
                    {item.status === "met" ? "✓" : item.status === "pending" ? "○" : "✗"} {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Terms */}
          {analysis.key_terms.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Key Terms</span>
              <div className="space-y-2">
                {analysis.key_terms.map((term, i) => (
                  <div key={i} className="flex items-center justify-between bg-bg-card border border-border rounded-lg p-2">
                    <div>
                      <span className="text-sm font-medium text-text-primary">{term.term}</span>
                      <span className="text-xs text-text-muted ml-2">({term.category})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-secondary">{term.value}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${getImportanceColor(term.importance)}`}>
                        {term.importance}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risks */}
          {analysis.risks.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Identified Risks</span>
              <div className="space-y-2">
                {analysis.risks.map((risk, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${getRiskColor(risk.severity)}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{risk.type}</span>
                      <span className="text-xs uppercase">{risk.severity}</span>
                    </div>
                    <p className="text-sm mb-2">{risk.description}</p>
                    {risk.mitigation && (
                      <p className="text-xs opacity-80">Mitigation: {risk.mitigation}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Obligations */}
          {analysis.obligations.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Obligations</span>
              <div className="space-y-1">
                {analysis.obligations.map((obligation, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-bg-card border border-border rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted uppercase">{obligation.party}</span>
                      <span className="text-text-secondary">{obligation.description}</span>
                    </div>
                    <span className={`text-xs ${getStatusColor(obligation.status)}`}>
                      {obligation.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Summary */}
          <div className="bg-bg-card border border-border rounded-lg p-3">
            <span className="text-xs text-text-muted block mb-2">Financial Summary</span>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-text-muted">Total Value:</span>
                <span className="ml-2 font-medium text-success">
                  ${analysis.financial_summary.total_value.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Monthly:</span>
                <span className="ml-2 font-medium text-text-primary">
                  ${analysis.financial_summary.monthly_value.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Payment Terms:</span>
                <span className="ml-2 text-text-primary">{analysis.financial_summary.payment_terms}</span>
              </div>
              {analysis.financial_summary.late_fees && (
                <div>
                  <span className="text-text-muted">Late Fees:</span>
                  <span className="ml-2 text-text-primary">{analysis.financial_summary.late_fees}</span>
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Recommendations</span>
              <ul className="space-y-1">
                {analysis.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="text-purple-400">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Renewal Tab */}
      {activeTab === "renewal" && renewal && !isLoading && (
        <div className="space-y-4">
          {/* Renewal Recommendation */}
          <div className={`p-4 rounded-lg border ${renewal.should_renew ? "bg-green-500/10 border-green-500/30" : "bg-yellow-500/10 border-yellow-500/30"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-text-primary">
                {renewal.should_renew ? "Recommended: Renew" : "Review Required"}
              </span>
              <span className="text-sm text-text-secondary">{renewal.confidence}% confidence</span>
            </div>
            <p className="text-sm text-text-secondary">
              Suggested term: {renewal.optimal_term_length}
            </p>
          </div>

          {/* Factors */}
          {renewal.factors && renewal.factors.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Decision Factors</span>
              <div className="space-y-2">
                {renewal.factors.map((factor: { factor: string; impact: string; score: number }, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-bg-card border border-border rounded-lg p-2">
                    <span className="text-sm text-text-secondary">{factor.factor}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${
                        factor.impact === "positive" ? "text-green-400" :
                        factor.impact === "negative" ? "text-red-400" :
                        "text-yellow-400"
                      }`}>
                        {factor.impact}
                      </span>
                      <span className="text-sm font-medium text-text-primary">{factor.score}/10</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Changes */}
          {renewal.suggested_changes && renewal.suggested_changes.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Suggested Changes for Renewal</span>
              <ul className="space-y-1">
                {renewal.suggested_changes.map((change: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="text-blue-400">•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
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
