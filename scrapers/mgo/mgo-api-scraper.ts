/**
 * MGO Connect API-First Scraper
 *
 * Uses discovered API endpoints to directly query permit data,
 * bypassing the Angular UI entirely.
 *
 * DISCOVERED API STRUCTURE:
 * - Login: POST https://www.mygovernmentonline.org/api/user/login/-
 * - States: GET https://www.mygovernmentonline.org/api/helper/getstates/{token}
 * - Jurisdictions: GET https://api.mgoconnect.org/api/v3/cp/public/jurisdictions
 * - Project Types: GET https://api.mgoconnect.org/api/v3/cp/filter-items/jurisdiction-project-types/{jurisdictionId}
 * - Search: POST https://api.mgoconnect.org/api/v3/cp/project/search-projects
 *
 * USAGE:
 *   npx tsx scrapers/mgo/mgo-api-scraper.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { MGO_CREDENTIALS, TEXAS_COUNTIES, OUTPUT_DIR, DELAYS } from './mgo-config';
import { MGOPermitRecord, MGOSearchResult } from './mgo-types';

// API Base URLs
const MGO_API_BASE = 'https://api.mgoconnect.org';
const MGO_LEGACY_API = 'https://www.mygovernmentonline.org/api';

// Headers for API requests
const DEFAULT_HEADERS = {
  'accept': 'application/json, text/plain, */*',
  'content-type': 'application/json',
  'sourceplatform': 'MGO Connect Web',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'referer': 'https://www.mgoconnect.org/'
};

// Interfaces for API responses
interface LoginResponse {
  UserToken: string;
  Email: string;
  FirstName: string;
  LastName: string;
}

interface Jurisdiction {
  jurisdictionID: number;
  jurisdictionName: string;
  stateID: string;
  isCustomerPortalVisible: boolean;
}

interface ProjectType {
  itemID: number;
  name: string;
  projectTypeName: string | null;
}

interface ProjectRecord {
  projectID: number;
  projectStatus: string;
  projectStatusID: number;
  projectNumber: string;
  projectUID: string;
  projectName: string;
  workTypeID: number;
  jurisdiction: string;
  workType: string;
  projectAddress: string;
  projectAptSpaceLot: string;
  projectCity: string;
  projectState: string;
  projectZip: string;
  projectLat: string;
  projectLng: string;
  dateCreated: string;
  projectDescription: string;
  subdivision: string;
  units: string;
  lot: string;
  totalRows: number;
  parcelNumber: string;
  designationType: string;
  sepcificUse: string;
}

interface SearchResponse {
  data: ProjectRecord[];
  message: string | null;
  status: string;
}

// Global auth token
let authToken: string = '';

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Login to MGO Connect and get auth token
 * NOTE: The API expects URL-encoded form data with JSON as the value
 */
