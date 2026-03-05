import { Plus, X, GripVertical } from "lucide-react";
import type { DataSourceField, ReportColumn } from "@/api/types/customReports.ts";

interface FieldSelectorProps {
  availableFields: DataSourceField[];
  selectedColumns: ReportColumn[];
  aggregations: string[];
  onChange: (columns: ReportColumn[]) => void;
}

export function FieldSelector({ availableFields, selectedColumns, aggregations, onChange }: FieldSelectorProps) {
  const addColumn = (field: DataSourceField) => {
    if (selectedColumns.some((c) => c.field === field.name)) return;
    onChange([...selectedColumns, { field: field.name, label: field.label }]);
  };

  const removeColumn = (index: number) => {
    onChange(selectedColumns.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, updates: Partial<ReportColumn>) => {
    onChange(selectedColumns.map((c, i) => (i === index ? { ...c, ...updates } : c)));
  };

  const unselected = availableFields.filter((f) => !selectedColumns.some((c) => c.field === f.name));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Available fields */}
      <div>
        <h4 className="text-sm font-medium text-text-secondary mb-2">Available Fields</h4>
        <div className="border border-border rounded-lg divide-y divide-border max-h-80 overflow-y-auto">
          {unselected.length === 0 ? (
            <p className="text-sm text-text-muted p-3">All fields selected</p>
          ) : (
            unselected.map((field) => (
              <button
                key={field.name}
                onClick={() => addColumn(field)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg-secondary text-left transition-colors"
              >
                <Plus size={14} className="text-primary shrink-0" />
                <span className="text-sm text-text-primary">{field.label}</span>
                <span className="text-xs text-text-muted ml-auto">{field.type}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Selected columns */}
      <div>
        <h4 className="text-sm font-medium text-text-secondary mb-2">
          Selected Columns ({selectedColumns.length})
        </h4>
        <div className="border border-border rounded-lg divide-y divide-border max-h-80 overflow-y-auto">
          {selectedColumns.length === 0 ? (
            <p className="text-sm text-text-muted p-3">Click fields to add them</p>
          ) : (
            selectedColumns.map((col, i) => (
              <div key={col.field} className="flex items-center gap-2 px-3 py-2">
                <GripVertical size={14} className="text-text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={col.label || col.field}
                    onChange={(e) => updateColumn(i, { label: e.target.value })}
                    className="w-full text-sm bg-transparent border-0 p-0 focus:ring-0 text-text-primary"
                  />
                </div>
                {aggregations.length > 0 && (
                  <select
                    value={col.aggregation || ""}
                    onChange={(e) => updateColumn(i, { aggregation: e.target.value || undefined })}
                    className="text-xs border border-border rounded px-1 py-0.5 bg-bg-primary text-text-primary"
                  >
                    <option value="">Raw</option>
                    {aggregations.map((agg) => (
                      <option key={agg} value={agg}>{agg}</option>
                    ))}
                  </select>
                )}
                <button onClick={() => removeColumn(i)} className="text-red-400 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
