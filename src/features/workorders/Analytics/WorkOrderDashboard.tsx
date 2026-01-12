/**
 * WorkOrderDashboard - Main analytics view for work orders
 * Combines KPIs, charts, technician performance, and predictive insights
 */

import { useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/Button.tsx";
import { Label } from "@/components/ui/Label.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import { JOB_TYPE_LABELS, type JobType } from "@/api/types/workOrder.ts";

import { KPICards } from "./KPICards.tsx";
import { TechnicianPerformance } from "./TechnicianPerformance.tsx";
import { RevenueChart } from "./RevenueChart.tsx";
import { CompletionRates } from "./CompletionRates.tsx";
import { CustomerSatisfaction } from "./CustomerSatisfaction.tsx";
import { PredictiveInsights } from "./PredictiveInsights.tsx";
import {
  ExportReports,
  type ReportType,
  type ExportFormat,
  type GeneratedReport,
} from "./ExportReports.tsx";
import {
  useAnalyticsDashboard,
  type DateRange,
  type AnalyticsFilters,
} from "./hooks/useAnalytics.ts";

interface WorkOrderDashboardProps {
  className?: string;
}

type DateRangePreset = "7d" | "30d" | "90d" | "1y" | "custom";
type ViewSection =
  | "overview"
  | "performance"
  | "revenue"
  | "predictions"
  | "export";

/**
 * Get date range from preset
 */
function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
  const end = new Date();
  const start = new Date();

  switch (preset) {
    case "7d":
      start.setDate(end.getDate() - 7);
      break;
    case "30d":
      start.setDate(end.getDate() - 30);
      break;
    case "90d":
      start.setDate(end.getDate() - 90);
      break;
    case "1y":
      start.setFullYear(end.getFullYear() - 1);
      break;
    default:
      start.setDate(end.getDate() - 30);
  }

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

/**
 * Filter bar component
 */
const FilterBar = memo(function FilterBar({
  dateRangePreset,
  customDateRange,
  selectedJobType,
  selectedTechnician,
  technicians,
  onDatePresetChange,
  onCustomDateChange,
  onJobTypeChange,
  onTechnicianChange,
  onRefresh,
  isLoading,
}: {
  dateRangePreset: DateRangePreset;
  customDateRange: DateRange;
  selectedJobType: JobType | "";
  selectedTechnician: string;
  technicians: { id: string; name: string }[];
  onDatePresetChange: (preset: DateRangePreset) => void;
  onCustomDateChange: (range: DateRange) => void;
  onJobTypeChange: (type: JobType | "") => void;
  onTechnicianChange: (techId: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-lg p-4 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        {/* Date Range Presets */}
        <div className="flex-shrink-0">
          <Label className="mb-2 block text-sm">Date Range</Label>
          <div className="flex items-center gap-1 bg-bg-muted rounded-md p-0.5">
            {(["7d", "30d", "90d", "1y", "custom"] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => onDatePresetChange(preset)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  dateRangePreset === preset
                    ? "bg-primary text-white"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                }`}
              >
                {preset === "7d"
                  ? "7 Days"
                  : preset === "30d"
                    ? "30 Days"
                    : preset === "90d"
                      ? "90 Days"
                      : preset === "1y"
                        ? "1 Year"
                        : "Custom"}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range */}
        {dateRangePreset === "custom" && (
          <>
            <div className="w-40">
              <Label className="mb-2 block text-sm">Start Date</Label>
              <Input
                type="date"
                value={customDateRange.start}
                onChange={(e) =>
                  onCustomDateChange({
                    ...customDateRange,
                    start: e.target.value,
                  })
                }
              />
            </div>
            <div className="w-40">
              <Label className="mb-2 block text-sm">End Date</Label>
              <Input
                type="date"
                value={customDateRange.end}
                onChange={(e) =>
                  onCustomDateChange({
                    ...customDateRange,
                    end: e.target.value,
                  })
                }
              />
            </div>
          </>
        )}

        {/* Job Type Filter */}
        <div className="w-48">
          <Label className="mb-2 block text-sm">Job Type</Label>
          <Select
            value={selectedJobType}
            onChange={(e) => onJobTypeChange(e.target.value as JobType | "")}
          >
            <option value="">All Job Types</option>
            {Object.entries(JOB_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {/* Technician Filter */}
        <div className="w-48">
          <Label className="mb-2 block text-sm">Technician</Label>
          <Select
            value={selectedTechnician}
            onChange={(e) => onTechnicianChange(e.target.value)}
          >
            <option value="">All Technicians</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Refresh Button */}
        <div className="flex-shrink-0">
          <Button variant="secondary" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? (
              <span className="animate-spin">&#8635;</span>
            ) : (
              <span>&#8635;</span>
            )}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </div>
    </div>
  );
});

/**
 * Section navigation tabs
 */
const SectionNav = memo(function SectionNav({
  activeSection,
  onSectionChange,
}: {
  activeSection: ViewSection;
  onSectionChange: (section: ViewSection) => void;
}) {
  const sections: { key: ViewSection; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "&#128200;" },
    { key: "performance", label: "Performance", icon: "&#128119;" },
    { key: "revenue", label: "Revenue", icon: "&#128176;" },
    { key: "predictions", label: "Predictions", icon: "&#128302;" },
    { key: "export", label: "Export", icon: "&#128190;" },
  ];

  return (
    <div className="flex items-center gap-1 mb-6 border-b border-border">
      {sections.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => onSectionChange(key)}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeSection === key
              ? "border-primary text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary hover:border-border"
          }`}
        >
          <span dangerouslySetInnerHTML={{ __html: icon }} />
          {label}
        </button>
      ))}
    </div>
  );
});

