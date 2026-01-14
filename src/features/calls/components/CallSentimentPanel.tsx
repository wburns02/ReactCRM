import { useState } from "react";
import { useCallSentiment, useCallQualityScore, useAgentCoaching } from "@/api/hooks/useCallAnalytics";
import { Button } from "@/components/ui/Button";

interface CallSentimentPanelProps {
  callId: number;
}

/**
 * AI-powered call sentiment analysis panel
 * Displays sentiment, emotions, key moments, and coaching tips
 */
export function CallSentimentPanel({ callId }: CallSentimentPanelProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<"sentiment" | "quality" | "coaching">("sentiment");

  const { data: sentiment, isLoading: sentimentLoading, refetch } = useCallSentiment(
    showPanel ? callId : undefined
  );
  const { data: quality, isLoading: qualityLoading } = useCallQualityScore(
    showPanel && activeTab === "quality" ? callId : undefined
  );
  const { data: coaching, isLoading: coachingLoading } = useAgentCoaching(
    showPanel && activeTab === "coaching" ? callId : undefined
  );

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-400 bg-green-500/20";
      case "negative":
        return "text-red-400 bg-red-500/20";
      default:
        return "text-yellow-400 bg-yellow-500/20";
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

  const getEscalationColor = (risk: string) => {
    switch (risk) {
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-green-500/20 text-green-400 border-green-500/30";
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors"
      >
        <span>✨</span>
        <span>AI Call Analysis</span>
      </button>
    );
  }

  const isLoading = activeTab === "sentiment" ? sentimentLoading :
                    activeTab === "quality" ? qualityLoading : coachingLoading;

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h4 className="font-medium text-text-primary">AI Call Analysis</h4>
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
        {(["sentiment", "quality", "coaching"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? "bg-purple-600 text-white"
                : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-text-secondary py-4">
          <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
          <span className="text-sm">Analyzing call...</span>
        </div>
      )}

      {/* Sentiment Tab */}
      {activeTab === "sentiment" && sentiment && !isLoading && (
        <div className="space-y-4">
          {/* Overall Sentiment */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getSentimentIcon(sentiment.overall_sentiment)}</span>
              <div>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(sentiment.overall_sentiment)}`}>
                  {sentiment.overall_sentiment.toUpperCase()}
                </span>
                <p className="text-xs text-text-muted mt-1">{sentiment.confidence}% confidence</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-text-primary">
                {sentiment.sentiment_score > 0 ? "+" : ""}{sentiment.sentiment_score}
              </div>
              <p className="text-xs text-text-muted">Sentiment Score</p>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg-card border border-border rounded-lg p-3">
              <span className="text-xs text-text-muted block mb-1">Customer Satisfaction</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      sentiment.customer_satisfaction_indicator >= 7 ? "bg-green-500" :
                      sentiment.customer_satisfaction_indicator >= 4 ? "bg-yellow-500" :
                      "bg-red-500"
                    }`}
                    style={{ width: `${sentiment.customer_satisfaction_indicator * 10}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-text-primary">
                  {sentiment.customer_satisfaction_indicator}/10
                </span>
              </div>
            </div>
            <div className="bg-bg-card border border-border rounded-lg p-3">
              <span className="text-xs text-text-muted block mb-1">Escalation Risk</span>
              <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getEscalationColor(sentiment.escalation_risk)}`}>
                {sentiment.escalation_risk.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Emotions Detected */}
          {sentiment.emotions_detected.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Emotions Detected</span>
              <div className="flex flex-wrap gap-2">
                {sentiment.emotions_detected.map((emotion, i) => (
                  <span
                    key={i}
                    className={`px-2 py-1 rounded text-xs ${
                      emotion.intensity === "high" ? "bg-purple-500/20 text-purple-400" :
                      emotion.intensity === "medium" ? "bg-blue-500/20 text-blue-400" :
                      "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {emotion.emotion}
                    <span className="ml-1 opacity-60">({emotion.intensity})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key Moments */}
          {sentiment.key_moments.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Key Moments</span>
              <div className="space-y-2">
                {sentiment.key_moments.map((moment, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 p-2 rounded-lg ${
                      moment.type === "positive" ? "bg-green-500/10" :
                      moment.type === "negative" ? "bg-red-500/10" :
                      "bg-bg-tertiary"
                    }`}
                  >
                    <span className="text-xs text-text-muted font-mono">{moment.timestamp}</span>
                    <span className={
                      moment.type === "positive" ? "text-green-400" :
                      moment.type === "negative" ? "text-red-400" :
                      "text-text-secondary"
                    }>
                      {moment.type === "positive" ? "+" : moment.type === "negative" ? "-" : "•"}
                    </span>
                    <span className="text-sm text-text-secondary">{moment.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-bg-card border border-border rounded-lg p-3">
            <span className="text-xs text-text-muted block mb-2">Summary</span>
            <p className="text-sm text-text-secondary">{sentiment.summary}</p>
          </div>

          {/* Action Items */}
          {sentiment.action_items.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Action Items</span>
              <ul className="space-y-1">
                {sentiment.action_items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-0.5 rounded border-border" />
                    <span className="text-text-primary">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Quality Tab */}
      {activeTab === "quality" && quality && !isLoading && (
        <div className="space-y-4">
          <div className="bg-bg-card border border-border rounded-lg p-4 text-center">
            <div className="text-4xl font-bold text-text-primary mb-1">{quality.overall_score}</div>
            <p className="text-sm text-text-muted">Overall Quality Score</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {Object.entries(quality.categories).map(([key, value]) => (
              <div key={key} className="bg-bg-card border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-text-muted capitalize">{key}</span>
                  <span className="text-sm font-medium text-text-primary">{value as number}</span>
                </div>
                <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                    style={{ width: `${value as number}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {quality.improvements && quality.improvements.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Improvements</span>
              <ul className="space-y-1">
                {quality.improvements.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="text-yellow-400">→</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Coaching Tab */}
      {activeTab === "coaching" && coaching && !isLoading && (
        <div className="space-y-4">
          {/* Strengths */}
          {coaching.strengths && coaching.strengths.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Strengths</span>
              <ul className="space-y-1">
                {coaching.strengths.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="text-green-400">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Areas for Improvement */}
          {coaching.areas_for_improvement && coaching.areas_for_improvement.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Areas for Improvement</span>
              <ul className="space-y-1">
                {coaching.areas_for_improvement.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="text-yellow-400">!</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Phrases */}
          {coaching.suggested_phrases && coaching.suggested_phrases.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Suggested Phrases</span>
              <div className="space-y-2">
                {coaching.suggested_phrases.map((phrase: string, i: number) => (
                  <div key={i} className="bg-bg-card border border-border rounded-lg p-2 text-sm text-text-secondary italic">
                    {phrase}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overall Rating */}
          {coaching.overall_rating && (
            <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={star <= coaching.overall_rating ? "text-yellow-400" : "text-gray-600"}
                  >
                    ★
                  </span>
                ))}
              </div>
              <p className="text-xs text-text-muted mt-1">Agent Performance Rating</p>
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
