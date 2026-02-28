import type { ImportRow } from "./store";
import type ExcelJSType from "exceljs";

/**
 * Parse an XLSX file (Sherrie Sheet format) into ImportRow[].
 * Supports both the original "All Contracts" format and the zone-tab format.
 */

// Original column header mapping (All Contracts 1030 style)
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

// Zone-tab column header mapping
const ZONE_HEADER_MAP: Record<string, keyof ImportRow> = {
  "call priority": "call_priority_label",
  "customer name": "account_name",
  "phone": "phone",
  "email": "email",
  "address": "address",
  "zip code": "zip_code",
  "service zone": "service_zone",
  "system/equipment": "system_type",
  "contract status": "contract_status",
  "latest contract end": "end_date",
  "latest contract start": "start_date",
  "contract type": "contract_type",
  "term (months)": "term_months",
  "renewal status": "contract_status",
  "days since expiry": "days_since_expiry",
  "customer type": "customer_type",
  "# contracts on file": "contract_number",
  "called": "disposition",
  "vm left": "notes",
  "callback date": "callback_date",
  "disposition": "disposition",
  "notes": "notes",
};

// Headers that indicate a zone-format sheet
const ZONE_SIGNATURE_HEADERS = ["call priority", "customer name", "service zone", "system/equipment"];

/**
 * Sheet metadata returned by scanXlsxSheets
 */
export interface SheetInfo {
  name: string;
  rowCount: number;
  isZone: boolean;
  headers: string[];
  sampleRows: Record<string, string>[];
}

/**
 * Scan all sheets in an XLSX file and return metadata without full parsing.
 */
export async function scanXlsxSheets(file: File): Promise<SheetInfo[]> {
  const buffer = await file.arrayBuffer();
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheets: SheetInfo[] = [];

  workbook.eachSheet((worksheet) => {
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    for (let col = 1; col <= headerRow.cellCount; col++) {
      const v = headerRow.getCell(col).value;
      if (v != null) headers.push(String(v));
    }

    const headersLower = headers.map((h) => h.toLowerCase().trim());
    const isZone = /^Zone \d+ - /i.test(worksheet.name) &&
      ZONE_SIGNATURE_HEADERS.every((sig) => headersLower.includes(sig));

    // Grab up to 3 sample rows
    const sampleRows: Record<string, string>[] = [];
    for (let r = 2; r <= Math.min(4, worksheet.rowCount); r++) {
      const row = worksheet.getRow(r);
      const sample: Record<string, string> = {};
      for (let col = 1; col <= headers.length; col++) {
        const v = row.getCell(col).value;
        if (v != null) sample[headers[col - 1]] = String(v);
      }
      if (Object.keys(sample).length > 0) sampleRows.push(sample);
    }

    sheets.push({
      name: worksheet.name,
      rowCount: worksheet.rowCount - 1, // exclude header
      isZone,
      headers,
      sampleRows,
    });
  });

  return sheets;
}

/**
 * Detect which header map to use based on sheet headers.
 */
function detectHeaderMap(headers: string[]): Record<string, keyof ImportRow> {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const zoneMatches = ZONE_SIGNATURE_HEADERS.filter((sig) => lower.includes(sig)).length;
  return zoneMatches >= 2 ? ZONE_HEADER_MAP : HEADER_MAP;
}

/**
 * Parse specific sheets from an XLSX file.
 */
export async function parseXlsxSheets(
  file: File,
  sheetNames: string[],
): Promise<{ sheetName: string; rows: ImportRow[] }[]> {
  const buffer = await file.arrayBuffer();
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const results: { sheetName: string; rows: ImportRow[] }[] = [];

  for (const name of sheetNames) {
    const worksheet = workbook.getWorksheet(name);
    if (!worksheet) continue;
    const rows = parseWorksheet(worksheet);
    results.push({ sheetName: name, rows });
  }

  return results;
}

/**
 * Parse a single worksheet into ImportRow[] using auto-detected header mapping.
 */
function parseWorksheet(worksheet: ExcelJSType.Worksheet): ImportRow[] {
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  for (let col = 1; col <= headerRow.cellCount; col++) {
    const v = headerRow.getCell(col).value;
    headers.push(v != null ? String(v) : "");
  }

  const headerMap = detectHeaderMap(headers);

  // Build column → field mapping
  const fieldMap: Record<number, keyof ImportRow> = {};
  for (let col = 1; col <= headers.length; col++) {
    const headerText = headers[col - 1].toLowerCase().trim();
    if (headerText && headerMap[headerText]) {
      fieldMap[col] = headerMap[headerText];
    }
  }

  const rows: ImportRow[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const parsed: Partial<ImportRow> = {};
    for (const [colStr, field] of Object.entries(fieldMap)) {
      const col = Number(colStr);
      const cell = row.getCell(col);
      const val = cell.value;

      if (val !== undefined && val !== null) {
        if (field === "term_months" || field === "days_since_expiry") {
          const num = typeof val === "number" ? val : parseInt(String(val), 10);
          (parsed as Record<string, unknown>)[field] = isNaN(num) ? undefined : num;
        } else {
          (parsed as Record<string, unknown>)[field] = String(val).trim();
        }
      }
    }

    // Must have phone to be callable
    if (!parsed.phone) return;

    parsed.phone = cleanPhone(parsed.phone);
    if (!parsed.phone) return;

    rows.push({
      account_number: parsed.account_number || "",
      account_name: parsed.account_name || "Unknown",
      company: parsed.company || "",
      contract_number: parsed.contract_number || "",
      phone: parsed.phone,
      email: parsed.email || "",
      contract_type: parsed.contract_type || "",
      start_date: parsed.start_date,
      end_date: parsed.end_date,
      term_months: parsed.term_months,
      address: parsed.address,
      zip_code: parsed.zip_code,
      service_zone: parsed.service_zone,
      system_type: parsed.system_type,
      contract_status: parsed.contract_status,
      days_since_expiry: parsed.days_since_expiry,
      customer_type: parsed.customer_type,
      call_priority_label: parsed.call_priority_label,
      notes: parsed.notes,
      callback_date: parsed.callback_date,
      disposition: parsed.disposition,
    });
  });

  return rows;
}

/**
 * Parse an XLSX file and return ImportRow[] — backward-compatible wrapper.
 * Picks the sheet with the most rows.
 */
export async function parseXlsxFile(file: File): Promise<{
  rows: ImportRow[];
  sheetName: string;
  totalRows: number;
  skippedRows: number;
}> {
  const buffer = await file.arrayBuffer();
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  let bestSheet: ExcelJSType.Worksheet | undefined;
  let bestRowCount = 0;

  workbook.eachSheet((worksheet) => {
    if (worksheet.rowCount > bestRowCount) {
      bestRowCount = worksheet.rowCount;
      bestSheet = worksheet;
    }
  });

  if (!bestSheet) {
    throw new Error("No sheets found in workbook");
  }

  const totalDataRows = bestSheet.rowCount - 1;
  const rows = parseWorksheet(bestSheet);

  return {
    rows,
    sheetName: bestSheet.name,
    totalRows: totalDataRows,
    skippedRows: totalDataRows - rows.length,
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
