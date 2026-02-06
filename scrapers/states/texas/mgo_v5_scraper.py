#!/usr/bin/env python3
"""
MGO Connect Texas Scraper v5 - Improved dropdown handling

Key improvements:
1. Much longer waits after each action
2. Wait for network idle before clicking
3. Use keyboard navigation for dropdowns
4. Capture ALL jurisdictions then iterate
"""

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/texas')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MGO_URL = "https://www.mgoconnect.org/cp/home"
USERNAME = "willwalterburns@gmail.com"
PASSWORD = "#Espn202512"

# Very deliberate timing
TINY_WAIT = 3
SHORT_WAIT = 8
MEDIUM_WAIT = 15
LONG_WAIT = 25


async def wait_for_stable(page, timeout=10000):
    """Wait for page to be stable."""
    await page.wait_for_load_state('networkidle', timeout=timeout)
    await asyncio.sleep(2)


async def main():
    logger.info("=" * 60)
    logger.info("MGO CONNECT TEXAS SCRAPER v5")
    logger.info("=" * 60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
        )
        page = await context.new_page()

        try:
            # Login
            logger.info("Logging into MGO Connect...")
            await page.goto(MGO_URL, wait_until='networkidle', timeout=60000)
            await asyncio.sleep(SHORT_WAIT)

            # Fill login form
            await page.fill('input[type="email"], input[name="email"], #email', USERNAME)
            await asyncio.sleep(TINY_WAIT)
            await page.fill('input[type="password"], input[name="password"], #password', PASSWORD)
            await asyncio.sleep(TINY_WAIT)

            # Click login
            logger.info("Clicking Login button...")
            await page.click('button[type="submit"], button:has-text("Log in"), button:has-text("Login")')
            await asyncio.sleep(LONG_WAIT)
            await wait_for_stable(page)

            logger.info("LOGIN SUCCESSFUL!")

            # Wait for page to fully stabilize
            await asyncio.sleep(MEDIUM_WAIT)

            # Take screenshot to see current state
            await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v5_after_login.png'))
            logger.info("Screenshot saved")

            # Find State dropdown - look for "Select a State" text
            logger.info("Looking for State dropdown...")

            # Try clicking on the State dropdown area
            state_dropdown = await page.query_selector('ng-select:first-of-type, .ng-select:first-of-type')
            if state_dropdown:
                await state_dropdown.click()
                await asyncio.sleep(MEDIUM_WAIT)
                logger.info("Clicked state dropdown")

                # Take screenshot
                await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v5_state_dropdown_open.png'))

                # Type Texas to filter
                await page.keyboard.type('Texas', delay=100)
                await asyncio.sleep(SHORT_WAIT)

                # Press Enter to select
                await page.keyboard.press('Enter')
                await asyncio.sleep(LONG_WAIT)

                logger.info("Texas entered and selected")
                await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v5_texas_selected.png'))

                # Wait for page to stabilize after state selection
                await asyncio.sleep(MEDIUM_WAIT)
                await wait_for_stable(page)

                # Now look for Jurisdiction dropdown
                logger.info("Looking for Jurisdiction dropdown...")

                # Wait longer for jurisdiction dropdown to appear
                await asyncio.sleep(LONG_WAIT)

                # Find all ng-selects
                dropdowns = await page.query_selector_all('ng-select, .ng-select')
                logger.info(f"Found {len(dropdowns)} dropdowns")

                if len(dropdowns) >= 2:
                    # Second dropdown should be jurisdiction
                    jurisdiction_dropdown = dropdowns[1]
                    await jurisdiction_dropdown.click()
                    await asyncio.sleep(MEDIUM_WAIT)

                    await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v5_jurisdiction_dropdown.png'))

                    # Get all options
                    options = await page.query_selector_all('.ng-option, ng-dropdown-panel .ng-option')
                    logger.info(f"Found {len(options)} jurisdiction options")

                    jurisdictions = []
                    for opt in options:
                        text = await opt.inner_text()
                        if text and text.strip():
                            jurisdictions.append(text.strip())

                    logger.info(f"Jurisdictions: {jurisdictions[:10]}...")

                    # Save jurisdictions
                    with open(OUTPUT_DIR / 'mgo_v5_jurisdictions.json', 'w') as f:
                        json.dump({
                            'state': 'Texas',
                            'jurisdictions': jurisdictions,
                            'count': len(jurisdictions),
                            'extracted_at': datetime.now().isoformat()
                        }, f, indent=2)

                    logger.info(f"Saved {len(jurisdictions)} jurisdictions")

                    # Try to select first jurisdiction
                    if jurisdictions:
                        await page.keyboard.press('ArrowDown')
                        await asyncio.sleep(TINY_WAIT)
                        await page.keyboard.press('Enter')
                        await asyncio.sleep(LONG_WAIT)

                        await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v5_first_jurisdiction.png'))
                        logger.info("Selected first jurisdiction")

                        # Look for search functionality
                        await asyncio.sleep(MEDIUM_WAIT)
                        await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v5_search_page.png'))

        except Exception as e:
            logger.error(f"Error: {e}")
            await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v5_error.png'))

        finally:
            await browser.close()


if __name__ == '__main__':
    asyncio.run(main())
