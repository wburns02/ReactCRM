#!/usr/bin/env python3
"""
MGO Connect Travis County OSSF Scraper v2

Workflow:
1. https://www.mgoconnect.org/cp/search
2. Login with credentials
3. State: Texas
4. Jurisdiction: Travis County
5. Project Type: On-site sewage facility (OSSF) permits
6. Recursive address search (MAX 100)
7. Copy metadata from each result
8. Click next icon on bottom for pagination
9. Repeat until all pages done
10. Try next address prefix
11. Repeat for all prefixes 1-9, 0, A-Z
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

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/texas/travis_mgo_v2')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MGO_SEARCH_URL = "https://www.mgoconnect.org/cp/search"
USERNAME = "willwalterburns@gmail.com"
PASSWORD = "#Espn202512"

# Very deliberate timing - MGO kicks you out if too fast
TINY = 5
SHORT = 10
MEDIUM = 15
LONG = 25


async def wait_stable(page, timeout=20000):
    """Wait for page to stabilize."""
    try:
        await page.wait_for_load_state('networkidle', timeout=timeout)
    except:
        pass
    await asyncio.sleep(3)


async def extract_results(page):
    """Extract results from current page."""
    records = []
    try:
        # Look for result rows/cards
        rows = await page.query_selector_all('.search-result, .result-item, table tbody tr, .card, [class*="result"]')
        logger.info(f"    Found {len(rows)} result elements")

        for row in rows:
            try:
                record = {}
                # Try to extract text from cells or divs
                cells = await row.query_selector_all('td, .col, .cell, span, p')
                for i, cell in enumerate(cells[:10]):  # Limit to first 10 cells
                    text = await cell.inner_text()
                    if text and text.strip():
                        record[f'field_{i}'] = text.strip()

                # Also get full row text
                row_text = await row.inner_text()
                record['full_text'] = row_text.strip()[:500] if row_text else ''

                if len(record) > 1:  # Has some data
                    records.append(record)
            except:
                pass

    except Exception as e:
        logger.debug(f"Error extracting results: {e}")

    return records


async def search_prefix(page, prefix, all_records, seen_ids):
    """Search for a specific address prefix and paginate through results."""
    logger.info(f"  Searching prefix: '{prefix}'")

    try:
        # Find and fill address/search input
        search_input = None
        for selector in ['input[name*="address"]', 'input[placeholder*="address"]', 'input[type="search"]', '.search-input input', 'input[name="searchText"]', '#searchText']:
            elem = await page.query_selector(selector)
            if elem:
                search_input = elem
                break

        if not search_input:
            # Try to find any text input
            inputs = await page.query_selector_all('input[type="text"], input:not([type])')
            if inputs:
                search_input = inputs[0]

        if search_input:
            await search_input.fill('')
            await asyncio.sleep(1)
            await search_input.fill(prefix)
            await asyncio.sleep(SHORT)

            # Click search button
            for selector in ['button:has-text("Search")', 'button[type="submit"]', '.search-btn', 'input[value="Search"]']:
                btn = await page.query_selector(selector)
                if btn:
                    await btn.click()
                    break
            else:
                await page.keyboard.press('Enter')

            await asyncio.sleep(MEDIUM)
            await wait_stable(page)

            # Extract first page of results
            page_num = 1
            while True:
                records = await extract_results(page)
                logger.info(f"    Page {page_num}: {len(records)} results")

                for record in records:
                    record_id = record.get('full_text', '')[:100]
                    if record_id and record_id not in seen_ids:
                        seen_ids.add(record_id)
                        record['prefix'] = prefix
                        record['page'] = page_num
                        record['source'] = 'MGO Connect - Travis County'
                        all_records.append(record)

                # Look for next button
                next_btn = None
                for selector in ['.next', 'button:has-text("Next")', '[aria-label="Next"]', '.pagination-next', 'a:has-text(">")', '.page-next']:
                    elem = await page.query_selector(selector)
                    if elem:
                        is_disabled = await elem.get_attribute('disabled')
                        cls = await elem.get_attribute('class') or ''
                        if not is_disabled and 'disabled' not in cls:
                            next_btn = elem
                            break

                if not next_btn or len(records) == 0:
                    break

                # Click next
                await next_btn.click()
                await asyncio.sleep(SHORT)
                await wait_stable(page)
                page_num += 1

                if page_num > 100:  # Safety limit
                    break

        logger.info(f"    Prefix '{prefix}' done. Total unique: {len(all_records)}")

    except Exception as e:
        logger.error(f"Error searching prefix '{prefix}': {e}")


async def main():
    logger.info("=" * 60)
    logger.info("MGO CONNECT TRAVIS COUNTY OSSF SCRAPER v2")
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
            # Step 1: Load MGO search page
            logger.info(f"Loading: {MGO_SEARCH_URL}")
            await page.goto(MGO_SEARCH_URL, wait_until='domcontentloaded', timeout=60000)
            await asyncio.sleep(LONG)
            await page.screenshot(path=str(OUTPUT_DIR / 'step1_loaded.png'))

            # Step 2: Login if needed
            login_elem = await page.query_selector('input[type="email"], input[name="email"], #email')
            if login_elem:
                logger.info("Login form found, logging in...")
                await login_elem.fill(USERNAME)
                await asyncio.sleep(TINY)

                pwd_elem = await page.query_selector('input[type="password"]')
                if pwd_elem:
                    await pwd_elem.fill(PASSWORD)
                    await asyncio.sleep(TINY)

                # Click login
                for selector in ['button[type="submit"]', 'button:has-text("Log")', 'button:has-text("Sign")']:
                    btn = await page.query_selector(selector)
                    if btn:
                        await btn.click()
                        break

                await asyncio.sleep(LONG)
                await wait_stable(page)
                logger.info("Login complete")
                await page.screenshot(path=str(OUTPUT_DIR / 'step2_logged_in.png'))

            # Step 3: Select State = Texas
            logger.info("Selecting Texas...")
            await asyncio.sleep(MEDIUM)

            # Find state dropdown
            state_found = False
            for selector in ['ng-select[formcontrolname*="state"]', 'ng-select:first-of-type', '.ng-select:first-of-type', 'select[name*="state"]']:
                elem = await page.query_selector(selector)
                if elem:
                    await elem.click()
                    await asyncio.sleep(SHORT)
                    await page.keyboard.type('Texas', delay=150)
                    await asyncio.sleep(SHORT)
                    await page.keyboard.press('Enter')
                    await asyncio.sleep(LONG)
                    state_found = True
                    logger.info("Texas selected")
                    break

            if not state_found:
                logger.warning("Could not find state dropdown")

            await page.screenshot(path=str(OUTPUT_DIR / 'step3_texas.png'))

            # Step 4: Select Jurisdiction = Travis County
            logger.info("Selecting Travis County...")
            await asyncio.sleep(MEDIUM)

            # Find jurisdiction dropdown (usually second ng-select)
            dropdowns = await page.query_selector_all('ng-select, .ng-select')
            if len(dropdowns) >= 2:
                await dropdowns[1].click()
                await asyncio.sleep(SHORT)
                await page.keyboard.type('Travis', delay=150)
                await asyncio.sleep(SHORT)
                await page.keyboard.press('Enter')
                await asyncio.sleep(LONG)
                logger.info("Travis County selected")
            else:
                logger.warning("Could not find jurisdiction dropdown")

            await page.screenshot(path=str(OUTPUT_DIR / 'step4_travis.png'))

            # Step 5: Select Project Type = OSSF
            logger.info("Selecting OSSF project type...")
            await asyncio.sleep(MEDIUM)

            # Look for project type dropdown/checkbox
            for selector in ['ng-select[formcontrolname*="project"]', 'ng-select:nth-of-type(3)', 'select[name*="project"]', 'input[value*="OSSF"]', 'label:has-text("OSSF")']:
                elem = await page.query_selector(selector)
                if elem:
                    await elem.click()
                    await asyncio.sleep(SHORT)
                    # Type OSSF if it's a dropdown
                    await page.keyboard.type('OSSF', delay=150)
                    await asyncio.sleep(SHORT)
                    await page.keyboard.press('Enter')
                    await asyncio.sleep(MEDIUM)
                    logger.info("OSSF selected")
                    break

            await page.screenshot(path=str(OUTPUT_DIR / 'step5_ossf.png'))

            # Step 6: Recursive address search
            logger.info("Starting recursive address search...")
            await asyncio.sleep(MEDIUM)

            # Try numeric prefixes first
            for prefix in '123456789':
                await search_prefix(page, prefix, all_records, seen_ids)

                # Save checkpoint every 500 records
                if len(all_records) > 0 and len(all_records) % 500 == 0:
                    checkpoint = OUTPUT_DIR / f'travis_checkpoint_{len(all_records)}.json'
                    with open(checkpoint, 'w') as f:
                        json.dump({
                            'county': 'Travis',
                            'state': 'Texas',
                            'source': 'MGO Connect',
                            'count': len(all_records),
                            'records': all_records
                        }, f)
                    logger.info(f"Checkpoint saved: {checkpoint}")

                await asyncio.sleep(SHORT)

            # Try letter prefixes
            for prefix in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
                await search_prefix(page, prefix, all_records, seen_ids)
                await asyncio.sleep(SHORT)

            await page.screenshot(path=str(OUTPUT_DIR / 'step6_complete.png'))

        except Exception as e:
            logger.error(f"Error: {e}")
            await page.screenshot(path=str(OUTPUT_DIR / 'error.png'))

        finally:
            await browser.close()

    # Save final results
    logger.info("\n" + "=" * 60)
    logger.info("TRAVIS COUNTY MGO SCRAPER COMPLETE")
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
        }, f)

    logger.info(f"Saved to {output_file}")


if __name__ == '__main__':
    asyncio.run(main())
