/**
 * ExportReports - Report generation and export functionality
 * Provides report type selection, date range picker, format selector, and download
 */

import { useState, useCallback, memo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Label } from '@/components/ui/Label.tsx';
import { Select } from '@/components/ui/Select.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { formatChartDateLong } from './utils/chartConfig.ts';

export type ReportType =
  | 'work_order_summary'
  | 'technician_performance'
  | 'revenue_analysis'
  | 'customer_satisfaction'
  | 'completion_rates'
  | 'equipment_utilization'
  | 'custom';

export type ExportFormat = 'pdf' | 'csv' | 'xlsx';

export interface ReportConfig {
  type: ReportType;
  label: string;
  description: string;
  icon: string;
  availableFormats: ExportFormat[];
}

export interface GeneratedReport {
  id: string;
  type: ReportType;
  format: ExportFormat;
  generatedAt: string;
  dateRange: { start: string; end: string };
  status: 'pending' | 'generating' | 'ready' | 'failed';
  downloadUrl?: string;
  fileSize?: number;
}

interface ExportReportsProps {
  onGenerateReport: (
    type: ReportType,
    format: ExportFormat,
    dateRange: { start: string; end: string },
    options?: Record<string, unknown>
  ) => Promise<GeneratedReport>;
  recentReports?: GeneratedReport[];
  isLoading?: boolean;
  className?: string;
}

const REPORT_CONFIGS: ReportConfig[] = [
  {
    type: 'work_order_summary',
    label: 'Work Order Summary',
    description: 'Overview of all work orders including status, types, and technician assignments',
    icon: '&#128221;',
    availableFormats: ['pdf', 'csv', 'xlsx'],
  },
  {
    type: 'technician_performance',
    label: 'Technician Performance',
    description: 'Individual and team metrics including jobs completed, ratings, and efficiency',
    icon: '&#128119;',
    availableFormats: ['pdf', 'csv', 'xlsx'],
  },
  {
    type: 'revenue_analysis',
    label: 'Revenue Analysis',
    description: 'Revenue breakdown by service type, technician, time period, and customer',
    icon: '&#128200;',
    availableFormats: ['pdf', 'csv', 'xlsx'],
  },
  {
    type: 'customer_satisfaction',
    label: 'Customer Satisfaction',
    description: 'NPS scores, ratings distribution, and customer feedback summary',
    icon: '&#128522;',
    availableFormats: ['pdf', 'xlsx'],
  },
  {
    type: 'completion_rates',
    label: 'Completion Rates',
    description: 'Job completion, cancellation, and follow-up rate analysis',
    icon: '&#10003;',
    availableFormats: ['pdf', 'csv', 'xlsx'],
  },
  {
    type: 'equipment_utilization',
    label: 'Equipment Utilization',
    description: 'Vehicle and equipment usage patterns and maintenance schedules',
    icon: '&#128663;',
    availableFormats: ['pdf', 'csv'],
  },
];

const FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: 'PDF Document',
  csv: 'CSV Spreadsheet',
  xlsx: 'Excel Workbook',
};

const FORMAT_ICONS: Record<ExportFormat, string> = {
  pdf: '&#128196;',
  csv: '&#128203;',
  xlsx: '&#128202;',
};

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Report type card for selection
 */
