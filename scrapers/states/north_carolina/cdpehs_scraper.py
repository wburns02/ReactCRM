#!/usr/bin/env python3
"""
CDPEHS NC County Septic Scraper

Portal: https://public.cdpehs.com/NCENVPBLo/OSW_PROPERTY/ShowOSW_PROPERTYTablePage.aspx
Counties: Alleghany (D5?), Ashe, Watauga

No login required. Uses ASP.NET postback pagination.
"""

import asyncio
import json
import logging
import re
from datetime import datetime
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/nc_cdpehs.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Counties and their codes (verified from portal)
COUNTIES = {
    'Alleghany': '3',
    'Ashe': '5',
    'Watauga': '95'
}

BASE_URL = 'https://public.cdpehs.com/NCENVPBLo/OSW_PROPERTY/ShowOSW_PROPERTYTablePage.aspx'

OUTPUT_DIR = Path('output/north_carolina')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Delays
SHORT_WAIT = 3
MEDIUM_WAIT = 5
LONG_WAIT = 10


async def explore_portal(page):
    """
    Explore the CDPEHS portal structure.
    """
    logger.info('=' * 50)
    logger.info('EXPLORING CDPEHS PORTAL')
    logger.info('=' * 50)

    url = f'{BASE_URL}?ESTTST_CTY=D5'
    logger.info(f'Navigating to {url}')
    await page.goto(url, wait_until='networkidle', timeout=60000)
    await asyncio.sleep(MEDIUM_WAIT)

    # Screenshot
    await page.screenshot(path=str(OUTPUT_DIR / 'cdpehs_main.png'), full_page=True)

    # Get page title
    title = await page.title()
    logger.info(f'Page title: {title}')

    # Find county dropdown
    county_select = await page.query_selector('select[name*="County"], select[id*="County"]')
    if county_select:
        options = await county_select.evaluate('''el => {
            return Array.from(el.options).map(o => ({
                value: o.value,
                text: o.text.trim()
            }));
        }''')
        logger.info(f'Found county dropdown with {len(options)} options:')
        for opt in options:
            logger.info(f'  {opt["text"]} = {opt["value"]}')

    # Find search button
    search_btns = await page.query_selector_all('input[type="submit"], button[type="submit"]')
    logger.info(f'Found {len(search_btns)} submit buttons')

    # Find all form fields
    inputs = await page.query_selector_all('input[type="text"], select')
    logger.info(f'Found {len(inputs)} form inputs')

    for inp in inputs[:20]:
        name = await inp.get_attribute('name') or await inp.get_attribute('id')
        tag = await inp.evaluate('el => el.tagName')
        logger.info(f'  Input: {tag} - {name}')

    # Try to get table structure if data is already showing
    tables = await page.query_selector_all('table')
    logger.info(f'Found {len(tables)} tables')

    # Look for data grid
    grid = await page.query_selector('[id*="Grid"], [class*="grid"], table[id*="gv"]')
    if grid:
        logger.info('Found data grid!')
        # Get headers
        headers = await grid.evaluate('''el => {
            const ths = el.querySelectorAll('th');
            return Array.from(ths).map(th => th.innerText.trim());
        }''')
        logger.info(f'Grid headers: {headers}')

        # Get row count
        rows = await grid.evaluate('''el => {
            return el.querySelectorAll('tbody tr, tr').length;
        }''')
        logger.info(f'Grid rows: {rows}')

    return True


async def search_county(page, county_name, county_code):
    """
    Search for all permits in a specific county.
    """
    logger.info(f'Searching {county_name} (code: {county_code})')

    url = f'{BASE_URL}?ESTTST_CTY={county_code}'
    await page.goto(url, wait_until='networkidle', timeout=60000)
    await asyncio.sleep(MEDIUM_WAIT)

    # Select county in dropdown if needed
    county_select = await page.query_selector('select[name*="County"], select[id*="County"]')
    if county_select:
        # Check if the county is selected
        current = await county_select.evaluate('el => el.value')
        logger.info(f'Current county value: {current}')

        # Try to select by text
        await county_select.select_option(label=county_name)
        await asyncio.sleep(SHORT_WAIT)

    # Click search (might need to just submit or search is automatic)
    search_btn = await page.query_selector('input[value*="Search"], input[type="submit"]')
    if search_btn:
        logger.info('Clicking search button')
        await search_btn.click()
        await asyncio.sleep(LONG_WAIT)

    await page.screenshot(path=str(OUTPUT_DIR / f'cdpehs_{county_name.lower()}_results.png'), full_page=True)

    # Extract results
    results = await extract_table_data(page)
    return results


