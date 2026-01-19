import { useState, useCallback } from "react";
import { usePermitSearch, usePermitStats } from "@/api/hooks/usePermits";
import { PermitSearch } from "./components/PermitSearch";
import { PermitResults } from "./components/PermitResults";
import { PermitStatsCard } from "./components/PermitStatsCard";
import type { PermitSearchFilters } from "@/api/types/permit";

/**
 * Main Permits page - National Septic OCR Dashboard
 *
 * Features:
 * - Hybrid search (keyword + semantic)
 * - State/county/city/zip filtering
 * - Date range filtering
 * - Paginated results with relevance scoring
 * - Dashboard statistics
 */
export function PermitsPage() {
  // Search filters state
  const [filters, setFilters] = useState<PermitSearchFilters>({
    page: 1,
    page_size: 25,
    sort_by: "relevance",
    sort_order: "desc",
  });

  // Data fetching
  const { data: searchData, isLoading: isSearching } = usePermitSearch(filters);
  const { data: stats, isLoading: isLoadingStats } = usePermitStats();

  // Filter change handler
  const handleFilterChange = useCallback((newFilters: Partial<PermitSearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // Page change handler
  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          National Septic Permit Database
        </h1>
        <p className="text-gray-500 mt-1">
          Search {stats?.total_permits.toLocaleString() || "millions of"} septic permits across{" "}
          {stats?.total_states || "50"} states
        </p>
      </div>

      {/* Stats overview */}
      <div className="mb-6">
        <PermitStatsCard stats={stats} isLoading={isLoadingStats} />
      </div>

      {/* Search and filters */}
      <PermitSearch
        filters={filters}
        onFilterChange={handleFilterChange}
        isLoading={isSearching}
      />

      {/* Results */}
      <PermitResults
        data={searchData}
        isLoading={isSearching}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
