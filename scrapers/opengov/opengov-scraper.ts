/**
 * OpenGov Permit Portal Scraper
 *
 * Uses Playwright to authenticate via Auth0 and extract permit records
 * from OpenGov/ViewPointCloud portals.
 *
 * USAGE:
 *   npx tsx scrapers/opengov/opengov-scraper.ts
 *
 * ENVIRONMENT:
 *   OPENGOV_EMAIL=your_email
 *   OPENGOV_PASSWORD=your_password
 *   DECODO_USER=proxy_username (optional)
 *   DECODO_PASS=proxy_password (optional)
 */

import { chromium, Browser, Page, BrowserContext, Response } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { HttpsProxyAgent } from 'https-proxy-agent';
import {
  PROXY_CONFIG,
  EXTRACTION_CONFIG,
  API_CONFIG,
  OUTPUT_CONFIG,
  getEnabledJurisdictions,
  JurisdictionConfig
} from './opengov-config';
import { PermitRecord, Checkpoint } from './opengov-types';

// ============================================
// GLOBALS
// ============================================

let authToken: string = '';
let currentProxyIndex = 0;
let totalRecordsExtracted = 0;
const capturedRecords: Map<string, PermitRecord[]> = new Map();

// ============================================
// PROXY MANAGEMENT
// ============================================

function getNextProxyPort(): number {
  const port = PROXY_CONFIG.ports[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % PROXY_CONFIG.ports.length;
  return port;
}

function getProxyConfig() {
  if (!PROXY_CONFIG.enabled) return undefined;

  const port = getNextProxyPort();
  return {
    server: `http://${PROXY_CONFIG.host}:${port}`,
    username: PROXY_CONFIG.username,
    password: PROXY_CONFIG.password
  };
}

function getProxyAgent(): HttpsProxyAgent<string> | undefined {
  if (!PROXY_CONFIG.enabled) return undefined;

  const port = getNextProxyPort();
  const proxyUrl = `http://${PROXY_CONFIG.username}:${PROXY_CONFIG.password}@${PROXY_CONFIG.host}:${port}`;
  return new HttpsProxyAgent(proxyUrl);
}

// ============================================
// HELPERS
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function getOutputFilename(jurisdiction: JurisdictionConfig): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  return path.join(
    OUTPUT_CONFIG.dir,
    `${sanitizeFilename(jurisdiction.name)}_${jurisdiction.state.toLowerCase()}_permits_${date}.ndjson`
  );
}

// ============================================
// CHECKPOINT MANAGEMENT
// ============================================

function loadCheckpoint(): Checkpoint | null {
  try {
    if (fs.existsSync(OUTPUT_CONFIG.checkpointFile)) {
      const data = fs.readFileSync(OUTPUT_CONFIG.checkpointFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log('No checkpoint found, starting fresh');
  }
  return null;
}

function saveCheckpoint(checkpoint: Checkpoint): void {
  fs.writeFileSync(OUTPUT_CONFIG.checkpointFile, JSON.stringify(checkpoint, null, 2));
}

// ============================================
// API FUNCTIONS
// ============================================

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<globalThis.Response> {
  const agent = getProxyAgent();

  const fetchOptions: RequestInit & { agent?: unknown } = {
    ...options,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      ...options.headers
    },
    // @ts-ignore - agent is valid for node-fetch
    agent: agent
  };

  return fetch(url, fetchOptions);
}

async function getRecordTypes(tenant: string): Promise<any[]> {
  const url = `${API_CONFIG.restBase}/${tenant}/record_types`;
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    console.log(`  Failed to get record types: ${response.status}`);
    return [];
  }

  const data = await response.json();
  return data.data || [];
}

async function getCategories(tenant: string): Promise<any[]> {
  const url = `${API_CONFIG.restBase}/${tenant}/categories`;
  const response = await fetchWithAuth(url);

  if (!response.ok) {
    console.log(`  Failed to get categories: ${response.status}`);
    return [];
  }

  const data = await response.json();
  return data.data || [];
}

