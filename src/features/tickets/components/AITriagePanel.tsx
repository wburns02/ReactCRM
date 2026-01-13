import { useState, useEffect } from "react";
import { useTicketTriage, type TicketTriageResult } from "@/api/hooks/useTicketAI";
import { Button } from "@/components/ui/Button";
import type { TicketType, TicketPriority } from "@/api/types/ticket";

interface AITriagePanelProps {
  title: string;
  description: string;
  onApplySuggestions?: (suggestions: {
    type: TicketType;
    priority: TicketPriority;
  }) => void;
}

/**
 * AI-powered ticket triage panel
 * Analyzes ticket content and suggests category, priority, and assignee
 */
export function AITriagePanel({
  title,
  description,
  onApplySuggestions,
}: AITriagePanelProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [triageResult, setTriageResult] = useState<TicketTriageResult | null>(null);
  const triageMutation = useTicketTriage();

  // Auto-analyze when content changes significantly
  useEffect(() => {
    if (showPanel && (title.length > 5 || description.length > 10)) {
      const timer = setTimeout(() => {
        runTriage();
      }, 1000); // Debounce
      return () => clearTimeout(timer);
    }
  }, [title, description, showPanel]);

  const runTriage = async () => {
    if (!title.trim() && !description.trim()) return;

    const result = await triageMutation.mutateAsync({ title, description });
    setTriageResult(result);
  };

  const handleApply = () => {
    if (triageResult && onApplySuggestions) {
      onApplySuggestions({
        type: triageResult.suggested_type,
        priority: triageResult.suggested_priority,
      });
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getTypeIcon = (type: TicketType) => {
    switch (type) {
      case "bug":
        return "🐛";
      case "feature":
        return "✨";
      case "support":
        return "📈";
      case "task":
        return "📋";
      default:
        return "📝";
    }
  };

  if (!showPanel) {
    return (
      <button
        type="button"
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors"
      >
        <span>✨</span>
        <span>AI Triage Assistant</span>
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h4 className="font-medium text-text-primary">AI Triage Assistant</h4>
        </div>
        <button
          type="button"
          onClick={() => setShowPanel(false)}
          className="text-text-muted hover:text-text-primary text-sm"
        >
          Close
        </button>
      </div>

      {!triageResult && !triageMutation.isPending && (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            AI will analyze the ticket content and suggest category, priority, and routing.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={runTriage}
            disabled={!title.trim() && !description.trim()}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            Analyze Ticket
          </Button>
        </div>
      )}

      {triageMutation.isPending && (
        <div className="flex items-center gap-2 text-text-secondary">
          <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
          <span className="text-sm">Analyzing ticket...</span>
        </div>
      )}

      {triageResult && (
        <div className="space-y-4">
          {/* Confidence indicator */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">AI Confidence</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                  style={{ width: `${triageResult.confidence}%` }}
                />
              </div>
              <span className="text-xs text-text-secondary">{triageResult.confidence}%</span>
            </div>
          </div>

          {/* Suggestions Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg-card border border-border rounded-lg p-3">
              <span className="text-xs text-text-muted block mb-1">Suggested Type</span>
              <div className="flex items-center gap-2">
                <span>{getTypeIcon(triageResult.suggested_type)}</span>
                <span className="font-medium text-text-primary capitalize">
                  {triageResult.suggested_type}
                </span>
              </div>
            </div>

            <div className="bg-bg-card border border-border rounded-lg p-3">
              <span className="text-xs text-text-muted block mb-1">Suggested Priority</span>
              <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(triageResult.suggested_priority)}`}>
                {triageResult.suggested_priority.toUpperCase()}
              </span>
            </div>

            <div className="bg-bg-card border border-border rounded-lg p-3">
              <span className="text-xs text-text-muted block mb-1">Category</span>
              <span className="font-medium text-text-primary">{triageResult.category}</span>
            </div>

            <div className="bg-bg-card border border-border rounded-lg p-3">
              <span className="text-xs text-text-muted block mb-1">Est. Resolution</span>
              <span className="font-medium text-text-primary">{triageResult.estimated_resolution_time}</span>
            </div>
          </div>

          {/* Urgency Score */}
          <div className="bg-bg-card border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted">Urgency Score</span>
              <span className="text-sm font-medium text-text-primary">{triageResult.urgency_score}/10</span>
            </div>
            <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  triageResult.urgency_score >= 8 ? "bg-red-500" :
                  triageResult.urgency_score >= 5 ? "bg-yellow-500" :
                  "bg-green-500"
                }`}
                style={{ width: `${triageResult.urgency_score * 10}%` }}
              />
            </div>
          </div>

          {/* Tags */}
          {triageResult.tags.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Suggested Tags</span>
              <div className="flex flex-wrap gap-2">
                {triageResult.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-bg-tertiary text-text-secondary text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Auto-response suggestion */}
          {triageResult.auto_response_suggestion && (
            <div className="bg-bg-card border border-border rounded-lg p-3">
              <span className="text-xs text-text-muted block mb-2">Suggested Auto-Response</span>
              <p className="text-sm text-text-secondary italic">
                "{triageResult.auto_response_suggestion}"
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Apply Suggestions
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={runTriage}
            >
              Re-analyze
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
