import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Database, Columns3, Filter, BarChart3,
  Calendar, Save, Play, CheckCircle, Loader2,
} from "lucide-react";
import { useDataSources, useCreateReport, useUpdateReport, useReport, usePreviewReport } from "@/api/hooks/useCustomReports.ts";
import { FieldSelector } from "../components/FieldSelector.tsx";
import { FilterBuilder } from "../components/FilterBuilder.tsx";
import { ReportChart } from "../components/ReportChart.tsx";
import { DataTable } from "../components/DataTable.tsx";
import type { ReportColumn, ReportFilter, ReportFormData } from "@/api/types/customReports.ts";

const STEPS = [
  { label: "Data Source", icon: Database },
  { label: "Columns", icon: Columns3 },
  { label: "Filters", icon: Filter },
  { label: "Grouping & Sort", icon: BarChart3 },
  { label: "Date Range", icon: Calendar },
  { label: "Preview & Save", icon: CheckCircle },
];

const DATE_RANGE_PRESETS = [
  { value: "all", label: "All Time" },
  { value: "last_7d", label: "Last 7 Days" },
  { value: "last_30d", label: "Last 30 Days" },
  { value: "last_90d", label: "Last 90 Days" },
  { value: "ytd", label: "Year to Date" },
  { value: "custom", label: "Custom Range" },
];

const CHART_TYPES = [
  { value: "table", label: "Table Only" },
  { value: "bar", label: "Bar Chart" },
  { value: "line", label: "Line Chart" },
  { value: "pie", label: "Pie Chart" },
  { value: "area", label: "Area Chart" },
];

