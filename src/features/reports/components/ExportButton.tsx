import { useState } from 'react';
import { exportReport } from '../api.ts';
import type { DateRange, ExportFormat } from '../types.ts';

/**
 * ExportButton - Export report to CSV/PDF/Excel
 */

interface ExportButtonProps {
  reportType: string;
  dateRange?: DateRange;
  className?: string;
}

export function ExportButton({ reportType, dateRange, className = '' }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showFormats, setShowFormats] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setShowFormats(false);

    try {
      const blob = await exportReport(reportType, format, dateRange);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Set filename based on format
      const extension = format === 'excel' ? 'xlsx' : format;
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `${reportType}_report_${timestamp}.${extension}`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowFormats(!showFormats)}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <>
            <span className="animate-spin">⏳</span>
            Exporting...
          </>
        ) : (
          <>
            <span>📥</span>
            Export
          </>
        )}
      </button>

      {/* Format dropdown */}
      {showFormats && !isExporting && (
        <div className="absolute right-0 mt-2 w-48 bg-bg-card border border-border rounded-md shadow-lg z-10">
          <div className="py-1">
            <button
              onClick={() => handleExport('csv')}
              className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
            >
              Export as CSV
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
            >
              Export as Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
            >
              Export as PDF
            </button>
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {showFormats && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowFormats(false)}
        />
      )}
    </div>
  );
}
