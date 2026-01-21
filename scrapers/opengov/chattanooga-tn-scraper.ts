#!/usr/bin/env npx tsx
/**
 * Chattanooga TN OpenGov Permit Scraper
 *
 * Extracts permit records from Chattanooga TN via OpenGov API.
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const PORTAL_URL = 'https://chattanoogatn.portal.opengov.com';
const OUTPUT_DIR = './scrapers/output/tennessee';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'chattanooga_opengov_permits.ndjson');
const CHECKPOINT_FILE = path.join(OUTPUT_DIR, 'chattanooga_opengov_checkpoint.json');

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

let browser: Browser | null = null;
let page: Page | null = null;
let totalExtracted = 0;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function appendRecord(record: PermitRecord): void {
  fs.appendFileSync(OUTPUT_FILE, JSON.stringify(record) + '\n');
  totalExtracted++;
}

function saveCheckpoint(): void {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({
    totalRecords: totalExtracted,
    timestamp: new Date().toISOString()
  }, null, 2));
}

async function initBrowser(): Promise<void> {
  console.log('Initializing browser...');
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  page = await context.newPage();
}

async function extractTableRecords(): Promise<any[]> {
  if (!page) return [];

  return await page.evaluate(() => {
    const records: any[] = [];

    // Find all table rows
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      rows.forEach((row, idx) => {
        if (idx === 0) return; // Skip header
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
          const record: any = {
            cells: Array.from(cells).map(c => c.textContent?.trim() || ''),
            links: Array.from(row.querySelectorAll('a')).map(a => ({
              text: a.textContent?.trim(),
              href: a.href
            }))
          };
          records.push(record);
        }
      });
    });

    // Also check for card/list style results
    const cards = document.querySelectorAll('[class*="result"], [class*="card"], [class*="item"]');
    cards.forEach(card => {
      const text = card.textContent?.trim() || '';
      if (text.length > 20) {
        records.push({
          text: text.substring(0, 500),
          links: Array.from(card.querySelectorAll('a')).map(a => ({
            text: a.textContent?.trim(),
            href: a.href
          }))
        });
      }
    });

    return records;
  });
}

async function scrapeSearch(searchTerm: string): Promise<void> {
  if (!page) return;

  console.log(`\nSearching for: "${searchTerm}"...`);

  try {
    // Navigate with longer timeout and different wait strategy
    await page.goto(PORTAL_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 90000
    });
    await sleep(5000);

    // Wait for page to be interactive
    await page.waitForLoadState('load').catch(() => {});
    await sleep(3000);

    // Look for search functionality
    const searchInput = await page.$('input[type="search"], input[type="text"], input[placeholder*="search" i], input[name*="search" i]');

    if (searchInput) {
      await searchInput.fill(searchTerm);
      await searchInput.press('Enter');
      await sleep(5000);
    } else {
      // Try clicking a search button if no input
      const searchBtn = await page.$('button:has-text("Search"), a:has-text("Search")');
      if (searchBtn) {
        await searchBtn.click();
        await sleep(5000);
      }
    }

    // Wait for results
    await page.waitForSelector('table, [class*="result"], [class*="card"]', { timeout: 30000 }).catch(() => {});
    await sleep(2000);

    // Extract records
    let pageNum = 1;
    let hasMore = true;

    while (hasMore && pageNum <= 50) {
      const records = await extractTableRecords();
      console.log(`  Page ${pageNum}: found ${records.length} items`);

      for (const raw of records) {
        const permitNum = (raw.cells?.[0] || raw.text || '').match(/([A-Z0-9]{2,}-?\d{4,}-?\d*)/)?.[1];

        const record: PermitRecord = {
          permit_number: permitNum || `CHAT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          address: raw.cells?.[1] || '',
          city: 'Chattanooga',
          county: 'Hamilton',
          state: 'TN',
          permit_type: searchTerm,
          status: raw.cells?.[3] || '',
          description: raw.text?.substring(0, 200) || raw.cells?.join(' ').substring(0, 200) || '',
          issue_date: raw.cells?.[2] || '',
          owner_name: '',
          source: 'Chattanooga OpenGov',
          scraped_at: new Date().toISOString(),
          raw_data: raw
        };

        appendRecord(record);
      }

      // Save checkpoint
      saveCheckpoint();

      // Try to find next page
      const nextBtn = await page.$('button:has-text("Next"), a:has-text("Next"), [class*="next"]:not([class*="disabled"])');
      if (nextBtn) {
        try {
          await nextBtn.click();
          await sleep(3000);
          pageNum++;
        } catch {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

  } catch (error: any) {
    console.error(`  Error: ${error.message}`);
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('CHATTANOOGA TN OPENGOV PERMIT SCRAPER');
  console.log('='.repeat(60));
  console.log(`Portal: ${PORTAL_URL}`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log('');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  try {
    await initBrowser();

    // Search for various permit types
    const searchTerms = ['', 'septic', 'building', 'permit', 'residential', 'commercial', 'plumbing', 'electrical'];

    for (const term of searchTerms) {
      await scrapeSearch(term);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('COMPLETE');
    console.log(`Total records extracted: ${totalExtracted}`);
    console.log(`Output: ${OUTPUT_FILE}`);

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    if (browser) await browser.close();
  }
}

main().catch(console.error);
