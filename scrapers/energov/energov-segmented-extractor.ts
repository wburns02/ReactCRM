/**
 * EnerGov Segmented Extractor
 *
 * Extracts records using date-range segmentation to bypass pagination limits.
 * For portals with 100K+ records, breaks extraction into yearly/monthly segments.
 *
 * USAGE:
 *   npx tsx scrapers/energov/energov-segmented-extractor.ts --portal=albuquerque_nm
 *   npx tsx scrapers/energov/energov-segmented-extractor.ts --portal=wake_county_nc --year=2023
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
  segment?: string;
  rawData: Record<string, unknown>;
}

interface ExtractionSegment {
  name: string;
  startDate: string;
  endDate: string;
}

interface SegmentCheckpoint {
  portalId: string;
  completedSegments: string[];
  totalRecords: number;
  lastUpdated: string;
}

// ============================================
// GLOBALS
// ============================================

let totalRecordsExtracted = 0;
let currentProxyIndex = 0;

// ============================================
// SEGMENT GENERATION
// ============================================

function generateYearlySegments(startYear: number, endYear: number): ExtractionSegment[] {
  const segments: ExtractionSegment[] = [];
  for (let year = startYear; year <= endYear; year++) {
    segments.push({
      name: `year_${year}`,
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`
    });
  }
  return segments;
}

function generateMonthlySegments(year: number): ExtractionSegment[] {
  const segments: ExtractionSegment[] = [];
  for (let month = 1; month <= 12; month++) {
    const monthStr = month.toString().padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    segments.push({
      name: `${year}_${monthStr}`,
      startDate: `${year}-${monthStr}-01`,
      endDate: `${year}-${monthStr}-${lastDay}`
    });
  }
  return segments;
}

function generateQuarterlySegments(year: number): ExtractionSegment[] {
  return [
    { name: `${year}_Q1`, startDate: `${year}-01-01`, endDate: `${year}-03-31` },
    { name: `${year}_Q2`, startDate: `${year}-04-01`, endDate: `${year}-06-30` },
    { name: `${year}_Q3`, startDate: `${year}-07-01`, endDate: `${year}-09-30` },
    { name: `${year}_Q4`, startDate: `${year}-10-01`, endDate: `${year}-12-31` }
  ];
}

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

function loadSegmentCheckpoint(portalId: string): SegmentCheckpoint | null {
  const checkpointFile = path.join(EXTRACTION_CONFIG.outputDir, `${portalId}_segment_checkpoint.json`);
  try {
    if (fs.existsSync(checkpointFile)) {
      return JSON.parse(fs.readFileSync(checkpointFile, 'utf-8'));
    }
  } catch {}
  return null;
}

function saveSegmentCheckpoint(checkpoint: SegmentCheckpoint): void {
  const checkpointFile = path.join(EXTRACTION_CONFIG.outputDir, `${checkpoint.portalId}_segment_checkpoint.json`);
  fs.writeFileSync(checkpointFile, JSON.stringify(checkpoint, null, 2));
}

function transformRecord(raw: Record<string, unknown>, portal: EnerGovPortalConfig, segment: string): PermitRecord {
  const permitNumber = String(
    raw.PermitNumber || raw.permitNumber || raw.CaseNumber || raw.caseNumber ||
    raw.Number || raw.RecordNumber || raw.RecordId || raw.Id || raw.id ||
    raw.CAPId || raw.ApplicationNumber || raw.ProjectNumber || ''
  );

  let address = '';
  let city = '';
  let zipCode = '';
  const addressObj = raw.Address as Record<string, unknown> | undefined;
  if (addressObj && typeof addressObj === 'object') {
    address = String(addressObj.AddressLine1 || addressObj.FullAddress || '');
    city = String(addressObj.City || '');
    zipCode = String(addressObj.PostalCode || addressObj.Zip || '');
  } else if (raw.AddressDisplay && typeof raw.AddressDisplay === 'string') {
    const addrParts = (raw.AddressDisplay as string).split(/\s{2,}/);
    address = addrParts[0] || String(raw.AddressDisplay);
    city = String(raw.City || raw.city || '');
    zipCode = String(raw.Zip || raw.ZipCode || raw.zip || '');
  } else {
    address = String(raw.MainAddress || raw.Address || raw.SiteAddress || raw.address || raw.Location || '');
    city = String(raw.City || raw.city || '');
    zipCode = String(raw.Zip || raw.ZipCode || raw.zip || '');
  }

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
    segment,
    rawData: raw
  };
}

// ============================================
// SEGMENTED EXTRACTION
// ============================================

async function extractSegment(
  page: Page,
  portal: EnerGovPortalConfig,
  segment: ExtractionSegment,
  outputFile: string,
  seenPermits: Set<string>
): Promise<number> {
  console.log(`\n  [SEGMENT] ${segment.name}: ${segment.startDate} to ${segment.endDate}`);

  let segmentRecords = 0;
  const capturedRecords: Record<string, unknown>[] = [];
  let lastTotalPages = 0;
  let lastTotalPermits = 0;

  // Set up response capture for this segment
  const responseHandler = async (response: Response) => {
    const url = response.url();
    const urlLower = url.toLowerCase();

    if ((urlLower.includes('/api/') || urlLower.includes('selfservice')) &&
        urlLower.includes('/search') &&
        !urlLower.includes('/status') &&
        !urlLower.includes('/types') &&
        !urlLower.includes('/setting') &&
        response.status() === 200) {
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('application/json')) {
          const data = await response.json();

          if (data.Result && typeof data.Result === 'object' && !Array.isArray(data.Result)) {
            if (data.Result.TotalPages !== undefined) {
              lastTotalPages = data.Result.TotalPages;
              lastTotalPermits = data.Result.PermitsFound || 0;
            }
            if (data.Result.EntityResults && Array.isArray(data.Result.EntityResults)) {
              capturedRecords.push(...data.Result.EntityResults);
            }
          } else if (data.Result && Array.isArray(data.Result)) {
            capturedRecords.push(...data.Result);
          } else if (data.Records && Array.isArray(data.Records)) {
            capturedRecords.push(...data.Records);
          }
        }
      } catch {}
    }
  };

  page.on('response', responseHandler);

  try {
    // Navigate to search page - use the SelfService URL pattern
    const selfServiceUrl = `${portal.baseUrl}/apps/SelfService`;
    await page.goto(selfServiceUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(5000);

    // Wait for Angular app to bootstrap - look for menu
    await page.waitForSelector('.menu, nav, .main-menu, [role="navigation"]', { timeout: 15000 }).catch(() => {});
    await sleep(2000);

    // Navigate to Permits module first
    const moduleSelectors = [
      'a:has-text("Permits")',
      'span:has-text("Permits")',
      'li:has-text("Permits")',
      '[href*="permit"]',
      'a:has-text("Building")',
      'a:has-text("Search Permits")'
    ];

    for (const selector of moduleSelectors) {
      try {
        const link = await page.$(selector);
        if (link && await link.isVisible()) {
          console.log(`    Found module: ${selector}`);
          await link.click({ timeout: 10000 });
          await sleep(4000);
          break;
        }
      } catch {}
    }

    // Look for Search link
    const searchSelectors = [
      'a:has-text("Search")',
      'span:has-text("Search")',
      'button:has-text("Search")',
      'li:has-text("Search")',
      '[href*="search"]',
      'a:has-text("Search Records")'
    ];

    for (const selector of searchSelectors) {
      try {
        const link = await page.$(selector);
        if (link && await link.isVisible()) {
          console.log(`    Found search link: ${selector}`);
          await link.click({ timeout: 10000 });
          await sleep(4000);
          break;
        }
      } catch {}
    }

    // Find search input with multiple selectors
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

    let searchInput = null;
    for (const selector of inputSelectors) {
      const input = await page.$(selector);
      if (input && await input.isVisible()) {
        searchInput = input;
        console.log(`    Found input: ${selector}`);
        break;
      }
    }

    if (!searchInput) {
      console.log('    No search input found for this portal');
      page.off('response', responseHandler);
      return 0;
    }

    // Use year from segment name as search term
    const yearMatch = segment.name.match(/(\d{4})/);
    const searchTerm = yearMatch ? yearMatch[1] : '';

    await searchInput.fill('');
    await searchInput.fill(searchTerm);
    await sleep(500);

    // Click search button
    const searchBtn = page.locator('button.btn-info:has-text("Search"), button:has-text("Search"):not(:has-text("Reset"))').first();
    if (await searchBtn.count() > 0) {
      await searchBtn.scrollIntoViewIfNeeded();
      await searchBtn.click({ force: true, timeout: 5000 });
    } else {
      await searchInput.press('Enter');
    }

    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await sleep(5000);

    console.log(`    Found ${lastTotalPermits} permits, ${lastTotalPages} pages`);

    // Process captured records
    const writeStream = fs.createWriteStream(outputFile, { flags: 'a' });

    const processRecords = () => {
      while (capturedRecords.length > 0) {
        const raw = capturedRecords.shift()!;
        const record = transformRecord(raw, portal, segment.name);

        // Filter by date if we have date info
        const recordDate = record.issuedDate || record.appliedDate;
        if (recordDate && recordDate !== 'undefined' && recordDate !== 'null') {
          const dateStr = recordDate.split('T')[0];
          if (dateStr < segment.startDate || dateStr > segment.endDate) {
            continue; // Skip records outside our segment
          }
        }

        const recordId = record.permitNumber || `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        if (!seenPermits.has(recordId)) {
          seenPermits.add(recordId);
          if (record.permitNumber || record.address) {
            writeStream.write(JSON.stringify(record) + '\n');
            segmentRecords++;
          }
        }
      }
    };

    processRecords();

    // Paginate through all pages (no limit for segmented extraction)
    let pageNum = 1;
    const maxPages = Math.min(lastTotalPages, 10000); // Higher limit for segments

    while (pageNum < maxPages) {
      const paginationSelectors = [
        'a.pagination-next',
        'a[aria-label="Next"]',
        'button[aria-label="Next"]',
        'a:has-text("»")',
        'button:has-text("»")',
        `a.page-link:has-text("${pageNum + 1}")`,
        `li:has-text("${pageNum + 1}") a`
      ];

      let clickedNext = false;
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
              await sleep(1500);
              pageNum++;
              clickedNext = true;
              break;
            }
          }
        } catch {}
      }

      if (!clickedNext) {
        // Try JavaScript click
        try {
          const clicked = await page.evaluate((targetPage) => {
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
            await sleep(1500);
            pageNum++;
          } else {
            break;
          }
        } catch {
          break;
        }
      }

      processRecords();

      if (pageNum % 50 === 0) {
        console.log(`    Page ${pageNum}/${maxPages}, records: ${segmentRecords}`);
      }
    }

    writeStream.end();

  } finally {
    page.off('response', responseHandler);
  }

  console.log(`    Segment complete: ${segmentRecords} records`);
  return segmentRecords;
}

// ============================================
// MAIN EXTRACTION
// ============================================

async function extractPortalSegmented(
  portal: EnerGovPortalConfig,
  segments: ExtractionSegment[],
  useProxy: boolean
): Promise<number> {
  console.log('\n' + '='.repeat(60));
  console.log(`SEGMENTED EXTRACTION: ${portal.name}, ${portal.state}`);
  console.log(`Portal: ${portal.baseUrl}`);
  console.log(`Segments: ${segments.length}`);
  console.log('='.repeat(60));

  // Ensure output directory
  if (!fs.existsSync(EXTRACTION_CONFIG.outputDir)) {
    fs.mkdirSync(EXTRACTION_CONFIG.outputDir, { recursive: true });
  }

  const outputFile = path.join(
    EXTRACTION_CONFIG.outputDir,
    `${portal.state.toLowerCase()}_${portal.id}_segmented.ndjson`
  );

  // Load checkpoint
  let checkpoint = loadSegmentCheckpoint(portal.id);
  if (!checkpoint) {
    checkpoint = {
      portalId: portal.id,
      completedSegments: [],
      totalRecords: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  const seenPermits = new Set<string>();
  let totalRecords = checkpoint.totalRecords;

  // Browser setup
  const launchOptions: any = { headless: true };
  if (useProxy) {
    const proxy = getProxyConfig();
    if (proxy) {
      launchOptions.proxy = proxy;
      console.log(`Using proxy port: ${proxy.server.split(':').pop()}`);
    }
  }

  const browser = await chromium.launch(launchOptions);

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    // Process each segment
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      // Skip completed segments
      if (checkpoint.completedSegments.includes(segment.name)) {
        console.log(`\n  [SKIP] Segment ${segment.name} already completed`);
        continue;
      }

      console.log(`\n  [${i + 1}/${segments.length}] Processing segment: ${segment.name}`);

      try {
        const records = await extractSegment(page, portal, segment, outputFile, seenPermits);
        totalRecords += records;

        // Update checkpoint
        checkpoint.completedSegments.push(segment.name);
        checkpoint.totalRecords = totalRecords;
        checkpoint.lastUpdated = new Date().toISOString();
        saveSegmentCheckpoint(checkpoint);

        await sleep(3000); // Delay between segments

      } catch (error) {
        console.log(`    Segment error: ${error}`);
      }
    }

    await context.close();

  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log(`EXTRACTION COMPLETE: ${portal.name}`);
  console.log(`Total records: ${totalRecords.toLocaleString()}`);
  console.log(`Output: ${outputFile}`);
  console.log('='.repeat(60));

  return totalRecords;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('='.repeat(60));
  console.log('ENERGOV SEGMENTED EXTRACTOR');
  console.log('='.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);

  // Parse arguments
  const useProxy = process.argv.includes('--proxy');
  const portalArg = process.argv.find(arg => arg.startsWith('--portal='));
  const yearArg = process.argv.find(arg => arg.startsWith('--year='));
  const monthlyArg = process.argv.includes('--monthly');

  if (!portalArg) {
    console.log('\nUsage: npx tsx energov-segmented-extractor.ts --portal=<portal_id> [options]');
    console.log('\nOptions:');
    console.log('  --portal=<id>    Portal to extract (required)');
    console.log('  --year=<year>    Extract single year only');
    console.log('  --monthly        Use monthly segments (more granular)');
    console.log('  --proxy          Use Decodo proxy rotation');
    console.log('\nAvailable portals:');
    for (const p of ENERGOV_PORTALS.filter(p => p.enabled)) {
      console.log(`  ${p.id.padEnd(25)} ${p.name}, ${p.state}`);
    }
    process.exit(1);
  }

  const portalId = portalArg.split('=')[1];
  const portal = ENERGOV_PORTALS.find(p => p.id === portalId);

  if (!portal) {
    console.log(`Portal not found: ${portalId}`);
    process.exit(1);
  }

  // Generate segments
  let segments: ExtractionSegment[];

  if (yearArg) {
    const year = parseInt(yearArg.split('=')[1]);
    if (monthlyArg) {
      segments = generateMonthlySegments(year);
    } else {
      segments = generateQuarterlySegments(year);
    }
  } else {
    // Default: yearly segments from 2000 to current year
    const currentYear = new Date().getFullYear();
    segments = generateYearlySegments(2000, currentYear);
  }

  console.log(`\nPortal: ${portal.name} (${portal.id})`);
  console.log(`Segments: ${segments.length}`);
  console.log(`Proxy: ${useProxy ? 'enabled' : 'disabled'}`);

  // Run extraction
  const totalRecords = await extractPortalSegmented(portal, segments, useProxy);

  console.log('\n' + '='.repeat(60));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(60));
  console.log(`Portal: ${portal.name}`);
  console.log(`Total records extracted: ${totalRecords.toLocaleString()}`);
  console.log(`Completed: ${new Date().toISOString()}`);
}

main().catch(console.error);
