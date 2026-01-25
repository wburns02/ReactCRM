import { useState, useCallback } from "react";
import { useStates, useCounties } from "@/api/hooks/usePermits";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { PermitSearchFilters } from "@/api/types/permit";

interface PermitSearchProps {
  filters: PermitSearchFilters;
  onFilterChange: (filters: Partial<PermitSearchFilters>) => void;
  isLoading?: boolean;
}

/**
 * Search bar and filters for permit search
 */
export function PermitSearch({
  filters,
  onFilterChange,
  isLoading,
}: PermitSearchProps) {
  const [localQuery, setLocalQuery] = useState(filters.query || "");
  const { data: states } = useStates();
  const { data: counties } = useCounties(filters.state_codes?.[0]);

  // Debounced search submit
  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onFilterChange({ query: localQuery, page: 1 });
    },
    [localQuery, onFilterChange],
  );

  // State filter change
  const handleStateChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      onFilterChange({
        state_codes: value ? [value] : undefined,
        county_ids: undefined, // Reset county when state changes
        page: 1,
      });
    },
    [onFilterChange],
  );

  // County filter change
  const handleCountyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      onFilterChange({
        county_ids: value ? [parseInt(value)] : undefined,
        page: 1,
      });
    },
    [onFilterChange],
  );

  // Clear all filters
  const handleClear = useCallback(() => {
    setLocalQuery("");
    onFilterChange({
      query: undefined,
      state_codes: undefined,
      county_ids: undefined,
      city: undefined,
      zip_code: undefined,
      permit_date_from: undefined,
      permit_date_to: undefined,
      page: 1,
    });
  }, [onFilterChange]);

  return (
    <Card className="p-4 mb-4">
      <form onSubmit={handleSearchSubmit} className="space-y-4">
        {/* Main search bar */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Search by address, owner, permit number..."
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Searching..." : "Search"}
          </Button>
          <Button type="button" variant="outline" onClick={handleClear}>
            Clear
          </Button>
        </div>

        {/* Filter row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* State filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <select
              value={filters.state_codes?.[0] || ""}
              onChange={handleStateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            >
              <option value="">All States</option>
              {states?.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name} ({state.code})
                </option>
              ))}
            </select>
          </div>

          {/* County filter (dependent on state) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              County
            </label>
            <select
              value={filters.county_ids?.[0] || ""}
              onChange={handleCountyChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading || !filters.state_codes?.length}
            >
              <option value="">All Counties</option>
              {counties?.map((county) => (
                <option key={county.id} value={county.id}>
                  {county.name}
                </option>
              ))}
            </select>
          </div>

          {/* City filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <Input
              type="text"
              placeholder="City name"
              value={filters.city || ""}
              onChange={(e) =>
                onFilterChange({ city: e.target.value || undefined, page: 1 })
              }
              disabled={isLoading}
            />
          </div>

          {/* Zip code filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code
            </label>
            <Input
              type="text"
              placeholder="ZIP code"
              value={filters.zip_code || ""}
              onChange={(e) =>
                onFilterChange({
                  zip_code: e.target.value || undefined,
                  page: 1,
                })
              }
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Date range filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Permit Date From
            </label>
            <Input
              type="date"
              value={filters.permit_date_from || ""}
              onChange={(e) =>
                onFilterChange({
                  permit_date_from: e.target.value || undefined,
                  page: 1,
                })
              }
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Permit Date To
            </label>
            <Input
              type="date"
              value={filters.permit_date_to || ""}
              onChange={(e) =>
                onFilterChange({
                  permit_date_to: e.target.value || undefined,
                  page: 1,
                })
              }
              disabled={isLoading}
            />
          </div>
        </div>
      </form>
    </Card>
  );
}
