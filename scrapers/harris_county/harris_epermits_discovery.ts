/**
 * Harris County ePermits Discovery Scraper
 *
 * Uses Playwright to navigate the Harris County ePermits portal (epermits.harriscountytx.gov)
 * and discover API endpoints, intercepting all network traffic.
 *
 * The ePermits system is:
 * - Custom ASP.NET with Vue.js frontend (version 7.14.0)
 * - Has public "Project Status" search feature
 * - Uses Azure Application Insights
 * - Has /api/Session and /jsonCallers.aspx endpoints
 *
 * USAGE:
 *   npx tsx scrapers/harris_county/harris_epermits_discovery.ts
 *   npx tsx scrapers/harris_county/harris_epermits_discovery.ts --headless=false
 *
 * OUTPUT:
 *   scrapers/output/harris_county/
 *     - api_discovery.json        (discovered API endpoints)
 *     - ossf_permits.ndjson       (extracted OSSF/septic permits)
 *     - search_metadata.json      (available search options)
 *     - screenshots/              (debugging screenshots)
 */

import { chromium, Browser, Page, BrowserContext, Request, Response } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  baseUrl: 'https://epermits.harriscountytx.gov',
  outputDir: path.join(__dirname, '..', 'output', 'harris_county'),
  screenshotDir: path.join(__dirname, '..', 'output', 'harris_county', 'screenshots'),
  timeout: 60000,
  delayBetweenActions: 2000,
  maxRetries: 3,
  // Search terms for OSSF/septic permits
  searchTerms: [
    'OSSF',
    'septic',
    'wastewater',
    'on-site sewage',
    'sewage facility',
    'aerobic',
    'TCEQ'
  ]
};

// ============================================
// TYPES
// ============================================

interface DiscoveredEndpoint {
  url: string;
  method: string;
  contentType?: string;
  requestPayload?: unknown;
  responseStatus?: number;
  responseSize?: number;
  discoveredAt: string;
  context: string;
}

interface PermitRecord {
  permitNumber: string;
  projectNumber?: string;
  address?: string;
  city?: string;
  state: string;
  county: string;
  zipCode?: string;
  parcelNumber?: string;
  ownerName?: string;
  permitType?: string;
  workType?: string;
  status?: string;
  appliedDate?: string;
  issuedDate?: string;
  expirationDate?: string;
  description?: string;
  contractor?: string;
  source: string;
  portal: string;
  portalUrl: string;
  scrapedAt: string;
  rawData: Record<string, unknown>;
}

interface SearchMetadata {
  permitTypes: Array<{ id: string; name: string; code?: string }>;
  statuses: Array<{ id: string; name: string }>;
  workTypes: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  discoveredAt: string;
}

// ============================================
// GLOBALS
// ============================================

const discoveredEndpoints: DiscoveredEndpoint[] = [];
const extractedPermits: PermitRecord[] = [];
const seenPermitNumbers = new Set<string>();
let searchMetadata: SearchMetadata = {
  permitTypes: [],
  statuses: [],
  workTypes: [],
  departments: [],
  discoveredAt: ''
};

// ============================================
// HELPERS
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function ensureDirectories(): void {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  if (!fs.existsSync(CONFIG.screenshotDir)) {
    fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
  }
}

function saveDiscoveredEndpoints(): void {
  const outputFile = path.join(CONFIG.outputDir, 'api_discovery.json');
  fs.writeFileSync(outputFile, JSON.stringify({
    baseUrl: CONFIG.baseUrl,
    totalEndpoints: discoveredEndpoints.length,
    endpoints: discoveredEndpoints,
    discoveredAt: new Date().toISOString()
  }, null, 2));
  console.log(`  Saved ${discoveredEndpoints.length} endpoints to ${outputFile}`);
}

function savePermits(): void {
  const outputFile = path.join(CONFIG.outputDir, 'ossf_permits.ndjson');
  const writeStream = fs.createWriteStream(outputFile, { flags: 'w' });
  for (const permit of extractedPermits) {
    writeStream.write(JSON.stringify(permit) + '\n');
  }
  writeStream.end();
  console.log(`  Saved ${extractedPermits.length} permits to ${outputFile}`);
}

function saveSearchMetadata(): void {
  searchMetadata.discoveredAt = new Date().toISOString();
  const outputFile = path.join(CONFIG.outputDir, 'search_metadata.json');
  fs.writeFileSync(outputFile, JSON.stringify(searchMetadata, null, 2));
  console.log(`  Saved search metadata to ${outputFile}`);
}

