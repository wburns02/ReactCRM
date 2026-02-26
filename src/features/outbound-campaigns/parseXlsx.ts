import type { ImportRow } from "./store";
import type ExcelJSType from "exceljs";

/**
 * Parse an XLSX file (Sherrie Sheet format) into ImportRow[].
 * Uses the ExcelJS library.
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
 * Parse an XLSX file and return ImportRow[].
 * Tries to find the sheet with contract data (most rows).
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

  // Find the sheet with the most data (likely "All Contracts 1030")
  let bestSheet: ExcelJSType.Worksheet | undefined;
  let bestRowCount = 0;

  workbook.eachSheet((worksheet) => {
    // rowCount includes the header, so actual data rows = rowCount - 1
    // but we just compare totals to pick the biggest sheet
    if (worksheet.rowCount > bestRowCount) {
      bestRowCount = worksheet.rowCount;
      bestSheet = worksheet;
    }
  });

  if (!bestSheet) {
    throw new Error("No sheets found in workbook");
  }

  const worksheet = bestSheet;

  // Read the header row (row 1) to build field mapping
  const headerRow = worksheet.getRow(1);
  const fieldMap: Record<number, keyof ImportRow> = {};
  const headerCount = headerRow.cellCount;

  for (let col = 1; col <= headerCount; col++) {
    const cell = headerRow.getCell(col);
    const headerText = cell.value != null ? String(cell.value).toLowerCase().trim() : "";
    if (headerText && HEADER_MAP[headerText]) {
      fieldMap[col] = HEADER_MAP[headerText];
    }
  }

  // Parse data rows (skip header at row 1)
  const rows: ImportRow[] = [];
  let skipped = 0;
  let totalDataRows = 0;

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    totalDataRows++;

    const parsed: Partial<ImportRow> = {};
    for (const [colStr, field] of Object.entries(fieldMap)) {
      const col = Number(colStr);
      const cell = row.getCell(col);
      const val = cell.value;

      if (val !== undefined && val !== null) {
        if (field === "term_months") {
          parsed[field] = typeof val === "number" ? val : parseInt(String(val), 10);
        } else {
          parsed[field] = String(val).trim();
        }
      }
    }

    // Must have phone to be callable
    if (!parsed.phone) {
      skipped++;
      return;
    }

    // Clean phone number
    parsed.phone = cleanPhone(parsed.phone);
    if (!parsed.phone) {
      skipped++;
      return;
    }

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
    });
  });

  return {
    rows,
    sheetName: worksheet.name,
    totalRows: totalDataRows,
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
