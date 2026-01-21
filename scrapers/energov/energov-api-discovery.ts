/**
 * EnerGov API Discovery Tool
 *
 * Uses Playwright to intercept network requests and discover API endpoints
 * for Tyler EnerGov Citizen Self Service portals.
 *
 * USAGE:
 *   npx tsx scrapers/energov/energov-api-discovery.ts [portal_url]
 *
 * Example:
 *   npx tsx scrapers/energov/energov-api-discovery.ts https://wakecountync-energovpub.tylerhost.net/apps/SelfService
 */

import { chromium, Browser, Page, Request, Response } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// CONFIGURATION
// ============================================

const PORTALS_TO_DISCOVER = [
  {
    name: 'Wake County NC',
    url: 'https://wakecountync-energovpub.tylerhost.net/apps/SelfService',
    state: 'NC'
  },
  {
    name: 'Atlanta GA',
    url: 'https://atlantaga-energov.tylerhost.net/Apps/SelfService',
    state: 'GA'
  },
  {
    name: 'Albuquerque NM',
    url: 'https://cityofalbuquerquenm-energovweb.tylerhost.net/apps/selfservice',
    state: 'NM'
  },
  {
    name: 'Doral FL',
    url: 'https://doralfl-energovweb.tylerhost.net/apps/SelfService',
    state: 'FL'
  },
  {
    name: 'Hartford CT',
    url: 'https://hartfordct-energov.tylerhost.net/Apps/SelfService',
    state: 'CT'
  },
  {
    name: 'Pickens County SC',
    url: 'https://energovweb.pickenscountysc.us/EnerGovProd/SelfService',
    state: 'SC'
  },
  {
    name: 'Fort Myers FL',
    url: 'https://cdservices.cityftmyers.com/energovprod/selfservice',
    state: 'FL'
  },
  {
    name: 'Hayward CA',
    url: 'https://haywardca-energovpub.tylerhost.net/Apps/SelfService',
    state: 'CA'
  },
  {
    name: 'Yuba County CA',
    url: 'https://yubacountyca-energovweb.tylerhost.net/apps/SelfService',
    state: 'CA'
  },
  {
    name: 'Carson CA',
    url: 'https://cityofcarsonca-energovweb.tylerhost.net/apps/selfservice',
    state: 'CA'
  }
];

interface ApiEndpoint {
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody?: unknown;
  responseStatus: number;
  responseHeaders: Record<string, string>;
  responseBody?: unknown;
  timestamp: string;
}

interface DiscoveryResult {
  portal: string;
  portalUrl: string;
  state: string;
  discoveredAt: string;
  endpoints: ApiEndpoint[];
  searchEndpoints: ApiEndpoint[];
  authEndpoints: ApiEndpoint[];
  permitEndpoints: ApiEndpoint[];
}

const OUTPUT_DIR = './scrapers/output/energov/api_discovery';

// ============================================
// DISCOVERY FUNCTIONS
// ============================================

