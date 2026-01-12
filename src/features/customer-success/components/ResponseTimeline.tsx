/**
 * Response Timeline Component
 *
 * Customer response history featuring:
 * - Vertical timeline of responses
 * - Score badge, date, feedback snippet
 * - Sentiment color coding
 * - Link to full response
 * - Filtering and pagination
 */

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils.ts";

// Types
export type ResponseSentiment = "positive" | "neutral" | "negative";
export type SurveyResponseType = "nps" | "csat" | "ces" | "custom";

export interface TimelineResponse {
  id: number;
  surveyId?: number;
  surveyName: string;
  surveyType: SurveyResponseType;
  customerId: number;
  customerName: string;
  customerCompany?: string;
  score: number;
  feedback?: string;
  sentiment: ResponseSentiment;
  respondedAt: string;
  isRead?: boolean;
  tags?: string[];
}

interface ResponseTimelineProps {
  responses?: TimelineResponse[];
  customerId?: number; // Filter by specific customer
  onViewResponse?: (response: TimelineResponse) => void;
  onViewCustomer?: (response: TimelineResponse) => void;
  maxItems?: number;
  showLoadMore?: boolean;
  onLoadMore?: () => void;
  isLoading?: boolean;
  className?: string;
}

// Sentiment configuration
const SENTIMENT_CONFIG: Record<
  ResponseSentiment,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  positive: {
    label: "Positive",
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success",
  },
  neutral: {
    label: "Neutral",
    color: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning",
  },
  negative: {
    label: "Negative",
    color: "text-danger",
    bgColor: "bg-danger/10",
    borderColor: "border-danger",
  },
};

// Score interpretation helper
function getScoreInfo(
  score: number,
  type: SurveyResponseType,
): { label: string; color: string } {
  if (type === "nps") {
    if (score >= 9)
      return { label: "Promoter", color: "text-success bg-success/10" };
    if (score >= 7)
      return { label: "Passive", color: "text-warning bg-warning/10" };
    return { label: "Detractor", color: "text-danger bg-danger/10" };
  }
  if (type === "csat") {
    if (score >= 4)
      return { label: "Satisfied", color: "text-success bg-success/10" };
    if (score >= 3)
      return { label: "Neutral", color: "text-warning bg-warning/10" };
    return { label: "Unsatisfied", color: "text-danger bg-danger/10" };
  }
  if (type === "ces") {
    if (score >= 5)
      return { label: "Easy", color: "text-success bg-success/10" };
    if (score >= 4)
      return { label: "Moderate", color: "text-warning bg-warning/10" };
    return { label: "Difficult", color: "text-danger bg-danger/10" };
  }
  return { label: "", color: "text-text-muted bg-bg-hover" };
}

// Format date relative to now
function formatRelativeDate(dateString: string): {
  date: string;
  time: string;
  relative: string;
} {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  let relative: string;
  if (diffMins < 1) relative = "Just now";
  else if (diffMins < 60) relative = `${diffMins}m ago`;
  else if (diffHours < 24) relative = `${diffHours}h ago`;
  else if (diffDays < 7) relative = `${diffDays}d ago`;
  else if (diffDays < 30) relative = `${Math.floor(diffDays / 7)}w ago`;
  else relative = `${Math.floor(diffDays / 30)}mo ago`;

  return {
    date: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    relative,
  };
}

