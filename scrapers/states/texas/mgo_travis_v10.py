#!/usr/bin/env python3
"""
MGO Connect Travis County OSSF Scraper v10

Fixed: Wait for jurisdiction options to load after state selection.
The jurisdiction dropdown shows "No results found" because we click it
before the API returns the jurisdiction list.
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

OUTPUT_DIR = Path('/root/scrapers/output/texas/travis_mgo_v10')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MGO_SEARCH_URL = "https://www.mgoconnect.org/cp/search"
USERNAME = "willwalterburns@gmail.com"
PASSWORD = "#Espn202512"


async def wait_for_dropdown_options(page, dropdown_selector, timeout=30000):
    """Wait for dropdown to have options loaded."""
    logger.info(f"  Waiting for dropdown options to load...")

    start_time = asyncio.get_event_loop().time()
    while (asyncio.get_event_loop().time() - start_time) * 1000 < timeout:
        # Click the dropdown
        try:
            dropdown = page.locator(dropdown_selector).first
            await dropdown.click()
            await asyncio.sleep(1)

            # Check if there are options (not "No results found")
            options = await page.query_selector_all('.ng-option:not(.ng-option-disabled), div[role="option"]')
            no_results = await page.query_selector('text="No results found"')

            if options and len(options) > 0 and not no_results:
                logger.info(f"    Found {len(options)} options")
                # Close dropdown by pressing Escape
                await page.keyboard.press('Escape')
                await asyncio.sleep(0.5)
                return True

            # Close and wait
            await page.keyboard.press('Escape')
            await asyncio.sleep(2)

        except Exception as e:
            logger.warning(f"    Waiting... ({e})")
            await asyncio.sleep(2)

    logger.warning("    Timeout waiting for options")
    return False


async def select_dropdown_with_retry(page, dropdown_text, search_text, screenshot_prefix=None, max_retries=5):
    """Click dropdown, type to search, and select option with retries."""
    logger.info(f"  Selecting '{search_text}' from dropdown '{dropdown_text}'...")

    for attempt in range(max_retries):
        try:
            # Find and click the dropdown
            dropdown = page.locator(f'text="{dropdown_text}"').first
            await dropdown.click()
            await asyncio.sleep(2)

            if screenshot_prefix:
                await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_prefix}_opened_a{attempt}.png'))

            # Check for search input inside dropdown panel
            search_input = await page.query_selector('.ng-dropdown-panel input, input[role="combobox"]')

            if search_input:
                await search_input.fill(search_text)
            else:
                # Type directly
                await page.keyboard.type(search_text, delay=100)

            await asyncio.sleep(2)

            if screenshot_prefix:
                await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_prefix}_typed_a{attempt}.png'))

            # Look for matching option
            options = await page.query_selector_all('.ng-option, div[role="option"]')
            logger.info(f"    Attempt {attempt+1}: Found {len(options)} dropdown options")

            # Check if we have "No results found"
            page_text = await page.inner_text('body')
            if 'No results found' in page_text and len(options) <= 1:
                logger.warning(f"    No results found, retrying in 5s...")
                await page.keyboard.press('Escape')
                await asyncio.sleep(5)
                continue

            # Try to click the matching option
            for opt in options:
                opt_text = await opt.inner_text()
                if search_text.lower() in opt_text.lower():
                    await opt.click()
                    logger.info(f"    Selected: {opt_text.strip()}")
                    await asyncio.sleep(3)

                    if screenshot_prefix:
                        await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_prefix}_selected_a{attempt}.png'))
                    return True

            # If no exact match, try clicking first non-disabled option
            for opt in options:
                opt_class = await opt.get_attribute('class') or ''
                if 'disabled' not in opt_class and 'no-results' not in opt_class:
                    opt_text = await opt.inner_text()
                    if opt_text.strip() and 'No results' not in opt_text:
                        await opt.click()
                        logger.info(f"    Selected first option: {opt_text.strip()}")
                        await asyncio.sleep(3)
                        return True

            # Fallback: press Enter
            await page.keyboard.press('Enter')
            await asyncio.sleep(2)

            # Check if selection was made
            dropdown_value = await page.locator(f'text="{dropdown_text}"').first.inner_text()
            if dropdown_text not in dropdown_value or search_text in dropdown_value:
                return True

            await page.keyboard.press('Escape')
            await asyncio.sleep(3)

        except Exception as e:
            logger.error(f"    Attempt {attempt+1} error: {e}")
            try:
                await page.keyboard.press('Escape')
            except:
                pass
            await asyncio.sleep(3)

    return False


async def extract_table_records(page):
    """Extract records from the search results table."""
    records = []

    try:
        # Wait for table to have data
        await page.wait_for_selector('table tbody tr', timeout=5000)

        rows = await page.query_selector_all('table tbody tr')
        logger.info(f"    Found {len(rows)} table rows")

        for row in rows:
            cells = await row.query_selector_all('td')
            if len(cells) >= 5:
                try:
                    record = {
                        'project_number': (await cells[0].inner_text()).strip() if len(cells) > 0 else '',
                        'project_name': (await cells[1].inner_text()).strip() if len(cells) > 1 else '',
                        'work_type': (await cells[2].inner_text()).strip() if len(cells) > 2 else '',
                        'status': (await cells[3].inner_text()).strip() if len(cells) > 3 else '',
                        'address': (await cells[4].inner_text()).strip() if len(cells) > 4 else '',
                        'unit': (await cells[5].inner_text()).strip() if len(cells) > 5 else '',
                        'designation': (await cells[6].inner_text()).strip() if len(cells) > 6 else '',
                        'created_date': (await cells[7].inner_text()).strip() if len(cells) > 7 else '',
                        'county': 'Travis',
                        'state': 'TX',
                        '_source': 'MGOConnect'
                    }
                    if record['project_number'] and record['project_number'] != 'Project Number':
                        records.append(record)
                except Exception as e:
                    continue

    except Exception as e:
        logger.warning(f"    Table extraction: {e}")

    return records


async def main():
    logger.info("=" * 60)
    logger.info("MGO CONNECT TRAVIS COUNTY SCRAPER v10")
    logger.info("=" * 60)

    all_records = []
    seen_ids = set()

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        )
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
        )
        page = await context.new_page()

        # Enable request logging to see API calls
        async def log_request(request):
            if 'jurisdiction' in request.url.lower() or 'county' in request.url.lower():
                logger.info(f"  [API] {request.method} {request.url}")

        page.on('request', log_request)

        try:
            # Load search page
            logger.info(f"Loading: {MGO_SEARCH_URL}")
            await page.goto(MGO_SEARCH_URL, wait_until='networkidle', timeout=120000)
            await asyncio.sleep(10)

            # Check if login needed
            if await page.query_selector('input[type="email"]'):
                logger.info("Logging in...")
                await page.fill('input[type="email"]', USERNAME)
                await page.fill('input[type="password"]', PASSWORD)

                login_btn = await page.query_selector('button:has-text("Login"), button[type="submit"]')
                if login_btn:
                    await login_btn.click()
                else:
                    await page.keyboard.press('Enter')

                await asyncio.sleep(15)

            await page.screenshot(path=str(OUTPUT_DIR / '01_after_login.png'))
            logger.info(f"  Current URL: {page.url}")

            # Verify we're on search page
            page_text = await page.inner_text('body')
            if 'Select a State' not in page_text and 'State' not in page_text:
                logger.error("Search page not loaded correctly")
                await page.screenshot(path=str(OUTPUT_DIR / 'error_wrong_page.png'), full_page=True)
                return

            logger.info("Search page loaded successfully")
            await asyncio.sleep(3)

            # === STEP 1: Select State = Texas ===
            logger.info("STEP 1: Selecting State = Texas")

            # Click the State dropdown
            state_dropdown = page.locator('div:has-text("Select a State")').first
            await state_dropdown.click()
            await asyncio.sleep(2)
            await page.screenshot(path=str(OUTPUT_DIR / '02_state_dropdown.png'))

            # Type Texas
            await page.keyboard.type('Texas', delay=100)
            await asyncio.sleep(2)
            await page.screenshot(path=str(OUTPUT_DIR / '03_state_typed.png'))

            # Click the Texas option
            texas_option = page.locator('.ng-option:has-text("Texas")').first
            try:
                await texas_option.click(timeout=5000)
            except:
                await page.keyboard.press('Enter')

            await asyncio.sleep(3)
            await page.screenshot(path=str(OUTPUT_DIR / '04_state_selected.png'))

            # === CRITICAL: Wait for jurisdictions to load ===
            logger.info("STEP 1b: Waiting for jurisdictions to load after state selection...")

            # Wait for network requests to complete
            await page.wait_for_load_state('networkidle', timeout=30000)
            await asyncio.sleep(10)  # Extra wait for Angular to process

            await page.screenshot(path=str(OUTPUT_DIR / '05_after_state_wait.png'))

            # === STEP 2: Select Jurisdiction = Travis County ===
            logger.info("STEP 2: Selecting Jurisdiction = Travis County")

            # Try multiple times to get jurisdiction options
            jurisdiction_selected = False
            for attempt in range(5):
                logger.info(f"  Jurisdiction attempt {attempt + 1}...")

                # Click the Jurisdiction dropdown
                jurisdiction_dropdown = page.locator('div:has-text("Select a Jurisdiction")').first
                await jurisdiction_dropdown.click()
                await asyncio.sleep(3)
                await page.screenshot(path=str(OUTPUT_DIR / f'06_jurisdiction_dropdown_a{attempt}.png'))

                # Check what options are available
                options = await page.query_selector_all('.ng-option')
                no_results = await page.query_selector('.ng-option:has-text("No results")')

                logger.info(f"    Found {len(options)} options, no_results={no_results is not None}")

                if no_results or len(options) == 0:
                    logger.info("    No jurisdictions loaded yet, waiting...")
                    await page.keyboard.press('Escape')
                    await asyncio.sleep(5)
                    continue

                # Type Travis to filter
                await page.keyboard.type('Travis', delay=100)
                await asyncio.sleep(2)
                await page.screenshot(path=str(OUTPUT_DIR / f'07_jurisdiction_typed_a{attempt}.png'))

                # Try to click Travis County option
                travis_option = page.locator('.ng-option:has-text("Travis")').first
                try:
                    await travis_option.click(timeout=5000)
                    logger.info("    Clicked Travis County")
                    jurisdiction_selected = True
                    break
                except:
                    await page.keyboard.press('Enter')
                    jurisdiction_selected = True
                    break

            await asyncio.sleep(5)
            await page.screenshot(path=str(OUTPUT_DIR / '08_jurisdiction_selected.png'))

            if not jurisdiction_selected:
                logger.error("Failed to select jurisdiction after 5 attempts")

                # Debug: Log all dropdown values
                logger.info("Debug: Checking page state...")
                dropdowns = await page.query_selector_all('ng-select, [class*="dropdown"], [class*="select"]')
                logger.info(f"  Found {len(dropdowns)} dropdown elements")

                # Try clicking "Click here for advanced reporting" to see if that helps
                advanced_link = await page.query_selector('text="Click here for advanced reporting"')
                if advanced_link:
                    logger.info("  Found advanced reporting link, trying that...")
                    await advanced_link.click()
                    await asyncio.sleep(5)
                    await page.screenshot(path=str(OUTPUT_DIR / '08b_advanced_reporting.png'))

            # === STEP 3: Select Project Type = OSSF ===
            logger.info("STEP 3: Selecting Project Type = OSSF")

            # Click Project Type dropdown
            type_dropdown = page.locator('div:has-text("Select Type")').first
            await type_dropdown.click()
            await asyncio.sleep(2)
            await page.screenshot(path=str(OUTPUT_DIR / '09_type_dropdown.png'))

            # Type OSSF
            await page.keyboard.type('OSSF', delay=100)
            await asyncio.sleep(2)
            await page.screenshot(path=str(OUTPUT_DIR / '10_type_typed.png'))

            # Select OSSF option
            ossf_option = page.locator('.ng-option:has-text("OSSF")').first
            try:
                await ossf_option.click(timeout=5000)
            except:
                await page.keyboard.press('Enter')

            await asyncio.sleep(5)
            await page.screenshot(path=str(OUTPUT_DIR / '11_type_selected.png'))

            # === STEP 4: Extract results ===
            logger.info("STEP 4: Extracting results...")

            # Wait for table to populate
            await asyncio.sleep(5)
            await page.screenshot(path=str(OUTPUT_DIR / '12_results.png'))

            # Check entries count
            entries_element = await page.query_selector('text=/Showing \\d+ to \\d+ of \\d+ entries/')
            if entries_element:
                entries_text = await entries_element.inner_text()
                logger.info(f"  Results: {entries_text}")

            # Paginate through results
            page_num = 1
            while True:
                logger.info(f"  Processing page {page_num}...")

                records = await extract_table_records(page)

                if records:
                    for rec in records:
                        uid = f"{rec['project_number']}_{rec['address']}"
                        if uid not in seen_ids:
                            seen_ids.add(uid)
                            all_records.append(rec)

                    logger.info(f"    Page {page_num}: {len(records)} records (Total unique: {len(all_records)})")
                else:
                    logger.info(f"    No records on page {page_num}")
                    if page_num == 1:
                        # First page no results - check if we need to click search
                        search_btn = await page.query_selector('button:has-text("Search")')
                        if search_btn:
                            await search_btn.click()
                            await asyncio.sleep(5)
                            records = await extract_table_records(page)
                            for rec in records:
                                uid = f"{rec['project_number']}_{rec['address']}"
                                if uid not in seen_ids:
                                    seen_ids.add(uid)
                                    all_records.append(rec)
                    break

                # Try to go to next page
                next_btn = await page.query_selector('button:has-text(">>"):not([disabled])')
                if next_btn:
                    await next_btn.click()
                    await asyncio.sleep(3)
                    page_num += 1
                else:
                    break

                # Safety: stop after 1000 pages
                if page_num > 1000:
                    break

                # Checkpoint every 20 pages
                if page_num % 20 == 0:
                    checkpoint_file = OUTPUT_DIR / f'checkpoint_p{page_num}.json'
                    with open(checkpoint_file, 'w') as f:
                        json.dump({'count': len(all_records), 'page': page_num}, f)
                    logger.info(f"    Checkpoint saved at page {page_num}")

            await page.screenshot(path=str(OUTPUT_DIR / '13_final.png'))

        except Exception as e:
            logger.error(f"Error: {e}")
            await page.screenshot(path=str(OUTPUT_DIR / 'error_exception.png'), full_page=True)
            import traceback
            traceback.print_exc()

        finally:
            await browser.close()

    # Save final results
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = OUTPUT_DIR / f'travis_ossf_{timestamp}.json'

    with open(output_file, 'w') as f:
        json.dump({
            'county': 'Travis',
            'state': 'Texas',
            'count': len(all_records),
            'extracted_at': datetime.now().isoformat(),
            'records': all_records
        }, f, indent=2)

    logger.info("\n" + "=" * 60)
    logger.info(f"COMPLETE: {len(all_records)} unique records")
    logger.info("=" * 60)
    logger.info(f"Saved: {output_file}")

    return all_records


if __name__ == '__main__':
    asyncio.run(main())
