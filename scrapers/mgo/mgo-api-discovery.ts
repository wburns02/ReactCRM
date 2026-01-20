/**
 * MGO Connect API Discovery Script
 *
 * PURPOSE: Launch browser in headed mode, intercept ALL network traffic,
 * discover API endpoints that power the Angular UI.
 *
 * USAGE:
 *   npx ts-node scrapers/mgo/mgo-api-discovery.ts
 *
 * The script will:
 * 1. Launch visible browser
 * 2. Navigate to login page (you login manually)
 * 3. Capture ALL XHR/Fetch requests and responses
 * 4. Save discovered endpoints to JSON
 *
 * NOTE: Known bug exists that bypasses 35-day search limit - watch for it!
 */

import { chromium, Browser, Page, BrowserContext, Request, Response } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { MGO_CREDENTIALS, BROWSER_CONFIG, OUTPUT_DIR } from './mgo-config';
import { MGOApiEndpoint, MGODiscoveryResult } from './mgo-types';

const DISCOVERY_OUTPUT = path.join(OUTPUT_DIR, 'api_discovery');

// Ensure output directory exists
if (!fs.existsSync(DISCOVERY_OUTPUT)) {
  fs.mkdirSync(DISCOVERY_OUTPUT, { recursive: true });
}

// Store all captured API calls
const capturedEndpoints: MGOApiEndpoint[] = [];

// Keywords that indicate interesting API calls
const API_KEYWORDS = [
  'api', 'graphql', 'json', 'search', 'permit', 'jurisdiction',
  'county', 'state', 'project', 'ossf', 'septic', 'type', 'list',
  'data', 'result', 'query', 'fetch', 'get', 'post'
];

function isInterestingRequest(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  // Skip static assets
  if (lowerUrl.match(/\.(png|jpg|jpeg|gif|svg|ico|css|woff|woff2|ttf|eot|js)(\?|$)/)) {
    return false;
  }
  // Skip analytics/tracking
  if (lowerUrl.includes('google') || lowerUrl.includes('analytics') || lowerUrl.includes('tracking')) {
    return false;
  }
  // Include anything from mgoconnect.org
  if (lowerUrl.includes('mgoconnect.org') || lowerUrl.includes('mygovernmentonline')) {
    return true;
  }
  // Include anything with API keywords
  return API_KEYWORDS.some(kw => lowerUrl.includes(kw));
}

async function captureResponse(response: Response): Promise<void> {
  const request = response.request();
  const url = request.url();

  if (!isInterestingRequest(url)) return;

  const endpoint: MGOApiEndpoint = {
    url: url,
    method: request.method(),
    responseStatus: response.status(),
    timestamp: new Date().toISOString()
  };

  // Try to capture request headers and body
  try {
    endpoint.requestHeaders = request.headers();
  } catch {}

  try {
    const postData = request.postData();
    if (postData) {
      try {
        endpoint.requestBody = JSON.parse(postData);
      } catch {
        endpoint.requestBody = postData;
      }
    }
  } catch {}

  // Try to capture response body (JSON only)
  const contentType = response.headers()['content-type'] || '';
  if (contentType.includes('json') || contentType.includes('text')) {
    try {
      const body = await response.text();
      if (body.length < 500000) { // Skip very large responses
        try {
          endpoint.responseBody = JSON.parse(body);
        } catch {
          // Store first 1000 chars of non-JSON
          endpoint.responseBody = body.substring(0, 1000);
        }
      } else {
        endpoint.responseBody = `[Large response: ${body.length} bytes]`;
      }
    } catch {}
  }

  capturedEndpoints.push(endpoint);

  // Log interesting calls
  const statusColor = response.status() < 400 ? '\x1b[32m' : '\x1b[31m';
  console.log(`${statusColor}[${response.status()}]\x1b[0m ${request.method()} ${url.substring(0, 100)}`);

  // Special logging for potential API discoveries
  if (url.includes('jurisdiction') || url.includes('state') || url.includes('county') ||
      url.includes('search') || url.includes('project') || url.includes('permit')) {
    console.log('\x1b[33m  ^^^ INTERESTING ENDPOINT ^^^\x1b[0m');
    if (endpoint.responseBody && typeof endpoint.responseBody === 'object') {
      const preview = JSON.stringify(endpoint.responseBody).substring(0, 200);
      console.log(`  Response preview: ${preview}...`);
    }
  }
}

