/**
 * ContentDetail Component
 *
 * Shows generated content when the Content Made metric card is clicked.
 * - Cards showing generated content
 * - Title, content type (blog/FAQ/GBP post)
 * - Published status badge
 * - Preview/expand full content
 */

import { useState, useMemo } from "react";
import { useContentDetails } from "@/api/hooks/useMarketingDetails";
import { CardSkeleton } from "./DetailDrawer";

interface ContentDetailProps {
  isEnabled: boolean;
}

const CONTENT_TYPE_CONFIG: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  blog: { label: "Blog Post", icon: "📝", color: "bg-blue-50 text-blue-600" },
  faq: { label: "FAQ", icon: "❓", color: "bg-purple-50 text-purple-600" },
  service_description: {
    label: "Service",
    icon: "🔧",
    color: "bg-green-50 text-green-600",
  },
  gbp_post: {
    label: "GBP Post",
    icon: "📍",
    color: "bg-orange-50 text-orange-600",
  },
};

export function ContentDetail({ isEnabled }: ContentDetailProps) {
  const { data, isLoading, error } = useContentDetails(isEnabled);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const content = data?.content || [];

  // Get unique content types for filter
  const contentTypes = useMemo(() => {
    const types = new Set(content.map((c) => c.contentType));
    return Array.from(types);
  }, [content]);

  // Filter content
  const filteredContent = useMemo(() => {
    if (filter === "all") return content;
    return content.filter((c) => c.contentType === filter);
  }, [content, filter]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getTypeConfig = (type: string) => {
    return (
      CONTENT_TYPE_CONFIG[type] || {
        label: type,
        icon: "📄",
        color: "bg-gray-50 text-gray-600",
      }
    );
  };

  if (isLoading) {
    return <CardSkeleton count={4} />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-4xl mb-2">⚠️</div>
        <p className="text-gray-600">Failed to load content data</p>
        <p className="text-sm text-gray-400 mt-1">Please try again later</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      <div className="flex flex-wrap gap-2">
        <div className="bg-gray-50 px-3 py-2 rounded-lg text-sm">
          <span className="text-gray-500">Total:</span>{" "}
          <span className="font-semibold">{content.length}</span>
        </div>
        <div className="bg-green-50 px-3 py-2 rounded-lg text-sm">
          <span className="text-green-600">Published:</span>{" "}
          <span className="font-semibold">
            {content.filter((c) => c.published).length}
          </span>
        </div>
        <div className="bg-yellow-50 px-3 py-2 rounded-lg text-sm">
          <span className="text-yellow-600">Draft:</span>{" "}
          <span className="font-semibold">
            {content.filter((c) => !c.published).length}
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-brand-primary text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {contentTypes.map((type) => {
          const config = getTypeConfig(type);
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === type
                  ? "bg-brand-primary text-white"
                  : `${config.color} hover:opacity-80`
              }`}
            >
              {config.icon} {config.label}
            </button>
          );
        })}
      </div>

      {/* Content cards */}
      <div className="space-y-3">
        {filteredContent.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No content generated yet
          </div>
        ) : (
          filteredContent.map((item) => {
            const typeConfig = getTypeConfig(item.contentType);
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{typeConfig.icon}</span>
                    <div>
                      <h4 className="font-medium text-gray-900">{item.title}</h4>
                      {item.topic && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Topic: {item.topic}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.color}`}
                    >
                      {typeConfig.label}
                    </span>
                    {item.published ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Published
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Draft
                      </span>
                    )}
                  </div>
                </div>

                {/* Preview / Full content */}
                <div className="text-sm text-gray-600 mb-3">
                  {isExpanded ? (
                    <p className="whitespace-pre-wrap">{item.content}</p>
                  ) : (
                    <p className="line-clamp-2">{item.content}</p>
                  )}
                </div>

                {/* Keywords */}
                {item.keywordsUsed && item.keywordsUsed.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.keywordsUsed.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Created {formatDate(item.createdAt)}</span>
                  <div className="flex items-center gap-2">
                    {item.publishedUrl && (
                      <a
                        href={item.publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-primary hover:underline"
                      >
                        View live ↗️
                      </a>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="text-brand-primary hover:underline"
                    >
                      {isExpanded ? "Show less" : "Read more"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-400 text-center pt-2">
        AI-generated content powered by Mistral-7B
      </p>
    </div>
  );
}