// Survey type icons
function SurveyTypeIcon({ type }: { type: SurveyResponseType }) {
  const iconClass = "w-4 h-4";
  switch (type) {
    case "nps":
      return (
        <svg
          className={iconClass}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "csat":
      return (
        <svg
          className={iconClass}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      );
    case "ces":
      return (
        <svg
          className={iconClass}
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
      );
    default:
      return (
        <svg
          className={iconClass}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      );
  }
}

// Sample data generator
function generateSampleResponses(): TimelineResponse[] {
  const customers = [
    { name: "John Smith", company: "TechCorp Industries" },
    { name: "Sarah Johnson", company: "Digital Solutions" },
    { name: "Mike Williams", company: "Acme Manufacturing" },
    { name: "Emily Davis", company: "Global Services" },
    { name: "Robert Brown", company: "StartupXYZ" },
    { name: "Lisa Anderson", company: "Enterprise Co" },
  ];

  const feedbacks = {
    positive: [
      "Absolutely love the product! The new features have made our workflow so much smoother.",
      "Great customer support team. They resolved my issue within minutes!",
      "Best investment we made this year. Highly recommend to anyone.",
      "The platform keeps getting better. Appreciate the continuous improvements.",
    ],
    neutral: [
      "Good product overall, but there is room for improvement in the reporting area.",
      "Decent experience. Some features are great, others need work.",
      "It does what it needs to do. Nothing exceptional but reliable.",
    ],
    negative: [
      "Very frustrated with the support response times. Waited 3 days for a reply.",
      "The recent update broke several features we rely on daily.",
      "Missing promised features. Expected more for the price we pay.",
      "Had multiple billing issues this month. Very disappointing.",
    ],
  };

  const surveyTypes: SurveyResponseType[] = [
    "nps",
    "csat",
    "ces",
    "nps",
    "csat",
  ];
  const sentiments: ResponseSentiment[] = [
    "positive",
    "positive",
    "positive",
    "neutral",
    "neutral",
    "negative",
  ];

  return Array.from({ length: 15 }, (_, i) => {
    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    const surveyType =
      surveyTypes[Math.floor(Math.random() * surveyTypes.length)];
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const feedbackOptions = feedbacks[sentiment];

    let score: number;
    if (surveyType === "nps") {
      score =
        sentiment === "positive"
          ? 9 + Math.floor(Math.random() * 2)
          : sentiment === "neutral"
            ? 7 + Math.floor(Math.random() * 2)
            : Math.floor(Math.random() * 7);
    } else if (surveyType === "csat") {
      score =
        sentiment === "positive"
          ? 4 + Math.floor(Math.random() * 2)
          : sentiment === "neutral"
            ? 3
            : 1 + Math.floor(Math.random() * 2);
    } else {
      score =
        sentiment === "positive"
          ? 5 + Math.floor(Math.random() * 3)
          : sentiment === "neutral"
            ? 4
            : 1 + Math.floor(Math.random() * 3);
    }

    const hoursAgo = Math.floor(Math.random() * 168); // Up to 7 days

    return {
      id: i + 1,
      surveyId: Math.floor(Math.random() * 5) + 1,
      surveyName:
        surveyType === "nps"
          ? "Q1 NPS Survey"
          : surveyType === "csat"
            ? "Post-Support CSAT"
            : surveyType === "ces"
              ? "Support CES"
              : "Product Survey",
      surveyType,
      customerId: 100 + i,
      customerName: customer.name,
      customerCompany: customer.company,
      score,
      feedback:
        feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)],
      sentiment,
      respondedAt: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
      isRead: Math.random() > 0.3,
      tags: Math.random() > 0.5 ? ["support", "feature-request"] : undefined,
    };
  }).sort(
    (a, b) =>
      new Date(b.respondedAt).getTime() - new Date(a.respondedAt).getTime(),
  );
}

