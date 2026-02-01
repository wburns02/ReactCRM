/**
 * KeywordsDetail Component
 *
 * Shows detailed keyword rankings when the Keywords metric card is clicked.
 * - Table with keyword, position, impressions, clicks, CTR
 * - Color-coded positions (green 1-3, yellow 4-10, red 11+)
 * - Sortable columns
 * - Search filter
 */

import { useState, useMemo } from "react";
import { useKeywordDetails } from "@/api/hooks/useMarketingDetails";
import type { KeywordDetail } from "@/api/types/marketingDetails";
import { TableSkeleton } from "./DetailDrawer";

interface KeywordsDetailProps {
  isEnabled: boolean;
}

export function KeywordsDetail({ isEnabled }: KeywordsDetailProps) {
  const { data, isLoading, error } = useKeywordDetails(isEnabled);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<keyof KeywordDetail>("position");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const keywords = data?.keywords || [];

  // Filter and sort keywords
  const filteredKeywords = useMemo(() => {
    let result = [...keywords];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (k) =>
          k.keyword.toLowerCase().includes(searchLower) ||
          k.county?.toLowerCase().includes(searchLower) ||
          k.category?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      const aVal = a[sortBy] ?? 999;
      const bVal = b[sortBy] ?? 999;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return result;
  }, [keywords, search, sortBy, sortDir]);

  const handleSort = (column: keyof KeywordDetail) => {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  const getPositionColor = (position: number | null) => {
    if (position === null) return "text-gray-400";
    if (position <= 3) return "text-green-600 bg-green-50";
    if (position <= 10) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const SortIcon = ({ column }: { column: keyof KeywordDetail }) => {
    if (sortBy !== column) {
      return <span className="text-gray-300 ml-1">↕</span>;
    }
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  if (isLoading) {
    return <TableSkeleton rows={8} cols={5} />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-4xl mb-2">⚠️</div>
        <p className="text-gray-600">Failed to load keyword data</p>
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
          placeholder="Search keywords..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          🔍
        </span>
      </div>

      {/* Stats summary */}
      <div className="flex gap-4 text-sm">
        <div className="bg-gray-50 px-3 py-2 rounded-lg">
          <span className="text-gray-500">Total:</span>{" "}
          <span className="font-semibold">{keywords.length}</span>
        </div>
        <div className="bg-green-50 px-3 py-2 rounded-lg">
          <span className="text-green-600">Top 3:</span>{" "}
          <span className="font-semibold">
            {keywords.filter((k) => k.position && k.position <= 3).length}
          </span>
        </div>
        <div className="bg-yellow-50 px-3 py-2 rounded-lg">
          <span className="text-yellow-600">Top 10:</span>{" "}
          <span className="font-semibold">
            {keywords.filter((k) => k.position && k.position <= 10).length}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th
                className="pb-3 font-medium text-gray-700 cursor-pointer hover:text-brand-primary"
                onClick={() => handleSort("keyword")}
              >
                Keyword <SortIcon column="keyword" />
              </th>
              <th
                className="pb-3 font-medium text-gray-700 cursor-pointer hover:text-brand-primary text-center"
                onClick={() => handleSort("position")}
              >
                Rank <SortIcon column="position" />
              </th>
              <th
                className="pb-3 font-medium text-gray-700 cursor-pointer hover:text-brand-primary text-right"
                onClick={() => handleSort("impressions")}
              >
                Impressions <SortIcon column="impressions" />
              </th>
              <th
                className="pb-3 font-medium text-gray-700 cursor-pointer hover:text-brand-primary text-right"
                onClick={() => handleSort("clicks")}
              >
                Clicks <SortIcon column="clicks" />
              </th>
              <th
                className="pb-3 font-medium text-gray-700 cursor-pointer hover:text-brand-primary text-right"
                onClick={() => handleSort("ctr")}
              >
                CTR <SortIcon column="ctr" />
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredKeywords.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  {search ? "No keywords match your search" : "No keywords tracked yet"}
                </td>
              </tr>
            ) : (
              filteredKeywords.map((kw) => (
                <tr
                  key={kw.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3">
                    <div className="font-medium text-gray-900">{kw.keyword}</div>
                    {(kw.county || kw.category) && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {[kw.county, kw.category].filter(Boolean).join(" • ")}
                      </div>
                    )}
                  </td>
                  <td className="py-3 text-center">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getPositionColor(kw.position)}`}
                    >
                      {kw.position ?? "—"}
                    </span>
                  </td>
                  <td className="py-3 text-right text-gray-600">
                    {(kw.impressions ?? 0).toLocaleString()}
                  </td>
                  <td className="py-3 text-right text-gray-600">
                    {(kw.clicks ?? 0).toLocaleString()}
                  </td>
                  <td className="py-3 text-right text-gray-600">
                    {(kw.ctr ?? 0).toFixed(1)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer hint */}
      <p className="text-xs text-gray-400 text-center pt-2">
        Click column headers to sort • Data updates hourly
      </p>
    </div>
  );
}
