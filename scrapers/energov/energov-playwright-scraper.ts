/**
 * EnerGov Playwright-Based Scraper
 *
 * Uses Playwright to navigate EnerGov portals and intercept API responses.
 * The EnerGov API requires session cookies established by the Angular app,
 * so we use browser automation to perform searches and capture results.
 *
 * USAGE:
 *   npx tsx scrapers/energov/energov-playwright-scraper.ts
 *   npx tsx scrapers/energov/energov-playwright-scraper.ts --portal=doral_fl
 *
 * SERVER USAGE (with proxy):
 *   npx tsx scrapers/energov/energov-playwright-scraper.ts --proxy
 */

import { chromium, Browser, Page, BrowserContext, Response } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { ENERGOV_PORTALS, PROXY_CONFIG, EXTRACTION_CONFIG, EnerGovPortalConfig, getEnabledPortals } from './energov-config';

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
  valuation?: number;
  source: string;
  portal: string;
  portalUrl: string;
  scrapedAt: string;
  rawData: Record<string, unknown>;
}

interface Checkpoint {
  lastPortalId: string;
  lastSearchIndex: number;
  completedPortals: string[];
  totalRecordsExtracted: number;
  timestamp: string;
}

// ============================================
// GLOBALS
// ============================================

let totalRecordsExtracted = 0;
let currentProxyIndex = 0;

// ============================================
// PROXY SETUP
// ============================================

