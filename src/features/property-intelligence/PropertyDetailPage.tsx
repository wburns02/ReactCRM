import { useParams, Link } from "react-router-dom";
import {
  usePropertyDetail,
  usePropertyPermits,
  usePropertyEnvironmental,
  usePropertyFlood,
  usePropertyPdfs,
} from "@/api/hooks/usePropertyIntelligence";
import type {
  Property,
  Permit,
  EnvironmentalRecord,
  FloodZone,
  PDFExtraction,
} from "@/api/types/propertyIntelligence";
import { isPropIntelConfigured } from "@/api/propIntelClient";
import { EmptyState } from "@/components/ui/EmptyState.tsx";
import { useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Droplets,
  FileText,
  AlertTriangle,
  Activity,
  Home,
  Calendar,
  DollarSign,
  Loader2,
  ExternalLink,
  Eye,
} from "lucide-react";

type Tab = "overview" | "permits" | "environmental" | "flood" | "documents";

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const propertyId = id ? Number(id) : undefined;
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { data: property, isLoading } = usePropertyDetail(propertyId);
  const { data: permits } = usePropertyPermits(
    activeTab === "permits" ? propertyId : undefined
  );
  const { data: environmental } = usePropertyEnvironmental(
    activeTab === "environmental" ? propertyId : undefined
  );
  const { data: flood } = usePropertyFlood(
    activeTab === "flood" ? propertyId : undefined
  );
  const { data: pdfs } = usePropertyPdfs(
    activeTab === "documents" ? propertyId : undefined
  );

  if (!isPropIntelConfigured()) {
    return (
      <div className="p-6 text-text-secondary">Not configured.</div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-6">
        <p className="text-text-secondary">Property not found.</p>
        <Link
          to="/property-intelligence/search"
          className="text-primary hover:underline mt-2 inline-block"
        >
          Back to Search
        </Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "overview", label: "Overview", icon: Home },
    { key: "permits", label: "Permits", icon: FileText },
    { key: "environmental", label: "Environmental", icon: AlertTriangle },
    { key: "flood", label: "Flood Risk", icon: Activity },
    { key: "documents", label: "Documents", icon: Eye },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          to="/property-intelligence"
          className="text-text-secondary hover:text-primary"
        >
          Property Intelligence
        </Link>
        <span className="text-text-secondary">/</span>
        <Link
          to="/property-intelligence/search"
          className="text-text-secondary hover:text-primary"
        >
          Search
        </Link>
        <span className="text-text-secondary">/</span>
        <span className="text-text-primary font-medium">
          {property.address || `Property #${property.id}`}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {property.address || "Unknown Address"}
          </h1>
          <p className="text-text-secondary mt-1">
            {[property.city, property.state, property.zip]
              .filter(Boolean)
              .join(", ")}
            {property.county && ` — ${property.county}`}
          </p>
          <div className="flex items-center gap-3 mt-2">
            {property.has_septic && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                <Droplets className="w-3 h-3" />
                Septic System
              </span>
            )}
            {property.flood_zone && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                <Activity className="w-3 h-3" />
                Flood Zone: {property.flood_zone}
              </span>
            )}
            {property.data_sources?.map((src) => (
              <span
                key={src}
                className="text-[10px] bg-bg-secondary text-text-secondary px-2 py-1 rounded"
              >
                {src}
              </span>
            ))}
          </div>
        </div>
        {property.lat && property.lng && (
          <a
            href={`https://www.google.com/maps?q=${property.lat},${property.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 border border-border-primary rounded-lg text-sm text-text-primary hover:bg-bg-secondary transition-colors"
          >
            <MapPin className="w-4 h-4" />
            View on Map
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border-primary">
        <nav className="flex gap-0 -mb-px">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary hover:border-border-primary"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab property={property} />}
      {activeTab === "permits" && <PermitsTab permits={permits || []} />}
      {activeTab === "environmental" && (
        <EnvironmentalTab records={environmental || []} />
      )}
      {activeTab === "flood" && <FloodTab zones={flood || []} />}
      {activeTab === "documents" && <DocumentsTab pdfs={pdfs || []} />}
    </div>
  );
}

function OverviewTab({ property }: { property: Property }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Location */}
      <Section title="Location" icon={MapPin}>
        <InfoRow label="Address" value={property.address} />
        <InfoRow label="City" value={property.city} />
        <InfoRow label="State" value={property.state} />
        <InfoRow label="ZIP" value={property.zip} />
        <InfoRow label="County" value={property.county} />
        <InfoRow label="Parcel ID" value={property.parcel_id} />
        <InfoRow
          label="Coordinates"
          value={
            property.lat && property.lng
              ? `${property.lat.toFixed(6)}, ${property.lng.toFixed(6)}`
              : null
          }
        />
      </Section>

      {/* Property Details */}
      <Section title="Property Details" icon={Home}>
        <InfoRow label="Property Type" value={property.property_type} />
        <InfoRow label="Year Built" value={property.year_built} />
        <InfoRow label="Bedrooms" value={property.bedrooms} />
        <InfoRow
          label="Lot Size"
          value={
            property.lot_size_sqft
              ? `${property.lot_size_sqft.toLocaleString()} sqft`
              : null
          }
        />
        <InfoRow label="Owner" value={property.owner_name} />
        <InfoRow label="Land Use" value={property.land_use} />
      </Section>

      {/* Septic System */}
      <Section title="Septic System" icon={Droplets}>
        <InfoRow
          label="Has Septic"
          value={property.has_septic ? "Yes" : "No"}
        />
        <InfoRow label="System Type" value={property.septic_system_type} />
        <InfoRow
          label="Tank Size"
          value={
            property.septic_tank_size_gallons
              ? `${property.septic_tank_size_gallons} gallons`
              : null
          }
        />
        <InfoRow label="Install Date" value={property.septic_install_date} />
      </Section>

      {/* Valuation */}
      <Section title="Valuation" icon={DollarSign}>
        <InfoRow
          label="Assessed Value"
          value={
            property.assessed_value
              ? `$${property.assessed_value.toLocaleString()}`
              : null
          }
        />
        <InfoRow
          label="Market Value"
          value={
            property.market_value
              ? `$${property.market_value.toLocaleString()}`
              : null
          }
        />
        <InfoRow label="Last Sale Date" value={property.last_sale_date} />
        <InfoRow
          label="Last Sale Price"
          value={
            property.last_sale_price
              ? `$${property.last_sale_price.toLocaleString()}`
              : null
          }
        />
      </Section>

      {/* Metadata */}
      <Section title="Data Quality" icon={Activity}>
        <InfoRow
          label="Data Sources"
          value={property.data_sources?.join(", ")}
        />
        <InfoRow
          label="Quality Score"
          value={
            property.data_quality_score !== null
              ? `${property.data_quality_score}/100`
              : null
          }
        />
        <InfoRow
          label="Last Updated"
          value={
            property.updated_at
              ? new Date(property.updated_at).toLocaleDateString()
              : null
          }
        />
      </Section>
    </div>
  );
}

function PermitsTab({ permits }: { permits: Permit[] }) {
  if (permits.length === 0) {
    return <EmptyState icon="📋" title="No permits found" description="No permits found for this property." />;
  }

  return (
    <div className="space-y-3">
      {permits.map((p) => (
        <div
          key={p.id}
          className="bg-bg-primary border border-border-primary rounded-lg p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-text-primary">
                {p.permit_number || `Permit #${p.id}`}
              </p>
              <p className="text-sm text-text-secondary mt-0.5">
                {p.permit_type || "Unknown type"} — {p.status || "Unknown status"}
              </p>
            </div>
            {p.issued_date && (
              <span className="text-xs text-text-secondary flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(p.issued_date).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
            {p.system_type && (
              <div>
                <span className="text-text-secondary text-xs">System</span>
                <p className="text-text-primary">{p.system_type}</p>
              </div>
            )}
            {p.tank_size_gallons && (
              <div>
                <span className="text-text-secondary text-xs">Tank</span>
                <p className="text-text-primary">{p.tank_size_gallons} gal</p>
              </div>
            )}
            {p.drainfield_size_sqft && (
              <div>
                <span className="text-text-secondary text-xs">Drainfield</span>
                <p className="text-text-primary">
                  {p.drainfield_size_sqft} sqft
                </p>
              </div>
            )}
            {p.contractor_name && (
              <div>
                <span className="text-text-secondary text-xs">Contractor</span>
                <p className="text-text-primary">{p.contractor_name}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function EnvironmentalTab({ records }: { records: EnvironmentalRecord[] }) {
  if (records.length === 0) {
    return (
      <EmptyState icon="🌿" title="No environmental records" description="No environmental records found for this property." />
    );
  }

  return (
    <div className="space-y-3">
      {records.map((r) => (
        <div
          key={r.id}
          className="bg-bg-primary border border-border-primary rounded-lg p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-text-primary">
                {r.facility_name || "Unknown Facility"}
              </p>
              <p className="text-sm text-text-secondary">
                {r.record_type} — {r.program}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded font-medium ${
                r.compliance_status === "In Violation"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              }`}
            >
              {r.compliance_status || "Unknown"}
            </span>
          </div>
          {r.violation_type && (
            <p className="text-sm text-text-secondary mt-2">
              {r.violation_type}
            </p>
          )}
          {r.penalty_amount && (
            <p className="text-sm font-medium text-red-600 mt-1">
              Penalty: ${r.penalty_amount.toLocaleString()}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function FloodTab({ zones }: { zones: FloodZone[] }) {
  if (zones.length === 0) {
    return <EmptyState icon="💧" title="No flood zone data" description="No flood zone data found for this property." />;
  }

  return (
    <div className="space-y-3">
      {zones.map((z) => (
        <div
          key={z.id}
          className="bg-bg-primary border border-border-primary rounded-lg p-4"
        >
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-medium text-text-primary">
                Zone: {z.flood_zone}
              </p>
              <p className="text-sm text-text-secondary">
                {z.zone_description}
              </p>
            </div>
          </div>
          {z.panel_number && (
            <p className="text-xs text-text-secondary mt-2">
              Panel: {z.panel_number} | Effective:{" "}
              {z.effective_date
                ? new Date(z.effective_date).toLocaleDateString()
                : "—"}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function DocumentsTab({ pdfs }: { pdfs: PDFExtraction[] }) {
  if (pdfs.length === 0) {
    return (
      <EmptyState icon="📄" title="No documents found" description="No extracted documents found for this property." />
    );
  }

  return (
    <div className="space-y-3">
      {pdfs.map((p) => (
        <div
          key={p.id}
          className="bg-bg-primary border border-border-primary rounded-lg p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-text-primary">
                {p.permit_number || "Document"} — {p.extraction_model}
              </p>
              <p className="text-sm text-text-secondary">
                {p.pdf_page_count} pages |{" "}
                {p.pdf_size_bytes
                  ? `${(p.pdf_size_bytes / 1024).toFixed(0)} KB`
                  : "—"}
              </p>
            </div>
            {p.confidence_score !== null && (
              <span
                className={`text-xs px-2 py-0.5 rounded font-medium ${
                  p.confidence_score > 0.8
                    ? "bg-green-100 text-green-700"
                    : p.confidence_score > 0.5
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {(p.confidence_score * 100).toFixed(0)}% confidence
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
            {p.system_type && (
              <div>
                <span className="text-text-secondary text-xs">System</span>
                <p className="text-text-primary">{p.system_type}</p>
              </div>
            )}
            {p.tank_size_gallons && (
              <div>
                <span className="text-text-secondary text-xs">Tank</span>
                <p className="text-text-primary">{p.tank_size_gallons} gal</p>
              </div>
            )}
            {p.soil_type && (
              <div>
                <span className="text-text-secondary text-xs">Soil</span>
                <p className="text-text-primary">{p.soil_type}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg-primary border border-border-primary rounded-lg p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-3">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="text-text-primary font-medium">
        {value ?? <span className="text-text-secondary/50">—</span>}
      </span>
    </div>
  );
}

