import { useState } from "react";
import { usePaymentPattern, useCollectionInsights } from "@/api/hooks/usePaymentAI";
import { Button } from "@/components/ui/Button";

interface PaymentInsightsPanelProps {
  customerId?: string;
}

/**
 * AI-powered payment pattern analysis and collection insights panel
 */
export function PaymentInsightsPanel({ customerId }: PaymentInsightsPanelProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<"pattern" | "collection">(customerId ? "pattern" : "collection");

  const { data: pattern, isLoading: patternLoading } = usePaymentPattern(customerId);
  const { data: collection, isLoading: collectionLoading, refetch } = useCollectionInsights();

  const getRiskColor = (level: string) => {
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

  const getBehaviorColor = (behavior: string) => {
    switch (behavior) {
      case "early":
        return "text-green-400";
      case "on_time":
        return "text-blue-400";
      case "late":
        return "text-yellow-400";
      case "very_late":
        return "text-red-400";
      default:
        return "text-text-secondary";
    }
  };

  const getAgingColor = (bucket: string) => {
    switch (bucket) {
      case "current":
        return "bg-green-500";
      case "1-30":
        return "bg-blue-500";
      case "31-60":
        return "bg-yellow-500";
      case "61-90":
        return "bg-orange-500";
      case "90+":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors"
      >
        <span>✨</span>
        <span>AI Payment Insights</span>
      </button>
    );
  }

  const isLoading = activeTab === "pattern" ? patternLoading : collectionLoading;

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h4 className="font-medium text-text-primary">AI Payment Intelligence</h4>
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
        {customerId && (
          <button
            onClick={() => setActiveTab("pattern")}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === "pattern"
                ? "bg-purple-600 text-white"
                : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
            }`}
          >
            Customer Pattern
          </button>
        )}
        <button
          onClick={() => setActiveTab("collection")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "collection"
              ? "bg-purple-600 text-white"
              : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
          }`}
        >
          Collection Insights
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-text-secondary py-4">
          <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
          <span className="text-sm">Analyzing payment data...</span>
        </div>
      )}

      {/* Customer Pattern Tab */}
      {activeTab === "pattern" && pattern && !isLoading && (
        <div className="space-y-4">
          {/* Risk Assessment */}
          <div className={`p-4 rounded-lg border ${getRiskColor(pattern.risk_assessment.risk_level)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Payment Risk</span>
              <span className="text-xl font-bold uppercase">{pattern.risk_assessment.risk_level}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-black/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-current rounded-full"
                  style={{ width: `${pattern.risk_assessment.risk_score}%` }}
                />
              </div>
              <span className="text-sm font-medium">{pattern.risk_assessment.risk_score}/100</span>
            </div>
          </div>

          {/* Behavior Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg-card border border-border rounded-lg p-3">
              <span className="text-xs text-text-muted block mb-1">Payment Timing</span>
              <span className={`text-lg font-bold capitalize ${getBehaviorColor(pattern.payment_behavior.typical_payment_timing)}`}>
                {pattern.payment_behavior.typical_payment_timing.replace("_", " ")}
              </span>
            </div>
            <div className="bg-bg-card border border-border rounded-lg p-3">
              <span className="text-xs text-text-muted block mb-1">Avg Days to Pay</span>
              <span className="text-lg font-bold text-text-primary">
                {pattern.payment_behavior.average_days_to_pay} days
              </span>
            </div>
          </div>

          {/* Historical Stats */}
          <div className="bg-bg-card border border-border rounded-lg p-3">
            <span className="text-xs text-text-muted block mb-2">Historical Performance</span>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">On-time rate:</span>
                <span className={pattern.historical_stats.paid_on_time_rate >= 80 ? "text-green-400" : "text-yellow-400"}>
                  {pattern.historical_stats.paid_on_time_rate}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Total invoices:</span>
                <span className="text-text-primary">{pattern.historical_stats.total_invoices}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Lifetime value:</span>
                <span className="text-success">${pattern.historical_stats.lifetime_value.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Outstanding:</span>
                <span className={pattern.historical_stats.outstanding_balance > 0 ? "text-warning" : "text-success"}>
                  ${pattern.historical_stats.outstanding_balance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {pattern.recommendations.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">AI Recommendations</span>
              <div className="space-y-2">
                {pattern.recommendations.map((rec, i) => (
                  <div key={i} className="bg-bg-card border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        rec.priority === "high" ? "bg-red-500/20 text-red-400" :
                        rec.priority === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-green-500/20 text-green-400"
                      }`}>
                        {rec.priority}
                      </span>
                      <span className="text-xs text-text-muted">{rec.timing}</span>
                    </div>
                    <p className="text-sm text-text-primary">{rec.action}</p>
                    <p className="text-xs text-purple-400 mt-1">→ {rec.expected_impact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collection Insights Tab */}
      {activeTab === "collection" && collection && !isLoading && (
        <div className="space-y-4">
          {/* Total Outstanding */}
          <div className="bg-bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-muted">Total Outstanding</span>
              <span className="text-2xl font-bold text-warning">
                ${collection.total_outstanding.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-success">
              Predicted collections (30 days): ${collection.predicted_collections_30_days.toLocaleString()}
            </p>
          </div>

          {/* Aging Breakdown */}
          <div className="bg-bg-card border border-border rounded-lg p-3">
            <span className="text-xs text-text-muted block mb-2">Aging Breakdown</span>
            <div className="flex h-4 rounded-full overflow-hidden mb-2">
              {collection.aging_breakdown.map((bucket) => (
                <div
                  key={bucket.bucket}
                  className={`${getAgingColor(bucket.bucket)}`}
                  style={{ width: `${bucket.percentage}%` }}
                  title={`${bucket.bucket}: $${bucket.amount.toLocaleString()}`}
                />
              ))}
            </div>
            <div className="grid grid-cols-5 gap-1 text-xs">
              {collection.aging_breakdown.map((bucket) => (
                <div key={bucket.bucket} className="text-center">
                  <span className={`block ${getAgingColor(bucket.bucket).replace("bg-", "text-")}`}>
                    {bucket.bucket}
                  </span>
                  <span className="text-text-muted">${(bucket.amount / 1000).toFixed(1)}k</span>
                </div>
              ))}
            </div>
          </div>

          {/* High Risk Accounts */}
          {collection.high_risk_accounts.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">High Risk Accounts</span>
              <div className="space-y-2">
                {collection.high_risk_accounts.map((account) => (
                  <div key={account.customer_id} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-text-primary">{account.customer_name}</span>
                      <span className="text-sm text-red-400">{account.days_overdue} days overdue</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-warning">${account.outstanding_amount.toLocaleString()}</span>
                      <span className="text-xs text-text-muted">Risk: {account.risk_score}/100</span>
                    </div>
                    <p className="text-xs text-purple-400 mt-1">→ {account.recommended_action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Priority Queue */}
          {collection.collection_priority_queue.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Collection Priority Queue</span>
              <div className="space-y-2">
                {collection.collection_priority_queue.slice(0, 3).map((item, i) => (
                  <div key={item.customer_id} className="bg-bg-card border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="font-medium text-text-primary">{item.customer_name}</span>
                      <span className="text-sm text-warning ml-auto">${item.amount.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-text-muted mb-1">Best time: {item.best_contact_time}</p>
                    <p className="text-xs text-purple-400">→ {item.suggested_approach}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          {collection.recommended_actions.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Recommended Actions</span>
              <div className="space-y-2">
                {collection.recommended_actions.map((action, i) => (
                  <div key={i} className="flex items-center justify-between bg-bg-card border border-border rounded-lg p-2">
                    <div>
                      <span className="text-sm font-medium text-text-primary">{action.action}</span>
                      <span className="text-xs text-text-muted ml-2">({action.target_accounts} accounts)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-success">${action.expected_recovery.toLocaleString()}</span>
                      <span className="text-xs text-text-muted block">{action.timing}</span>
                    </div>
                  </div>
                ))}
              </div>
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
        Refresh Insights
      </Button>
    </div>
  );
}