function saveDiscoveryReport(): void {
  const report = {
    portal: {
      name: 'Harris County ePermits',
      url: CONFIG.baseUrl,
      type: 'ASP.NET WebForms with custom frontend',
      version: '7.14.0'
    },
    publicAccess: {
      projectStatusSearch: {
        url: `${CONFIG.baseUrl}/PublicProjectStatus.aspx`,
        description: 'Requires exact 10-digit project number - no general search capability',
        inputFormat: '10-digit project number (format unknown without sample data)',
        limitations: [
          'Must know exact project number beforehand',
          'No wildcard or partial search',
          'No browse/list functionality',
          'No filter by permit type (OSSF, septic, etc.)'
        ]
      },
      otherPublicPages: [
        { name: 'Inspection Request', url: `${CONFIG.baseUrl}/InspectionRequest.aspx` },
        { name: 'Power Release Status', url: `${CONFIG.baseUrl}/ExternalPowerRelease.aspx` },
        { name: 'Complaints', url: `${CONFIG.baseUrl}/External_Complaints.aspx` },
        { name: 'Pay as Guest', url: `${CONFIG.baseUrl}/PayAsGuest.aspx` },
        { name: 'Print Documents', url: `${CONFIG.baseUrl}/PrintDocuments_Anonymous.aspx` }
      ]
    },
    apiEndpoints: {
      authenticated: {
        base: '/jsonCallers.aspx',
        status: '401 Unauthorized without login',
        knownMethods: [
          'GetPermitTypes',
          'Search',
          'GetStatusList'
        ],
        note: 'These endpoints require authentication via the login page'
      },
      noPublicApi: true,
      azureInsights: {
        enabled: true,
        key: 'dc8a5466-45c1-4dbe-9e36-4caa60ee563e',
        endpoint: 'southcentralus-3.in.applicationinsights.azure.com'
      }
    },
    ossfDataAccess: {
      possible: false,
      reason: 'No public search/browse for OSSF or septic permits without knowing specific project numbers',
      alternatives: [
        'Request project numbers from Harris County directly',
        'Use authenticated access if credentials available',
        'Check if Harris County publishes permit data through other channels (Open Data portal, TCEQ reports)'
      ]
    },
    technicalDetails: {
      aspNetViewState: true,
      eventValidation: true,
      formSubmission: 'POST to same page with __VIEWSTATE',
      sessionManagement: 'Cookie-based'
    },
    discoveredAt: new Date().toISOString()
  };

  const outputFile = path.join(CONFIG.outputDir, 'discovery_report.json');
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
  console.log(`  Saved discovery report to ${outputFile}`);
}

function transformToPermit(raw: Record<string, unknown>): PermitRecord {
  // Harris County ePermits field mapping (will be discovered during scraping)
  // Common ASP.NET/Vue portal field names
  const permitNumber = String(
    raw.PermitNumber || raw.permitNumber || raw.ProjectNumber || raw.projectNumber ||
    raw.CaseNumber || raw.ApplicationNumber || raw.RecordNumber || raw.Id || raw.id || ''
  );

  return {
    permitNumber,
    projectNumber: String(raw.ProjectNumber || raw.projectNumber || ''),
    address: String(
      raw.Address || raw.address || raw.SiteAddress || raw.siteAddress ||
      raw.PropertyAddress || raw.Location || raw.StreetAddress || ''
    ),
    city: String(raw.City || raw.city || ''),
    state: 'TX',
    county: 'Harris',
    zipCode: String(raw.ZipCode || raw.zipCode || raw.Zip || raw.zip || raw.PostalCode || ''),
    parcelNumber: String(raw.ParcelNumber || raw.parcelNumber || raw.APN || raw.ParcelID || ''),
    ownerName: String(raw.OwnerName || raw.ownerName || raw.Owner || raw.PropertyOwner || ''),
    permitType: String(
      raw.PermitType || raw.permitType || raw.Type || raw.Category ||
      raw.PermitCategory || raw.RecordType || ''
    ),
    workType: String(raw.WorkType || raw.workType || raw.WorkClass || ''),
    status: String(raw.Status || raw.status || raw.PermitStatus || raw.ProjectStatus || ''),
    appliedDate: String(raw.AppliedDate || raw.appliedDate || raw.ApplicationDate || raw.SubmitDate || ''),
    issuedDate: String(raw.IssuedDate || raw.issuedDate || raw.IssueDate || ''),
    expirationDate: String(raw.ExpirationDate || raw.expirationDate || raw.ExpireDate || ''),
    description: String(raw.Description || raw.description || raw.WorkDescription || raw.ProjectName || ''),
    contractor: String(raw.Contractor || raw.contractor || raw.ContractorName || ''),
    source: 'HarrisCounty_ePermits',
    portal: 'harris_county_epermits',
    portalUrl: CONFIG.baseUrl,
    scrapedAt: new Date().toISOString(),
    rawData: raw
  };
}

function isOSSFPermit(record: Record<string, unknown>): boolean {
  const searchableText = JSON.stringify(record).toLowerCase();
  const ossfKeywords = [
    'ossf', 'septic', 'wastewater', 'on-site sewage', 'sewage facility',
    'aerobic', 'tceq', 'disposal system', 'sanitary', 'effluent'
  ];
  return ossfKeywords.some(keyword => searchableText.includes(keyword));
}

