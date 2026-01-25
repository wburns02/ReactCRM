import { useState } from "react";
import {
  useGenerateReport,
  type GeneratedReport,
  type KeyInsight,
} from "@/api/hooks/useReportAI";
import { Button } from "@/components/ui/Button";

interface AIReportGeneratorProps {
  onReportGenerated?: (report: GeneratedReport) => void;
}

/**
 * AI-powered report generator
 * Creates comprehensive reports with insights and recommendations
 */
export function AIReportGenerator({
  onReportGenerated,
}: AIReportGeneratorProps) {
  const [showGenerator, setShowGenerator] = useState(false);
  const [reportType, setReportType] = useState<
    "executive" | "operations" | "financial" | "customer" | "technician"
  >("executive");
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  const generateMutation = useGenerateReport();

  const handleGenerate = () => {
    generateMutation.mutate({
      reportType,
      dateRange,
    });
  };

  const handleExport = () => {
    if (generateMutation.data && onReportGenerated) {
      onReportGenerated(generateMutation.data);
    }
  };

  const getSignificanceColor = (significance: string) => {
    switch (significance) {
      case "high":
        return "bg-red-500/20 text-red-400";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-blue-500/20 text-blue-400";
    }
  };

  const getCategoryIcon = (category: KeyInsight["category"]) => {
    switch (category) {
      case "financial":
        return "💰";
      case "operational":
        return "⚙️";
      case "customer":
        return "👥";
      case "performance":
        return "📊";
      default:
        return "📈";
    }
  };

  const getTrendIcon = (trend?: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return "↑";
      case "down":
        return "↓";
      default:
        return "→";
    }
  };

  const getTrendColor = (
    trend?: "up" | "down" | "stable",
    isPositive = true,
  ) => {
    if (trend === "up") return isPositive ? "text-green-400" : "text-red-400";
    if (trend === "down") return isPositive ? "text-red-400" : "text-green-400";
    return "text-text-muted";
  };

  if (!showGenerator) {
    return (
      <button
        onClick={() => setShowGenerator(true)}
        className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors"
      >
        <span>✨</span>
        <span>AI Report Generator</span>
      </button>
    );
  }

  const report = generateMutation.data;

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h4 className="font-medium text-text-primary">AI Report Generator</h4>
        </div>
        <button
          onClick={() => setShowGenerator(false)}
          className="text-text-muted hover:text-text-primary text-sm"
        >
          Close
        </button>
      </div>

      {/* Configuration */}
      {!report && (
        <div className="space-y-4">
          {/* Report Type */}
          <div>
            <label className="text-xs text-text-muted block mb-2">
              Report Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  "executive",
                  "operations",
                  "financial",
                  "customer",
                  "technician",
                ] as const
              ).map((type) => (
                <button
                  key={type}
                  onClick={() => setReportType(type)}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors capitalize ${
                    reportType === type
                      ? "bg-purple-600 text-white"
                      : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted block mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
                className="w-full px-3 py-2 bg-bg-card border border-border rounded-lg text-text-primary text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
                className="w-full px-3 py-2 bg-bg-card border border-border rounded-lg text-text-primary text-sm"
              />
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {generateMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Generating Report...
              </span>
            ) : (
              "Generate Report"
            )}
          </Button>
        </div>
      )}

      {/* Generated Report */}
      {report && (
        <div className="space-y-4">
          {/* Report Header */}
          <div className="bg-bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-bold text-text-primary">
              {report.title}
            </h3>
            <p className="text-sm text-text-muted">
              Period: {new Date(report.period.start).toLocaleDateString()} -{" "}
              {new Date(report.period.end).toLocaleDateString()}
            </p>
          </div>

          {/* Executive Summary */}
          <div className="bg-bg-card border border-border rounded-lg p-4">
            <h4 className="text-sm font-medium text-text-primary mb-2">
              Executive Summary
            </h4>
            <p className="text-sm text-text-secondary">
              {report.executive_summary}
            </p>
          </div>

          {/* Key Metrics */}
          {report.sections.find((s) => s.type === "metrics") && (
            <div>
              <h4 className="text-sm font-medium text-text-muted mb-2">
                Key Metrics
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(
                  report.sections.find((s) => s.type === "metrics")
                    ?.content as {
                    metrics: Array<{
                      label: string;
                      value: string | number;
                      change?: number;
                      trend?: "up" | "down" | "stable";
                    }>;
                  }
                ).metrics.map((metric, i) => (
                  <div
                    key={i}
                    className="bg-bg-card border border-border rounded-lg p-3"
                  >
                    <span className="text-xs text-text-muted block">
                      {metric.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-text-primary">
                        {metric.value}
                      </span>
                      {metric.change !== undefined && (
                        <span
                          className={`text-sm ${getTrendColor(metric.trend, metric.change >= 0)}`}
                        >
                          {getTrendIcon(metric.trend)} {Math.abs(metric.change)}
                          %
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Insights */}
          <div>
            <h4 className="text-sm font-medium text-text-muted mb-2">
              Key Insights
            </h4>
            <div className="space-y-2">
              {report.key_insights.map((insight, i) => (
                <div
                  key={i}
                  className="bg-bg-card border border-border rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{getCategoryIcon(insight.category)}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${getSignificanceColor(insight.significance)}`}
                    >
                      {insight.significance}
                    </span>
                    {insight.actionable && (
                      <span className="text-xs text-purple-400">
                        Actionable
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary">
                    {insight.insight}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h4 className="text-sm font-medium text-text-muted mb-2">
              AI Recommendations
            </h4>
            <div className="space-y-2">
              {report.recommendations.slice(0, 3).map((rec, i) => (
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
                    <span className="text-xs text-text-muted">{rec.area}</span>
                  </div>
                  <p className="text-sm text-text-primary">
                    {rec.recommendation}
                  </p>
                  <div className="flex justify-between mt-2 text-xs text-text-muted">
                    <span>Impact: {rec.expected_impact}</span>
                    <span>Effort: {rec.effort}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => generateMutation.reset()}
              className="flex-1"
            >
              New Report
            </Button>
            <Button
              size="sm"
              onClick={handleExport}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Export Report
            </Button>
          </div>

          {/* Data Sources */}
          <div className="text-xs text-text-muted">
            Data sources: {report.data_sources.join(", ")}
          </div>
        </div>
      )}
    </div>
  );
}
