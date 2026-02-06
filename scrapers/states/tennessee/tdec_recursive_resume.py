#!/usr/bin/env python3
"""
Tennessee TDEC FileNet Recursive Scraper - RESUME VERSION

Resumes from checkpoint 15 (114,354 records from 15 counties)
Continues scraping remaining 71 counties

Portal: https://tdec.tn.gov/filenetsearch
Target: 850,000+ records
"""

import asyncio
import json
import logging
import os
from datetime import datetime
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('tn_recursive_resume.log')
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

# Search patterns for recursive scraping
SEARCH_PATTERNS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
                   'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
                   'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
                   'U', 'V', 'W', 'X', 'Y', 'Z']

BASE_URL = "https://tdec.tn.gov/filenetsearch"

# Detect if running on server (Linux) or local (Windows)
if os.name == 'nt':
    OUTPUT_DIR = Path("C:/Users/Will/crm-work/ReactCRM/scrapers/output/tennessee")
else:
    OUTPUT_DIR = Path("/home/will/scrapers/output/tennessee")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Resume configuration
RESUME_CHECKPOINT = "tn_recursive_checkpoint_15.json"
START_COUNTY_INDEX = 15  # Start from Crockett (index 15, 0-based)

SHORT_WAIT = 2
MEDIUM_WAIT = 4
LONG_WAIT = 8


