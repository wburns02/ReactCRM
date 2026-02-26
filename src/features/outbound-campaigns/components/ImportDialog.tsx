import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { parseXlsxFile } from "../parseXlsx";
import type { ImportRow } from "../store";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (rows: ImportRow[]) => void;
}

export function ImportDialog({ open, onClose, onImport }: ImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<{
    rows: ImportRow[];
    sheetName: string;
    totalRows: number;
    skippedRows: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setError(null);
    setResult(null);

    try {
      const parsed = await parseXlsxFile(file);
      setResult(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setParsing(false);
    }
  }

  function handleConfirm() {
    if (result) {
      onImport(result.rows);
      handleClose();
    }
  }

  function handleClose() {
    setResult(null);
    setError(null);
    setParsing(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-bg-card border border-border rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Import Call List from Excel
        </h2>

        <p className="text-sm text-text-secondary mb-4">
          Upload an XLSX file with contract/customer data. The file should have
          columns for Account Number, Account Name, Phone, Email, and Company.
          The <strong>Sherrie Sheet</strong> format is auto-detected.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
          className="block w-full text-sm text-text-secondary
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border file:border-border
            file:text-sm file:font-medium
            file:bg-bg-hover file:text-text-primary
            hover:file:bg-bg-card cursor-pointer"
        />

        {parsing && (
          <div className="mt-4 text-sm text-text-secondary flex items-center gap-2">
            <span className="animate-spin inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
            Parsing file...
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-2">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="text-sm font-medium text-emerald-800">
                Ready to import
              </div>
              <div className="text-xs text-emerald-600 mt-1 space-y-0.5">
                <div>Sheet: {result.sheetName}</div>
                <div>Total rows: {result.totalRows.toLocaleString()}</div>
                <div>
                  Valid contacts (with phone):{" "}
                  <strong>{result.rows.length.toLocaleString()}</strong>
                </div>
                <div>Skipped (no phone): {result.skippedRows.toLocaleString()}</div>
              </div>
            </div>

            {result.rows.length > 0 && (
              <div className="text-xs text-text-tertiary">
                Preview: {result.rows[0].account_name} ({result.rows[0].phone})
                {result.rows[0].company && ` — ${result.rows[0].company}`}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!result || result.rows.length === 0}
          >
            Import {result ? result.rows.length.toLocaleString() : 0} Contacts
          </Button>
        </div>
      </div>
    </div>
  );
}