async function discoverPortalApi(
  browser: Browser,
  portalName: string,
  portalUrl: string,
  state: string
): Promise<DiscoveryResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Discovering API for: ${portalName}`);
  console.log(`URL: ${portalUrl}`);
  console.log('='.repeat(60));

  const result: DiscoveryResult = {
    portal: portalName,
    portalUrl: portalUrl,
    state: state,
    discoveredAt: new Date().toISOString(),
    endpoints: [],
    searchEndpoints: [],
    authEndpoints: [],
    permitEndpoints: []
  };

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  // Intercept all requests
  page.on('request', (request: Request) => {
    const url = request.url();
    const method = request.method();

    // Filter for API calls (skip static resources)
    if (isApiCall(url)) {
      console.log(`  [REQ] ${method} ${url}`);
    }
  });

  // Intercept all responses
  page.on('response', async (response: Response) => {
    const url = response.url();
    const status = response.status();
    const method = response.request().method();

    // Filter for API calls
    if (isApiCall(url)) {
      console.log(`  [RES] ${status} ${method} ${url}`);

      try {
        const endpoint: ApiEndpoint = {
          url: url,
          method: method,
          requestHeaders: response.request().headers(),
          responseStatus: status,
          responseHeaders: response.headers(),
          timestamp: new Date().toISOString()
        };

        // Try to get request body
        try {
          const postData = response.request().postData();
          if (postData) {
            try {
              endpoint.requestBody = JSON.parse(postData);
            } catch {
              endpoint.requestBody = postData;
            }
          }
        } catch {}

        // Try to get response body
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json') && status === 200) {
            endpoint.responseBody = await response.json();
          }
        } catch {}

        result.endpoints.push(endpoint);

        // Categorize endpoint
        const urlLower = url.toLowerCase();
        if (urlLower.includes('search') || urlLower.includes('query')) {
          result.searchEndpoints.push(endpoint);
        }
        if (urlLower.includes('auth') || urlLower.includes('login') || urlLower.includes('token')) {
          result.authEndpoints.push(endpoint);
        }
        if (urlLower.includes('permit') || urlLower.includes('case') || urlLower.includes('record')) {
          result.permitEndpoints.push(endpoint);
        }
      } catch (error) {
        console.log(`    Error capturing response: ${error}`);
      }
    }
  });

  try {
    // Navigate to portal
    console.log('\n  Loading portal...');
    await page.goto(portalUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Look for search functionality
    console.log('\n  Looking for search elements...');

    // Common EnerGov search selectors
    const searchSelectors = [
      'input[placeholder*="Search"]',
      'input[placeholder*="Address"]',
      'input[name*="search"]',
      'input[id*="search"]',
      '#txtSearchAddress',
      '#SearchAddress',
      '.search-input',
      '[data-testid="search"]'
    ];

    for (const selector of searchSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`    Found search element: ${selector}`);

          // Try typing a search term
          await element.fill('123 Main');
          await page.waitForTimeout(2000);

          // Try pressing Enter or clicking a search button
          const searchButton = await page.$('button[type="submit"], button:has-text("Search"), .btn-search, #btnSearch');
          if (searchButton) {
            await searchButton.click();
            await page.waitForTimeout(5000);
            console.log('    Performed search action');
          } else {
            await element.press('Enter');
            await page.waitForTimeout(5000);
          }
          break;
        }
      } catch {}
    }

    // Try clicking on permit search links
    console.log('\n  Looking for permit search links...');
    const permitLinks = await page.$$('a:has-text("Permit"), a:has-text("Search"), a:has-text("Building"), a:has-text("Planning")');

    for (const link of permitLinks.slice(0, 3)) {
      try {
        const text = await link.textContent();
        console.log(`    Clicking: ${text}`);
        await link.click();
        await page.waitForTimeout(3000);
      } catch {}
    }

    // Take screenshot
    const screenshotPath = path.join(OUTPUT_DIR, `${state.toLowerCase()}_${portalName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n  Screenshot saved: ${screenshotPath}`);

  } catch (error) {
    console.log(`  Error during discovery: ${error}`);
  } finally {
    await context.close();
  }

  // Summary
  console.log(`\n  DISCOVERY SUMMARY:`);
  console.log(`    Total API calls captured: ${result.endpoints.length}`);
  console.log(`    Search endpoints: ${result.searchEndpoints.length}`);
  console.log(`    Auth endpoints: ${result.authEndpoints.length}`);
  console.log(`    Permit endpoints: ${result.permitEndpoints.length}`);

  return result;
}

function isApiCall(url: string): boolean {
  // Filter for likely API calls
  const urlLower = url.toLowerCase();

  // Skip static resources
  if (urlLower.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|ico|map)$/)) {
    return false;
  }

  // Include API patterns
  if (urlLower.includes('/api/') ||
      urlLower.includes('/selfservice/') ||
      urlLower.includes('/energov') ||
      urlLower.includes('/search') ||
      urlLower.includes('/permit') ||
      urlLower.includes('/case') ||
      urlLower.includes('/citizen') ||
      urlLower.includes('/odata') ||
      urlLower.includes('aspx') && urlLower.includes('?')) {
    return true;
  }

  return false;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('='.repeat(60));
  console.log('ENERGOV API DISCOVERY TOOL');
  console.log('='.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Check for command line argument
  const customUrl = process.argv[2];
  let portalsToScan = PORTALS_TO_DISCOVER;

  if (customUrl) {
    portalsToScan = [{
      name: 'Custom Portal',
      url: customUrl,
      state: 'XX'
    }];
  }

  // Launch browser in headless mode for server
  const browser = await chromium.launch({
    headless: true, // Set to false for debugging
    slowMo: 50
  });

  const allResults: DiscoveryResult[] = [];

  try {
    for (const portal of portalsToScan) {
      try {
        const result = await discoverPortalApi(browser, portal.name, portal.url, portal.state);
        allResults.push(result);

        // Save individual result
        const resultFile = path.join(
          OUTPUT_DIR,
          `discovery_${portal.state.toLowerCase()}_${portal.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.json`
        );
        fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
        console.log(`  Results saved to: ${resultFile}`);

      } catch (error) {
        console.log(`  Failed to discover ${portal.name}: ${error}`);
      }

      // Delay between portals
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Save combined results
    const combinedFile = path.join(OUTPUT_DIR, `discovery_combined_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(combinedFile, JSON.stringify(allResults, null, 2));
    console.log(`\nCombined results saved to: ${combinedFile}`);

    // Generate summary
    console.log('\n' + '='.repeat(60));
    console.log('DISCOVERY COMPLETE');
    console.log('='.repeat(60));
    console.log(`Portals analyzed: ${allResults.length}`);
    console.log(`Total endpoints discovered: ${allResults.reduce((sum, r) => sum + r.endpoints.length, 0)}`);

    // List unique API patterns found
    const uniquePatterns = new Set<string>();
    for (const result of allResults) {
      for (const endpoint of result.endpoints) {
        const url = new URL(endpoint.url);
        uniquePatterns.add(`${endpoint.method} ${url.pathname}`);
      }
    }

    console.log('\nUnique API patterns found:');
    for (const pattern of uniquePatterns) {
      console.log(`  ${pattern}`);
    }

  } finally {
    await browser.close();
  }
}

// Run
main().catch(console.error);
