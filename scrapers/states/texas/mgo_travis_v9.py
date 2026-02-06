#!/usr/bin/env python3
"""
MGO Connect Travis County OSSF Scraper v9

Based on actual screenshot - uses standard click and type approach
for custom Angular dropdown components.
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

OUTPUT_DIR = Path('/root/scrapers/output/texas/travis_mgo_v9')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MGO_SEARCH_URL = "https://www.mgoconnect.org/cp/search"
USERNAME = "willwalterburns@gmail.com"
PASSWORD = "#Espn202512"


async def select_dropdown_option(page, dropdown_text, option_text, screenshot_name=None):
    """
    Click a dropdown by its placeholder text and select an option.
    """
    logger.info(f"  Selecting dropdown '{dropdown_text}' -> '{option_text}'...")

    try:
        # Find the dropdown by its placeholder text
        dropdown = await page.query_selector(f'div:has-text("{dropdown_text}") >> visible=true')
        if not dropdown:
            # Try finding by aria-label or placeholder
            dropdown = await page.query_selector(f'[placeholder*="{dropdown_text}"], [aria-label*="{dropdown_text}"]')

        if not dropdown:
            # Click on the whole row containing the text
            await page.click(f'text="{dropdown_text}"')
        else:
            await dropdown.click()

        await asyncio.sleep(2)

        if screenshot_name:
            await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_name}_opened.png'))

        # Type to filter
        await page.keyboard.type(option_text, delay=100)
        await asyncio.sleep(2)

        if screenshot_name:
            await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_name}_typed.png'))

        # Click on the matching option in the dropdown list
        option = await page.query_selector(f'.mat-option:has-text("{option_text}"), .dropdown-item:has-text("{option_text}"), div[role="option"]:has-text("{option_text}"), .cdk-option:has-text("{option_text}")')

        if option:
            await option.click()
            logger.info(f"    Clicked option directly")
        else:
            # Try pressing Enter to select first match
            await page.keyboard.press('Enter')
            logger.info(f"    Pressed Enter to select")

        await asyncio.sleep(3)

        if screenshot_name:
            await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_name}_selected.png'))

        return True

    except Exception as e:
        logger.error(f"    Error selecting dropdown: {e}")
        await page.keyboard.press('Escape')
        await asyncio.sleep(1)
        return False


async def click_dropdown_by_label(page, label_text, option_text, screenshot_prefix=None):
    """Click on a labeled dropdown section and select option."""
    logger.info(f"  Clicking dropdown for '{label_text}' -> '{option_text}'...")

    try:
        # Find the section containing the label
        # The structure seems to be: <div>State</div> followed by <div>Select a State</div> with dropdown

        # Method 1: Click on the "Select a ..." placeholder directly
        placeholder_text = f"Select a {label_text}" if label_text != "Type" else "Select Type"
        placeholder = await page.query_selector(f'div:has-text("{placeholder_text}"):visible')

        if placeholder:
            await placeholder.click()
            logger.info(f"    Clicked placeholder: {placeholder_text}")
        else:
            # Method 2: Find by traversing from label
            label = await page.query_selector(f'div:text-is("{label_text}")')
            if label:
                # Click the next sibling div (the dropdown)
                parent = await label.evaluate_handle('el => el.parentElement')
                dropdown = await parent.query_selector('div:has(svg), div[role="combobox"], div.dropdown')
                if dropdown:
                    await dropdown.click()
                    logger.info(f"    Clicked dropdown via label traversal")

        await asyncio.sleep(2)

        if screenshot_prefix:
            await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_prefix}_dropdown_open.png'))

        # Now type to filter
        await page.keyboard.type(option_text, delay=100)
        await asyncio.sleep(2)

        if screenshot_prefix:
            await page.screenshot(path=str(OUTPUT_DIR / f'{screenshot_prefix}_typed.png'))

        # Try clicking the option
        for selector in [
            f'*:has-text("{option_text}"):visible',
            f'div[role="listbox"] div:has-text("{option_text}")',
            f'.mat-option:has-text("{option_text}")',
            f'.cdk-overlay-pane *:has-text("{option_text}")'
        ]:
            try:
                opt = await page.query_selector(selector)
                if opt:
                    await opt.click()
                    logger.info(f"    Clicked option: {selector}")
                    await asyncio.sleep(2)
                    return True
            except:
                continue

        # Fallback: press Enter
        await page.keyboard.press('Enter')
        logger.info(f"    Pressed Enter")
        await asyncio.sleep(2)
        return True

    except Exception as e:
        logger.error(f"    Error: {e}")
        await page.keyboard.press('Escape')
        return False


async def extract_table_records(page):
    """Extract records from the search results table."""
    records = []

    try:
        # Wait for table to have data
        await page.wait_for_selector('table tbody tr, .mat-table .mat-row', timeout=5000)

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
                except Exception as e:
                    continue

    except Exception as e:
        logger.warning(f"    Table extraction: {e}")

    return records


async def main():
    logger.info("=" * 60)
    logger.info("MGO CONNECT TRAVIS COUNTY SCRAPER v9")
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

            # Verify we're on search page
            page_text = await page.inner_text('body')
            if 'Select a State' not in page_text:
                logger.error("Search page not loaded correctly")
                await page.screenshot(path=str(OUTPUT_DIR / 'error_wrong_page.png'), full_page=True)
                return

            logger.info("Search page loaded successfully")
            await asyncio.sleep(3)

            # === STEP 1: Select State = Texas ===
            logger.info("STEP 1: Selecting State = Texas")

            # Click on the State dropdown (the div containing "Select a State")
            state_dropdown = page.locator('text=Select a State').first
            await state_dropdown.click()
            await asyncio.sleep(2)
            await page.screenshot(path=str(OUTPUT_DIR / '02_state_dropdown.png'))

            # Type Texas
            await page.keyboard.type('Texas', delay=100)
            await asyncio.sleep(2)
            await page.screenshot(path=str(OUTPUT_DIR / '03_state_typed.png'))

            # Click the Texas option or press Enter
            texas_option = await page.query_selector('text=Texas >> visible=true')
            if texas_option:
                await texas_option.click()
            else:
                await page.keyboard.press('Enter')

            await asyncio.sleep(5)
            await page.screenshot(path=str(OUTPUT_DIR / '04_state_selected.png'))

            # === STEP 2: Select Jurisdiction = Travis County ===
            logger.info("STEP 2: Selecting Jurisdiction = Travis County")

            # Wait for jurisdiction dropdown to be enabled
            await asyncio.sleep(3)

            # Click on Jurisdiction dropdown
            jurisdiction_dropdown = page.locator('text=Select a Jurisdiction').first
            await jurisdiction_dropdown.click()
            await asyncio.sleep(2)
            await page.screenshot(path=str(OUTPUT_DIR / '05_jurisdiction_dropdown.png'))

            # Type Travis
            await page.keyboard.type('Travis', delay=100)
            await asyncio.sleep(2)
            await page.screenshot(path=str(OUTPUT_DIR / '06_jurisdiction_typed.png'))

            # Select Travis County
            travis_option = await page.query_selector('text=Travis County >> visible=true')
            if travis_option:
                await travis_option.click()
            else:
                await page.keyboard.press('Enter')

            await asyncio.sleep(5)
            await page.screenshot(path=str(OUTPUT_DIR / '07_jurisdiction_selected.png'))

            # === STEP 3: Select Project Type = OSSF ===
            logger.info("STEP 3: Selecting Project Type = OSSF")

            # Click on Project Type dropdown
            type_dropdown = page.locator('text=Select Type').first
            await type_dropdown.click()
            await asyncio.sleep(2)
            await page.screenshot(path=str(OUTPUT_DIR / '08_type_dropdown.png'))

            # Type OSSF
            await page.keyboard.type('OSSF', delay=100)
            await asyncio.sleep(2)
            await page.screenshot(path=str(OUTPUT_DIR / '09_type_typed.png'))

            # Select OSSF option
            ossf_option = await page.query_selector('text=OSSF >> visible=true')
            if ossf_option:
                await ossf_option.click()
            else:
                await page.keyboard.press('Enter')

            await asyncio.sleep(5)
            await page.screenshot(path=str(OUTPUT_DIR / '10_type_selected.png'))

            # === STEP 4: Search should auto-trigger, extract results ===
            logger.info("STEP 4: Extracting results...")

            # Wait for table to populate
            await asyncio.sleep(5)
            await page.screenshot(path=str(OUTPUT_DIR / '11_results.png'))

            # Check if we have results
            entries_text = await page.inner_text('body')
            logger.info(f"  Page shows entries info")

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
                        # First page no results - try clicking search manually
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
                next_btn = await page.query_selector('button[aria-label="Next"], .pagination-next:not(.disabled), text=">>"')
                if next_btn:
                    is_disabled = await next_btn.get_attribute('disabled')
                    if is_disabled:
                        logger.info("    Next button disabled, done")
                        break
                    await next_btn.click()
                    await asyncio.sleep(3)
                    page_num += 1
                else:
                    # Try clicking the >> pagination
                    next_btns = await page.query_selector_all('button')
                    for btn in next_btns:
                        text = await btn.inner_text()
                        if '>>' in text or '>' in text:
                            is_disabled = await btn.get_attribute('disabled')
                            if not is_disabled:
                                await btn.click()
                                await asyncio.sleep(3)
                                page_num += 1
                                break
                    else:
                        break

                # Safety: stop after 1000 pages
                if page_num > 1000:
                    break

                # Checkpoint every 20 pages
                if page_num % 20 == 0:
                    checkpoint_file = OUTPUT_DIR / f'checkpoint_p{page_num}.json'
                    with open(checkpoint_file, 'w') as f:
                        json.dump({'count': len(all_records), 'page': page_num}, f)
                    logger.info(f"    Checkpoint saved at page {page_num}")

            await page.screenshot(path=str(OUTPUT_DIR / '12_final.png'))

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