async def extract_table_data(page):
    """
    Extract all data from the results table, handling pagination.
    """
    all_records = []

    # Find the data table
    table = await page.query_selector('table[id*="gv"], table[class*="grid"], table.data-table')

    if not table:
        # Try to find any table with permit-like data
        tables = await page.query_selector_all('table')
        for t in tables:
            text = await t.inner_text()
            if 'File ID' in text or 'Permit' in text:
                table = t
                break

    if not table:
        logger.warning('No data table found')
        return []

    # Get headers
    headers = await page.evaluate('''() => {
        const table = document.querySelector('table[id*="gv"], table.data-table');
        if (!table) return [];
        const ths = table.querySelectorAll('th');
        return Array.from(ths).map(th => th.innerText.trim());
    }''')

    if not headers:
        logger.warning('No headers found')
        return []

    logger.info(f'Table headers: {headers}')

    page_num = 1
    while True:
        logger.info(f'Extracting page {page_num}...')

        # Get rows
        rows = await page.evaluate('''() => {
            const table = document.querySelector('table[id*="gv"], table.data-table');
            if (!table) return [];
            const trs = table.querySelectorAll('tbody tr');
            return Array.from(trs).map(tr => {
                const tds = tr.querySelectorAll('td');
                return Array.from(tds).map(td => td.innerText.trim());
            }).filter(row => row.length > 0);
        }''')

        if not rows:
            logger.info('No more rows')
            break

        # Convert to dicts
        for row in rows:
            if len(row) >= len(headers):
                record = dict(zip(headers, row[:len(headers)]))
                all_records.append(record)

        logger.info(f'Page {page_num}: {len(rows)} rows, total: {len(all_records)}')

        # Check for next page
        next_link = await page.query_selector('a[href*="Page$Next"], a:text("Next"), a:text(">")')
        if not next_link:
            # Try numbered pagination
            next_num = page_num + 1
            next_link = await page.query_selector(f'a[href*="Page${next_num}"]')

        if not next_link:
            logger.info('No more pages')
            break

        # Check if next is disabled
        is_disabled = await next_link.evaluate('el => el.disabled || el.classList.contains("disabled")')
        if is_disabled:
            break

        # Click next
        await next_link.click()
        await asyncio.sleep(MEDIUM_WAIT)
        page_num += 1

        if page_num > 1000:  # Safety limit
            logger.warning('Hit page limit')
            break

    return all_records


async def scrape_all_counties(page):
    """
    Scrape all three counties by doing a broad search with no filters.
    """
    all_results = {}
    all_records = []

    # Just go to the main page and search everything
    logger.info('=' * 50)
    logger.info('SCRAPING ALL APPALACHIAN DISTRICT COUNTIES')
    logger.info('=' * 50)

    url = BASE_URL
    await page.goto(url, wait_until='networkidle', timeout=60000)
    await asyncio.sleep(MEDIUM_WAIT)

    await page.screenshot(path=str(OUTPUT_DIR / 'cdpehs_initial.png'), full_page=True)

    # Click search without any filters to get all records
    search_link = await page.query_selector('a[id*="Search"], a[onclick*="Search"], input[value*="Search"]')
    if search_link:
        logger.info('Clicking search to get all records...')
        await search_link.click()
        await asyncio.sleep(LONG_WAIT)
    else:
        # Maybe search is triggered by another element
        logger.info('Looking for alternative search trigger...')
        # Try clicking any link with Search in it
        search_el = await page.query_selector('a:text("Search"), input[type="submit"]')
        if search_el:
            await search_el.click()
            await asyncio.sleep(LONG_WAIT)

    await page.screenshot(path=str(OUTPUT_DIR / 'cdpehs_after_search.png'), full_page=True)

    # Extract all records
    all_records = await extract_all_pages(page, 'AllCounties')
    logger.info(f'Total records: {len(all_records)}')

    # Separate by county if we can detect it from the data
    county_records = {'Alleghany': [], 'Ashe': [], 'Watauga': [], 'Unknown': []}

    for record in all_records:
        # Check if any county name appears in the data
        record_str = str(record).lower()
        if 'alleghany' in record_str:
            county_records['Alleghany'].append(record)
        elif 'ashe' in record_str:
            county_records['Ashe'].append(record)
        elif 'watauga' in record_str:
            county_records['Watauga'].append(record)
        else:
            county_records['Unknown'].append(record)

    # Save combined file
    output_file = OUTPUT_DIR / 'nc_appalachian_all_permits.json'
    with open(output_file, 'w') as f:
        json.dump({
            'state': 'North Carolina',
            'district': 'Appalachian',
            'counties': ['Alleghany', 'Ashe', 'Watauga'],
            'portal': 'CDPEHS',
            'extracted_at': datetime.now().isoformat(),
            'total_records': len(all_records),
            'records': all_records
        }, f, indent=2)
    logger.info(f'Saved {len(all_records)} records to {output_file}')

    # Also save per-county if we identified any
    for county_name, records in county_records.items():
        if records and county_name != 'Unknown':
            county_file = OUTPUT_DIR / f'nc_{county_name.lower()}_permits.json'
            with open(county_file, 'w') as f:
                json.dump({
                    'state': 'North Carolina',
                    'county': county_name,
                    'portal': 'CDPEHS',
                    'extracted_at': datetime.now().isoformat(),
                    'record_count': len(records),
                    'records': records
                }, f, indent=2)
            logger.info(f'Saved {len(records)} {county_name} records')

    return {'all': all_records}


