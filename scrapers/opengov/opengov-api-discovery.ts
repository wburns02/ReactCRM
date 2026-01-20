/**
 * OpenGov API Discovery Script
 *
 * Uses Playwright to intercept network traffic from OpenGov permit portals
 * and document internal API endpoints.
 *
 * USAGE:
 *   npx tsx scrapers/opengov/opengov-api-discovery.ts
 *
 * Run this on your local PC with a visible browser to discover API patterns.
 */

import { chromium, Browser, Page, Response } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { DiscoveredEndpoint, APIDiscoveryResult, DiscoveredEndpointSummary } from './opengov-types';

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Portals to discover
  portals: [
    { id: 'seagoville_tx', name: 'Seagoville TX', url: 'https://seagovilletx.portal.opengov.com' },
    { id: 'stpetersburg_fl', name: 'St. Petersburg FL', url: 'https://stpetersburgfl.portal.opengov.com' },
    { id: 'apopka_fl', name: 'Apopka FL', url: 'https://apopkafl.portal.opengov.com' },
    { id: 'cocoabeach_fl', name: 'Cocoa Beach FL', url: 'https://cocoabeachfl.portal.opengov.com' },
    { id: 'arlington_ma', name: 'Arlington MA', url: 'https://arlingtonma.portal.opengov.com' },
    { id: 'brownsburg_in', name: 'Brownsburg IN', url: 'https://brownsburgin.portal.opengov.com' },
  ],

  // Browser settings
  browser: {
    headless: false,  // Set to true for server, false for debugging
    slowMo: 100,      // Slow down actions for visibility
    timeout: 60000    // 60 second timeout
  },

  // Output
  output: {
    dir: './scrapers/opengov',
    endpointsFile: './scrapers/opengov/discovered-endpoints.json',
    rawCapturesDir: './scrapers/opengov/raw_captures'
  },

  // URL patterns to ignore (static assets)
  ignorePatterns: [
    /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i,
    /google-analytics/i,
    /googletagmanager/i,
    /facebook/i,
    /twitter/i,
    /sentry\.io/i,
    /hotjar/i,
    /intercom/i,
    /segment\.io/i,
    /mixpanel/i,
    /amplitude/i,
    /newrelic/i,
    /cloudflare/i,
    /fonts\.googleapis/i,
    /fonts\.gstatic/i
  ],

  // URL patterns that indicate API calls
  apiPatterns: [
    /\/api\//i,
    /\/v\d+\//i,
    /graphql/i,
    /\.json$/i,
    /application\/json/i
  ]
};

// ============================================
// GLOBALS
// ============================================

let capturedEndpoints: DiscoveredEndpoint[] = [];

// ============================================
// HELPERS
// ============================================

function shouldIgnoreUrl(url: string): boolean {
  return CONFIG.ignorePatterns.some(pattern => pattern.test(url));
}

function isApiCall(url: string, contentType: string | null): boolean {
  // Check URL patterns
  if (CONFIG.apiPatterns.some(pattern => pattern.test(url))) {
    return true;
  }
  // Check content type
  if (contentType?.includes('application/json')) {
    return true;
  }
  return false;
}

