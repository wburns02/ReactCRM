#!/usr/bin/env python3
"""
MGO Connect Travis County OSSF Scraper v11

Fixed: Use JavaScript to interact with ng-select dropdowns directly.
Previous versions failed because click/type wasn't properly selecting options.
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

OUTPUT_DIR = Path('/root/scrapers/output/texas/travis_mgo_v11')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MGO_SEARCH_URL = "https://www.mgoconnect.org/cp/search"
USERNAME = "willwalterburns@gmail.com"
PASSWORD = "#Espn202512"


async def select_ng_select_option(page, dropdown_index, option_text, screenshot_prefix=None):
    """
    Use JavaScript to interact with ng-select dropdowns.
    """
    logger.info(f"  Selecting '{option_text}' in ng-select[{dropdown_index}]...")

    try:
        # Step 1: Click to open the dropdown using JS
        open_result = await page.evaluate(f"""
            () => {{
                const ngSelects = document.querySelectorAll('ng-select');
                if (ngSelects.length <= {dropdown_index}) {{
                    return 'error: only ' + ngSelects.length + ' ng-selects found';
                }}
                const ngSelect = ngSelects[{dropdown_index}];

                // Find the clickable container
                const container = ngSelect.querySelector('.ng-select-container');
                if (container) {{
                    container.click();
                    return 'clicked container';
                }}

                // Fallback: click ng-select
                ngSelect.click();
                return 'clicked ng-select';
            }}
        """)
        logger.info(f"    Open dropdown: {open_result}")
        await asyncio.sleep(2)

        if screenshot_prefix:
            await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_prefix}_opened.png'))

        # Step 2: Type in the search input
        type_result = await page.evaluate(f"""
            () => {{
                // Find the input inside an open dropdown panel
                const input = document.querySelector('.ng-dropdown-panel input[type="text"]')
                           || document.querySelector('ng-select.ng-select-opened input')
                           || document.querySelector('input.ng-input input');

                if (input) {{
                    input.focus();
                    input.value = '{option_text}';
                    input.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    return 'typed in input';
                }}

                // Fallback: find any visible input
                const inputs = document.querySelectorAll('ng-select input');
                for (const inp of inputs) {{
                    if (inp.offsetParent !== null) {{
                        inp.focus();
                        inp.value = '{option_text}';
                        inp.dispatchEvent(new Event('input', {{ bubbles: true }}));
                        return 'typed in fallback input';
                    }}
                }}

                return 'no input found';
            }}
        """)
        logger.info(f"    Type result: {type_result}")
        await asyncio.sleep(2)

        if screenshot_prefix:
            await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_prefix}_typed.png'))

        # Step 3: Find and click the matching option
        click_result = await page.evaluate(f"""
            () => {{
                const options = document.querySelectorAll('.ng-dropdown-panel .ng-option');
                console.log('Found ' + options.length + ' options');

                for (const opt of options) {{
                    const text = opt.textContent || '';
                    console.log('Option: ' + text);
                    if (text.toLowerCase().includes('{option_text.lower()}')) {{
                        opt.click();
                        return 'clicked: ' + text.trim();
                    }}
                }}

                // If no exact match, click first non-disabled option
                for (const opt of options) {{
                    if (!opt.classList.contains('ng-option-disabled')) {{
                        opt.click();
                        return 'clicked first option: ' + opt.textContent.trim();
                    }}
                }}

                return 'no options to click';
            }}
        """)
        logger.info(f"    Click result: {click_result}")
        await asyncio.sleep(3)

        if screenshot_prefix:
            await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_prefix}_selected.png'))

        # Verify selection
        verify_result = await page.evaluate(f"""
            () => {{
                const ngSelects = document.querySelectorAll('ng-select');
                if (ngSelects.length > {dropdown_index}) {{
                    const selected = ngSelects[{dropdown_index}].querySelector('.ng-value-label, .ng-value span');
                    if (selected) {{
                        return 'selected: ' + selected.textContent.trim();
                    }}
                    return 'no selection visible';
                }}
                return 'ng-select not found';
            }}
        """)
        logger.info(f"    Verify: {verify_result}")

        return 'clicked' in click_result or option_text.lower() in verify_result.lower()

    except Exception as e:
        logger.error(f"    Error: {e}")
        return False


async def extract_table_records(page):
    """Extract records from the search results table."""
    records = []

    try:
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
                except:
                    continue

    except Exception as e:
        logger.warning(f"    Table extraction: {e}")

    return records


async def main():
    logger.info("=" * 60)
    logger.info("MGO CONNECT TRAVIS COUNTY SCRAPER v11")
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

            # Verify we're on search page and count ng-selects
            ng_select_count = await page.evaluate("() => document.querySelectorAll('ng-select').length")
            logger.info(f"  Found {ng_select_count} ng-select elements on page")

            if ng_select_count < 2:
                logger.error("Not enough dropdowns found!")
                await page.screenshot(path=str(OUTPUT_DIR / 'error_no_dropdowns.png'), full_page=True)

                # Debug: Get page structure
                structure = await page.evaluate("""
                    () => {
                        const body = document.body;
                        const selects = body.querySelectorAll('select, ng-select, [class*="dropdown"], [class*="select"]');
                        return Array.from(selects).map(s => ({
                            tag: s.tagName,
                            class: s.className,
                            id: s.id
                        }));
                    }
                """)
                logger.info(f"  Page select elements: {json.dumps(structure, indent=2)}")
                return

            await asyncio.sleep(3)

            # === STEP 1: Select State = Texas ===
            logger.info("STEP 1: Selecting State = Texas")

            state_selected = await select_ng_select_option(page, 0, "Texas", "02_state")

            if not state_selected:
                logger.error("Failed to select Texas!")
                # Try alternative method
                logger.info("  Trying alternative selection method...")

                # Click and use keyboard
                await page.click('ng-select:first-of-type')
                await asyncio.sleep(1)
                await page.keyboard.type('Texas')
                await asyncio.sleep(1)
                await page.keyboard.press('ArrowDown')
                await asyncio.sleep(0.5)
                await page.keyboard.press('Enter')
                await asyncio.sleep(3)

            await page.screenshot(path=str(OUTPUT_DIR / '03_after_state.png'))

            # Wait for jurisdiction dropdown to populate
            logger.info("  Waiting for jurisdictions to load...")
            await page.wait_for_load_state('networkidle', timeout=30000)
            await asyncio.sleep(10)

            # === STEP 2: Select Jurisdiction = Travis County ===
            logger.info("STEP 2: Selecting Jurisdiction = Travis County")

            jurisdiction_selected = await select_ng_select_option(page, 1, "Travis", "04_jurisdiction")

            if not jurisdiction_selected:
                logger.warning("Jurisdiction selection might have failed")

                # Debug: Check what jurisdictions are available
                jurisdictions = await page.evaluate("""
                    () => {
                        const ngSelect = document.querySelectorAll('ng-select')[1];
                        if (!ngSelect) return 'no ng-select[1]';

                        // Click to open
                        const container = ngSelect.querySelector('.ng-select-container');
                        if (container) container.click();

                        return 'clicked to check options';
                    }
                """)
                logger.info(f"    Jurisdictions debug: {jurisdictions}")
                await asyncio.sleep(2)
                await page.screenshot(path=str(OUTPUT_DIR / '04b_jurisdiction_debug.png'))

            await page.screenshot(path=str(OUTPUT_DIR / '05_after_jurisdiction.png'))

            # === STEP 3: Select Project Type = OSSF ===
            logger.info("STEP 3: Selecting Project Type = OSSF")

            type_selected = await select_ng_select_option(page, 2, "OSSF", "06_type")

            if not type_selected:
                logger.warning("Project Type selection might have failed")

            await page.screenshot(path=str(OUTPUT_DIR / '07_after_type.png'))

            # === STEP 4: Extract results ===
            logger.info("STEP 4: Extracting results...")

            await asyncio.sleep(5)
            await page.screenshot(path=str(OUTPUT_DIR / '08_results.png'))

            # Check entries count
            entries_text = await page.evaluate("""
                () => {
                    const el = document.querySelector('*:has-text("Showing")');
                    return el ? el.textContent : 'no entries element';
                }
            """)
            logger.info(f"  Results info: {entries_text}")

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
                next_btn = await page.query_selector('button:has-text(">>"):not([disabled])')
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
