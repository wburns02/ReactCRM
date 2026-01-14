import { useState, useRef, useEffect, memo, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  useAIDispatchSuggestions,
  useAIDispatchPrompt,
  useExecuteAIAction,
  useDismissAISuggestion,
  type AIDispatchSuggestion,
} from "@/api/hooks/useAIDispatch";
import { toastSuccess, toastError } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

/**
 * AI Dispatch Assistant
 *
 * The 2026 Differentiator: AI that *executes*, not just *suggests*
 *
 * Features:
 * - Natural language interface for dispatch commands
 * - Real-time suggestions based on schedule state
 * - One-click execution of AI recommendations
 * - Confidence-based prioritization
 */
export function AIDispatchAssistant({ className }: { className?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: suggestions = [], isLoading: loadingSuggestions } =
    useAIDispatchSuggestions();
  const promptMutation = useAIDispatchPrompt();
  const executeMutation = useExecuteAIAction();
  const dismissMutation = useDismissAISuggestion();

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!prompt.trim()) return;

      try {
        const response = await promptMutation.mutateAsync({ prompt });
        if (response.execution_result?.success) {
          toastSuccess("Action executed", response.execution_result.message);
        }
        setPrompt("");
      } catch {
        toastError("Error", "Failed to process your request");
      }
    },
    [prompt, promptMutation],
  );

  const handleExecute = useCallback(
    async (suggestion: AIDispatchSuggestion, actionId: string) => {
      try {
        const result = await executeMutation.mutateAsync({
          suggestion_id: suggestion.id,
          action_id: actionId,
        });
        if (result.success) {
          toastSuccess("Success", result.message);
        } else {
          toastError("Failed", result.message);
        }
      } catch {
        toastError("Error", "Failed to execute action");
      }
    },
    [executeMutation],
  );

  const handleDismiss = useCallback(
    async (suggestionId: string) => {
      try {
        await dismissMutation.mutateAsync({ suggestion_id: suggestionId });
      } catch {
        toastError("Error", "Failed to dismiss suggestion");
      }
    },
    [dismissMutation],
  );

  const pendingSuggestions = suggestions.filter(
    (s) => new Date(s.expires_at) > new Date(),
  );
  const highPrioritySuggestions = pendingSuggestions.filter(
    (s) => s.confidence >= 0.8,
  );

  return (
    <div className={cn("relative", className)}>
      {/* Collapsed View - Floating Button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2",
            "bg-gradient-to-r from-primary to-purple-600 text-white",
            "px-4 py-3 rounded-full shadow-lg",
            "hover:shadow-xl transition-all duration-200",
            "animate-in slide-in-from-bottom-4",
          )}
        >
          <span className="text-xl">🤖</span>
          <span className="font-medium">AI Dispatch</span>
          {highPrioritySuggestions.length > 0 && (
            <span className="bg-white text-primary px-2 py-0.5 rounded-full text-xs font-bold">
              {highPrioritySuggestions.length}
            </span>
          )}
        </button>
      )}

      {/* Expanded View - Full Panel */}
      {isExpanded && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] max-h-[600px] flex flex-col animate-in slide-in-from-bottom-4">
          <Card className="flex flex-col overflow-hidden shadow-2xl border-2 border-primary/20">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-purple-600 px-4 py-3 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <h3 className="font-semibold">AI Dispatch Assistant</h3>
                    <p className="text-xs text-white/80">
                      {loadingSuggestions
                        ? "Analyzing..."
                        : `${pendingSuggestions.length} suggestions`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  aria-label="Minimize"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Natural Language Input */}
            <form
              onSubmit={handleSubmit}
              className="p-3 border-b border-border"
            >
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask me anything... e.g., 'Schedule John for the Smith job tomorrow'"
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={promptMutation.isPending}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!prompt.trim() || promptMutation.isPending}
                >
                  {promptMutation.isPending ? "..." : "Ask"}
                </Button>
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp.prompt}
                    type="button"
                    onClick={() => setPrompt(qp.prompt)}
                    className="text-xs px-2 py-1 bg-bg-muted rounded hover:bg-bg-hover transition-colors"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </form>

            {/* Suggestions List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[350px]">
              {pendingSuggestions.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  <span className="text-4xl block mb-2">✨</span>
                  <p className="text-sm">No pending suggestions</p>
                  <p className="text-xs mt-1">
                    Try asking a question or wait for automatic insights
                  </p>
                </div>
              ) : (
                pendingSuggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onExecute={handleExecute}
                    onDismiss={handleDismiss}
                    isExecuting={executeMutation.isPending}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 bg-bg-muted text-xs text-text-muted border-t border-border flex items-center justify-between">
              <span>Powered by AI • Updates every 30s</span>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-primary hover:underline"
              >
                Minimize
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/**
 * Quick prompt suggestions
 */
const QUICK_PROMPTS = [
  {
    label: "Optimize routes",
    prompt: "Optimize tomorrow's routes for fuel efficiency",
  },
  {
    label: "Auto-assign",
    prompt: "Auto-assign all unscheduled jobs for this week",
  },
  {
    label: "Running late?",
    prompt: "Which technicians are running late today?",
  },
  {
    label: "Parts needed",
    prompt: "What parts are likely needed for today's jobs?",
  },
];

/**
 * Individual Suggestion Card
 */
const SuggestionCard = memo(function SuggestionCard({
  suggestion,
  onExecute,
  onDismiss,
  isExecuting,
}: {
  suggestion: AIDispatchSuggestion;
  onExecute: (suggestion: AIDispatchSuggestion, actionId: string) => void;
  onDismiss: (id: string) => void;
  isExecuting: boolean;
}) {
  const [showReasoning, setShowReasoning] = useState(false);

  const confidenceColor =
    suggestion.confidence >= 0.8
      ? "bg-success"
      : suggestion.confidence >= 0.6
        ? "bg-warning"
        : "bg-text-muted";

  const typeIcons: Record<string, string> = {
    assign: "👷",
    reschedule: "📅",
    route_optimize: "🗺️",
    parts_order: "📦",
    follow_up: "📞",
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-bg-card hover:border-primary/50 transition-colors">
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start gap-2">
          <span className="text-xl">{typeIcons[suggestion.type] || "💡"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm text-text-primary truncate">
                {suggestion.title}
              </h4>
              <div
                className={cn("w-2 h-2 rounded-full", confidenceColor)}
                title={`${Math.round(suggestion.confidence * 100)}% confidence`}
              />
            </div>
            <p className="text-xs text-text-secondary line-clamp-2">
              {suggestion.description}
            </p>
          </div>
          <button
            onClick={() => onDismiss(suggestion.id)}
            className="p-1 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Dismiss"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Impact */}
        {suggestion.estimated_impact && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {suggestion.estimated_impact.time_saved_minutes && (
              <Badge variant="success" className="text-xs">
                Saves {suggestion.estimated_impact.time_saved_minutes}min
              </Badge>
            )}
            {suggestion.estimated_impact.cost_saved && (
              <Badge variant="success" className="text-xs">
                Saves ${suggestion.estimated_impact.cost_saved}
              </Badge>
            )}
          </div>
        )}

        {/* Reasoning Toggle */}
        <button
          onClick={() => setShowReasoning(!showReasoning)}
          className="text-xs text-primary hover:underline mt-2"
        >
          {showReasoning ? "Hide reasoning" : "Why this suggestion?"}
        </button>

        {showReasoning && (
          <p className="text-xs text-text-muted mt-1 bg-bg-muted p-2 rounded">
            {suggestion.reasoning}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 py-2 bg-bg-muted border-t border-border flex gap-2">
        {suggestion.actions.map((action) => (
          <Button
            key={action.id}
            size="sm"
            variant={action.type === "primary" ? "primary" : "secondary"}
            onClick={() => onExecute(suggestion, action.id)}
            disabled={isExecuting}
            className="text-xs"
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
});
