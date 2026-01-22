import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { PermitSearchResponse, PermitSearchResult } from "@/api/types/permit";

interface PermitResultsProps {
  data: PermitSearchResponse | undefined;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

/**
 * Calculate which page numbers to show in pagination
 * Shows: 1 ... 4 5 6 ... 100 pattern
 */
function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  const pages: (number | "...")[] = [];

  if (totalPages <= 7) {
    // Show all pages if 7 or fewer
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    // Always show first page
    pages.push(1);

    // Show ellipsis if current page is far from start
    if (currentPage > 3) {
      pages.push("...");
    }

    // Show pages around current page
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Show ellipsis if current page is far from end
    if (currentPage < totalPages - 2) {
      pages.push("...");
    }

    // Always show last page
    pages.push(totalPages);
  }

  return pages;
}

/**
 * Skeleton loading state for the table
 */
function TableSkeleton() {
  return (
    <Card className="overflow-hidden" data-testid="permits-loading">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200" data-testid="permits-table-skeleton">
          <thead className="bg-gray-50">
            <tr>
              {["Permit #", "Address", "Location", "Owner", "Date", "Type", "", "Score"].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[...Array(10)].map((_, rowIdx) => (
              <tr key={rowIdx} className="animate-pulse">
                <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-40" /></td>
                <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                <td className="px-2 py-3"><div className="h-5 w-5 bg-gray-200 rounded mx-auto" /></td>
                <td className="px-4 py-3"><div className="h-2 bg-gray-200 rounded w-16" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/**
 * Display search results in a table with pagination
 */
export function PermitResults({ data, isLoading, onPageChange, onPageSizeChange }: PermitResultsProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (!data || data.results.length === 0) {
    return (
      <Card className="p-8 text-center" data-testid="permits-empty">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-gray-500">No permits found. Try adjusting your search criteria.</p>
      </Card>
    );
  }

  const pageNumbers = getPageNumbers(data.page, data.total_pages);

  return (
    <Card className="overflow-hidden">
      {/* Results header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Showing {((data.page - 1) * data.page_size) + 1} - {Math.min(data.page * data.page_size, data.total)} of{" "}
          <span className="font-semibold">{data.total.toLocaleString()}</span> permits
          {data.query && (
            <span className="ml-2">
              for "<span className="font-medium">{data.query}</span>"
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {data.execution_time_ms.toFixed(0)}ms
        </div>
      </div>

      {/* Results table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200" data-testid="permits-table">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Permit #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Address
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                System Type
              </th>
              <th
                className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                title="Linked to Property"
              >
                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.results.map((result: PermitSearchResult) => (
              <tr
                key={result.permit.id}
                data-testid="permits-row"
                className="hover:bg-blue-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/permits/${result.permit.id}`)}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-blue-600 font-medium">
                    {result.permit.permit_number || "N/A"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900 max-w-xs truncate">
                    {result.permit.address || "No address"}
                  </div>
                  {result.highlights.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {result.highlights.map((h, i) => (
                        <span key={i} className="mr-2">
                          <span className="font-medium">{h.field}:</span>{" "}
                          <span
                            dangerouslySetInnerHTML={{
                              __html: h.fragments[0]?.replace(
                                new RegExp(`(${data.query || ""})`, "gi"),
                                "<mark>$1</mark>"
                              ) || "",
                            }}
                          />
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {result.permit.city || "Unknown"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {result.permit.county_name && `${result.permit.county_name}, `}
                    {result.permit.state_code}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900 max-w-[150px] truncate">
                    {result.permit.owner_name || "Unknown"}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {result.permit.permit_date
                    ? new Date(result.permit.permit_date).toLocaleDateString()
                    : "N/A"}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900 max-w-[120px] truncate">
                    {result.permit.system_type || "Unknown"}
                  </div>
                </td>
                <td className="px-2 py-3 text-center">
                  {result.permit.has_property ? (
                    <span
                      data-testid="linked-property-icon"
                      title="Linked to property - click to view details"
                      aria-label="Linked to property"
                    >
                      <svg className="w-5 h-5 text-green-600 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                      </svg>
                    </span>
                  ) : (
                    <span
                      data-testid="unlinked-property-icon"
                      title="No linked property"
                      aria-label="No linked property"
                    >
                      <svg className="w-5 h-5 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <div
                      className={`h-2 rounded-full ${
                        result.score > 0.7
                          ? "bg-green-500"
                          : result.score > 0.4
                          ? "bg-yellow-500"
                          : "bg-gray-300"
                      }`}
                      style={{ width: `${Math.min(result.score * 100, 100)}%`, maxWidth: "60px" }}
                    />
                    <span className="ml-2 text-xs text-gray-500">
                      {(result.score * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.total_pages > 1 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Page navigation */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              data-testid="pagination-prev"
              onClick={() => onPageChange(data.page - 1)}
              disabled={data.page <= 1}
              aria-label="Previous page"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Previous</span>
            </Button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {pageNumbers.map((pageNum, idx) =>
                pageNum === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={pageNum}
                    data-testid={`pagination-page-${pageNum}`}
                    aria-current={pageNum === data.page ? "page" : undefined}
                    aria-label={`Go to page ${pageNum}`}
                    onClick={() => onPageChange(pageNum)}
                    className={`min-w-[32px] h-8 px-2 text-sm rounded transition-colors ${
                      pageNum === data.page
                        ? "bg-blue-600 text-white font-medium"
                        : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              data-testid="pagination-next"
              onClick={() => onPageChange(data.page + 1)}
              disabled={data.page >= data.total_pages}
              aria-label="Next page"
            >
              <span className="hidden sm:inline">Next</span>
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>

          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 hidden sm:inline">Rows per page:</span>
            <div className="flex items-center gap-1">
              {[10, 25, 50, 100].map((size) => (
                <button
                  key={size}
                  data-testid={`page-size-${size}`}
                  onClick={() => onPageSizeChange(size)}
                  aria-label={`Show ${size} rows per page`}
                  aria-pressed={data.page_size === size}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    data.page_size === size
                      ? "bg-blue-600 text-white font-medium"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
