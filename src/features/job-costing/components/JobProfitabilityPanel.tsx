import { useState } from "react";
import { useJobProfitabilityAnalysis } from "@/api/hooks/useJobProfitabilityAI";
import { Button } from "@/components/ui/Button";

interface JobProfitabilityPanelProps {
  dateRange?: { start: string; end: string };
}

/**
 * AI-powered job profitability analysis panel
 * Analyzes profit margins, identifies issues, and suggests optimizations
 */
export function JobProfitabilityPanel({ dateRange }: JobProfitabilityPanelProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "services" | "techs" | "opportunities">("overview");

  const { data: analysis, isLoading, refetch } = useJobProfitabilityAnalysis(dateRange);

  const getTrendIcon = (trend: "up" | "down" | "stable" | "improving" | "declining") => {
    switch (trend) {
      case "up":
      case "improving":
        return "\u2191";
      case "down":
      case "declining":
        return "\u2193";
      default:
        return "\u2192";
    }
  };

  const getTrendColor = (trend: "up" | "down" | "stable" | "improving" | "declining", inverse = false) => {
    const isPositive = trend === "up" || trend === "improving";
    const isNegative = trend === "down" || trend === "declining";
    if (inverse) {
      if (isPositive) return "text-red-400";
      if (isNegative) return "text-green-400";
    } else {
      if (isPositive) return "text-green-400";
      if (isNegative) return "text-red-400";
    }
    return "text-text-muted";
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 35) return "text-green-400";
    if (margin >= 25) return "text-yellow-400";
    return "text-red-400";
  };

  const getSeverityColor = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  const getEffortBadge = (effort: "low" | "medium" | "high") => {
    switch (effort) {
      case "low":
        return "bg-green-500/20 text-green-400";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-red-500/20 text-red-400";
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors"
      >
        <span>&#10024;</span>
        <span>AI Profitability Insights</span>
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">&#10024;</span>
          <h4 className="font-medium text-text-primary">AI Profitability Analysis</h4>
        </div>
        <button
          onClick={() => setShowPanel(false)}
          className="text-text-muted hover:text-text-primary text-sm"
        >
          Close
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {(["overview", "services", "techs", "opportunities"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "bg-purple-600 text-white"
                : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
            }`}
          >
            {tab === "overview" ? "Overview" :
              tab === "services" ? "By Service" :
              tab === "techs" ? "By Technician" :
              "Opportunities"}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-text-secondary py-4">
          <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
          <span className="text-sm">Analyzing profitability data...</span>
        </div>
      )}

      {analysis && !isLoading && (
        <>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
                  <span className="text-xs text-text-muted block mb-1">Margin</span>
                  <span className={`text-2xl font-bold ${getMarginColor(analysis.overall_margin_percent)}`}>
                    {analysis.overall_margin_percent.toFixed(1)}%
                  </span>
                  <span className={`text-xs ${getTrendColor(analysis.trend)} block`}>
                    {getTrendIcon(analysis.trend)} {analysis.trend_percent}%
                  </span>
                </div>
                <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
                  <span className="text-xs text-text-muted block mb-1">Revenue</span>
                  <span className="text-2xl font-bold text-text-primary">
                    ${(analysis.total_revenue / 1000).toFixed(0)}k
                  </span>
                </div>
                <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
                  <span className="text-xs text-text-muted block mb-1">Costs</span>
                  <span className="text-2xl font-bold text-warning">
                    ${(analysis.total_costs / 1000).toFixed(0)}k
                  </span>
                </div>
                <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
                  <span className="text-xs text-text-muted block mb-1">Profit</span>
                  <span className="text-2xl font-bold text-success">
                    ${(analysis.total_profit / 1000).toFixed(0)}k
                  </span>
                </div>
              </div>

              {/* Problem Areas */}
              {analysis.problem_areas.length > 0 && (
                <div>
                  <span className="text-xs text-text-muted block mb-2">Problem Areas</span>
                  <div className="space-y-2">
                    {analysis.problem_areas.map((problem, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border ${getSeverityColor(problem.severity)}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{problem.name}</span>
                          <span className="text-xs uppercase">{problem.severity}</span>
                        </div>
                        <p className="text-sm opacity-90">{problem.issue}</p>
                        <p className="text-xs mt-1">
                          Impact: <span className="font-medium">${problem.impact_monthly.toLocaleString()}/month</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Recommendations */}
              <div>
                <span className="text-xs text-text-muted block mb-2">Top Recommendations</span>
                <div className="space-y-2">
                  {analysis.recommendations.slice(0, 2).map((rec, i) => (
                    <div
                      key={i}
                      className="bg-bg-card border border-border rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          rec.priority === "high" ? "bg-red-500/20 text-red-400" :
                          rec.priority === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-green-500/20 text-green-400"
                        }`}>
                          {rec.priority}
                        </span>
                        <span className="text-xs text-text-muted">{rec.timeline}</span>
                      </div>
                      <p className="text-sm font-medium text-text-primary">{rec.action}</p>
                      <p className="text-xs text-purple-400 mt-1">{"\u2192"} {rec.expected_impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === "services" && (
            <div className="space-y-2">
              {analysis.by_service_type.map((service) => (
                <div
                  key={service.service_type}
                  className="bg-bg-card border border-border rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-text-primary">{service.service_type}</span>
                    <span className={`text-lg font-bold ${getMarginColor(service.margin_percent)}`}>
                      {service.margin_percent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-text-muted">Revenue</span>
                      <span className="text-text-primary block">${(service.revenue / 1000).toFixed(1)}k</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Jobs</span>
                      <span className="text-text-primary block">{service.job_count}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Trend</span>
                      <span className={`block ${getTrendColor(service.trend)}`}>
                        {getTrendIcon(service.trend)} {service.trend}
                      </span>
                    </div>
                  </div>
                  {/* Margin Bar */}
                  <div className="mt-2">
                    <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          service.margin_percent >= 35 ? "bg-green-500" :
                          service.margin_percent >= 25 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(service.margin_percent * 2, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Technicians Tab */}
          {activeTab === "techs" && (
            <div className="space-y-2">
              {analysis.by_technician.map((tech) => (
                <div
                  key={tech.technician_id}
                  className="bg-bg-card border border-border rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-text-primary">{tech.technician_name}</span>
                    <span className={`text-lg font-bold ${getMarginColor(tech.margin_percent)}`}>
                      {tech.margin_percent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-text-muted">Revenue</span>
                      <span className="text-text-primary block">${(tech.revenue_generated / 1000).toFixed(0)}k</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Efficiency</span>
                      <span className={`block ${tech.efficiency_score >= 90 ? "text-green-400" : tech.efficiency_score >= 80 ? "text-yellow-400" : "text-red-400"}`}>
                        {tech.efficiency_score}%
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Callbacks</span>
                      <span className={`block ${tech.callback_rate <= 3 ? "text-green-400" : tech.callback_rate <= 5 ? "text-yellow-400" : "text-red-400"}`}>
                        {tech.callback_rate}%
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Avg Time</span>
                      <span className="text-text-primary block">{tech.avg_job_time}h</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Opportunities Tab */}
          {activeTab === "opportunities" && (
            <div className="space-y-3">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                <span className="text-sm text-green-400 block mb-1">Total Monthly Potential</span>
                <span className="text-2xl font-bold text-green-400">
                  ${analysis.opportunities.reduce((sum, o) => sum + o.potential_monthly_gain, 0).toLocaleString()}
                </span>
              </div>

              <div className="space-y-2">
                {analysis.opportunities.map((opp, i) => (
                  <div
                    key={i}
                    className="bg-bg-card border border-border rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 capitalize">
                          {opp.category.replace("_", " ")}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getEffortBadge(opp.effort)}`}>
                          {opp.effort} effort
                        </span>
                      </div>
                      <span className="text-sm font-bold text-success">
                        +${opp.potential_monthly_gain.toLocaleString()}/mo
                      </span>
                    </div>
                    <p className="text-sm font-medium text-text-primary">{opp.title}</p>
                    <p className="text-xs text-text-secondary mt-1">{opp.description}</p>
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className="text-text-muted">Confidence: {Math.round(opp.confidence * 100)}%</span>
                      <div className="w-16 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${opp.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Button
        size="sm"
        variant="secondary"
        onClick={() => refetch()}
        disabled={isLoading}
        className="w-full mt-4"
      >
        Refresh Analysis
      </Button>
    </div>
  );
}
