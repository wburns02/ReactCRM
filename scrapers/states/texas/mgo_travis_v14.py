#!/usr/bin/env python3
"""
MGO Connect Travis County OSSF Scraper v14

Fixed: Try to trigger Angular change detection and fire change events
after dropdown selection. The jurisdiction API might need an explicit event.
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

OUTPUT_DIR = Path('/root/scrapers/output/texas/travis_mgo_v14')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MGO_SEARCH_URL = "https://www.mgoconnect.org/cp/search"
USERNAME = "willwalterburns@gmail.com"
PASSWORD = "#Espn202512"


async def select_primeng_dropdown_with_events(page, dropdown_index, option_text, screenshot_prefix=None):
    """
    Select option from PrimeNG dropdown and trigger Angular change detection.
    """
    logger.info(f"  Selecting '{option_text}' from dropdown #{dropdown_index}...")

    try:
        # Get the dropdown element
        dropdown = page.locator('.p-dropdown').nth(dropdown_index)

        # Click to open
        await dropdown.click()
        await asyncio.sleep(2)

        if screenshot_prefix:
            await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_prefix}_opened.png'))

        # Try filter input
        filter_input = await page.query_selector('.p-dropdown-filter')
        if filter_input:
            await filter_input.fill(option_text)
            await asyncio.sleep(2)

        if screenshot_prefix:
            await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_prefix}_typed.png'))

        # Click the option
        option = page.locator(f'.p-dropdown-item:has-text("{option_text}")').first
        try:
            await option.click(timeout=5000)
            logger.info(f"    Clicked option")
        except:
            await page.keyboard.press('ArrowDown')
            await asyncio.sleep(0.3)
            await page.keyboard.press('Enter')
            logger.info(f"    Used keyboard")

        await asyncio.sleep(2)

        # CRITICAL: Trigger change events via JavaScript
        result = await page.evaluate(f"""
            () => {{
                // Find the p-dropdown component
                const dropdowns = document.querySelectorAll('p-dropdown');
                if (dropdowns.length <= {dropdown_index}) {{
                    // Try with class
                    const divDropdowns = document.querySelectorAll('.p-dropdown');
                    if (divDropdowns.length > {dropdown_index}) {{
                        const dropdown = divDropdowns[{dropdown_index}];

                        // Dispatch input and change events
                        dropdown.dispatchEvent(new Event('input', {{ bubbles: true }}));
                        dropdown.dispatchEvent(new Event('change', {{ bubbles: true }}));
                        dropdown.dispatchEvent(new Event('blur', {{ bubbles: true }}));

                        // Try to find any hidden input
                        const hiddenInput = dropdown.querySelector('input[type="hidden"]');
                        if (hiddenInput) {{
                            hiddenInput.dispatchEvent(new Event('change', {{ bubbles: true }}));
                        }}

                        // Try Angular zone run
                        if (window.ng && window.ng.probe) {{
                            const el = window.ng.probe(dropdown);
                            if (el && el.componentInstance) {{
                                el.componentInstance.onChange({{ value: '{option_text}' }});
                            }}
                        }}

                        return 'events dispatched';
                    }}
                }}
                return 'dropdown not found';
            }}
        """)
        logger.info(f"    Event result: {result}")

        await asyncio.sleep(3)

        if screenshot_prefix:
            await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_prefix}_selected.png'))

        return True

    except Exception as e:
        logger.error(f"    Error: {e}")
        await page.keyboard.press('Escape')
        return False


async def main():
    logger.info("=" * 60)
    logger.info("MGO CONNECT TRAVIS COUNTY SCRAPER v14")
    logger.info("=" * 60)

    all_records = []
    api_calls = []

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

        # Monitor API calls
        async def on_response(response):
            url = response.url
            if 'api' in url.lower() and ('jurisdiction' in url.lower() or 'county' in url.lower() or 'state' in url.lower()):
                try:
                    logger.info(f"  [API] {response.status} {url}")
                    api_calls.append(url)
                except:
                    pass

        page.on('response', on_response)

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

                await asyncio.sleep(20)

            await page.screenshot(path=str(OUTPUT_DIR / '01_after_login.png'))

            # Try clicking on the filter/search area first to focus
            logger.info("Looking for jurisdiction panel...")
            jurisdiction_panel = page.locator('text="Jurisdiction"').first
            if jurisdiction_panel:
                await jurisdiction_panel.click()
                await asyncio.sleep(2)

            # Count dropdowns
            dropdown_count = await page.locator('.p-dropdown').count()
            logger.info(f"  Found {dropdown_count} p-dropdown elements")

            # === STEP 1: Select State = Texas ===
            logger.info("STEP 1: Selecting State = Texas")
            await select_primeng_dropdown_with_events(page, 0, "Texas", "02_state")

            # Get state value
            state_label = await page.locator('.p-dropdown').nth(0).locator('.p-dropdown-label').inner_text()
            logger.info(f"    State shows: '{state_label}'")

            # Try to manually trigger jurisdiction load via API
            logger.info("STEP 1b: Attempting to trigger jurisdiction load...")

            # First, get the state ID for Texas
            texas_id = await page.evaluate("""
                () => {
                    // Look for Texas option or any stored state data
                    const stateDropdown = document.querySelectorAll('.p-dropdown')[0];
                    if (stateDropdown) {
                        // Check for any data attributes
                        return stateDropdown.getAttribute('data-value') ||
                               stateDropdown.querySelector('[aria-selected="true"]')?.getAttribute('data-value') ||
                               'Texas';
                    }
                    return 'Texas';
                }
            """)
            logger.info(f"    Texas identifier: {texas_id}")

            # Wait and check for jurisdiction options multiple times
            for wait_num in range(5):
                await asyncio.sleep(5)

                # Check if jurisdictions loaded
                await page.locator('.p-dropdown').nth(1).click()
                await asyncio.sleep(2)

                options = await page.query_selector_all('.p-dropdown-item')
                no_results = await page.query_selector('text="No results found"')

                logger.info(f"    Check {wait_num + 1}: {len(options)} options, no_results={no_results is not None}")

                if options and len(options) > 0 and not no_results:
                    logger.info("    Jurisdictions loaded!")
                    await page.screenshot(path=str(OUTPUT_DIR / f'03_jurisdictions_loaded.png'))
                    break

                await page.keyboard.press('Escape')

                # Try clicking outside then back
                await page.click('body')
                await asyncio.sleep(1)

            # === STEP 2: Select Jurisdiction ===
            logger.info("STEP 2: Selecting Jurisdiction = Travis County")
            await select_primeng_dropdown_with_events(page, 1, "Travis", "04_jurisdiction")

            jurisdiction_label = await page.locator('.p-dropdown').nth(1).locator('.p-dropdown-label').inner_text()
            logger.info(f"    Jurisdiction shows: '{jurisdiction_label}'")

            # === STEP 3: Select Project Type ===
            logger.info("STEP 3: Selecting Project Type = OSSF")
            await select_primeng_dropdown_with_events(page, 2, "OSSF", "05_type")

            type_label = await page.locator('.p-dropdown').nth(2).locator('.p-dropdown-label').inner_text()
            logger.info(f"    Type shows: '{type_label}'")

            # === STEP 4: Extract ===
            logger.info("STEP 4: Extracting results...")
            await asyncio.sleep(5)
            await page.screenshot(path=str(OUTPUT_DIR / '06_results.png'), full_page=True)

            # Check for results
            page_text = await page.inner_text('body')
            import re
            match = re.search(r'Showing \d+ to \d+ of (\d+) entries', page_text)
            if match:
                logger.info(f"  Found {match.group(1)} entries")

            try:
                await page.wait_for_selector('table tbody tr', timeout=5000)
                rows = await page.query_selector_all('table tbody tr')
                logger.info(f"  Found {len(rows)} rows")

                for row in rows:
                    cells = await row.query_selector_all('td')
                    if len(cells) >= 5:
                        record = {
                            'project_number': (await cells[0].inner_text()).strip(),
                            'address': (await cells[4].inner_text()).strip() if len(cells) > 4 else '',
                            'county': 'Travis',
                            'state': 'TX',
                            '_source': 'MGOConnect'
                        }
                        if record['project_number']:
                            all_records.append(record)

            except Exception as e:
                logger.warning(f"  Table extraction: {e}")

            await page.screenshot(path=str(OUTPUT_DIR / '07_final.png'))

        except Exception as e:
            logger.error(f"Error: {e}")
            await page.screenshot(path=str(OUTPUT_DIR / 'error.png'), full_page=True)
            import traceback
            traceback.print_exc()

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
            'api_calls': api_calls,
            'records': all_records
        }, f, indent=2)

    logger.info("\n" + "=" * 60)
    logger.info(f"COMPLETE: {len(all_records)} records")
    logger.info("=" * 60)
    logger.info(f"Saved: {output_file}")


if __name__ == '__main__':
    asyncio.run(main())
