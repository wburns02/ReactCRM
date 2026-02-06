#!/usr/bin/env python3
"""
MGO Connect Travis County OSSF Scraper v6

Uses JavaScript evaluation to directly interact with ng-select dropdowns.
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

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/texas/travis_mgo_v6')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MGO_SEARCH_URL = "https://www.mgoconnect.org/cp/search"
USERNAME = "willwalterburns@gmail.com"
PASSWORD = "#Espn202512"


async def click_and_select_option(page, dropdown_selector, option_text, wait_time=5):
    """Click dropdown and select option using JavaScript and keyboard."""
    logger.info(f"  Selecting '{option_text}'...")

    try:
        # Use JavaScript to click on the dropdown container
        await page.evaluate(f'''
            const dropdown = document.querySelector('{dropdown_selector}');
            if (dropdown) {{
                dropdown.click();
            }}
        ''')
        await asyncio.sleep(2)

        # Type to filter
        await page.keyboard.type(option_text, delay=100)
        await asyncio.sleep(2)

        # Click on first visible option or press Enter
        await page.evaluate('''
            const option = document.querySelector('.ng-dropdown-panel .ng-option');
            if (option) {
                option.click();
            }
        ''')
        await asyncio.sleep(wait_time)

        return True
    except Exception as e:
        logger.error(f"    Selection error: {e}")
        await page.keyboard.press('Escape')
        await asyncio.sleep(1)
        return False


async def main():
    logger.info("=" * 60)
    logger.info("MGO CONNECT TRAVIS COUNTY SCRAPER v6")
    logger.info("=" * 60)

    all_records = []
    seen_ids = set()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=500)  # slow_mo for visibility
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
        )
        page = await context.new_page()

        try:
            # Load page
            logger.info(f"Loading: {MGO_SEARCH_URL}")
            await page.goto(MGO_SEARCH_URL, wait_until='networkidle', timeout=90000)
            await asyncio.sleep(10)
            await page.screenshot(path=str(OUTPUT_DIR / '01_initial.png'))

            # Login
            logger.info("Logging in...")
            await page.fill('input[type="email"]', USERNAME)
            await asyncio.sleep(1)
            await page.fill('input[type="password"]', PASSWORD)
            await asyncio.sleep(1)
            await page.screenshot(path=str(OUTPUT_DIR / '02_credentials.png'))

            # Click Login button
            await page.click('button:has-text("Login")')
            logger.info("  Clicked Login button")

            # Wait for dashboard/search page
            try:
                await page.wait_for_selector('ng-select', timeout=30000)
                logger.info("  Login successful - ng-select found")
            except:
                await asyncio.sleep(15)

            await page.screenshot(path=str(OUTPUT_DIR / '03_logged_in.png'))

            # Click on first ng-select (State) using locator
            logger.info("Selecting State = Texas...")
            state_dropdown = page.locator('ng-select').first
            await state_dropdown.click()
            await asyncio.sleep(2)

            # Type Texas
            await page.keyboard.type('Texas', delay=100)
            await asyncio.sleep(2)

            # Press Enter to select
            await page.keyboard.press('Enter')
            await asyncio.sleep(8)
            await page.screenshot(path=str(OUTPUT_DIR / '04_texas.png'))

            # Click on second ng-select (Jurisdiction)
            logger.info("Selecting Jurisdiction = Travis County...")
            ng_selects = page.locator('ng-select')
            count = await ng_selects.count()
            logger.info(f"  Found {count} ng-select elements")

            if count >= 2:
                await ng_selects.nth(1).click()
                await asyncio.sleep(2)
                await page.keyboard.type('Travis', delay=100)
                await asyncio.sleep(2)
                await page.keyboard.press('Enter')
                await asyncio.sleep(8)
            await page.screenshot(path=str(OUTPUT_DIR / '05_travis.png'))

            # Click on third ng-select (Project Type)
            logger.info("Selecting Project Type = OSSF...")
            if count >= 3:
                await ng_selects.nth(2).click()
                await asyncio.sleep(2)
                await page.keyboard.type('OSSF', delay=100)
                await asyncio.sleep(2)
                await page.keyboard.press('Enter')
                await asyncio.sleep(8)
            await page.screenshot(path=str(OUTPUT_DIR / '06_ossf.png'))

            # Click Search button
            logger.info("Clicking Search...")
            await page.click('button:has-text("Search")')
            await asyncio.sleep(10)
            await page.screenshot(path=str(OUTPUT_DIR / '07_results.png'))

            # Check results count
            results_text = await page.text_content('body')
            if 'Showing' in results_text:
                showing_match = results_text.split('Showing')[1].split('entries')[0] if 'entries' in results_text else ''
                logger.info(f"Results: Showing {showing_match}")

            # Extract data from table
            logger.info("Extracting results...")
            try:
                rows = await page.query_selector_all('table tbody tr')
                logger.info(f"  Found {len(rows)} table rows")

                for row in rows:
                    cells = await row.query_selector_all('td')
                    if len(cells) >= 5:
                        record = {
                            'project_number': (await cells[1].inner_text()).strip() if len(cells) > 1 else '',
                            'project_name': (await cells[2].inner_text()).strip() if len(cells) > 2 else '',
                            'work_type': (await cells[3].inner_text()).strip() if len(cells) > 3 else '',
                            'status': (await cells[4].inner_text()).strip() if len(cells) > 4 else '',
                            'address': (await cells[5].inner_text()).strip() if len(cells) > 5 else '',
                            'county': 'Travis',
                            'state': 'Texas',
                            'source': 'MGO Connect'
                        }
                        if record['project_number']:
                            all_records.append(record)
                            logger.info(f"    {record['project_number']}: {record['address']}")
            except Exception as e:
                logger.error(f"  Extract error: {e}")

            await page.screenshot(path=str(OUTPUT_DIR / '08_final.png'))

        except Exception as e:
            logger.error(f"Error: {e}")
            await page.screenshot(path=str(OUTPUT_DIR / 'error.png'))

        finally:
            await browser.close()

    # Save results
    logger.info("\n" + "=" * 60)
    logger.info(f"TRAVIS COUNTY COMPLETE: {len(all_records):,} records")
    logger.info("=" * 60)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = OUTPUT_DIR / f'travis_ossf_{timestamp}.json'

    with open(output_file, 'w') as f:
        json.dump({
            'county': 'Travis',
            'state': 'Texas',
            'source': 'MGO Connect',
            'count': len(all_records),
            'extracted_at': datetime.now().isoformat(),
            'records': all_records
        }, f, indent=2)

    logger.info(f"Saved: {output_file}")


if __name__ == '__main__':
    asyncio.run(main())