async function saveDiscoveryResults(cookies: Array<{ name: string; value: string; domain: string }>) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(DISCOVERY_OUTPUT, `discovery_${timestamp}.json`);

  // Categorize discovered endpoints
  const result: MGODiscoveryResult = {
    session_start: capturedEndpoints[0]?.timestamp || new Date().toISOString(),
    session_end: new Date().toISOString(),
    login_successful: capturedEndpoints.some(e => e.url.includes('dashboard') || e.url.includes('search')),
    discovered_endpoints: {},
    all_api_calls: capturedEndpoints,
    cookies: cookies
  };

  // Try to identify key endpoints
  for (const endpoint of capturedEndpoints) {
    const url = endpoint.url.toLowerCase();
    if (url.includes('state') && !result.discovered_endpoints.states) {
      result.discovered_endpoints.states = endpoint;
    }
    if (url.includes('jurisdiction') && !result.discovered_endpoints.jurisdictions) {
      result.discovered_endpoints.jurisdictions = endpoint;
    }
    if (url.includes('type') && url.includes('project') && !result.discovered_endpoints.project_types) {
      result.discovered_endpoints.project_types = endpoint;
    }
    if (url.includes('search') && !result.discovered_endpoints.search) {
      result.discovered_endpoints.search = endpoint;
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(`\n\x1b[32mDiscovery results saved to: ${outputFile}\x1b[0m`);

  // Also save just the endpoints summary
  const summaryFile = path.join(DISCOVERY_OUTPUT, `endpoints_summary_${timestamp}.json`);
  const summary = capturedEndpoints.map(e => ({
    method: e.method,
    url: e.url,
    status: e.responseStatus,
    hasBody: !!e.responseBody
  }));
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`Endpoint summary saved to: ${summaryFile}`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('MGO CONNECT API DISCOVERY');
  console.log('='.repeat(60));
  console.log('\nThis script will:');
  console.log('1. Launch a visible browser');
  console.log('2. Navigate to MGO Connect login page');
  console.log('3. WAIT FOR YOU TO LOGIN MANUALLY');
  console.log('4. Capture ALL network traffic as you navigate');
  console.log('5. Save discovered API endpoints');
  console.log('\n\x1b[33mIMPORTANT: Look for the 35-day limit bypass bug!\x1b[0m\n');
  console.log('='.repeat(60));

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    // Launch browser
    browser = await chromium.launch({
      headless: BROWSER_CONFIG.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    context = await browser.newContext({
      viewport: BROWSER_CONFIG.viewport,
      userAgent: BROWSER_CONFIG.userAgent
    });

    const page: Page = await context.newPage();

    // Set up network interception
    page.on('response', captureResponse);

    // Navigate to login page
    console.log(`\nNavigating to: ${MGO_CREDENTIALS.loginUrl}`);
    await page.goto(MGO_CREDENTIALS.loginUrl, { waitUntil: 'networkidle', timeout: BROWSER_CONFIG.timeout });

    // Take screenshot of login page
    await page.screenshot({ path: path.join(DISCOVERY_OUTPUT, '01_login_page.png') });
    console.log('\n\x1b[36m>>> LOGIN PAGE LOADED <<<\x1b[0m');
    console.log('>>> Please login manually in the browser window <<<');
    console.log('>>> Script will continue monitoring network traffic <<<\n');

    // Auto-fill credentials (user still needs to click login)
    try {
      await page.fill('input[type="email"]', MGO_CREDENTIALS.email);
      await page.fill('input[type="password"]', MGO_CREDENTIALS.password);
      console.log('Credentials auto-filled. Click the Login button.');
    } catch (e) {
      console.log('Could not auto-fill credentials. Please enter them manually.');
    }

    // Wait for navigation away from login page (indicates successful login)
    console.log('\nWaiting for login completion...');

    // Keep monitoring for 10 minutes
    const MONITORING_DURATION = 10 * 60 * 1000; // 10 minutes
    const startTime = Date.now();

    // Periodically save results
    const saveInterval = setInterval(async () => {
      if (capturedEndpoints.length > 0) {
        const cookies = await context!.cookies();
        const simpleCookies = cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain }));
        await saveDiscoveryResults(simpleCookies);
      }
    }, 30000); // Save every 30 seconds

    // Wait until timeout or user closes browser
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= MONITORING_DURATION) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);

      // Also resolve if browser is closed
      browser!.on('disconnected', () => {
        clearInterval(checkInterval);
        resolve();
      });
    });

    clearInterval(saveInterval);

    // Final save
    console.log('\n\x1b[33mMonitoring complete. Saving final results...\x1b[0m');
    const cookies = await context.cookies();
    const simpleCookies = cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain }));
    await saveDiscoveryResults(simpleCookies);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('DISCOVERY SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total API calls captured: ${capturedEndpoints.length}`);

    const uniqueEndpoints = [...new Set(capturedEndpoints.map(e => `${e.method} ${new URL(e.url).pathname}`))];
    console.log(`Unique endpoint paths: ${uniqueEndpoints.length}`);
    console.log('\nEndpoint paths:');
    uniqueEndpoints.forEach(ep => console.log(`  ${ep}`));

  } catch (error) {
    console.error('Error during discovery:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Discovery complete. Check the output files for API details.');
  console.log('='.repeat(60));
}

// Run
main().catch(console.error);