async def extract_all_pages(page, county_name):
    """
    Extract all records from paginated table.
    """
    all_records = []
    page_num = 1

    while True:
        logger.info(f'{county_name} - Extracting page {page_num}...')

        # Get row data
        rows = await page.evaluate('''() => {
            const rows = [];
            const trs = document.querySelectorAll('table tr.data-item, table tr[class*="Row"]');

            trs.forEach(tr => {
                const cells = tr.querySelectorAll('td');
                if (cells.length >= 5) {
                    // Parse the multi-line cells
                    const fileInfo = cells[2] ? cells[2].innerText.split('\\n') : [];
                    const addressInfo = cells[3] ? cells[3].innerText.split('\\n') : [];
                    const nameInfo = cells[4] ? cells[4].innerText.split('\\n') : [];
                    const blockInfo = cells[5] ? cells[5].innerText.split('\\n') : [];
                    const subdivision = cells[6] ? cells[6].innerText.trim() : '';

                    rows.push({
                        file_id: fileInfo[0] || '',
                        pin: fileInfo[1] || '',
                        permit_num: fileInfo[2] || '',
                        address: addressInfo[0] || '',
                        city_state_zip: addressInfo[1] || '',
                        owner_name: nameInfo[0] || '',
                        applicant_name: nameInfo[1] || '',
                        block: blockInfo[0] || '',
                        lot: blockInfo[1] || '',
                        subdivision: subdivision
                    });
                }
            });
            return rows;
        }''')

        if not rows:
            # Try alternative extraction
            rows = await page.evaluate('''() => {
                const rows = [];
                const trs = document.querySelectorAll('table tbody tr');

                trs.forEach(tr => {
                    const cells = tr.querySelectorAll('td');
                    if (cells.length >= 5) {
                        rows.push({
                            raw: Array.from(cells).map(c => c.innerText.trim())
                        });
                    }
                });
                return rows;
            }''')

        if not rows:
            logger.info('No more rows found')
            break

        all_records.extend(rows)
        logger.info(f'Page {page_num}: {len(rows)} rows, total: {len(all_records)}')

        # Check page info
        page_info = await page.evaluate('''() => {
            const span = document.querySelector('[id*="PageInfo"]');
            return span ? span.innerText : '';
        }''')
        logger.info(f'Page info: {page_info}')

        # Try to click next page
        next_clicked = False

        # Method 1: Pagination links
        next_link = await page.query_selector('a[id*="Next"]:not([disabled])')
        if next_link:
            try:
                await next_link.click()
                await asyncio.sleep(MEDIUM_WAIT)
                next_clicked = True
            except:
                pass

        # Method 2: Page number input
        if not next_clicked:
            page_input = await page.query_selector('input[id*="CurrentPage"]')
            if page_input:
                current = await page_input.evaluate('el => parseInt(el.value)')
                next_page = current + 1
                await page_input.fill(str(next_page))
                await page.keyboard.press('Enter')
                await asyncio.sleep(MEDIUM_WAIT)

                # Check if page changed
                new_current = await page_input.evaluate('el => parseInt(el.value)')
                if new_current == next_page:
                    next_clicked = True

        if not next_clicked:
            logger.info('No more pages')
            break

        page_num += 1
        if page_num > 500:  # Safety limit
            logger.warning('Hit page limit')
            break

    return all_records


async def main():
    from playwright.async_api import async_playwright

    logger.info('=' * 60)
    logger.info('NC CDPEHS SCRAPER - STARTING')
    logger.info('=' * 60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, slow_mo=500)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        page = await context.new_page()

        try:
            # Scrape all counties
            results = await scrape_all_counties(page)

            # Summary
            total = sum(len(r) for r in results.values())
            logger.info('=' * 60)
            logger.info('SCRAPING COMPLETE')
            logger.info('=' * 60)
            for county, records in results.items():
                logger.info(f'  {county}: {len(records)} records')
            logger.info(f'TOTAL: {total} records')

        except Exception as e:
            logger.error(f'Error: {e}')
            import traceback
            traceback.print_exc()
            await page.screenshot(path=str(OUTPUT_DIR / 'cdpehs_error.png'))
            raise
        finally:
            await browser.close()


if __name__ == '__main__':
    asyncio.run(main())
