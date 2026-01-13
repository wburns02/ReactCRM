import { useState } from "react";
import { useActivitySummary, useWeeklyDigest } from "@/api/hooks/useActivityAI";
import { Button } from "@/components/ui/Button";

interface ActivitySummaryPanelProps {
  customerId: string;
}

/**
 * AI-powered activity summary panel
 * Displays summarized activity history, action items, and insights
 */
export function ActivitySummaryPanel({ customerId }: ActivitySummaryPanelProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "digest">("summary");

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useActivitySummary(
    showPanel ? customerId : undefined
  );
  const { data: digest, isLoading: digestLoading } = useWeeklyDigest(
    showPanel && activeTab === "digest" ? customerId : undefined
  );

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-400";
      case "negative":
        return "text-red-400";
      default:
        return "text-yellow-400";
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "😊";
      case "negative":
        return "😟";
      default:
        return "😐";
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors mb-4"
      >
        <span>✨</span>
        <span>AI Activity Summary</span>
      </button>
    );
  }

  const isLoading = activeTab === "summary" ? summaryLoading : digestLoading;

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h4 className="font-medium text-text-primary">AI Activity Insights</h4>
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
          onClick={() => setActiveTab("summary")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "summary"
              ? "bg-purple-600 text-white"
              : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
          }`}
        >
          Summary
        </button>
        <button
          onClick={() => setActiveTab("digest")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "digest"
              ? "bg-purple-600 text-white"
              : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
          }`}
        >
          Weekly Digest
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-text-secondary py-4">
          <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
          <span className="text-sm">Analyzing activities...</span>
        </div>
      )}

      {/* Summary Tab */}
      {activeTab === "summary" && summary && !isLoading && (
        <div className="space-y-4">
          {/* Overall Summary */}
          <div className="bg-bg-card border border-border rounded-lg p-3">
            <p className="text-sm text-text-secondary">{summary.summary}</p>
          </div>

          {/* Sentiment & Quality Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg-card border border-border rounded-lg p-3">
              <span className="text-xs text-text-muted block mb-1">Customer Sentiment</span>
              <div className="flex items-center gap-2">
                <span className="text-xl">{getSentimentIcon(summary.sentiment)}</span>
                <span className={`font-medium capitalize ${getSentimentColor(summary.sentiment)}`}>
                  {summary.customer_mood || summary.sentiment}
                </span>
              </div>
            </div>
            <div className="bg-bg-card border border-border rounded-lg p-3">
              <span className="text-xs text-text-muted block mb-1">Interaction Quality</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      summary.interaction_quality >= 7 ? "bg-green-500" :
                      summary.interaction_quality >= 4 ? "bg-yellow-500" :
                      "bg-red-500"
                    }`}
                    style={{ width: `${summary.interaction_quality * 10}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-text-primary">{summary.interaction_quality}/10</span>
              </div>
            </div>
          </div>

          {/* Key Points */}
          {summary.key_points.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Key Points</span>
              <ul className="space-y-1">
                {summary.key_points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Topics */}
          {summary.topics.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Topics Discussed</span>
              <div className="flex flex-wrap gap-2">
                {summary.topics.map((topic) => (
                  <span
                    key={topic}
                    className="px-2 py-1 bg-bg-tertiary text-text-secondary text-xs rounded"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Items */}
          {summary.action_items.length > 0 && (
            <div className="bg-bg-card border border-border rounded-lg p-3">
              <span className="text-xs text-text-muted block mb-2">Action Items</span>
              <ul className="space-y-2">
                {summary.action_items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-border"
                    />
                    <span className="text-text-primary">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Steps */}
          {summary.next_steps && summary.next_steps.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Recommended Next Steps</span>
              <ul className="space-y-1">
                {summary.next_steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="text-blue-400">→</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button
            size="sm"
            variant="secondary"
            onClick={() => refetchSummary()}
            className="w-full"
          >
            Refresh Summary
          </Button>
        </div>
      )}

      {/* Weekly Digest Tab */}
      {activeTab === "digest" && digest && !isLoading && (
        <div className="space-y-4">
          <div className="bg-bg-card border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted">{digest.period}</span>
              <span className="text-sm font-medium text-text-primary">
                {digest.total_interactions} interactions
              </span>
            </div>
          </div>

          {/* Highlights */}
          {digest.highlights && digest.highlights.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Highlights</span>
              <ul className="space-y-1">
                {digest.highlights.map((highlight: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="text-green-400">✓</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pending Items */}
          {digest.pending_items && digest.pending_items.length > 0 && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
              <span className="text-xs text-warning block mb-2">Pending Items</span>
              <ul className="space-y-1">
                {digest.pending_items.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="text-warning">!</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Actions */}
          {digest.recommended_actions && digest.recommended_actions.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Recommended Actions</span>
              <div className="space-y-2">
                {digest.recommended_actions.map((action: string, i: number) => (
                  <button
                    key={i}
                    className="w-full text-left px-3 py-2 bg-bg-card border border-border rounded-lg text-sm text-text-primary hover:bg-bg-hover transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
