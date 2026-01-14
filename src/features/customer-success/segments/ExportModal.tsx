/**
 * Export Modal Component
 *
 * Modal for configuring and downloading segment data exports.
 * Supports CSV and Excel formats with field selection.
 */

import { useState } from "react";
import { cn } from "@/lib/utils.ts";
import type { Segment } from "@/api/types/customerSuccess.ts";

interface ExportModalProps {
  segment: Segment;
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
  isExporting?: boolean;
}

export interface ExportOptions {
  format: "csv" | "excel";
  fields: string[];
  includeHealthScore: boolean;
  includeContactInfo: boolean;
  includeFinancials: boolean;
  includeTags: boolean;
  includeCustomFields: boolean;
}

interface FieldGroup {
  id: string;
  label: string;
  description: string;
  fields: { id: string; label: string }[];
  defaultSelected: boolean;
}

const FIELD_GROUPS: FieldGroup[] = [
  {
    id: "basic",
    label: "Basic Information",
    description: "Customer name, ID, and type",
    fields: [
      { id: "customer_id", label: "Customer ID" },
      { id: "name", label: "Customer Name" },
      { id: "customer_type", label: "Customer Type" },
      { id: "status", label: "Status" },
      { id: "created_at", label: "Created Date" },
    ],
    defaultSelected: true,
  },
  {
    id: "contact",
    label: "Contact Information",
    description: "Primary contact details",
    fields: [
      { id: "contact_name", label: "Contact Name" },
      { id: "email", label: "Email" },
      { id: "phone", label: "Phone" },
      { id: "address", label: "Address" },
      { id: "city", label: "City" },
      { id: "state", label: "State" },
      { id: "zip", label: "ZIP Code" },
    ],
    defaultSelected: true,
  },
  {
    id: "health",
    label: "Health Metrics",
    description: "Health scores and risk indicators",
    fields: [
      { id: "health_score", label: "Overall Health Score" },
      { id: "health_status", label: "Health Status" },
      { id: "churn_probability", label: "Churn Probability" },
      { id: "engagement_score", label: "Engagement Score" },
      { id: "adoption_score", label: "Adoption Score" },
      { id: "last_activity", label: "Last Activity" },
    ],
    defaultSelected: false,
  },
  {
    id: "financial",
    label: "Financial Data",
    description: "Revenue and contract information",
    fields: [
      { id: "arr", label: "ARR" },
      { id: "mrr", label: "MRR" },
      { id: "contract_value", label: "Contract Value" },
      { id: "contract_start", label: "Contract Start" },
      { id: "contract_end", label: "Contract End" },
      { id: "renewal_date", label: "Renewal Date" },
    ],
    defaultSelected: false,
  },
  {
    id: "segment",
    label: "Segment Data",
    description: "Segment membership information",
    fields: [
      { id: "segment_name", label: "Segment Name" },
      { id: "segment_entry_date", label: "Entry Date" },
      { id: "entry_reason", label: "Entry Reason" },
      { id: "tags", label: "Customer Tags" },
    ],
    defaultSelected: true,
  },
];

export function ExportModal({
  segment,
  isOpen,
  onClose,
  onExport,
  isExporting = false,
}: ExportModalProps) {
  const [format, setFormat] = useState<"csv" | "excel">("csv");
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
    new Set(FIELD_GROUPS.filter((g) => g.defaultSelected).map((g) => g.id)),
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleGroup = (groupId: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroups(newSelected);
  };

  const selectAll = () => {
    setSelectedGroups(new Set(FIELD_GROUPS.map((g) => g.id)));
  };

  const selectNone = () => {
    setSelectedGroups(new Set());
  };

  const getSelectedFields = (): string[] => {
    const fields: string[] = [];
    FIELD_GROUPS.forEach((group) => {
      if (selectedGroups.has(group.id)) {
        group.fields.forEach((field) => fields.push(field.id));
      }
    });
    return fields;
  };

  const handleExport = async () => {
    const selectedFields = getSelectedFields();
    if (selectedFields.length === 0) {
      setError("Please select at least one field group to export.");
      return;
    }

    setError(null);
    const options: ExportOptions = {
      format,
      fields: selectedFields,
      includeHealthScore: selectedGroups.has("health"),
      includeContactInfo: selectedGroups.has("contact"),
      includeFinancials: selectedGroups.has("financial"),
      includeTags: selectedGroups.has("segment"),
      includeCustomFields: false,
    };

    try {
      await onExport(options);
      onClose();
    } catch (err) {
      setError("Export failed. Please try again.");
      console.error("Export error:", err);
    }
  };

  const customerCount = segment.customer_count || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Export Segment
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Export {customerCount}{" "}
                {customerCount === 1 ? "customer" : "customers"} from "
                {segment.name}"
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Export Format
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg border transition-all",
                  format === "csv"
                    ? "border-primary bg-primary/10 dark:bg-primary/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400",
                )}
              >
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <div className="text-left">
                  <p
                    className={cn(
                      "font-medium",
                      format === "csv"
                        ? "text-primary"
                        : "text-gray-900 dark:text-white",
                    )}
                  >
                    CSV
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Comma-separated values
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat("excel")}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg border transition-all",
                  format === "excel"
                    ? "border-primary bg-primary/10 dark:bg-primary/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400",
                )}
              >
                <svg
                  className="w-8 h-8 text-green-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <div className="text-left">
                  <p
                    className={cn(
                      "font-medium",
                      format === "excel"
                        ? "text-primary"
                        : "text-gray-900 dark:text-white",
                    )}
                  >
                    Excel
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    .xlsx spreadsheet
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Field Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Fields to Export
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-primary hover:underline"
                >
                  Select All
                </button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                  type="button"
                  onClick={selectNone}
                  className="text-xs text-primary hover:underline"
                >
                  Select None
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {FIELD_GROUPS.map((group) => (
                <div
                  key={group.id}
                  className={cn(
                    "p-4 rounded-lg border cursor-pointer transition-all",
                    selectedGroups.has(group.id)
                      ? "border-primary bg-primary/5 dark:bg-primary/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300",
                  )}
                  onClick={() => toggleGroup(group.id)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                        selectedGroups.has(group.id)
                          ? "bg-primary border-primary"
                          : "border-gray-300 dark:border-gray-600",
                      )}
                    >
                      {selectedGroups.has(group.id) && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {group.label}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {group.fields.length} fields
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {group.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {group.fields.slice(0, 4).map((field) => (
                          <span
                            key={field.id}
                            className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded"
                          >
                            {field.label}
                          </span>
                        ))}
                        {group.fields.length > 4 && (
                          <span className="text-xs px-2 py-0.5 text-gray-500 dark:text-gray-400">
                            +{group.fields.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {getSelectedFields().length} fields selected
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || selectedGroups.size === 0}
              className={cn(
                "px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2",
                !isExporting && selectedGroups.size > 0
                  ? "bg-primary text-white hover:bg-primary-hover"
                  : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed",
              )}
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Exporting...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Export {format.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
