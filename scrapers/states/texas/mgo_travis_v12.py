#!/usr/bin/env python3
"""
MGO Connect Travis County OSSF Scraper v12

Fixed: Use PrimeNG p-dropdown selectors instead of ng-select.
The page uses PrimeNG components with class 'p-dropdown p-component'.
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

OUTPUT_DIR = Path('/root/scrapers/output/texas/travis_mgo_v12')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MGO_SEARCH_URL = "https://www.mgoconnect.org/cp/search"
USERNAME = "willwalterburns@gmail.com"
PASSWORD = "#Espn202512"


async def select_primeng_dropdown(page, dropdown_id_pattern, option_text, screenshot_prefix=None):
    """
    Select an option from a PrimeNG p-dropdown component.
    """
    logger.info(f"  Selecting '{option_text}' from p-dropdown...")

    try:
        # Find dropdown by ID pattern or index
        dropdown_selector = f'.p-dropdown[id*="{dropdown_id_pattern}"]' if dropdown_id_pattern else '.p-dropdown'

        # Click to open the dropdown
        dropdown = page.locator(dropdown_selector).first
        await dropdown.click()
        await asyncio.sleep(2)

        if screenshot_prefix:
            await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_prefix}_opened.png'))

        # Wait for dropdown panel to appear
        await page.wait_for_selector('.p-dropdown-panel', timeout=5000)

        # Look for filter input if available
        filter_input = await page.query_selector('.p-dropdown-filter')
        if filter_input:
            await filter_input.fill(option_text)
            await asyncio.sleep(1)

        if screenshot_prefix:
            await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_prefix}_typed.png'))

        # Find and click the matching option
        option_selector = f'.p-dropdown-item:has-text("{option_text}")'
        option = page.locator(option_selector).first
        await option.click(timeout=5000)

        logger.info(f"    Selected: {option_text}")
        await asyncio.sleep(2)

        if screenshot_prefix:
            await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_prefix}_selected.png'))

        return True

    except Exception as e:
        logger.error(f"    Error selecting '{option_text}': {e}")
        # Try to close dropdown
        await page.keyboard.press('Escape')
        await asyncio.sleep(1)
        return False


async def select_dropdown_by_label(page, label_text, option_text, screenshot_prefix=None):
    """
    Find a dropdown by its label and select an option.
    Works with any dropdown implementation.
    """
    logger.info(f"  Selecting '{option_text}' from '{label_text}' dropdown...")

    try:
        # Method 1: Find dropdown container by label
        # Look for a div/section containing the label and a dropdown
        container = page.locator(f'div:has(> div:text-is("{label_text}"), > label:text-is("{label_text}"))').first

        # Find dropdown within container
        dropdown = container.locator('.p-dropdown, [class*="dropdown"]').first

        if not dropdown:
            # Method 2: Find by adjacent text
            dropdown = page.locator(f'{label_text} + .p-dropdown, {label_text} ~ .p-dropdown').first

        # Click to open
        await dropdown.click()
        await asyncio.sleep(2)

        if screenshot_prefix:
            await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_prefix}_opened.png'))

        # Check for dropdown panel
        panel = await page.query_selector('.p-dropdown-panel, .p-overlay-panel')
        if not panel:
            logger.warning("    Dropdown panel not visible")

        # Look for filter input
        filter_input = await page.query_selector('.p-dropdown-filter, input[role="textbox"]')
        if filter_input:
            await filter_input.fill(option_text)
            await asyncio.sleep(1)

        if screenshot_prefix:
            await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_prefix}_typed.png'))

        # Find and click the option
        option = page.locator(f'.p-dropdown-item:has-text("{option_text}"), li:has-text("{option_text}")').first
        await option.click(timeout=5000)

        logger.info(f"    Selected: {option_text}")
        await asyncio.sleep(2)

        if screenshot_prefix:
            await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_prefix}_selected.png'))

        return True

    except Exception as e:
        logger.error(f"    Error: {e}")
        await page.keyboard.press('Escape')
        return False


async def click_dropdown_at_index(page, index, option_text, screenshot_prefix=None):
    """
    Click the nth p-dropdown on the page and select an option.
    """
    logger.info(f"  Selecting '{option_text}' from dropdown #{index}...")

    try:
        # Get all p-dropdowns
        dropdowns = page.locator('.p-dropdown')
        count = await dropdowns.count()
        logger.info(f"    Found {count} p-dropdown elements")

        if count <= index:
            logger.error(f"    Only {count} dropdowns, can't access index {index}")
            return False

        # Click the dropdown at index
        dropdown = dropdowns.nth(index)
        await dropdown.click()
        await asyncio.sleep(2)

        if screenshot_prefix:
            await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_prefix}_opened.png'))

        # Wait for panel
        try:
            await page.wait_for_selector('.p-dropdown-panel', timeout=5000)
        except:
            logger.warning("    No dropdown panel appeared")

        # Try filter input
        filter_input = await page.query_selector('.p-dropdown-filter')
        if filter_input:
            await filter_input.fill(option_text)
            await asyncio.sleep(1)
        else:
            # Type directly
            await page.keyboard.type(option_text)
            await asyncio.sleep(1)

        if screenshot_prefix:
            await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_prefix}_typed.png'))

        # Click option
        option = page.locator(f'.p-dropdown-item:has-text("{option_text}")').first
        try:
            await option.click(timeout=5000)
            logger.info(f"    Clicked option")
        except:
            # Fallback: press Enter
            await page.keyboard.press('ArrowDown')
            await asyncio.sleep(0.3)
            await page.keyboard.press('Enter')
            logger.info(f"    Used keyboard to select")

        await asyncio.sleep(2)

        if screenshot_prefix:
            await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_prefix}_selected.png'))

        return True

    except Exception as e:
        logger.error(f"    Error: {e}")
        await page.keyboard.press('Escape')
        return False


async def extract_table_records(page):
    """Extract records from the search results table."""
    records = []

    try:
        await page.wait_for_selector('table tbody tr, .p-datatable-tbody tr', timeout=5000)

        rows = await page.query_selector_all('table tbody tr, .p-datatable-tbody tr')
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
                except:
                    continue

    except Exception as e:
        logger.warning(f"    Table extraction: {e}")

    return records


async def main():
    logger.info("=" * 60)
    logger.info("MGO CONNECT TRAVIS COUNTY SCRAPER v12")
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

            # Count dropdowns
            dropdown_count = await page.locator('.p-dropdown').count()
            logger.info(f"  Found {dropdown_count} p-dropdown elements")

            # Debug: Get dropdown structure
            dropdown_info = await page.evaluate("""
                () => {
                    const dropdowns = document.querySelectorAll('.p-dropdown');
                    return Array.from(dropdowns).map((d, i) => ({
                        index: i,
                        id: d.id,
                        label: d.querySelector('.p-dropdown-label')?.textContent || 'no label'
                    }));
                }
            """)
            logger.info(f"  Dropdown info: {json.dumps(dropdown_info, indent=2)}")

            await asyncio.sleep(3)

            # === STEP 1: Select State = Texas ===
            logger.info("STEP 1: Selecting State = Texas (dropdown 0)")

            state_selected = await click_dropdown_at_index(page, 0, "Texas", "02_state")

            if not state_selected:
                logger.error("Failed to select Texas!")

            await page.screenshot(path=str(OUTPUT_DIR / '03_after_state.png'))

            # Verify state selection
            state_value = await page.evaluate("""
                () => {
                    const dropdowns = document.querySelectorAll('.p-dropdown');
                    if (dropdowns[0]) {
                        const label = dropdowns[0].querySelector('.p-dropdown-label');
                        return label ? label.textContent : 'no label';
                    }
                    return 'no dropdown';
                }
            """)
            logger.info(f"  State dropdown now shows: {state_value}")

            # Wait for jurisdictions to load
            logger.info("  Waiting for jurisdictions to load...")
            await page.wait_for_load_state('networkidle')
            await asyncio.sleep(10)

            # === STEP 2: Select Jurisdiction = Travis County ===
            logger.info("STEP 2: Selecting Jurisdiction = Travis County (dropdown 1)")

            jurisdiction_selected = await click_dropdown_at_index(page, 1, "Travis", "04_jurisdiction")

            if not jurisdiction_selected:
                logger.warning("Jurisdiction selection may have failed")

            await page.screenshot(path=str(OUTPUT_DIR / '05_after_jurisdiction.png'))

            # === STEP 3: Select Project Type = OSSF ===
            logger.info("STEP 3: Selecting Project Type = OSSF (dropdown 2)")

            type_selected = await click_dropdown_at_index(page, 2, "OSSF", "06_type")

            if not type_selected:
                logger.warning("Project Type selection may have failed")

            await page.screenshot(path=str(OUTPUT_DIR / '07_after_type.png'))

            # === STEP 4: Extract results ===
            logger.info("STEP 4: Extracting results...")

            await asyncio.sleep(5)
            await page.screenshot(path=str(OUTPUT_DIR / '08_results.png'))

            # Check entries count
            entries = await page.query_selector('text=/Showing \\d+ to \\d+ of \\d+ entries/')
            if entries:
                entries_text = await entries.inner_text()
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
                        # Try clicking search button
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
                next_btn = await page.query_selector('button:has-text(">>"):not([disabled]), .p-paginator-next:not(.p-disabled)')
                if next_btn:
                    await next_btn.click()
                    await asyncio.sleep(3)
                    page_num += 1
                else:
                    break

                if page_num > 1000:
                    break

                if page_num % 20 == 0:
                    checkpoint_file = OUTPUT_DIR / f'checkpoint_p{page_num}.json'
                    with open(checkpoint_file, 'w') as f:
                        json.dump({'count': len(all_records), 'page': page_num}, f)

            await page.screenshot(path=str(OUTPUT_DIR / '09_final.png'))

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
