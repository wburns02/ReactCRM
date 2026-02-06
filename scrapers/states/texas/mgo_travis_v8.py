#!/usr/bin/env python3
"""
MGO Connect Travis County OSSF Scraper v8

Fixed for headless mode with better ng-select handling.
Uses JavaScript evaluation to interact with Angular dropdowns.
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

OUTPUT_DIR = Path('/root/scrapers/output/texas/travis_mgo_v8')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MGO_SEARCH_URL = "https://www.mgoconnect.org/cp/search"
USERNAME = "willwalterburns@gmail.com"
PASSWORD = "#Espn202512"


async def wait_for_angular(page):
    """Wait for Angular to finish loading."""
    try:
        await page.evaluate("""
            async () => {
                if (window.getAllAngularRootElements) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        """)
    except:
        pass
    await asyncio.sleep(2)


async def click_dropdown_js(page, dropdown_index, search_text, option_text=None):
    """Use JavaScript to interact with ng-select dropdowns."""
    logger.info(f"  Selecting '{search_text}' in dropdown {dropdown_index}...")

    try:
        # First try clicking the dropdown container
        result = await page.evaluate(f"""
            () => {{
                const ngSelects = document.querySelectorAll('ng-select');
                if (ngSelects.length > {dropdown_index}) {{
                    const ngSelect = ngSelects[{dropdown_index}];
                    // Try clicking the main container
                    const container = ngSelect.querySelector('.ng-select-container');
                    if (container) {{
                        container.click();
                        return 'clicked container';
                    }}
                    // Fallback: click the ng-select itself
                    ngSelect.click();
                    return 'clicked ng-select';
                }}
                return 'not found';
            }}
        """)
        logger.info(f"    JS click result: {result}")
        await asyncio.sleep(2)

        # Take screenshot
        await page.screenshot(path=str(OUTPUT_DIR / f'dropdown_{dropdown_index}_opened.png'))

        # Now type in the search input
        search_input = await page.query_selector('ng-select.ng-select-opened input, .ng-dropdown-panel input[type="text"], ng-select:focus-within input')

        if search_input:
            await search_input.fill(search_text)
            await asyncio.sleep(2)
        else:
            # Try keyboard typing instead
            await page.keyboard.type(search_text, delay=100)
            await asyncio.sleep(2)

        await page.screenshot(path=str(OUTPUT_DIR / f'dropdown_{dropdown_index}_typed.png'))

        # Click the matching option
        target = option_text or search_text
        option_clicked = await page.evaluate(f"""
            () => {{
                const options = document.querySelectorAll('.ng-option, .ng-dropdown-panel-items .ng-option');
                for (const opt of options) {{
                    if (opt.textContent.includes('{target}')) {{
                        opt.click();
                        return 'clicked: ' + opt.textContent.trim();
                    }}
                }}
                // Try finding any visible option
                const visibleOpts = Array.from(options).filter(o => o.offsetParent !== null);
                if (visibleOpts.length > 0) {{
                    visibleOpts[0].click();
                    return 'clicked first visible: ' + visibleOpts[0].textContent.trim();
                }}
                return 'no options found';
            }}
        """)
        logger.info(f"    Option click: {option_clicked}")
        await asyncio.sleep(3)

        await page.screenshot(path=str(OUTPUT_DIR / f'dropdown_{dropdown_index}_selected.png'))
        return 'clicked' in option_clicked

    except Exception as e:
        logger.error(f"    Error interacting with dropdown: {e}")
        return False


async def extract_table_data(page):
    """Extract data from the permits table."""
    records = []

    try:
        # Wait for table
        await page.wait_for_selector('table tbody tr, .mat-table .mat-row', timeout=10000)

        rows = await page.query_selector_all('table tbody tr, .mat-table .mat-row')
        logger.info(f"    Found {len(rows)} rows")

        for row in rows:
            cells = await row.query_selector_all('td, .mat-cell')
            if len(cells) >= 3:
                try:
                    record = {
                        'permit_number': await cells[0].inner_text() if len(cells) > 0 else '',
                        'project_name': await cells[1].inner_text() if len(cells) > 1 else '',
                        'address': await cells[2].inner_text() if len(cells) > 2 else '',
                        'city': await cells[3].inner_text() if len(cells) > 3 else '',
                        'status': await cells[4].inner_text() if len(cells) > 4 else '',
                        'county': 'Travis',
                        'state': 'TX',
                        '_source': 'MGOConnect'
                    }
                    if record['permit_number']:
                        records.append(record)
                except:
                    continue

    except Exception as e:
        logger.warning(f"    Table extraction error: {e}")

    return records


async def main():
    logger.info("=" * 60)
    logger.info("MGO CONNECT TRAVIS COUNTY SCRAPER v8")
    logger.info("=" * 60)

    all_records = []

    async with async_playwright() as p:
        # Launch with extra args for better headless compatibility
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        )
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = await context.new_page()

        try:
            # Load page
            logger.info(f"Loading: {MGO_SEARCH_URL}")
            await page.goto(MGO_SEARCH_URL, wait_until='networkidle', timeout=120000)
            await asyncio.sleep(15)
            await page.screenshot(path=str(OUTPUT_DIR / '00_initial.png'))

            # Check if we need to log in
            login_form = await page.query_selector('input[type="email"], input[type="password"]')
            if login_form:
                logger.info("Logging in...")
                await page.fill('input[type="email"]', USERNAME)
                await asyncio.sleep(1)
                await page.fill('input[type="password"]', PASSWORD)
                await asyncio.sleep(1)

                # Try multiple login button selectors
                login_clicked = False
                for selector in ['button:has-text("Login")', 'button[type="submit"]', 'button:has-text("Sign")', 'input[type="submit"]']:
                    try:
                        btn = await page.query_selector(selector)
                        if btn:
                            await btn.click()
                            login_clicked = True
                            break
                    except:
                        continue

                if not login_clicked:
                    await page.keyboard.press('Enter')

                # Wait for navigation
                await asyncio.sleep(25)

            await page.screenshot(path=str(OUTPUT_DIR / '01_after_login.png'))

            # Check current URL
            current_url = page.url
            logger.info(f"Current URL: {current_url}")

            # Wait for Angular to load
            await wait_for_angular(page)

            # Try to find any visible dropdowns
            page_html = await page.content()
            ng_select_count = page_html.count('ng-select')
            logger.info(f"Found {ng_select_count} ng-select in page HTML")

            # Take full page screenshot
            await page.screenshot(path=str(OUTPUT_DIR / '02_full_page.png'), full_page=True)

            # Wait for ng-select to appear with longer timeout
            try:
                await page.wait_for_selector('ng-select', state='attached', timeout=60000)
                logger.info("ng-select elements found")
            except:
                logger.error("ng-select not found after 60s")
                # Maybe we need to navigate somewhere first?
                # Try clicking on search link if visible
                search_link = await page.query_selector('a:has-text("Search"), a[routerlink*="search"]')
                if search_link:
                    await search_link.click()
                    await asyncio.sleep(10)
                    await page.wait_for_selector('ng-select', timeout=30000)

            await asyncio.sleep(5)
            await page.screenshot(path=str(OUTPUT_DIR / '03_before_dropdown.png'))

            # Get dropdown count
            ng_selects = await page.query_selector_all('ng-select')
            logger.info(f"Found {len(ng_selects)} ng-select elements")

            if len(ng_selects) < 2:
                logger.error("Not enough dropdowns found")
                await page.screenshot(path=str(OUTPUT_DIR / 'error_no_dropdowns.png'), full_page=True)
                return

            # Select State = Texas
            logger.info("Selecting State = Texas...")
            if not await click_dropdown_js(page, 0, "Texas"):
                logger.warning("Failed to select Texas, trying alternate method...")
                # Try clicking directly
                await ng_selects[0].click()
                await asyncio.sleep(2)
                await page.keyboard.type("Texas", delay=100)
                await asyncio.sleep(2)
                await page.keyboard.press("Enter")
                await asyncio.sleep(3)

            await asyncio.sleep(8)
            await page.screenshot(path=str(OUTPUT_DIR / '04_state_selected.png'))

            # Wait for jurisdiction dropdown to populate
            await asyncio.sleep(5)

            # Refresh ng-selects list
            ng_selects = await page.query_selector_all('ng-select')
            logger.info(f"After state: {len(ng_selects)} ng-select elements")

            # Select Jurisdiction Type = County (if visible)
            # Then select Travis County
            logger.info("Selecting Jurisdiction = Travis County...")
            if len(ng_selects) >= 2:
                if not await click_dropdown_js(page, 1, "Travis", "Travis County"):
                    await ng_selects[1].click()
                    await asyncio.sleep(2)
                    await page.keyboard.type("Travis", delay=100)
                    await asyncio.sleep(2)
                    await page.keyboard.press("Enter")

            await asyncio.sleep(8)
            await page.screenshot(path=str(OUTPUT_DIR / '05_jurisdiction_selected.png'))

            # Click Continue button
            logger.info("Looking for Continue button...")
            continue_clicked = False
            for selector in ['button:has-text("Continue")', 'button:has-text("Next")', 'button.btn-primary']:
                try:
                    btn = await page.query_selector(selector)
                    if btn:
                        await btn.click()
                        continue_clicked = True
                        logger.info(f"  Clicked Continue with: {selector}")
                        break
                except:
                    continue

            if continue_clicked:
                await asyncio.sleep(10)

            await page.screenshot(path=str(OUTPUT_DIR / '06_after_continue.png'))

            # Look for Search Permits option
            logger.info("Looking for Search Permits...")
            search_permits = await page.query_selector('button:has-text("Search Permits"), a:has-text("Search Permits"), *:has-text("Search Permits")')
            if search_permits:
                await search_permits.click()
                await asyncio.sleep(8)

            await page.screenshot(path=str(OUTPUT_DIR / '07_search_page.png'))

            # Find date inputs and set date range
            logger.info("Setting date range...")
            date_inputs = await page.query_selector_all('input[type="date"], input[placeholder*="date" i], input.datepicker')
            if len(date_inputs) >= 2:
                # Start date: 1/1/2000
                await date_inputs[0].fill('01/01/2000')
                await asyncio.sleep(1)
                # End date: today
                today = datetime.now().strftime('%m/%d/%Y')
                await date_inputs[1].fill(today)
                await asyncio.sleep(1)

            # Find project name/type field and enter search term
            logger.info("Entering search criteria: OSSF...")
            project_input = await page.query_selector('input[placeholder*="project" i], input[name*="project" i], input#projectName')
            if project_input:
                await project_input.fill('OSSF')
                await asyncio.sleep(1)

            # Click Search button
            logger.info("Clicking Search...")
            search_btn = await page.query_selector('button:has-text("Search"), input[value="Search"]')
            if search_btn:
                await search_btn.click()
                await asyncio.sleep(10)

            await page.screenshot(path=str(OUTPUT_DIR / '08_search_results.png'))

            # Extract data from results table
            page_num = 1
            while True:
                logger.info(f"  Extracting page {page_num}...")
                records = await extract_table_data(page)

                if records:
                    all_records.extend(records)
                    logger.info(f"    Found {len(records)} records (Total: {len(all_records)})")
                else:
                    logger.info("    No records on this page")
                    break

                # Look for next page
                next_btn = await page.query_selector('button:has-text("Next"), a:has-text("Next"), .pagination-next:not(.disabled)')
                if next_btn:
                    is_disabled = await next_btn.get_attribute('disabled')
                    if is_disabled:
                        break
                    await next_btn.click()
                    await asyncio.sleep(3)
                    page_num += 1
                else:
                    break

                # Save checkpoint every 10 pages
                if page_num % 10 == 0:
                    checkpoint = OUTPUT_DIR / f'checkpoint_page_{page_num}.json'
                    with open(checkpoint, 'w') as f:
                        json.dump({'count': len(all_records), 'page': page_num, 'records': all_records[-100:]}, f)

            await page.screenshot(path=str(OUTPUT_DIR / '09_final.png'))

        except Exception as e:
            logger.error(f"Error: {e}")
            await page.screenshot(path=str(OUTPUT_DIR / 'error_final.png'), full_page=True)

        finally:
            await browser.close()

    # Save results
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = OUTPUT_DIR / f'travis_ossf_{timestamp}.json'

    with open(output_file, 'w') as f:
        json.dump({
            'county': 'Travis',
            'state': 'Texas',
            'count': len(all_records),
            'extracted_at': datetime.now().isoformat(),
            'records': all_records
        }, f)

    logger.info("\n" + "=" * 60)
    logger.info(f"COMPLETE: {len(all_records)} records")
    logger.info("=" * 60)
    logger.info(f"Saved: {output_file}")


if __name__ == '__main__':
    asyncio.run(main())
