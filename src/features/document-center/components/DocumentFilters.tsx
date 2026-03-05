import { useState, useCallback, useEffect } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/Input.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
// DatePicker not available, using simple date inputs
import {
  DocumentType,
  DocumentStatus,
  DOCUMENT_TYPE_INFO,
  STATUS_INFO,
  type DocumentFilters as DocumentFiltersType,
} from "@/api/types/documentCenter.ts";

interface DocumentFiltersProps {
  filters: DocumentFiltersType;
  onFilterChange: (filters: Partial<DocumentFiltersType>) => void;
}

export function DocumentFilters({ filters, onFilterChange }: DocumentFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search || "");
  const [isExpanded, setIsExpanded] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchValue !== filters.search) {
        onFilterChange({ search: searchValue || undefined });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchValue, filters.search, onFilterChange]);

  const handleFilterChange = useCallback(
    (key: keyof DocumentFiltersType, value: any) => {
      onFilterChange({ [key]: value || undefined });
    },
    [onFilterChange]
  );

  const clearAllFilters = () => {
    setSearchValue("");
    onFilterChange({
      search: undefined,
      document_type: undefined,
      status: undefined,
      customer_id: undefined,
      date_from: undefined,
      date_to: undefined,
    });
    setIsExpanded(false);
  };

  // Count active filters
  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => key !== "page" && key !== "page_size" && value !== undefined
  ).length;

  const documentTypeOptions = [
    { value: "", label: "All Types" },
    ...Object.entries(DOCUMENT_TYPE_INFO).map(([key, info]) => ({
      value: key,
      label: info.label,
    })),
  ];

  const statusOptions = [
    { value: "", label: "All Status" },
    ...Object.entries(STATUS_INFO).map(([key, info]) => ({
      value: key,
      label: info.label,
    })),
  ];

  return (
    <div className="space-y-4">
      {/* Header with search and filter toggle */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input
              placeholder="Search by reference number or file name..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Button
          variant={isExpanded ? "default" : "outline"}
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          <Filter size={16} />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button variant="ghost" onClick={clearAllFilters} className="flex items-center gap-2">
            <X size={16} />
            Clear
          </Button>
        )}
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          {/* Document Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Type
            </label>
            <Select
              value={filters.document_type || ""}
              onValueChange={(value) => handleFilterChange("document_type", value)}
              options={documentTypeOptions}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <Select
              value={filters.status || ""}
              onValueChange={(value) => handleFilterChange("status", value)}
              options={statusOptions}
            />
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date From
            </label>
            <Input
              type="date"
              value={filters.date_from ? new Date(filters.date_from).toISOString().split('T')[0] : ""}
              onChange={(e) => handleFilterChange("date_from", e.target.value ? new Date(e.target.value).toISOString() : undefined)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date To
            </label>
            <Input
              type="date"
              value={filters.date_to ? new Date(filters.date_to).toISOString().split('T')[0] : ""}
              onChange={(e) => handleFilterChange("date_to", e.target.value ? new Date(e.target.value).toISOString() : undefined)}
            />
          </div>
        </div>
      )}

      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.document_type && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Type: {DOCUMENT_TYPE_INFO[filters.document_type as DocumentType]?.label}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1 text-gray-500 hover:text-gray-700"
                onClick={() => handleFilterChange("document_type", undefined)}
              >
                <X size={12} />
              </Button>
            </Badge>
          )}

          {filters.status && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {STATUS_INFO[filters.status as DocumentStatus]?.label}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1 text-gray-500 hover:text-gray-700"
                onClick={() => handleFilterChange("status", undefined)}
              >
                <X size={12} />
              </Button>
            </Badge>
          )}

          {filters.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: "{filters.search}"
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1 text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setSearchValue("");
                  handleFilterChange("search", undefined);
                }}
              >
                <X size={12} />
              </Button>
            </Badge>
          )}

          {(filters.date_from || filters.date_to) && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Date: {filters.date_from ? new Date(filters.date_from).toLocaleDateString() : "Start"} - {filters.date_to ? new Date(filters.date_to).toLocaleDateString() : "End"}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1 text-gray-500 hover:text-gray-700"
                onClick={() => {
                  handleFilterChange("date_from", undefined);
                  handleFilterChange("date_to", undefined);
                }}
              >
                <X size={12} />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}