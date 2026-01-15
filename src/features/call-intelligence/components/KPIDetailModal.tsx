/**
 * KPIDetailModal - Modal for displaying detailed KPI data
 * Shows different views based on which KPI card was clicked
 */

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { CallWithAnalysis, CallIntelligenceMetrics } from "../types";

interface KPIDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricId: string | null;
  metrics: CallIntelligenceMetrics | undefined;
  calls: CallWithAnalysis[];
  isLoading?: boolean;
}

type TabType = "all" | "positive" | "neutral" | "negative" | "high-risk" | "critical";

export function KPIDetailModal({
  isOpen,
  onClose,
  metricId,
  metrics,
  calls,
  isLoading = false,
}: KPIDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Get modal title and description based on metricId
  const modalConfig = useMemo(() => {
    switch (metricId) {
      case "total-calls":
        return {
          title: "All Calls",
          description: `Showing all ${metrics?.total_calls || 0} calls`,
          showTabs: false,
        };
      case "avg-sentiment":
        return {
          title: "Sentiment Analysis",
          description: "Breakdown of call sentiment scores",
          showTabs: true,
          tabs: ["all", "positive", "neutral", "negative"] as TabType[],
        };
      case "quality-score":
        return {
          title: "Quality Scores",
          description: "Call quality scores breakdown",
          showTabs: false,
        };
      case "csat-prediction":
        return {
          title: "CSAT Predictions",
          description: "Individual CSAT predictions for all analyzed calls",
          showTabs: false,
        };
      case "escalation-rate":
        return {
          title: "Escalation Overview",
          description: "Calls requiring attention or escalation",
          showTabs: true,
          tabs: ["all", "high-risk", "critical"] as TabType[],
        };
      case "auto-disposition-rate":
        return {
          title: "Auto-Disposition Details",
          description: "Calls with automatic disposition",
          showTabs: false,
        };
      default:
        return {
          title: "Call Details",
          description: "Detailed call information",
          showTabs: false,
        };
    }
  }, [metricId, metrics?.total_calls]);

  // Filter calls based on active tab and metric type
  const filteredCalls = useMemo(() => {
    let filtered = [...calls];

    // Apply tab filter
    switch (activeTab) {
      case "positive":
        filtered = filtered.filter((c) => c.sentiment === "positive" || (c.sentiment_score && c.sentiment_score > 20));
        break;
      case "neutral":
        filtered = filtered.filter((c) => c.sentiment === "neutral" || (c.sentiment_score && c.sentiment_score >= -20 && c.sentiment_score <= 20));
        break;
      case "negative":
        filtered = filtered.filter((c) => c.sentiment === "negative" || (c.sentiment_score && c.sentiment_score < -20));
        break;
      case "high-risk":
        filtered = filtered.filter((c) => c.escalation_risk === "high");
        break;
      case "critical":
        filtered = filtered.filter((c) => c.escalation_risk === "critical");
        break;
    }

    // Apply metric-specific filtering
    if (metricId === "escalation-rate" && activeTab === "all") {
      filtered = filtered.filter((c) => c.escalation_risk === "high" || c.escalation_risk === "critical" || c.escalation_risk === "medium");
    }

    return filtered;
  }, [calls, activeTab, metricId]);

  // Paginate
  const paginatedCalls = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCalls.slice(start, start + pageSize);
  }, [filteredCalls, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredCalls.length / pageSize);

  // Format duration
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  // Get sentiment color
  const getSentimentColor = (sentiment?: string, score?: number) => {
    if (sentiment === "positive" || (score && score > 20)) return "text-green-600 bg-green-50";
    if (sentiment === "negative" || (score && score < -20)) return "text-red-600 bg-red-50";
    return "text-yellow-600 bg-yellow-50";
  };

  // Get escalation color
  const getEscalationColor = (risk?: string) => {
    switch (risk) {
      case "critical":
        return "text-red-700 bg-red-100";
      case "high":
        return "text-orange-700 bg-orange-100";
      case "medium":
        return "text-yellow-700 bg-yellow-100";
      default:
        return "text-green-700 bg-green-100";
    }
  };

  // Get quality color
  const getQualityColor = (score?: number) => {
    if (!score) return "text-gray-600";
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="kpi-detail-modal"
    >
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col m-4">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{modalConfig.title}</CardTitle>
              <p className="text-sm text-text-secondary mt-1">{modalConfig.description}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-2xl leading-none p-2"
              data-testid="close-modal"
            >
              &times;
            </Button>
          </div>

          {/* Tabs */}
          {modalConfig.showTabs && modalConfig.tabs && (
            <div className="flex gap-2 mt-4">
              {modalConfig.tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    activeTab === tab
                      ? "bg-primary text-white"
                      : "bg-bg-muted hover:bg-bg-hover text-text-secondary"
                  )}
                >
                  {tab === "all" && "All"}
                  {tab === "positive" && `Positive (${calls.filter(c => c.sentiment === "positive").length})`}
                  {tab === "neutral" && `Neutral (${calls.filter(c => c.sentiment === "neutral").length})`}
                  {tab === "negative" && `Negative (${calls.filter(c => c.sentiment === "negative").length})`}
                  {tab === "high-risk" && `High Risk (${calls.filter(c => c.escalation_risk === "high").length})`}
                  {tab === "critical" && `Critical (${calls.filter(c => c.escalation_risk === "critical").length})`}
                </button>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-text-secondary">
              No calls found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg-muted sticky top-0">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-text-secondary">Time</th>
                    <th className="text-left py-3 px-4 font-medium text-text-secondary">Customer</th>
                    <th className="text-left py-3 px-4 font-medium text-text-secondary">Direction</th>
                    <th className="text-left py-3 px-4 font-medium text-text-secondary">Duration</th>
                    {(metricId === "avg-sentiment" || metricId === "total-calls") && (
                      <th className="text-left py-3 px-4 font-medium text-text-secondary">Sentiment</th>
                    )}
                    {(metricId === "quality-score" || metricId === "total-calls") && (
                      <th className="text-left py-3 px-4 font-medium text-text-secondary">Quality</th>
                    )}
                    {(metricId === "csat-prediction" || metricId === "total-calls") && (
                      <th className="text-left py-3 px-4 font-medium text-text-secondary">CSAT</th>
                    )}
                    {(metricId === "escalation-rate" || metricId === "total-calls") && (
                      <th className="text-left py-3 px-4 font-medium text-text-secondary">Risk</th>
                    )}
                    <th className="text-left py-3 px-4 font-medium text-text-secondary">Disposition</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCalls.map((call, index) => (
                    <tr
                      key={call.id}
                      className={cn(
                        "border-b border-border hover:bg-bg-hover transition-colors",
                        index % 2 === 0 ? "bg-white" : "bg-bg-subtle"
                      )}
                      data-testid="call-row"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatDate(call.start_time)}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-text-primary">
                            {/* @ts-expect-error API returns contact_name, not customer_name */}
                            {call.contact_name || call.customer_name || "Unknown"}
                          </div>
                          <div className="text-xs text-text-muted">
                            {call.from_number || call.to_number}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          call.direction === "inbound" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                        )}>
                          {call.direction}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatDuration(call.duration_seconds)}
                      </td>
                      {(metricId === "avg-sentiment" || metricId === "total-calls") && (
                        <td className="py-3 px-4">
                          <span className={cn(
                            "px-2 py-1 rounded text-xs font-medium",
                            getSentimentColor(call.sentiment, call.sentiment_score)
                          )}>
                            {call.sentiment || "N/A"}
                            {call.sentiment_score != null && ` (${call.sentiment_score > 0 ? "+" : ""}${call.sentiment_score.toFixed(0)})`}
                          </span>
                        </td>
                      )}
                      {(metricId === "quality-score" || metricId === "total-calls") && (
                        <td className="py-3 px-4">
                          <span className={cn("font-semibold", getQualityColor(call.quality_score))}>
                            {call.quality_score?.toFixed(0) || "N/A"}
                          </span>
                        </td>
                      )}
                      {(metricId === "csat-prediction" || metricId === "total-calls") && (
                        <td className="py-3 px-4">
                          {call.csat_prediction ? (
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-500">★</span>
                              <span className="font-medium">{call.csat_prediction.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-text-muted">N/A</span>
                          )}
                        </td>
                      )}
                      {(metricId === "escalation-rate" || metricId === "total-calls") && (
                        <td className="py-3 px-4">
                          <span className={cn(
                            "px-2 py-1 rounded text-xs font-medium",
                            getEscalationColor(call.escalation_risk)
                          )}>
                            {call.escalation_risk || "low"}
                          </span>
                        </td>
                      )}
                      <td className="py-3 px-4 max-w-xs truncate">
                        {call.disposition || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex-shrink-0 border-t p-4 flex items-center justify-between bg-bg-subtle">
            <div className="text-sm text-text-secondary">
              Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredCalls.length)} of {filteredCalls.length} calls
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-3 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default KPIDetailModal;
