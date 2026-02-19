import { usePropIntelStats, usePropIntelHealth } from "@/api/hooks/usePropertyIntelligence";
import { isPropIntelConfigured } from "@/api/propIntelClient";
import { Link } from "react-router-dom";
import {
  Database,
  MapPin,
  FileText,
  AlertTriangle,
  Droplets,
  Server,
  HardDrive,
  Activity,
  Search,
  Map,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export function PropertyIntelDashboard() {
  const configured = isPropIntelConfigured();
  const { data: health, isLoading: healthLoading } = usePropIntelHealth();
  const { data: stats, isLoading: statsLoading } = usePropIntelStats();

  if (!configured) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-text-primary mb-4">
          Property Intelligence
        </h1>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
            <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
              Not Configured
            </h2>
          </div>
          <p className="text-yellow-700 dark:text-yellow-300">
            Property Intelligence requires VITE_PROPINTEL_API_URL and
            VITE_PROPINTEL_API_KEY environment variables. Contact your
            administrator.
          </p>
        </div>
      </div>
    );
  }

  const isLoading = healthLoading || statsLoading;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Property Intelligence
          </h1>
          <p className="text-text-secondary mt-1">
            On-premise property data from government databases across{" "}
            {stats?.states_covered ?? "..."} states
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/property-intelligence/search"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Search className="w-4 h-4" />
            Search Properties
          </Link>
          <Link
            to="/property-intelligence/map"
            className="inline-flex items-center gap-2 px-4 py-2 border border-border-primary rounded-lg text-text-primary hover:bg-bg-secondary transition-colors"
          >
            <Map className="w-4 h-4" />
            Map View
          </Link>
        </div>
      </div>

      {/* Connection Status */}
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
          health?.status === "healthy"
            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
            : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
        }`}
      >
        {healthLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : health?.status === "healthy" ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <XCircle className="w-4 h-4" />
        )}
        <span>
          T430 Data Server:{" "}
          {healthLoading
            ? "Connecting..."
            : health?.status === "healthy"
              ? `Connected (v${health.version})`
              : "Unavailable"}
        </span>
        {health && (
          <>
            <span className="mx-2 text-current/30">|</span>
            <HardDrive className="w-3.5 h-3.5" />
            <span>
              DB: {health.database} | NFS: {health.truenas_nfs}
            </span>
          </>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon={Database}
          label="Total Properties"
          value={stats ? formatNumber(stats.total_properties) : "—"}
          loading={isLoading}
          color="blue"
        />
        <KPICard
          icon={Droplets}
          label="Septic Properties"
          value={stats ? formatNumber(stats.septic_properties) : "—"}
          loading={isLoading}
          color="green"
        />
        <KPICard
          icon={FileText}
          label="Permits"
          value={stats ? formatNumber(stats.total_permits) : "—"}
          loading={isLoading}
          color="purple"
        />
        <KPICard
          icon={MapPin}
          label="States Covered"
          value={stats ? String(stats.states_covered) : "—"}
          loading={isLoading}
          color="orange"
        />
        <KPICard
          icon={AlertTriangle}
          label="Environmental Records"
          value={stats ? formatNumber(stats.environmental_records) : "—"}
          loading={isLoading}
          color="red"
        />
        <KPICard
          icon={Activity}
          label="Flood Zones"
          value={stats ? formatNumber(stats.flood_zone_records) : "—"}
          loading={isLoading}
          color="cyan"
        />
        <KPICard
          icon={Server}
          label="PDFs Extracted"
          value={
            stats
              ? `${formatNumber(stats.pdfs_extracted)}/${formatNumber(stats.pdf_extractions)}`
              : "—"
          }
          loading={isLoading}
          color="indigo"
        />
        <KPICard
          icon={MapPin}
          label="Geocoded"
          value={
            stats
              ? `${((stats.geocoded_properties / Math.max(stats.total_properties, 1)) * 100).toFixed(0)}%`
              : "—"
          }
          loading={isLoading}
          color="teal"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top States */}
        <div className="bg-bg-primary border border-border-primary rounded-lg p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Top States by Property Count
          </h2>
          {stats?.top_states && stats.top_states.length > 0 ? (
            <div className="space-y-3">
              {stats.top_states.map((s) => {
                const pct =
                  (s.count / Math.max(stats.total_properties, 1)) * 100;
                return (
                  <div key={s.state} className="flex items-center gap-3">
                    <span className="w-8 font-mono text-sm font-semibold text-text-primary">
                      {s.state}
                    </span>
                    <div className="flex-1 h-6 bg-bg-secondary rounded overflow-hidden">
                      <div
                        className="h-full bg-primary/20 rounded flex items-center"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      >
                        <span className="text-xs font-medium text-primary px-2 whitespace-nowrap">
                          {formatNumber(s.count)}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-text-secondary w-12 text-right">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-text-secondary text-sm">No data loaded yet.</p>
          )}
        </div>

        {/* Recent ETL Jobs */}
        <div className="bg-bg-primary border border-border-primary rounded-lg p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Recent Data Loads
          </h2>
          {stats?.recent_etl_jobs && stats.recent_etl_jobs.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_etl_jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {job.job_name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {job.started_at
                        ? new Date(job.started_at).toLocaleString()
                        : "Unknown"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        job.status === "completed"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : job.status === "running"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {job.status}
                    </span>
                    <p className="text-xs text-text-secondary mt-1">
                      {formatNumber(job.inserted)} inserted
                      {job.errors > 0 && ` | ${job.errors} errors`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary text-sm">No ETL jobs yet.</p>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLink
          to="/property-intelligence/search"
          icon={Search}
          title="Search Properties"
          description="Full-text search across 709M+ property records by address, city, county, or state"
        />
        <QuickLink
          to="/property-intelligence/map"
          icon={Map}
          title="Property Map"
          description="Interactive map with property markers and clustering"
        />
        <QuickLink
          to="/permits"
          icon={FileText}
          title="CRM Permits"
          description="View permits already linked to CRM customers"
        />
      </div>
    </div>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  loading,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  loading: boolean;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
    green:
      "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
    purple:
      "text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400",
    orange:
      "text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400",
    red: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400",
    cyan: "text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20 dark:text-cyan-400",
    indigo:
      "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400",
    teal: "text-teal-600 bg-teal-50 dark:bg-teal-900/20 dark:text-teal-400",
  };

  return (
    <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorMap[color] || colorMap.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-text-secondary">{label}</p>
          {loading ? (
            <div className="h-6 w-16 bg-bg-secondary rounded animate-pulse mt-0.5" />
          ) : (
            <p className="text-xl font-bold text-text-primary">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickLink({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string;
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group block p-5 bg-bg-primary border border-border-primary rounded-lg hover:border-primary/50 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors">
          {title}
        </h3>
        <ArrowRight className="w-4 h-4 ml-auto text-text-secondary group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </div>
      <p className="text-sm text-text-secondary">{description}</p>
    </Link>
  );
}
