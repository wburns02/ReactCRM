import { useState } from "react";
import {
  useCommunicationAnalytics,
  useOptimizeMessage,
  useGenerateFollowUp,
} from "@/api/hooks/useCommunicationAI";
import { Button } from "@/components/ui/Button";

/**
 * AI-powered communication optimizer panel
 * Helps optimize message timing, content, and channel selection
 */
export function CommunicationOptimizerPanel() {
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<"analytics" | "optimize" | "generate">("analytics");
  const [messageToOptimize, setMessageToOptimize] = useState("");
  const [selectedPurpose, setSelectedPurpose] = useState<"appointment" | "followup" | "promotion" | "reminder">("followup");
  const [selectedContext, setSelectedContext] = useState<"after_service" | "missed_appointment" | "quote_sent" | "overdue_payment">("after_service");

  const { data: analytics, isLoading: loadingAnalytics } = useCommunicationAnalytics();
  const optimizeMessage = useOptimizeMessage();
  const generateFollowUp = useGenerateFollowUp();

  const handleOptimize = () => {
    if (messageToOptimize.trim()) {
      optimizeMessage.mutate({
        message: messageToOptimize,
        channel: "sms",
        purpose: selectedPurpose,
      });
    }
  };

  const handleGenerate = () => {
    generateFollowUp.mutate({
      customer_id: "demo",
      context: selectedContext,
    });
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors"
      >
        <span>&#10024;</span>
        <span>AI Communication Optimizer</span>
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">&#10024;</span>
          <h4 className="font-medium text-text-primary">Communication Optimizer</h4>
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
        {(["analytics", "optimize", "generate"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-purple-600 text-white"
                : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
            }`}
          >
            {tab === "analytics" ? "Analytics" :
              tab === "optimize" ? "Optimize" :
              "Generate"}
          </button>
        ))}
      </div>

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-4">
          {loadingAnalytics ? (
            <div className="flex items-center gap-2 text-text-secondary py-4">
              <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
              <span className="text-sm">Analyzing...</span>
            </div>
          ) : analytics && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
                  <span className="text-2xl font-bold text-primary">{(analytics.response_rate * 100).toFixed(0)}%</span>
                  <span className="text-xs text-text-muted block">Response Rate</span>
                </div>
                <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
                  <span className="text-2xl font-bold text-text-primary">{analytics.avg_response_time_hours.toFixed(1)}h</span>
                  <span className="text-xs text-text-muted block">Avg Response</span>
                </div>
                <div className="bg-bg-card border border-border rounded-lg p-3 text-center">
                  <span className="text-2xl font-bold text-green-400">{analytics.best_performing_channel.toUpperCase()}</span>
                  <span className="text-xs text-text-muted block">Best Channel</span>
                </div>
              </div>

              {/* Channel Comparison */}
              <div>
                <span className="text-xs text-text-muted block mb-2">Channel Performance</span>
                <div className="space-y-2">
                  {analytics.by_channel.map((ch, i) => (
                    <div key={i} className="bg-bg-card border border-border rounded-lg p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-text-primary">{ch.channel}</span>
                        <span className="text-sm font-bold text-green-400">{(ch.response_rate * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${ch.response_rate * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Suggestions */}
              <div>
                <span className="text-xs text-text-muted block mb-2">AI Suggestions</span>
                <div className="space-y-2">
                  {analytics.suggestions.map((suggestion, i) => (
                    <div key={i} className="bg-bg-card border border-border rounded-lg p-2 flex gap-2">
                      <span className="text-purple-400">{"→"}</span>
                      <p className="text-xs text-text-secondary">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Optimize Tab */}
      {activeTab === "optimize" && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-muted block mb-1">Message to Optimize</label>
            <textarea
              value={messageToOptimize}
              onChange={(e) => setMessageToOptimize(e.target.value)}
              placeholder="Enter your message here..."
              className="w-full h-24 px-3 py-2 bg-bg-card border border-border rounded-lg text-sm text-text-primary resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-text-muted block mb-1">Purpose</label>
            <div className="flex gap-2">
              {(["appointment", "followup", "promotion", "reminder"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPurpose(p)}
                  className={`px-3 py-1 rounded text-xs ${
                    selectedPurpose === p
                      ? "bg-purple-600 text-white"
                      : "bg-bg-tertiary text-text-secondary"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleOptimize}
            disabled={!messageToOptimize.trim() || optimizeMessage.isPending}
            className="w-full"
          >
            {optimizeMessage.isPending ? "Optimizing..." : "Optimize Message"}
          </Button>

          {optimizeMessage.data && (
            <div className="space-y-3">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <span className="text-xs text-green-400 block mb-1">Optimized Message</span>
                <p className="text-sm text-text-primary">{optimizeMessage.data.optimized}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-bg-card border border-border rounded p-2">
                  <span className="text-lg font-bold text-purple-400">{optimizeMessage.data.tone_score}</span>
                  <span className="text-xs text-text-muted block">Tone</span>
                </div>
                <div className="bg-bg-card border border-border rounded p-2">
                  <span className="text-lg font-bold text-blue-400">{optimizeMessage.data.clarity_score}</span>
                  <span className="text-xs text-text-muted block">Clarity</span>
                </div>
                <div className="bg-bg-card border border-border rounded p-2">
                  <span className="text-lg font-bold text-green-400">{(optimizeMessage.data.predicted_response_rate * 100).toFixed(0)}%</span>
                  <span className="text-xs text-text-muted block">Response</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-text-muted block mb-1">Improvements Made</span>
                <ul className="text-xs text-text-secondary space-y-1">
                  {optimizeMessage.data.improvements.map((imp, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <span className="text-green-400">&#10003;</span> {imp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate Tab */}
      {activeTab === "generate" && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-muted block mb-2">Context</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "after_service", label: "After Service" },
                { value: "missed_appointment", label: "Missed Appointment" },
                { value: "quote_sent", label: "Quote Follow-up" },
                { value: "overdue_payment", label: "Payment Reminder" },
              ].map((ctx) => (
                <button
                  key={ctx.value}
                  onClick={() => setSelectedContext(ctx.value as typeof selectedContext)}
                  className={`px-3 py-2 rounded text-xs ${
                    selectedContext === ctx.value
                      ? "bg-purple-600 text-white"
                      : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                  }`}
                >
                  {ctx.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={generateFollowUp.isPending}
            className="w-full"
          >
            {generateFollowUp.isPending ? "Generating..." : "Generate Message"}
          </Button>

          {generateFollowUp.data && (
            <div className="space-y-3">
              <div className="bg-bg-card border border-border rounded-lg p-3">
                {generateFollowUp.data.subject && (
                  <div className="mb-2">
                    <span className="text-xs text-text-muted">Subject:</span>
                    <p className="text-sm font-medium text-text-primary">{generateFollowUp.data.subject}</p>
                  </div>
                )}
                <span className="text-xs text-text-muted">Message:</span>
                <p className="text-sm text-text-primary mt-1">{generateFollowUp.data.message}</p>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Recommended Channel:</span>
                <span className="text-purple-400 font-medium uppercase">{generateFollowUp.data.recommended_channel}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" className="flex-1">
                  Copy
                </Button>
                <Button size="sm" className="flex-1">
                  Send Now
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
