import type { ImportRow } from "./store";

/**
 * Parse an XLSX file (Sherrie Sheet format) into ImportRow[].
 * Uses the SheetJS library loaded from CDN at runtime.
 *
 * Expected "All Contracts 1030" columns:
 *   A: Account Number
 *   B: Account Name
 *   C: Original Company
 *   D: Contract Number
 *   I: Account Phone
 *   J: Account Email
 *   L: Type (Initial/Renewal/Transfer/Perpetual)
 */

interface SheetRow {
  [key: string]: string | number | undefined;
}

// Column header mapping - maps possible header names to our fields
const HEADER_MAP: Record<string, keyof ImportRow> = {
  "account name: account number": "account_number",
  "account number": "account_number",
  "account name: account name": "account_name",
  "account name": "account_name",
  "original company": "company",
  "company": "company",
  "contract number": "contract_number",
  "account phone": "phone",
  "phone": "phone",
  "account name: account email": "email",
  "email": "email",
  "type": "contract_type",
  "start date": "start_date",
  "end date": "end_date",
  "term (months)": "term_months",
};

/**
 * Load SheetJS (xlsx) library dynamically
 */
async function loadXLSX(): Promise<typeof import("xlsx")> {
  // Check if already loaded globally
  const win = window as unknown as { XLSX?: typeof import("xlsx") };
  if (win.XLSX) return win.XLSX;

  // Dynamic import - works with bundler
  try {
    const mod = await import("xlsx");
    return mod;
  } catch {
    throw new Error(
      "XLSX library not available. Install with: npm install xlsx",
    );
  }
}

/**
 * Parse an XLSX file and return ImportRow[].
 * Tries to find the sheet with contract data (most rows).
 */
export async function parseXlsxFile(file: File): Promise<{
  rows: ImportRow[];
  sheetName: string;
  totalRows: number;
  skippedRows: number;
}> {
  const XLSX = await loadXLSX();
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  // Find the sheet with the most data (likely "All Contracts 1030")
  let bestSheet = workbook.SheetNames[0];
  let bestRowCount = 0;

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json<SheetRow>(sheet);
    if (data.length > bestRowCount) {
      bestRowCount = data.length;
      bestSheet = name;
    }
  }

  const sheet = workbook.Sheets[bestSheet];
  const rawRows = XLSX.utils.sheet_to_json<SheetRow>(sheet);

  // Map headers to our fields
  const headers = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
  const fieldMap: Record<string, keyof ImportRow> = {};
  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    if (HEADER_MAP[normalized]) {
      fieldMap[header] = HEADER_MAP[normalized];
    }
  }

  // Parse rows
  const rows: ImportRow[] = [];
  let skipped = 0;

  for (const raw of rawRows) {
    const row: Partial<ImportRow> = {};
    for (const [header, field] of Object.entries(fieldMap)) {
      const val = raw[header];
      if (val !== undefined && val !== null) {
        if (field === "term_months") {
          row[field] = typeof val === "number" ? val : parseInt(String(val), 10);
        } else {
          row[field] = String(val).trim();
        }
      }
    }

    // Must have phone to be callable
    if (!row.phone) {
      skipped++;
      continue;
    }

    // Clean phone number
    row.phone = cleanPhone(row.phone);
    if (!row.phone) {
      skipped++;
      continue;
    }

    rows.push({
      account_number: row.account_number || "",
      account_name: row.account_name || "Unknown",
      company: row.company || "",
      contract_number: row.contract_number || "",
      phone: row.phone,
      email: row.email || "",
      contract_type: row.contract_type || "",
      start_date: row.start_date,
      end_date: row.end_date,
      term_months: row.term_months,
    });
  }

  return {
    rows,
    sheetName: bestSheet,
    totalRows: rawRows.length,
    skippedRows: skipped,
  };
}

/**
 * Clean a phone string to E.164-ish format
 */
function cleanPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length >= 10) return digits.slice(-10);
  return "";
}