function getProxyConfig() {
  if (!PROXY_CONFIG.enabled) return undefined;

  const port = PROXY_CONFIG.ports[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % PROXY_CONFIG.ports.length;

  return {
    server: `http://${PROXY_CONFIG.host}:${port}`,
    username: PROXY_CONFIG.username,
    password: PROXY_CONFIG.password
  };
}

// ============================================
// HELPERS
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadCheckpoint(): Checkpoint | null {
  try {
    if (fs.existsSync(EXTRACTION_CONFIG.checkpointFile)) {
      return JSON.parse(fs.readFileSync(EXTRACTION_CONFIG.checkpointFile, 'utf-8'));
    }
  } catch {}
  return null;
}

function saveCheckpoint(checkpoint: Checkpoint): void {
  fs.writeFileSync(EXTRACTION_CONFIG.checkpointFile, JSON.stringify(checkpoint, null, 2));
}

function transformRecord(raw: Record<string, unknown>, portal: EnerGovPortalConfig): PermitRecord {
  // Handle various EnerGov field naming conventions
  // Use any available ID field for the permit number
  const permitNumber = String(
    raw.PermitNumber || raw.permitNumber || raw.CaseNumber || raw.caseNumber ||
    raw.Number || raw.RecordNumber || raw.RecordId || raw.Id || raw.id ||
    raw.CAPId || raw.ApplicationNumber || raw.ProjectNumber || ''
  );

  // Extract address from nested object or string
  let address = '';
  let city = '';
  let zipCode = '';
  const addressObj = raw.Address as Record<string, unknown> | undefined;
  if (addressObj && typeof addressObj === 'object') {
    // Prefer AddressLine1 for clean address, fall back to FullAddress
    address = String(addressObj.AddressLine1 || addressObj.FullAddress || '');
    city = String(addressObj.City || '');
    zipCode = String(addressObj.PostalCode || addressObj.Zip || '');
  } else if (raw.AddressDisplay && typeof raw.AddressDisplay === 'string') {
    // AddressDisplay often has format: "123 MAIN ST  123 MAIN ST  CITY ZIP"
    // Extract just the first part before city/state
    const addrParts = (raw.AddressDisplay as string).split(/\s{2,}/);
    address = addrParts[0] || String(raw.AddressDisplay);
    city = String(raw.City || raw.city || '');
    zipCode = String(raw.Zip || raw.ZipCode || raw.zip || '');
  } else {
    address = String(raw.MainAddress || raw.Address || raw.SiteAddress || raw.address || raw.Location || '');
    city = String(raw.City || raw.city || '');
    zipCode = String(raw.Zip || raw.ZipCode || raw.zip || '');
  }

  // Extract parcel from MainParcel string (e.g., "3530220320040 8401 NW 53 TER")
  let parcelNumber = '';
  if (raw.MainParcel && typeof raw.MainParcel === 'string') {
    const parcelMatch = (raw.MainParcel as string).match(/^(\d+)/);
    parcelNumber = parcelMatch ? parcelMatch[1] : String(raw.MainParcel);
  } else {
    parcelNumber = String(raw.ParcelNumber || raw.parcelNumber || raw.Parcel || raw.APN || '');
  }

  return {
    permitNumber,
    address,
    city,
    state: portal.state,
    zipCode,
    parcelNumber,
    ownerName: String(raw.OwnerName || raw.ApplicantName || raw.Applicant || raw.Owner || raw.CompanyName || raw.DBA || ''),
    permitType: String(raw.CaseType || raw.PermitType || raw.Type || raw.TypeName || raw.PermitTypeName || raw.Module || raw.Category || ''),
    permitTypeId: String(raw.CaseTypeId || raw.PermitTypeId || raw.TypeId || ''),
    workClass: String(raw.CaseWorkclass || raw.WorkClass || raw.WorkClassName || ''),
    status: String(raw.CaseStatus || raw.Status || raw.StatusName || raw.PermitStatus || ''),
    appliedDate: String(raw.ApplyDate || raw.ApplicationDate || raw.DateApplied || raw.SubmittedDate || ''),
    issuedDate: String(raw.IssueDate || raw.IssuedDate || raw.DateIssued || ''),
    expirationDate: String(raw.ExpireDate || raw.ExpirationDate || ''),
    finalDate: String(raw.FinalDate || raw.CompletionDate || ''),
    description: String(raw.Description || raw.WorkDescription || raw.ProjectName || ''),
    contractor: String(raw.Contractor || raw.ContractorName || ''),
    valuation: Number(raw.Valuation || raw.JobValue || raw.ProjectValue || 0) || undefined,
    source: 'EnerGov',
    portal: portal.id,
    portalUrl: portal.baseUrl,
    scrapedAt: new Date().toISOString(),
    rawData: raw
  };
}

// ============================================
// BROWSER EXTRACTION
// ============================================

async function extractPortal(
  portal: EnerGovPortalConfig,
  completedPortals: Set<string>,
  useProxy: boolean
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

  // Browser setup
  const launchOptions: any = {
    headless: true
  };

  if (useProxy) {
    const proxy = getProxyConfig();
    if (proxy) {
      launchOptions.proxy = proxy;
      console.log(`  Using proxy port: ${proxy.server.split(':').pop()}`);
    }
  }

  const browser = await chromium.launch(launchOptions);

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    // Capture API responses
    const capturedRecords: Record<string, unknown>[] = [];
    let lastTotalPages = 0;
    let lastTotalPermits = 0;

    // Monitor POST requests for search
    page.on('request', async (request) => {
      const url = request.url().toLowerCase();
      const method = request.method();
      if (method === 'POST' && (url.includes('/search') || url.includes('/query'))) {
        console.log(`    [POST] ${method} ${request.url()}`);
        const postData = request.postData();
        if (postData) {
          console.log(`    [POST DATA] ${postData.substring(0, 200)}`);
        }
      }
    });

    page.on('response', async (response: Response) => {
      const url = response.url();
      const urlLower = url.toLowerCase();

      // Log search-related API calls
      if (urlLower.includes('/api/') && urlLower.includes('search')) {
        console.log(`    [API] ${response.status()} ${response.request().method()} ${url.substring(0, 100)}`);
      }

      // Capture search results from EnerGov search endpoints
      // Only capture POST search results, not metadata endpoints
      const isSearchEndpoint = urlLower.includes('/search') ||
        urlLower.includes('/query') ||
        urlLower.includes('/results');
      const isMetadataEndpoint = urlLower.includes('/status') ||
        urlLower.includes('/types') ||
        urlLower.includes('/setting') ||
        urlLower.includes('/criteria') ||
        urlLower.includes('/menu');

      if (urlLower.includes('/api/') && isSearchEndpoint && !isMetadataEndpoint && response.status() === 200) {
        console.log(`    [SEARCH API] ${response.request().method()} ${url}`);
      }

      if ((urlLower.includes('/api/') || urlLower.includes('selfservice')) &&
          isSearchEndpoint && !isMetadataEndpoint &&
          response.status() === 200) {
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            console.log(`    [SEARCH RESPONSE] Keys: ${JSON.stringify(Object.keys(data)).substring(0, 200)}`);
            if (data.ErrorMessages) {
              console.log(`    [SEARCH ERROR] ${JSON.stringify(data.ErrorMessages)}`);
            }
            // Debug: show Result field structure
            if (data.Result !== undefined) {
              const resultType = Array.isArray(data.Result) ? `array[${data.Result.length}]` : typeof data.Result;
              console.log(`    [RESULT TYPE] ${resultType}`);
              if (typeof data.Result === 'object' && data.Result !== null && !Array.isArray(data.Result)) {
                console.log(`    [RESULT KEYS] ${JSON.stringify(Object.keys(data.Result)).substring(0, 200)}`);
              }
            }

            // Extract records from various response formats
            let records: unknown[] = [];

            // EnerGov search response: Result is an object containing EntityResults array
            if (data.Result && typeof data.Result === 'object' && !Array.isArray(data.Result)) {
              // Capture pagination info
              if (data.Result.TotalPages !== undefined) {
                lastTotalPages = data.Result.TotalPages;
                lastTotalPermits = data.Result.PermitsFound || 0;
                console.log(`    [PAGINATION] TotalPages: ${lastTotalPages}, PermitsFound: ${lastTotalPermits}`);
              }
              if (data.Result.EntityResults && Array.isArray(data.Result.EntityResults)) {
                records = data.Result.EntityResults;
                console.log(`    [EXTRACTED] ${records.length} records from Result.EntityResults`);
              }
            } else if (data.Result && Array.isArray(data.Result)) {
              records = data.Result;
            } else if (data.Records && Array.isArray(data.Records)) {
              records = data.Records;
            } else if (data.Permits && Array.isArray(data.Permits)) {
              records = data.Permits;
            } else if (data.Items && Array.isArray(data.Items)) {
              records = data.Items;
            } else if (data.Data && Array.isArray(data.Data)) {
              records = data.Data;
            } else if (Array.isArray(data)) {
              records = data;
            } else if (data.results) {
              records = data.results;
            }
            console.log(`    [SEARCH RECORDS] Found ${records.length} records`);

            if (records.length > 0) {
              console.log(`    Captured ${records.length} records from API`);
              // Log first record structure for debugging
              if (records.length > 0 && Object.keys(records[0] as object).length > 0) {
                const sample = records[0] as Record<string, unknown>;
                console.log(`    Sample keys: ${Object.keys(sample).slice(0, 10).join(', ')}`);
              }
              capturedRecords.push(...(records as Record<string, unknown>[]));
            }
          }
        } catch {}
      }
    });

    // Navigate to portal
    console.log('\n  Loading portal...');
    await page.goto(`${portal.baseUrl}/apps/SelfService`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(5000); // Give Angular app time to bootstrap

    // Wait for menu to load
    await page.waitForSelector('.menu, nav, .main-menu, [role="navigation"]', { timeout: 15000 }).catch(() => {});
    await sleep(2000);

    // Take screenshot for debugging
    const screenshotDir = path.join(EXTRACTION_CONFIG.outputDir, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    await page.screenshot({ path: path.join(screenshotDir, `${portal.id}_01_landing.png`), fullPage: true });

    // EnerGov Angular apps typically have a menu with modules like Permits, Plans, etc.
    // First try to navigate to the Permits module
    console.log('  Looking for Permits module...');

    const moduleSelectors = [
      'a:has-text("Permits")',
      'span:has-text("Permits")',
      'li:has-text("Permits")',
      '[href*="permit"]',
      'a:has-text("Building")',
      'a:has-text("Search Permits")'
    ];

    let foundModule = false;
    for (const selector of moduleSelectors) {
      try {
        const link = await page.$(selector);
        if (link) {
          const isVisible = await link.isVisible();
          if (isVisible) {
            console.log(`  Found module link: ${selector}`);
            await link.click({ timeout: 10000 });
            await sleep(4000);
            foundModule = true;
            break;
          }
        }
      } catch {}
    }

    await page.screenshot({ path: path.join(screenshotDir, `${portal.id}_02_after_module.png`), fullPage: true });

    // Now look for search functionality within the module
    console.log('  Looking for Search functionality...');

    const searchSelectors = [
      'a:has-text("Search")',
      'span:has-text("Search")',
      'button:has-text("Search")',
      'li:has-text("Search")',
      '.search-link',
      '#searchLink',
      '[href*="search"]',
      '[ng-click*="search"]',
      'text=Search',
      // EnerGov specific patterns
      'a:has-text("Search Records")',
      'a:has-text("Find Permits")',
      'button:has-text("Find")'
    ];

    let foundSearch = false;
    for (const selector of searchSelectors) {
      try {
        const link = await page.$(selector);
        if (link) {
          const isVisible = await link.isVisible();
          if (isVisible) {
            console.log(`  Found search element: ${selector}`);
            await link.click({ timeout: 10000 });
            await sleep(4000);
            foundSearch = true;
            break;
          }
        }
      } catch {}
    }

    if (!foundSearch) {
      console.log('  Search link not found, trying direct URLs...');
      // Try various EnerGov URL patterns
      const searchUrls = [
        `${portal.baseUrl}${portal.apiBase?.replace('/api', '') || '/apps/SelfService'}/#/search`,
        `${portal.baseUrl}/apps/SelfService/#/search`,
        `${portal.baseUrl}/Apps/SelfService/#/search`,
        `${portal.baseUrl}/apps/SelfService/#/permitsearch`,
        `${portal.baseUrl}/apps/SelfService/#/permits/search`
      ];

      for (const url of searchUrls) {
        try {
          console.log(`  Trying: ${url}`);
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await sleep(3000);
          // Check if we have search elements now
          const hasSearchInput = await page.$('input[type="text"]');
          if (hasSearchInput) {
            foundSearch = true;
            break;
          }
        } catch {}
      }
    }

    await page.screenshot({ path: path.join(screenshotDir, `${portal.id}_03_search_page.png`), fullPage: true });

    // Try different search approaches - use addresses and common terms
    // Empty string search returns ALL records in EnerGov portals
    // Start with empty for broad capture, then use common terms
    const searchTerms = ['', '2024', '2023', '2022', 'permit', 'septic'];

    for (const term of searchTerms) {
      console.log(`\n  Searching with term: "${term}"`);

      try {
        // Look for search input - try multiple selectors
        const inputSelectors = [
          'input[placeholder*="earch"]',
          'input[placeholder*="eyword"]',
          'input[ng-model*="Keyword"]',
          'input[ng-model*="earch"]',
          '#txtKeyword',
          '#searchKeyword',
          'input.search-input',
          'input[type="text"]'
        ];

        let foundInput = false;
        for (const selector of inputSelectors) {
          const searchInput = await page.$(selector);
          if (searchInput) {
            const isVisible = await searchInput.isVisible();
            if (isVisible) {
              console.log(`    Found input: ${selector}`);
              await searchInput.fill('');  // Clear existing text
              await searchInput.fill(term);
              await sleep(500);

              // Uncheck "Exact Phrase" checkbox if it exists
              try {
                const exactPhraseCheckbox = await page.$('input[type="checkbox"]');
                if (exactPhraseCheckbox) {
                  const isChecked = await exactPhraseCheckbox.isChecked();
                  if (isChecked) {
                    console.log('    Unchecking Exact Phrase...');
                    await exactPhraseCheckbox.uncheck();
                    await sleep(500);
                  }
                }
              } catch {}

              await sleep(500);
              foundInput = true;

              // Click search button
              const btnSelectors = [
                'button.btn-primary:has-text("Search")',
                'button.btn-info:has-text("Search")',
                'button.search-btn',
                'button[type="submit"]:has-text("Search")',
                '.btn-search',
                '#btnSearch',
                'button.search-button',
                'button:has-text("Search"):visible',
                'button[type="submit"]',
                'i.fa-search'
              ];

              let clickedButton = false;

              // Use Playwright locator to click the search button
              // The button is blue (btn-info) with text "Search" and magnifying glass icon
              try {
                // Try to find and click using locator
                const searchBtn = page.locator('button.btn-info:has-text("Search"), button:has-text("Search"):not(:has-text("Reset"))').first();
                if (await searchBtn.count() > 0) {
                  console.log('    Found search button via locator');
                  await searchBtn.scrollIntoViewIfNeeded();
                  await searchBtn.click({ force: true, timeout: 5000 });
                  clickedButton = true;
                }
              } catch (e) {
                console.log(`    Locator click failed: ${e}`);
              }

              // Fallback: use JavaScript to click button in the same row
              if (!clickedButton) {
                try {
                  const clicked = await page.evaluate(() => {
                    const searchInput = document.querySelector('input[placeholder*="earch"]') as HTMLInputElement;
                    if (!searchInput) return null;

                    // Walk up to find the container with buttons
                    let el = searchInput.parentElement;
                    for (let i = 0; i < 5 && el; i++) {
                      const btn = el.querySelector('button.btn-info, button:not(.btn-danger):not([class*="reset"])') as HTMLElement;
                      if (btn && btn.textContent?.toLowerCase().includes('search')) {
                        btn.click();
                        return 'parent-button';
                      }
                      el = el.parentElement;
                    }
                    return null;
                  });
                  if (clicked) {
                    console.log(`    Search submitted via JS (${clicked})`);
                    clickedButton = true;
                  }
                } catch (e) {
                  console.log(`    JS click failed: ${e}`);
                }
              }

              // If no button clicked, try pressing Enter
              if (!clickedButton) {
                console.log('    No button found, pressing Enter...');
                await searchInput.press('Enter');
              }

              // Wait longer for Angular to process and API to respond
              await sleep(2000);
              await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
              await sleep(5000);

              // Take screenshot after search
              await page.screenshot({ path: path.join(screenshotDir, `${portal.id}_search_${term.replace(/[^a-zA-Z0-9]/g, '')}.png`), fullPage: true });
              break;
            }
          }
        }

        if (!foundInput) {
          console.log('    No search input found');
        }

        // Process any captured records
        if (capturedRecords.length > 0) {
          console.log(`    Processing ${capturedRecords.length} captured records...`);
        }
        while (capturedRecords.length > 0) {
          const raw = capturedRecords.shift()!;
          const record = transformRecord(raw, portal);

          // Generate a unique ID if no permit number
          const recordId = record.permitNumber || `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          if (!seenPermits.has(recordId)) {
            seenPermits.add(recordId);
            // Only skip if completely empty (no address and no permitNumber)
            if (record.permitNumber || record.address) {
              writeStream.write(JSON.stringify(record) + '\n');
              portalRecords++;
              totalRecordsExtracted++;
            } else {
              console.log(`    Skipping empty record: ${JSON.stringify(Object.keys(raw))}`);
            }
          }
        }

        // Try pagination using EnerGov Angular pagination
        let pageNum = 1;
        const maxPagesToNavigate = Math.min(lastTotalPages, 500); // Cap at 500 pages per search term

        console.log(`    Attempting pagination (${maxPagesToNavigate} pages available)...`);

        while (pageNum < maxPagesToNavigate) {
          // EnerGov uses various pagination styles - try all selectors
          const paginationSelectors = [
            'a.pagination-next',
            'a[aria-label="Next"]',
            'button[aria-label="Next"]',
            'a:has-text("»")',
            'button:has-text("»")',
            'a.page-link:has-text("›")',
            'li.pagination-next a',
            '.pager-next a',
            'a[ng-click*="next"]',
            'a[ng-click*="Page"]',
            // Page number buttons (try clicking next number)
            `a.page-link:has-text("${pageNum + 1}")`,
            `li:has-text("${pageNum + 1}") a`
          ];

          let clickedNext = false;

          // Try each selector
          for (const selector of paginationSelectors) {
            try {
              const nextBtn = await page.$(selector);
              if (nextBtn) {
                const isVisible = await nextBtn.isVisible();
                const isDisabled = await nextBtn.getAttribute('disabled');
                const ariaDisabled = await nextBtn.getAttribute('aria-disabled');

                if (isVisible && !isDisabled && ariaDisabled !== 'true') {
                  await nextBtn.click({ timeout: 5000 });
                  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
                  await sleep(2000);
                  pageNum++;
                  clickedNext = true;
                  break;
                }
              }
            } catch {}
          }

          // If no button found, try JavaScript evaluation
          if (!clickedNext) {
            try {
              const clicked = await page.evaluate((targetPage) => {
                // Try to find Angular pagination controls
                const pageLinks = document.querySelectorAll('a.page-link, li.page-item a, .pagination a');
                for (const link of pageLinks) {
                  if (link.textContent?.trim() === String(targetPage) ||
                      link.textContent?.trim() === '›' ||
                      link.textContent?.trim() === '»') {
                    (link as HTMLElement).click();
                    return true;
                  }
                }
                return false;
              }, pageNum + 1);

              if (clicked) {
                await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
                await sleep(2000);
                pageNum++;
                clickedNext = true;
              }
            } catch {}
          }

          if (!clickedNext) {
            console.log(`    No more pagination at page ${pageNum}`);
            break;
          }

          // Process captured records from this page
          while (capturedRecords.length > 0) {
            const raw = capturedRecords.shift()!;
            const record = transformRecord(raw, portal);

            if (record.permitNumber && !seenPermits.has(record.permitNumber)) {
              seenPermits.add(record.permitNumber);
              writeStream.write(JSON.stringify(record) + '\n');
              portalRecords++;
              totalRecordsExtracted++;
            }
          }

          if (pageNum % 10 === 0) {
            console.log(`    Processed page ${pageNum}, total records: ${portalRecords}`);
          }
        }

        console.log(`    Records so far: ${portalRecords}`);

        // Save checkpoint
        if (portalRecords > 0 && portalRecords % EXTRACTION_CONFIG.checkpointInterval === 0) {
          saveCheckpoint({
            lastPortalId: portal.id,
            lastSearchIndex: searchTerms.indexOf(term),
            completedPortals: Array.from(completedPortals),
            totalRecordsExtracted,
            timestamp: new Date().toISOString()
          });
        }

        await sleep(EXTRACTION_CONFIG.delayBetweenRequests);

      } catch (error) {
        console.log(`    Error with search term "${term}": ${error}`);
      }
    }

    // Try module-specific searches (Permits, Plans, Inspections)
    const modules = ['Permits', 'Plans', 'Building', 'Inspections'];
    for (const module of modules) {
      const moduleLink = await page.$(`a:has-text("${module}"), li:has-text("${module}")`);
      if (moduleLink) {
        const isVisible = await moduleLink.isVisible();
        if (!isVisible) continue;

        console.log(`\n  Exploring ${module} module...`);
        try {
          await moduleLink.click({ timeout: 5000 });
          await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
          await sleep(3000);

          // Process any records captured from navigation
          while (capturedRecords.length > 0) {
            const raw = capturedRecords.shift()!;
            const record = transformRecord(raw, portal);

            if (record.permitNumber && !seenPermits.has(record.permitNumber)) {
              seenPermits.add(record.permitNumber);
              writeStream.write(JSON.stringify(record) + '\n');
              portalRecords++;
              totalRecordsExtracted++;
            }
          }
        } catch {}
      }
    }

    await context.close();

  } catch (error) {
    console.log(`  Portal error: ${error}`);
  } finally {
    await browser.close();
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
  console.log('ENERGOV PLAYWRIGHT EXTRACTION');
  console.log('='.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);

  // Parse arguments
  const useProxy = process.argv.includes('--proxy');
  const portalArg = process.argv.find(arg => arg.startsWith('--portal='));

  console.log(`Proxy enabled: ${useProxy}`);
  console.log(`Output directory: ${EXTRACTION_CONFIG.outputDir}`);

  // Ensure output directory
  if (!fs.existsSync(EXTRACTION_CONFIG.outputDir)) {
    fs.mkdirSync(EXTRACTION_CONFIG.outputDir, { recursive: true });
  }

  // Get portals to process
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

  // Process portals
  for (let i = 0; i < portals.length; i++) {
    const portal = portals[i];
    console.log(`\n[${i + 1}/${portals.length}] Processing...`);

    try {
      const records = await extractPortal(portal, completedPortals, useProxy);

      if (records > 0) {
        completedPortals.add(portal.id);
        saveCheckpoint({
          lastPortalId: portal.id,
          lastSearchIndex: 0,
          completedPortals: Array.from(completedPortals),
          totalRecordsExtracted,
          timestamp: new Date().toISOString()
        });
      }

      await sleep(EXTRACTION_CONFIG.delayBetweenPortals);

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