async function searchRecordsGraphQL(tenant: string, query: string = ''): Promise<any[]> {
  const graphqlQuery = {
    query: `
      query SearchRecords($tenant: String!, $query: String, $limit: Int, $offset: Int) {
        searchRecords(tenant: $tenant, query: $query, limit: $limit, offset: $offset) {
          records {
            id
            recordNumber
            recordType
            status
            address
            city
            state
            zipCode
            applicantName
            createdAt
            updatedAt
          }
          total
          hasMore
        }
      }
    `,
    variables: {
      tenant: tenant,
      query: query,
      limit: EXTRACTION_CONFIG.batchSize,
      offset: 0
    }
  };

  const response = await fetchWithAuth(API_CONFIG.graphql.search, {
    method: 'POST',
    body: JSON.stringify(graphqlQuery)
  });

  if (!response.ok) {
    const text = await response.text();
    console.log(`  GraphQL search failed: ${response.status} - ${text.substring(0, 200)}`);
    return [];
  }

  const data = await response.json();
  if (data.errors) {
    console.log(`  GraphQL errors: ${JSON.stringify(data.errors).substring(0, 200)}`);
    return [];
  }

  return data.data?.searchRecords?.records || [];
}

// ============================================
// BROWSER AUTHENTICATION
// ============================================

async function setupNetworkCapture(page: Page, jurisdiction: JurisdictionConfig): Promise<void> {
  // Capture authentication tokens from network
  page.on('response', async (response: Response) => {
    const url = response.url();

    // Capture auth tokens
    if (url.includes('auth0') || url.includes('token')) {
      try {
        const headers = response.headers();
        if (headers['authorization']) {
          authToken = headers['authorization'].replace('Bearer ', '');
          console.log('  [Auth] Captured authorization token');
        }
      } catch {}
    }

    // Capture API responses with records
    if (url.includes('/v2/') && url.includes('/records')) {
      try {
        const data = await response.json();
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          console.log(`  [Records] Captured ${data.data.length} records from ${url}`);

          const records = data.data.map((r: any) => transformRecord(r, jurisdiction));
          const existing = capturedRecords.get(jurisdiction.id) || [];
          capturedRecords.set(jurisdiction.id, [...existing, ...records]);
        }
      } catch {}
    }

    // Capture GraphQL responses
    if (url.includes('graphql')) {
      try {
        const data = await response.json();
        if (data.data?.records || data.data?.searchRecords) {
          const records = data.data.records || data.data.searchRecords?.records || [];
          console.log(`  [GraphQL] Captured ${records.length} records`);

          const transformed = records.map((r: any) => transformRecord(r, jurisdiction));
          const existing = capturedRecords.get(jurisdiction.id) || [];
          capturedRecords.set(jurisdiction.id, [...existing, ...transformed]);
        }
      } catch {}
    }
  });

  // Also capture from requests
  page.on('request', (request) => {
    const headers = request.headers();
    if (headers['authorization'] && headers['authorization'].startsWith('Bearer ')) {
      const token = headers['authorization'].replace('Bearer ', '');
      if (token && token.length > 50) {
        authToken = token;
        console.log('  [Auth] Captured token from request');
      }
    }
  });
}

function transformRecord(raw: any, jurisdiction: JurisdictionConfig): PermitRecord {
  const attrs = raw.attributes || raw;

  return {
    permit_number: attrs.recordNumber || attrs.projectNumber || raw.id || 'UNKNOWN',
    address: attrs.address || attrs.projectAddress || '',
    city: attrs.city || attrs.projectCity || jurisdiction.name,
    state: jurisdiction.state,
    county: jurisdiction.county,
    permit_type: attrs.recordType || attrs.workType || '',
    status: attrs.status || attrs.projectStatus || '',
    issue_date: attrs.createdAt || attrs.dateCreated || '',
    applicant: attrs.applicantName || '',
    owner_name: attrs.ownerName || '',
    lat: attrs.latitude || attrs.projectLat,
    lng: attrs.longitude || attrs.projectLng,
    parcel_number: attrs.parcelNumber || '',
    description: attrs.description || attrs.projectDescription || '',
    source: 'OpenGov',
    jurisdiction: `${jurisdiction.name}, ${jurisdiction.state}`,
    scraped_at: new Date().toISOString(),
    raw_data: raw
  };
}

