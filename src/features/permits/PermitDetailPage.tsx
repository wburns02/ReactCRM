import { useParams, Link } from "react-router-dom";
import {
  usePermit,
  usePermitHistory,
  usePermitProperty,
} from "@/api/hooks/usePermits";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PropertyDetailPanel } from "./components/PropertyDetailPanel";
import { getPermitDocumentUrl, getPermitViewUrl } from "@/utils/geocivixProxy";

/**
 * Permit detail page - shows full permit information
 */
export function PermitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: permit, isLoading, error } = usePermit(id);
  const { data: history } = usePermitHistory(id);
  const { data: propertyData, isLoading: propertyLoading } =
    usePermitProperty(id);

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading permit details...</p>
        </Card>
      </div>
    );
  }

  if (error || !permit) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card className="p-8 text-center">
          <p className="text-red-500 mb-4">Failed to load permit</p>
          <Link to="/permits">
            <Button variant="outline">Back to Search</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link to="/permits" className="text-blue-600 hover:text-blue-800">
          &larr; Back to Search
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Permit {permit.permit_number || "Details"}
        </h1>
        <p className="text-gray-500">
          {permit.state_name}{" "}
          {permit.county_name && `- ${permit.county_name} County`}
        </p>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Location info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Address</dt>
              <dd className="text-gray-900">
                {permit.address || "Not available"}
              </dd>
              {permit.address_normalized && (
                <dd className="text-xs text-gray-500 mt-1">
                  Normalized: {permit.address_normalized}
                </dd>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">City</dt>
                <dd className="text-gray-900">{permit.city || "N/A"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ZIP Code</dt>
                <dd className="text-gray-900">{permit.zip_code || "N/A"}</dd>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">State</dt>
                <dd className="text-gray-900">
                  {permit.state_name} ({permit.state_code})
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">County</dt>
                <dd className="text-gray-900">{permit.county_name || "N/A"}</dd>
              </div>
            </div>
            {permit.parcel_number && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Parcel Number
                </dt>
                <dd className="text-gray-900">{permit.parcel_number}</dd>
              </div>
            )}
            {permit.latitude && permit.longitude && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Coordinates
                </dt>
                <dd className="text-gray-900">
                  {permit.latitude.toFixed(6)}, {permit.longitude.toFixed(6)}
                </dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Owner/Applicant info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Owner & Applicant
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Owner Name</dt>
              <dd className="text-gray-900">
                {permit.owner_name || "Not available"}
              </dd>
            </div>
            {permit.applicant_name && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Applicant Name
                </dt>
                <dd className="text-gray-900">{permit.applicant_name}</dd>
              </div>
            )}
            {permit.contractor_name && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Contractor
                </dt>
                <dd className="text-gray-900">{permit.contractor_name}</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Permit info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Permit Information
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Permit Number
              </dt>
              <dd className="text-gray-900 font-mono">
                {permit.permit_number || "N/A"}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Permit Date
                </dt>
                <dd className="text-gray-900">
                  {permit.permit_date
                    ? new Date(permit.permit_date).toLocaleDateString()
                    : "N/A"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Install Date
                </dt>
                <dd className="text-gray-900">
                  {permit.install_date
                    ? new Date(permit.install_date).toLocaleDateString()
                    : "N/A"}
                </dd>
              </div>
            </div>
            {permit.expiration_date && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Expiration Date
                </dt>
                <dd className="text-gray-900">
                  {new Date(permit.expiration_date).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
        </Card>

        {/* System info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            System Specifications
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">System Type</dt>
              <dd className="text-gray-900">
                {permit.system_type_name || permit.system_type_raw || "Unknown"}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {permit.tank_size_gallons && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Tank Size
                  </dt>
                  <dd className="text-gray-900">
                    {permit.tank_size_gallons.toLocaleString()} gal
                  </dd>
                </div>
              )}
              {permit.drainfield_size_sqft && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Drainfield Size
                  </dt>
                  <dd className="text-gray-900">
                    {permit.drainfield_size_sqft.toLocaleString()} sq ft
                  </dd>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {permit.bedrooms && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Bedrooms
                  </dt>
                  <dd className="text-gray-900">{permit.bedrooms}</dd>
                </div>
              )}
              {permit.daily_flow_gpd && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Daily Flow
                  </dt>
                  <dd className="text-gray-900">{permit.daily_flow_gpd} GPD</dd>
                </div>
              )}
            </div>
          </dl>
        </Card>

        {/* Documents */}
        {(permit.pdf_url || permit.permit_url) && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Documents
            </h2>
            <div className="space-y-2">
              {permit.pdf_url && (
                <a
                  href={getPermitDocumentUrl(permit.pdf_url) || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <span>📄</span>
                  <span>View PDF Document</span>
                </a>
              )}
              {permit.permit_url && (
                <a
                  href={getPermitViewUrl(permit.permit_url) || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <span>🔗</span>
                  <span>View Original Permit</span>
                </a>
              )}
            </div>
          </Card>
        )}

        {/* Source info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Data Source
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Source Portal
              </dt>
              <dd className="text-gray-900">
                {permit.source_portal_name ||
                  permit.source_portal_code ||
                  "Unknown"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Scraped At</dt>
              <dd className="text-gray-900">
                {permit.scraped_at
                  ? new Date(permit.scraped_at).toLocaleString()
                  : "N/A"}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Data Quality
                </dt>
                <dd className="text-gray-900">
                  {permit.data_quality_score
                    ? `${permit.data_quality_score}%`
                    : "N/A"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Version</dt>
                <dd className="text-gray-900">{permit.version}</dd>
              </div>
            </div>
          </dl>
        </Card>
      </div>

      {/* Version history */}
      {history && history.versions.length > 0 && (
        <Card className="p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Version History
          </h2>
          <div className="space-y-3">
            {history.versions.map((version) => (
              <div
                key={version.id}
                className="border-l-2 border-blue-200 pl-4 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">Version {version.version}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(version.created_at).toLocaleString()}
                  </span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {version.change_source}
                  </span>
                </div>
                {version.changed_fields &&
                  version.changed_fields.length > 0 && (
                    <div className="text-sm text-gray-600 mt-1">
                      Changed: {version.changed_fields.join(", ")}
                    </div>
                  )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Linked Property Details */}
      <PropertyDetailPanel data={propertyData} isLoading={propertyLoading} />
    </div>
  );
}
