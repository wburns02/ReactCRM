import { useState, useCallback, memo, useMemo, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabList, TabTrigger, TabContent } from "@/components/ui/Tabs";
import {
  useAIDispatchSuggestions,
  useAIDispatchPrompt,
  useExecuteAIAction,
  useDismissAISuggestion,
  useAIDispatchHistory,
  useAIDispatchStats,
  useExecutiveMode,
  type AIDispatchSuggestion,
} from "@/api/hooks/useAIDispatch";
import { useTechnicians } from "@/api/hooks/useTechnicians";
import { toastSuccess, toastError, toastInfo } from "@/components/ui/Toast";
import { AICommandInput } from "./AICommandInput";
import {
  DispatchSuggestionCard,
  DispatchSuggestionCardSkeletonList,
} from "./DispatchSuggestionCard";
import { ExecutiveModeToggle } from "./ExecutiveModeToggle";
import { cn } from "@/lib/utils";

/**
 * Filter options for suggestions
 */
type SuggestionFilter = "all" | "high_confidence" | "scheduling" | "routing";

/**
 * Props for AIDispatchPanel
 */
interface AIDispatchPanelProps {
  className?: string;
  /** Whether to show as a floating panel or embedded */
  variant?: "floating" | "embedded";
  /** Default expanded state for floating variant */
  defaultExpanded?: boolean;
  /** Callback when a suggestion is executed */
  onSuggestionExecuted?: (suggestion: AIDispatchSuggestion) => void;
}

/**
 * AIDispatchPanel - Main Agentic AI Dispatch Command Panel
 *
 * Features:
 * - Natural language input for dispatch commands
 * - Real-time AI suggestions with confidence scores
 * - Technician availability and skills display
 * - One-click accept/reject for suggestions
 * - Loading states with skeleton
 * - Filter and sort suggestions
 * - Command history
 */
