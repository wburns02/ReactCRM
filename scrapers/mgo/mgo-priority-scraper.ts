/**
 * MGO Connect Priority Extraction - Texas + Tennessee
 *
 * Runs in parallel with main scraper using different proxy ports.
 * Extracts TX (107 jurisdictions) and TN (9 jurisdictions) first.
 */

import * as fs from 'fs';
import * as path from 'path';
import { HttpsProxyAgent } from 'https-proxy-agent';

// ============================================
// CONFIGURATION - PRIORITY SCRAPER
// ============================================

const PRIORITY_STATES = ['TX', 'TN'];

const CONFIG = {
  proxy: {
    host: 'dc.decodo.com',
    // Use UPPER port range to avoid collision with main scraper
    ports: [10006, 10007, 10008, 10009, 10010],
    username: process.env.DECODO_USER || 'OpusCLI',
    password: process.env.DECODO_PASS || 'h+Mpb3hlLt1c5B1mpL',
    enabled: true
  },

  mgo: {
    email: 'willwalterburns@gmail.com',
    password: '#Espn202512'
  },

  api: {
    base: 'https://api.mgoconnect.org',
    legacy: 'https://www.mygovernmentonline.org/api'
  },

  extraction: {
    batchSize: 100,
    delayBetweenRequests: 1500,
    delayBetweenJurisdictions: 3000,
    checkpointInterval: 1000,
    maxRetries: 5
  },

  output: {
    dir: './scrapers/output/mgo/priority_extraction',
    checkpointFile: './scrapers/output/mgo/priority_checkpoint.json'
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
let consecutiveFailures = 0;

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
  console.log(`  [Proxy] Port ${CONFIG.proxy.ports[(currentProxyIndex - 1 + CONFIG.proxy.ports.length) % CONFIG.proxy.ports.length]}`);
  return new HttpsProxyAgent(proxyUrl);
}

// ============================================
// API HELPERS
// ============================================

const DEFAULT_HEADERS = {
  'accept': 'application/json, text/plain, */*',
  'content-type': 'application/json',
  'sourceplatform': 'MGO Connect Web',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'referer': 'https://www.mgoconnect.org/'
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithProxy(url: string, options: RequestInit = {}): Promise<Response> {
  const agent = getProxyAgent();
  const fetchOptions: RequestInit & { agent?: unknown } = { ...options, agent };
  return fetch(url, fetchOptions);
}

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = CONFIG.extraction.maxRetries): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithProxy(url, options);
      if (response.status === 429) {
        consecutiveFailures++;
        const waitTime = Math.pow(2, attempt) * 3000;
        console.log(`    Rate limited. Waiting ${waitTime/1000}s...`);
        await sleep(waitTime);
        continue;
      }
      if (response.status === 403) {
        consecutiveFailures++;
        if (consecutiveFailures >= 5) {
          console.log('    All ports blocked! 5-min cooldown...');
          await sleep(300000);
          consecutiveFailures = 0;
        } else {
          await sleep(Math.pow(2, attempt) * 10000);
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
      consecutiveFailures = 0;
      return response;
    } catch (error) {
      consecutiveFailures++;
      if (attempt === retries) throw error;
      console.log(`    Network error. Retry ${attempt + 1}/${retries + 1}...`);
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
  const jsonPayload = JSON.stringify({ Email: CONFIG.mgo.email, Password: CONFIG.mgo.password });
  const body = '=' + encodeURIComponent(jsonPayload);

  const response = await fetchWithRetry(`${CONFIG.api.legacy}/user/login/-`, {
    method: 'POST',
    headers: { ...DEFAULT_HEADERS, 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body
  });

  if (!response.ok) throw new Error(`Login failed: ${response.status}`);
  const data = await response.json();
  console.log(`Logged in. User ID: ${data.UserID}`);
  return data.UserToken;
}

async function getJurisdictions(): Promise<Jurisdiction[]> {
  console.log('Fetching jurisdictions...');
  const response = await fetchWithRetry(`${CONFIG.api.base}/api/v3/cp/public/jurisdictions`, {
    method: 'GET',
    headers: { ...DEFAULT_HEADERS, 'authorization-token': authToken }
  });
  if (!response.ok) throw new Error(`Failed to get jurisdictions: ${response.status}`);
  const data = await response.json();
  return data.data;
}

async function getProjectTypes(jurisdictionId: number): Promise<ProjectType[]> {
  const response = await fetchWithRetry(
    `${CONFIG.api.base}/api/v3/cp/filter-items/jurisdiction-project-types/${jurisdictionId}`,
    { method: 'GET', headers: { ...DEFAULT_HEADERS, 'authorization-token': authToken } }
  );
  if (!response.ok) return [];
  const data = await response.json();
  return data.data || [];
}

async function searchProjects(jurisdictionId: number, projectTypeId: number, offset: number = 0): Promise<{ records: ProjectRecord[]; total: number }> {
  const body = {
    filters: { JURISDICTIONID: jurisdictionId, PROJECTTYPEID: projectTypeId, ADDRESS: '', ISADDRESSEXACTMATCH: false, EXPANDED: true },
    Rows: CONFIG.extraction.batchSize,
    OffSet: offset,
    SortOrder: 1
  };

  const response = await fetchWithRetry(`${CONFIG.api.base}/api/v3/cp/project/search-projects`, {
    method: 'POST',
    headers: { ...DEFAULT_HEADERS, 'authorization-token': authToken },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error(`Search failed: ${response.status}`);
  const data = await response.json();
  const records = data.data || [];
  return { records, total: records.length > 0 ? records[0].totalRows : 0 };
}

// ============================================
// CHECKPOINT
// ============================================

function loadCheckpoint(): Checkpoint | null {
  try {
    if (fs.existsSync(CONFIG.output.checkpointFile)) {
      return JSON.parse(fs.readFileSync(CONFIG.output.checkpointFile, 'utf-8'));
    }
  } catch (e) {}
  return null;
}

function saveCheckpoint(checkpoint: Checkpoint): void {
  fs.writeFileSync(CONFIG.output.checkpointFile, JSON.stringify(checkpoint, null, 2));
}

// ============================================
// EXTRACTION
// ============================================

async function extractJurisdiction(jurisdiction: Jurisdiction, completedJurisdictions: Set<number>): Promise<number> {
  if (completedJurisdictions.has(jurisdiction.jurisdictionID)) {
    console.log(`  Skipping ${jurisdiction.jurisdictionName} (done)`);
    return 0;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Extracting: ${jurisdiction.jurisdictionName} (${jurisdiction.stateID})`);
  console.log('='.repeat(60));

  const projectTypes = await getProjectTypes(jurisdiction.jurisdictionID);
  if (projectTypes.length === 0) {
    console.log('  No project types');
    return 0;
  }

  console.log(`  Found ${projectTypes.length} project types`);

  let jurisdictionRecords = 0;
  const outputFile = path.join(
    CONFIG.output.dir,
    `${jurisdiction.stateID.toLowerCase()}_${jurisdiction.jurisdictionName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.ndjson`
  );

  if (!fs.existsSync(CONFIG.output.dir)) fs.mkdirSync(CONFIG.output.dir, { recursive: true });
  const writeStream = fs.createWriteStream(outputFile, { flags: 'a' });

  for (const projectType of projectTypes) {
    console.log(`\n  Project Type: ${projectType.name}`);
    let offset = 0, hasMore = true, typeRecords = 0;

    let errorCount = 0;
    const maxErrors = 3; // Skip to next project type after 3 consecutive errors

    while (hasMore) {
      try {
        const { records, total } = await searchProjects(jurisdiction.jurisdictionID, projectType.itemID, offset);
        if (records.length === 0) { hasMore = false; break; }

        for (const record of records) {
          writeStream.write(JSON.stringify({
            ...record,
            _jurisdiction: jurisdiction.jurisdictionName,
            _jurisdictionID: jurisdiction.jurisdictionID,
            _state: jurisdiction.stateID,
            _projectType: projectType.name,
            _projectTypeID: projectType.itemID,
            _extractedAt: new Date().toISOString()
          }) + '\n');
        }

        typeRecords += records.length;
        jurisdictionRecords += records.length;
        totalRecordsExtracted += records.length;
        errorCount = 0; // Reset error count on success
        console.log(`    Offset ${offset}: ${records.length} records (Total: ${total})`);
        offset += CONFIG.extraction.batchSize;
        hasMore = offset < total;

        if (totalRecordsExtracted % CONFIG.extraction.checkpointInterval === 0) {
          saveCheckpoint({ lastJurisdictionID: jurisdiction.jurisdictionID, lastProjectTypeID: projectType.itemID, lastOffset: offset, completedJurisdictions: Array.from(completedJurisdictions), totalRecordsExtracted, timestamp: new Date().toISOString() });
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
    console.log(`    Done: ${typeRecords} records`);
  }

  writeStream.end();
  console.log(`\n  TOTAL: ${jurisdictionRecords} records -> ${outputFile}`);
  return jurisdictionRecords;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('='.repeat(60));
  console.log('MGO PRIORITY EXTRACTION - TX + TN');
  console.log('='.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Priority states: ${PRIORITY_STATES.join(', ')}`);
  console.log(`Proxy ports: ${CONFIG.proxy.ports.join(', ')}`);
  console.log('');

  if (!fs.existsSync(CONFIG.output.dir)) fs.mkdirSync(CONFIG.output.dir, { recursive: true });

  try {
    authToken = await login();
    await sleep(2000);

    const allJurisdictions = await getJurisdictions();

    // FILTER TO TX AND TN ONLY
    const jurisdictions = allJurisdictions.filter(j => PRIORITY_STATES.includes(j.stateID));

    console.log(`\nFiltered to priority states:`);
    for (const state of PRIORITY_STATES) {
      const count = jurisdictions.filter(j => j.stateID === state).length;
      console.log(`  ${state}: ${count} jurisdictions`);
    }
    console.log(`Total: ${jurisdictions.length} jurisdictions`);

    // List TN jurisdictions
    console.log(`\nTennessee jurisdictions:`);
    jurisdictions.filter(j => j.stateID === 'TN').forEach(j => {
      console.log(`  - ${j.jurisdictionName} (ID: ${j.jurisdictionID})`);
    });

    const checkpoint = loadCheckpoint();
    const completedJurisdictions = new Set<number>(checkpoint?.completedJurisdictions || []);
    totalRecordsExtracted = checkpoint?.totalRecordsExtracted || 0;

    console.log(`Already completed: ${completedJurisdictions.size}`);
    console.log(`Records from previous: ${totalRecordsExtracted}`);

    let processed = 0;
    for (const jurisdiction of jurisdictions) {
      processed++;
      console.log(`\n[${processed}/${jurisdictions.length}] Processing...`);

      const records = await extractJurisdiction(jurisdiction, completedJurisdictions);
      if (records > 0) {
        completedJurisdictions.add(jurisdiction.jurisdictionID);
        saveCheckpoint({ lastJurisdictionID: jurisdiction.jurisdictionID, lastProjectTypeID: 0, lastOffset: 0, completedJurisdictions: Array.from(completedJurisdictions), totalRecordsExtracted, timestamp: new Date().toISOString() });
      }
      await sleep(CONFIG.extraction.delayBetweenJurisdictions);
    }

    console.log('\n' + '='.repeat(60));
    console.log('PRIORITY EXTRACTION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Completed: ${new Date().toISOString()}`);
    console.log(`Total jurisdictions: ${completedJurisdictions.size}`);
    console.log(`Total records: ${totalRecordsExtracted}`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