// Timeline Item Component
function TimelineItem({
  response,
  onView,
  onViewCustomer,
  isLast,
}: {
  response: TimelineResponse;
  onView?: () => void;
  onViewCustomer?: () => void;
  isLast: boolean;
}) {
  const sentimentConfig = SENTIMENT_CONFIG[response.sentiment];
  const scoreInfo = getScoreInfo(response.score, response.surveyType);
  const dateInfo = formatRelativeDate(response.respondedAt);

  return (
    <div className="relative flex gap-4">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-border" />
      )}

      {/* Timeline Dot */}
      <div
        className={cn(
          "relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
          "border-2 bg-bg-card transition-colors",
          sentimentConfig.borderColor,
        )}
      >
        <span className={sentimentConfig.color}>
          <SurveyTypeIcon type={response.surveyType} />
        </span>
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex-1 pb-6 group",
          !response.isRead && "bg-primary/5 -mx-2 px-2 py-2 rounded-lg",
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onViewCustomer}
                className="font-medium text-text-primary hover:text-primary transition-colors"
              >
                {response.customerName}
              </button>
              {response.customerCompany && (
                <span className="text-sm text-text-muted">
                  at {response.customerCompany}
                </span>
              )}
              {!response.isRead && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary text-white rounded">
                  NEW
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {response.surveyName} - {dateInfo.relative}
            </p>
          </div>

          {/* Score Badge */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "px-2 py-1 text-xs font-medium rounded",
                scoreInfo.color,
              )}
            >
              {scoreInfo.label}
            </span>
            <span
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                sentimentConfig.bgColor,
                sentimentConfig.color,
              )}
            >
              {response.score}
            </span>
          </div>
        </div>

        {/* Feedback */}
        {response.feedback && (
          <div
            className={cn(
              "bg-bg-hover rounded-lg p-3 mb-2 border-l-2",
              sentimentConfig.borderColor,
            )}
          >
            <p className="text-sm text-text-secondary line-clamp-2">
              "{response.feedback}"
            </p>
          </div>
        )}

        {/* Tags */}
        {response.tags && response.tags.length > 0 && (
          <div className="flex items-center gap-1 mb-2">
            {response.tags.map((tag, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-[10px] bg-bg-hover text-text-muted rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onView}
            className="px-3 py-1 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            View Full Response
          </button>
          <span className="text-xs text-text-muted">
            {dateInfo.date} at {dateInfo.time}
          </span>
        </div>
      </div>
    </div>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-bg-hover" />
          <div className="flex-1">
            <div className="h-4 w-48 bg-bg-hover rounded mb-2" />
            <div className="h-3 w-32 bg-bg-hover rounded mb-3" />
            <div className="h-16 bg-bg-hover rounded mb-2" />
            <div className="h-3 w-24 bg-bg-hover rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ResponseTimeline({
  responses: propResponses,
  customerId,
  onViewResponse,
  onViewCustomer,
  maxItems = 10,
  showLoadMore = true,
  onLoadMore,
  isLoading = false,
  className,
}: ResponseTimelineProps) {
  const [filter, setFilter] = useState<ResponseSentiment | "all">("all");
  const [displayCount, setDisplayCount] = useState(maxItems);

  // Use provided responses or generate sample
  const allResponses = useMemo(() => {
    const responses = propResponses || generateSampleResponses();
    if (customerId) {
      return responses.filter((r) => r.customerId === customerId);
    }
    return responses;
  }, [propResponses, customerId]);

  // Filter responses
  const filteredResponses = useMemo(() => {
    if (filter === "all") return allResponses;
    return allResponses.filter((r) => r.sentiment === filter);
  }, [allResponses, filter]);

  // Displayed responses
  const displayedResponses = useMemo(() => {
    return filteredResponses.slice(0, displayCount);
  }, [filteredResponses, displayCount]);

  // Count by sentiment
  const sentimentCounts = useMemo(() => {
    return allResponses.reduce(
      (acc, r) => {
        acc[r.sentiment]++;
        return acc;
      },
      { positive: 0, neutral: 0, negative: 0 },
    );
  }, [allResponses]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (onLoadMore) {
      onLoadMore();
    } else {
      setDisplayCount((prev) => prev + maxItems);
    }
  }, [onLoadMore, maxItems]);

  const hasMore = displayedResponses.length < filteredResponses.length;

  return (
    <div
      className={cn("bg-bg-card rounded-xl border border-border", className)}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Response Timeline
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {allResponses.length} total responses
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-full transition-colors",
              filter === "all"
                ? "bg-primary text-white"
                : "bg-bg-hover text-text-secondary hover:text-text-primary",
            )}
          >
            All ({allResponses.length})
          </button>
          <button
            onClick={() => setFilter("positive")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-full transition-colors",
              filter === "positive"
                ? "bg-success text-white"
                : "bg-success/10 text-success hover:bg-success/20",
            )}
          >
            Positive ({sentimentCounts.positive})
          </button>
          <button
            onClick={() => setFilter("neutral")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-full transition-colors",
              filter === "neutral"
                ? "bg-warning text-white"
                : "bg-warning/10 text-warning hover:bg-warning/20",
            )}
          >
            Neutral ({sentimentCounts.neutral})
          </button>
          <button
            onClick={() => setFilter("negative")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-full transition-colors",
              filter === "negative"
                ? "bg-danger text-white"
                : "bg-danger/10 text-danger hover:bg-danger/20",
            )}
          >
            Negative ({sentimentCounts.negative})
          </button>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="px-6 py-4 max-h-[600px] overflow-y-auto">
        {isLoading ? (
          <LoadingSkeleton />
        ) : displayedResponses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg
              className="w-12 h-12 text-text-muted mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-text-secondary font-medium">No responses yet</p>
            <p className="text-text-muted text-sm mt-1">
              {filter !== "all"
                ? "Try a different filter"
                : "Responses will appear here as they come in"}
            </p>
          </div>
        ) : (
          <div>
            {displayedResponses.map((response, index) => (
              <TimelineItem
                key={response.id}
                response={response}
                onView={() => onViewResponse?.(response)}
                onViewCustomer={() => onViewCustomer?.(response)}
                isLast={index === displayedResponses.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Load More */}
      {showLoadMore && hasMore && !isLoading && (
        <div className="px-6 py-3 border-t border-border">
          <button
            onClick={handleLoadMore}
            className="w-full py-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors flex items-center justify-center gap-2"
          >
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
                d="M19 9l-7 7-7-7"
              />
            </svg>
            Load More ({filteredResponses.length - displayedResponses.length}{" "}
            remaining)
          </button>
        </div>
      )}
    </div>
  );
}

export default ResponseTimeline;
