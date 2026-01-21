/**
 * EnerGov Direct API Scraper
 *
 * Uses the discovered API endpoint directly without browser.
 * Much faster than Playwright-based scraping.
 *
 * USAGE:
 *   npx tsx scrapers/energov/energov-api-scraper.ts
 *   npx tsx scrapers/energov/energov-api-scraper.ts --portal=doral_fl
 */

import * as fs from 'fs';
import * as path from 'path';
import { ENERGOV_PORTALS, EXTRACTION_CONFIG, EnerGovPortalConfig, getEnabledPortals } from './energov-config';

// ============================================
// TYPES
// ============================================

interface PermitRecord {
  permitNumber: string;
  address: string;
  city?: string;
  state: string;
  zipCode?: string;
  parcelNumber?: string;
  ownerName?: string;
  permitType?: string;
  permitTypeId?: string;
  workClass?: string;
  status?: string;
  appliedDate?: string;
  issuedDate?: string;
  expirationDate?: string;
  finalDate?: string;
  description?: string;
  contractor?: string;
  source: string;
  portal: string;
  portalUrl: string;
  scrapedAt: string;
  rawData: Record<string, unknown>;
}

interface Checkpoint {
  lastPortalId: string;
  lastPage: number;
  completedPortals: string[];
  totalRecordsExtracted: number;
  timestamp: string;
}

interface SearchResponse {
  Result?: {
    EntityResults?: unknown[];
    TotalPages?: number;
    PermitsFound?: number;
  };
  Success?: boolean;
  ErrorMessage?: string;
}

// ============================================
// GLOBALS
// ============================================

let totalRecordsExtracted = 0;

// ============================================
// HELPERS
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadCheckpoint(): Checkpoint | null {
  const checkpointFile = path.join(EXTRACTION_CONFIG.outputDir, 'api_checkpoint.json');
  try {
    if (fs.existsSync(checkpointFile)) {
      return JSON.parse(fs.readFileSync(checkpointFile, 'utf-8'));
    }
  } catch {}
  return null;
}

function saveCheckpoint(checkpoint: Checkpoint): void {
  const checkpointFile = path.join(EXTRACTION_CONFIG.outputDir, 'api_checkpoint.json');
  fs.writeFileSync(checkpointFile, JSON.stringify(checkpoint, null, 2));
}

function transformRecord(raw: Record<string, unknown>, portal: EnerGovPortalConfig): PermitRecord {
  const permitNumber = String(
    raw.CaseNumber || raw.PermitNumber || raw.permitNumber || raw.Number || ''
  );

  let address = '';
  let city = '';
  let zipCode = '';
  const addressObj = raw.Address as Record<string, unknown> | undefined;
  if (addressObj && typeof addressObj === 'object') {
    address = String(addressObj.AddressLine1 || addressObj.FullAddress || '');
    city = String(addressObj.City || '');
    zipCode = String(addressObj.PostalCode || '');
  } else if (raw.AddressDisplay) {
    const addrParts = String(raw.AddressDisplay).split(/\s{2,}/);
    address = addrParts[0] || String(raw.AddressDisplay);
  }

  let parcelNumber = '';
  if (raw.MainParcel && typeof raw.MainParcel === 'string') {
    const parcelMatch = raw.MainParcel.match(/^(\d+)/);
    parcelNumber = parcelMatch ? parcelMatch[1] : raw.MainParcel;
  }

  return {
    permitNumber,
    address,
    city,
    state: portal.state,
    zipCode,
    parcelNumber,
    ownerName: String(raw.OwnerName || raw.ApplicantName || raw.CompanyName || raw.DBA || ''),
    permitType: String(raw.CaseType || raw.PermitType || ''),
    permitTypeId: String(raw.CaseTypeId || ''),
    workClass: String(raw.CaseWorkclass || ''),
    status: String(raw.CaseStatus || raw.Status || ''),
    appliedDate: String(raw.ApplyDate || ''),
    issuedDate: String(raw.IssueDate || ''),
    expirationDate: String(raw.ExpireDate || ''),
    finalDate: String(raw.FinalDate || ''),
    description: String(raw.Description || raw.ProjectName || ''),
    contractor: String(raw.Contractor || ''),
    source: 'EnerGov',
    portal: portal.id,
    portalUrl: portal.baseUrl,
    scrapedAt: new Date().toISOString(),
    rawData: raw
  };
}

