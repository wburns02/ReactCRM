/**
 * EnerGov Full Extraction Scraper with Proxy Support
 *
 * Features:
 * - Decodo datacenter proxy rotation (10 IPs)
 * - Multi-portal extraction
 * - Checkpoint saves for resume capability
 * - NDJSON output per jurisdiction
 *
 * USAGE:
 *   npx tsx scrapers/energov/energov-full-scraper.ts
 *
 * Or specific portal:
 *   npx tsx scrapers/energov/energov-full-scraper.ts --portal=wake_county_nc
 */

import * as fs from 'fs';
import * as path from 'path';
import { HttpsProxyAgent } from 'https-proxy-agent';
import {
  ENERGOV_PORTALS,
  PROXY_CONFIG,
  EXTRACTION_CONFIG,
  EnerGovPortalConfig,
  getEnabledPortals
} from './energov-config';

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
  status?: string;
  appliedDate?: string;
  issuedDate?: string;
  expirationDate?: string;
  description?: string;
  contractor?: string;
  valuation?: number;
  squareFootage?: number;
  source: string;
  portal: string;
  portalUrl: string;
  scrapedAt: string;
  rawData: Record<string, unknown>;
}

interface Checkpoint {
  lastPortalIndex: number;
  lastSearchOffset: number;
  completedPortals: string[];
  totalRecordsExtracted: number;
  timestamp: string;
}

interface SearchResult {
  records: unknown[];
  totalCount: number;
  hasMore: boolean;
}

// ============================================
// GLOBALS
// ============================================

let currentProxyIndex = 0;
let totalRecordsExtracted = 0;
let consecutiveFailures = 0;

// ============================================
// PROXY MANAGEMENT
// ============================================

function getNextProxy(): string {
  if (!PROXY_CONFIG.enabled) return '';

  const port = PROXY_CONFIG.ports[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % PROXY_CONFIG.ports.length;

  return `http://${PROXY_CONFIG.username}:${PROXY_CONFIG.password}@${PROXY_CONFIG.host}:${port}`;
}

function getProxyAgent(): HttpsProxyAgent<string> | undefined {
  if (!PROXY_CONFIG.enabled) return undefined;

  const proxyUrl = getNextProxy();
  const portNum = PROXY_CONFIG.ports[(currentProxyIndex - 1 + PROXY_CONFIG.ports.length) % PROXY_CONFIG.ports.length];
  console.log(`  [Proxy] Using port ${portNum}`);
  return new HttpsProxyAgent(proxyUrl);
}

// ============================================
// HTTP HELPERS
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const DEFAULT_HEADERS = {
  'accept': 'application/json, text/plain, */*',
  'content-type': 'application/json',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9'
};

async function fetchWithProxy(url: string, options: RequestInit = {}): Promise<Response> {
  const agent = getProxyAgent();

  const fetchOptions: RequestInit & { agent?: unknown } = {
    ...options,
    headers: {
      ...DEFAULT_HEADERS,
      ...(options.headers || {})
    },
    // @ts-ignore - agent is valid for node-fetch
    agent: agent
  };

  return fetch(url, fetchOptions);
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = EXTRACTION_CONFIG.maxRetries
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithProxy(url, options);

      if (response.status === 429) {
        consecutiveFailures++;
        const waitTime = Math.pow(2, attempt) * 5000;
        console.log(`    Rate limited (429). Waiting ${waitTime/1000}s (attempt ${attempt + 1}/${retries + 1})...`);
        await sleep(waitTime);
        continue;
      }

      if (response.status === 403) {
        consecutiveFailures++;

        if (consecutiveFailures >= 10) {
          console.log(`    ALL PORTS BLOCKED! Taking 5-minute cooldown...`);
          await sleep(EXTRACTION_CONFIG.cooldownOnBlock);
          consecutiveFailures = 0;
        } else {
          const waitTime = Math.pow(2, attempt) * 10000;
          console.log(`    403 Forbidden. Rotating proxy and waiting ${waitTime/1000}s... (${consecutiveFailures}/10)`);
          await sleep(waitTime);
        }
        continue;
      }

      // Success - reset failure counter
      consecutiveFailures = 0;
      return response;
    } catch (error) {
      consecutiveFailures++;
      if (attempt === retries) throw error;
      console.log(`    Network error. Retrying (${attempt + 1}/${retries + 1})...`);
      await sleep(3000);
    }
  }

  throw new Error('Max retries exceeded');
}

