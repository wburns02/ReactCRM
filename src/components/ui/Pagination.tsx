import { type KeyboardEvent, useCallback } from "react";
import { cn } from "@/lib/utils";

/**
 * Props for the Pagination component
 */
export interface PaginationProps {
  /** Current active page (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Items per page (optional, for display purposes) */
  pageSize?: number;
  /** Total number of items (optional, for display purposes) */
  totalItems?: number;
  /** Page size options for selector */
  pageSizeOptions?: number[];
  /** Callback when page size changes */
  onPageSizeChange?: (pageSize: number) => void;
  /** Additional CSS class */
  className?: string;
  /** Number of page buttons to show around current page */
  siblingCount?: number;
  /** Show items per page selector */
  showPageSizeSelector?: boolean;
  /** Show total items summary */
  showItemsSummary?: boolean;
}

/**
 * Generate page numbers with ellipsis for large page counts
 */
function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  siblingCount: number,
): (number | "ellipsis-start" | "ellipsis-end")[] {
  // Always show first page, last page, current page, and siblings
  const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [];

  if (totalPages <= 1) {
    return [1];
  }

  // Calculate range around current page
  const leftSibling = Math.max(currentPage - siblingCount, 1);
  const rightSibling = Math.min(currentPage + siblingCount, totalPages);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  // Always include first page
  pages.push(1);

  // Left ellipsis
  if (showLeftEllipsis) {
    pages.push("ellipsis-start");
  } else if (leftSibling > 1) {
    // Fill in pages between 1 and leftSibling
    for (let i = 2; i < leftSibling; i++) {
      pages.push(i);
    }
  }

  // Pages around current
  for (let i = leftSibling; i <= rightSibling; i++) {
    if (i !== 1 && i !== totalPages) {
      pages.push(i);
    }
  }

  // Right ellipsis
  if (showRightEllipsis) {
    pages.push("ellipsis-end");
  } else if (rightSibling < totalPages) {
    // Fill in pages between rightSibling and totalPages
    for (let i = rightSibling + 1; i < totalPages; i++) {
      pages.push(i);
    }
  }

  // Always include last page (if more than 1 page)
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

/**
 * Chevron Left Icon
 */
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

/**
 * Chevron Right Icon
 */
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/**
 * Pagination component - accessible pagination with page numbers and navigation
 *
 * Features:
 * - Previous/Next buttons with disabled states
 * - Page numbers with ellipsis for large page counts
 * - Optional items per page selector
 * - Optional items summary display
 * - Full keyboard navigation (Arrow keys, Home, End)
 * - ARIA labels for screen readers
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  totalItems,
  pageSizeOptions = [10, 25, 50, 100],
  onPageSizeChange,
  className,
  siblingCount = 1,
  showPageSizeSelector = false,
  showItemsSummary = false,
}: PaginationProps) {
  const pages = generatePageNumbers(currentPage, totalPages, siblingCount);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          if (canGoPrevious) {
            onPageChange(currentPage - 1);
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (canGoNext) {
            onPageChange(currentPage + 1);
          }
          break;
        case "Home":
          e.preventDefault();
          if (currentPage !== 1) {
            onPageChange(1);
          }
          break;
        case "End":
          e.preventDefault();
          if (currentPage !== totalPages) {
            onPageChange(totalPages);
          }
          break;
      }
    },
    [currentPage, totalPages, canGoPrevious, canGoNext, onPageChange],
  );

  // Calculate item range for summary
  const getItemRange = () => {
    if (!pageSize || !totalItems) return null;
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalItems);
    return { start, end };
  };

  const itemRange = getItemRange();

  if (totalPages <= 0) {
    return null;
  }

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn(
        "flex flex-wrap items-center justify-between gap-4",
        className,
      )}
    >
      {/* Items summary */}
      {showItemsSummary && itemRange && totalItems && (
        <div className="text-sm text-text-secondary">
          Showing{" "}
          <span className="font-medium text-text-primary">
            {itemRange.start}
          </span>
          {" - "}
          <span className="font-medium text-text-primary">{itemRange.end}</span>
          {" of "}
          <span className="font-medium text-text-primary">{totalItems}</span>
          {" items"}
        </div>
      )}

      {/* Page navigation */}
      <div
        className="flex items-center gap-1"
        onKeyDown={handleKeyDown}
        role="group"
        aria-label="Page navigation"
      >
        {/* Previous button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          aria-label="Go to previous page"
          className={cn(
            "inline-flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            "bg-bg-card text-text-primary border border-border hover:bg-bg-hover",
          )}
        >
          <ChevronLeftIcon />
          <span className="sr-only sm:not-sr-only sm:ml-1">Previous</span>
        </button>

        {/* Page numbers */}
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="Page numbers"
        >
          {pages.map((page) => {
            if (page === "ellipsis-start" || page === "ellipsis-end") {
              return (
                <span
                  key={page}
                  className="px-3 py-2 text-sm text-text-muted select-none"
                  aria-hidden="true"
                >
                  ...
                </span>
              );
            }

            const isCurrentPage = page === currentPage;

            return (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                aria-label={`Page ${page}`}
                aria-current={isCurrentPage ? "page" : undefined}
                className={cn(
                  "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors min-w-[40px]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  isCurrentPage
                    ? "bg-cta text-white"
                    : "bg-bg-card text-text-primary border border-border hover:bg-bg-hover",
                )}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          aria-label="Go to next page"
          className={cn(
            "inline-flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            "bg-bg-card text-text-primary border border-border hover:bg-bg-hover",
          )}
        >
          <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
          <ChevronRightIcon />
        </button>
      </div>

      {/* Page size selector */}
      {showPageSizeSelector && onPageSizeChange && pageSize && (
        <div className="flex items-center gap-2">
          <label
            htmlFor="page-size-select"
            className="text-sm text-text-secondary whitespace-nowrap"
          >
            Items per page:
          </label>
          <select
            id="page-size-select"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className={cn(
              "rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-text-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              "hover:bg-bg-hover transition-colors cursor-pointer",
            )}
            aria-label="Items per page"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}
    </nav>
  );
}
