import { useState } from "react";
import { usePropertySearch } from "@/api/hooks/usePropertyIntelligence";
import { isPropIntelConfigured } from "@/api/propIntelClient";
import { Link } from "react-router-dom";
import type { PropertySearchFilters } from "@/api/types/propertyIntelligence";
import {
  Search,
  MapPin,
  Droplets,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
  X,
} from "lucide-react";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

export function PropertySearchPage() {
  const [filters, setFilters] = useState<PropertySearchFilters>({
    page: 1,
    page_size: 25,
  });
  const [searchInput, setSearchInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, isFetching } = usePropertySearch(filters);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, query: searchInput || undefined, page: 1 }));
  };

  const setPage = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!isPropIntelConfigured()) {
    return (
      <div className="p-6">
        <p className="text-text-secondary">
          Property Intelligence not configured.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Property Search
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {data
              ? `${data.total.toLocaleString()} properties found`
              : "Search across millions of government property records"}
          </p>
        </div>
        <Link
          to="/property-intelligence"
          className="text-sm text-primary hover:underline"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by address, city, county..."
            className="w-full pl-10 pr-4 py-2.5 border border-border-primary rounded-lg bg-bg-primary text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-2.5 border rounded-lg flex items-center gap-2 text-sm transition-colors ${
            showFilters
              ? "border-primary bg-primary/5 text-primary"
              : "border-border-primary text-text-secondary hover:border-primary"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
        <button
          type="submit"
          className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-bg-primary border border-border-primary rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              State
            </label>
            <select
              value={filters.state_code || ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  state_code: e.target.value || undefined,
                  page: 1,
                }))
              }
              className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary text-sm"
            >
              <option value="">All States</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              City
            </label>
            <input
              type="text"
              value={filters.city || ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  city: e.target.value || undefined,
                  page: 1,
                }))
              }
              placeholder="Filter by city"
              className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              County
            </label>
            <input
              type="text"
              value={filters.county || ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  county: e.target.value || undefined,
                  page: 1,
                }))
              }
              placeholder="Filter by county"
              className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Septic System
            </label>
            <select
              value={
                filters.has_septic === undefined
                  ? ""
                  : String(filters.has_septic)
              }
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  has_septic:
                    e.target.value === "" ? undefined : e.target.value === "true",
                  page: 1,
                }))
              }
              className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary text-sm"
            >
              <option value="">All</option>
              <option value="true">Has Septic</option>
              <option value="false">No Septic</option>
            </select>
          </div>
          {/* Active filter tags */}
          {(filters.state_code || filters.city || filters.county || filters.has_septic !== undefined) && (
            <div className="col-span-full flex items-center gap-2 flex-wrap">
              <span className="text-xs text-text-secondary">Active:</span>
              {filters.state_code && (
                <FilterTag
                  label={`State: ${filters.state_code}`}
                  onRemove={() => setFilters((p) => ({ ...p, state_code: undefined, page: 1 }))}
                />
              )}
              {filters.city && (
                <FilterTag
                  label={`City: ${filters.city}`}
                  onRemove={() => setFilters((p) => ({ ...p, city: undefined, page: 1 }))}
                />
              )}
              {filters.county && (
                <FilterTag
                  label={`County: ${filters.county}`}
                  onRemove={() => setFilters((p) => ({ ...p, county: undefined, page: 1 }))}
                />
              )}
              {filters.has_septic !== undefined && (
                <FilterTag
                  label={filters.has_septic ? "Has Septic" : "No Septic"}
                  onRemove={() => setFilters((p) => ({ ...p, has_septic: undefined, page: 1 }))}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Results Table */}
      <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-text-secondary">Searching...</span>
          </div>
        ) : data && data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-primary bg-bg-secondary">
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                    Address
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                    City
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                    State
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                    County
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                    Septic
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                    Sources
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary">
                {data.items.map((prop) => (
                  <tr
                    key={prop.id}
                    className="hover:bg-bg-secondary/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/property-intelligence/${prop.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {prop.address || "Unknown Address"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary">
                      {prop.city || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-medium text-text-primary">
                        {prop.state || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary">
                      {prop.county || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {prop.has_septic ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">
                          <Droplets className="w-3 h-3" />
                          Yes
                        </span>
                      ) : (
                        <span className="text-xs text-text-secondary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {prop.data_sources?.slice(0, 2).map((src) => (
                          <span
                            key={src}
                            className="text-[10px] bg-bg-secondary text-text-secondary px-1.5 py-0.5 rounded"
                          >
                            {src}
                          </span>
                        ))}
                        {(prop.data_sources?.length || 0) > 2 && (
                          <span className="text-[10px] text-text-secondary">
                            +{(prop.data_sources?.length || 0) - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {prop.lat && prop.lng ? (
                        <a
                          href={`https://www.google.com/maps?q=${prop.lat},${prop.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <MapPin className="w-3 h-3" />
                          Map
                        </a>
                      ) : (
                        <span className="text-xs text-text-secondary">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
            <Search className="w-10 h-10 mb-3 opacity-30" />
            <p className="font-medium">No properties found</p>
            <p className="text-sm mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            Page {data.page} of {data.total_pages.toLocaleString()} ({data.total.toLocaleString()} results)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(data.page - 1)}
              disabled={data.page <= 1 || isFetching}
              className="p-2 rounded-lg border border-border-primary hover:bg-bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(data.page + 1)}
              disabled={data.page >= data.total_pages || isFetching}
              className="p-2 rounded-lg border border-border-primary hover:bg-bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterTag({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
      {label}
      <button
        onClick={onRemove}
        className="hover:bg-primary/20 rounded p-0.5"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
