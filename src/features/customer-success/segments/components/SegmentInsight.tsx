/**
 * SegmentInsight Component
 *
 * AI insight card for segment suggestions and analysis.
 */

import { cn } from "@/lib/utils.ts";
import type { SegmentSuggestion } from "@/hooks/useSegments.ts";

interface SegmentInsightProps {
  suggestion: SegmentSuggestion;
  onApply?: (suggestion: SegmentSuggestion) => void;
  onDismiss?: (suggestion: SegmentSuggestion) => void;
  className?: string;
}

const PRIORITY_CONFIG = {
  high: {
    label: "High Priority",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
  },
  medium: {
    label: "Medium Priority",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  low: {
    label: "Low Priority",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    ),
  },
};

const CATEGORY_CONFIG = {
  retention: {
    label: "Retention",
    className: "text-green-600 dark:text-green-400",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
  growth: {
    label: "Growth",
    className: "text-blue-600 dark:text-blue-400",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    ),
  },
  engagement: {
    label: "Engagement",
    className: "text-purple-600 dark:text-purple-400",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
  risk: {
    label: "Risk",
    className: "text-red-600 dark:text-red-400",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
  },
};

export function SegmentInsight({
  suggestion,
  onApply,
  onDismiss,
  className,
}: SegmentInsightProps) {
  const priorityConfig = PRIORITY_CONFIG[suggestion.priority];
  const categoryConfig = CATEGORY_CONFIG[suggestion.category];

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden",
        className,
      )}
    >
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-cyan-500/10 p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-primary">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                AI Suggestion
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {suggestion.name}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full",
                priorityConfig.className,
              )}
            >
              {priorityConfig.icon}
              {priorityConfig.label}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          {suggestion.description}
        </p>

        {/* Insight */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <span className={categoryConfig.className}>
              {categoryConfig.icon}
            </span>
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {categoryConfig.label} Insight
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-200">
                {suggestion.insight}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              ~{suggestion.estimated_count.toLocaleString()} customers
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onApply && (
            <button
              onClick={() => onApply(suggestion)}
              className="flex-1 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
            >
              Create Segment
            </button>
          )}
          {onDismiss && (
            <button
              onClick={() => onDismiss(suggestion)}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact insight card for inline display
 */
export function SegmentInsightCompact({
  suggestion,
  onApply,
  className,
}: {
  suggestion: SegmentSuggestion;
  onApply?: (suggestion: SegmentSuggestion) => void;
  className?: string;
}) {
  const categoryConfig = CATEGORY_CONFIG[suggestion.category];

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-lg border border-primary/20 cursor-pointer hover:border-primary/40 transition-colors",
        className,
      )}
      onClick={() => onApply?.(suggestion)}
    >
      <div
        className={cn(
          "p-2 rounded-lg bg-white dark:bg-gray-800",
          categoryConfig.className,
        )}
      >
        {categoryConfig.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
          {suggestion.name}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          ~{suggestion.estimated_count} customers
        </div>
      </div>

      <svg
        className="w-5 h-5 text-primary"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
    </div>
  );
}

/**
 * AI Suggestions Panel
 */
export function AISuggestionsPanel({
  suggestions,
  onApply,
  onDismiss,
  className,
}: {
  suggestions: SegmentSuggestion[];
  onApply?: (suggestion: SegmentSuggestion) => void;
  onDismiss?: (suggestion: SegmentSuggestion) => void;
  className?: string;
}) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <span className="text-primary">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </span>
        <h3 className="font-semibold text-gray-900 dark:text-white">
          AI Suggestions
        </h3>
        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
          {suggestions.length}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {suggestions.map((suggestion) => (
          <SegmentInsight
            key={suggestion.id}
            suggestion={suggestion}
            onApply={onApply}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>
  );
}
