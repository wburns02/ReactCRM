import { useState } from "react";
import {
  useAutoTagSuggestions,
  useApplyTags,
} from "@/api/hooks/useAutoTaggingAI";
import { Button } from "@/components/ui/Button";

interface AutoTaggingWidgetProps {
  entityType: "customer" | "work_order" | "note";
  entityId: string;
  content?: string;
  onTagsApplied?: (tags: string[]) => void;
}

/**
 * AI-powered auto-tagging widget
 * Suggests and applies tags based on entity content
 */
export function AutoTaggingWidget({ entityType, entityId, content, onTagsApplied }: AutoTaggingWidgetProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const { data: suggestions, isLoading } = useAutoTagSuggestions({
    entity_type: entityType,
    entity_id: entityId,
    content,
  });

  const applyTags = useApplyTags();

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  };

  const handleApplyTags = async () => {
    const tags = Array.from(selectedTags);
    const result = await applyTags.mutateAsync({
      entity_type: entityType,
      entity_id: entityId,
      tags,
    });
    if (result.success && onTagsApplied) {
      onTagsApplied(result.applied_tags);
    }
    setShowSuggestions(false);
    setSelectedTags(new Set());
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "priority": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "customer": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "service": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "location": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "equipment": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  if (!showSuggestions) {
    return (
      <button
        onClick={() => setShowSuggestions(true)}
        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
      >
        <span>&#10024;</span>
        <span>AI Tag Suggestions</span>
      </button>
    );
  }

  return (
    <div className="bg-bg-card border border-purple-500/30 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-purple-400 font-medium">AI Tag Suggestions</span>
        <button
          onClick={() => setShowSuggestions(false)}
          className="text-text-muted hover:text-text-primary text-xs"
        >
          &#10005;
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-2">
          <div className="animate-spin h-3 w-3 border-2 border-purple-500 border-t-transparent rounded-full" />
          <span className="text-xs text-text-muted">Analyzing...</span>
        </div>
      ) : suggestions && suggestions.length > 0 ? (
        <>
          <div className="space-y-2 mb-3">
            {suggestions.map((suggestion, i) => (
              <div
                key={i}
                onClick={() => handleToggleTag(suggestion.tag)}
                className={`p-2 rounded border cursor-pointer transition-all ${
                  selectedTags.has(suggestion.tag)
                    ? "bg-purple-500/20 border-purple-500"
                    : "border-border hover:border-purple-500/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${getCategoryColor(suggestion.category)}`}>
                    {suggestion.tag}
                  </span>
                  <span className="text-xs text-text-muted">
                    {Math.round(suggestion.confidence * 100)}%
                  </span>
                </div>
                <p className="text-xs text-text-secondary">{suggestion.reason}</p>
              </div>
            ))}
          </div>

          <Button
            size="sm"
            onClick={handleApplyTags}
            disabled={selectedTags.size === 0 || applyTags.isPending}
            className="w-full"
          >
            {applyTags.isPending ? "Applying..." : `Apply ${selectedTags.size} Tag${selectedTags.size !== 1 ? "s" : ""}`}
          </Button>
        </>
      ) : (
        <p className="text-xs text-text-muted py-2">No tag suggestions available.</p>
      )}
    </div>
  );
}