export function ReportBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: dataSources, isLoading: loadingSources } = useDataSources();
  const { data: existingReport } = useReport(id);
  const createMut = useCreateReport();
  const updateMut = useUpdateReport();
  const previewMut = usePreviewReport();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ReportFormData>({
    name: "",
    description: "",
    report_type: "table",
    data_source: "",
    columns: [],
    filters: [],
    group_by: [],
    sort_by: null,
    date_range: null,
    chart_config: null,
    is_shared: false,
  });
  const [initialized, setInitialized] = useState(false);

  // Populate form from existing report (edit mode)
  if (isEdit && existingReport && !initialized) {
    setForm({
      name: existingReport.name,
      description: existingReport.description || "",
      report_type: existingReport.report_type,
      data_source: existingReport.data_source,
      columns: existingReport.columns,
      filters: existingReport.filters,
      group_by: existingReport.group_by,
      sort_by: existingReport.sort_by || null,
      date_range: existingReport.date_range || null,
      chart_config: existingReport.chart_config || null,
      is_shared: existingReport.is_shared,
    });
    setInitialized(true);
  }

  const currentSource = useMemo(() => {
    if (!dataSources || !form.data_source) return null;
    return dataSources[form.data_source] || null;
  }, [dataSources, form.data_source]);

  const fields = currentSource?.fields ?? [];
  const aggregations = currentSource?.aggregations ?? [];

  const canNext = () => {
    if (step === 0) return !!form.data_source && !!form.name;
    return true;
  };

  const handlePreview = () => {
    previewMut.mutate({
      data_source: form.data_source,
      columns: form.columns,
      filters: form.filters,
      group_by: form.group_by,
      sort_by: form.sort_by,
      date_range: form.date_range,
    });
  };

  const handleSave = () => {
    if (isEdit && id) {
      updateMut.mutate(
        { id, data: form },
        { onSuccess: (report) => navigate(`/reports/custom/${report.id}`) },
      );
    } else {
      createMut.mutate(form, {
        onSuccess: (report) => navigate(`/reports/custom/${report.id}`),
      });
    }
  };

  if (loadingSources) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/reports/custom")} className="text-text-muted hover:text-text-primary">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-text-primary">
          {isEdit ? "Edit Report" : "New Report"}
        </h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <button
              key={i}
              onClick={() => i <= step && setStep(i)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-primary text-white"
                  : isDone
                    ? "bg-green-50 text-green-700 hover:bg-green-100"
                    : "text-text-muted"
              }`}
            >
              <Icon size={14} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="bg-bg-primary border border-border rounded-xl p-6 min-h-[300px]">
        {step === 0 && (
          <StepDataSource
            dataSources={dataSources ?? {}}
            form={form}
            onChange={(updates) => setForm((f) => ({ ...f, ...updates }))}
          />
        )}
        {step === 1 && (
          <StepColumns
            fields={fields}
            aggregations={aggregations}
            columns={form.columns}
            onChange={(columns) => setForm((f) => ({ ...f, columns }))}
          />
        )}
        {step === 2 && (
          <StepFilters
            fields={fields}
            filters={form.filters}
            onChange={(filters) => setForm((f) => ({ ...f, filters }))}
          />
        )}
        {step === 3 && (
          <StepGroupSort
            fields={fields}
            groupBy={form.group_by}
            sortBy={form.sort_by}
            reportType={form.report_type}
            onGroupByChange={(group_by) => setForm((f) => ({ ...f, group_by }))}
            onSortByChange={(sort_by) => setForm((f) => ({ ...f, sort_by }))}
            onReportTypeChange={(report_type) => setForm((f) => ({ ...f, report_type }))}
          />
        )}
        {step === 4 && (
          <StepDateRange
            dateRange={form.date_range}
            defaultDateField={currentSource?.default_date_field ?? "created_at"}
            onChange={(date_range) => setForm((f) => ({ ...f, date_range }))}
          />
        )}
        {step === 5 && (
          <StepPreview
            form={form}
            previewData={previewMut.data}
            isLoading={previewMut.isPending}
            onPreview={handlePreview}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="inline-flex items-center gap-1 px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary rounded-lg disabled:opacity-40 transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-2">
          {step === 5 ? (
            <button
              onClick={handleSave}
              disabled={createMut.isPending || updateMut.isPending || !form.name}
              className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium text-sm disabled:opacity-50 transition-colors"
            >
              {(createMut.isPending || updateMut.isPending) ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {isEdit ? "Update Report" : "Save Report"}
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              disabled={!canNext()}
              className="inline-flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              Next <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Step 0: Data Source ── */
function StepDataSource({
  dataSources,
  form,
  onChange,
}: {
  dataSources: Record<string, { label: string; fields: unknown[] }>;
  form: ReportFormData;
  onChange: (updates: Partial<ReportFormData>) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Report Name *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Monthly Revenue by Status"
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-primary text-text-primary focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Description</label>
        <textarea
          value={form.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
          placeholder="What does this report track?"
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-primary text-text-primary focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">Data Source *</label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(dataSources).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => onChange({ data_source: key, columns: [], filters: [], group_by: [] })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                form.data_source === key
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <Database size={20} className={form.data_source === key ? "text-primary" : "text-text-muted"} />
              <p className="font-medium text-sm mt-2 text-text-primary">{meta.label}</p>
              <p className="text-xs text-text-muted">{meta.fields.length} fields</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Step 1: Columns ── */
function StepColumns({
  fields,
  aggregations,
  columns,
  onChange,
}: {
  fields: { name: string; type: string; label: string; options?: string[] }[];
  aggregations: string[];
  columns: ReportColumn[];
  onChange: (cols: ReportColumn[]) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-1">Select Columns</h3>
        <p className="text-xs text-text-muted mb-4">Choose which fields to include in your report. Leave empty to use defaults.</p>
      </div>
      <FieldSelector availableFields={fields} selectedColumns={columns} aggregations={aggregations} onChange={onChange} />
    </div>
  );
}

/* ── Step 2: Filters ── */
function StepFilters({
  fields,
  filters,
  onChange,
}: {
  fields: { name: string; type: string; label: string; options?: string[] }[];
  filters: ReportFilter[];
  onChange: (f: ReportFilter[]) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-1">Filters</h3>
        <p className="text-xs text-text-muted mb-4">Narrow down your data with conditions. Leave empty for all records.</p>
      </div>
      <FilterBuilder fields={fields} filters={filters} onChange={onChange} />
    </div>
  );
}

/* ── Step 3: Grouping & Sort ── */
function StepGroupSort({
  fields,
  groupBy,
  sortBy,
  reportType,
  onGroupByChange,
  onSortByChange,
  onReportTypeChange,
}: {
  fields: { name: string; type: string; label: string }[];
  groupBy: string[];
  sortBy: { field: string; direction: string } | null | undefined;
  reportType: string;
  onGroupByChange: (g: string[]) => void;
  onSortByChange: (s: { field: string; direction: string } | null) => void;
  onReportTypeChange: (t: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Chart type */}
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-2">Report Type</h3>
        <div className="flex gap-2 flex-wrap">
          {CHART_TYPES.map((ct) => (
            <button
              key={ct.value}
              onClick={() => onReportTypeChange(ct.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                reportType === ct.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-text-secondary hover:bg-bg-secondary"
              }`}
            >
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Group by */}
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-2">Group By</h3>
        <div className="flex gap-2 flex-wrap">
          {fields.map((f) => (
            <button
              key={f.name}
              onClick={() =>
                onGroupByChange(
                  groupBy.includes(f.name)
                    ? groupBy.filter((g) => g !== f.name)
                    : [...groupBy, f.name],
                )
              }
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                groupBy.includes(f.name)
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-text-secondary hover:bg-bg-secondary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-2">Sort By</h3>
        <div className="flex items-center gap-2">
          <select
            value={sortBy?.field ?? ""}
            onChange={(e) =>
              onSortByChange(e.target.value ? { field: e.target.value, direction: sortBy?.direction ?? "asc" } : null)
            }
            className="text-sm border border-border rounded-lg px-3 py-2 bg-bg-primary text-text-primary"
          >
            <option value="">None</option>
            {fields.map((f) => (
              <option key={f.name} value={f.name}>{f.label}</option>
            ))}
          </select>
          {sortBy?.field && (
            <select
              value={sortBy.direction}
              onChange={(e) => onSortByChange({ ...sortBy, direction: e.target.value })}
              className="text-sm border border-border rounded-lg px-3 py-2 bg-bg-primary text-text-primary"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Step 4: Date Range ── */
function StepDateRange({
  dateRange,
  defaultDateField,
  onChange,
}: {
  dateRange: Record<string, unknown> | null | undefined;
  defaultDateField: string;
  onChange: (d: Record<string, unknown> | null) => void;
}) {
  const rangeType = (dateRange?.type as string) || "all";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-1">Date Range</h3>
        <p className="text-xs text-text-muted mb-4">
          Filter by <span className="font-medium">{defaultDateField.replace(/_/g, " ")}</span> field
        </p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {DATE_RANGE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() =>
              onChange(preset.value === "all" ? null : { type: preset.value })
            }
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              rangeType === preset.value || (preset.value === "all" && !dateRange)
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-text-secondary hover:bg-bg-secondary"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {rangeType === "custom" && (
        <div className="flex items-center gap-3 mt-3">
          <div>
            <label className="text-xs text-text-muted mb-1 block">Start Date</label>
            <input
              type="date"
              value={(dateRange?.start as string) || ""}
              onChange={(e) => onChange({ ...dateRange, type: "custom", start: e.target.value })}
              className="text-sm border border-border rounded-lg px-3 py-2 bg-bg-primary text-text-primary"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">End Date</label>
            <input
              type="date"
              value={(dateRange?.end as string) || ""}
              onChange={(e) => onChange({ ...dateRange, type: "custom", end: e.target.value })}
              className="text-sm border border-border rounded-lg px-3 py-2 bg-bg-primary text-text-primary"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Step 5: Preview & Save ── */
function StepPreview({
  form,
  previewData,
  isLoading,
  onPreview,
}: {
  form: ReportFormData;
  previewData?: { rows: Record<string, unknown>[]; summary: Record<string, unknown>; row_count: number; error?: string };
  isLoading: boolean;
  onPreview: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-text-primary">Preview</h3>
          <p className="text-xs text-text-muted">Run a preview to see sample results before saving.</p>
        </div>
        <button
          onClick={onPreview}
          disabled={isLoading || !form.data_source}
          className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          Run Preview
        </button>
      </div>

      {/* Summary */}
      <div className="bg-bg-secondary rounded-lg p-4 text-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <span className="text-text-muted">Data Source</span>
            <p className="font-medium text-text-primary">{form.data_source || "-"}</p>
          </div>
          <div>
            <span className="text-text-muted">Columns</span>
            <p className="font-medium text-text-primary">{form.columns.length || "Default"}</p>
          </div>
          <div>
            <span className="text-text-muted">Filters</span>
            <p className="font-medium text-text-primary">{form.filters.length || "None"}</p>
          </div>
          <div>
            <span className="text-text-muted">Type</span>
            <p className="font-medium text-text-primary">{form.report_type}</p>
          </div>
        </div>
      </div>

      {previewData?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {previewData.error}
        </div>
      )}

      {previewData && !previewData.error && (
        <>
          <p className="text-xs text-text-muted">{previewData.row_count} rows returned</p>
          {form.report_type !== "table" && previewData.rows.length > 0 && (
            <ReportChart
              rows={previewData.rows}
              chartType={form.report_type}
              groupBy={form.group_by}
              columns={form.columns}
            />
          )}
          <DataTable rows={previewData.rows} maxRows={20} />
        </>
      )}
    </div>
  );
}