async function authenticateAndExtract(browser: Browser, jurisdiction: JurisdictionConfig): Promise<number> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing: ${jurisdiction.name}, ${jurisdiction.state}`);
  console.log(`Portal: ${jurisdiction.portalUrl}`);
  console.log('='.repeat(60));

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();
  await setupNetworkCapture(page, jurisdiction);

  let extractedCount = 0;

  try {
    // Navigate to portal
    console.log('\n1. Loading portal...');
    await page.goto(jurisdiction.portalUrl, {
      waitUntil: 'domcontentloaded',
      timeout: EXTRACTION_CONFIG.timeout
    });
    await sleep(5000); // Wait for Ember.js to load

    // Check if login is required
    const loginButton = await page.$('button:has-text("Log In"), a:has-text("Log In"), button:has-text("Sign In")');

    if (loginButton && process.env.OPENGOV_EMAIL && process.env.OPENGOV_PASSWORD) {
      console.log('\n2. Attempting authentication...');
      await loginButton.click();
      await sleep(2000);

      // Wait for Auth0 login form
      const emailInput = await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
      if (emailInput) {
        await emailInput.fill(process.env.OPENGOV_EMAIL);
        await page.click('button[type="submit"]');
        await sleep(1000);

        const passwordInput = await page.waitForSelector('input[type="password"]', { timeout: 5000 });
        if (passwordInput) {
          await passwordInput.fill(process.env.OPENGOV_PASSWORD);
          await page.click('button[type="submit"]');
          await sleep(5000);
        }
      }
    }

    // Navigate to records/search
    console.log('\n3. Navigating to permit records...');

    // Try to find search functionality (with visibility check)
    try {
      const searchLink = await page.$('a[href*="/search"]:visible, button:has-text("Search"):visible');
      if (searchLink && await searchLink.isVisible()) {
        await searchLink.click();
        await sleep(3000);
      }
    } catch {
      console.log('   Search link not available');
    }

    // Try category links (only visible ones)
    try {
      const categoryLinks = await page.$$('a[href*="/categories/"]:visible');
      console.log(`   Found ${categoryLinks.length} visible category links`);

      for (const link of categoryLinks.slice(0, 3)) {
        try {
          if (await link.isVisible()) {
            await link.click();
            await sleep(3000);

            // Look for record type links (only visible ones)
            const recordTypeLinks = await page.$$('a[href*="/record-types/"]:visible');
            for (const rtLink of recordTypeLinks.slice(0, 2)) {
              try {
                if (await rtLink.isVisible()) {
                  await rtLink.click();
                  await sleep(3000);
                }
              } catch {
                continue;
              }
            }

            await page.goBack();
            await sleep(2000);
          }
        } catch {
          continue;
        }
      }
    } catch {
      console.log('   No category links available');
    }

    // Collect captured records
    const records = capturedRecords.get(jurisdiction.id) || [];
    extractedCount = records.length;

    if (extractedCount > 0) {
      // Write to NDJSON file
      const outputFile = getOutputFilename(jurisdiction);
      const dir = path.dirname(outputFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const writeStream = fs.createWriteStream(outputFile, { flags: 'w' });
      for (const record of records) {
        writeStream.write(JSON.stringify(record) + '\n');
      }
      writeStream.end();

      console.log(`\n   Extracted ${extractedCount} records`);
      console.log(`   Saved to: ${outputFile}`);
    } else {
      console.log('\n   No records captured (may require authentication)');
    }

    // Always try public API extraction (categories and record_types work without auth)
    console.log('\n4. Fetching public API data...');

    try {
      const recordTypes = await getRecordTypes(jurisdiction.id);
      console.log(`   Found ${recordTypes.length} record types via public API`);

      const categories = await getCategories(jurisdiction.id);
      console.log(`   Found ${categories.length} categories via public API`);

      // Save metadata if we have it
      if (recordTypes.length > 0 || categories.length > 0) {
        const metadataFile = path.join(OUTPUT_CONFIG.dir, `${jurisdiction.id}_metadata.json`);
        fs.writeFileSync(metadataFile, JSON.stringify({
          jurisdiction: jurisdiction.name,
          state: jurisdiction.state,
          portalUrl: jurisdiction.portalUrl,
          recordTypes: recordTypes.map((rt: any) => ({
            id: rt.id,
            name: rt.attributes?.name,
            categoryId: rt.attributes?.categoryID,
            viewAccess: rt.attributes?.ViewAccessID
          })),
          categories: categories.map((c: any) => ({
            id: c.id,
            name: c.attributes?.name,
            isEnabled: c.attributes?.isEnabled
          })),
          extractedAt: new Date().toISOString()
        }, null, 2));
        console.log(`   Saved metadata to: ${metadataFile}`);
      }

      // If we have auth token, try GraphQL
      if (authToken) {
        console.log('\n5. Trying authenticated GraphQL...');
        const graphqlRecords = await searchRecordsGraphQL(jurisdiction.id);
        if (graphqlRecords.length > 0) {
          console.log(`   Found ${graphqlRecords.length} records via GraphQL`);
          extractedCount += graphqlRecords.length;
        }
      }
    } catch (apiError) {
      console.log(`   API error: ${apiError}`);
    }

  } catch (error) {
    console.error(`Error processing ${jurisdiction.name}:`, error);
  } finally {
    await context.close();
  }

  totalRecordsExtracted += extractedCount;
  return extractedCount;
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('OPENGOV PERMIT PORTAL SCRAPER');
  console.log('='.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Proxy enabled: ${PROXY_CONFIG.enabled}`);
  console.log(`Output directory: ${OUTPUT_CONFIG.dir}`);
  console.log('');

  // Check for credentials
  if (!process.env.OPENGOV_EMAIL || !process.env.OPENGOV_PASSWORD) {
    console.log('WARNING: OPENGOV_EMAIL and OPENGOV_PASSWORD not set.');
    console.log('         Scraper will only capture publicly visible data.');
    console.log('');
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_CONFIG.dir)) {
    fs.mkdirSync(OUTPUT_CONFIG.dir, { recursive: true });
  }

  // Load checkpoint
  const checkpoint = loadCheckpoint();
  const completedJurisdictions = new Set<string>(checkpoint?.completedJurisdictions || []);
  totalRecordsExtracted = checkpoint?.totalRecordsExtracted || 0;

  // Get jurisdictions to process
  const jurisdictions = getEnabledJurisdictions();
  console.log(`Total jurisdictions: ${jurisdictions.length}`);
  console.log(`Already completed: ${completedJurisdictions.size}`);
  console.log(`Records from previous runs: ${totalRecordsExtracted}`);

  // Launch browser
  const browser = await chromium.launch({
    headless: true,
    proxy: getProxyConfig()
  });

  try {
    let processed = 0;

    for (const jurisdiction of jurisdictions) {
      processed++;

      if (completedJurisdictions.has(jurisdiction.id)) {
        console.log(`\n[${processed}/${jurisdictions.length}] Skipping ${jurisdiction.name} (already completed)`);
        continue;
      }

      console.log(`\n[${processed}/${jurisdictions.length}] Processing ${jurisdiction.name}...`);

      const records = await authenticateAndExtract(browser, jurisdiction);

      if (records > 0) {
        completedJurisdictions.add(jurisdiction.id);
      }

      // Save checkpoint
      saveCheckpoint({
        jurisdictionId: jurisdiction.id,
        lastOffset: 0,
        completedJurisdictions: Array.from(completedJurisdictions),
        totalRecordsExtracted,
        timestamp: new Date().toISOString()
      });

      await sleep(EXTRACTION_CONFIG.delayBetweenJurisdictions);
    }

  } finally {
    await browser.close();
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('EXTRACTION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Completed: ${new Date().toISOString()}`);
  console.log(`Jurisdictions processed: ${completedJurisdictions.size}`);
  console.log(`Total records extracted: ${totalRecordsExtracted}`);
  console.log(`Output directory: ${OUTPUT_CONFIG.dir}`);
}

// Run
main().catch(console.error);
