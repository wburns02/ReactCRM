#!/usr/bin/env python3
"""
MGO Connect Travis County OSSF Scraper v3

Fixed dropdown handling - clicks on the ng-select container, types search, selects option.
"""

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/texas/travis_mgo_v3')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MGO_SEARCH_URL = "https://www.mgoconnect.org/cp/search"
USERNAME = "willwalterburns@gmail.com"
PASSWORD = "#Espn202512"


async def select_dropdown(page, label_text, search_value, index=0):
    """Select an option from ng-select dropdown by label."""
    logger.info(f"  Selecting '{search_value}' from {label_text} dropdown...")

    try:
        # Find all ng-select elements
        ng_selects = await page.query_selector_all('ng-select')
        logger.info(f"    Found {len(ng_selects)} ng-select elements")

        if index >= len(ng_selects):
            logger.error(f"    Index {index} out of range")
            return False

        dropdown = ng_selects[index]

        # Click to open dropdown
        await dropdown.click()
        await asyncio.sleep(3)

        # Type to search
        await page.keyboard.type(search_value, delay=100)
        await asyncio.sleep(3)

        # Look for option in dropdown panel
        option = await page.query_selector(f'.ng-dropdown-panel .ng-option:has-text("{search_value}")')
        if option:
            await option.click()
            logger.info(f"    Selected '{search_value}'")
            await asyncio.sleep(5)
            return True
        else:
            # Try pressing Enter
            await page.keyboard.press('Enter')
            await asyncio.sleep(3)
            logger.info(f"    Pressed Enter for '{search_value}'")
            return True

    except Exception as e:
        logger.error(f"    Error selecting dropdown: {e}")
        return False


async def extract_table_data(page):
    """Extract data from the results table."""
    records = []

    try:
        # Wait for table to have data
        await page.wait_for_selector('table tbody tr', timeout=10000)

        rows = await page.query_selector_all('table tbody tr')
        logger.info(f"    Found {len(rows)} table rows")

        for row in rows:
            cells = await row.query_selector_all('td')
            if len(cells) >= 5:
                record = {
                    'project_number': await cells[1].inner_text() if len(cells) > 1 else '',
                    'project_name': await cells[2].inner_text() if len(cells) > 2 else '',
                    'work_type': await cells[3].inner_text() if len(cells) > 3 else '',
                    'status': await cells[4].inner_text() if len(cells) > 4 else '',
                    'address': await cells[5].inner_text() if len(cells) > 5 else '',
                    'unit': await cells[6].inner_text() if len(cells) > 6 else '',
                    'designation': await cells[7].inner_text() if len(cells) > 7 else '',
                    'created_date': await cells[8].inner_text() if len(cells) > 8 else '',
                    'parcel_number': await cells[9].inner_text() if len(cells) > 9 else '',
                }
                records.append(record)

    except Exception as e:
        logger.debug(f"    Error extracting table: {e}")

    return records


async def search_with_address(page, prefix, all_records, seen_ids):
    """Search with address prefix and paginate through results."""
    logger.info(f"  Searching address prefix: '{prefix}'")

    try:
        # Find address input in the form area
        address_input = await page.query_selector('input[formcontrolname="address"], input[placeholder*="address" i], input[name*="address" i]')

        if not address_input:
            # Try to find any text input that might be for address
            inputs = await page.query_selector_all('input[type="text"]')
            for inp in inputs:
                placeholder = await inp.get_attribute('placeholder') or ''
                name = await inp.get_attribute('name') or ''
                if 'address' in placeholder.lower() or 'address' in name.lower():
                    address_input = inp
                    break

        if not address_input:
            logger.warning("    Could not find address input")
            return

        # Clear and fill address
        await address_input.fill('')
        await asyncio.sleep(1)
        await address_input.fill(prefix)
        await asyncio.sleep(2)

        # Click search button
        search_btn = await page.query_selector('button:has-text("Search"), button[type="submit"]')
        if search_btn:
            await search_btn.click()
            await asyncio.sleep(5)

        # Paginate through results
        page_num = 1
        while page_num <= 100:
            records = await extract_table_data(page)

            if not records:
                break

            logger.info(f"    Page {page_num}: {len(records)} records")

            for rec in records:
                rec_id = f"{rec.get('project_number', '')}_{rec.get('address', '')}"
                if rec_id not in seen_ids:
                    seen_ids.add(rec_id)
                    rec['search_prefix'] = prefix
                    rec['source'] = 'MGO Connect - Travis County'
                    all_records.append(rec)

            # Look for next page button
            next_btn = await page.query_selector('[aria-label="Next"], .pagination-next:not(.disabled), button:has-text(">"):not([disabled])')
            if not next_btn:
                break

            # Check if disabled
            is_disabled = await next_btn.get_attribute('disabled')
            cls = await next_btn.get_attribute('class') or ''
            if is_disabled or 'disabled' in cls:
                break

            await next_btn.click()
            await asyncio.sleep(3)
            page_num += 1

        logger.info(f"    Prefix '{prefix}' done. Total unique: {len(all_records)}")

    except Exception as e:
        logger.error(f"    Error searching prefix '{prefix}': {e}")


