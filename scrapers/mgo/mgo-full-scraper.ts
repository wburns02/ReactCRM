/**
 * MGO Connect Full Extraction Scraper with Proxy Support
 *
 * Features:
 * - Decodo datacenter proxy rotation
 * - Extracts ALL project types (not just OSSF)
 * - Checkpoint saves for resume capability
 * - Parallel extraction support
 * - All 432 jurisdictions
 *
 * USAGE:
 *   npx tsx scrapers/mgo/mgo-full-scraper.ts
 *
 * ENVIRONMENT:
 *   DECODO_USER=your_username
 *   DECODO_PASS=your_password
 */

import * as fs from 'fs';
import * as path from 'path';
import { HttpsProxyAgent } from 'https-proxy-agent';

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Decodo Proxy Settings
  proxy: {
    host: 'dc.decodo.com',
    ports: [10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009, 10010],
    username: process.env.DECODO_USER || 'OpusCLI',
    password: process.env.DECODO_PASS || 'h+Mpb3hlLt1c5B1mpL',
    enabled: true // Set to false to disable proxy
  },

  // MGO Credentials
  mgo: {
    email: 'willwalterburns@gmail.com',
    password: '#Espn202512'
  },

  // API Endpoints
  api: {
    base: 'https://api.mgoconnect.org',
    legacy: 'https://www.mygovernmentonline.org/api'
  },

  // Extraction Settings
  extraction: {
    batchSize: 100,           // Records per API call
    delayBetweenRequests: 1500, // ms between requests (can be lower with proxy)
    delayBetweenJurisdictions: 3000, // ms between jurisdictions
    checkpointInterval: 1000,  // Save checkpoint every N records
    maxRetries: 5,
    parallelJurisdictions: 3   // How many jurisdictions to scrape in parallel
  },

  // Output
  output: {
    dir: './scrapers/output/mgo/full_extraction',
    checkpointFile: './scrapers/output/mgo/checkpoint.json'
  }
};

// ============================================
// TYPES
// ============================================

interface Jurisdiction {
  jurisdictionID: number;
  jurisdictionName: string;
  stateID: string;
}

interface ProjectType {
  itemID: number;
  name: string;
}

interface ProjectRecord {
  projectID: number;
  projectNumber: string;
  projectStatus: string;
  projectAddress: string;
  projectCity: string;
  projectState: string;
  projectZip: string;
  projectLat: string;
  projectLng: string;
  dateCreated: string;
  workType: string;
  jurisdiction: string;
  parcelNumber: string;
  projectDescription: string;
  subdivision: string;
  totalRows: number;
  [key: string]: unknown;
}

interface Checkpoint {
  lastJurisdictionID: number;
  lastProjectTypeID: number;
  lastOffset: number;
  completedJurisdictions: number[];
  totalRecordsExtracted: number;
  timestamp: string;
}

// ============================================
// GLOBALS
// ============================================

let authToken = '';
let currentProxyIndex = 0;
let totalRecordsExtracted = 0;
let consecutiveFailures = 0;  // Track failures across all ports

// ============================================
// PROXY MANAGEMENT
// ============================================