// ============================================
// ENERGOV API FUNCTIONS
// ============================================

/**
 * Discover the actual API endpoint by trying common patterns
 */
async function discoverSearchEndpoint(portal: EnerGovPortalConfig): Promise<string | null> {
  const patterns = [
    '/api/cap/search',
    '/api/citizen/search',
    '/api/permit/search',
    '/api/cap/capsearch',
    '/api/search',
    '/api/Search/Search'
  ];

  for (const pattern of patterns) {
    const url = `${portal.baseUrl}${portal.apiBase || ''}${pattern}`;
    console.log(`    Trying: ${url}`);

    try {
      const response = await fetchWithProxy(url, {
        method: 'POST',
        body: JSON.stringify({
          PageNumber: 1,
          PageSize: 1
        })
      });

      if (response.status === 200 || response.status === 400) {
        // 400 might mean we need different params but endpoint exists
        console.log(`    Found endpoint: ${pattern}`);
        return pattern;
      }
    } catch {}
  }

  return null;
}

/**
 * Search for permits using discovered or configured endpoint
 */
async function searchPermits(
  portal: EnerGovPortalConfig,
  pageNumber: number = 1,
  searchTerm: string = ''
): Promise<SearchResult> {
  const searchEndpoint = portal.searchEndpoint || '/api/cap/search';
  const url = `${portal.baseUrl}${portal.apiBase || ''}${searchEndpoint}`;

  // Common EnerGov search body patterns
  const searchBody = {
    PageNumber: pageNumber,
    PageSize: portal.pageSize,
    SearchText: searchTerm,
    FilterModule: '',
    SortField: 'PermitNumber',
    SortOrder: 'ASC'
  };

  const response = await fetchWithRetry(url, {
    method: 'POST',
    body: JSON.stringify(searchBody),
    headers: {
      'referer': `${portal.baseUrl}/apps/SelfService`
    }
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Handle different response formats
  let records: unknown[] = [];
  let totalCount = 0;

  if (Array.isArray(data)) {
    records = data;
    totalCount = data.length;
  } else if (data.Result && Array.isArray(data.Result)) {
    records = data.Result;
    totalCount = data.TotalCount || data.Total || records.length;
  } else if (data.results || data.Results) {
    records = data.results || data.Results;
    totalCount = data.totalCount || data.TotalCount || records.length;
  } else if (data.data) {
    records = data.data;
    totalCount = data.total || data.totalCount || records.length;
  }

  return {
    records,
    totalCount,
    hasMore: pageNumber * portal.pageSize < totalCount
  };
}

/**
 * Transform raw EnerGov record to standardized format
 */
function transformRecord(raw: Record<string, unknown>, portal: EnerGovPortalConfig): PermitRecord {
  // Handle various field naming conventions
  return {
    permitNumber: String(raw.PermitNumber || raw.permitNumber || raw.CaseNumber || raw.caseNumber || raw.RecordNumber || ''),
    address: String(raw.Address || raw.address || raw.SiteAddress || raw.siteAddress || raw.Location || ''),
    city: String(raw.City || raw.city || ''),
    state: portal.state,
    zipCode: String(raw.Zip || raw.zip || raw.ZipCode || raw.zipCode || ''),
    parcelNumber: String(raw.ParcelNumber || raw.parcelNumber || raw.Parcel || raw.APN || ''),
    ownerName: String(raw.OwnerName || raw.ownerName || raw.Owner || raw.Applicant || ''),
    permitType: String(raw.PermitType || raw.permitType || raw.RecordType || raw.Type || raw.Module || ''),
    status: String(raw.Status || raw.status || raw.RecordStatus || ''),
    appliedDate: raw.AppliedDate || raw.appliedDate || raw.SubmitDate || raw.OpenedDate || null,
    issuedDate: raw.IssuedDate || raw.issuedDate || raw.IssueDate || null,
    expirationDate: raw.ExpirationDate || raw.expirationDate || raw.ExpireDate || null,
    description: String(raw.Description || raw.description || raw.WorkDescription || ''),
    contractor: String(raw.Contractor || raw.contractor || raw.ContractorName || ''),
    valuation: Number(raw.Valuation || raw.valuation || raw.JobValue || 0) || undefined,
    squareFootage: Number(raw.SquareFootage || raw.squareFootage || raw.TotalSqFt || 0) || undefined,
    source: 'EnerGov',
    portal: portal.id,
    portalUrl: portal.baseUrl,
    scrapedAt: new Date().toISOString(),
    rawData: raw
  } as PermitRecord;
}

// ============================================
// CHECKPOINT MANAGEMENT
// ============================================

function loadCheckpoint(): Checkpoint | null {
  try {
    if (fs.existsSync(EXTRACTION_CONFIG.checkpointFile)) {
      const data = fs.readFileSync(EXTRACTION_CONFIG.checkpointFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    console.log('No checkpoint found, starting fresh');
  }
  return null;
}

function saveCheckpoint(checkpoint: Checkpoint): void {
  fs.writeFileSync(EXTRACTION_CONFIG.checkpointFile, JSON.stringify(checkpoint, null, 2));
}

// ============================================
// EXTRACTION LOGIC
// ============================================

async function extractPortal(
  portal: EnerGovPortalConfig,
  completedPortals: Set<string>
): Promise<number> {
  if (completedPortals.has(portal.id)) {
    console.log(`  Skipping ${portal.name} (already completed)`);
    return 0;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Extracting: ${portal.name}, ${portal.state}`);
  console.log(`Portal ID: ${portal.id}`);
  console.log(`Base URL: ${portal.baseUrl}`);
  console.log('='.repeat(60));

  // Ensure output directory exists
  if (!fs.existsSync(EXTRACTION_CONFIG.outputDir)) {
    fs.mkdirSync(EXTRACTION_CONFIG.outputDir, { recursive: true });
  }

  const outputFile = path.join(
    EXTRACTION_CONFIG.outputDir,
    `${portal.state.toLowerCase()}_${portal.id}.ndjson`
  );

  // Open file for appending
  const writeStream = fs.createWriteStream(outputFile, { flags: 'a' });
  let portalRecords = 0;

  try {
    // Try to discover API endpoint if not configured
    if (!portal.searchEndpoint) {
      console.log('\n  Discovering API endpoint...');
      const endpoint = await discoverSearchEndpoint(portal);
      if (endpoint) {
        portal.searchEndpoint = endpoint;
      } else {
        console.log('  Could not discover API endpoint, trying default...');
        portal.searchEndpoint = '/api/cap/search';
      }
    }

    // Use letter-based search to get all records
    const searchTerms = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
                         'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
                         '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

    // Also try empty search first (might return all)
    searchTerms.unshift('');

    const seenPermits = new Set<string>();

    for (const term of searchTerms) {
      console.log(`\n  Searching with term: "${term || '(all)'}"...`);

      let pageNumber = 1;
      let hasMore = true;
      let termRecords = 0;

      while (hasMore) {
        try {
          const result = await searchPermits(portal, pageNumber, term);

          if (result.records.length === 0) {
            hasMore = false;
            break;
          }

          for (const raw of result.records) {
            const record = transformRecord(raw as Record<string, unknown>, portal);

            // Deduplicate
            if (!seenPermits.has(record.permitNumber)) {
              seenPermits.add(record.permitNumber);
              writeStream.write(JSON.stringify(record) + '\n');
              portalRecords++;
              totalRecordsExtracted++;
              termRecords++;
            }
          }

          console.log(`    Page ${pageNumber}: ${result.records.length} records (new: ${termRecords}, total: ${portalRecords})`);

          pageNumber++;
          hasMore = result.hasMore && pageNumber <= 100; // Max 100 pages per term

          // Save checkpoint periodically
          if (totalRecordsExtracted % EXTRACTION_CONFIG.checkpointInterval === 0) {
            saveCheckpoint({
              lastPortalIndex: ENERGOV_PORTALS.findIndex(p => p.id === portal.id),
              lastSearchOffset: pageNumber,
              completedPortals: Array.from(completedPortals),
              totalRecordsExtracted,
              timestamp: new Date().toISOString()
            });
          }

          await sleep(EXTRACTION_CONFIG.delayBetweenRequests);

        } catch (error) {
          console.log(`    Error on page ${pageNumber}: ${error}`);
          hasMore = false;
        }
      }

      // If empty search got everything, no need to search by letter
      if (term === '' && portalRecords > 10000) {
        console.log('  Empty search returned full dataset, skipping letter search');
        break;
      }
    }

  } catch (error) {
    console.log(`  Portal extraction error: ${error}`);
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
  console.log('ENERGOV FULL EXTRACTION');
  console.log('='.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Proxy enabled: ${PROXY_CONFIG.enabled}`);
  console.log(`Output directory: ${EXTRACTION_CONFIG.outputDir}`);
  console.log('');

  // Ensure output directory exists
  if (!fs.existsSync(EXTRACTION_CONFIG.outputDir)) {
    fs.mkdirSync(EXTRACTION_CONFIG.outputDir, { recursive: true });
  }

  // Check for specific portal argument
  const portalArg = process.argv.find(arg => arg.startsWith('--portal='));
  let portalsToProcess = getEnabledPortals();

  if (portalArg) {
    const portalId = portalArg.split('=')[1];
    const portal = ENERGOV_PORTALS.find(p => p.id === portalId);
    if (portal) {
      portalsToProcess = [portal];
      console.log(`Processing single portal: ${portal.name}`);
    } else {
      console.log(`Portal not found: ${portalId}`);
      console.log(`Available portals: ${ENERGOV_PORTALS.map(p => p.id).join(', ')}`);
      process.exit(1);
    }
  }

  // Load checkpoint
  const checkpoint = loadCheckpoint();
  const completedPortals = new Set<string>(checkpoint?.completedPortals || []);
  totalRecordsExtracted = checkpoint?.totalRecordsExtracted || 0;

  console.log(`\nTotal portals to process: ${portalsToProcess.length}`);
  console.log(`Already completed: ${completedPortals.size}`);
  console.log(`Records from previous runs: ${totalRecordsExtracted}`);
  console.log(`Estimated total records: ${portalsToProcess.reduce((sum, p) => sum + p.estimatedRecords, 0).toLocaleString()}`);

  // List portals by state
  const byState = new Map<string, EnerGovPortalConfig[]>();
  for (const portal of portalsToProcess) {
    if (!byState.has(portal.state)) {
      byState.set(portal.state, []);
    }
    byState.get(portal.state)!.push(portal);
  }

  console.log('\nPortals by state:');
  for (const [state, portals] of byState) {
    console.log(`  ${state}: ${portals.map(p => p.name).join(', ')}`);
  }

  // Process portals
  let processed = 0;

  for (const portal of portalsToProcess) {
    processed++;
    console.log(`\n[${processed}/${portalsToProcess.length}] Processing...`);

    try {
      const records = await extractPortal(portal, completedPortals);

      if (records > 0) {
        completedPortals.add(portal.id);

        saveCheckpoint({
          lastPortalIndex: processed - 1,
          lastSearchOffset: 0,
          completedPortals: Array.from(completedPortals),
          totalRecordsExtracted,
          timestamp: new Date().toISOString()
        });
      }

      await sleep(EXTRACTION_CONFIG.delayBetweenPortals);

    } catch (error) {
      console.log(`  Error processing ${portal.name}: ${error}`);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('EXTRACTION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Completed: ${new Date().toISOString()}`);
  console.log(`Portals processed: ${completedPortals.size}`);
  console.log(`Total records extracted: ${totalRecordsExtracted.toLocaleString()}`);
  console.log(`Output directory: ${EXTRACTION_CONFIG.outputDir}`);
}

// Run
main().catch(console.error);
