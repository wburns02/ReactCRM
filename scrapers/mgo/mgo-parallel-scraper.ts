/**
 * MGO Connect Parallel Scraper - Instance B
 * Starts from jurisdiction 300+ to parallelize extraction
 * Uses proxy ports 10006-10010 to avoid conflicts with main scraper
 *
 * DOCUMENTATION:
 * - Main scraper (Instance A): jurisdictions 0-299, ports 10001-10010
 * - This scraper (Instance B): jurisdictions 300-432, ports 10006-10010
 * - Output: /mnt/data/mgo_extraction/mgo/full_extraction/
 * - Both write to same output dir, different jurisdiction files
 */

import * as fs from 'fs';
import * as path from 'path';
import { HttpsProxyAgent } from 'https-proxy-agent';

const CONFIG = {
  api: {
    baseUrl: 'https://api.mgoconnect.org/api/v3/cp',
  },
  proxy: {
    host: 'gate.decodo.com',
    ports: [10006, 10007, 10008, 10009, 10010],
    username: 'spu4grchfc',
    password: 'jfsTWNf3N4ckhwgnk8',
  },
  extraction: {
    batchSize: 100,
    maxRetries: 5,
    startJurisdiction: 300,
    outputDir: '/mnt/data/mgo_extraction/mgo/full_extraction',
  },
};

let currentProxyIndex = 0;

function getNextProxy(): string {
  const port = CONFIG.proxy.ports[currentProxyIndex % CONFIG.proxy.ports.length];
  currentProxyIndex++;
  console.log(`  [Proxy-B] Using port ${port}`);
  return `http://${CONFIG.proxy.username}:${CONFIG.proxy.password}@${CONFIG.proxy.host}:${port}`;
}

async function fetchWithProxy(url: string, options: RequestInit = {}): Promise<Response> {
  const proxyUrl = getNextProxy();
  const agent = new HttpsProxyAgent(proxyUrl);
  return fetch(url, { ...options, agent: agent as any });
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = CONFIG.extraction.maxRetries): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithProxy(url, options);

      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 5000;
        console.log(`    Rate limited. Waiting ${waitTime/1000}s...`);
        await sleep(waitTime);
        continue;
      }

      if (response.status === 403) {
        console.log('    Auth error, rotating proxy...');
        await sleep(2000);
        continue;
      }

      if (response.status >= 500) {
        const waitTime = Math.pow(2, attempt) * 5000;
        console.log(`    Server error ${response.status}. Waiting ${waitTime/1000}s (attempt ${attempt + 1}/${retries + 1})...`);
        await sleep(waitTime);
        continue;
      }

      return response;
    } catch (error) {
      if (attempt < retries) {
        await sleep(3000);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

async function getJurisdictions(): Promise<any[]> {
  const response = await fetchWithRetry(`${CONFIG.api.baseUrl}/public/jurisdictions`);
  const data = await response.json();
  // API returns { data: [...] } not { jurisdictions: [...] }
  const jurisdictions = data.data || data.jurisdictions || [];
  // Normalize field names
  return jurisdictions.map((j: any) => ({
    jurisdictionID: j.jurisdictionID,
    name: j.jurisdictionName || j.name,
    state: j.stateID || j.state,
  }));
}

async function getProjectTypes(jurisdictionId: number): Promise<any[]> {
  try {
    const response = await fetchWithRetry(
      `${CONFIG.api.baseUrl}/public/project-types?jurisdictionID=${jurisdictionId}`
    );
    const text = await response.text();
    if (!text || text.trim() === '') return [];
    const data = JSON.parse(text);
    return data.projectTypes || data.data || [];
  } catch (error) {
    console.log(`    Error getting project types: ${error}`);
    return [];
  }
}

async function searchProjects(jurisdictionId: number, projectTypeId: number, offset: number): Promise<{records: any[], total: number}> {
  try {
    const response = await fetchWithRetry(
      `${CONFIG.api.baseUrl}/project/search-projects`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jurisdictionID: jurisdictionId,
          projectTypeID: projectTypeId,
          offset: offset,
          limit: CONFIG.extraction.batchSize,
          sortField: 'projectID',
          sortOrder: 'asc',
        }),
      }
    );
    const text = await response.text();
    if (!text || text.trim() === '') return { records: [], total: 0 };
    const data = JSON.parse(text);
    return {
      records: data.projects || data.data || [],
      total: data.totalCount || 0,
    };
  } catch (error) {
    console.log(`    Error searching projects: ${error}`);
    return { records: [], total: 0 };
  }
}

