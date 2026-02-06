#!/usr/bin/env python3
"""
MGO Connect Travis County OSSF Scraper v13

Fixed: Wait much longer for jurisdiction API to load.
Monitor network requests and add extensive logging.
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

OUTPUT_DIR = Path('/root/scrapers/output/texas/travis_mgo_v13')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MGO_SEARCH_URL = "https://www.mgoconnect.org/cp/search"
USERNAME = "willwalterburns@gmail.com"
PASSWORD = "#Espn202512"


async def main():
    logger.info("=" * 60)
    logger.info("MGO CONNECT TRAVIS COUNTY SCRAPER v13")
    logger.info("=" * 60)

    all_records = []
    seen_ids = set()
    api_responses = []

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

        # Monitor ALL network requests
        async def log_response(response):
            url = response.url
            if 'api' in url.lower() or 'jurisdiction' in url.lower() or 'county' in url.lower() or 'state' in url.lower():
                try:
                    status = response.status
                    body = await response.text() if response.ok else "error"
                    logger.info(f"  [API] {status} {url[:100]}...")
                    if len(body) < 500:
                        logger.info(f"         Response: {body[:200]}")
                    api_responses.append({'url': url, 'status': status, 'body_len': len(body)})
                except:
                    pass

        page.on('response', log_response)

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
            logger.info(f"  Current URL: {page.url}")

            # Debug: Get full page HTML to understand structure
            page_html = await page.content()
            with open(OUTPUT_DIR / 'page_structure.html', 'w', encoding='utf-8') as f:
                f.write(page_html)
            logger.info(f"  Saved page HTML ({len(page_html)} bytes)")

            # Count dropdowns
            dropdown_count = await page.locator('.p-dropdown').count()
            logger.info(f"  Found {dropdown_count} p-dropdown elements")

            await asyncio.sleep(5)

            # === STEP 1: Select State = Texas ===
            logger.info("STEP 1: Selecting State = Texas")

            # Click the state dropdown
            state_dropdown = page.locator('.p-dropdown').nth(0)
            await state_dropdown.click()
            await asyncio.sleep(3)
            await page.screenshot(path=str(OUTPUT_DIR / '02_state_opened.png'))

            # Wait for panel and find input
            try:
                await page.wait_for_selector('.p-dropdown-panel', timeout=5000)
                logger.info("    Dropdown panel appeared")
            except:
                logger.warning("    No dropdown panel appeared!")

            # Try to find filter input
            filter_input = await page.query_selector('.p-dropdown-filter')
            if filter_input:
                await filter_input.fill('Texas')
                await asyncio.sleep(2)
                logger.info("    Typed 'Texas' in filter")
            else:
                # Just type
                await page.keyboard.type('Texas')
                await asyncio.sleep(2)

            await page.screenshot(path=str(OUTPUT_DIR / '03_state_typed.png'))

            # Find and click Texas option
            texas_item = page.locator('.p-dropdown-item:has-text("Texas")').first
            try:
                await texas_item.click(timeout=5000)
                logger.info("    Clicked Texas option")
            except:
                # Try keyboard
                await page.keyboard.press('ArrowDown')
                await asyncio.sleep(0.5)
                await page.keyboard.press('Enter')
                logger.info("    Used keyboard to select")

            await asyncio.sleep(5)
            await page.screenshot(path=str(OUTPUT_DIR / '04_state_selected.png'))

            # Verify state selection
            state_label = await page.locator('.p-dropdown').nth(0).locator('.p-dropdown-label').inner_text()
            logger.info(f"    State dropdown now shows: '{state_label}'")

            # === CRITICAL: Wait for jurisdictions to load ===
            logger.info("STEP 1b: Waiting for jurisdictions API to respond...")
            logger.info("         (This may take 30+ seconds)")

            # Wait for network to settle
            for wait_round in range(6):
                await asyncio.sleep(10)
                logger.info(f"    Waiting... ({(wait_round+1)*10}s)")

                # Check if jurisdiction dropdown now has options
                jurisdiction_dropdown = page.locator('.p-dropdown').nth(1)
                await jurisdiction_dropdown.click()
                await asyncio.sleep(2)

                # Check for options
                options = await page.query_selector_all('.p-dropdown-item')
                no_results = await page.query_selector('text="No results found"')

                logger.info(f"    Found {len(options)} options, no_results={no_results is not None}")

                if options and len(options) > 0 and not no_results:
                    logger.info("    Jurisdictions loaded!")
                    await page.screenshot(path=str(OUTPUT_DIR / f'05_jurisdiction_loaded_{wait_round}.png'))
                    break

                # Close and wait more
                await page.keyboard.press('Escape')
                await asyncio.sleep(1)

            # Final attempt to get jurisdiction screenshot
            await page.screenshot(path=str(OUTPUT_DIR / '06_jurisdiction_attempt.png'))

            # === STEP 2: Select Jurisdiction = Travis County ===
            logger.info("STEP 2: Selecting Jurisdiction = Travis County")

            jurisdiction_dropdown = page.locator('.p-dropdown').nth(1)
            await jurisdiction_dropdown.click()
            await asyncio.sleep(2)

            # Try filter input
            filter_input = await page.query_selector('.p-dropdown-filter')
            if filter_input:
                await filter_input.fill('Travis')
                await asyncio.sleep(2)
            else:
                await page.keyboard.type('Travis')
                await asyncio.sleep(2)

            await page.screenshot(path=str(OUTPUT_DIR / '07_jurisdiction_typed.png'))

            # Click Travis option
            travis_item = page.locator('.p-dropdown-item:has-text("Travis")').first
            try:
                await travis_item.click(timeout=5000)
                logger.info("    Clicked Travis option")
            except:
                await page.keyboard.press('ArrowDown')
                await asyncio.sleep(0.5)
                await page.keyboard.press('Enter')
                logger.info("    Used keyboard")

            await asyncio.sleep(3)
            await page.screenshot(path=str(OUTPUT_DIR / '08_jurisdiction_selected.png'))

            # Verify
            jurisdiction_label = await page.locator('.p-dropdown').nth(1).locator('.p-dropdown-label').inner_text()
            logger.info(f"    Jurisdiction dropdown now shows: '{jurisdiction_label}'")

            # === STEP 3: Select Project Type = OSSF ===
            logger.info("STEP 3: Selecting Project Type = OSSF")

            type_dropdown = page.locator('.p-dropdown').nth(2)
            await type_dropdown.click()
            await asyncio.sleep(2)

            filter_input = await page.query_selector('.p-dropdown-filter')
            if filter_input:
                await filter_input.fill('OSSF')
                await asyncio.sleep(2)
            else:
                await page.keyboard.type('OSSF')
                await asyncio.sleep(2)

            await page.screenshot(path=str(OUTPUT_DIR / '09_type_typed.png'))

            ossf_item = page.locator('.p-dropdown-item:has-text("OSSF")').first
            try:
                await ossf_item.click(timeout=5000)
            except:
                await page.keyboard.press('ArrowDown')
                await asyncio.sleep(0.5)
                await page.keyboard.press('Enter')

            await asyncio.sleep(3)
            await page.screenshot(path=str(OUTPUT_DIR / '10_type_selected.png'))

            # === STEP 4: Extract results ===
            logger.info("STEP 4: Extracting results...")

            await asyncio.sleep(5)
            await page.screenshot(path=str(OUTPUT_DIR / '11_results.png'))

            # Check entries count
            page_text = await page.inner_text('body')
            if 'Showing' in page_text:
                import re
                match = re.search(r'Showing \d+ to \d+ of (\d+) entries', page_text)
                if match:
                    total = match.group(1)
                    logger.info(f"  Found {total} total entries")

            # Save API responses log
            with open(OUTPUT_DIR / 'api_responses.json', 'w') as f:
                json.dump(api_responses, f, indent=2)

            # Try to extract records
            try:
                await page.wait_for_selector('table tbody tr', timeout=5000)
                rows = await page.query_selector_all('table tbody tr')
                logger.info(f"  Found {len(rows)} table rows")

                for row in rows:
                    cells = await row.query_selector_all('td')
                    if len(cells) >= 5:
                        record = {
                            'project_number': (await cells[0].inner_text()).strip(),
                            'project_name': (await cells[1].inner_text()).strip(),
                            'work_type': (await cells[2].inner_text()).strip(),
                            'status': (await cells[3].inner_text()).strip(),
                            'address': (await cells[4].inner_text()).strip(),
                            'county': 'Travis',
                            'state': 'TX',
                            '_source': 'MGOConnect'
                        }
                        if record['project_number'] and record['project_number'] != 'Project Number':
                            all_records.append(record)

            except Exception as e:
                logger.warning(f"  Table extraction: {e}")

            await page.screenshot(path=str(OUTPUT_DIR / '12_final.png'), full_page=True)

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
            'api_calls_logged': len(api_responses),
            'records': all_records
        }, f, indent=2)

    logger.info("\n" + "=" * 60)
    logger.info(f"COMPLETE: {len(all_records)} unique records")
    logger.info(f"API calls logged: {len(api_responses)}")
    logger.info("=" * 60)
    logger.info(f"Saved: {output_file}")

    return all_records


if __name__ == '__main__':
    asyncio.run(main())
