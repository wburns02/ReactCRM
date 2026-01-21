import { Card } from "@/components/ui/Card";
import type { PermitProperty } from "@/api/hooks/usePermits";

interface PropertyDetailPanelProps {
  data: PermitProperty | undefined;
  isLoading: boolean;
}

/**
 * Format currency with commas
 */
function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "N/A";
  return `$${value.toLocaleString()}`;
}

/**
 * Format date string
 */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString();
}

/**
 * Format acres with proper decimals
 */
function formatAcres(acres: number | null | undefined): string {
  if (acres == null) return "N/A";
  return `${acres.toFixed(2)} acres`;
}

/**
 * Property detail panel showing linked property data for a permit
 */
export function PropertyDetailPanel({ data, isLoading }: PropertyDetailPanelProps) {
  if (isLoading) {
    return (
      <Card className="p-6 mt-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (!data || !data.property) {
    return (
      <Card className="p-6 mt-6 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Linked Property</h2>
        <p className="text-gray-500">
          {data?.message || "No property data linked to this permit."}
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Property data becomes available when permits are matched to county assessor records.
        </p>
      </Card>
    );
  }

  const { property, all_permits, total_permits } = data;

  return (
    <div className="mt-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-1 bg-green-500 rounded-full"></div>
        <h2 className="text-xl font-bold text-gray-900">Linked Property</h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {total_permits} permit{total_permits !== 1 ? "s" : ""} on record
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Property Overview */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-blue-600">&#127968;</span>
            Property Overview
          </h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Address</dt>
              <dd className="text-gray-900 font-medium">{property.address || "N/A"}</dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">City</dt>
                <dd className="text-gray-900">{property.city || "N/A"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ZIP</dt>
                <dd className="text-gray-900">{property.zip_code || "N/A"}</dd>
              </div>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Parcel ID</dt>
              <dd className="text-gray-900 font-mono text-sm">{property.parcel_id || "N/A"}</dd>
            </div>
            {property.subdivision && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Subdivision</dt>
                <dd className="text-gray-900">{property.subdivision}</dd>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Lot Size</dt>
                <dd className="text-gray-900">{formatAcres(property.lot_size_acres || property.calculated_acres)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Sqft</dt>
                <dd className="text-gray-900">
                  {property.square_footage ? `${property.square_footage.toLocaleString()} sq ft` : "N/A"}
                </dd>
              </div>
            </div>
            {property.property_type && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Property Type</dt>
                <dd className="text-gray-900">{property.property_type}</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Owner Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-purple-600">&#128100;</span>
            Owner Information
          </h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Owner Name</dt>
              <dd className="text-gray-900 font-medium">{property.owner_name || "N/A"}</dd>
              {property.owner_name_2 && (
                <dd className="text-gray-700 text-sm">{property.owner_name_2}</dd>
              )}
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Mailing Address</dt>
              <dd className="text-gray-900">
                {property.owner_mailing_address || "N/A"}
              </dd>
              {(property.owner_city || property.owner_state || property.owner_zip) && (
                <dd className="text-gray-700 text-sm">
                  {[property.owner_city, property.owner_state, property.owner_zip]
                    .filter(Boolean)
                    .join(", ")}
                </dd>
              )}
            </div>
          </dl>
        </Card>

        {/* Valuation */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-green-600">&#128176;</span>
            Valuation
          </h3>
          <dl className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Market Value</dt>
                <dd className="text-gray-900 text-lg font-semibold">
                  {formatCurrency(property.market_value)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Assessed Value</dt>
                <dd className="text-gray-900 text-lg font-semibold">
                  {formatCurrency(property.assessed_value)}
                </dd>
              </div>
            </div>
            {(property.market_land || property.market_improvement) && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <dt className="text-xs font-medium text-gray-500">Land</dt>
                  <dd className="text-gray-700">{formatCurrency(property.market_land)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">Improvement</dt>
                  <dd className="text-gray-700">{formatCurrency(property.market_improvement)}</dd>
                </div>
              </div>
            )}
            {(property.last_sale_date || property.last_sale_price) && (
              <div className="pt-2 border-t border-gray-100">
                <dt className="text-sm font-medium text-gray-500">Last Sale</dt>
                <dd className="text-gray-900">
                  {formatDate(property.last_sale_date)}
                  {property.last_sale_price && ` for ${formatCurrency(property.last_sale_price)}`}
                </dd>
              </div>
            )}
            {(property.deed_book || property.deed_page) && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Deed Reference</dt>
                <dd className="text-gray-700 text-sm font-mono">
                  Book {property.deed_book || "?"}, Page {property.deed_page || "?"}
                </dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Building Details */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-orange-600">&#128736;</span>
            Building Details
          </h3>
          {property.has_building_details || property.year_built || property.bedrooms ? (
            <dl className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Year Built</dt>
                  <dd className="text-gray-900">{property.year_built || "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Bedrooms</dt>
                  <dd className="text-gray-900">{property.bedrooms || "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Bathrooms</dt>
                  <dd className="text-gray-900">{property.bathrooms || "N/A"}</dd>
                </div>
              </div>
              {(property.stories || property.foundation_type || property.construction_type) && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Stories</dt>
                    <dd className="text-gray-900">{property.stories || "N/A"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Foundation</dt>
                    <dd className="text-gray-900">{property.foundation_type || "N/A"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Construction</dt>
                    <dd className="text-gray-900">{property.construction_type || "N/A"}</dd>
                  </div>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-gray-500 text-sm">
              Building details not available. This data may be added when building permit records are integrated.
            </p>
          )}
        </Card>
      </div>

      {/* All Permits Table */}
      {all_permits.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-indigo-600">&#128196;</span>
            All Permits on This Property ({total_permits})
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Permit #
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    System Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Tank Size
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Owner
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Links
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {all_permits.map((permit) => (
                  <tr
                    key={permit.id}
                    className={permit.is_current ? "bg-blue-50" : "hover:bg-gray-50"}
                  >
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`font-medium ${permit.is_current ? "text-blue-700" : "text-gray-900"}`}>
                        {permit.permit_number || "N/A"}
                      </span>
                      {permit.is_current && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(permit.permit_date)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 max-w-[150px] truncate">
                      {permit.system_type || "Unknown"}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                      {permit.tank_size_gallons ? `${permit.tank_size_gallons.toLocaleString()} gal` : "N/A"}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 max-w-[150px] truncate">
                      {permit.owner_name || "Unknown"}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        {permit.pdf_url && (
                          <a
                            href={permit.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                            title="View PDF"
                          >
                            PDF
                          </a>
                        )}
                        {permit.permit_url && (
                          <a
                            href={permit.permit_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                            title="View Original"
                          >
                            Source
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Documents Stub (Future) */}
      <Card className="p-6 bg-gray-50 border-dashed">
        <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <span className="text-gray-500">&#128206;</span>
          Documents & Photos
        </h3>
        <p className="text-gray-500 text-sm">
          No documents available yet. PDFs, photos, and attachments will appear here when integrated.
        </p>
      </Card>

      {/* Data Source Info */}
      <div className="text-xs text-gray-400 flex items-center gap-4">
        <span>
          Source: {property.source_portal_code || "Unknown"}
        </span>
        {property.scraped_at && (
          <span>
            Last updated: {new Date(property.scraped_at).toLocaleDateString()}
          </span>
        )}
        {property.data_quality_score != null && (
          <span>
            Data quality: {property.data_quality_score}%
          </span>
        )}
      </div>
    </div>
  );
}