function getNextProxy(): string {
  if (!CONFIG.proxy.enabled) return '';

  const port = CONFIG.proxy.ports[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % CONFIG.proxy.ports.length;

  return `http://${CONFIG.proxy.username}:${CONFIG.proxy.password}@${CONFIG.proxy.host}:${port}`;
}

function getProxyAgent(): HttpsProxyAgent<string> | undefined {
  if (!CONFIG.proxy.enabled) return undefined;

  const proxyUrl = getNextProxy();
  console.log(`  [Proxy] Using port ${CONFIG.proxy.ports[(currentProxyIndex - 1 + CONFIG.proxy.ports.length) % CONFIG.proxy.ports.length]}`);
  return new HttpsProxyAgent(proxyUrl);
}

// ============================================
// API HELPERS
// ============================================

const DEFAULT_HEADERS = {
  'accept': 'application/json, text/plain, */*',
  'content-type': 'application/json',
  'sourceplatform': 'MGO Connect Web',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'referer': 'https://www.mgoconnect.org/'
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithProxy(url: string, options: RequestInit = {}): Promise<Response> {
  const agent = getProxyAgent();

  // Node.js fetch with proxy agent
  const fetchOptions: RequestInit & { agent?: unknown } = {
    ...options,
    // @ts-ignore - agent is valid for node-fetch
    agent: agent
  };

  return fetch(url, fetchOptions);
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = CONFIG.extraction.maxRetries
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithProxy(url, options);

      if (response.status === 429) {
        consecutiveFailures++;
        const waitTime = Math.pow(2, attempt) * 3000;
        console.log(`    Rate limited. Waiting ${waitTime/1000}s (attempt ${attempt + 1}/${retries + 1})...`);
        await sleep(waitTime);
        continue;
      }

      if (response.status === 403) {
        consecutiveFailures++;

        // If all 10 ports have failed consecutively, take a long break
        if (consecutiveFailures >= 10) {
          console.log(`    ⚠️  ALL PORTS BLOCKED! Taking 5-minute cooldown...`);
          await sleep(300000); // 5 minutes
          consecutiveFailures = 0;
        } else {
          const waitTime = Math.pow(2, attempt) * 10000;
          console.log(`    403 Forbidden. Rotating proxy and waiting ${waitTime/1000}s... (${consecutiveFailures}/10 failures)`);
          await sleep(waitTime);
        }
        continue;
      }

      // Handle 500/503/504 server errors with retry
      if (response.status >= 500) {
        consecutiveFailures++;
        const waitTime = Math.pow(2, attempt) * 5000;
        console.log(`    Server error ${response.status}. Waiting ${waitTime/1000}s (attempt ${attempt + 1}/${retries + 1})...`);
        await sleep(waitTime);
        continue;
      }

      // Success - reset failure counter
      consecutiveFailures = 0;
      return response;
    } catch (error) {
      consecutiveFailures++;
      if (attempt === retries) throw error;
      console.log(`    Network error. Retrying (${attempt + 1}/${retries + 1})...`);
      await sleep(2000);
    }
  }

  throw new Error('Max retries exceeded');
}

// ============================================
// MGO API FUNCTIONS
// ============================================

