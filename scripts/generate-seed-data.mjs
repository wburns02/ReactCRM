#!/usr/bin/env node
/**
 * Parse the Sherrie Sheet XLSX and generate a static seed-data.ts file
 * for the outbound campaigns store. This ensures campaigns survive
 * localStorage clearing.
 *
 * Usage: node scripts/generate-seed-data.mjs "/path/to/Sherrie Sheet.xlsx"
 */
import ExcelJS from "exceljs";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Column header mapping for Sherrie Sheet format
const HEADER_MAP = {
  "call priority": "call_priority_label",
  "account #": "account_number",
  "customer name": "account_name",
  "phone": "phone",
  "email": "email",
  "address": "address",
  "zip code": "zip_code",
  "original company": "company",
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

// Sheets to import as campaigns (skip Dashboard, All, and view/sort sheets)
const CAMPAIGN_SHEETS = [
  "Hot Leads - Recently Expired",
  "Expired Under 1yr",
  "Expiring Soon - Call to Renew",
  "Win-Back (Expired 1yr+)",
  "Active - DO NOT CALL",
];

function cleanPhone(raw) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length >= 10) return digits.slice(-10);
  return "";
}

function cellToString(val) {
  if (val === null || val === undefined) return "";
  // ExcelJS sometimes returns { richText: [...] } objects
  if (typeof val === "object" && val.richText) {
    return val.richText.map(r => r.text || "").join("");
  }
  // Date objects
  if (val instanceof Date) {
    return val.toISOString().split("T")[0];
  }
  return String(val).trim();
}

async function main() {
  const xlsxPath = process.argv[2] || resolve("/home/will/Sherrie Sheet - Outbound Call Campaign.xlsx");

  console.log(`Reading: ${xlsxPath}`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);

  const campaigns = [];

  for (const sheetName of CAMPAIGN_SHEETS) {
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      console.log(`  SKIP: "${sheetName}" not found`);
      continue;
    }

    const headerRow = worksheet.getRow(1);
    const headers = [];
    for (let col = 1; col <= headerRow.cellCount; col++) {
      const v = headerRow.getCell(col).value;
      if (v != null) headers.push(cellToString(v));
      else headers.push("");
    }

    // Build column mapping
    const fieldMap = {};
    for (let col = 1; col <= headers.length; col++) {
      const headerText = headers[col - 1].toLowerCase().trim();
      if (headerText && HEADER_MAP[headerText]) {
        fieldMap[col] = HEADER_MAP[headerText];
      }
    }

    const rows = [];
    const seenPhones = new Set();

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const parsed = {};
      for (const [colStr, field] of Object.entries(fieldMap)) {
        const col = Number(colStr);
        const cell = row.getCell(col);
        const val = cell.value;

        if (val !== undefined && val !== null) {
          if (field === "term_months" || field === "days_since_expiry") {
            const num = typeof val === "number" ? val : parseInt(String(val), 10);
            if (!isNaN(num)) parsed[field] = num;
          } else {
            const str = cellToString(val);
            if (str) parsed[field] = str;
          }
        }
      }

      if (!parsed.phone) return;
      parsed.phone = cleanPhone(parsed.phone);
      if (!parsed.phone) return;

      // Deduplicate by phone within campaign
      if (seenPhones.has(parsed.phone)) return;
      seenPhones.add(parsed.phone);

      rows.push({
        account_number: parsed.account_number || "",
        account_name: parsed.account_name || "Unknown",
        company: parsed.company || "",
        phone: parsed.phone,
        email: parsed.email || "",
        contract_number: parsed.contract_number || "",
        contract_type: parsed.contract_type || "",
        address: parsed.address || undefined,
        zip_code: parsed.zip_code || undefined,
        service_zone: parsed.service_zone || undefined,
        system_type: parsed.system_type || undefined,
        contract_status: parsed.contract_status || undefined,
        start_date: parsed.start_date || undefined,
        end_date: parsed.end_date || undefined,
        days_since_expiry: parsed.days_since_expiry || undefined,
        customer_type: parsed.customer_type || undefined,
        call_priority_label: parsed.call_priority_label || undefined,
        notes: parsed.notes || undefined,
        callback_date: parsed.callback_date || undefined,
        disposition: parsed.disposition || undefined,
      });
    });

    console.log(`  ${sheetName}: ${rows.length} contacts with valid phone numbers`);
    campaigns.push({
      sheetName,
      isDNC: sheetName === "Active - DO NOT CALL",
      rows,
    });
  }

  const totalContacts = campaigns.reduce((sum, c) => sum + c.rows.length, 0);
  console.log(`\nTotal: ${campaigns.length} campaigns, ${totalContacts} contacts`);

  // Generate TypeScript file
  const outPath = resolve(__dirname, "../src/features/outbound-campaigns/seed-data.ts");

  // Strip undefined values to reduce file size
  const cleanCampaigns = campaigns.map(c => ({
    sheetName: c.sheetName,
    isDNC: c.isDNC,
    rows: c.rows.map(r => {
      const clean = {};
      for (const [k, v] of Object.entries(r)) {
        if (v !== undefined && v !== "") clean[k] = v;
      }
      return clean;
    }),
  }));

  const tsContent = `// Auto-generated by scripts/generate-seed-data.mjs
// Source: Sherrie Sheet - Outbound Call Campaign.xlsx
// ${campaigns.length} campaigns, ${totalContacts} contacts
// Generated: ${new Date().toISOString()}

import type { ImportRow } from "./store";

export interface SeedCampaign {
  sheetName: string;
  isDNC: boolean;
  rows: ImportRow[];
}

export const SEED_CAMPAIGNS: SeedCampaign[] = ${JSON.stringify(cleanCampaigns, null, 0)} as SeedCampaign[];

export const SEED_SOURCE_FILE = "Sherrie Sheet - Outbound Call Campaign.xlsx";
`;

  writeFileSync(outPath, tsContent);
  console.log(`\nWritten to: ${outPath}`);
  console.log(`File size: ${(Buffer.byteLength(tsContent) / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
