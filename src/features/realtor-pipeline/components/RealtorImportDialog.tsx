import { useState } from "react";
import { useRealtorStore } from "../store";
import { X, Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";

interface RealtorImportDialogProps {
  onClose: () => void;
}

export function RealtorImportDialog({ onClose }: RealtorImportDialogProps) {
  const importAgents = useRealtorStore((s) => s.importAgents);
  const [csvText, setCsvText] = useState("");
  const [result, setResult] = useState<{ imported: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleImport() {
    setError(null);
    setResult(null);

    const lines = csvText.trim().split("\n");
    if (lines.length < 2) {
      setError("Need at least a header row and one data row.");
      return;
    }

    const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));
    const rows: Array<Record<string, string>> = [];

    for (let i = 1; i < lines.length; i++) {
      const vals = parseCSVLine(lines[i]);
      if (vals.length === 0) continue;
      const row: Record<string, string> = {};
      header.forEach((h, idx) => {
        row[h] = vals[idx]?.trim() ?? "";
      });
      rows.push(row);
    }

    if (rows.length === 0) {
      setError("No valid data rows found.");
      return;
    }

    const mapped = rows.map((r) => ({
      first_name: r.first_name || r.first || r.name?.split(" ")[0] || "",
      last_name: r.last_name || r.last || r.name?.split(" ").slice(1).join(" ") || "",
      phone: r.phone || r.phone_number || r.cell || r.mobile || "",
      email: r.email || r.email_address || undefined,
      brokerage: r.brokerage || r.company || r.office || undefined,
      city: r.city || undefined,
      state: r.state || undefined,
      coverage_area: r.coverage_area || r.area || r.territory || undefined,
    }));

    const count = importAgents(mapped);
    setResult({ imported: count });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText(ev.target?.result as string || "");
    };
    reader.readAsText(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Import Agents from CSV
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="callout bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Expected CSV Format</p>
            <code className="text-xs block bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
              first_name,last_name,phone,email,brokerage,city,state,coverage_area
            </code>
            <p className="mt-1 text-xs text-blue-600 dark:text-blue-300">
              Column names are flexible: "first" / "first_name", "company" / "brokerage" / "office", etc.
            </p>
          </div>

          {/* File upload */}
          <div>
            <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/40 transition-colors">
              <Upload className="w-5 h-5 text-text-secondary" />
              <span className="text-sm text-text-secondary">
                Upload a .csv file or paste data below
              </span>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Paste area */}
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={`first_name,last_name,phone,email,brokerage,city,state\nSarah,Johnson,6155551234,sarah@kw.com,Keller Williams,Nashville,TN\nMike,Williams,6155559876,mike@remax.com,RE/MAX,Columbia,TN`}
            rows={8}
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg-card text-sm text-text-primary placeholder:text-text-secondary/40 font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />

          {/* Result */}
          {result && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">
              <Check className="w-5 h-5" />
              <span className="font-medium">
                Imported {result.imported} agent{result.imported !== 1 ? "s" : ""}.
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">Duplicates skipped (matched by phone).</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleImport}
              disabled={!csvText.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              Import Agents
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Parse a single CSV line, handling quoted fields */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
