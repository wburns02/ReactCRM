import { useState } from "react";
import {
  useInventoryOverview,
  useReorderSuggestions,
} from "@/api/hooks/useInventoryAI";
import { Button } from "@/components/ui/Button";

/**
 * AI-powered inventory forecasting panel
 * Displays demand forecasts, reorder suggestions, and optimization opportunities
 */
export function InventoryForecastPanel() {
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "reorder">(
    "overview",
  );

  const {
    data: overview,
    isLoading: overviewLoading,
    refetch,
  } = useInventoryOverview();
  const { data: reorderData, isLoading: reorderLoading } =
    useReorderSuggestions();

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "soon":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "normal":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-green-500/20 text-green-400 border-green-500/30";
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors mb-4"
      >
        <span>✨</span>
        <span>AI Inventory Forecasting</span>
      </button>
    );
  }

  const isLoading = activeTab === "overview" ? overviewLoading : reorderLoading;

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h4 className="font-medium text-text-primary">
            AI Inventory Intelligence
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
          onClick={() => setActiveTab("overview")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "overview"
              ? "bg-purple-600 text-white"
              : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("reorder")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "reorder"
              ? "bg-purple-600 text-white"
              : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
          }`}
        >
          Reorder Suggestions
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-text-secondary py-4">
          <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
          <span className="text-sm">Analyzing inventory...</span>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === "overview" && overview && !isLoading && (
        <div className="space-y-4">
          {/* Summary Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-text-primary">
                {overview.total_items}
              </div>
              <div className="text-xs text-text-muted">Total Items</div>
            </div>
            <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-success">
                ${overview.total_value.toLocaleString()}
              </div>
              <div className="text-xs text-text-muted">Total Value</div>
            </div>
            <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
              <div
                className={`text-2xl font-bold ${overview.low_stock_items > 0 ? "text-warning" : "text-success"}`}
              >
                {overview.low_stock_items}
              </div>
              <div className="text-xs text-text-muted">Low Stock</div>
            </div>
          </div>

          {/* Forecast Summary */}
          <div className="bg-bg-card border border-border rounded-lg p-3">
            <span className="text-xs text-text-muted block mb-2">
              Forecast Summary
            </span>
            <p className="text-sm text-text-secondary">
              {overview.forecast_summary}
            </p>
          </div>

          {/* Critical Items */}
          {overview.critical_items.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">
                Critical Items (Reorder Now)
              </span>
              <div className="space-y-2">
                {overview.critical_items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-lg p-2"
                  >
                    <div>
                      <span className="text-sm font-medium text-text-primary">
                        {item.name}
                      </span>
                      <span className="text-xs text-text-muted ml-2">
                        ({item.current_stock} in stock)
                      </span>
                    </div>
                    <span className="text-xs text-red-400">
                      Stockout in {item.days_until_stockout} days
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Slow Moving Items */}
          {overview.slow_moving_items.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">
                Slow-Moving Inventory
              </span>
              <div className="space-y-2">
                {overview.slow_moving_items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-bg-card border border-border rounded-lg p-2"
                  >
                    <div>
                      <span className="text-sm font-medium text-text-primary">
                        {item.name}
                      </span>
                      <span className="text-xs text-text-muted ml-2">
                        {item.quantity} units (${item.value})
                      </span>
                    </div>
                    <span className="text-xs text-yellow-400">
                      {item.days_since_last_use} days idle
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optimization Suggestions */}
          {overview.optimization_suggestions.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">
                Optimization Opportunities
              </span>
              <ul className="space-y-1">
                {overview.optimization_suggestions.map((suggestion, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-text-secondary"
                  >
                    <span className="text-purple-400">→</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Reorder Tab */}
      {activeTab === "reorder" && reorderData && !isLoading && (
        <div className="space-y-4">
          {/* Priority Summary */}
          {reorderData.priority_count && (
            <div className="flex gap-2">
              <span
                className={`px-2 py-1 rounded text-xs ${getUrgencyColor("critical")}`}
              >
                {reorderData.priority_count.critical} Critical
              </span>
              <span
                className={`px-2 py-1 rounded text-xs ${getUrgencyColor("soon")}`}
              >
                {reorderData.priority_count.soon} Soon
              </span>
              <span
                className={`px-2 py-1 rounded text-xs ${getUrgencyColor("normal")}`}
              >
                {reorderData.priority_count.normal} Normal
              </span>
            </div>
          )}

          {/* Total Reorder Value */}
          {reorderData.total_reorder_value && (
            <div className="bg-bg-card border border-border rounded-lg p-3">
              <span className="text-xs text-text-muted block mb-1">
                Estimated Reorder Value
              </span>
              <span className="text-xl font-bold text-text-primary">
                ${reorderData.total_reorder_value.toLocaleString()}
              </span>
            </div>
          )}

          {/* Reorder Suggestions */}
          {reorderData.suggestions && reorderData.suggestions.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">
                Reorder Recommendations
              </span>
              <div className="space-y-2">
                {reorderData.suggestions.map(
                  (
                    suggestion: {
                      item_name: string;
                      current_stock: number;
                      recommended_order: number;
                      urgency: string;
                      reason: string;
                    },
                    i: number,
                  ) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border ${getUrgencyColor(suggestion.urgency)}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          {suggestion.item_name}
                        </span>
                        <span className="text-xs uppercase">
                          {suggestion.urgency}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                        <div>
                          <span className="text-opacity-80">Current: </span>
                          <span className="font-medium">
                            {suggestion.current_stock}
                          </span>
                        </div>
                        <div>
                          <span className="text-opacity-80">Order: </span>
                          <span className="font-medium">
                            {suggestion.recommended_order}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs opacity-80">{suggestion.reason}</p>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Generate Purchase Order
            </Button>
            <Button size="sm" variant="secondary">
              Export List
            </Button>
          </div>
        </div>
      )}

      <Button
        size="sm"
        variant="secondary"
        onClick={() => refetch()}
        className="w-full mt-4"
      >
        Refresh Forecast
      </Button>
    </div>
  );
}