// ============================================
// API FUNCTIONS
// ============================================

function buildSearchPayload(pageNumber: number): object {
  return {
    Keyword: '',
    ExactMatch: false,
    SearchModule: 1,
    FilterModule: 1,
    SearchMainAddress: false,
    PlanCriteria: {
      PlanNumber: null,
      PlanTypeId: null,
      PlanWorkclassId: null,
      PlanStatusId: null,
      ProjectName: null,
      ApplyDateFrom: null,
      ApplyDateTo: null,
      ExpireDateFrom: null,
      ExpireDateTo: null,
      CompleteDateFrom: null,
      CompleteDateTo: null,
      Address: null,
      Description: null,
      SearchMainAddress: false,
      ContactId: null,
      ParcelNumber: null,
      TypeId: null,
      WorkClassId: null,
      StatusId: null,
      PageNumber: pageNumber,
      PageSize: 100,
      SortBy: 'CaseNumber',
      SortAscending: false
    },
    PermitCriteria: {
      PermitNumber: null,
      PermitTypeId: null,
      PermitWorkclassId: null,
      PermitStatusId: null,
      ProjectName: null,
      IssueDateFrom: null,
      IssueDateTo: null,
      Address: null,
      Description: null,
      SearchMainAddress: false,
      ContactId: null,
      ParcelNumber: null,
      TypeId: null,
      WorkClassId: null,
      StatusId: null,
      PageNumber: pageNumber,
      PageSize: 100,
      SortBy: 'CaseNumber',
      SortAscending: false
    },
    InspectionCriteria: {
      Keyword: null,
      ExactMatch: false,
      Complete: null,
      InspectionNumber: null,
      InspectionTypeId: null,
      InspectionStatusId: null,
      RequestDateFrom: null,
      RequestDateTo: null,
      ScheduleDateFrom: null,
      ScheduleDateTo: null,
      Address: null,
      SearchMainAddress: false,
      ContactId: null,
      TypeId: null,
      StatusId: null,
      PageNumber: pageNumber,
      PageSize: 100,
      SortBy: null,
      SortAscending: false
    },
    CodeCaseCriteria: {
      CodeCaseNumber: null,
      CodeCaseTypeId: null,
      CodeCaseStatusId: null,
      ProjectName: null,
      OpenedDateFrom: null,
      OpenedDateTo: null,
      ClosedDateFrom: null,
      ClosedDateTo: null,
      Address: null,
      ParcelNumber: null,
      Description: null,
      SearchMainAddress: false,
      PageNumber: pageNumber,
      PageSize: 100,
      SortBy: null,
      SortAscending: false
    },
    RequestCriteria: {
      RequestNumber: null,
      RequestTypeId: null,
      RequestStatusId: null,
      ProjectName: null,
      EnteredDateFrom: null,
      EnteredDateTo: null,
      DeadlineDateFrom: null,
      DeadlineDateTo: null,
      CompleteDateFrom: null,
      CompleteDateTo: null,
      Address: null,
      ParcelNumber: null,
      SearchMainAddress: false,
      PageNumber: pageNumber,
      PageSize: 100,
      SortBy: null,
      SortAscending: false
    },
    BusinessLicenseCriteria: {
      LicenseNumber: null,
      LicenseTypeId: null,
      LicenseClassId: null,
      LicenseStatusId: null,
      BusinessStatusId: null,
      LicenseYear: null,
      ApplicationDateFrom: null,
      ApplicationDateTo: null,
      IssueDateFrom: null,
      IssueDateTo: null,
      ExpirationDateFrom: null,
      ExpirationDateTo: null,
      SearchMainAddress: false,
      CompanyTypeId: null,
      CompanyName: null,
      BusinessTypeId: null,
      Description: null,
      CompanyId: null,
      ContactId: null,
      PageNumber: pageNumber,
      PageSize: 100,
      SortBy: null,
      SortAscending: false
    },
    ProfessionalLicenseCriteria: {
      LicenseNumber: null,
      HolderFirstName: null,
      HolderMiddleName: null,
      HolderLastName: null,
      HolderContactId: null,
      LicenseTypeId: null,
      LicenseClassId: null,
      LicenseStatusId: null,
      ApplicationDateFrom: null,
      ApplicationDateTo: null,
      IssueDateFrom: null,
      IssueDateTo: null,
      ExpirationDateFrom: null,
      ExpirationDateTo: null,
      PageNumber: pageNumber,
      PageSize: 100,
      SortBy: null,
      SortAscending: false
    },
    LicenseCriteria: null,
    ProjectCriteria: null,
    OperationCriteria: null
  };
}

