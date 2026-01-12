/**
 * CSV Column Mapper Component
 * Allows users to manually map CSV columns to customer fields
 */
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface CSVColumnMapperProps {
  headers: string[];
  sampleData: string[][];
  onMapComplete: (mapping: ColumnMapping) => void;
  onCancel: () => void;
}

export interface ColumnMapping {
  name: number | null;
  email: number | null;
  phone: number | null;
  address: number | null;
  city: number | null;
  state: number | null;
  zipCode: number | null;
}

const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  name: "Customer Name",
  email: "Email Address",
  phone: "Phone Number",
  address: "Street Address",
  city: "City",
  state: "State",
  zipCode: "ZIP Code",
};

const FIELD_HINTS: Record<keyof ColumnMapping, string[]> = {
  name: ["name", "customer", "full_name", "fullname", "customer_name"],
  email: ["email", "mail", "e-mail", "email_address"],
  phone: ["phone", "telephone", "tel", "mobile", "cell", "phone_number"],
  address: ["address", "street", "street_address", "addr"],
  city: ["city", "town"],
  state: ["state", "province", "region"],
  zipCode: ["zip", "zipcode", "zip_code", "postal", "postal_code"],
};

function autoDetectMapping(headers: string[]): ColumnMapping {
  const normalizedHeaders = headers.map((h) =>
    h
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "_"),
  );

  const mapping: ColumnMapping = {
    name: null,
    email: null,
    phone: null,
    address: null,
    city: null,
    state: null,
    zipCode: null,
  };

  (Object.keys(FIELD_HINTS) as (keyof ColumnMapping)[]).forEach((field) => {
    const hints = FIELD_HINTS[field];
    const index = normalizedHeaders.findIndex((h) =>
      hints.some((hint) => h.includes(hint)),
    );
    if (index !== -1) {
      mapping[field] = index;
    }
  });

  return mapping;
}

export function CSVColumnMapper({
  headers,
  sampleData,
  onMapComplete,
  onCancel,
}: CSVColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(() =>
    autoDetectMapping(headers),
  );

  const handleFieldChange = (
    field: keyof ColumnMapping,
    columnIndex: number | null,
  ) => {
    setMapping((prev) => ({ ...prev, [field]: columnIndex }));
  };

  const isValid = useMemo(() => {
    // At least name is required
    return mapping.name !== null;
  }, [mapping]);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-2">Map CSV Columns</h3>
      <p className="text-sm text-text-secondary mb-6">
        Match your CSV columns to customer fields. We've auto-detected some
        mappings.
      </p>

      {/* Preview Table */}
      <div className="mb-6 overflow-x-auto">
        <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
          <thead className="bg-bg-muted">
            <tr>
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-3 py-2 text-left font-medium text-text-primary border-b border-border"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sampleData.slice(0, 3).map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-border last:border-0">
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="px-3 py-2 text-text-secondary truncate max-w-[150px]"
                  >
                    {cell || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Field Mapping */}
      <div className="space-y-4">
        {(Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[]).map((field) => (
          <div key={field} className="flex items-center gap-4">
            <label className="w-32 text-sm font-medium text-text-primary flex items-center gap-1">
              {FIELD_LABELS[field]}
              {field === "name" && <span className="text-danger">*</span>}
            </label>
            <select
              value={mapping[field] ?? ""}
              onChange={(e) =>
                handleFieldChange(
                  field,
                  e.target.value ? parseInt(e.target.value) : null,
                )
              }
              className={cn(
                "flex-1 h-9 px-3 rounded-md border bg-white text-sm",
                mapping[field] !== null ? "border-success" : "border-border",
              )}
            >
              <option value="">-- Not mapped --</option>
              {headers.map((header, idx) => (
                <option key={idx} value={idx}>
                  {header}
                </option>
              ))}
            </select>
            {mapping[field] !== null && sampleData[0] && (
              <span className="text-xs text-text-muted truncate max-w-[150px]">
                e.g., {sampleData[0][mapping[field] as number] || "(empty)"}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onMapComplete(mapping)} disabled={!isValid}>
          Import Customers
        </Button>
      </div>
    </Card>
  );
}

export default CSVColumnMapper;