function extractUrlPattern(url: string): string {
  try {
    const urlObj = new URL(url);
    // Replace numeric IDs with :id placeholder
    const pathPattern = urlObj.pathname
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/gi, '/:uuid'); // UUID pattern
    return `${urlObj.host}${pathPattern}`;
  } catch {
    return url;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// NETWORK INTERCEPTION
// ============================================

async function setupNetworkCapture(page: Page, portalId: string): Promise<void> {
  // Capture all responses
  page.on('response', async (response: Response) => {
    const request = response.request();
    const url = request.url();

    // Skip ignored URLs
    if (shouldIgnoreUrl(url)) return;

    const contentType = response.headers()['content-type'] || null;

    // Only capture API-like calls
    if (!isApiCall(url, contentType)) return;

    try {
      const endpoint: DiscoveredEndpoint = {
        url: url,
        method: request.method(),
        status: response.status(),
        contentType: contentType,
        requestHeaders: request.headers(),
        timestamp: new Date().toISOString(),
        portal: portalId
      };

      // Capture request body if present
      const postData = request.postData();
      if (postData) {
        try {
          endpoint.requestBody = JSON.parse(postData);
        } catch {
          endpoint.requestBody = postData;
        }
      }

      // Capture response body (limit size)
      try {
        const text = await response.text();
        if (text.length < 500000) { // 500KB limit
          try {
            endpoint.responseBody = JSON.parse(text);
          } catch {
            endpoint.responseBody = text.substring(0, 5000); // First 5KB of non-JSON
          }
        } else {
          endpoint.responseBody = `[TRUNCATED: ${text.length} bytes]`;
        }
      } catch {
        // Response body not available
      }

      capturedEndpoints.push(endpoint);
      console.log(`  [API] ${endpoint.method} ${new URL(url).pathname} → ${endpoint.status}`);

    } catch (error) {
      console.log(`  [Error capturing] ${url}: ${error}`);
    }
  });
}

// ============================================
// PORTAL EXPLORATION
// ============================================

async function explorePortal(browser: Browser, portal: { id: string; name: string; url: string }): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Exploring: ${portal.name}`);
  console.log(`URL: ${portal.url}`);
  console.log('='.repeat(60));

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();
  await setupNetworkCapture(page, portal.id);

  try {
    // Navigate to portal home
    console.log('\n1. Loading portal homepage...');
    await page.goto(portal.url, { waitUntil: 'networkidle', timeout: CONFIG.browser.timeout });
    await sleep(3000); // Let Ember.js fully load

    // Screenshot for reference
    const screenshotDir = path.join(CONFIG.output.rawCapturesDir, portal.id);
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    await page.screenshot({ path: path.join(screenshotDir, '01_homepage.png'), fullPage: true });

    // Look for category links
    console.log('\n2. Looking for permit categories...');
    const categoryLinks = await page.$$eval('a[href*="/categories/"]', links =>
      links.map(link => ({
        text: link.textContent?.trim() || '',
        href: link.getAttribute('href') || ''
      })).slice(0, 5) // First 5 categories
    );

    console.log(`   Found ${categoryLinks.length} category links`);

    // Visit first category
    if (categoryLinks.length > 0) {
      console.log(`\n3. Visiting category: ${categoryLinks[0].text}...`);
      await page.click(`a[href*="${categoryLinks[0].href}"]`);
      await page.waitForLoadState('networkidle');
      await sleep(2000);
      await page.screenshot({ path: path.join(screenshotDir, '02_category.png'), fullPage: true });
    }

    // Look for search functionality
    console.log('\n4. Looking for search functionality...');
    const searchInput = await page.$('input[type="search"], input[placeholder*="search"], input[name*="search"]');
    if (searchInput) {
      console.log('   Found search input, trying a search...');
      await searchInput.fill('permit');
      await page.keyboard.press('Enter');
      await sleep(3000);
      await page.screenshot({ path: path.join(screenshotDir, '03_search_results.png'), fullPage: true });
    }

    // Look for record type links
    console.log('\n5. Looking for record types...');
    const recordTypeLinks = await page.$$eval('a[href*="/record-types/"]', links =>
      links.map(link => ({
        text: link.textContent?.trim() || '',
        href: link.getAttribute('href') || ''
      })).slice(0, 3) // First 3 record types
    );

    if (recordTypeLinks.length > 0) {
      console.log(`   Found ${recordTypeLinks.length} record type links`);
      console.log(`\n6. Visiting record type: ${recordTypeLinks[0].text}...`);
      await page.click(`a[href*="${recordTypeLinks[0].href}"]`);
      await page.waitForLoadState('networkidle');
      await sleep(2000);
      await page.screenshot({ path: path.join(screenshotDir, '04_record_type.png'), fullPage: true });
    }

    // Try to find and click on individual records
    console.log('\n7. Looking for individual permit records...');
    const recordLinks = await page.$$('a[href*="/records/"]');
    if (recordLinks.length > 0) {
      console.log(`   Found ${recordLinks.length} record links, clicking first one...`);
      await recordLinks[0].click();
      await page.waitForLoadState('networkidle');
      await sleep(2000);
      await page.screenshot({ path: path.join(screenshotDir, '05_record_detail.png'), fullPage: true });
    }

    // Look for "View All" or pagination
    console.log('\n8. Looking for pagination/view all...');
    const viewAllButton = await page.$('button:has-text("View All"), a:has-text("View All"), button:has-text("Load More")');
    if (viewAllButton) {
      console.log('   Found View All button, clicking...');
      await viewAllButton.click();
      await sleep(3000);
      await page.screenshot({ path: path.join(screenshotDir, '06_view_all.png'), fullPage: true });
    }

    console.log(`\n   Captured ${capturedEndpoints.filter(e => e.portal === portal.id).length} API calls from ${portal.name}`);

  } catch (error) {
    console.error(`Error exploring ${portal.name}:`, error);
  } finally {
    await context.close();
  }
}

// ============================================
// ANALYSIS
// ============================================

function analyzeEndpoints(endpoints: DiscoveredEndpoint[]): DiscoveredEndpointSummary[] {
  const patternMap = new Map<string, { methods: Set<string>; urls: string[]; count: number }>();

  for (const endpoint of endpoints) {
    const pattern = extractUrlPattern(endpoint.url);
    if (!patternMap.has(pattern)) {
      patternMap.set(pattern, { methods: new Set(), urls: [], count: 0 });
    }
    const entry = patternMap.get(pattern)!;
    entry.methods.add(endpoint.method);
    entry.urls.push(endpoint.url);
    entry.count++;
  }

  const summaries: DiscoveredEndpointSummary[] = [];
  for (const [pattern, data] of patternMap) {
    summaries.push({
      pattern,
      methods: Array.from(data.methods),
      sampleUrl: data.urls[0],
      occurrences: data.count,
      description: guessEndpointPurpose(pattern)
    });
  }

  // Sort by occurrences
  return summaries.sort((a, b) => b.occurrences - a.occurrences);
}

function guessEndpointPurpose(pattern: string): string {
  const lower = pattern.toLowerCase();
  if (lower.includes('record-type')) return 'Record type definitions';
  if (lower.includes('record')) return 'Permit records';
  if (lower.includes('categor')) return 'Categories';
  if (lower.includes('search')) return 'Search functionality';
  if (lower.includes('filter')) return 'Filter options';
  if (lower.includes('permit')) return 'Permit data';
  if (lower.includes('application')) return 'Applications';
  if (lower.includes('inspection')) return 'Inspections';
  if (lower.includes('user') || lower.includes('auth')) return 'Authentication';
  if (lower.includes('config')) return 'Configuration';
  return 'Unknown';
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('OPENGOV API DISCOVERY');
  console.log('='.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Portals to explore: ${CONFIG.portals.length}`);
  console.log('');

  // Ensure output directories exist
  if (!fs.existsSync(CONFIG.output.rawCapturesDir)) {
    fs.mkdirSync(CONFIG.output.rawCapturesDir, { recursive: true });
  }

  // Launch browser
  const browser = await chromium.launch({
    headless: CONFIG.browser.headless,
    slowMo: CONFIG.browser.slowMo
  });

  try {
    // Explore each portal
    for (const portal of CONFIG.portals) {
      await explorePortal(browser, portal);
      await sleep(2000);
    }

    // Analyze and save results
    console.log('\n' + '='.repeat(60));
    console.log('ANALYSIS');
    console.log('='.repeat(60));

    const summary = analyzeEndpoints(capturedEndpoints);

    console.log(`\nTotal API calls captured: ${capturedEndpoints.length}`);
    console.log(`Unique patterns: ${summary.length}`);
    console.log('\nTop API patterns:');
    for (const s of summary.slice(0, 20)) {
      console.log(`  [${s.methods.join(',')}] ${s.pattern} (${s.occurrences}x) - ${s.description}`);
    }

    // Save full results
    const result: APIDiscoveryResult = {
      portal: 'combined',
      portalUrl: 'multiple',
      discoveredAt: new Date().toISOString(),
      endpoints: capturedEndpoints,
      summary: summary
    };

    fs.writeFileSync(
      CONFIG.output.endpointsFile,
      JSON.stringify(result, null, 2)
    );

    console.log(`\nResults saved to: ${CONFIG.output.endpointsFile}`);

    // Save per-portal results
    for (const portal of CONFIG.portals) {
      const portalEndpoints = capturedEndpoints.filter(e => e.portal === portal.id);
      if (portalEndpoints.length > 0) {
        const portalFile = path.join(CONFIG.output.rawCapturesDir, portal.id, 'endpoints.json');
        fs.writeFileSync(portalFile, JSON.stringify({
          portal: portal.name,
          portalUrl: portal.url,
          discoveredAt: new Date().toISOString(),
          endpoints: portalEndpoints,
          summary: analyzeEndpoints(portalEndpoints)
        }, null, 2));
        console.log(`  ${portal.name}: ${portalEndpoints.length} endpoints → ${portalFile}`);
      }
    }

  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('DISCOVERY COMPLETE');
  console.log('='.repeat(60));
}

// Run
main().catch(console.error);
