#!/usr/bin/env python3
"""
Travis County TX MGO Connect Scraper

Target: All septic permits for Travis County via MGO Connect
Source: https://www.mgoconnect.org

Strategy:
1. Login to MGO Connect
2. Select Texas state
3. Select Travis County jurisdiction
4. Search all records with recursive address patterns
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

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/texas/travis_mgo')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MGO_URL = "https://www.mgoconnect.org/cp/home"
USERNAME = "willwalterburns@gmail.com"
PASSWORD = "#Espn202512"

# Very slow timing for MGO
TINY = 5
SHORT = 10
MEDIUM = 20
LONG = 30


async def wait_stable(page, timeout=20000):
    """Wait for page to be stable."""
    try:
        await page.wait_for_load_state('networkidle', timeout=timeout)
    except:
        pass
    await asyncio.sleep(3)


async def main():
    logger.info("=" * 60)
    logger.info("TRAVIS COUNTY MGO CONNECT SCRAPER")
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
            # Step 1: Load MGO and Login
            logger.info("Loading MGO Connect...")
            await page.goto(MGO_URL, wait_until='domcontentloaded', timeout=60000)
            await asyncio.sleep(MEDIUM)

            # Take screenshot
            await page.screenshot(path=str(OUTPUT_DIR / 'step1_loaded.png'))

            # Find and fill login form
            logger.info("Looking for login form...")

            # Try different email field selectors
            email_filled = False
            for selector in ['input[type="email"]', 'input[name="email"]', '#email', 'input[placeholder*="email"]', 'input[autocomplete="email"]']:
                try:
                    elem = await page.query_selector(selector)
                    if elem:
                        await elem.fill(USERNAME)
                        email_filled = True
                        logger.info(f"Email filled using: {selector}")
                        break
                except:
                    continue

            if not email_filled:
                # Try to find any text input that might be email
                inputs = await page.query_selector_all('input[type="text"], input:not([type])')
                for inp in inputs:
                    placeholder = await inp.get_attribute('placeholder') or ''
                    name = await inp.get_attribute('name') or ''
                    if 'email' in placeholder.lower() or 'email' in name.lower():
                        await inp.fill(USERNAME)
                        email_filled = True
                        logger.info("Email filled via text input")
                        break

            await asyncio.sleep(TINY)

            # Fill password
            for selector in ['input[type="password"]', 'input[name="password"]', '#password']:
                try:
                    elem = await page.query_selector(selector)
                    if elem:
                        await elem.fill(PASSWORD)
                        logger.info(f"Password filled using: {selector}")
                        break
                except:
                    continue

            await asyncio.sleep(TINY)
            await page.screenshot(path=str(OUTPUT_DIR / 'step2_credentials.png'))

            # Click login button
            logger.info("Clicking login...")
            for selector in ['button[type="submit"]', 'button:has-text("Log")', 'input[type="submit"]', '.login-button', 'button:has-text("Sign")']:
                try:
                    elem = await page.query_selector(selector)
                    if elem:
                        await elem.click()
                        logger.info(f"Login clicked using: {selector}")
                        break
                except:
                    continue

            await asyncio.sleep(LONG)
            await wait_stable(page)
            await page.screenshot(path=str(OUTPUT_DIR / 'step3_after_login.png'))

            # Step 2: Select Texas
            logger.info("Selecting Texas...")
            await asyncio.sleep(MEDIUM)

            # Look for state dropdown
            state_dropdown = await page.query_selector('ng-select, .ng-select, select[name*="state"]')
            if state_dropdown:
                await state_dropdown.click()
                await asyncio.sleep(SHORT)

                # Type Texas
                await page.keyboard.type('Texas', delay=150)
                await asyncio.sleep(SHORT)
                await page.keyboard.press('Enter')
                await asyncio.sleep(LONG)

                logger.info("Texas selected")
                await page.screenshot(path=str(OUTPUT_DIR / 'step4_texas.png'))

                # Step 3: Select Travis County
                logger.info("Selecting Travis County...")
                await asyncio.sleep(MEDIUM)

                # Find jurisdiction dropdown (second ng-select)
                dropdowns = await page.query_selector_all('ng-select, .ng-select')
                if len(dropdowns) >= 2:
                    await dropdowns[1].click()
                    await asyncio.sleep(SHORT)

                    # Type Travis
                    await page.keyboard.type('Travis', delay=150)
                    await asyncio.sleep(SHORT)
                    await page.keyboard.press('Enter')
                    await asyncio.sleep(LONG)

                    logger.info("Travis County selected")
                    await page.screenshot(path=str(OUTPUT_DIR / 'step5_travis.png'))

                    # Step 4: Search for records
                    logger.info("Searching for records...")
                    await asyncio.sleep(MEDIUM)

                    # Look for search input
                    search_input = await page.query_selector('input[name="search"], input[placeholder*="search"], input[type="search"], .search-input')
                    if search_input:
                        # Recursive address search
                        for prefix in '123456789':
                            logger.info(f"Searching prefix: {prefix}")
                            await search_input.fill(prefix)
                            await asyncio.sleep(SHORT)

                            # Click search button or press Enter
                            await page.keyboard.press('Enter')
                            await asyncio.sleep(MEDIUM)
                            await wait_stable(page)

                            # Get results
                            rows = await page.query_selector_all('table tr, .result-row')
                            logger.info(f"  Found {len(rows)} rows")

                            # Extract data
                            for row in rows[1:]:  # Skip header
                                try:
                                    cells = await row.query_selector_all('td')
                                    if cells:
                                        record = {}
                                        for i, cell in enumerate(cells):
                                            text = await cell.inner_text()
                                            record[f'col_{i}'] = text.strip()

                                        record_id = '|'.join(str(v) for v in record.values())
                                        if record_id not in seen_ids:
                                            seen_ids.add(record_id)
                                            record['source'] = 'MGO Connect - Travis County'
                                            all_records.append(record)
                                except:
                                    pass

                            logger.info(f"  Total unique: {len(all_records)}")

                            # Save checkpoint
                            if len(all_records) > 0 and len(all_records) % 500 == 0:
                                checkpoint = OUTPUT_DIR / f'travis_mgo_checkpoint_{len(all_records)}.json'
                                with open(checkpoint, 'w') as f:
                                    json.dump({
                                        'county': 'Travis',
                                        'state': 'Texas',
                                        'source': 'MGO Connect',
                                        'count': len(all_records),
                                        'records': all_records
                                    }, f)
                                logger.info(f"Checkpoint: {checkpoint}")

                    await page.screenshot(path=str(OUTPUT_DIR / 'step6_results.png'))

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

    if all_records:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = OUTPUT_DIR / f'travis_mgo_{timestamp}.json'

        with open(output_file, 'w') as f:
            json.dump({
                'county': 'Travis',
                'state': 'Texas',
                'source': 'MGO Connect',
                'count': len(all_records),
                'extracted_at': datetime.now().isoformat(),
                'records': all_records
            }, f)

        logger.info(f"Saved {len(all_records):,} records to {output_file}")


if __name__ == '__main__':
    asyncio.run(main())
