import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { useDebounce } from "@/hooks/useDebounce.ts";
import {
  type ProspectStage,
  type LeadSource,
  PROSPECT_STAGE_LABELS,
  LEAD_SOURCE_LABELS,
} from "@/api/types/common.ts";
import type { ProspectFilters as ProspectFiltersType } from "@/api/types/prospect.ts";

interface ProspectFiltersProps {
  filters: ProspectFiltersType;
  onFilterChange: (filters: Partial<ProspectFiltersType>) => void;
}

/**
 * Filter bar for prospects list
 *
 * Search input is debounced (300ms) to prevent excessive API calls
 */
export function ProspectFilters({
  filters,
  onFilterChange,
}: ProspectFiltersProps) {
  // Local state for search input (immediate typing feedback)
  const [searchInput, setSearchInput] = useState(filters.search || "");

  // Debounced search value - only triggers API call after 300ms of no typing
  const debouncedSearch = useDebounce(searchInput, 300);

  // Sync debounced value with parent filters
  useEffect(() => {
    // Only trigger change if value actually changed
    if (debouncedSearch !== (filters.search || "")) {
      onFilterChange({ search: debouncedSearch || undefined });
    }
  }, [debouncedSearch, filters.search, onFilterChange]);

  // Sync external filter changes back to local state
  useEffect(() => {
    if (filters.search !== searchInput && !filters.search) {
      setSearchInput("");
    }
  }, [filters.search]);

  const handleClear = () => {
    setSearchInput("");
    onFilterChange({
      search: undefined,
      stage: undefined,
      lead_source: undefined,
    });
  };

  const hasFilters = searchInput || filters.stage || filters.lead_source;

  return (
    <div className="flex flex-wrap items-end gap-4">
      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <label
          htmlFor="search"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Search
        </label>
        <Input
          id="search"
          type="search"
          placeholder="Search by name, email, or company..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {/* Stage filter */}
      <div className="w-40">
        <label
          htmlFor="stage"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Stage
        </label>
        <Select
          id="stage"
          value={filters.stage || ""}
          onChange={(e) =>
            onFilterChange({
              stage: (e.target.value as ProspectStage) || undefined,
            })
          }
        >
          <option value="">All Stages</option>
          {Object.entries(PROSPECT_STAGE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {/* Lead Source filter */}
      <div className="w-40">
        <label
          htmlFor="lead_source"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          Source
        </label>
        <Select
          id="lead_source"
          value={filters.lead_source || ""}
          onChange={(e) =>
            onFilterChange({
              lead_source: (e.target.value as LeadSource) || undefined,
            })
          }
        >
          <option value="">All Sources</option>
          {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={handleClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