// ============================================
// NETWORK INTERCEPTION
// ============================================

function setupNetworkInterception(page: Page): void {
  // Intercept all requests
  page.on('request', (request: Request) => {
    const url = request.url();
    const method = request.method();

    // Filter for API-related requests
    const isApiRequest =
      url.includes('/api/') ||
      url.includes('/jsonCallers') ||
      url.includes('.aspx') ||
      url.includes('/Ajax/') ||
      url.includes('/Service') ||
      url.includes('/Handler') ||
      (method === 'POST' && !url.includes('.js') && !url.includes('.css'));

    if (isApiRequest) {
      const endpoint: DiscoveredEndpoint = {
        url: url,
        method: method,
        discoveredAt: new Date().toISOString(),
        context: 'request'
      };

      // Capture request payload for POST requests
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        try {
          const postData = request.postData();
          if (postData) {
            try {
              endpoint.requestPayload = JSON.parse(postData);
            } catch {
              endpoint.requestPayload = postData;
            }
          }
        } catch {}
      }

      console.log(`    [${method}] ${url.substring(0, 100)}`);

      // Avoid duplicates
      const existing = discoveredEndpoints.find(
        e => e.url === url && e.method === method
      );
      if (!existing) {
        discoveredEndpoints.push(endpoint);
      }
    }
  });

  // Intercept all responses
  page.on('response', async (response: Response) => {
    const url = response.url();
    const status = response.status();
    const contentType = response.headers()['content-type'] || '';

    // Filter for API responses
    const isApiResponse =
      url.includes('/api/') ||
      url.includes('/jsonCallers') ||
      url.includes('.aspx') ||
      url.includes('/Ajax/') ||
      url.includes('/Service') ||
      url.includes('/Handler') ||
      contentType.includes('application/json');

    if (isApiResponse && status === 200 && contentType.includes('application/json')) {
      try {
        const data = await response.json();

        console.log(`    [RESPONSE ${status}] ${url.substring(0, 80)}`);

        // Update endpoint with response info
        const endpoint = discoveredEndpoints.find(e => e.url === url);
        if (endpoint) {
          endpoint.responseStatus = status;
          endpoint.contentType = contentType;
          try {
            const body = await response.body();
            endpoint.responseSize = body.length;
          } catch {}
        }

        // Extract permit data from various response formats
        let records: Record<string, unknown>[] = [];

        if (data.Result && Array.isArray(data.Result)) {
          records = data.Result;
        } else if (data.Results && Array.isArray(data.Results)) {
          records = data.Results;
        } else if (data.Data && Array.isArray(data.Data)) {
          records = data.Data;
        } else if (data.d && Array.isArray(data.d)) {
          // ASP.NET WebMethod format
          records = data.d;
        } else if (data.d && typeof data.d === 'object' && data.d.Results) {
          records = data.d.Results;
        } else if (data.Records && Array.isArray(data.Records)) {
          records = data.Records;
        } else if (data.Permits && Array.isArray(data.Permits)) {
          records = data.Permits;
        } else if (data.Projects && Array.isArray(data.Projects)) {
          records = data.Projects;
        } else if (Array.isArray(data)) {
          records = data;
        }

        // Extract permit types/statuses for metadata
        if (data.PermitTypes || data.permitTypes) {
          const types = data.PermitTypes || data.permitTypes;
          if (Array.isArray(types)) {
            searchMetadata.permitTypes = types.map((t: any) => ({
              id: String(t.Id || t.id || t.ID || t.Value || ''),
              name: String(t.Name || t.name || t.Text || t.Description || ''),
              code: String(t.Code || t.code || '')
            }));
            console.log(`      Found ${searchMetadata.permitTypes.length} permit types`);
          }
        }

        if (data.Statuses || data.statuses || data.StatusList) {
          const statuses = data.Statuses || data.statuses || data.StatusList;
          if (Array.isArray(statuses)) {
            searchMetadata.statuses = statuses.map((s: any) => ({
              id: String(s.Id || s.id || s.ID || s.Value || ''),
              name: String(s.Name || s.name || s.Text || s.Description || '')
            }));
            console.log(`      Found ${searchMetadata.statuses.length} statuses`);
          }
        }

        // Process extracted records
        if (records.length > 0) {
          console.log(`      Processing ${records.length} records...`);

          for (const record of records) {
            // Check if OSSF/septic related
            if (isOSSFPermit(record)) {
              const permit = transformToPermit(record);

              if (permit.permitNumber && !seenPermitNumbers.has(permit.permitNumber)) {
                seenPermitNumbers.add(permit.permitNumber);
                extractedPermits.push(permit);
                console.log(`        [OSSF] ${permit.permitNumber} - ${permit.address || 'No address'}`);
              }
            }
          }
        }

        // Log structure for discovery
        if (Object.keys(data).length > 0) {
          const keys = Object.keys(data);
          console.log(`      Response keys: ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? '...' : ''}`);
        }

      } catch (error) {
        // Non-JSON response or parsing error - skip silently
      }
    }
  });
}

