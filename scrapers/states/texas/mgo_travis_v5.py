#!/usr/bin/env python3
"""
MGO Connect Travis County OSSF Scraper v5

Fixed login process with explicit waits and verification.
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

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/texas/travis_mgo_v5')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MGO_SEARCH_URL = "https://www.mgoconnect.org/cp/search"
USERNAME = "willwalterburns@gmail.com"
PASSWORD = "#Espn202512"


async def login(page):
    """Perform login with explicit waits."""
    logger.info("Starting login process...")

    # Wait for login form to be present
    try:
        await page.wait_for_selector('input[type="email"], input[formcontrolname="email"]', timeout=30000)
    except:
        logger.info("No login form found, may already be logged in")
        return True

    # Check if already logged in
    user_elem = await page.query_selector('[class*="user-name"], .user-info')
    if user_elem:
        text = await user_elem.inner_text()
        if 'Will' in text or USERNAME in text:
            logger.info("Already logged in")
            return True

    # Fill email
    email_input = await page.query_selector('input[type="email"], input[formcontrolname="email"]')
    if email_input:
        await email_input.click()
        await asyncio.sleep(0.5)
        await email_input.fill(USERNAME)
        logger.info(f"  Filled email: {USERNAME}")
        await asyncio.sleep(1)

    # Fill password
    pwd_input = await page.query_selector('input[type="password"]')
    if pwd_input:
        await pwd_input.click()
        await asyncio.sleep(0.5)
        await pwd_input.fill(PASSWORD)
        logger.info("  Filled password")
        await asyncio.sleep(1)

    await page.screenshot(path=str(OUTPUT_DIR / 'login_filled.png'))

    # Click login button
    login_btn = await page.query_selector('button:has-text("Login")')
    if login_btn:
        logger.info("  Clicking Login button...")
        await login_btn.click()

        # Wait for navigation or page change
        try:
            await page.wait_for_url('**/search**', timeout=30000)
            logger.info("  Navigated to search page")
        except:
            # Wait for any indication of login success
            await asyncio.sleep(10)

    await page.screenshot(path=str(OUTPUT_DIR / 'after_login.png'))

    # Verify login by checking for user name
    await asyncio.sleep(5)
    try:
        # Look for user indicator in header
        header = await page.inner_text('header') if await page.query_selector('header') else ''
        if 'Will' in header or 'Burns' in header:
            logger.info("  Login verified - user name visible")
            return True

        # Check if on search page
        if '/search' in page.url:
            logger.info("  Login appears successful - on search page")
            return True

        # Check for Guest indicator
        guest = await page.query_selector('[class*="guest" i], :has-text("Guest")')
        if not guest:
            logger.info("  No Guest indicator - login may be successful")
            return True

    except Exception as e:
        logger.warning(f"  Login verification error: {e}")

    return False


async def select_dropdown_option(page, dropdown_index, search_text):
    """Select an option from ng-select dropdown."""
    logger.info(f"  Selecting '{search_text}' from dropdown {dropdown_index}...")

    try:
        # Get all ng-select elements
        ng_selects = await page.query_selector_all('ng-select')
        if dropdown_index >= len(ng_selects):
            logger.error(f"    Only {len(ng_selects)} dropdowns found")
            return False

        dropdown = ng_selects[dropdown_index]

        # Click the dropdown to open it
        await dropdown.click()
        await asyncio.sleep(2)

        # Type into the dropdown's search input
        await page.keyboard.type(search_text, delay=100)
        await asyncio.sleep(3)

        # Wait for and click the matching option
        option_selector = f'.ng-dropdown-panel .ng-option:has-text("{search_text}")'
        try:
            await page.wait_for_selector(option_selector, timeout=5000)
            option = await page.query_selector(option_selector)
            if option:
                await option.click()
                logger.info(f"    Clicked option: {search_text}")
                await asyncio.sleep(5)
                return True
        except:
            pass

        # If no option found, try Enter
        await page.keyboard.press('Enter')
        await asyncio.sleep(5)
        logger.info(f"    Pressed Enter for: {search_text}")
        return True

    except Exception as e:
        logger.error(f"    Dropdown error: {e}")
        return False


async def extract_results(page):
    """Extract data from results table."""
    records = []
    try:
        await page.wait_for_selector('table tbody tr', timeout=5000)
        rows = await page.query_selector_all('table tbody tr')

        for row in rows:
            cells = await row.query_selector_all('td')
            if len(cells) >= 5:
                record = {
                    'project_number': (await cells[1].inner_text()).strip() if len(cells) > 1 else '',
                    'project_name': (await cells[2].inner_text()).strip() if len(cells) > 2 else '',
                    'work_type': (await cells[3].inner_text()).strip() if len(cells) > 3 else '',
                    'status': (await cells[4].inner_text()).strip() if len(cells) > 4 else '',
                    'address': (await cells[5].inner_text()).strip() if len(cells) > 5 else '',
                }
                if record['project_number']:
                    records.append(record)
    except:
        pass
    return records


async def search_prefix(page, prefix, all_records, seen_ids):
    """Search with address prefix."""
    logger.info(f"  Searching: '{prefix}'")

    try:
        # Find and clear any address input
        inputs = await page.query_selector_all('input[type="text"]')
        for inp in inputs:
            placeholder = await inp.get_attribute('placeholder') or ''
            if 'address' in placeholder.lower():
                await inp.fill('')
                await asyncio.sleep(0.5)
                await inp.fill(prefix)
                await asyncio.sleep(2)
                break

        # Click search
        search_btn = await page.query_selector('button:has-text("Search")')
        if search_btn:
            await search_btn.click()
            await asyncio.sleep(5)

        # Get results
        page_num = 1
        while page_num <= 50:
            records = await extract_results(page)
            if not records:
                break

            logger.info(f"    Page {page_num}: {len(records)} records")

            for rec in records:
                rec_id = f"{rec['project_number']}_{rec['address']}"
                if rec_id not in seen_ids:
                    seen_ids.add(rec_id)
                    rec['prefix'] = prefix
                    all_records.append(rec)

            # Next page
            next_btn = await page.query_selector('.pagination .next:not(.disabled), [aria-label="Next"]:not([disabled])')
            if not next_btn:
                break
            await next_btn.click()
            await asyncio.sleep(3)
            page_num += 1

        logger.info(f"    Prefix '{prefix}' done. Total: {len(all_records)}")

    except Exception as e:
        logger.error(f"    Search error: {e}")


async def main():
    logger.info("=" * 60)
    logger.info("MGO CONNECT TRAVIS COUNTY SCRAPER v5")
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
            # Load page
            logger.info(f"Loading: {MGO_SEARCH_URL}")
            await page.goto(MGO_SEARCH_URL, wait_until='networkidle', timeout=90000)
            await asyncio.sleep(10)
            await page.screenshot(path=str(OUTPUT_DIR / '01_initial.png'))

            # Login
            login_success = await login(page)
            if not login_success:
                logger.error("Login failed!")
                await page.screenshot(path=str(OUTPUT_DIR / 'login_failed.png'))
                return

            await asyncio.sleep(5)
            await page.screenshot(path=str(OUTPUT_DIR / '02_logged_in.png'))

            # Select State = Texas
            logger.info("Selecting Texas...")
            await select_dropdown_option(page, 0, "Texas")
            await page.screenshot(path=str(OUTPUT_DIR / '03_texas.png'))

            # Wait for jurisdiction dropdown to load
            await asyncio.sleep(8)

            # Select Jurisdiction = Travis County
            logger.info("Selecting Travis County...")
            await select_dropdown_option(page, 1, "Travis")
            await page.screenshot(path=str(OUTPUT_DIR / '04_travis.png'))

            # Wait for project type dropdown to load
            await asyncio.sleep(8)

            # Select Project Type = OSSF
            logger.info("Selecting OSSF...")
            await select_dropdown_option(page, 2, "OSSF")
            await page.screenshot(path=str(OUTPUT_DIR / '05_ossf.png'))

            # Initial search
            await asyncio.sleep(5)
            search_btn = await page.query_selector('button:has-text("Search")')
            if search_btn:
                await search_btn.click()
                await asyncio.sleep(8)
            await page.screenshot(path=str(OUTPUT_DIR / '06_results.png'))

            # Recursive search
            logger.info("Starting recursive search...")
            for prefix in '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ':
                await search_prefix(page, prefix, all_records, seen_ids)
                await asyncio.sleep(2)

                if len(all_records) > 0 and len(all_records) % 500 == 0:
                    checkpoint = OUTPUT_DIR / f'checkpoint_{len(all_records)}.json'
                    with open(checkpoint, 'w') as f:
                        json.dump({'count': len(all_records), 'records': all_records}, f)

            await page.screenshot(path=str(OUTPUT_DIR / '07_complete.png'))

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
