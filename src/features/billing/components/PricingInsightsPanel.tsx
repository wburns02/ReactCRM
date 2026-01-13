import { useState } from "react";
import { useQuoteOptimization, useMarketRateAnalysis } from "@/api/hooks/usePricingAI";
import { Button } from "@/components/ui/Button";

interface LineItem {
  service: string;
  quantity: number;
  rate: number;
}

interface PricingInsightsPanelProps {
  customerId?: string;
  lineItems: LineItem[];
  total: number;
  onApplyOptimization?: (suggestions: Array<{ service: string; rate: number }>) => void;
}

/**
 * AI-powered pricing insights panel for quotes/estimates
 * Provides market analysis, optimization suggestions, and win probability
 */
export function PricingInsightsPanel({
  customerId,
  lineItems,
  total,
  onApplyOptimization,
}: PricingInsightsPanelProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<"optimize" | "market">("optimize");

  const optimizeMutation = useQuoteOptimization();
  const { data: marketData, isLoading: marketLoading } = useMarketRateAnalysis();

  const handleAnalyze = () => {
    if (lineItems.length === 0) return;
    optimizeMutation.mutate({
      customerId: customerId || "",
      lineItems,
      total,
    });
  };

  const handleApply = () => {
    if (optimizeMutation.data?.recommendations && onApplyOptimization) {
      const suggestions = optimizeMutation.data.recommendations.map((rec) => ({
        service: rec.service,
        rate: rec.suggested_rate,
      }));
      onApplyOptimization(suggestions);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      default:
        return "text-blue-400";
    }
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case "below_market":
        return "text-yellow-400";
      case "above_market":
        return "text-red-400";
      default:
        return "text-green-400";
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors"
      >
        <span>✨</span>
        <span>AI Pricing Insights</span>
      </button>
    );
  }

  const optimization = optimizeMutation.data;

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h4 className="font-medium text-text-primary">AI Pricing Intelligence</h4>
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
          onClick={() => setActiveTab("optimize")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "optimize"
              ? "bg-purple-600 text-white"
              : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
          }`}
        >
          Quote Optimization
        </button>
        <button
          onClick={() => setActiveTab("market")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "market"
              ? "bg-purple-600 text-white"
              : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
          }`}
        >
          Market Rates
        </button>
      </div>

      {/* Quote Optimization Tab */}
      {activeTab === "optimize" && (
        <div className="space-y-4">
          {!optimization && !optimizeMutation.isPending && (
            <div className="text-center py-4">
              <p className="text-sm text-text-muted mb-3">
                Analyze your quote for pricing optimization and win probability
              </p>
              <Button
                size="sm"
                onClick={handleAnalyze}
                disabled={lineItems.length === 0}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                Analyze Quote
              </Button>
            </div>
          )}

          {optimizeMutation.isPending && (
            <div className="flex items-center gap-2 text-text-secondary py-4">
              <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
              <span className="text-sm">Analyzing pricing...</span>
            </div>
          )}

          {optimization && (
            <>
              {/* Win Probability */}
              <div className="bg-bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-muted">Win Probability</span>
                  <span className={`text-2xl font-bold ${
                    optimization.win_probability >= 70 ? "text-success" :
                    optimization.win_probability >= 50 ? "text-warning" : "text-danger"
                  }`}>
                    {optimization.win_probability}%
                  </span>
                </div>
                <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      optimization.win_probability >= 70 ? "bg-success" :
                      optimization.win_probability >= 50 ? "bg-warning" : "bg-danger"
                    }`}
                    style={{ width: `${optimization.win_probability}%` }}
                  />
                </div>
              </div>

              {/* Price Comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
                  <span className="text-xs text-text-muted block">Current Total</span>
                  <span className="text-lg font-bold text-text-primary">
                    ${optimization.original_total.toLocaleString()}
                  </span>
                </div>
                <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
                  <span className="text-xs text-text-muted block">Optimized</span>
                  <span className="text-lg font-bold text-success">
                    ${optimization.optimized_total.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Recommendations */}
              {optimization.recommendations.length > 0 && (
                <div>
                  <span className="text-xs text-text-muted block mb-2">Price Adjustments</span>
                  <div className="space-y-2">
                    {optimization.recommendations.map((rec, i) => (
                      <div key={i} className="bg-bg-card border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-text-primary">{rec.service}</span>
                          <span className={`text-xs ${getImpactColor(rec.impact)}`}>
                            {rec.impact.toUpperCase()} IMPACT
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-text-muted">${rec.current_rate}</span>
                          <span className="text-text-muted">→</span>
                          <span className={rec.suggested_rate > rec.current_rate ? "text-green-400" : "text-yellow-400"}>
                            ${rec.suggested_rate}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted mt-1">{rec.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Discount Suggestions */}
              {optimization.discount_suggestions.length > 0 && (
                <div>
                  <span className="text-xs text-text-muted block mb-2">Discount Opportunities</span>
                  <div className="space-y-2">
                    {optimization.discount_suggestions.map((disc, i) => (
                      <div key={i} className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                        <div>
                          <span className="text-sm font-medium text-green-400 capitalize">{disc.type.replace("_", " ")} Discount</span>
                          <p className="text-xs text-text-muted">{disc.reason}</p>
                        </div>
                        <span className="text-lg font-bold text-green-400">-{disc.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upsell Opportunities */}
              {optimization.upsell_opportunities.length > 0 && (
                <div>
                  <span className="text-xs text-text-muted block mb-2">Upsell Suggestions</span>
                  <div className="space-y-2">
                    {optimization.upsell_opportunities.map((upsell, i) => (
                      <div key={i} className="flex items-center justify-between bg-bg-card border border-border rounded-lg p-2">
                        <div>
                          <span className="text-sm font-medium text-text-primary">{upsell.service}</span>
                          <p className="text-xs text-text-muted">{upsell.description}</p>
                        </div>
                        <span className="text-sm font-medium text-success">+${upsell.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Competitive Analysis */}
              <div className="bg-bg-card border border-border rounded-lg p-3">
                <span className="text-xs text-text-muted block mb-1">Competitive Analysis</span>
                <p className="text-sm text-text-secondary">{optimization.competitive_analysis}</p>
              </div>

              {/* Apply Button */}
              {optimization.recommendations.length > 0 && onApplyOptimization && (
                <Button
                  size="sm"
                  onClick={handleApply}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  Apply Optimized Pricing
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {/* Market Rates Tab */}
      {activeTab === "market" && (
        <div className="space-y-4">
          {marketLoading && (
            <div className="flex items-center gap-2 text-text-secondary py-4">
              <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
              <span className="text-sm">Loading market data...</span>
            </div>
          )}

          {marketData && !marketLoading && (
            <>
              {/* Overall Positioning */}
              <div className="bg-bg-card border border-border rounded-lg p-4">
                <span className="text-xs text-text-muted block mb-2">Market Position</span>
                <p className="text-sm text-text-primary">{marketData.overall_positioning}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-text-muted">Revenue Opportunity:</span>
                  <span className="text-sm font-medium text-success">
                    +${marketData.revenue_opportunity?.toLocaleString()}/month
                  </span>
                </div>
              </div>

              {/* Service Comparison */}
              <div>
                <span className="text-xs text-text-muted block mb-2">Service Rate Comparison</span>
                <div className="space-y-2">
                  {marketData.services?.map((service: {
                    name: string;
                    your_rate: number;
                    market_avg: number;
                    market_range: { min: number; max: number };
                    recommendation: string;
                  }, i: number) => {
                    const position = service.your_rate < service.market_avg * 0.95
                      ? "below_market"
                      : service.your_rate > service.market_avg * 1.05
                        ? "above_market"
                        : "at_market";
                    return (
                      <div key={i} className="bg-bg-card border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-text-primary">{service.name}</span>
                          <span className={`text-xs ${getPositionColor(position)}`}>
                            {position.replace("_", " ").toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-sm mb-2">
                          <div>
                            <span className="text-xs text-text-muted block">Your Rate</span>
                            <span className="font-medium text-text-primary">${service.your_rate}</span>
                          </div>
                          <div>
                            <span className="text-xs text-text-muted block">Market Avg</span>
                            <span className="font-medium text-text-secondary">${service.market_avg}</span>
                          </div>
                          <div>
                            <span className="text-xs text-text-muted block">Range</span>
                            <span className="font-medium text-text-secondary">
                              ${service.market_range.min}-${service.market_range.max}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-purple-400">→ {service.recommendation}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <Button
        size="sm"
        variant="secondary"
        onClick={handleAnalyze}
        className="w-full mt-4"
        disabled={optimizeMutation.isPending || lineItems.length === 0}
      >
        Re-analyze
      </Button>
    </div>
  );
}