function isJurisdictionComplete(jurisdiction: any): boolean {
  const safeName = jurisdiction.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const state = (jurisdiction.state || 'unknown').toLowerCase();
  const filename = `${state}_${safeName}.ndjson`;
  const filepath = path.join(CONFIG.extraction.outputDir, filename);
  return fs.existsSync(filepath) && fs.statSync(filepath).size > 0;
}

async function extractJurisdiction(jurisdiction: any, index: number, total: number): Promise<number> {
  const safeName = jurisdiction.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const state = (jurisdiction.state || 'unknown').toLowerCase();
  const filename = `${state}_${safeName}.ndjson`;
  const filepath = path.join(CONFIG.extraction.outputDir, filename);

  console.log(`\n[B-${index}/${total}] Processing...`);

  if (isJurisdictionComplete(jurisdiction)) {
    console.log(`  Skipping ${jurisdiction.name} (already completed)`);
    return 0;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Extracting [B]: ${jurisdiction.name}, ${jurisdiction.state}`);
  console.log(`${'='.repeat(60)}\n`);

  const projectTypes = await getProjectTypes(jurisdiction.jurisdictionID);
  console.log(`  Found ${projectTypes.length} project types: ${projectTypes.map((p: any) => p.name).join(', ')}`);

  let totalRecords = 0;
  const writeStream = fs.createWriteStream(filepath, { flags: 'a' });

  for (const projectType of projectTypes) {
    console.log(`\n  Project Type: ${projectType.name} (ID: ${projectType.itemID})`);

    let offset = 0;
    let hasMore = true;
    let errorCount = 0;
    const maxErrors = 3;

    while (hasMore) {
      try {
        const { records } = await searchProjects(
          jurisdiction.jurisdictionID,
          projectType.itemID,
          offset
        );

        if (records.length === 0) {
          hasMore = false;
          break;
        }

        for (const record of records) {
          const enriched = {
            ...record,
            jurisdiction_name: jurisdiction.name,
            jurisdiction_id: jurisdiction.jurisdictionID,
            state: jurisdiction.state,
            project_type: projectType.name,
            project_type_id: projectType.itemID,
            extracted_at: new Date().toISOString(),
            scraper_instance: 'B',
          };
          writeStream.write(JSON.stringify(enriched) + '\n');
        }

        totalRecords += records.length;
        console.log(`    Offset ${offset}: ${records.length} records (Total: ${totalRecords})`);

        offset += CONFIG.extraction.batchSize;
        errorCount = 0;

        if (records.length < CONFIG.extraction.batchSize) {
          hasMore = false;
        }

        await sleep(500);
      } catch (error) {
        errorCount++;
        console.log(`    Error at offset ${offset}: ${error} (${errorCount}/${maxErrors})`);
        if (errorCount >= maxErrors) {
          console.log(`    Too many errors, skipping to next project type...`);
          hasMore = false;
        } else {
          offset += CONFIG.extraction.batchSize;
          await sleep(5000);
        }
      }
    }
  }

  writeStream.end();
  console.log(`\n  TOTAL for ${jurisdiction.name}: ${totalRecords} records`);
  console.log(`  Saved to: ${filename}`);

  return totalRecords;
}

async function main() {
  console.log('='.repeat(60));
  console.log('MGO Connect Parallel Scraper - Instance B');
  console.log(`Starting from jurisdiction ${CONFIG.extraction.startJurisdiction}`);
  console.log(`Using proxy ports: ${CONFIG.proxy.ports.join(', ')}`);
  console.log(`Output: ${CONFIG.extraction.outputDir}`);
  console.log('='.repeat(60));

  if (!fs.existsSync(CONFIG.extraction.outputDir)) {
    fs.mkdirSync(CONFIG.extraction.outputDir, { recursive: true });
  }

  const jurisdictions = await getJurisdictions();
  console.log(`\nFound ${jurisdictions.length} total jurisdictions`);

  const subset = jurisdictions.slice(CONFIG.extraction.startJurisdiction);
  console.log(`Processing jurisdictions ${CONFIG.extraction.startJurisdiction} to ${jurisdictions.length}`);
  console.log(`Subset size: ${subset.length} jurisdictions\n`);

  let grandTotal = 0;

  for (let i = 0; i < subset.length; i++) {
    const jurisdiction = subset[i];
    const globalIndex = CONFIG.extraction.startJurisdiction + i;
    const records = await extractJurisdiction(jurisdiction, globalIndex, jurisdictions.length);
    grandTotal += records;
  }

  console.log('\n' + '='.repeat(60));
  console.log('EXTRACTION COMPLETE - Instance B');
  console.log(`Total records extracted: ${grandTotal.toLocaleString()}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
