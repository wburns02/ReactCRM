/**
 * CoachingInsightsPanel - Coaching recommendations panel for Call Intelligence Dashboard
 * Displays strengths, improvement areas, trending topics, and training recommendations
 */

import { memo } from "react";
import { Lightbulb, TrendingUp, BookOpen } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import type {
  CoachingInsights,
  CoachingItem,
  TopicItem,
  TrainingRecommendation,
} from "../types.ts";

interface CoachingInsightsPanelProps {
  insights: CoachingInsights | undefined;
  isLoading: boolean;
  onTopicClick?: (topic: string) => void;
}

/**
 * Get sentiment emoji for a topic
 */
function getSentimentEmoji(sentiment: TopicItem["sentiment"]): string {
  switch (sentiment) {
    case "positive":
      return "😊";
    case "negative":
      return "😟";
    case "mixed":
      return "😐";
    case "neutral":
    default:
      return "🔵";
  }
}

/**
 * Get sentiment color class for a topic
 */
function getSentimentColorClass(sentiment: TopicItem["sentiment"]): string {
  switch (sentiment) {
    case "positive":
      return "text-green-600";
    case "negative":
      return "text-red-600";
    case "mixed":
      return "text-yellow-600";
    case "neutral":
    default:
      return "text-blue-600";
  }
}

/**
 * Get priority badge variant and color
 */
function getPriorityConfig(priority: TrainingRecommendation["priority"]): {
  variant: "danger" | "warning" | "default";
  label: string;
} {
  switch (priority) {
    case "high":
      return { variant: "danger", label: "High" };
    case "medium":
      return { variant: "warning", label: "Medium" };
    case "low":
    default:
      return { variant: "default", label: "Low" };
  }
}

/**
 * Strength Badge Component
 */
const StrengthBadge = memo(function StrengthBadge({
  item,
}: {
  item: CoachingItem;
}) {
  return (
    <Badge
      variant="success"
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
    >
      <span className="font-medium">{item.name}</span>
      <span className="bg-green-700 text-white px-1.5 py-0.5 rounded-full text-xs font-bold ml-1">
        {item.count}
      </span>
    </Badge>
  );
});

/**
 * Improvement Badge Component
 */
const ImprovementBadge = memo(function ImprovementBadge({
  item,
}: {
  item: CoachingItem;
}) {
  return (
    <Badge
      variant="warning"
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
    >
      <span className="font-medium">{item.name}</span>
      <span className="bg-amber-700 text-white px-1.5 py-0.5 rounded-full text-xs font-bold ml-1">
        {item.count}
      </span>
    </Badge>
  );
});

/**
 * Topic Item Component
 */
const TopicListItem = memo(function TopicListItem({
  topic,
  onClick,
}: {
  topic: TopicItem;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between p-3 rounded-lg",
        "bg-bg-muted/50 hover:bg-bg-muted transition-colors",
        "cursor-pointer text-left group",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg" role="img" aria-label={topic.sentiment}>
          {getSentimentEmoji(topic.sentiment)}
        </span>
        <span className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
          {topic.topic}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-xs font-medium",
            getSentimentColorClass(topic.sentiment),
          )}
        >
          {topic.count} calls
        </span>
      </div>
    </button>
  );
});

/**
 * Training Card Component
 */
const TrainingCard = memo(function TrainingCard({
  recommendation,
}: {
  recommendation: TrainingRecommendation;
}) {
  const priorityConfig = getPriorityConfig(recommendation.priority);

  return (
    <div
      className={cn(
        "p-4 rounded-lg border border-border",
        "bg-bg-card hover:shadow-md transition-shadow",
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="text-sm font-semibold text-text-primary flex-1">
          {recommendation.module}
        </h4>
        <Badge variant={priorityConfig.variant} size="sm">
          {priorityConfig.label}
        </Badge>
      </div>
      <p className="text-xs text-text-secondary">
        {recommendation.agents_affected} agent
        {recommendation.agents_affected !== 1 ? "s" : ""} affected
      </p>
    </div>
  );
});

/**
 * Loading Skeleton for the panel
 */
function CoachingInsightsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" className="h-6 w-6" />
          <Skeleton variant="text" className="h-6 w-40" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Strengths Section Skeleton */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Skeleton variant="circular" className="h-5 w-5" />
            <Skeleton variant="text" className="h-4 w-28" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" className="h-8 w-24" />
            ))}
          </div>
        </div>

        {/* Improvements Section Skeleton */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Skeleton variant="circular" className="h-5 w-5" />
            <Skeleton variant="text" className="h-4 w-32" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" className="h-8 w-28" />
            ))}
          </div>
        </div>

        {/* Topics Section Skeleton */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Skeleton variant="circular" className="h-5 w-5" />
            <Skeleton variant="text" className="h-4 w-32" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" className="h-12 w-full" />
            ))}
          </div>
        </div>

        {/* Training Section Skeleton */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Skeleton variant="circular" className="h-5 w-5" />
            <Skeleton variant="text" className="h-4 w-44" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" className="h-20 w-full" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Empty State Component
 */
function EmptyState() {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center text-text-muted">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No coaching insights available</p>
          <p className="text-xs mt-1">
            Insights will appear once calls are analyzed
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main Coaching Insights Panel Component
 */
export const CoachingInsightsPanel = memo(function CoachingInsightsPanel({
  insights,
  isLoading,
  onTopicClick,
}: CoachingInsightsPanelProps) {
  // Loading state
  if (isLoading) {
    return <CoachingInsightsSkeleton />;
  }

  // Empty state
  if (!insights) {
    return <EmptyState />;
  }

  const {
    top_strengths,
    top_improvements,
    trending_topics,
    recommended_training,
  } = insights;

  // Sort training recommendations by priority
  const sortedTraining = [...recommended_training].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <Card data-testid="coaching-insights-panel">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text-primary">
            Coaching Insights
          </h2>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top Strengths Section */}
        {top_strengths.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-green-500 text-lg">&#10003;</span>
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
                Top Strengths
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {top_strengths.map((item) => (
                <StrengthBadge key={item.name} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Improvement Areas Section */}
        {top_improvements.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-amber-500 text-lg">&#9888;</span>
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
                Improvement Areas
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {top_improvements.map((item) => (
                <ImprovementBadge key={item.name} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Trending Topics Section */}
        {trending_topics.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
                Trending Topics
              </h3>
            </div>
            <div className="space-y-2">
              {trending_topics.map((topic) => (
                <TopicListItem
                  key={topic.topic}
                  topic={topic}
                  onClick={() => onTopicClick?.(topic.topic)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Training Recommendations Section */}
        {sortedTraining.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-purple-500" />
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
                Training Recommendations
              </h3>
            </div>
            <div className="space-y-3">
              {sortedTraining.map((recommendation) => (
                <TrainingCard
                  key={recommendation.module}
                  recommendation={recommendation}
                />
              ))}
            </div>
          </section>
        )}

        {/* No data fallback */}
        {top_strengths.length === 0 &&
          top_improvements.length === 0 &&
          trending_topics.length === 0 &&
          sortedTraining.length === 0 && (
            <div className="text-center py-8 text-text-muted">
              <p className="text-sm">No coaching data available yet</p>
            </div>
          )}
      </CardContent>
    </Card>
  );
});

export default CoachingInsightsPanel;