// ============================================
// SCRAPING LOGIC
// ============================================

async function navigateToProjectStatus(page: Page): Promise<boolean> {
  console.log('\n[1] Navigating to ePermits portal...');

  try {
    await page.goto(CONFIG.baseUrl, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.timeout
    });
    await sleep(5000); // Wait for Vue.js to initialize

    await page.screenshot({
      path: path.join(CONFIG.screenshotDir, '01_landing.png'),
      fullPage: true
    });

    console.log('  Landing page loaded');

    // Look for "Project Status" link (public search without login)
    const projectStatusSelectors = [
      'a:has-text("Project Status")',
      'a:has-text("Search Projects")',
      'a:has-text("Public Search")',
      'a:has-text("Search Permits")',
      'button:has-text("Project Status")',
      '[href*="ProjectStatus"]',
      '[href*="Search"]',
      '#projectStatus',
      '.project-status-link'
    ];

    for (const selector of projectStatusSelectors) {
      try {
        const link = await page.$(selector);
        if (link && await link.isVisible()) {
          console.log(`  Found Project Status via: ${selector}`);
          await link.click();
          await sleep(3000);
          await page.screenshot({
            path: path.join(CONFIG.screenshotDir, '02_project_status.png'),
            fullPage: true
          });
          return true;
        }
      } catch {}
    }

    // Try direct URL navigation
    const possibleUrls = [
      `${CONFIG.baseUrl}/ProjectStatus`,
      `${CONFIG.baseUrl}/Search`,
      `${CONFIG.baseUrl}/PublicSearch`,
      `${CONFIG.baseUrl}/Permits/Search`,
      `${CONFIG.baseUrl}/Project/Search`
    ];

    for (const url of possibleUrls) {
      try {
        console.log(`  Trying direct URL: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await sleep(2000);

        // Check if page loaded successfully (not a 404)
        const title = await page.title();
        if (!title.toLowerCase().includes('404') && !title.toLowerCase().includes('error')) {
          console.log(`  Successfully navigated to: ${url}`);
          await page.screenshot({
            path: path.join(CONFIG.screenshotDir, '02_project_status.png'),
            fullPage: true
          });
          return true;
        }
      } catch {}
    }

    // If no specific link found, look for any menu/nav items
    console.log('  Exploring navigation menu...');
    const navItems = await page.$$('nav a, .menu a, .nav a, .sidebar a');
    for (const item of navItems) {
      try {
        const text = await item.textContent();
        const href = await item.getAttribute('href');
        console.log(`    Menu item: "${text?.trim()}" -> ${href}`);
      } catch {}
    }

    return false;

  } catch (error) {
    console.error(`  Navigation error: ${error}`);
    return false;
  }
}

async function exploreSearchOptions(page: Page): Promise<void> {
  console.log('\n[2] Exploring search options and page structure...');

  try {
    // Look for dropdown/select elements with permit types
    const selectElements = await page.$$('select');
    console.log(`  Found ${selectElements.length} dropdown elements`);

    for (let i = 0; i < selectElements.length; i++) {
      try {
        const select = selectElements[i];
        const id = await select.getAttribute('id');
        const name = await select.getAttribute('name');
        const options = await select.$$('option');

        console.log(`    Dropdown ${i + 1}: id="${id}", name="${name}", ${options.length} options`);

        for (const option of options.slice(0, 10)) {
          const value = await option.getAttribute('value');
          const text = await option.textContent();
          if (text && text.trim()) {
            console.log(`      - ${value}: ${text.trim()}`);
          }
        }
      } catch {}
    }

    // Look for input fields (ASP.NET WebForms uses specific naming)
    const inputElements = await page.$$('input[type="text"], input[type="search"], textarea');
    console.log(`  Found ${inputElements.length} text input fields`);

    for (const input of inputElements) {
      try {
        const id = await input.getAttribute('id');
        const name = await input.getAttribute('name');
        const placeholder = await input.getAttribute('placeholder');
        console.log(`    Input: id="${id}", name="${name}", placeholder="${placeholder}"`);
      } catch {}
    }

    // Look for ASP.NET buttons
    const buttons = await page.$$('input[type="submit"], input[type="button"], button');
    console.log(`  Found ${buttons.length} buttons`);

    for (const button of buttons) {
      try {
        const id = await button.getAttribute('id');
        const value = await button.getAttribute('value');
        const text = await button.textContent();
        console.log(`    Button: id="${id}", value="${value}", text="${text?.trim()}"`);
      } catch {}
    }

    // Look for links in the navigation
    const navLinks = await page.$$('a[href*=".aspx"]');
    console.log(`  Found ${navLinks.length} ASPX page links`);

    for (const link of navLinks) {
      try {
        const href = await link.getAttribute('href');
        const text = await link.textContent();
        if (text && text.trim()) {
          console.log(`    Link: "${text.trim()}" -> ${href}`);
        }
      } catch {}
    }

    // Extract ASP.NET ViewState and other hidden fields (useful for form submission)
    const hiddenFields = await page.$$('input[type="hidden"]');
    console.log(`  Found ${hiddenFields.length} hidden form fields`);

    const importantHiddenFields: string[] = [];
    for (const field of hiddenFields) {
      try {
        const name = await field.getAttribute('name');
        if (name && (name.includes('VIEWSTATE') || name.includes('EVENTVALIDATION'))) {
          importantHiddenFields.push(name);
        }
      } catch {}
    }
    if (importantHiddenFields.length > 0) {
      console.log(`    ASP.NET fields: ${importantHiddenFields.join(', ')}`);
    }

    await page.screenshot({
      path: path.join(CONFIG.screenshotDir, '03_search_options.png'),
      fullPage: true
    });

  } catch (error) {
    console.error(`  Error exploring search options: ${error}`);
  }
}

async function searchForOSSFPermits(page: Page): Promise<void> {
  console.log('\n[3] Searching for OSSF/septic permits...');

  // Harris County ePermits requires a 10-digit project number
  // The visible input field is next to the "Search Project Details" button

  // Find the visible project number input - it's near the search button
  // Use Playwright locator for better visibility handling
  const projectInputLocator = page.locator('input[type="text"]:visible').first();

  // Also try to find the search button to confirm we're on the right page
  const searchButtonLocator = page.locator('input[value*="Search Project"], a:has-text("Search Project Details")').first();

  const hasSearchButton = await searchButtonLocator.count() > 0;
  console.log(`  Search button found: ${hasSearchButton}`);

  if (hasSearchButton) {
    // Try sample project numbers - these are guesses based on common formats
    // Harris County uses 10-digit project numbers
    // NOTE: Without knowing the actual format, these are educated guesses
    // The system confirms it needs exactly 10 digits
    const sampleProjectNumbers = [
      // Recent years with sequential numbering
      '2024000001',
      '2024000100',
      '2023000001',
      // Alternative formats
      '2400000001',
      '2300000001',
    ];

    for (const projectNum of sampleProjectNumbers) {
      console.log(`\n  Trying project number: ${projectNum}`);

      try {
        // Navigate fresh to the page to reset state
        await page.goto(`${CONFIG.baseUrl}/PublicProjectStatus.aspx`, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        await sleep(2000);

        // Find and fill the input using JavaScript for more reliability
        const filled = await page.evaluate((num) => {
          // Find visible text inputs
          const inputs = document.querySelectorAll('input[type="text"]');
          for (const input of inputs) {
            const el = input as HTMLInputElement;
            // Check if visible (has dimensions and not hidden)
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            if (rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden') {
              // Skip username field
              if (el.id === 'username') continue;
              el.value = num;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              return el.id || el.name || 'found';
            }
          }
          return null;
        }, projectNum);

        if (filled) {
          console.log(`    Filled input: ${filled}`);

          // Click the search button using JavaScript
          const clicked = await page.evaluate(() => {
            // Find the Search Project Details button/link
            const buttons = document.querySelectorAll('input[type="submit"], input[type="button"], a');
            for (const btn of buttons) {
              const el = btn as HTMLElement;
              const text = el.textContent || (el as HTMLInputElement).value || '';
              if (text.includes('Search Project')) {
                el.click();
                return true;
              }
            }
            // Try submitting the form
            const form = document.querySelector('form');
            if (form) {
              form.submit();
              return true;
            }
            return false;
          });

          if (clicked) {
            console.log(`    Clicked search button`);
          }

          // Wait for page load/response
          await sleep(3000);
          await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

          // Take screenshot
          await page.screenshot({
            path: path.join(CONFIG.screenshotDir, `04_project_${projectNum}.png`),
            fullPage: true
          });

          // Check for results
          const pageContent = await page.content();
          const lowerContent = pageContent.toLowerCase();

          if (lowerContent.includes('not found') ||
              lowerContent.includes('no project') ||
              lowerContent.includes('invalid') ||
              lowerContent.includes('does not exist') ||
              lowerContent.includes('enter a complete')) {
            console.log(`    Project ${projectNum}: Not found`);
          } else if (lowerContent.includes('project number') &&
                     (lowerContent.includes('address') || lowerContent.includes('status') || lowerContent.includes('permit'))) {
            console.log(`    Project ${projectNum}: FOUND - extracting data`);

            // Extract data from page
            await extractProjectDetails(page, projectNum);

            // Check if it's OSSF related
            if (lowerContent.includes('ossf') ||
                lowerContent.includes('septic') ||
                lowerContent.includes('wastewater') ||
                lowerContent.includes('sewage')) {
              console.log(`    ** OSSF/Septic permit found! **`);
            }
          }

        } else {
          console.log(`    Could not find visible input field`);
        }

      } catch (error) {
        console.error(`    Error with project ${projectNum}: ${error}`);
      }

      await sleep(1000);
    }
  } else {
    console.log('  Search button not found - page structure may have changed');

    // Log all visible elements for debugging
    const pageContent = await page.content();
    console.log(`  Page contains "Project Status": ${pageContent.includes('Project Status')}`);
  }
}

async function extractProjectDetails(page: Page, projectNum: string): Promise<void> {
  try {
    // Extract details from the project page
    const details = await page.evaluate(() => {
      const data: Record<string, string> = {};

      // Look for labeled fields (common in ASP.NET pages)
      // Format: <label>Field Name:</label> <span>Value</span>
      const labels = document.querySelectorAll('td, th, label, span');
      let currentLabel = '';

      for (const el of labels) {
        const text = (el.textContent || '').trim();

        // Check if this looks like a label (ends with : or contains known field names)
        if (text.endsWith(':') || text.match(/^(Project|Permit|Address|Status|Owner|Type|Date)/i)) {
          currentLabel = text.replace(/:$/, '').trim();
        } else if (currentLabel && text && text.length > 0 && text.length < 500) {
          // This might be a value
          if (!data[currentLabel]) {
            data[currentLabel] = text;
          }
        }
      }

      // Also try table rows
      const rows = document.querySelectorAll('tr');
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          const label = (cells[0].textContent || '').trim().replace(/:$/, '');
          const value = (cells[1].textContent || '').trim();
          if (label && value && !data[label]) {
            data[label] = value;
          }
        }
      }

      return data;
    });

    console.log(`    Extracted ${Object.keys(details).length} fields`);

    if (Object.keys(details).length > 0) {
      // Log some key fields
      const keyFields = ['Project Number', 'Address', 'Status', 'Permit Type', 'Owner'];
      for (const field of keyFields) {
        if (details[field]) {
          console.log(`      ${field}: ${details[field]}`);
        }
      }

      // Check if OSSF related and add to extracted permits
      const detailsStr = JSON.stringify(details).toLowerCase();
      if (detailsStr.includes('ossf') || detailsStr.includes('septic') ||
          detailsStr.includes('wastewater') || detailsStr.includes('sewage')) {

        const permit = transformToPermit({
          ProjectNumber: projectNum,
          ...details
        });

        if (!seenPermitNumbers.has(permit.permitNumber)) {
          seenPermitNumbers.add(permit.permitNumber);
          extractedPermits.push(permit);
          console.log(`      Added OSSF permit: ${permit.permitNumber}`);
        }
      }
    }

  } catch (error) {
    console.error(`    Error extracting project details: ${error}`);
  }
}

async function extractVisibleTableData(page: Page): Promise<void> {
  try {
    // Look for data tables in the page
    const tables = await page.$$('table');

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const rows = await table.$$('tbody tr');

      if (rows.length > 0) {
        console.log(`    Found table with ${rows.length} rows`);

        // Get headers
        const headerCells = await table.$$('thead th, thead td');
        const headers: string[] = [];
        for (const cell of headerCells) {
          const text = await cell.textContent();
          headers.push(text?.trim() || '');
        }
        console.log(`    Headers: ${headers.join(', ')}`);

        // Extract row data
        for (const row of rows.slice(0, 50)) { // Limit to 50 rows per table
          try {
            const cells = await row.$$('td');
            const rowData: Record<string, unknown> = {};

            for (let j = 0; j < cells.length && j < headers.length; j++) {
              const text = await cells[j].textContent();
              const key = headers[j] || `column_${j}`;
              rowData[key] = text?.trim();
            }

            if (Object.keys(rowData).length > 0 && isOSSFPermit(rowData)) {
              const permit = transformToPermit(rowData);
              if (permit.permitNumber && !seenPermitNumbers.has(permit.permitNumber)) {
                seenPermitNumbers.add(permit.permitNumber);
                extractedPermits.push(permit);
                console.log(`      [TABLE] ${permit.permitNumber} - ${permit.address || 'No address'}`);
              }
            }
          } catch {}
        }
      }
    }

    // Also check for Vue.js data grids
    const gridElements = await page.$$('[class*="grid"], [class*="table"], [class*="list"]');
    console.log(`    Found ${gridElements.length} potential data grid elements`);

  } catch (error) {
    console.error(`    Table extraction error: ${error}`);
  }
}

async function discoverAPIEndpointsViaConsole(page: Page): Promise<void> {
  console.log('\n[4] Discovering API patterns via console...');

  try {
    // Inject script to capture Vue.js API configuration
    const apiInfo = await page.evaluate(() => {
      const info: any = {
        vueInstances: [],
        axiosConfig: null,
        fetchInterceptors: [],
        globalConfig: {}
      };

      // Check for Vue instances
      // @ts-ignore
      if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
        info.vueInstances.push('Vue DevTools detected');
      }

      // Check for common API configuration patterns
      // @ts-ignore
      if (window.API_BASE_URL) info.globalConfig.API_BASE_URL = window.API_BASE_URL;
      // @ts-ignore
      if (window.apiBaseUrl) info.globalConfig.apiBaseUrl = window.apiBaseUrl;
      // @ts-ignore
      if (window.config) info.globalConfig.config = window.config;
      // @ts-ignore
      if (window.AppConfig) info.globalConfig.AppConfig = window.AppConfig;
      // @ts-ignore
      if (window.Settings) info.globalConfig.Settings = window.Settings;

      // Look for axios default config
      // @ts-ignore
      if (window.axios && window.axios.defaults) {
        info.axiosConfig = {
          // @ts-ignore
          baseURL: window.axios.defaults.baseURL,
          // @ts-ignore
          timeout: window.axios.defaults.timeout
        };
      }

      return info;
    });

    console.log('  Discovered configuration:', JSON.stringify(apiInfo, null, 2));

    // Try to find API endpoints in page source
    const pageContent = await page.content();

    // Look for API URL patterns
    const apiPatterns = [
      /["']\/api\/[^"']+["']/g,
      /["']\/jsonCallers[^"']*["']/g,
      /["'][^"']*\.aspx[^"']*["']/g,
      /["']\/Service[^"']*["']/g,
      /["']\/Ajax\/[^"']+["']/g
    ];

    const foundUrls = new Set<string>();
    for (const pattern of apiPatterns) {
      const matches = pageContent.match(pattern) || [];
      for (const match of matches) {
        const url = match.replace(/["']/g, '');
        if (url && !url.includes('.js') && !url.includes('.css')) {
          foundUrls.add(url);
        }
      }
    }

    const urlArray = Array.from(foundUrls);
    console.log(`  Found ${urlArray.length} API URLs in page source:`);
    for (const url of urlArray) {
      console.log(`    - ${url}`);
      discoveredEndpoints.push({
        url: url.startsWith('/') ? `${CONFIG.baseUrl}${url}` : url,
        method: 'UNKNOWN',
        discoveredAt: new Date().toISOString(),
        context: 'page_source'
      });
    }

  } catch (error) {
    console.error(`  Console discovery error: ${error}`);
  }
}

async function tryKnownEndpoints(page: Page): Promise<void> {
  console.log('\n[5] Testing known ASP.NET/ePermits endpoints...');

  const knownEndpoints = [
    // Session/Auth endpoints
    { path: '/api/Session', method: 'GET' },
    { path: '/api/Session/Current', method: 'GET' },
    { path: '/api/Session/Anonymous', method: 'GET' },

    // Common permit search endpoints
    { path: '/api/Permit/Search', method: 'POST', payload: { keyword: 'OSSF' } },
    { path: '/api/Permits', method: 'GET' },
    { path: '/api/Project/Search', method: 'POST', payload: { keyword: 'septic' } },
    { path: '/api/Projects', method: 'GET' },

    // jsonCallers.aspx patterns (common in older ASP.NET)
    { path: '/jsonCallers.aspx/GetPermitTypes', method: 'POST', payload: {} },
    { path: '/jsonCallers.aspx/Search', method: 'POST', payload: { searchTerm: 'OSSF' } },
    { path: '/jsonCallers.aspx/GetStatusList', method: 'POST', payload: {} },

    // Common REST patterns
    { path: '/api/v1/permits', method: 'GET' },
    { path: '/api/v1/search', method: 'GET' },
    { path: '/api/lookup/permit-types', method: 'GET' },
    { path: '/api/lookup/statuses', method: 'GET' }
  ];

  for (const endpoint of knownEndpoints) {
    try {
      const url = `${CONFIG.baseUrl}${endpoint.path}`;
      console.log(`  Testing: ${endpoint.method} ${endpoint.path}`);

      let response;
      if (endpoint.method === 'GET') {
        response = await page.evaluate(async (url) => {
          try {
            const res = await fetch(url, {
              method: 'GET',
              credentials: 'include',
              headers: { 'Accept': 'application/json' }
            });
            return {
              status: res.status,
              contentType: res.headers.get('content-type'),
              body: await res.text().catch(() => '')
            };
          } catch (e: any) {
            return { error: e.message };
          }
        }, url);
      } else {
        response = await page.evaluate(async ([url, payload]) => {
          try {
            const res = await fetch(url, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });
            return {
              status: res.status,
              contentType: res.headers.get('content-type'),
              body: await res.text().catch(() => '')
            };
          } catch (e: any) {
            return { error: e.message };
          }
        }, [url, endpoint.payload || {}] as const);
      }

      if (response && !('error' in response)) {
        console.log(`    -> ${response.status} (${response.contentType || 'unknown type'})`);

        if (response.status === 200 && response.body) {
          try {
            const data = JSON.parse(response.body);
            console.log(`    Response keys: ${Object.keys(data).slice(0, 5).join(', ')}`);

            // Add to discovered endpoints
            discoveredEndpoints.push({
              url,
              method: endpoint.method,
              contentType: response.contentType || undefined,
              requestPayload: endpoint.payload,
              responseStatus: response.status,
              responseSize: response.body.length,
              discoveredAt: new Date().toISOString(),
              context: 'direct_test'
            });
          } catch {}
        }
      } else if (response && 'error' in response) {
        console.log(`    -> Error: ${response.error}`);
      }

    } catch (error) {
      // Silently skip errors
    }

    await sleep(500);
  }
}

async function paginateThroughResults(page: Page): Promise<void> {
  console.log('\n[6] Attempting pagination...');

  let pageNum = 1;
  const maxPages = 10;

  while (pageNum < maxPages) {
    // Look for pagination controls
    const paginationSelectors = [
      'a:has-text("Next")',
      'button:has-text("Next")',
      'a:has-text(">")',
      'button:has-text(">")',
      '.pagination-next',
      '[aria-label="Next"]',
      `.pagination a:has-text("${pageNum + 1}")`,
      `button:has-text("${pageNum + 1}")`
    ];

    let clicked = false;
    for (const selector of paginationSelectors) {
      try {
        const nextBtn = await page.$(selector);
        if (nextBtn && await nextBtn.isVisible()) {
          const isDisabled = await nextBtn.getAttribute('disabled');
          if (!isDisabled) {
            await nextBtn.click();
            await sleep(2000);
            await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
            pageNum++;
            clicked = true;
            console.log(`  Navigated to page ${pageNum}`);
            break;
          }
        }
      } catch {}
    }

    if (!clicked) {
      console.log(`  No more pages after page ${pageNum}`);
      break;
    }
  }
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log('HARRIS COUNTY ePERMITS DISCOVERY SCRAPER');
  console.log('='.repeat(70));
  console.log(`Target: ${CONFIG.baseUrl}`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('');

  // Ensure output directories exist
  ensureDirectories();

  // Parse arguments
  const headlessArg = process.argv.find(arg => arg.startsWith('--headless='));
  const headless = headlessArg ? headlessArg.split('=')[1] !== 'false' : true;

  console.log(`Headless mode: ${headless}`);
  console.log(`Output directory: ${CONFIG.outputDir}`);
  console.log('');

  // Launch browser
  const browser = await chromium.launch({
    headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    // Set up network interception
    setupNetworkInterception(page);

    // Navigate to portal
    const foundProjectStatus = await navigateToProjectStatus(page);

    if (!foundProjectStatus) {
      console.log('\nWARNING: Could not find Project Status page, continuing with discovery...');
    }

    // Explore search options
    await exploreSearchOptions(page);

    // Search for OSSF/septic permits
    await searchForOSSFPermits(page);

    // Discover API endpoints from page
    await discoverAPIEndpointsViaConsole(page);

    // Try known endpoints
    await tryKnownEndpoints(page);

    // Try pagination
    await paginateThroughResults(page);

    // Final screenshot
    await page.screenshot({
      path: path.join(CONFIG.screenshotDir, '99_final.png'),
      fullPage: true
    });

    await context.close();

  } catch (error) {
    console.error(`\nFatal error: ${error}`);
  } finally {
    await browser.close();
  }

  // Save all results
  console.log('\n' + '='.repeat(70));
  console.log('SAVING RESULTS');
  console.log('='.repeat(70));

  saveDiscoveredEndpoints();
  savePermits();
  saveSearchMetadata();
  saveDiscoveryReport();

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('DISCOVERY COMPLETE');
  console.log('='.repeat(70));
  console.log(`Completed: ${new Date().toISOString()}`);
  console.log(`Discovered API endpoints: ${discoveredEndpoints.length}`);
  console.log(`OSSF/Septic permits extracted: ${extractedPermits.length}`);
  console.log(`Permit types found: ${searchMetadata.permitTypes.length}`);
  console.log(`Output directory: ${CONFIG.outputDir}`);
  console.log('');
  console.log('Files created:');
  console.log(`  - api_discovery.json`);
  console.log(`  - ossf_permits.ndjson`);
  console.log(`  - search_metadata.json`);
  console.log(`  - discovery_report.json`);
  console.log(`  - screenshots/*.png`);
  console.log('');
  console.log('KEY FINDINGS:');
  console.log('  - Public search requires exact 10-digit project number');
  console.log('  - No general browse/search for OSSF/septic permits');
  console.log('  - API endpoints (/jsonCallers.aspx) require authentication');
  console.log('  - Alternative data sources may be needed for bulk extraction');
}

// Run
main().catch(console.error);
