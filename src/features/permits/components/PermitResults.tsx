import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { PermitSearchResponse, PermitSearchResult } from "@/api/types/permit";

interface PermitResultsProps {
  data: PermitSearchResponse | undefined;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

/**
 * Display search results in a table with pagination
 */
export function PermitResults({ data, isLoading, onPageChange }: PermitResultsProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Searching permits...</p>
      </Card>
    );
  }

  if (!data || data.results.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">No permits found. Try adjusting your search criteria.</p>
      </Card>
    );
  }

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
        <table className="min-w-full divide-y divide-gray-200">
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
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Linked to Property">
                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <span title="Linked to property - click to view details">
                      <svg className="w-5 h-5 text-green-600 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                      </svg>
                    </span>
                  ) : (
                    <span title="No linked property">
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
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(data.page - 1)}
              disabled={data.page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {data.page} of {data.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(data.page + 1)}
              disabled={data.page >= data.total_pages}
            >
              Next
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {[10, 25, 50, 100].map((size) => (
              <button
                key={size}
                className={`px-2 py-1 text-xs rounded ${
                  data.page_size === size
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                onClick={() => onPageChange(1)}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
