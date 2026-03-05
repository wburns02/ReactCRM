import { Plus, X } from "lucide-react";
import type { DataSourceField, ReportFilter } from "@/api/types/customReports.ts";

const OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "is_empty", label: "Is Empty" },
  { value: "is_not_empty", label: "Is Not Empty" },
];

interface FilterBuilderProps {
  fields: DataSourceField[];
  filters: ReportFilter[];
  onChange: (filters: ReportFilter[]) => void;
}

export function FilterBuilder({ fields, filters, onChange }: FilterBuilderProps) {
  const addFilter = () => {
    if (!fields.length) return;
    onChange([...filters, { field: fields[0].name, operator: "equals", value: "" }]);
  };

  const removeFilter = (index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, updates: Partial<ReportFilter>) => {
    onChange(filters.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const getFieldOptions = (fieldName: string) => {
    return fields.find((f) => f.name === fieldName)?.options || [];
  };

  const needsValue = (op: string) => !["is_empty", "is_not_empty"].includes(op);

  return (
    <div className="space-y-3">
      {filters.map((filter, i) => {
        const options = getFieldOptions(filter.field);
        return (
          <div key={i} className="flex items-center gap-2 flex-wrap">
            <select
              value={filter.field}
              onChange={(e) => updateFilter(i, { field: e.target.value, value: "" })}
              className="text-sm border border-border rounded-lg px-3 py-1.5 bg-bg-primary text-text-primary"
            >
              {fields.map((f) => (
                <option key={f.name} value={f.name}>{f.label}</option>
              ))}
            </select>

            <select
              value={filter.operator}
              onChange={(e) => updateFilter(i, { operator: e.target.value })}
              className="text-sm border border-border rounded-lg px-3 py-1.5 bg-bg-primary text-text-primary"
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>

            {needsValue(filter.operator) && (
              options.length > 0 ? (
                <select
                  value={String(filter.value ?? "")}
                  onChange={(e) => updateFilter(i, { value: e.target.value })}
                  className="text-sm border border-border rounded-lg px-3 py-1.5 bg-bg-primary text-text-primary"
                >
                  <option value="">Select...</option>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={String(filter.value ?? "")}
                  onChange={(e) => updateFilter(i, { value: e.target.value })}
                  placeholder="Value"
                  className="text-sm border border-border rounded-lg px-3 py-1.5 bg-bg-primary text-text-primary w-40"
                />
              )
            )}

            <button onClick={() => removeFilter(i)} className="text-red-400 hover:text-red-500 p-1">
              <X size={16} />
            </button>
          </div>
        );
      })}
      <button
        onClick={addFilter}
        className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium"
      >
        <Plus size={14} /> Add Filter
      </button>
    </div>
  );
}
