/**
 * RecentCallsTable Component
 * Data table showing recent calls with AI analysis results
 */

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  PhoneIncoming,
  PhoneOutgoing,
  Play,
  Eye,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn, formatDate, formatPhone } from "@/lib/utils";
import type { CallWithAnalysis, SentimentLevel, DispositionCategory } from "../types";

// ============================================================================
// Types
// ============================================================================

interface RecentCallsTableProps {
  calls: CallWithAnalysis[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onCallClick: (callId: string) => void;
}

type SortField = "start_time" | "duration_seconds" | "sentiment_score" | "quality_score";
type SortDirection = "asc" | "desc";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format duration in seconds to mm:ss
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format timestamp to time display
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Get sentiment badge variant and label
 */
function getSentimentBadge(sentiment: SentimentLevel, score: number): { variant: "success" | "warning" | "danger" | "info"; label: string } {
  switch (sentiment) {
    case "positive":
      return { variant: "success", label: `Positive (${score > 0 ? "+" : ""}${score})` };
    case "negative":
      return { variant: "danger", label: `Negative (${score})` };
    case "mixed":
      return { variant: "warning", label: `Mixed (${score > 0 ? "+" : ""}${score})` };
    case "neutral":
    default:
      return { variant: "info", label: `Neutral (${score})` };
  }
}

/**
 * Get disposition badge variant
 */
function getDispositionVariant(category?: DispositionCategory): "success" | "warning" | "danger" | "default" {
  switch (category) {
    case "positive":
      return "success";
    case "negative":
      return "danger";
    case "neutral":
      return "warning";
    default:
      return "default";
  }
}

/**
 * Get quality score color class
 */
function getQualityColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-danger";
}

/**
 * Get quality progress bar color class
 */
function getQualityBarColor(score: number): string {
  if (score >= 80) return "bg-success";
  if (score >= 60) return "bg-warning";
  return "bg-danger";
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Sortable column header
 */
function SortableHeader({
  label,
  field,
  currentSort,
  currentDirection,
  onSort,
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentSort === field;

  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 hover:text-text-primary transition-colors"
    >
      {label}
      <span className="flex flex-col">
        <ChevronUp
          className={cn(
            "h-3 w-3 -mb-1",
            isActive && currentDirection === "asc"
              ? "text-primary"
              : "text-text-muted"
          )}
        />
        <ChevronDown
          className={cn(
            "h-3 w-3 -mt-1",
            isActive && currentDirection === "desc"
              ? "text-primary"
              : "text-text-muted"
          )}
        />
      </span>
    </button>
  );
}

/**
 * Loading skeleton row
 */
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="h-4 bg-bg-muted rounded w-16" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-5 bg-bg-muted rounded-full mx-auto" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-bg-muted rounded w-28" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-bg-muted rounded w-12" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 bg-bg-muted rounded-full w-24" />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-4 bg-bg-muted rounded w-8" />
          <div className="h-2 bg-bg-muted rounded w-16" />
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="h-5 bg-bg-muted rounded-full w-20" />
      </td>
      <td className="px-4 py-3">
        <div className="h-8 bg-bg-muted rounded w-8" />
      </td>
    </tr>
  );
}

/**
 * Quality score with mini progress bar
 */
function QualityIndicator({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("font-medium text-sm", getQualityColor(score))}>
        {score}
      </span>
      <div className="w-16 h-1.5 bg-bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", getQualityBarColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Pagination controls
 */
function Pagination({
  page,
  totalPages,
  onPageChange,
  isLoading,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}) {
  // Generate page numbers to show
  const getPageNumbers = (): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (page > 3) {
        pages.push("ellipsis");
      }

      // Show pages around current page
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push("ellipsis");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <div className="text-sm text-text-secondary">
        Page {page} of {totalPages}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {getPageNumbers().map((pageNum, idx) =>
          pageNum === "ellipsis" ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-text-muted">
              ...
            </span>
          ) : (
            <Button
              key={pageNum}
              variant={pageNum === page ? "primary" : "ghost"}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              {pageNum}
            </Button>
          )
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isLoading}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function RecentCallsTable({
  calls,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onCallClick,
}: RecentCallsTableProps) {
  const [sortField, setSortField] = useState<SortField>("start_time");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const totalPages = Math.ceil(total / pageSize);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Toggle direction
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New field, default to descending
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Sort calls locally (in a real app, this would be done server-side)
  const sortedCalls = [...calls].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case "start_time":
        comparison = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        break;
      case "duration_seconds":
        comparison = a.duration_seconds - b.duration_seconds;
        break;
      case "sentiment_score":
        comparison = a.sentiment_score - b.sentiment_score;
        break;
      case "quality_score":
        comparison = a.quality_score - b.quality_score;
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b-0 pb-0 mb-0">
        <div className="flex items-center justify-between">
          <CardTitle>Recent Calls</CardTitle>
          <span className="text-sm text-text-secondary">
            {total.toLocaleString()} total calls
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  <SortableHeader
                    label="Time"
                    field="start_time"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Dir
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  From/To
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  <SortableHeader
                    label="Duration"
                    field="duration_seconds"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  <SortableHeader
                    label="Sentiment"
                    field="sentiment_score"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  <SortableHeader
                    label="Quality"
                    field="quality_score"
                    currentSort={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Disposition
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                // Loading skeleton - 10 rows
                Array.from({ length: 10 }).map((_, idx) => (
                  <SkeletonRow key={idx} />
                ))
              ) : sortedCalls.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-text-secondary">
                    No calls found
                  </td>
                </tr>
              ) : (
                // Data rows
                sortedCalls.map((call) => {
                  const sentimentBadge = getSentimentBadge(call.sentiment, call.sentiment_score);
                  const phoneNumber = call.direction === "inbound" ? call.from_number : call.to_number;

                  return (
                    <tr
                      key={call.id}
                      onClick={() => onCallClick(call.id)}
                      className="hover:bg-bg-hover cursor-pointer transition-colors"
                    >
                      {/* Time */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-text-primary">
                            {formatTime(call.start_time)}
                          </span>
                          <span className="text-xs text-text-secondary">
                            {formatDate(call.start_time)}
                          </span>
                        </div>
                      </td>

                      {/* Direction */}
                      <td className="px-4 py-3 text-center">
                        {call.direction === "inbound" ? (
                          <PhoneIncoming className="h-5 w-5 text-success mx-auto" />
                        ) : (
                          <PhoneOutgoing className="h-5 w-5 text-info mx-auto" />
                        )}
                      </td>

                      {/* From/To */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm text-text-primary">
                            {formatPhone(phoneNumber)}
                          </span>
                          {call.customer_name && (
                            <span className="text-xs text-text-secondary">
                              {call.customer_name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-text-primary">
                            {formatDuration(call.duration_seconds)}
                          </span>
                          {call.recording_url && (
                            <Play className="h-3.5 w-3.5 text-text-muted" />
                          )}
                        </div>
                      </td>

                      {/* Sentiment */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={sentimentBadge.variant} size="sm">
                          {sentimentBadge.label}
                        </Badge>
                      </td>

                      {/* Quality */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <QualityIndicator score={call.quality_score} />
                      </td>

                      {/* Disposition */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {call.disposition ? (
                          <Badge
                            variant={getDispositionVariant(call.disposition_category)}
                            size="sm"
                          >
                            {call.disposition}
                          </Badge>
                        ) : (
                          <span className="text-xs text-text-muted">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCallClick(call.id);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            isLoading={isLoading}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default RecentCallsTable;
