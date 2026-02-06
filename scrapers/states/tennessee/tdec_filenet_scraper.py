#!/usr/bin/env python3
"""
Tennessee TDEC FileNet Septic Records Scraper

Portal: https://tdec.tn.gov/filenetsearch
Platform: FileNet document management system

Excludes 9 metro/contract counties:
- Blount, Davidson, Hamilton, Jefferson, Knox, Madison, Sevier, Shelby, Williamson

Estimated records: 500,000+
"""

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/tn_tdec_filenet.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Tennessee counties (excluding 9 metro/contract counties)
TN_COUNTIES = [
    "Anderson", "Bedford", "Benton", "Bledsoe", "Bradley", "Campbell", "Cannon",
    "Carroll", "Carter", "Cheatham", "Chester", "Claiborne", "Clay", "Cocke",
    "Coffee", "Crockett", "Cumberland", "Decatur", "DeKalb", "Dickson", "Dyer",
    "Fayette", "Fentress", "Franklin", "Gibson", "Giles", "Grainger", "Greene",
    "Grundy", "Hamblen", "Hancock", "Hardeman", "Hardin", "Hawkins", "Haywood",
    "Henderson", "Henry", "Hickman", "Houston", "Humphreys", "Jackson", "Johnson",
    "Lake", "Lauderdale", "Lawrence", "Lewis", "Lincoln", "Loudon", "Macon",
    "Marion", "Marshall", "Maury", "McMinn", "McNairy", "Meigs", "Monroe",
    "Montgomery", "Moore", "Morgan", "Obion", "Overton", "Perry", "Pickett",
    "Polk", "Putnam", "Rhea", "Roane", "Robertson", "Rutherford", "Scott",
    "Sequatchie", "Smith", "Stewart", "Sullivan", "Sumner", "Tipton", "Trousdale",
    "Unicoi", "Union", "Van Buren", "Warren", "Washington", "Wayne", "Weakley",
    "White", "Wilson"
]

BASE_URL = "https://tdec.tn.gov/filenetsearch"
OUTPUT_DIR = Path("output/tennessee")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SHORT_WAIT = 2
MEDIUM_WAIT = 4
LONG_WAIT = 8


async def search_county(page, county_name):
    """Search for all septic records in a county."""
    logger.info(f"Searching {county_name} County...")
    records = []

    try:
        # Navigate to search page
        await page.goto(BASE_URL, wait_until='networkidle', timeout=60000)
        await asyncio.sleep(MEDIUM_WAIT)

        # Find and fill county dropdown
        county_select = await page.query_selector('select[name*="county"], select[id*="county"], select[name*="County"]')
        if county_select:
            # Try to select the county
            await county_select.select_option(label=county_name)
            await asyncio.sleep(SHORT_WAIT)
        else:
            # Try text input for county
            county_input = await page.query_selector('input[name*="county"], input[id*="county"]')
            if county_input:
                await county_input.fill(county_name)
                await asyncio.sleep(SHORT_WAIT)

        # Click search button
        search_btn = await page.query_selector('button[type="submit"], input[type="submit"], button:text("Search"), a:text("Search")')
        if search_btn:
            await search_btn.click()
            await asyncio.sleep(LONG_WAIT)

        # Extract results
        page_num = 1
        while True:
            logger.info(f"  {county_name} - Page {page_num}")

            # Look for results table
            rows = await page.evaluate('''() => {
                const results = [];
                const rows = document.querySelectorAll('table tr, .result-row, .search-result');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td, .cell, .field');
                    if (cells.length >= 3) {
                        results.push({
                            permit_id: cells[0]?.innerText?.trim() || '',
                            address: cells[1]?.innerText?.trim() || '',
                            owner: cells[2]?.innerText?.trim() || '',
                            date: cells[3]?.innerText?.trim() || '',
                            type: cells[4]?.innerText?.trim() || ''
                        });
                    }
                });
                return results;
            }''')

            if not rows:
                # Try alternative extraction
                rows = await page.evaluate('''() => {
                    const results = [];
                    document.querySelectorAll('a[href*="document"], a[href*="permit"], .permit-link').forEach(link => {
                        results.push({
                            permit_id: link.innerText?.trim() || '',
                            href: link.href || '',
                            raw: link.parentElement?.innerText?.trim() || ''
                        });
                    });
                    return results;
                }''')

            if not rows:
                logger.info(f"  No results for {county_name}")
                break

            records.extend(rows)
            logger.info(f"  Page {page_num}: {len(rows)} rows, total: {len(records)}")

            # Check for next page
            next_btn = await page.query_selector('a:text("Next"), a[href*="page"], button:text("Next"), .pagination-next')
            if not next_btn:
                break

            try:
                await next_btn.click()
                await asyncio.sleep(MEDIUM_WAIT)
                page_num += 1
            except:
                break

            if page_num > 500:  # Safety limit
                logger.warning(f"  Hit page limit for {county_name}")
                break

        return records

    except Exception as e:
        logger.error(f"Error searching {county_name}: {e}")
        return records