const ReportTypeCard = memo(function ReportTypeCard({
  config,
  isSelected,
  onSelect,
}: {
  config: ReportConfig;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full p-4 rounded-lg border text-left transition-all ${
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border hover:border-primary/30 hover:bg-bg-muted'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" dangerouslySetInnerHTML={{ __html: config.icon }} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-text-primary">{config.label}</p>
          <p className="text-sm text-text-secondary mt-1 line-clamp-2">{config.description}</p>
          <div className="flex items-center gap-2 mt-2">
            {config.availableFormats.map((format) => (
              <Badge key={format} variant="default" className="text-xs">
                {format.toUpperCase()}
              </Badge>
            ))}
          </div>
        </div>
        {isSelected && (
          <span className="text-primary text-xl">&#10003;</span>
        )}
      </div>
    </button>
  );
});

/**
 * Recent report row
 */
const ReportRow = memo(function ReportRow({
  report,
  onDownload,
}: {
  report: GeneratedReport;
  onDownload: (report: GeneratedReport) => void;
}) {
  const config = REPORT_CONFIGS.find((c) => c.type === report.type);

  const getStatusBadge = () => {
    switch (report.status) {
      case 'pending':
        return <Badge variant="default">Pending</Badge>;
      case 'generating':
        return <Badge variant="warning">Generating...</Badge>;
      case 'ready':
        return <Badge variant="success">Ready</Badge>;
      case 'failed':
        return <Badge variant="danger">Failed</Badge>;
    }
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-bg-muted transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="text-xl flex-shrink-0"
          dangerouslySetInnerHTML={{ __html: FORMAT_ICONS[report.format] }}
        />
        <div className="min-w-0">
          <p className="font-medium text-text-primary truncate">
            {config?.label || report.type}
          </p>
          <p className="text-xs text-text-muted">
            {formatChartDateLong(report.dateRange.start)} - {formatChartDateLong(report.dateRange.end)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {report.fileSize && (
          <span className="text-xs text-text-muted">{formatFileSize(report.fileSize)}</span>
        )}
        {getStatusBadge()}
        {report.status === 'ready' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDownload(report)}
          >
            Download
          </Button>
        )}
      </div>
    </div>
  );
});

/**
 * Loading skeleton
 */
function LoadingSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <Skeleton variant="text" className="h-6 w-48" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" className="h-32" />
          ))}
        </div>
      </div>
    </Card>
  );
}

/**
 * Main ExportReports component
 */
export const ExportReports = memo(function ExportReports({
  onGenerateReport,
  recentReports = [],
  isLoading = false,
  className = '',
}: ExportReportsProps) {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedConfig = REPORT_CONFIGS.find((c) => c.type === selectedType);

  const handleGenerate = useCallback(async () => {
    if (!selectedType) return;

    setIsGenerating(true);
    setError(null);

    try {
      await onGenerateReport(selectedType, selectedFormat, dateRange);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedType, selectedFormat, dateRange, onGenerateReport]);

  const handleDownload = useCallback((report: GeneratedReport) => {
    if (report.downloadUrl) {
      window.open(report.downloadUrl, '_blank');
    }
  }, []);

  const handleQuickRange = useCallback((days: number) => {
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
  }, []);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <Card className={`p-6 ${className}`}>
      <CardHeader className="p-0 mb-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Export Reports</CardTitle>
          {recentReports.length > 0 && (
            <Badge variant="default">
              {recentReports.filter((r) => r.status === 'ready').length} reports available
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 space-y-6">
        {/* Report Type Selection */}
        <div>
          <Label className="mb-3 block">Select Report Type</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {REPORT_CONFIGS.map((config) => (
              <ReportTypeCard
                key={config.type}
                config={config}
                isSelected={selectedType === config.type}
                onSelect={() => setSelectedType(config.type)}
              />
            ))}
          </div>
        </div>

        {/* Configuration */}
        {selectedType && (
          <div className="border-t border-border pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date Range */}
              <div>
                <Label className="mb-2 block">Start Date</Label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-2 block">End Date</Label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                />
              </div>
              {/* Format Selection */}
              <div>
                <Label className="mb-2 block">Export Format</Label>
                <Select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                >
                  {selectedConfig?.availableFormats.map((format) => (
                    <option key={format} value={format}>
                      {FORMAT_LABELS[format]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Quick date range buttons */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">Quick select:</span>
              {[7, 30, 90, 365].map((days) => (
                <button
                  key={days}
                  onClick={() => handleQuickRange(days)}
                  className="px-2 py-1 text-xs rounded-md bg-bg-muted text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  {days === 365 ? '1 Year' : `${days} Days`}
                </button>
              ))}
            </div>

            {/* Error display */}
            {error && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                {error}
              </div>
            )}

            {/* Generate Button */}
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={isGenerating || !selectedType}
                className="min-w-[150px]"
              >
                {isGenerating ? (
                  <>
                    <span className="animate-spin mr-2">&#8635;</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="mr-2">&#128190;</span>
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Recent Reports */}
        {recentReports.length > 0 && (
          <div className="border-t border-border pt-6">
            <h4 className="text-sm font-medium text-text-primary mb-3">Recent Reports</h4>
            <div className="space-y-2">
              {recentReports.slice(0, 5).map((report) => (
                <ReportRow
                  key={report.id}
                  report={report}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default ExportReports;
