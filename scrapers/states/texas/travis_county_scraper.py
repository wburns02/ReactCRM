#!/usr/bin/env python3
"""
Travis County TX Septic Permit Scraper (Pre-2014)

Target: All septic permits from 1970-2014
Source: Travis County Public Access TNR System
URL: https://tcobweb.traviscountytx.gov/PublicAccess/TNR/index.html

Strategy: Recursive address prefix search (1, 12, 123, 1234, etc.)
Max displayed: 50 records per search, so must drill down
"""

import asyncio
import json
import logging
import re
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/texas/travis_county')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TRAVIS_URL = "https://tcobweb.traviscountytx.gov/PublicAccess/TNR/index.html"
START_DATE = "01/01/1970"
END_DATE = "01/01/2014"

# Short waits since this is a simple HTML form
SHORT_WAIT = 2
MEDIUM_WAIT = 4


async def search_address_prefix(page, prefix, all_records, seen_ids):
    """Search for records with a given address prefix."""
    logger.info(f"  Searching prefix: '{prefix}'")

    try:
        # Fill in the search form
        await page.fill('input[name="Address"], #Address, input[type="text"][name*="ddress"]', prefix)
        await asyncio.sleep(0.5)

        # Click search
        await page.click('input[type="submit"], button[type="submit"], input[value="Search"]')
        await asyncio.sleep(MEDIUM_WAIT)

        # Wait for results
        await page.wait_for_load_state('networkidle', timeout=30000)

        # Get the results table
        content = await page.content()

        # Count rows in results
        rows = await page.query_selector_all('table tr, .result-row, tr[class*="row"]')
        row_count = len(rows) - 1  # Minus header row

        if row_count <= 0:
            logger.info(f"    No results for '{prefix}'")
            return

        logger.info(f"    Found {row_count} rows for '{prefix}'")

        # If we hit the max (50), drill down further
        if row_count >= 50:
            logger.info(f"    Hit max 50, drilling down from '{prefix}'")
            # Drill down with more specific prefixes
            for char in '0123456789':
                await search_address_prefix(page, prefix + char, all_records, seen_ids)
            return

        # Extract records from the table
        for i, row in enumerate(rows[1:]):  # Skip header
            try:
                cells = await row.query_selector_all('td')
                if len(cells) >= 4:
                    record = {}
                    for j, cell in enumerate(cells):
                        text = await cell.inner_text()
                        record[f'col_{j}'] = text.strip()

                    # Create unique ID from record content
                    record_id = '|'.join(str(v) for v in record.values())
                    if record_id not in seen_ids:
                        seen_ids.add(record_id)
                        record['prefix_searched'] = prefix
                        record['source'] = 'Travis County TX TNR'
                        all_records.append(record)

            except Exception as e:
                logger.debug(f"Error extracting row: {e}")

        logger.info(f"    Total unique: {len(all_records)}")

    except Exception as e:
        logger.error(f"Error searching '{prefix}': {e}")

    # Go back to search page
    await page.goto(TRAVIS_URL, wait_until='networkidle', timeout=30000)
    await asyncio.sleep(SHORT_WAIT)


async def main():
    logger.info("=" * 60)
    logger.info("TRAVIS COUNTY TX SEPTIC SCRAPER")
    logger.info(f"Date Range: {START_DATE} to {END_DATE}")
    logger.info("=" * 60)

    all_records = []
    seen_ids = set()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
        )
        page = await context.new_page()

        try:
            # Load the search page
            logger.info(f"Loading: {TRAVIS_URL}")
            await page.goto(TRAVIS_URL, wait_until='networkidle', timeout=60000)
            await asyncio.sleep(MEDIUM_WAIT)

            # Take screenshot of the page
            await page.screenshot(path=str(OUTPUT_DIR / 'travis_search_page.png'))

            # Log page content for debugging
            content = await page.content()
            logger.info(f"Page loaded, length: {len(content)}")

            # Find form elements
            forms = await page.query_selector_all('form')
            inputs = await page.query_selector_all('input')
            logger.info(f"Found {len(forms)} forms, {len(inputs)} inputs")

            # Try to set date range if there are date fields
            date_fields = await page.query_selector_all('input[type="date"], input[name*="date"], input[name*="Date"]')
            if date_fields:
                logger.info(f"Found {len(date_fields)} date fields")
                # Try to set dates
                for field in date_fields:
                    name = await field.get_attribute('name') or ''
                    if 'start' in name.lower() or 'from' in name.lower() or 'begin' in name.lower():
                        await field.fill(START_DATE)
                    elif 'end' in name.lower() or 'to' in name.lower():
                        await field.fill(END_DATE)

            # Start recursive search by numeric prefixes
            for prefix in '123456789':
                await search_address_prefix(page, prefix, all_records, seen_ids)

                # Save checkpoint every 1000 records
                if len(all_records) > 0 and len(all_records) % 1000 == 0:
                    checkpoint_file = OUTPUT_DIR / f'travis_checkpoint_{len(all_records)}.json'
                    with open(checkpoint_file, 'w') as f:
                        json.dump({
                            'county': 'Travis',
                            'state': 'Texas',
                            'count': len(all_records),
                            'extracted_at': datetime.now().isoformat(),
                            'records': all_records
                        }, f)
                    logger.info(f"Checkpoint: {checkpoint_file}")

                await asyncio.sleep(1)

            # Also try letter prefixes for addresses starting with letters
            for prefix in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
                await search_address_prefix(page, prefix, all_records, seen_ids)
                await asyncio.sleep(1)

        except Exception as e:
            logger.error(f"Error: {e}")
            await page.screenshot(path=str(OUTPUT_DIR / 'travis_error.png'))

        finally:
            await browser.close()

    # Save final results
    logger.info("\n" + "=" * 60)
    logger.info("TRAVIS COUNTY SCRAPER COMPLETE")
    logger.info(f"Total unique records: {len(all_records):,}")
    logger.info("=" * 60)

    if all_records:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = OUTPUT_DIR / f'travis_county_septic_{timestamp}.json'

        with open(output_file, 'w') as f:
            json.dump({
                'county': 'Travis',
                'state': 'Texas',
                'date_range': f'{START_DATE} to {END_DATE}',
                'count': len(all_records),
                'extracted_at': datetime.now().isoformat(),
                'records': all_records
            }, f)

        logger.info(f"Saved {len(all_records):,} records to {output_file}")


if __name__ == '__main__':
    asyncio.run(main())