async def explore_portal(page):
    """Explore the TDEC FileNet portal structure."""
    logger.info("=" * 50)
    logger.info("EXPLORING TDEC FILENET PORTAL")
    logger.info("=" * 50)

    await page.goto(BASE_URL, wait_until='networkidle', timeout=60000)
    await asyncio.sleep(MEDIUM_WAIT)

    # Screenshot
    await page.screenshot(path=str(OUTPUT_DIR / 'tdec_filenet_home.png'), full_page=True)

    # Get page title
    title = await page.title()
    logger.info(f"Page title: {title}")

    # Find form elements
    forms = await page.query_selector_all('form')
    logger.info(f"Found {len(forms)} forms")

    # Find all input fields
    inputs = await page.query_selector_all('input, select, textarea')
    logger.info(f"Found {len(inputs)} input fields")

    for inp in inputs[:20]:
        name = await inp.get_attribute('name') or await inp.get_attribute('id')
        tag = await inp.evaluate('el => el.tagName')
        inp_type = await inp.get_attribute('type') or 'select'
        logger.info(f"  {tag} [{inp_type}]: {name}")

    # Find county dropdown if exists
    county_select = await page.query_selector('select[name*="county"], select[id*="county"]')
    if county_select:
        options = await county_select.evaluate('''el => {
            return Array.from(el.options).map(o => ({value: o.value, text: o.text.trim()}));
        }''')
        logger.info(f"County dropdown has {len(options)} options")
        for opt in options[:10]:
            logger.info(f"  {opt['text']} = {opt['value']}")

    return True


async def main():
    from playwright.async_api import async_playwright

    logger.info("=" * 60)
    logger.info("TENNESSEE TDEC FILENET SCRAPER - STARTING")
    logger.info("=" * 60)
    logger.info(f"Counties to process: {len(TN_COUNTIES)}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, slow_mo=500)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        page = await context.new_page()

        all_records = {}
        total_records = 0

        try:
            # Explore portal first
            await explore_portal(page)

            # Process each county
            for i, county in enumerate(TN_COUNTIES):
                logger.info(f"\n[{i+1}/{len(TN_COUNTIES)}] Processing {county} County")

                records = await search_county(page, county)
                all_records[county] = records
                total_records += len(records)

                logger.info(f"  {county}: {len(records)} records (Total: {total_records})")

                # Save checkpoint every 10 counties
                if (i + 1) % 10 == 0:
                    checkpoint_file = OUTPUT_DIR / f'tn_checkpoint_{i+1}.json'
                    with open(checkpoint_file, 'w') as f:
                        json.dump({
                            'counties_processed': i + 1,
                            'total_records': total_records,
                            'data': all_records
                        }, f)
                    logger.info(f"Checkpoint saved: {checkpoint_file}")

                await asyncio.sleep(SHORT_WAIT)

            # Save final results
            output_file = OUTPUT_DIR / 'tn_tdec_septic_all.json'
            with open(output_file, 'w') as f:
                json.dump({
                    'state': 'Tennessee',
                    'source': 'TDEC FileNet',
                    'url': BASE_URL,
                    'extracted_at': datetime.now().isoformat(),
                    'counties_processed': len(TN_COUNTIES),
                    'total_records': total_records,
                    'by_county': all_records
                }, f, indent=2)

            logger.info("=" * 60)
            logger.info("SCRAPING COMPLETE")
            logger.info("=" * 60)
            logger.info(f"Total counties: {len(TN_COUNTIES)}")
            logger.info(f"Total records: {total_records}")
            logger.info(f"Output: {output_file}")

        except Exception as e:
            logger.error(f"Error: {e}")
            import traceback
            traceback.print_exc()
            await page.screenshot(path=str(OUTPUT_DIR / 'tdec_error.png'))
            raise
        finally:
            await browser.close()


if __name__ == '__main__':
    asyncio.run(main())
