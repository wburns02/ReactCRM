import { useState } from "react";
import {
  useDocumentSummary,
  useDocumentCategorization,
} from "@/api/hooks/useDocumentAI";
import { Button } from "@/components/ui/Button";

interface DocumentInsightsPanelProps {
  documentId: string;
  fileName?: string;
}

/**
 * AI-powered document insights panel
 * Displays summary, extracted data, and intelligent categorization
 */
export function DocumentInsightsPanel({
  documentId,
  fileName,
}: DocumentInsightsPanelProps) {
  const [showPanel, setShowPanel] = useState(false);
  const {
    data: summary,
    isLoading,
    refetch,
  } = useDocumentSummary(showPanel ? documentId : undefined);
  const categorizeMutation = useDocumentCategorization();

  const handleCategorize = async () => {
    await categorizeMutation.mutateAsync(documentId);
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "person":
        return "👤";
      case "organization":
        return "🏢";
      case "location":
        return "📍";
      case "service":
        return "🔧";
      case "product":
        return "📦";
      default:
        return "•";
    }
  };

  const getDateTypeColor = (type: string) => {
    switch (type) {
      case "deadline":
        return "text-red-400 bg-red-500/20";
      case "expiration":
        return "text-orange-400 bg-orange-500/20";
      case "appointment":
        return "text-blue-400 bg-blue-500/20";
      case "created":
        return "text-green-400 bg-green-500/20";
      default:
        return "text-gray-400 bg-gray-500/20";
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors"
      >
        <span>✨</span>
        <span>AI Document Insights</span>
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h4 className="font-medium text-text-primary">
            AI Document Insights
          </h4>
        </div>
        <button
          onClick={() => setShowPanel(false)}
          className="text-text-muted hover:text-text-primary text-sm"
        >
          Close
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-text-secondary py-4">
          <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
          <span className="text-sm">Analyzing document...</span>
        </div>
      )}

      {summary && !isLoading && (
        <div className="space-y-4">
          {/* Document Type & Confidence */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm font-medium">
                {summary.document_type}
              </span>
              {fileName && (
                <span className="text-xs text-text-muted truncate max-w-[200px]">
                  {fileName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Confidence</span>
              <span className="text-sm font-medium text-text-primary">
                {summary.confidence}%
              </span>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-bg-card border border-border rounded-lg p-3">
            <span className="text-xs text-text-muted block mb-2">Summary</span>
            <p className="text-sm text-text-secondary">{summary.summary}</p>
          </div>

          {/* Key Points */}
          {summary.key_points.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">
                Key Points
              </span>
              <ul className="space-y-1">
                {summary.key_points.map((point, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-text-secondary"
                  >
                    <span className="text-purple-400">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Extracted Data */}
          {Object.keys(summary.extracted_data).length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">
                Extracted Data
              </span>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(summary.extracted_data).map(([key, value]) => (
                  <div
                    key={key}
                    className="bg-bg-card border border-border rounded-lg p-2"
                  >
                    <span className="text-xs text-text-muted block capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm font-medium text-text-primary">
                      {typeof value === "number" && key.includes("amount")
                        ? `$${value.toLocaleString()}`
                        : value?.toString() || "-"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entities */}
          {summary.entities.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">
                Entities Mentioned
              </span>
              <div className="flex flex-wrap gap-2">
                {summary.entities.map((entity, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-bg-tertiary text-text-secondary text-xs rounded"
                  >
                    <span>{getEntityIcon(entity.type)}</span>
                    <span>{entity.value}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dates Mentioned */}
          {summary.dates_mentioned.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">
                Important Dates
              </span>
              <div className="space-y-2">
                {summary.dates_mentioned.map((date, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-bg-card border border-border rounded-lg p-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-text-primary">
                        {date.date}
                      </span>
                      <span className="text-xs text-text-muted">
                        {date.context}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${getDateTypeColor(date.type)}`}
                    >
                      {date.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monetary Values */}
          {summary.monetary_values.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">
                Monetary Values
              </span>
              <div className="space-y-1">
                {summary.monetary_values.map((value, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-text-secondary">{value.context}</span>
                    <span className="font-medium text-success">
                      ${value.amount.toLocaleString()} {value.currency}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auto-categorization */}
          {categorizeMutation.data && (
            <div className="bg-bg-card border border-border rounded-lg p-3">
              <span className="text-xs text-text-muted block mb-2">
                AI Categorization
              </span>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">
                  {categorizeMutation.data.category}
                </span>
                {categorizeMutation.data.subcategory && (
                  <span className="px-2 py-1 bg-bg-tertiary text-text-secondary rounded text-sm">
                    {categorizeMutation.data.subcategory}
                  </span>
                )}
              </div>
              {categorizeMutation.data.suggested_tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {categorizeMutation.data.suggested_tags.map(
                    (tag: string, i: number) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 bg-bg-tertiary text-text-muted text-xs rounded"
                      >
                        #{tag}
                      </span>
                    ),
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => refetch()}
              className="flex-1"
            >
              Refresh Analysis
            </Button>
            {!categorizeMutation.data && (
              <Button
                size="sm"
                onClick={handleCategorize}
                disabled={categorizeMutation.isPending}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {categorizeMutation.isPending ? "..." : "Auto-Categorize"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
