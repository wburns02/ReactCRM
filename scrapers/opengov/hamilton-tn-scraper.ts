#!/usr/bin/env npx tsx
/**
 * Hamilton County TN OpenGov Permit Scraper
 *
 * Extracts all permit records from Hamilton County TN via the OpenGov API.
 * Target: 30-50K septic/building permits to add to Tennessee data.
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const PORTAL_URL = 'https://hamiltontn.portal.opengov.com';
const OUTPUT_DIR = './scrapers/output/tennessee';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'hamilton_county_opengov_permits.ndjson');
const CHECKPOINT_FILE = path.join(OUTPUT_DIR, 'hamilton_opengov_checkpoint.json');

interface PermitRecord {
  permit_number: string;
  address: string;
  city: string;
  county: string;
  state: string;
  permit_type: string;
  status: string;
  description: string;
  issue_date: string;
  owner_name: string;
  source: string;
  scraped_at: string;
  raw_data: any;
}

interface Checkpoint {
  lastPage: number;
  totalRecords: number;
  timestamp: string;
}

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadCheckpoint(): Checkpoint | null {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'));
    }
  } catch (e) {
    console.log('No checkpoint found, starting fresh');
  }
  return null;
}

function saveCheckpoint(checkpoint: Checkpoint): void {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

function appendRecord(record: PermitRecord): void {
  fs.appendFileSync(OUTPUT_FILE, JSON.stringify(record) + '\n');
}

async function initBrowser(): Promise<void> {
  console.log('Initializing browser...');
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  page = await context.newPage();
}

async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    context = null;
    page = null;
  }
}

async function extractRecordsFromPage(): Promise<any[]> {
  if (!page) return [];

  return await page.evaluate(() => {
    const records: any[] = [];

    // Try to find result cards/rows
    const resultCards = document.querySelectorAll('[class*="result"], [class*="card"], [class*="permit"], tr[class*="row"]');

    resultCards.forEach(card => {
      const text = card.textContent || '';
      const links = card.querySelectorAll('a');

      const record: any = {
        text: text.trim().substring(0, 500),
        links: Array.from(links).map(l => ({ href: l.href, text: l.textContent?.trim() }))
      };

      // Try to extract structured data
      const permitNum = text.match(/([A-Z]{2,4}[-\s]?\d{4,}[-\s]?\d*)/);
      if (permitNum) record.permit_number = permitNum[1];

      const address = text.match(/(\d+\s+[A-Z][a-z]+.*(?:ST|AVE|RD|DR|LN|CT|WAY|BLVD|PL|CIR))/i);
      if (address) record.address = address[1];

      records.push(record);
    });

    return records;
  });
}

async function searchPermits(searchTerm: string = ''): Promise<number> {
  if (!page) return 0;

  console.log(`Searching for: "${searchTerm || 'all permits'}"...`);

  // Navigate to portal
  await page.goto(PORTAL_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await sleep(3000);

  // Look for search input
  const searchInput = await page.$('input[type="search"], input[type="text"], input[placeholder*="search" i]');
  if (searchInput) {
    await searchInput.fill(searchTerm || '*');
    await searchInput.press('Enter');
    await sleep(5000);
  }

  // Wait for results to load
  await page.waitForSelector('[class*="result"], [class*="card"], table', { timeout: 30000 }).catch(() => {});
  await sleep(2000);

  // Get total count if available
  const countText = await page.textContent('[class*="count"], [class*="total"], [class*="results"]').catch(() => '');
  const countMatch = countText?.match(/(\d+,?\d*)\s*(?:results?|records?|permits?)/i);
  const totalCount = countMatch ? parseInt(countMatch[1].replace(',', '')) : 0;

  console.log(`Found approximately ${totalCount} results`);
  return totalCount;
}

async function scrapeAllRecords(): Promise<void> {
  if (!page) return;

  let totalExtracted = 0;
  let pageNum = 1;
  const checkpoint = loadCheckpoint();

  if (checkpoint) {
    pageNum = checkpoint.lastPage + 1;
    totalExtracted = checkpoint.totalRecords;
    console.log(`Resuming from page ${pageNum} (${totalExtracted} records)`);
  }

  // Search with common permit type patterns
  const searchTerms = [
    '', // All
    'septic',
    'building',
    'permit',
    'plumbing',
    'electrical',
    'mechanical',
    'residential',
    'commercial'
  ];

  for (const term of searchTerms) {
    try {
      await searchPermits(term);

      let hasMore = true;
      let pageAttempts = 0;

      while (hasMore && pageAttempts < 100) {
        const records = await extractRecordsFromPage();

        for (const rawRecord of records) {
          if (rawRecord.permit_number || rawRecord.text.length > 50) {
            const record: PermitRecord = {
              permit_number: rawRecord.permit_number || `HAMILTON-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              address: rawRecord.address || '',
              city: 'Chattanooga',
              county: 'Hamilton',
              state: 'TN',
              permit_type: term || 'Unknown',
              status: '',
              description: rawRecord.text.substring(0, 200),
              issue_date: '',
              owner_name: '',
              source: 'Hamilton County OpenGov',
              scraped_at: new Date().toISOString(),
              raw_data: rawRecord
            };

            appendRecord(record);
            totalExtracted++;
          }
        }

        console.log(`Page ${pageNum}: extracted ${records.length} records (total: ${totalExtracted})`);

        // Save checkpoint
        saveCheckpoint({
          lastPage: pageNum,
          totalRecords: totalExtracted,
          timestamp: new Date().toISOString()
        });

        // Try to find and click next page
        const nextBtn = await page.$('button:has-text("Next"), a:has-text("Next"), [class*="next"]');
        if (nextBtn) {
          const isDisabled = await nextBtn.getAttribute('disabled');
          if (isDisabled) {
            hasMore = false;
          } else {
            await nextBtn.click();
            await sleep(3000);
            await page.waitForLoadState('networkidle').catch(() => {});
            pageNum++;
          }
        } else {
          hasMore = false;
        }

        pageAttempts++;
        await sleep(2000);
      }

    } catch (error) {
      console.error(`Error searching for "${term}":`, error);
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Total records extracted: ${totalExtracted}`);
  console.log(`Output: ${OUTPUT_FILE}`);
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('HAMILTON COUNTY TN OPENGOV PERMIT SCRAPER');
  console.log('='.repeat(60));
  console.log(`Portal: ${PORTAL_URL}`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log('');

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  try {
    await initBrowser();
    await scrapeAllRecords();
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await closeBrowser();
  }
}

main().catch(console.error);
