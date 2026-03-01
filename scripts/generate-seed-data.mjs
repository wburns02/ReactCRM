#!/usr/bin/env node
/**
 * Parse the Sherrie Sheet XLSX and generate geographical zone-based campaigns
 * sorted by distance from San Marcos, TX (78666).
 *
 * Zone 1 - Home Base: 0-15 miles
 * Zone 2 - Local: 15-30 miles
 * Zone 3 - Regional: 30-50 miles
 * Zone 4 - Extended: 50-75 miles
 * Zone 5 - Outer: 75+ miles
 *
 * Usage: node scripts/generate-seed-data.mjs ["/path/to/Sherrie Sheet.xlsx"]
 */
import ExcelJS from "exceljs";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const zipcodes = require("zipcodes");

// San Marcos, TX
const HOME_ZIP = "78666";

// Zone definitions by distance from San Marcos
const ZONES = [
  { name: "Zone 1 - Home Base", maxMiles: 15 },
  { name: "Zone 2 - Local", maxMiles: 30 },
  { name: "Zone 3 - Regional", maxMiles: 50 },
  { name: "Zone 4 - Extended", maxMiles: 75 },
  { name: "Zone 5 - Outer", maxMiles: Infinity },
];

// Column header mapping for Sherrie Sheet
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

function cleanPhone(raw) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length >= 10) return digits.slice(-10);
  return "";
}

function cleanZip(raw) {
  // Normalize to 5-digit zip
  const str = String(raw).trim();
  const match = str.match(/^(\d{5})/);
  return match ? match[1] : null;
}

function cellToString(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "object" && val.richText) {
    return val.richText.map(r => r.text || "").join("");
  }
  if (val instanceof Date) {
    return val.toISOString().split("T")[0];
  }
  return String(val).trim();
}

// Cache for zip distance lookups
const distanceCache = new Map();

function getDistance(zip) {
  if (distanceCache.has(zip)) return distanceCache.get(zip);
  const dist = zipcodes.distance(HOME_ZIP, zip);
  distanceCache.set(zip, dist);
  return dist;
}

function getZoneName(zip) {
  if (!zip) return ZONES[ZONES.length - 1].name; // No zip → Outer
  const dist = getDistance(zip);
  if (dist === null || dist === undefined) return ZONES[ZONES.length - 1].name;
  for (const zone of ZONES) {
    if (dist <= zone.maxMiles) return zone.name;
  }
  return ZONES[ZONES.length - 1].name;
}

async function main() {
  const xlsxPath = process.argv[2] || resolve("/home/will/Sherrie Sheet - Outbound Call Campaign.xlsx");
  console.log(`Reading: ${xlsxPath}`);
  console.log(`Home base: San Marcos, TX (${HOME_ZIP})`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);

  // Use the "All" sheet which has all contacts
  const worksheet = workbook.getWorksheet("All");
  if (!worksheet) {
    console.error("ERROR: 'All' sheet not found in workbook");
    process.exit(1);
  }

  // Parse headers
  const headerRow = worksheet.getRow(1);
  const headers = [];
  for (let col = 1; col <= headerRow.cellCount; col++) {
    const v = headerRow.getCell(col).value;
    headers.push(v ? cellToString(v) : "");
  }

  // Build column mapping
  const fieldMap = {};
  for (let col = 1; col <= headers.length; col++) {
    const headerText = headers[col - 1].toLowerCase().trim();
    if (headerText && HEADER_MAP[headerText]) {
      fieldMap[col] = HEADER_MAP[headerText];
    }
  }

  // Parse all rows
  const allRows = [];
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

    // Deduplicate by phone globally
    if (seenPhones.has(parsed.phone)) return;
    seenPhones.add(parsed.phone);

    // Clean and resolve zip code
    const zip = cleanZip(parsed.zip_code || "");

    // Determine zone and set service_zone
    const zoneName = getZoneName(zip);
    const dist = zip ? getDistance(zip) : null;

    allRows.push({
      account_number: parsed.account_number || "",
      account_name: parsed.account_name || "Unknown",
      company: parsed.company || "",
      phone: parsed.phone,
      email: parsed.email || "",
      contract_number: parsed.contract_number || "",
      contract_type: parsed.contract_type || "",
      address: parsed.address || undefined,
      zip_code: zip || undefined,
      service_zone: zoneName,
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
      _zone: zoneName,
      _distance: dist,
    });
  });

  console.log(`\nTotal contacts with valid phone: ${allRows.length}`);

  // Group by zone
  const zoneGroups = {};
  for (const zone of ZONES) {
    zoneGroups[zone.name] = [];
  }
  for (const row of allRows) {
    zoneGroups[row._zone].push(row);
  }

  // Sort each zone by distance (closest first), then by call priority
  const priorityOrder = { "high": 0, "medium": 1, "med": 1, "low": 2 };
  for (const [zoneName, rows] of Object.entries(zoneGroups)) {
    rows.sort((a, b) => {
      // First by distance
      const da = a._distance ?? 9999;
      const db = b._distance ?? 9999;
      if (da !== db) return da - db;
      // Then by priority (high first)
      const pa = priorityOrder[(a.call_priority_label || "").toLowerCase()] ?? 3;
      const pb = priorityOrder[(b.call_priority_label || "").toLowerCase()] ?? 3;
      return pa - pb;
    });
  }

  // Build campaigns
  const campaigns = [];
  for (const zone of ZONES) {
    const rows = zoneGroups[zone.name];
    if (rows.length === 0) continue;

    // Strip internal fields before output
    const cleanRows = rows.map(r => {
      const { _zone, _distance, ...rest } = r;
      // Also strip empty/undefined values
      const clean = {};
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined && v !== "") clean[k] = v;
      }
      return clean;
    });

    console.log(`  ${zone.name}: ${cleanRows.length} contacts (≤${zone.maxMiles === Infinity ? '∞' : zone.maxMiles} miles)`);
    campaigns.push({ sheetName: zone.name, rows: cleanRows });
  }

  const totalContacts = campaigns.reduce((sum, c) => sum + c.rows.length, 0);
  console.log(`\nTotal: ${campaigns.length} zones, ${totalContacts} contacts`);

  // Show distance distribution
  console.log("\nDistance distribution:");
  const distBuckets = [0, 5, 10, 15, 20, 30, 40, 50, 75, 100, 200, 500, Infinity];
  for (let i = 0; i < distBuckets.length - 1; i++) {
    const lo = distBuckets[i];
    const hi = distBuckets[i + 1];
    const count = allRows.filter(r => {
      const d = r._distance ?? 9999;
      return d >= lo && d < hi;
    }).length;
    if (count > 0) {
      console.log(`  ${lo}-${hi === Infinity ? '∞' : hi} miles: ${count}`);
    }
  }

  // Generate TypeScript file
  const outPath = resolve(__dirname, "../src/features/outbound-campaigns/seed-data.ts");

  const tsContent = `// Auto-generated by scripts/generate-seed-data.mjs
// Source: Sherrie Sheet - Outbound Call Campaign.xlsx
// Geographical zones based on distance from San Marcos, TX (78666)
// ${campaigns.length} zones, ${totalContacts} contacts
// Generated: ${new Date().toISOString()}

import type { ImportRow } from "./store";

export interface SeedCampaign {
  sheetName: string;
  rows: ImportRow[];
}

export const SEED_CAMPAIGNS: SeedCampaign[] = ${JSON.stringify(campaigns, null, 0)} as SeedCampaign[];

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