async def main():
    logger.info("=" * 60)
    logger.info("MGO CONNECT TRAVIS COUNTY OSSF SCRAPER v3")
    logger.info("=" * 60)

    all_records = []
    seen_ids = set()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # headless=False to debug
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
        )
        page = await context.new_page()

        try:
            # Step 1: Load MGO search page
            logger.info(f"Loading: {MGO_SEARCH_URL}")
            await page.goto(MGO_SEARCH_URL, wait_until='networkidle', timeout=60000)
            await asyncio.sleep(10)
            await page.screenshot(path=str(OUTPUT_DIR / '01_loaded.png'))

            # Step 2: Login
            logger.info("Logging in...")
            email_input = await page.query_selector('input[type="email"], input[formcontrolname="email"], #email')
            if email_input:
                await email_input.fill(USERNAME)
                await asyncio.sleep(2)

                pwd_input = await page.query_selector('input[type="password"]')
                if pwd_input:
                    await pwd_input.fill(PASSWORD)
                    await asyncio.sleep(2)

                login_btn = await page.query_selector('button[type="submit"], button:has-text("Log")')
                if login_btn:
                    await login_btn.click()
                    await asyncio.sleep(15)

            await page.screenshot(path=str(OUTPUT_DIR / '02_logged_in.png'))
            logger.info("Login complete")

            # Step 3: Select State = Texas (first dropdown)
            logger.info("Selecting Texas...")
            await asyncio.sleep(5)
            await select_dropdown(page, "State", "Texas", index=0)
            await asyncio.sleep(10)
            await page.screenshot(path=str(OUTPUT_DIR / '03_texas_selected.png'))

            # Step 4: Select Jurisdiction = Travis County (second dropdown)
            logger.info("Selecting Travis County...")
            await select_dropdown(page, "Jurisdiction", "Travis", index=1)
            await asyncio.sleep(10)
            await page.screenshot(path=str(OUTPUT_DIR / '04_travis_selected.png'))

            # Step 5: Select Project Type = OSSF (third dropdown)
            logger.info("Selecting OSSF project type...")
            await select_dropdown(page, "Project Type", "OSSF", index=2)
            await asyncio.sleep(10)
            await page.screenshot(path=str(OUTPUT_DIR / '05_ossf_selected.png'))

            # Step 6: Click initial search to load base results
            logger.info("Performing initial search...")
            search_btn = await page.query_selector('button:has-text("Search")')
            if search_btn:
                await search_btn.click()
                await asyncio.sleep(10)
            await page.screenshot(path=str(OUTPUT_DIR / '06_initial_search.png'))

            # Check if we have results
            results_text = await page.query_selector('.results-info, [class*="showing"]')
            if results_text:
                text = await results_text.inner_text()
                logger.info(f"Results info: {text}")

            # Step 7: Recursive address search
            logger.info("Starting recursive address search...")

            # Try numeric prefixes first (1-9)
            for prefix in '123456789':
                await search_with_address(page, prefix, all_records, seen_ids)
                await asyncio.sleep(3)

                # Checkpoint every 500 records
                if len(all_records) > 0 and len(all_records) % 500 == 0:
                    checkpoint = OUTPUT_DIR / f'checkpoint_{len(all_records)}.json'
                    with open(checkpoint, 'w') as f:
                        json.dump({
                            'county': 'Travis',
                            'state': 'Texas',
                            'source': 'MGO Connect',
                            'count': len(all_records),
                            'records': all_records
                        }, f)
                    logger.info(f"Checkpoint saved: {checkpoint}")

            # Try letter prefixes (A-Z)
            for prefix in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
                await search_with_address(page, prefix, all_records, seen_ids)
                await asyncio.sleep(3)

            await page.screenshot(path=str(OUTPUT_DIR / '07_complete.png'))

        except Exception as e:
            logger.error(f"Error: {e}")
            await page.screenshot(path=str(OUTPUT_DIR / 'error.png'))

        finally:
            await browser.close()

    # Save final results
    logger.info("\n" + "=" * 60)
    logger.info("TRAVIS COUNTY MGO SCRAPER v3 COMPLETE")
    logger.info(f"Total unique records: {len(all_records):,}")
    logger.info("=" * 60)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = OUTPUT_DIR / f'travis_ossf_{timestamp}.json'

    with open(output_file, 'w') as f:
        json.dump({
            'county': 'Travis',
            'state': 'Texas',
            'source': 'MGO Connect',
            'project_type': 'OSSF',
            'count': len(all_records),
            'extracted_at': datetime.now().isoformat(),
            'records': all_records
        }, f, indent=2)

    logger.info(f"Saved to {output_file}")


if __name__ == '__main__':
    asyncio.run(main())
