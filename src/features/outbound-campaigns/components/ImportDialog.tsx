import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { scanXlsxSheets, parseXlsxSheets, parseXlsxFile } from "../parseXlsx";
import type { SheetInfo } from "../parseXlsx";
import type { ImportRow } from "../store";
import { useOutboundStore } from "../store";
import { ZONE_CONFIG } from "../types";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  /** Legacy single-campaign import (used when no zones detected or importing into existing campaign) */
  onImport: (rows: ImportRow[]) => void;
  /** Called after zone batch import with created campaign IDs */
  onZonesImported?: (campaignIds: string[]) => void;
}

type Step = "upload" | "zones" | "legacy-preview";

export function ImportDialog({ open, onClose, onImport, onZonesImported }: ImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  // Zone flow state
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set());

  // Legacy flow state
  const [legacyResult, setLegacyResult] = useState<{
    rows: ImportRow[];
    sheetName: string;
    totalRows: number;
    skippedRows: number;
  } | null>(null);

  // Keep a reference to the file for step 2 parsing
  const fileObjRef = useRef<File | null>(null);

  if (!open) return null;

  const zoneSheets = sheets.filter((s) => s.isZone);
  const totalZoneContacts = zoneSheets
    .filter((s) => selectedZones.has(s.name))
    .reduce((sum, s) => sum + s.rowCount, 0);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setError(null);
    setSheets([]);
    setLegacyResult(null);
    setFileName(file.name);
    fileObjRef.current = file;

    try {
      const scanned = await scanXlsxSheets(file);
      const zones = scanned.filter((s) => s.isZone);

      if (zones.length > 0) {
        setSheets(scanned);
        setSelectedZones(new Set(zones.map((z) => z.name)));
        setStep("zones");
      } else {
        // Fall back to legacy single-sheet import
        const parsed = await parseXlsxFile(file);
        setLegacyResult(parsed);
        setStep("legacy-preview");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setParsing(false);
    }
  }

  function toggleZone(name: string) {
    setSelectedZones((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function handleImportZones() {
    const file = fileObjRef.current;
    if (!file || selectedZones.size === 0) return;

    setImporting(true);
    setError(null);

    try {
      const sheetNames = zoneSheets
        .filter((s) => selectedZones.has(s.name))
        .map((s) => s.name);

      const parsed = await parseXlsxSheets(file, sheetNames);
      const ids = useOutboundStore
        .getState()
        .batchImportZones(parsed, fileName);

      onZonesImported?.(ids);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import zones");
    } finally {
      setImporting(false);
    }
  }

  function handleLegacyConfirm() {
    if (legacyResult) {
      onImport(legacyResult.rows);
      handleClose();
    }
  }

  function handleClose() {
    setStep("upload");
    setSheets([]);
    setSelectedZones(new Set());
    setLegacyResult(null);
    setError(null);
    setParsing(false);
    setImporting(false);
    setFileName("");
    fileObjRef.current = null;
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div
        className={`relative bg-bg-card border border-border rounded-xl shadow-xl w-full mx-4 p-6 ${
          step === "zones" ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Import Call List from Excel
        </h2>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <>
            <p className="text-sm text-text-secondary mb-4">
              Upload an XLSX file with contract/customer data. Zone-based
              sheets (Zone 1–5) are auto-detected and imported as separate
              campaigns.
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
                Scanning sheets...
              </div>
            )}
          </>
        )}

        {/* Step 2a: Zone confirmation */}
        {step === "zones" && (
          <>
            <p className="text-sm text-text-secondary mb-4">
              Detected <strong>{zoneSheets.length} service zone tabs</strong> in{" "}
              <span className="font-mono text-xs">{fileName}</span>. Each zone
              will be created as a separate campaign.
            </p>

            <div className="space-y-2 mb-4">
              {zoneSheets.map((sheet) => {
                const zoneConf = ZONE_CONFIG[sheet.name];
                const checked = selectedZones.has(sheet.name);
                return (
                  <label
                    key={sheet.name}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-bg-body"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleZone(sheet.name)}
                      className="rounded border-border"
                    />
                    {zoneConf && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${zoneConf.color}`}
                      >
                        {zoneConf.shortLabel}
                      </span>
                    )}
                    <span className="flex-1 text-sm font-medium text-text-primary">
                      {sheet.name}
                    </span>
                    <span className="text-sm text-text-secondary tabular-nums">
                      {sheet.rowCount.toLocaleString()} contacts
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="text-sm text-text-secondary mb-1">
              <strong>{selectedZones.size}</strong> zones,{" "}
              <strong>{totalZoneContacts.toLocaleString()}</strong> total contacts
            </div>
          </>
        )}

        {/* Step 2b: Legacy single-sheet preview */}
        {step === "legacy-preview" && legacyResult && (
          <div className="mt-4 space-y-2">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="text-sm font-medium text-emerald-800">
                Ready to import
              </div>
              <div className="text-xs text-emerald-600 mt-1 space-y-0.5">
                <div>Sheet: {legacyResult.sheetName}</div>
                <div>Total rows: {legacyResult.totalRows.toLocaleString()}</div>
                <div>
                  Valid contacts (with phone):{" "}
                  <strong>{legacyResult.rows.length.toLocaleString()}</strong>
                </div>
                <div>
                  Skipped (no phone): {legacyResult.skippedRows.toLocaleString()}
                </div>
              </div>
            </div>

            {legacyResult.rows.length > 0 && (
              <div className="text-xs text-text-tertiary">
                Preview: {legacyResult.rows[0].account_name} (
                {legacyResult.rows[0].phone})
                {legacyResult.rows[0].company &&
                  ` — ${legacyResult.rows[0].company}`}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>

          {step === "zones" && (
            <Button
              onClick={handleImportZones}
              disabled={selectedZones.size === 0 || importing}
            >
              {importing ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Importing...
                </span>
              ) : (
                `Import ${selectedZones.size} Zones (${totalZoneContacts.toLocaleString()} contacts)`
              )}
            </Button>
          )}

          {step === "legacy-preview" && (
            <Button
              onClick={handleLegacyConfirm}
              disabled={!legacyResult || legacyResult.rows.length === 0}
            >
              Import {legacyResult ? legacyResult.rows.length.toLocaleString() : 0}{" "}
              Contacts
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
