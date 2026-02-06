#!/usr/bin/env python3
"""
MGO Connect Travis County OSSF Scraper v7

Uses bounding box clicks and explicit mouse movements for ng-select.
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

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/texas/travis_mgo_v7')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MGO_SEARCH_URL = "https://www.mgoconnect.org/cp/search"
USERNAME = "willwalterburns@gmail.com"
PASSWORD = "#Espn202512"


async def click_ng_select_and_type(page, index, search_text):
    """Click on ng-select using bounding box and type to search."""
    logger.info(f"  Selecting '{search_text}' in dropdown {index}...")

    try:
        # Get all ng-select elements
        ng_selects = await page.query_selector_all('ng-select')
        if index >= len(ng_selects):
            logger.error(f"    Only {len(ng_selects)} ng-selects found")
            return False

        # Get bounding box of the dropdown
        dropdown = ng_selects[index]
        box = await dropdown.bounding_box()
        if not box:
            logger.error("    Could not get bounding box")
            return False

        # Click in the center of the dropdown
        center_x = box['x'] + box['width'] / 2
        center_y = box['y'] + box['height'] / 2
        logger.info(f"    Clicking at ({center_x:.0f}, {center_y:.0f})")

        await page.mouse.click(center_x, center_y)
        await asyncio.sleep(3)

        # Take screenshot to see if dropdown opened
        await page.screenshot(path=str(OUTPUT_DIR / f'dropdown_{index}_click.png'))

        # Type the search text
        await page.keyboard.type(search_text, delay=150)
        await asyncio.sleep(3)

        await page.screenshot(path=str(OUTPUT_DIR / f'dropdown_{index}_typed.png'))

        # Look for dropdown panel and click first option
        panel = await page.query_selector('.ng-dropdown-panel')
        if panel:
            options = await panel.query_selector_all('.ng-option')
            logger.info(f"    Found {len(options)} options in dropdown panel")
            if options:
                option_box = await options[0].bounding_box()
                if option_box:
                    await page.mouse.click(
                        option_box['x'] + option_box['width'] / 2,
                        option_box['y'] + option_box['height'] / 2
                    )
                    logger.info("    Clicked first option")
                    await asyncio.sleep(5)
                    return True

        # If no panel, try pressing Enter
        await page.keyboard.press('Enter')
        await asyncio.sleep(5)
        logger.info("    Pressed Enter")
        return True

    except Exception as e:
        logger.error(f"    Error: {e}")
        await page.keyboard.press('Escape')
        await asyncio.sleep(1)
        return False


async def main():
    logger.info("=" * 60)
    logger.info("MGO CONNECT TRAVIS COUNTY SCRAPER v7")
    logger.info("=" * 60)

    all_records = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
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

            # Login
            logger.info("Logging in...")
            await page.fill('input[type="email"]', USERNAME)
            await page.fill('input[type="password"]', PASSWORD)
            await page.click('button:has-text("Login")')

            # Wait for search page
            await asyncio.sleep(20)
            await page.screenshot(path=str(OUTPUT_DIR / '01_after_login.png'))

            # Verify login
            page_content = await page.content()
            if 'Will Burns' in page_content or 'willwalterburns' in page_content:
                logger.info("  Login verified")
            else:
                logger.warning("  Login may have failed")

            # Wait for ng-select to be interactive
            await page.wait_for_selector('ng-select', timeout=30000)
            await asyncio.sleep(5)

            # Get all ng-selects
            ng_selects = await page.query_selector_all('ng-select')
            logger.info(f"Found {len(ng_selects)} ng-select elements")

            # Select State = Texas (dropdown 0)
            logger.info("Selecting State = Texas...")
            await click_ng_select_and_type(page, 0, "Texas")
            await asyncio.sleep(8)
            await page.screenshot(path=str(OUTPUT_DIR / '02_state_texas.png'))

            # Select Jurisdiction = Travis County (dropdown 1)
            logger.info("Selecting Jurisdiction = Travis County...")
            await click_ng_select_and_type(page, 1, "Travis")
            await asyncio.sleep(8)
            await page.screenshot(path=str(OUTPUT_DIR / '03_jurisdiction_travis.png'))

            # Select Project Type = OSSF (dropdown 2)
            logger.info("Selecting Project Type = OSSF...")
            await click_ng_select_and_type(page, 2, "OSSF")
            await asyncio.sleep(8)
            await page.screenshot(path=str(OUTPUT_DIR / '04_type_ossf.png'))

            # Click Search
            logger.info("Clicking Search...")
            search_btn = await page.query_selector('button:has-text("Search")')
            if search_btn:
                await search_btn.click()
                await asyncio.sleep(10)

            await page.screenshot(path=str(OUTPUT_DIR / '05_search_results.png'))

            # Check results
            results_text = await page.inner_text('body')
            if 'Showing' in results_text and 'entries' in results_text:
                # Extract showing X to Y of Z
                import re
                match = re.search(r'Showing (\d+) to (\d+) of (\d+)', results_text)
                if match:
                    logger.info(f"Results: Showing {match.group(1)} to {match.group(2)} of {match.group(3)}")

            # Extract table data
            rows = await page.query_selector_all('table tbody tr')
            logger.info(f"Found {len(rows)} table rows")

            for row in rows:
                cells = await row.query_selector_all('td')
                if len(cells) >= 5:
                    record = {
                        'project_number': (await cells[1].inner_text()).strip() if len(cells) > 1 else '',
                        'address': (await cells[5].inner_text()).strip() if len(cells) > 5 else '',
                        'county': 'Travis',
                        'state': 'Texas',
                        'source': 'MGO Connect'
                    }
                    if record['project_number']:
                        all_records.append(record)

        except Exception as e:
            logger.error(f"Error: {e}")
            await page.screenshot(path=str(OUTPUT_DIR / 'error.png'))

        finally:
            await browser.close()

    # Save results
    logger.info("\n" + "=" * 60)
    logger.info(f"COMPLETE: {len(all_records):,} records")
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