async function searchPermits(portal: EnerGovPortalConfig, pageNumber: number): Promise<SearchResponse> {
  const apiUrl = `${portal.baseUrl}/apps/selfservice/api/energov/search/search`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: JSON.stringify(buildSearchPayload(pageNumber))
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ============================================
// EXTRACTION
// ============================================

async function extractPortal(
  portal: EnerGovPortalConfig,
  completedPortals: Set<string>,
  startPage: number = 1
): Promise<number> {
  if (completedPortals.has(portal.id)) {
    console.log(`  Skipping ${portal.name} (already completed)`);
    return 0;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Extracting: ${portal.name}, ${portal.state}`);
  console.log(`Portal: ${portal.baseUrl}`);
  console.log('='.repeat(60));

  // Ensure output directory
  if (!fs.existsSync(EXTRACTION_CONFIG.outputDir)) {
    fs.mkdirSync(EXTRACTION_CONFIG.outputDir, { recursive: true });
  }

  const outputFile = path.join(
    EXTRACTION_CONFIG.outputDir,
    `${portal.state.toLowerCase()}_${portal.id}.ndjson`
  );

  const writeStream = fs.createWriteStream(outputFile, { flags: 'a' });
  let portalRecords = 0;
  const seenPermits = new Set<string>();

  // Load existing permits to avoid duplicates
  if (fs.existsSync(outputFile)) {
    const existing = fs.readFileSync(outputFile, 'utf-8').split('\n').filter(Boolean);
    for (const line of existing) {
      try {
        const record = JSON.parse(line);
        if (record.permitNumber) {
          seenPermits.add(record.permitNumber);
        }
      } catch {}
    }
    console.log(`  Loaded ${seenPermits.size} existing permits`);
    portalRecords = seenPermits.size;
  }

  let page = startPage;
  let totalPages = 0;
  let totalPermits = 0;
  let consecutiveErrors = 0;

  try {
    // First request to get total count
    console.log(`  Making initial request...`);
    const initialResponse = await searchPermits(portal, 1);

    if (initialResponse.Result) {
      totalPages = initialResponse.Result.TotalPages || 0;
      totalPermits = initialResponse.Result.PermitsFound || 0;
      console.log(`  Total pages: ${totalPages.toLocaleString()}`);
      console.log(`  Total permits: ${totalPermits.toLocaleString()}`);
    }

    // Process pages
    while (page <= totalPages && page <= 10000) {  // Cap at 10K pages
      try {
        const response = await searchPermits(portal, page);

        if (response.Result?.EntityResults) {
          const records = response.Result.EntityResults as Record<string, unknown>[];
          let newRecords = 0;

          for (const raw of records) {
            const record = transformRecord(raw, portal);

            if (record.permitNumber && !seenPermits.has(record.permitNumber)) {
              seenPermits.add(record.permitNumber);
              writeStream.write(JSON.stringify(record) + '\n');
              portalRecords++;
              totalRecordsExtracted++;
              newRecords++;
            }
          }

          if (page % 50 === 0 || page === 1) {
            console.log(`  Page ${page}/${totalPages}: ${records.length} records (${newRecords} new, ${portalRecords} total)`);
          }

          consecutiveErrors = 0;
        } else {
          consecutiveErrors++;
          console.log(`  Page ${page}: No results`);
        }

        // Save checkpoint periodically
        if (page % 100 === 0) {
          saveCheckpoint({
            lastPortalId: portal.id,
            lastPage: page,
            completedPortals: Array.from(completedPortals),
            totalRecordsExtracted,
            timestamp: new Date().toISOString()
          });
        }

        page++;

        // Rate limiting
        await sleep(500);  // 500ms between requests

        // Stop if too many consecutive errors
        if (consecutiveErrors >= 5) {
          console.log(`  Too many errors, stopping at page ${page}`);
          break;
        }

      } catch (error) {
        consecutiveErrors++;
        console.log(`  Page ${page} error: ${error}`);

        if (consecutiveErrors >= 5) {
          console.log(`  Too many errors, stopping`);
          break;
        }

        await sleep(2000);  // Wait longer after error
      }
    }

  } catch (error) {
    console.log(`  Portal error: ${error}`);
  } finally {
    writeStream.end();
  }

  console.log(`\n  TOTAL for ${portal.name}: ${portalRecords} records`);
  console.log(`  Saved to: ${outputFile}`);

  return portalRecords;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('='.repeat(60));
  console.log('ENERGOV DIRECT API EXTRACTION');
  console.log('='.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Output directory: ${EXTRACTION_CONFIG.outputDir}`);

  // Ensure output directory
  if (!fs.existsSync(EXTRACTION_CONFIG.outputDir)) {
    fs.mkdirSync(EXTRACTION_CONFIG.outputDir, { recursive: true });
  }

  // Parse arguments
  const portalArg = process.argv.find(arg => arg.startsWith('--portal='));
  let portals = getEnabledPortals();

  if (portalArg) {
    const portalId = portalArg.split('=')[1];
    const portal = ENERGOV_PORTALS.find(p => p.id === portalId);
    if (portal) {
      portals = [portal];
      console.log(`Processing single portal: ${portal.name}`);
    } else {
      console.log(`Portal not found: ${portalId}`);
      console.log(`Available: ${ENERGOV_PORTALS.map(p => p.id).join(', ')}`);
      process.exit(1);
    }
  }

  // Load checkpoint
  const checkpoint = loadCheckpoint();
  const completedPortals = new Set<string>(checkpoint?.completedPortals || []);
  totalRecordsExtracted = checkpoint?.totalRecordsExtracted || 0;

  console.log(`\nPortals to process: ${portals.length}`);
  console.log(`Already completed: ${completedPortals.size}`);
  console.log(`Records from previous runs: ${totalRecordsExtracted}`);

  // Get total estimated
  const totalEstimated = portals.reduce((sum, p) => sum + p.estimatedRecords, 0);
  console.log(`Total estimated records: ${totalEstimated.toLocaleString()}`);

  // Process portals
  for (let i = 0; i < portals.length; i++) {
    const portal = portals[i];
    console.log(`\n[${i + 1}/${portals.length}] Processing...`);

    try {
      const startPage = checkpoint?.lastPortalId === portal.id ? checkpoint.lastPage : 1;
      const records = await extractPortal(portal, completedPortals, startPage);

      if (records > 0) {
        completedPortals.add(portal.id);
        saveCheckpoint({
          lastPortalId: portal.id,
          lastPage: 0,
          completedPortals: Array.from(completedPortals),
          totalRecordsExtracted,
          timestamp: new Date().toISOString()
        });
      }

      await sleep(2000);  // 2s between portals

    } catch (error) {
      console.log(`  Error: ${error}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('EXTRACTION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Completed: ${new Date().toISOString()}`);
  console.log(`Portals processed: ${completedPortals.size}`);
  console.log(`Total records: ${totalRecordsExtracted.toLocaleString()}`);
}

main().catch(console.error);