async def extract_table_data(page):
    """Extract all rows from the results table."""
    return await page.evaluate('''() => {
        const results = [];
        const table = document.querySelector('table');
        if (!table) return results;

        const rows = table.querySelectorAll('tr');
        rows.forEach((row, idx) => {
            if (idx === 0) return; // Skip header

            const cells = row.querySelectorAll('td');
            if (cells.length >= 5) {
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


async def get_all_pages(page):
    """Extract data from all pages of current search results."""
    all_records = []
    page_num = 1

    while True:
        rows = await extract_table_data(page)
        if not rows:
            break

        all_records.extend(rows)
        logger.debug(f"    Page {page_num}: {len(rows)} rows")

        # Look for next page
        next_btn = await page.query_selector('a:has-text("Next"), a:has-text(">"), .pagination a:last-child')
        if not next_btn:
            break

        # Check if disabled
        classes = await next_btn.get_attribute('class') or ''
        if 'disabled' in classes:
            break

        try:
            await next_btn.click()
            await asyncio.sleep(MEDIUM_WAIT)
            await page.wait_for_load_state('networkidle', timeout=30000)
            page_num += 1
        except:
            break

        if page_num > 500:
            break

    return all_records


async def search_county_pattern(page, county_value, pattern):
    """Search a county with a specific address pattern."""
    try:
        # Navigate fresh
        await page.goto(BASE_URL, wait_until='networkidle', timeout=60000)
        await asyncio.sleep(SHORT_WAIT)

        # Select county
        county_select = await page.query_selector('select')
        if county_select:
            await county_select.select_option(value=county_value)
            await asyncio.sleep(1)

        # Fill street address pattern
        street_input = await page.query_selector('input[name*="street" i], input[name*="address" i], input[placeholder*="street" i]')
        if not street_input:
            # Try by name
            street_input = await page.query_selector('input[name="stAddVar"]')

        if street_input:
            await street_input.fill(pattern)
            await asyncio.sleep(1)

        # Submit
        submit_btn = await page.query_selector('button:has-text("Submit"), input[type="submit"], button[type="submit"]')
        if not submit_btn:
            submit_btn = await page.query_selector('button')

        if submit_btn:
            await submit_btn.click()
            await asyncio.sleep(LONG_WAIT)
            await page.wait_for_load_state('networkidle', timeout=30000)

        # Get all pages of results
        return await get_all_pages(page)

    except Exception as e:
        logger.warning(f"Error with pattern {pattern}: {e}")
        return []


async def search_county_recursive(page, county_name):
    """Search a county using recursive patterns."""
    logger.info(f"Searching {county_name} County recursively...")

    # Get the county value from dropdown
    await page.goto(BASE_URL, wait_until='networkidle', timeout=60000)
    await asyncio.sleep(SHORT_WAIT)

    county_select = await page.query_selector('select')
    if not county_select:
        logger.error("County dropdown not found")
        return []

    options = await county_select.evaluate('''el => {
        return Array.from(el.options).map(o => ({value: o.value, text: o.text.trim()}));
    }''')

    county_value = None
    for opt in options:
        if county_name.lower() in opt['text'].lower():
            county_value = opt['value']
            break

    if not county_value:
        logger.warning(f"County {county_name} not found")
        return []

    # Collect all records using patterns
    all_records = {}  # Use dict to dedupe by a unique key

    for pattern in SEARCH_PATTERNS:
        logger.info(f"  {county_name} - Pattern '{pattern}'...")
        records = await search_county_pattern(page, county_value, pattern)

        for rec in records:
            # Create unique key
            key = f"{rec.get('property_owner', '')}|{rec.get('street_address', '')}|{rec.get('parcel', '')}"
            if key not in all_records:
                all_records[key] = rec

        logger.info(f"    Pattern '{pattern}': {len(records)} rows, unique total: {len(all_records)}")
        await asyncio.sleep(SHORT_WAIT)

    return list(all_records.values())


async def main():
    from playwright.async_api import async_playwright

    logger.info("=" * 60)
    logger.info("TENNESSEE TDEC RECURSIVE SCRAPER - RESUME MODE")
    logger.info("=" * 60)

    # Load checkpoint data
    checkpoint_path = OUTPUT_DIR / RESUME_CHECKPOINT
    all_data = {}
    total_records = 0

    if checkpoint_path.exists():
        logger.info(f"Loading checkpoint: {checkpoint_path}")
        with open(checkpoint_path) as f:
            checkpoint = json.load(f)
            all_data = checkpoint.get('data', {})
            total_records = checkpoint.get('total_records', 0)
        logger.info(f"Loaded {total_records} records from {len(all_data)} counties")
    else:
        logger.warning(f"Checkpoint not found: {checkpoint_path}")
        logger.info("Starting fresh...")

    counties_to_process = TN_COUNTIES[START_COUNTY_INDEX:]
    logger.info(f"Counties remaining: {len(counties_to_process)}")
    logger.info(f"Search patterns: {len(SEARCH_PATTERNS)}")
    logger.info(f"Starting from: {counties_to_process[0]}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, slow_mo=300)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        page = await context.new_page()

        try:
            for i, county in enumerate(counties_to_process):
                actual_index = START_COUNTY_INDEX + i
                logger.info(f"\n[{actual_index+1}/{len(TN_COUNTIES)}] {county} County")

                records = await search_county_recursive(page, county)
                all_data[county] = records
                total_records += len(records)

                logger.info(f"  {county}: {len(records)} unique records (Total: {total_records})")

                # Save checkpoint every 3 counties
                if (actual_index + 1) % 3 == 0:
                    checkpoint = OUTPUT_DIR / f'tn_recursive_checkpoint_{actual_index+1}.json'
                    with open(checkpoint, 'w') as f:
                        json.dump({
                            'counties_processed': actual_index + 1,
                            'total_records': total_records,
                            'data': all_data
                        }, f)
                    logger.info(f"Checkpoint saved: {checkpoint}")

            # Save final
            output_file = OUTPUT_DIR / 'tn_tdec_recursive_all.json'
            with open(output_file, 'w') as f:
                json.dump({
                    'state': 'Tennessee',
                    'source': 'TDEC FileNet Recursive',
                    'url': BASE_URL,
                    'extracted_at': datetime.now().isoformat(),
                    'counties_processed': len(TN_COUNTIES),
                    'total_records': total_records,
                    'by_county': all_data
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

            # Save emergency checkpoint
            emergency_checkpoint = OUTPUT_DIR / f'tn_emergency_checkpoint_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
            with open(emergency_checkpoint, 'w') as f:
                json.dump({
                    'counties_processed': len([c for c in TN_COUNTIES if c in all_data]),
                    'total_records': total_records,
                    'data': all_data
                }, f)
            logger.info(f"Emergency checkpoint saved: {emergency_checkpoint}")
        finally:
            await browser.close()


if __name__ == '__main__':
    asyncio.run(main())
