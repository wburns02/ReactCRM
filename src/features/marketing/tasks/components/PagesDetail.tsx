/**
 * PagesDetail Component
 *
 * Shows indexed pages when the Pages Found metric card is clicked.
 * - List of URLs with indexation status
 * - Icons: Indexed, Not Indexed, Error
 * - Last crawled date
 * - Click to open URL in new tab
 */

import { useState, useMemo } from "react";
import { usePageDetails } from "@/api/hooks/useMarketingDetails";
import type { PageDetail } from "@/api/types/marketingDetails";
import { DetailSkeleton } from "./DetailDrawer";

interface PagesDetailProps {
  isEnabled: boolean;
}

export function PagesDetail({ isEnabled }: PagesDetailProps) {
  const { data, isLoading, error } = usePageDetails(isEnabled);
  const [filter, setFilter] = useState<"all" | "indexed" | "not-indexed">("all");
  const [search, setSearch] = useState("");

  const pages = data?.pages || [];

  // Filter pages
  const filteredPages = useMemo(() => {
    let result = [...pages];

    // Apply status filter
    if (filter === "indexed") {
      result = result.filter((p) => p.indexed);
    } else if (filter === "not-indexed") {
      result = result.filter((p) => !p.indexed);
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((p) => p.url.toLowerCase().includes(searchLower));
    }

    return result;
  }, [pages, filter, search]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusIcon = (page: PageDetail) => {
    if (page.indexed) {
      return { icon: "✅", label: "Indexed", color: "text-green-600" };
    }
    if (page.statusCode && page.statusCode >= 400) {
      return { icon: "❌", label: `Error ${page.statusCode}`, color: "text-red-600" };
    }
    return { icon: "⚠️", label: "Not Indexed", color: "text-yellow-600" };
  };

  const extractPath = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname || "/";
    } catch {
      return url;
    }
  };

  if (isLoading) {
    return <DetailSkeleton rows={8} />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-4xl mb-2">⚠️</div>
        <p className="text-gray-600">Failed to load page data</p>
        <p className="text-sm text-gray-400 mt-1">Please try again later</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search URLs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          🔍
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-brand-primary text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All ({pages.length})
        </button>
        <button
          onClick={() => setFilter("indexed")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === "indexed"
              ? "bg-green-500 text-white"
              : "bg-green-50 text-green-600 hover:bg-green-100"
          }`}
        >
          ✅ Indexed ({data?.indexed || 0})
        </button>
        <button
          onClick={() => setFilter("not-indexed")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === "not-indexed"
              ? "bg-yellow-500 text-white"
              : "bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
          }`}
        >
          ⚠️ Not Indexed ({data?.notIndexed || 0})
        </button>
      </div>

      {/* Page list */}
      <div className="space-y-2">
        {filteredPages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {search ? "No pages match your search" : "No pages tracked yet"}
          </div>
        ) : (
          filteredPages.map((page) => {
            const status = getStatusIcon(page);
            return (
              <div
                key={page.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
              >
                <span className="text-xl" title={status.label}>
                  {status.icon}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-gray-900 truncate">
                      {extractPath(page.url)}
                    </span>
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-primary"
                      title="Open in new tab"
                    >
                      ↗️
                    </a>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Last crawled: {formatDate(page.lastCrawled)}
                  </div>
                </div>

                <div className={`text-xs font-medium ${status.color}`}>
                  {status.label}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-400 text-center pt-2">
        {data?.indexed || 0} of {data?.total || 0} pages indexed by Google
      </p>
    </div>
  );
}