/**
 * Loading skeleton for the dashboard
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} variant="rounded" className="h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton variant="rounded" className="h-[400px]" />
        <Skeleton variant="rounded" className="h-[400px]" />
      </div>
    </div>
  );
}

/**
 * Main WorkOrderDashboard component
 */
export const WorkOrderDashboard = memo(function WorkOrderDashboard({
  className = "",
}: WorkOrderDashboardProps) {
  // State
  const [activeSection, setActiveSection] = useState<ViewSection>("overview");
  const [dateRangePreset, setDateRangePreset] =
    useState<DateRangePreset>("30d");
  const [customDateRange, setCustomDateRange] = useState<DateRange>(() =>
    getDateRangeFromPreset("30d"),
  );
  const [selectedJobType, setSelectedJobType] = useState<JobType | "">("");
  const [selectedTechnician, setSelectedTechnician] = useState<string>("");
  const [recentReports, setRecentReports] = useState<GeneratedReport[]>([]);

  // Compute active date range
  const activeDateRange =
    dateRangePreset === "custom"
      ? customDateRange
      : getDateRangeFromPreset(dateRangePreset);

  // Filters
  const filters: AnalyticsFilters = {
    dateRange: activeDateRange,
    technicianId: selectedTechnician || undefined,
    jobType: selectedJobType || undefined,
  };

  // Fetch data
  const {
    kpis,
    technicianMetrics,
    revenueData,
    completionRates,
    satisfaction,
    predictions,
    isLoading,
  } = useAnalyticsDashboard(filters);

  // Handlers
  const handleDatePresetChange = useCallback((preset: DateRangePreset) => {
    setDateRangePreset(preset);
    if (preset !== "custom") {
      setCustomDateRange(getDateRangeFromPreset(preset));
    }
  }, []);

  const handleRefresh = useCallback(() => {
    // Force refetch by updating a query parameter
    // In a real app, this would invalidate the query cache
    window.location.reload();
  }, []);

  const handleGenerateReport = useCallback(
    async (
      type: ReportType,
      format: ExportFormat,
      dateRange: DateRange,
    ): Promise<GeneratedReport> => {
      // Simulate report generation
      const report: GeneratedReport = {
        id: `report-${Date.now()}`,
        type,
        format,
        generatedAt: new Date().toISOString(),
        dateRange,
        status: "generating",
      };

      setRecentReports((prev) => [report, ...prev]);

      // Simulate async generation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const completedReport: GeneratedReport = {
        ...report,
        status: "ready",
        downloadUrl: "#",
        fileSize: Math.floor(50000 + Math.random() * 200000),
      };

      setRecentReports((prev) =>
        prev.map((r) => (r.id === report.id ? completedReport : r)),
      );

      return completedReport;
    },
    [],
  );

  // Derive technician list for filter
  const technicianList =
    technicianMetrics?.map((t) => ({ id: t.id, name: t.name })) || [];

  return (
    <div className={`p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          Work Order Analytics
        </h1>
        <p className="text-text-secondary mt-1">
          Comprehensive insights and performance metrics for your work order
          operations
        </p>
      </div>

      {/* Filter Bar */}
      <FilterBar
        dateRangePreset={dateRangePreset}
        customDateRange={customDateRange}
        selectedJobType={selectedJobType}
        selectedTechnician={selectedTechnician}
        technicians={technicianList}
        onDatePresetChange={handleDatePresetChange}
        onCustomDateChange={setCustomDateRange}
        onJobTypeChange={setSelectedJobType}
        onTechnicianChange={setSelectedTechnician}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      {/* Section Navigation */}
      <SectionNav
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Content */}
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Overview Section */}
          {activeSection === "overview" && (
            <>
              {/* KPI Cards */}
              <KPICards
                kpis={kpis.current || null}
                previousKpis={kpis.previous || null}
                isLoading={kpis.isLoading}
              />

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RevenueChart data={revenueData || []} showComparison={true} />
                <CompletionRates
                  statusDistribution={completionRates?.statusDistribution || []}
                  trendData={completionRates?.trendData || []}
                />
              </div>

              {/* Customer Satisfaction */}
              <CustomerSatisfaction
                overallScore={satisfaction?.overallScore || 0}
                totalResponses={satisfaction?.totalResponses || 0}
                npsScore={satisfaction?.npsScore || 0}
                ratingDistribution={satisfaction?.ratingDistribution || []}
                recentReviews={satisfaction?.recentReviews || []}
                trendData={satisfaction?.trendData || []}
              />
            </>
          )}

          {/* Performance Section */}
          {activeSection === "performance" && (
            <>
              <KPICards
                kpis={kpis.current || null}
                previousKpis={kpis.previous || null}
                isLoading={kpis.isLoading}
              />
              <TechnicianPerformance technicians={technicianMetrics || []} />
              <CustomerSatisfaction
                overallScore={satisfaction?.overallScore || 0}
                totalResponses={satisfaction?.totalResponses || 0}
                npsScore={satisfaction?.npsScore || 0}
                ratingDistribution={satisfaction?.ratingDistribution || []}
                recentReviews={satisfaction?.recentReviews || []}
                trendData={satisfaction?.trendData || []}
              />
            </>
          )}

          {/* Revenue Section */}
          {activeSection === "revenue" && (
            <>
              <KPICards
                kpis={kpis.current || null}
                previousKpis={kpis.previous || null}
                isLoading={kpis.isLoading}
              />
              <RevenueChart
                data={revenueData || []}
                showComparison={true}
                className="mb-6"
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CompletionRates
                  statusDistribution={completionRates?.statusDistribution || []}
                  trendData={completionRates?.trendData || []}
                />
                <TechnicianPerformance
                  technicians={technicianMetrics || []}
                  viewMode="chart"
                />
              </div>
            </>
          )}

          {/* Predictions Section */}
          {activeSection === "predictions" && (
            <>
              <PredictiveInsights
                demandForecast={predictions?.demandForecast || []}
                busyPeriodAlerts={predictions?.busyPeriodAlerts || []}
                equipmentAlerts={predictions?.equipmentAlerts || []}
                revenueProjections={predictions?.revenueProjections || []}
              />
            </>
          )}

          {/* Export Section */}
          {activeSection === "export" && (
            <ExportReports
              onGenerateReport={handleGenerateReport}
              recentReports={recentReports}
            />
          )}
        </div>
      )}
    </div>
  );
});

export default WorkOrderDashboard;