export const AIDispatchPanel = memo(function AIDispatchPanel({
  className,
  variant = "floating",
  defaultExpanded = false,
  onSuggestionExecuted,
}: AIDispatchPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [filter, setFilter] = useState<SuggestionFilter>("all");
  const [activeTab, setActiveTab] = useState<
    "suggestions" | "history" | "stats"
  >("suggestions");

  // Queries and mutations
  const {
    data: suggestions = [],
    isLoading: loadingSuggestions,
    refetch: refetchSuggestions,
  } = useAIDispatchSuggestions();
  const { data: history = [], isLoading: loadingHistory } =
    useAIDispatchHistory(20);
  const { data: stats, isLoading: loadingStats } = useAIDispatchStats();
  const { data: techniciansData } = useTechnicians({
    active_only: true,
    page_size: 100,
  });

  const promptMutation = useAIDispatchPrompt();
  const executeMutation = useExecuteAIAction();
  const dismissMutation = useDismissAISuggestion();

  // Executive Mode for auto-execution
  const executiveMode = useExecutiveMode();
  const autoExecutedRef = useRef<Set<string>>(new Set());

  // Auto-execute high-confidence suggestions in Executive Mode
  useEffect(() => {
    if (!executiveMode.settings.enabled || loadingSuggestions) return;

    const eligibleSuggestions = suggestions.filter(
      (s) =>
        executiveMode.canAutoExecute(s) &&
        !autoExecutedRef.current.has(s.id) &&
        s.actions.length > 0,
    );

    // Auto-execute eligible suggestions (one at a time to avoid conflicts)
    if (eligibleSuggestions.length > 0 && !executeMutation.isPending) {
      const suggestion = eligibleSuggestions[0];
      const primaryAction =
        suggestion.actions.find((a) => a.type === "primary") ||
        suggestion.actions[0];

      // Mark as auto-executed to prevent duplicate execution
      autoExecutedRef.current.add(suggestion.id);

      // Execute the action
      executeMutation
        .mutateAsync({
          suggestion_id: suggestion.id,
          action_id: primaryAction.id,
        })
        .then((result) => {
          if (result.success) {
            executiveMode.incrementAutoExecutionCount();
            if (executiveMode.settings.showNotifications) {
              toastInfo(
                "Auto-Executed",
                `${suggestion.title} - ${result.message}`,
              );
            }
            onSuggestionExecuted?.(suggestion);
          }
        })
        .catch(() => {
          // Remove from auto-executed set on failure so it can be retried manually
          autoExecutedRef.current.delete(suggestion.id);
        });
    }
  }, [
    suggestions,
    executiveMode,
    loadingSuggestions,
    executeMutation,
    onSuggestionExecuted,
  ]);

  // Filter out expired suggestions and apply user filter
  const filteredSuggestions = useMemo(() => {
    const now = new Date();
    let filtered = suggestions.filter((s) => new Date(s.expires_at) > now);

    switch (filter) {
      case "high_confidence":
        filtered = filtered.filter((s) => s.confidence >= 0.8);
        break;
      case "scheduling":
        filtered = filtered.filter(
          (s) => s.type === "assign" || s.type === "reschedule",
        );
        break;
      case "routing":
        filtered = filtered.filter((s) => s.type === "route_optimize");
        break;
    }

    // Sort by confidence (highest first), then by creation time
    return filtered.sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [suggestions, filter]);

  // Count of high priority suggestions
  const highPriorityCount = useMemo(
    () => filteredSuggestions.filter((s) => s.confidence >= 0.8).length,
    [filteredSuggestions],
  );

  // Handle prompt submission
  const handlePromptSubmit = useCallback(
    async (prompt: string) => {
      try {
        const response = await promptMutation.mutateAsync({
          prompt,
          auto_execute: false,
        });

        if (response.execution_result?.success) {
          toastSuccess("Action Executed", response.execution_result.message);
        } else if (response.suggestions.length > 0) {
          toastSuccess(
            "Suggestions Ready",
            `${response.suggestions.length} suggestions generated`,
          );
        } else if (response.natural_response) {
          toastSuccess("AI Response", response.natural_response);
        }

        // Refetch suggestions after prompt
        refetchSuggestions();
      } catch (error) {
        toastError(
          "Error",
          "Failed to process your request. Please try again.",
        );
        console.error("AI Dispatch prompt error:", error);
      }
    },
    [promptMutation, refetchSuggestions],
  );

  // Handle suggestion execution
  const handleExecute = useCallback(
    async (suggestion: AIDispatchSuggestion, actionId: string) => {
      try {
        const result = await executeMutation.mutateAsync({
          suggestion_id: suggestion.id,
          action_id: actionId,
        });

        if (result.success) {
          toastSuccess("Success", result.message);
          onSuggestionExecuted?.(suggestion);
        } else {
          toastError("Failed", result.message);
        }
      } catch (error) {
        toastError("Error", "Failed to execute action. Please try again.");
        console.error("AI Dispatch execute error:", error);
      }
    },
    [executeMutation, onSuggestionExecuted],
  );

  // Handle suggestion dismissal
  const handleDismiss = useCallback(
    async (suggestionId: string, reason?: string) => {
      try {
        await dismissMutation.mutateAsync({
          suggestion_id: suggestionId,
          reason,
        });
        toastSuccess("Dismissed", "Suggestion has been dismissed");
      } catch (error) {
        toastError("Error", "Failed to dismiss suggestion");
        console.error("AI Dispatch dismiss error:", error);
      }
    },
    [dismissMutation],
  );

  // Render floating button for collapsed state
  if (variant === "floating" && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2",
          executiveMode.settings.enabled
            ? "bg-gradient-to-r from-purple-500 to-primary"
            : "bg-gradient-to-r from-primary to-purple-600",
          "text-white px-4 py-3 rounded-full shadow-lg",
          "hover:shadow-xl transition-all duration-200",
          "animate-in slide-in-from-bottom-4",
          className,
        )}
      >
        <span
          className={cn(
            "text-xl",
            executiveMode.settings.enabled && "animate-pulse",
          )}
        >
          AI
        </span>
        <span className="font-medium">
          {executiveMode.settings.enabled ? "Executive Mode" : "AI Dispatch"}
        </span>
        {highPriorityCount > 0 && (
          <span className="bg-white text-primary px-2 py-0.5 rounded-full text-xs font-bold">
            {highPriorityCount}
          </span>
        )}
        {executiveMode.settings.enabled && (
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
        )}
      </button>
    );
  }

  // Main panel content
  const panelContent = (
    <>
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-purple-600 px-4 py-3 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">AI</span>
            <div>
              <h3 className="font-semibold">AI Dispatch Assistant</h3>
              <p className="text-xs text-white/80">
                {loadingSuggestions
                  ? "Analyzing..."
                  : `${filteredSuggestions.length} suggestion${filteredSuggestions.length !== 1 ? "s" : ""} available`}
              </p>
            </div>
          </div>
          {variant === "floating" && (
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
          )}
        </div>
      </div>

      {/* Executive Mode Toggle */}
      <div className="p-4 border-b border-border">
        <ExecutiveModeToggle />
      </div>

      {/* Command Input */}
      <div className="p-4 border-b border-border">
        <AICommandInput
          onSubmit={handlePromptSubmit}
          isProcessing={promptMutation.isPending}
          placeholder="Try: 'Schedule John for the Smith job tomorrow' or 'Optimize routes'"
        />
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <TabList className="px-4 pt-2">
          <TabTrigger value="suggestions" className="flex items-center gap-1">
            Suggestions
            {filteredSuggestions.length > 0 && (
              <Badge variant="primary" className="text-xs ml-1">
                {filteredSuggestions.length}
              </Badge>
            )}
          </TabTrigger>
          <TabTrigger value="history">History</TabTrigger>
          <TabTrigger value="stats">Stats</TabTrigger>
        </TabList>

        {/* Suggestions Tab */}
        <TabContent value="suggestions" className="p-4 space-y-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            {(["all", "high_confidence", "scheduling", "routing"] as const).map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1 text-xs rounded-full transition-colors",
                    filter === f
                      ? "bg-primary text-white"
                      : "bg-bg-muted text-text-secondary hover:bg-bg-hover",
                  )}
                >
                  {f === "all" && "All"}
                  {f === "high_confidence" && "High Confidence"}
                  {f === "scheduling" && "Scheduling"}
                  {f === "routing" && "Routing"}
                </button>
              ),
            )}
          </div>

          {/* Technician Availability Quick View */}
          {techniciansData &&
            techniciansData.items &&
            techniciansData.items.length > 0 && (
              <TechnicianQuickView technicians={techniciansData.items} />
            )}

          {/* Suggestions List */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {loadingSuggestions ? (
              <DispatchSuggestionCardSkeletonList count={3} />
            ) : filteredSuggestions.length === 0 ? (
              <EmptyState filter={filter} />
            ) : (
              filteredSuggestions.map((suggestion) => (
                <DispatchSuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onExecute={handleExecute}
                  onDismiss={handleDismiss}
                  isExecuting={executeMutation.isPending}
                />
              ))
            )}
          </div>
        </TabContent>

        {/* History Tab */}
        <TabContent value="history" className="p-4">
          {loadingHistory ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" className="h-12 w-full" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-text-muted/50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm">No command history yet</p>
              <p className="text-xs mt-1">
                Your AI dispatch commands will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 bg-bg-muted/50 rounded-lg hover:bg-bg-muted transition-colors"
                >
                  <p className="text-sm text-text-primary">{entry.prompt}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                    <span>{new Date(entry.created_at).toLocaleString()}</span>
                    {entry.executed && (
                      <Badge variant="success" className="text-xs">
                        Executed
                      </Badge>
                    )}
                    {entry.suggestions_count > 0 && (
                      <span>
                        {entry.suggestions_count} suggestion
                        {entry.suggestions_count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {entry.response && (
                    <p className="text-xs text-text-secondary mt-2 line-clamp-2">
                      {entry.response}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabContent>

        {/* Stats Tab */}
        <TabContent value="stats" className="p-4">
          {loadingStats ? (
            <div className="space-y-4">
              <Skeleton variant="rounded" className="h-20 w-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton variant="rounded" className="h-16" />
                <Skeleton variant="rounded" className="h-16" />
                <Skeleton variant="rounded" className="h-16" />
                <Skeleton variant="rounded" className="h-16" />
              </div>
            </div>
          ) : stats ? (
            <div className="space-y-4">
              {/* Main Metric */}
              <div className="text-center p-4 bg-gradient-to-r from-primary/10 to-purple-600/10 rounded-lg">
                <div className="text-4xl font-bold text-primary">
                  {stats.time_saved_minutes}
                  <span className="text-lg text-text-muted ml-1">min</span>
                </div>
                <p className="text-sm text-text-secondary mt-1">
                  Time saved today through AI dispatch
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-bg-muted rounded-lg text-center">
                  <div className="text-2xl font-semibold text-text-primary">
                    {stats.suggestions_today}
                  </div>
                  <div className="text-xs text-text-muted">Suggestions</div>
                </div>
                <div className="p-3 bg-bg-muted rounded-lg text-center">
                  <div className="text-2xl font-semibold text-success">
                    {Math.round(stats.acceptance_rate * 100)}%
                  </div>
                  <div className="text-xs text-text-muted">Acceptance</div>
                </div>
                <div className="p-3 bg-bg-muted rounded-lg text-center">
                  <div className="text-2xl font-semibold text-text-primary">
                    {stats.suggestions_accepted}
                  </div>
                  <div className="text-xs text-text-muted">Accepted</div>
                </div>
                <div className="p-3 bg-bg-muted rounded-lg text-center">
                  <div className="text-2xl font-semibold text-primary">
                    {stats.auto_executions}
                  </div>
                  <div className="text-xs text-text-muted">Auto-Executed</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-text-muted">
              <p className="text-sm">No stats available</p>
            </div>
          )}
        </TabContent>
      </Tabs>

      {/* Footer */}
      <div className="px-4 py-2 bg-bg-muted text-xs text-text-muted border-t border-border flex items-center justify-between rounded-b-lg">
        <span>Powered by AI - Updates automatically</span>
        <button
          onClick={() => refetchSuggestions()}
          className="text-primary hover:underline"
          disabled={loadingSuggestions}
        >
          Refresh
        </button>
      </div>
    </>
  );

  // Floating variant
  if (variant === "floating") {
    return (
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 w-[480px] max-h-[700px]",
          "flex flex-col animate-in slide-in-from-bottom-4",
          className,
        )}
      >
        <Card className="flex flex-col overflow-hidden shadow-2xl border-2 border-primary/20 p-0">
          {panelContent}
        </Card>
      </div>
    );
  }

  // Embedded variant
  return (
    <Card className={cn("overflow-hidden p-0", className)}>{panelContent}</Card>
  );
});

/**
 * Quick view of technician availability
 */
function TechnicianQuickView({
  technicians,
}: {
  technicians: Array<{
    id: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    skills: string[] | null;
  }>;
}) {
  const activeTechs = technicians.filter((t) => t.is_active).slice(0, 5);

  if (activeTechs.length === 0) return null;

  return (
    <div className="p-3 bg-bg-muted/50 rounded-lg">
      <h4 className="text-xs font-medium text-text-muted mb-2">
        Available Technicians
      </h4>
      <div className="flex gap-2 flex-wrap">
        {activeTechs.map((tech) => (
          <div
            key={tech.id}
            className="flex items-center gap-2 px-2 py-1 bg-bg-card rounded-full text-sm"
          >
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium">
              {tech.first_name[0]}
              {tech.last_name[0]}
            </div>
            <span className="text-text-primary">{tech.first_name}</span>
            <span
              className="w-2 h-2 rounded-full bg-success"
              title="Available"
            />
          </div>
        ))}
        {technicians.filter((t) => t.is_active).length > 5 && (
          <span className="px-2 py-1 text-xs text-text-muted">
            +{technicians.filter((t) => t.is_active).length - 5} more
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Empty state when no suggestions
 */
function EmptyState({ filter }: { filter: SuggestionFilter }) {
  const messages: Record<
    SuggestionFilter,
    { title: string; description: string }
  > = {
    all: {
      title: "No pending suggestions",
      description:
        "Ask AI to analyze your schedule or wait for automatic insights",
    },
    high_confidence: {
      title: "No high-confidence suggestions",
      description:
        "Try lowering the filter or ask AI for specific recommendations",
    },
    scheduling: {
      title: "No scheduling suggestions",
      description:
        'Ask AI about scheduling: "Who should handle the next emergency call?"',
    },
    routing: {
      title: "No routing suggestions",
      description:
        'Ask AI to optimize routes: "Optimize tomorrow\'s routes for efficiency"',
    },
  };

  const msg = messages[filter];

  return (
    <div className="text-center py-8">
      <div className="text-4xl mb-3">*</div>
      <p className="text-sm text-text-primary font-medium">{msg.title}</p>
      <p className="text-xs text-text-muted mt-1">{msg.description}</p>
    </div>
  );
}

export default AIDispatchPanel;
