import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Play, FileDown, Star, Pencil, Trash2, Loader2, BarChart3, Table,
} from "lucide-react";
import { useReport, useExecuteReport, useExportReport, useToggleFavorite, useDeleteReport } from "@/api/hooks/useCustomReports.ts";
import { ReportChart } from "../components/ReportChart.tsx";
import { DataTable } from "../components/DataTable.tsx";

export function ReportViewerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: report, isLoading } = useReport(id);
  const executeMut = useExecuteReport();
  const exportMut = useExportReport();
  const favMut = useToggleFavorite();
  const deleteMut = useDeleteReport();

  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  if (!report || !id) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted">Report not found.</p>
        <Link to="/reports/custom" className="text-primary text-sm mt-2 inline-block">Back to Reports</Link>
      </div>
    );
  }

  const results = executeMut.data;
  const hasChart = report.report_type !== "table";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/reports/custom")} className="text-text-muted hover:text-text-primary">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{report.name}</h1>
            {report.description && (
              <p className="text-sm text-text-muted mt-0.5">{report.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => favMut.mutate(id)}
            className="p-2 rounded-lg hover:bg-bg-secondary transition-colors"
            title="Toggle favorite"
          >
            <Star
              size={16}
              className={report.is_favorite ? "text-yellow-500 fill-yellow-500" : "text-text-muted"}
            />
          </button>
          <Link
            to={`/reports/custom/${id}/edit`}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-bg-secondary text-text-secondary transition-colors"
          >
            <Pencil size={14} /> Edit
          </Link>
          <button
            onClick={() => { if (confirm(`Delete "${report.name}"?`)) deleteMut.mutate(id, { onSuccess: () => navigate("/reports/custom") }); }}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-red-200 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Meta badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full font-medium">
          {report.data_source.replace(/_/g, " ")}
        </span>
        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
          {report.report_type}
        </span>
        {report.columns.length > 0 && (
          <span className="text-xs text-text-muted">{report.columns.length} columns</span>
        )}
        {report.filters.length > 0 && (
          <span className="text-xs text-text-muted">{report.filters.length} filters</span>
        )}
        {report.last_generated_at && (
          <span className="text-xs text-text-muted">
            Last run: {new Date(report.last_generated_at).toLocaleString()}
          </span>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => executeMut.mutate(id)}
          disabled={executeMut.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {executeMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          Run Report
        </button>
        <button
          onClick={() => exportMut.mutate(id)}
          disabled={exportMut.isPending}
          className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-border rounded-lg hover:bg-bg-secondary text-text-secondary transition-colors"
        >
          <FileDown size={14} /> Export CSV
        </button>
        {hasChart && results && (
          <div className="ml-auto flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("chart")}
              className={`px-3 py-1.5 text-sm ${viewMode === "chart" ? "bg-primary text-white" : "text-text-secondary hover:bg-bg-secondary"}`}
            >
              <BarChart3 size={14} />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 text-sm ${viewMode === "table" ? "bg-primary text-white" : "text-text-secondary hover:bg-bg-secondary"}`}
            >
              <Table size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {executeMut.isPending && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-primary mr-2" size={20} />
          <span className="text-text-muted text-sm">Running report...</span>
        </div>
      )}

      {results && !executeMut.isPending && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="bg-bg-secondary rounded-lg p-3 flex items-center gap-4 text-sm">
            <span className="text-text-primary font-medium">{results.row_count} rows</span>
            {results.execution_time_ms !== undefined && (
              <span className="text-text-muted">{results.execution_time_ms}ms</span>
            )}
          </div>

          {/* Chart */}
          {hasChart && viewMode === "chart" && results.rows.length > 0 && (
            <div className="bg-bg-primary border border-border rounded-xl p-4">
              <ReportChart
                rows={results.rows}
                chartType={report.report_type}
                groupBy={report.group_by}
                columns={report.columns}
              />
            </div>
          )}

          {/* Table (always show if table mode or table report type) */}
          {(viewMode === "table" || !hasChart) && (
            <DataTable rows={results.rows} />
          )}
        </div>
      )}

      {!results && !executeMut.isPending && (
        <div className="text-center py-12 text-text-muted">
          <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Click "Run Report" to execute this report and see results.</p>
        </div>
      )}
    </div>
  );
}
