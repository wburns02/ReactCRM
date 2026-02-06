#!/usr/bin/env python3
"""
MGO Connect Travis County OSSF Scraper v4

Uses JavaScript evaluation for ng-select dropdown handling.
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

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/texas/travis_mgo_v4')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MGO_SEARCH_URL = "https://www.mgoconnect.org/cp/search"
USERNAME = "willwalterburns@gmail.com"
PASSWORD = "#Espn202512"


async def select_ng_dropdown(page, index, search_text, wait_after=8):
    """Select option from ng-select dropdown using direct DOM interaction."""
    logger.info(f"  Selecting '{search_text}' from dropdown {index}...")

    try:
        # Get all ng-select elements
        ng_selects = await page.query_selector_all('ng-select')
        if index >= len(ng_selects):
            logger.error(f"    Dropdown index {index} not found")
            return False

        dropdown = ng_selects[index]

        # Click to open dropdown
        await dropdown.click()
        await asyncio.sleep(3)

        # Find the input inside the dropdown (ng-select has an input inside)
        inner_input = await dropdown.query_selector('input')
        if inner_input:
            await inner_input.type(search_text, delay=150)
            await asyncio.sleep(3)
        else:
            # Type on the page level
            await page.keyboard.type(search_text, delay=150)
            await asyncio.sleep(3)

        # Wait for dropdown panel to appear and have options
        await page.wait_for_selector('.ng-dropdown-panel .ng-option', timeout=10000)
        await asyncio.sleep(2)

        # Click first matching option
        options = await page.query_selector_all('.ng-dropdown-panel .ng-option')
        for option in options:
            text = await option.inner_text()
            if search_text.lower() in text.lower():
                await option.click()
                logger.info(f"    Selected option: {text}")
                await asyncio.sleep(wait_after)
                return True

        # If no exact match found, press Enter
        await page.keyboard.press('Enter')
        await asyncio.sleep(wait_after)
        logger.info(f"    Pressed Enter after typing '{search_text}'")
        return True

    except Exception as e:
        logger.error(f"    Dropdown selection error: {e}")
        # Try clicking elsewhere to close any open dropdown
        await page.click('body', position={'x': 10, 'y': 10})
        await asyncio.sleep(2)
        return False


async def extract_table_data(page):
    """Extract all data from results table."""
    records = []
    try:
        rows = await page.query_selector_all('table tbody tr')
        for row in rows:
            cells = await row.query_selector_all('td')
            if len(cells) >= 5:
                record = {}
                for i, cell in enumerate(cells[:10]):
                    text = (await cell.inner_text()).strip()
                    if text:
                        headers = ['checkbox', 'project_number', 'project_name', 'work_type',
                                  'status', 'address', 'unit', 'designation', 'created_date', 'parcel_number']
                        if i < len(headers):
                            record[headers[i]] = text
                if record.get('project_number'):
                    records.append(record)
    except Exception as e:
        logger.debug(f"Table extraction error: {e}")
    return records


async def search_and_paginate(page, prefix, all_records, seen_ids):
    """Search with address prefix and paginate."""
    logger.info(f"  Searching prefix: '{prefix}'")

    try:
        # Look for address input on the search form
        # The form might have changed, so try multiple selectors
        address_input = None
        for selector in [
            'input[placeholder*="Address" i]',
            'input[formcontrolname*="address" i]',
            'input[name*="address" i]',
            '.search-input input',
            'input.form-control'
        ]:
            elem = await page.query_selector(selector)
            if elem:
                address_input = elem
                break

        if not address_input:
            # Try finding any text input in the form area
            inputs = await page.query_selector_all('form input[type="text"]')
            if inputs:
                address_input = inputs[0]

        if address_input:
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
        consecutive_empty = 0

        while page_num <= 100:
            records = await extract_table_data(page)

            if not records:
                consecutive_empty += 1
                if consecutive_empty >= 2:
                    break
            else:
                consecutive_empty = 0

            logger.info(f"    Page {page_num}: {len(records)} records")

            for rec in records:
                rec_id = f"{rec.get('project_number', '')}_{rec.get('address', '')}"
                if rec_id not in seen_ids:
                    seen_ids.add(rec_id)
                    rec['search_prefix'] = prefix
                    rec['source'] = 'MGO Connect - Travis County'
                    all_records.append(rec)

            # Check for next page
            next_btns = await page.query_selector_all('.pagination a, .pagination button, [aria-label*="Next" i]')
            next_clicked = False
            for btn in next_btns:
                text = await btn.inner_text()
                cls = await btn.get_attribute('class') or ''
                disabled = await btn.get_attribute('disabled')
                if ('>' in text or 'next' in text.lower()) and 'disabled' not in cls and not disabled:
                    await btn.click()
                    await asyncio.sleep(3)
                    next_clicked = True
                    break

            if not next_clicked:
                break

            page_num += 1

        logger.info(f"    Prefix '{prefix}': Total unique now {len(all_records)}")

    except Exception as e:
        logger.error(f"    Search error for prefix '{prefix}': {e}")


async def main():
    logger.info("=" * 60)
    logger.info("MGO CONNECT TRAVIS COUNTY OSSF SCRAPER v4")
    logger.info("=" * 60)

    all_records = []
    seen_ids = set()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
        )
        page = await context.new_page()

        try:
            # Step 1: Load search page
            logger.info(f"Loading: {MGO_SEARCH_URL}")
            await page.goto(MGO_SEARCH_URL, timeout=90000)
            await asyncio.sleep(15)
            await page.screenshot(path=str(OUTPUT_DIR / '01_loaded.png'))

            # Step 2: Login
            logger.info("Logging in...")
            email_input = await page.query_selector('input[type="email"], input[formcontrolname="email"]')
            if email_input:
                await email_input.fill(USERNAME)
                await asyncio.sleep(2)

                pwd = await page.query_selector('input[type="password"]')
                if pwd:
                    await pwd.fill(PASSWORD)
                    await asyncio.sleep(2)

                login_btn = await page.query_selector('button[type="submit"]')
                if login_btn:
                    await login_btn.click()
                    await asyncio.sleep(20)

            await page.screenshot(path=str(OUTPUT_DIR / '02_logged_in.png'))
            logger.info("Login complete")

            # Step 3: Select State = Texas
            logger.info("Selecting Texas...")
            await asyncio.sleep(5)
            success = await select_ng_dropdown(page, 0, "Texas", wait_after=10)
            await page.screenshot(path=str(OUTPUT_DIR / '03_texas.png'))

            if not success:
                logger.warning("State selection may have failed, continuing anyway...")

            # Step 4: Select Jurisdiction = Travis County
            logger.info("Selecting Travis County...")
            await asyncio.sleep(3)
            success = await select_ng_dropdown(page, 1, "Travis", wait_after=10)
            await page.screenshot(path=str(OUTPUT_DIR / '04_travis.png'))

            # Step 5: Select Project Type
            logger.info("Selecting OSSF project type...")
            await asyncio.sleep(3)
            # Try clicking on the project type dropdown
            success = await select_ng_dropdown(page, 2, "OSSF", wait_after=10)
            await page.screenshot(path=str(OUTPUT_DIR / '05_ossf.png'))

            # Step 6: Click Search button
            logger.info("Clicking initial Search...")
            search_btn = await page.query_selector('button:has-text("Search")')
            if search_btn:
                await search_btn.click()
                await asyncio.sleep(10)
            await page.screenshot(path=str(OUTPUT_DIR / '06_search_results.png'))

            # Check results count
            results_info = await page.query_selector('[class*="showing"], .results-count, .pagination-info')
            if results_info:
                info_text = await results_info.inner_text()
                logger.info(f"Results: {info_text}")

            # Step 7: Recursive address search
            logger.info("Starting recursive address search...")

            for prefix in '123456789':
                await search_and_paginate(page, prefix, all_records, seen_ids)
                await asyncio.sleep(2)

                if len(all_records) > 0 and len(all_records) % 500 == 0:
                    checkpoint = OUTPUT_DIR / f'checkpoint_{len(all_records)}.json'
                    with open(checkpoint, 'w') as f:
                        json.dump({'count': len(all_records), 'records': all_records}, f)
                    logger.info(f"Checkpoint: {checkpoint}")

            for prefix in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
                await search_and_paginate(page, prefix, all_records, seen_ids)
                await asyncio.sleep(2)

            await page.screenshot(path=str(OUTPUT_DIR / '07_complete.png'))

        except Exception as e:
            logger.error(f"Error: {e}")
            await page.screenshot(path=str(OUTPUT_DIR / 'error.png'))

        finally:
            await browser.close()

    # Save results
    logger.info("\n" + "=" * 60)
    logger.info("TRAVIS COUNTY MGO v4 COMPLETE")
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