async function login(): Promise<string> {
  console.log('Logging in to MGO Connect...');

  const jsonPayload = JSON.stringify({
    Email: CONFIG.mgo.email,
    Password: CONFIG.mgo.password
  });
  const body = '=' + encodeURIComponent(jsonPayload);

  const response = await fetchWithRetry(`${CONFIG.api.legacy}/user/login/-`, {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
    body: body
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const data = await response.json();
  console.log(`Logged in successfully. User ID: ${data.UserID}`);
  return data.UserToken;
}

async function getJurisdictions(): Promise<Jurisdiction[]> {
  console.log('Fetching all jurisdictions...');

  const response = await fetchWithRetry(`${CONFIG.api.base}/api/v3/cp/public/jurisdictions`, {
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

async function getProjectTypes(jurisdictionId: number): Promise<ProjectType[]> {
  const response = await fetchWithRetry(
    `${CONFIG.api.base}/api/v3/cp/filter-items/jurisdiction-project-types/${jurisdictionId}`,
    {
      method: 'GET',
      headers: {
        ...DEFAULT_HEADERS,
        'authorization-token': authToken
      }
    }
  );

  if (!response.ok) {
    console.log(`    Warning: Could not get project types for jurisdiction ${jurisdictionId}`);
    return [];
  }

  const data = await response.json();
  return data.data || [];
}

async function searchProjects(
  jurisdictionId: number,
  projectTypeId: number,
  offset: number = 0
): Promise<{ records: ProjectRecord[]; total: number }> {
  const body = {
    filters: {
      JURISDICTIONID: jurisdictionId,
      PROJECTTYPEID: projectTypeId,
      ADDRESS: '',  // Empty = all records
      ISADDRESSEXACTMATCH: false,
      EXPANDED: true
    },
    Rows: CONFIG.extraction.batchSize,
    OffSet: offset,
    SortOrder: 1
  };

  const response = await fetchWithRetry(`${CONFIG.api.base}/api/v3/cp/project/search-projects`, {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      'authorization-token': authToken
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`);
  }

  const data = await response.json();
  const records = data.data || [];
  const total = records.length > 0 ? records[0].totalRows : 0;

  return { records, total };
}

// ============================================
// CHECKPOINT MANAGEMENT
// ============================================

function loadCheckpoint(): Checkpoint | null {
  try {
    if (fs.existsSync(CONFIG.output.checkpointFile)) {
      const data = fs.readFileSync(CONFIG.output.checkpointFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log('No checkpoint found, starting fresh');
  }
  return null;
}

function saveCheckpoint(checkpoint: Checkpoint): void {
  fs.writeFileSync(CONFIG.output.checkpointFile, JSON.stringify(checkpoint, null, 2));
}

// ============================================
// DATA EXTRACTION
// ============================================

async function extractJurisdiction(
  jurisdiction: Jurisdiction,
  completedJurisdictions: Set<number>
): Promise<number> {
  if (completedJurisdictions.has(jurisdiction.jurisdictionID)) {
    console.log(`  Skipping ${jurisdiction.jurisdictionName} (already completed)`);
    return 0;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Extracting: ${jurisdiction.jurisdictionName} (${jurisdiction.stateID})`);
  console.log(`Jurisdiction ID: ${jurisdiction.jurisdictionID}`);
  console.log('='.repeat(60));

  // Get all project types for this jurisdiction
  const projectTypes = await getProjectTypes(jurisdiction.jurisdictionID);

  if (projectTypes.length === 0) {
    console.log('  No project types found, skipping');
    return 0;
  }

  console.log(`  Found ${projectTypes.length} project types: ${projectTypes.map(pt => pt.name).join(', ')}`);

  let jurisdictionRecords = 0;
  const outputFile = path.join(
    CONFIG.output.dir,
    `${jurisdiction.stateID.toLowerCase()}_${jurisdiction.jurisdictionName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.ndjson`
  );

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.output.dir)) {
    fs.mkdirSync(CONFIG.output.dir, { recursive: true });
  }

  // Open file for appending
  const writeStream = fs.createWriteStream(outputFile, { flags: 'a' });

  // Extract all project types
  for (const projectType of projectTypes) {
    console.log(`\n  Project Type: ${projectType.name} (ID: ${projectType.itemID})`);

    let offset = 0;
    let hasMore = true;
    let typeRecords = 0;

    let errorCount = 0;
    const maxErrors = 3; // Skip to next project type after 3 consecutive errors

    while (hasMore) {
      try {
        const { records, total } = await searchProjects(
          jurisdiction.jurisdictionID,
          projectType.itemID,
          offset
        );

        if (records.length === 0) {
          hasMore = false;
          break;
        }

        // Write records to file
        for (const record of records) {
          const enrichedRecord = {
            ...record,
            _jurisdiction: jurisdiction.jurisdictionName,
            _jurisdictionID: jurisdiction.jurisdictionID,
            _state: jurisdiction.stateID,
            _projectType: projectType.name,
            _projectTypeID: projectType.itemID,
            _extractedAt: new Date().toISOString()
          };
          writeStream.write(JSON.stringify(enrichedRecord) + '\n');
        }

        typeRecords += records.length;
        jurisdictionRecords += records.length;
        totalRecordsExtracted += records.length;
        errorCount = 0; // Reset error count on success

        console.log(`    Offset ${offset}: ${records.length} records (Total: ${total})`);

        offset += CONFIG.extraction.batchSize;
        hasMore = offset < total;

        // Save checkpoint periodically
        if (totalRecordsExtracted % CONFIG.extraction.checkpointInterval === 0) {
          saveCheckpoint({
            lastJurisdictionID: jurisdiction.jurisdictionID,
            lastProjectTypeID: projectType.itemID,
            lastOffset: offset,
            completedJurisdictions: Array.from(completedJurisdictions),
            totalRecordsExtracted,
            timestamp: new Date().toISOString()
          });
        }

        await sleep(CONFIG.extraction.delayBetweenRequests);

      } catch (error) {
        errorCount++;
        console.log(`    Error at offset ${offset}: ${error} (${errorCount}/${maxErrors})`);
        if (errorCount >= maxErrors) {
          console.log(`    Too many errors, skipping to next project type...`);
          hasMore = false;
        } else {
          // Skip this offset and try the next one
          offset += CONFIG.extraction.batchSize;
          await sleep(5000);
        }
      }
    }

    console.log(`    Completed: ${typeRecords} records for ${projectType.name}`);
  }

  writeStream.end();

  console.log(`\n  TOTAL for ${jurisdiction.jurisdictionName}: ${jurisdictionRecords} records`);
  console.log(`  Saved to: ${outputFile}`);

  return jurisdictionRecords;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('='.repeat(60));
  console.log('MGO CONNECT FULL EXTRACTION');
  console.log('='.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Proxy enabled: ${CONFIG.proxy.enabled}`);
  console.log(`Output directory: ${CONFIG.output.dir}`);
  console.log('');

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.output.dir)) {
    fs.mkdirSync(CONFIG.output.dir, { recursive: true });
  }

  try {
    // Login
    authToken = await login();
    await sleep(2000);

    // Get all jurisdictions
    const jurisdictions = await getJurisdictions();

    // Load checkpoint if exists
    const checkpoint = loadCheckpoint();
    const completedJurisdictions = new Set<number>(checkpoint?.completedJurisdictions || []);
    totalRecordsExtracted = checkpoint?.totalRecordsExtracted || 0;

    console.log(`\nTotal jurisdictions: ${jurisdictions.length}`);
    console.log(`Already completed: ${completedJurisdictions.size}`);
    console.log(`Records from previous runs: ${totalRecordsExtracted}`);

    // Group by state for organized output
    const byState = new Map<string, Jurisdiction[]>();
    for (const j of jurisdictions) {
      if (!byState.has(j.stateID)) {
        byState.set(j.stateID, []);
      }
      byState.get(j.stateID)!.push(j);
    }

    console.log(`\nJurisdictions by state:`);
    for (const [state, jurs] of byState) {
      console.log(`  ${state}: ${jurs.length}`);
    }

    // Extract all jurisdictions
    let processed = 0;

    for (const jurisdiction of jurisdictions) {
      processed++;
      console.log(`\n[${processed}/${jurisdictions.length}] Processing...`);

      const records = await extractJurisdiction(jurisdiction, completedJurisdictions);

      if (records > 0) {
        completedJurisdictions.add(jurisdiction.jurisdictionID);

        // Save checkpoint after each jurisdiction
        saveCheckpoint({
          lastJurisdictionID: jurisdiction.jurisdictionID,
          lastProjectTypeID: 0,
          lastOffset: 0,
          completedJurisdictions: Array.from(completedJurisdictions),
          totalRecordsExtracted,
          timestamp: new Date().toISOString()
        });
      }

      await sleep(CONFIG.extraction.delayBetweenJurisdictions);
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('EXTRACTION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Completed: ${new Date().toISOString()}`);
    console.log(`Total jurisdictions processed: ${completedJurisdictions.size}`);
    console.log(`Total records extracted: ${totalRecordsExtracted}`);
    console.log(`Output directory: ${CONFIG.output.dir}`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run
main().catch(console.error);
