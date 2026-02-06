#!/usr/bin/env python3
"""
Tennessee TDEC FileNet Septic Records Scraper v2

Portal: https://tdec.tn.gov/filenetsearch
Results URL: https://tdec.tn.gov/FilenetSearch/ConfigObject/ConfigObjectCreation

Based on actual site inspection:
- County dropdown with format "Anderson County - 1"
- Can search with just county selected
- Results show: Property Owner, Document, County, Street Address, Subdivision, Lot Number, Map, Parcel

Excludes 9 metro/contract counties:
- Blount, Davidson, Hamilton, Jefferson, Knox, Madison, Sevier, Shelby, Williamson

Estimated records: 500,000+
"""

import asyncio
import json
import logging
import re
from datetime import datetime
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
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
OUTPUT_DIR = Path("C:/Users/Will/crm-work/ReactCRM/scrapers/output/tennessee")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Timing - be respectful
SHORT_WAIT = 2
MEDIUM_WAIT = 5
LONG_WAIT = 10


async def search_county(page, county_name):
    """Search for all septic records in a county."""
    logger.info(f"Searching {county_name} County...")
    records = []

    try:
        # Navigate to search page
        await page.goto(BASE_URL, wait_until='networkidle', timeout=60000)
        await asyncio.sleep(SHORT_WAIT)

        # Find county dropdown - it should be a select element
        county_select = await page.query_selector('select')
        if not county_select:
            logger.error("County dropdown not found")
            return records

        # Get all options to find the right county
        options = await county_select.evaluate('''el => {
            return Array.from(el.options).map(o => ({value: o.value, text: o.text.trim()}));
        }''')

        logger.info(f"Found {len(options)} county options")

        # Find matching county (format is "County Name - #")
        county_value = None
        for opt in options:
            if county_name.lower() in opt['text'].lower():
                county_value = opt['value']
                logger.info(f"  Found: {opt['text']} = {opt['value']}")
                break

        if not county_value:
            logger.warning(f"County {county_name} not found in dropdown")
            return records

        # Select the county
        await county_select.select_option(value=county_value)
        await asyncio.sleep(SHORT_WAIT)

        # Click Submit button
        submit_btn = await page.query_selector('button:has-text("Submit"), input[type="submit"], button[type="submit"]')
        if not submit_btn:
            # Try any button
            submit_btn = await page.query_selector('button')

        if submit_btn:
            await submit_btn.click()
            await asyncio.sleep(LONG_WAIT)
        else:
            logger.error("Submit button not found")
            return records

        # Wait for results to load
        await page.wait_for_load_state('networkidle', timeout=30000)
        await asyncio.sleep(SHORT_WAIT)

        # Extract results from table
        page_num = 1
        while True:
            logger.info(f"  {county_name} - Page {page_num}")

            # Extract table rows
            rows = await page.evaluate('''() => {
                const results = [];
                const table = document.querySelector('table');
                if (!table) return results;

                const rows = table.querySelectorAll('tr');
                rows.forEach((row, idx) => {
                    if (idx === 0) return; // Skip header

                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 5) {
                        // Get View link if exists
                        const viewLink = cells[0]?.querySelector('a');

                        results.push({
                            view_link: viewLink ? viewLink.href : '',
                            property_owner: cells[1]?.innerText?.trim() || '',
                            document: cells[2]?.innerText?.trim() || '',
                            county: cells[3]?.innerText?.trim() || '',
                            street_address: cells[4]?.innerText?.trim() || '',
                            subdivision: cells[5]?.innerText?.trim() || '',
                            lot_number: cells[6]?.innerText?.trim() || '',
                            map: cells[7]?.innerText?.trim() || '',
                            parcel: cells[8]?.innerText?.trim() || '',
                            upload_date: cells[9]?.innerText?.trim() || ''
                        });
                    }
                });
                return results;
            }''')

            if not rows:
                logger.info(f"  No results found for {county_name}")
                break

            records.extend(rows)
            logger.info(f"  Page {page_num}: {len(rows)} rows, total: {len(records)}")

            # Check for next page / pagination
            next_btn = await page.query_selector('a:has-text("Next"), button:has-text("Next"), a:has-text(">"), .pagination a:last-child')

            if not next_btn:
                break

            # Check if next button is disabled
            is_disabled = await next_btn.get_attribute('disabled') or await next_btn.get_attribute('class')
            if is_disabled and 'disabled' in str(is_disabled):
                break

            try:
                await next_btn.click()
                await asyncio.sleep(MEDIUM_WAIT)
                await page.wait_for_load_state('networkidle', timeout=30000)
                page_num += 1
            except Exception as e:
                logger.info(f"  No more pages: {e}")
                break

            if page_num > 1000:  # Safety limit
                logger.warning(f"  Hit page limit for {county_name}")
                break

        return records

    except Exception as e:
        logger.error(f"Error searching {county_name}: {e}")
        import traceback
        traceback.print_exc()
        return records


async def main():
    from playwright.async_api import async_playwright

    logger.info("=" * 60)
    logger.info("TENNESSEE TDEC FILENET SCRAPER v2 - STARTING")
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
            # Process each county
            for i, county in enumerate(TN_COUNTIES):
                logger.info(f"\n[{i+1}/{len(TN_COUNTIES)}] Processing {county} County")

                records = await search_county(page, county)
                all_records[county] = records
                total_records += len(records)

                logger.info(f"  {county}: {len(records)} records (Total: {total_records})")

                # Save checkpoint every 5 counties
                if (i + 1) % 5 == 0:
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
