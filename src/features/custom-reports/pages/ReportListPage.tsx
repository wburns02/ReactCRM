import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Star, BarChart3, Play, Trash2, FileDown, Clock, Database } from "lucide-react";
import { useReports, useDeleteReport, useToggleFavorite, useExportReport } from "@/api/hooks/useCustomReports.ts";
import { EmptyState } from "@/components/ui/EmptyState.tsx";
import type { CustomReport } from "@/api/types/customReports.ts";

const DATA_SOURCE_LABELS: Record<string, string> = {
  work_orders: "Work Orders",
  invoices: "Invoices",
  payments: "Payments",
  customers: "Customers",
  technicians: "Technicians",
  quotes: "Quotes",
  contracts: "Contracts",
};

export function ReportListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState<string | undefined>();
  const [favOnly, setFavOnly] = useState<boolean | undefined>();

  const { data, isLoading } = useReports(page, sourceFilter, favOnly);
  const deleteMut = useDeleteReport();
  const favMut = useToggleFavorite();
  const exportMut = useExportReport();

  const reports = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / (data?.page_size ?? 20));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Custom Reports</h1>
          <p className="text-sm text-text-muted mt-1">Build and run reports across your business data</p>
        </div>
        <Link
          to="/reports/custom/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium text-sm transition-colors"
        >
          <Plus size={16} /> New Report
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={sourceFilter ?? ""}
          onChange={(e) => { setSourceFilter(e.target.value || undefined); setPage(1); }}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-bg-primary text-text-primary"
        >
          <option value="">All Data Sources</option>
          {Object.entries(DATA_SOURCE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button
          onClick={() => { setFavOnly(favOnly ? undefined : true); setPage(1); }}
          className={`inline-flex items-center gap-1 text-sm px-3 py-2 rounded-lg border transition-colors ${
            favOnly ? "bg-yellow-50 border-yellow-300 text-yellow-700" : "border-border text-text-secondary hover:bg-bg-secondary"
          }`}
        >
          <Star size={14} fill={favOnly ? "currentColor" : "none"} /> Favorites
        </button>
        <span className="text-sm text-text-muted ml-auto">{total} report{total !== 1 ? "s" : ""}</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-bg-primary border border-border rounded-xl p-5 animate-pulse">
              <div className="h-5 bg-bg-secondary rounded w-3/4 mb-3" />
              <div className="h-4 bg-bg-secondary rounded w-1/2 mb-4" />
              <div className="h-8 bg-bg-secondary rounded w-full" />
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon="📊"
          title="No custom reports yet"
          description="Create your first report to analyze your business data"
          action={{ label: "Create Report", to: "/reports/custom/new" }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onView={() => navigate(`/reports/custom/${report.id}`)}
              onFavorite={() => favMut.mutate(report.id)}
              onExport={() => exportMut.mutate(report.id)}
              onDelete={() => { if (confirm(`Delete "${report.name}"?`)) deleteMut.mutate(report.id); }}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-bg-secondary"
          >
            Previous
          </button>
          <span className="text-sm text-text-muted">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-bg-secondary"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function ReportCard({
  report,
  onView,
  onFavorite,
  onExport,
  onDelete,
}: {
  report: CustomReport;
  onView: () => void;
  onFavorite: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-bg-primary border border-border rounded-xl p-5 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <button onClick={onView} className="text-left">
            <h3 className="font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
              {report.name}
            </h3>
          </button>
          {report.description && (
            <p className="text-xs text-text-muted mt-1 line-clamp-2">{report.description}</p>
          )}
        </div>
        <button onClick={onFavorite} className="p-1 shrink-0">
          <Star
            size={16}
            className={report.is_favorite ? "text-yellow-500 fill-yellow-500" : "text-text-muted hover:text-yellow-500"}
          />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
          <Database size={10} />
          {DATA_SOURCE_LABELS[report.data_source] || report.data_source}
        </span>
        <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
          <BarChart3 size={10} />
          {report.report_type}
        </span>
        {report.last_generated_at && (
          <span className="inline-flex items-center gap-1 text-xs text-text-muted">
            <Clock size={10} />
            {new Date(report.last_generated_at).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 pt-3 border-t border-border">
        <button
          onClick={onView}
          className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-medium text-primary hover:bg-primary/5 rounded-lg py-1.5 transition-colors"
        >
          <Play size={12} /> View
        </button>
        <button
          onClick={onExport}
          className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-medium text-text-secondary hover:bg-bg-secondary rounded-lg py-1.5 transition-colors"
        >
          <FileDown size={12} /> Export
        </button>
        <button
          onClick={onDelete}
          className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg py-1.5 transition-colors"
        >
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </div>
  );
}
