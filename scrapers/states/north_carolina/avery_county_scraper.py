#!/usr/bin/env python3
"""
Avery County NC Septic Record Scraper

Uses Playwright to scrape septic records from NC CDPEHS system.
URL: https://public.cdpehs.com/NCENVPBLo/OSW_PROPERTY/ShowOSW_PROPERTYTablePage.aspx?ESTTST_CTY=C6

Recursive street address search with pagination.
"""

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/north_carolina')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

BASE_URL = "https://public.cdpehs.com/NCENVPBLo/OSW_PROPERTY/ShowOSW_PROPERTYTablePage.aspx?ESTTST_CTY=C6"

# Search patterns - numbers first, then letters
SEARCH_PATTERNS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] + list('ABCDEFGHIJKLMNOPQRSTUVWXYZ')


async def scrape_avery_county():
    """Main scraper function."""
    logger.info("=" * 60)
    logger.info("AVERY COUNTY NC SEPTIC SCRAPER")
    logger.info("=" * 60)

    all_records = []
    seen_ids = set()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        page = await context.new_page()

        try:
            for pattern in SEARCH_PATTERNS:
                logger.info(f"Searching pattern: '{pattern}'")
                pattern_records = 0

                # Navigate to the search page
                await page.goto(BASE_URL, wait_until='networkidle', timeout=60000)
                await asyncio.sleep(2)

                # Find and fill the street address field
                # Based on screenshot - look for input next to "Street Address containing" label
                address_selectors = [
                    'input[id*="STREET_ADD"]',
                    'input[id*="StreetAddress"]',
                    'input[name*="STREET_ADD"]',
                    'input[name*="StreetAddress"]',
                ]

                address_field = None
                for selector in address_selectors:
                    try:
                        address_field = await page.wait_for_selector(selector, timeout=3000)
                        if address_field:
                            logger.info(f"Found address field with selector: {selector}")
                            break
                    except:
                        continue

                if not address_field:
                    # Try using XPath to find input next to Street Address label
                    try:
                        # Get all text inputs in the Property Criteria section
                        inputs = await page.query_selector_all('input[type="text"]')
                        if len(inputs) >= 2:
                            # Second input is usually Street Address
                            address_field = inputs[1]
                            logger.info("Using 2nd text input as address field")
                    except Exception as e:
                        logger.warning(f"Could not find address field: {e}")
                        await page.screenshot(path=str(OUTPUT_DIR / f'avery_debug_{pattern}.png'))
                        continue

                if address_field:
                    await address_field.click()
                    await address_field.fill('')
                    await address_field.type(pattern, delay=50)
                    await asyncio.sleep(0.5)
                    logger.info(f"Entered search pattern: '{pattern}'")

                # Click search button - try multiple selectors
                search_clicked = False
                search_selectors = [
                    'input[type="button"][value="Search"]',
                    'input[type="submit"][value="Search"]',
                    'input[value="Search"]',
                    'button:has-text("Search")',
                    '#ctl00_PageContent_btnSearch',
                    'input[id*="Search"]',
                    'input[id*="btnSearch"]',
                ]

                for selector in search_selectors:
                    try:
                        search_btn = await page.query_selector(selector)
                        if search_btn:
                            await search_btn.click()
                            logger.info(f"Clicked Search button with selector: {selector}")
                            search_clicked = True
                            break
                    except:
                        continue

                if not search_clicked:
                    # Try clicking by visible text
                    try:
                        await page.click('text=Search', timeout=3000)
                        logger.info("Clicked Search by text")
                        search_clicked = True
                    except:
                        logger.warning("Could not click search button")
                        await page.screenshot(path=str(OUTPUT_DIR / f'avery_search_debug_{pattern}.png'))
                        continue

                await asyncio.sleep(2)
                await page.wait_for_load_state('networkidle', timeout=30000)

                # Take debug screenshot of first pattern
                if pattern == '1':
                    await page.screenshot(path=str(OUTPUT_DIR / 'avery_after_search.png'))
                    logger.info("Saved post-search screenshot")

                # Paginate through results
                page_num = 1
                while True:
                    # Extract table data
                    rows = await page.query_selector_all('table.gridview tr, table.rgMasterTable tr, table[id*="Grid"] tr')

                    if len(rows) <= 1:  # Only header row or no rows
                        break

                    for row in rows[1:]:  # Skip header
                        cells = await row.query_selector_all('td')
                        if len(cells) >= 4:
                            try:
                                record = {
                                    'file_id': await cells[0].inner_text() if len(cells) > 0 else '',
                                    'pin': await cells[1].inner_text() if len(cells) > 1 else '',
                                    'permit_num': await cells[2].inner_text() if len(cells) > 2 else '',
                                    'street_address': await cells[3].inner_text() if len(cells) > 3 else '',
                                    'city': await cells[4].inner_text() if len(cells) > 4 else '',
                                    'state': 'NC',
                                    'zip_code': await cells[5].inner_text() if len(cells) > 5 else '',
                                    'owner_name': await cells[6].inner_text() if len(cells) > 6 else '',
                                    'county': 'Avery',
                                    '_source': 'CDPEHS_NC',
                                    '_pattern': pattern
                                }

                                # Create unique ID
                                unique_id = f"{record['file_id']}_{record['pin']}_{record['permit_num']}"

                                if unique_id not in seen_ids and record['file_id']:
                                    seen_ids.add(unique_id)
                                    all_records.append(record)
                                    pattern_records += 1
                            except Exception as e:
                                continue

                    # Try to click next page
                    next_selectors = [
                        'a[title="Next Page"]',
                        'input[title="Next Page"]',
                        '.rgPageNext',
                        'a:has-text("›")',
                        'a:has-text("Next")'
                    ]

                    next_clicked = False
                    for selector in next_selectors:
                        try:
                            next_btn = await page.query_selector(selector)
                            if next_btn:
                                is_disabled = await next_btn.get_attribute('disabled')
                                class_name = await next_btn.get_attribute('class') or ''

                                if not is_disabled and 'disabled' not in class_name.lower():
                                    await next_btn.click()
                                    await asyncio.sleep(1)
                                    await page.wait_for_load_state('networkidle', timeout=15000)
                                    next_clicked = True
                                    page_num += 1
                                    break
                        except:
                            continue

                    if not next_clicked:
                        break

                logger.info(f"  Pattern '{pattern}': {pattern_records} records (Total unique: {len(all_records)})")

                # Save checkpoint every 5 patterns
                if SEARCH_PATTERNS.index(pattern) % 5 == 4:
                    checkpoint_file = OUTPUT_DIR / f'avery_checkpoint_{pattern}.json'
                    with open(checkpoint_file, 'w') as f:
                        json.dump({
                            'county': 'Avery',
                            'state': 'North Carolina',
                            'last_pattern': pattern,
                            'unique_count': len(all_records),
                            'records': all_records
                        }, f)
                    logger.info(f"  Checkpoint saved: {checkpoint_file}")

        except Exception as e:
            logger.error(f"Error during scraping: {e}")

        finally:
            await browser.close()

    # Save final results
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = OUTPUT_DIR / f'avery_county_{timestamp}.json'

    with open(output_file, 'w') as f:
        json.dump({
            'county': 'Avery',
            'state': 'North Carolina',
            'count': len(all_records),
            'extracted_at': datetime.now().isoformat(),
            'records': all_records
        }, f)

    logger.info(f"\nAVERY COUNTY COMPLETE: {len(all_records):,} unique records")
    logger.info(f"Saved: {output_file}")

    return all_records


if __name__ == '__main__':
    asyncio.run(scrape_avery_county())