async function login(): Promise<string> {
  console.log('Logging in to MGO Connect...');

  // The API expects: ={"Email":"...","Password":"..."}
  // URL-encoded as form data
  const jsonPayload = JSON.stringify({
    Email: MGO_CREDENTIALS.email,
    Password: MGO_CREDENTIALS.password
  });
  const body = '=' + encodeURIComponent(jsonPayload);

  const response = await fetch(`${MGO_LEGACY_API}/user/login/-`, {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
    body: body
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('Login response:', text);
    throw new Error(`Login failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`Logged in as user ID: ${data.UserID}`);
  return data.UserToken;
}

/**
 * Get all jurisdictions
 */
async function getJurisdictions(): Promise<Jurisdiction[]> {
  console.log('Fetching jurisdictions...');

  const response = await fetch(`${MGO_API_BASE}/api/v3/cp/public/jurisdictions`, {
    method: 'GET',
    headers: {
      ...DEFAULT_HEADERS,
      'authorization-token': authToken
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get jurisdictions: ${response.status}`);
  }

  const data = await response.json();
  console.log(`Found ${data.data.length} jurisdictions`);
  return data.data;
}

/**
 * Get project types for a jurisdiction
 */
async function getProjectTypes(jurisdictionId: number): Promise<ProjectType[]> {
  const response = await fetch(
    `${MGO_API_BASE}/api/v3/cp/filter-items/jurisdiction-project-types/${jurisdictionId}`,
    {
      method: 'GET',
      headers: {
        ...DEFAULT_HEADERS,
        'authorization-token': authToken
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get project types: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Search for projects with pagination and retry logic
 * Uses address search with single character to get all records
 */
async function searchProjects(
  jurisdictionId: number,
  projectTypeId: number,
  addressSearch: string = '',
  rows: number = 100,
  offset: number = 0,
  retryCount: number = 0
): Promise<SearchResponse> {
  const body = {
    filters: {
      JURISDICTIONID: jurisdictionId,
      PROJECTTYPEID: projectTypeId,
      ADDRESS: addressSearch,
      ISADDRESSEXACTMATCH: false,
      ISUNITEXACTMATCH: true,
      ISSUBDIVISIONEXACTMATCH: false,
      ISLOTNUMBEREXACTMATCH: false,
      ISPARCELNUMBEREXACTMATCH: false,
      EXPANDED: true
    },
    Rows: rows,
    OffSet: offset,
    SortOrder: 1
  };

  const response = await fetch(`${MGO_API_BASE}/api/v3/cp/project/search-projects`, {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      'authorization-token': authToken
    },
    body: JSON.stringify(body)
  });

  // Handle rate limiting with exponential backoff
  if (response.status === 429) {
    if (retryCount < 5) {
      const waitTime = Math.pow(2, retryCount) * 5000; // 5s, 10s, 20s, 40s, 80s
      console.log(`    Rate limited. Waiting ${waitTime/1000}s before retry ${retryCount + 1}/5...`);
      await sleep(waitTime);
      return searchProjects(jurisdictionId, projectTypeId, addressSearch, rows, offset, retryCount + 1);
    }
    throw new Error('Rate limit exceeded after 5 retries');
  }

  // Handle 403 Forbidden - session may be blocked, need longer wait
  if (response.status === 403) {
    if (retryCount < 3) {
      const waitTime = 60000 * (retryCount + 1); // 1 min, 2 min, 3 min
      console.log(`    403 Forbidden. Session may be blocked. Waiting ${waitTime/60000} minutes...`);
      await sleep(waitTime);
      return searchProjects(jurisdictionId, projectTypeId, addressSearch, rows, offset, retryCount + 1);
    }
    throw new Error('Session blocked (403 Forbidden) after 3 retries');
  }

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Convert API record to our standard format
 */
function convertToPermitRecord(record: ProjectRecord, jurisdiction: string): MGOPermitRecord {
  return {
    permit_number: record.projectNumber,
    project_number: record.projectUID,
    address: record.projectAddress,
    city: record.projectCity,
    county: jurisdiction,
    state: record.projectState,
    owner_name: record.projectName !== 'IMPORTED FROM SAFE' ? record.projectName : undefined,
    install_date: record.dateCreated ? record.dateCreated.split('T')[0] : undefined,
    system_type: record.workType,
    project_type: record.designationType || undefined,
    status: record.projectStatus,
    source: 'MGOConnect',
    scraped_at: new Date().toISOString(),
    raw_data: {
      projectID: record.projectID,
      subdivision: record.subdivision,
      parcelNumber: record.parcelNumber,
      lot: record.lot,
      units: record.units,
      lat: record.projectLat,
      lng: record.projectLng,
      zip: record.projectZip,
      description: record.projectDescription
    }
  };
}

/**
 * Scrape all permits for a jurisdiction and project type
 * Uses recursive address search to bypass limits
 */
async function scrapeJurisdiction(
  jurisdictionId: number,
  jurisdictionName: string,
  projectTypeId: number,
  projectTypeName: string
): Promise<MGOPermitRecord[]> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Scraping: ${jurisdictionName} - ${projectTypeName}`);
  console.log('='.repeat(60));

  const allRecords: MGOPermitRecord[] = [];
  const seenProjectIds = new Set<number>();

  // Use multiple single-character searches to capture all records
  // This is the "35-day bypass" - instead of date filtering, we use address prefix
  const searchPrefixes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

  for (const prefix of searchPrefixes) {
    console.log(`  Searching addresses starting with '${prefix}'...`);
    let offset = 0;
    let hasMore = true;
    const BATCH_SIZE = 100;

    while (hasMore) {
      try {
        const response = await searchProjects(
          jurisdictionId,
          projectTypeId,
          prefix,
          BATCH_SIZE,
          offset
        );

        if (!response.data || response.data.length === 0) {
          hasMore = false;
          break;
        }

        let newRecords = 0;
        for (const record of response.data) {
          if (!seenProjectIds.has(record.projectID)) {
            seenProjectIds.add(record.projectID);
            allRecords.push(convertToPermitRecord(record, jurisdictionName));
            newRecords++;
          }
        }

        const totalAvailable = response.data[0]?.totalRows || 0;
        console.log(`    Offset ${offset}: ${response.data.length} records (${newRecords} new), Total available: ${totalAvailable}`);

        offset += BATCH_SIZE;
        hasMore = response.data.length === BATCH_SIZE && offset < totalAvailable;

        // Rate limiting
        await sleep(DELAYS.betweenPages);

      } catch (error) {
        console.error(`    Error at offset ${offset}: ${error}`);
        hasMore = false;
      }
    }

    // Small delay between search prefixes
    await sleep(500);
  }

  console.log(`  Total unique records: ${allRecords.length}`);
  return allRecords;
}

/**
 * Save results to NDJSON file
 */
function saveResults(
  records: MGOPermitRecord[],
  jurisdictionName: string,
  projectTypeName: string
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const safeName = jurisdictionName.replace(/\s+/g, '_').toLowerCase();
  const safeType = projectTypeName.replace(/\s+/g, '_').toLowerCase();
  const filename = `${safeName}_${safeType}_${timestamp}.ndjson`;
  const filepath = path.join(OUTPUT_DIR, filename);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Write as NDJSON (newline-delimited JSON)
  const ndjson = records.map(r => JSON.stringify(r)).join('\n');
  fs.writeFileSync(filepath, ndjson);

  // Also save a summary JSON
  const summaryPath = filepath.replace('.ndjson', '_summary.json');
  const summary: MGOSearchResult = {
    county: jurisdictionName,
    state: 'TX',
    project_type: projectTypeName,
    total_records: records.length,
    records: [], // Don't duplicate records in summary
    extracted_at: new Date().toISOString(),
    api_calls: [`POST search-projects × ${Math.ceil(records.length / 100) * 36}`] // Estimate
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log(`\nSaved ${records.length} records to: ${filepath}`);
  return filepath;
}

/**
 * Find jurisdiction ID by name
 */
function findJurisdiction(
  jurisdictions: Jurisdiction[],
  name: string,
  stateCode: string
): Jurisdiction | undefined {
  return jurisdictions.find(
    j => j.jurisdictionName.toLowerCase().includes(name.toLowerCase()) &&
         j.stateID === stateCode
  );
}

/**
 * Find OSSF/Septic project type ID
 * Falls back to "Permit" type if no specific OSSF type exists
 */
function findOSSFProjectType(projectTypes: ProjectType[]): ProjectType | undefined {
  // First try to find specific OSSF/Septic type
  const ossf = projectTypes.find(
    pt => pt.name.toLowerCase().includes('ossf') ||
          pt.name.toLowerCase().includes('septic') ||
          pt.name.toLowerCase().includes('sewage') ||
          pt.name.toLowerCase().includes('on-site')
  );
  if (ossf) return ossf;

  // Fall back to general "Permit" type
  const permit = projectTypes.find(
    pt => pt.name.toLowerCase() === 'permit'
  );
  return permit;
}

/**
 * Main scraper function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('MGO CONNECT API SCRAPER');
  console.log('='.repeat(60));
  console.log(`Started: ${new Date().toISOString()}\n`);

  try {
    // Step 1: Login
    authToken = await login();
    await sleep(DELAYS.afterLogin / 4); // Shorter delay for API-first approach

    // Step 2: Get all jurisdictions
    const jurisdictions = await getJurisdictions();

    // Filter to Texas jurisdictions
    const texasJurisdictions = jurisdictions.filter(j => j.stateID === 'TX');
    console.log(`\nFound ${texasJurisdictions.length} Texas jurisdictions`);

    // Log available Texas jurisdictions
    console.log('\nAvailable Texas jurisdictions:');
    texasJurisdictions.forEach(j => console.log(`  - ${j.jurisdictionName} (ID: ${j.jurisdictionID})`));

    // Step 3: Process each configured county
    const results: Array<{ county: string; file: string; count: number }> = [];

    for (const county of TEXAS_COUNTIES) {
      const jurisdiction = findJurisdiction(jurisdictions, county.jurisdiction, 'TX');

      if (!jurisdiction) {
        console.log(`\n⚠️  Could not find jurisdiction: ${county.jurisdiction}`);
        continue;
      }

      // Get project types for this jurisdiction
      const projectTypes = await getProjectTypes(jurisdiction.jurisdictionID);
      console.log(`\nProject types for ${jurisdiction.jurisdictionName}:`);
      projectTypes.forEach(pt => console.log(`  - ${pt.name} (ID: ${pt.itemID})`));

      // Find OSSF/Septic type
      const ossfType = findOSSFProjectType(projectTypes);

      if (!ossfType) {
        console.log(`⚠️  No OSSF/Septic project type found for ${jurisdiction.jurisdictionName}`);
        continue;
      }

      // Scrape this jurisdiction
      const records = await scrapeJurisdiction(
        jurisdiction.jurisdictionID,
        jurisdiction.jurisdictionName,
        ossfType.itemID,
        ossfType.name
      );

      if (records.length > 0) {
        const filepath = saveResults(records, jurisdiction.jurisdictionName, ossfType.name);
        results.push({
          county: jurisdiction.jurisdictionName,
          file: filepath,
          count: records.length
        });
      }

      // Delay between jurisdictions
      await sleep(DELAYS.betweenActions);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SCRAPING COMPLETE');
    console.log('='.repeat(60));
    console.log(`Completed: ${new Date().toISOString()}`);
    console.log(`\nResults:`);
    let totalRecords = 0;
    for (const r of results) {
      console.log(`  ${r.county}: ${r.count} records -> ${r.file}`);
      totalRecords += r.count;
    }
    console.log(`\nTotal: ${totalRecords} records from ${results.length} counties`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run
main().catch(console.error);
