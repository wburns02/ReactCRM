#!/usr/bin/env python3
"""
Buncombe County NC Accela Septic Scraper

Portal: https://aca-prod.accela.com/buncombeconc/default.aspx
Module: Well and Septic (EnvironHealth)

No login required for searching.
"""

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/nc_accela_buncombe.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

BASE_URL = 'https://aca-prod.accela.com/buncombeconc'
SEARCH_URL = f'{BASE_URL}/Cap/CapHome.aspx?module=EnvironHealth&TabName=EnvironHealth'

OUTPUT_DIR = Path('output/north_carolina')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Delays
SHORT_WAIT = 3
MEDIUM_WAIT = 5
LONG_WAIT = 10


async def explore_accela(page):
    """
    Explore the Accela portal structure.
    """
    logger.info('=' * 50)
    logger.info('EXPLORING BUNCOMBE COUNTY ACCELA')
    logger.info('=' * 50)

    # Go to main page first
    logger.info(f'Navigating to {BASE_URL}')
    await page.goto(BASE_URL, wait_until='networkidle', timeout=60000)
    await asyncio.sleep(MEDIUM_WAIT)

    await page.screenshot(path=str(OUTPUT_DIR / 'accela_buncombe_home.png'), full_page=True)

    title = await page.title()
    logger.info(f'Page title: {title}')

    # Look for Well and Septic link
    logger.info('Looking for Well and Septic module...')
    well_septic_link = await page.query_selector('a:text("Well and Septic"), a[href*="EnvironHealth"]')
    if well_septic_link:
        logger.info('Found Well and Septic link, clicking...')
        await well_septic_link.click()
        await asyncio.sleep(MEDIUM_WAIT)
    else:
        # Try direct URL
        logger.info('Trying direct module URL...')
        await page.goto(SEARCH_URL, wait_until='networkidle', timeout=60000)
        await asyncio.sleep(MEDIUM_WAIT)

    await page.screenshot(path=str(OUTPUT_DIR / 'accela_buncombe_module.png'), full_page=True)

    # Look for search form
    search_link = await page.query_selector('a:text("Search Applications"), a[href*="CapSearch"]')
    if search_link:
        logger.info('Found Search Applications link')
        await search_link.click()
        await asyncio.sleep(MEDIUM_WAIT)
        await page.screenshot(path=str(OUTPUT_DIR / 'accela_buncombe_search.png'), full_page=True)

    return True


async def search_permits(page):
    """
    Search for septic permits.
    """
    logger.info('Searching for septic permits...')

    # Try to search with minimal criteria to get all results
    # Look for search button and click it without filling criteria
    search_btn = await page.query_selector('input[value*="Search"], button:text("Search"), a:text("Search")')

    if not search_btn:
        # Maybe need to enter something in permit type first
        permit_type = await page.query_selector('select[id*="PermitType"], select[name*="Type"]')
        if permit_type:
            logger.info('Found permit type dropdown')
            # Get options
            options = await permit_type.evaluate('''el => {
                return Array.from(el.options).map(o => ({
                    value: o.value,
                    text: o.text.trim()
                }));
            }''')
            logger.info(f'Permit types: {options[:10]}')

            # Look for septic-related option
            for opt in options:
                if any(kw in opt['text'].lower() for kw in ['septic', 'wastewater', 'sewer', 'onsite']):
                    logger.info(f'Selecting: {opt["text"]}')
                    await permit_type.select_option(value=opt['value'])
                    await asyncio.sleep(SHORT_WAIT)
                    break

    # Now search
    search_btn = await page.query_selector('input[value*="Search"], button:text("Search")')
    if search_btn:
        logger.info('Clicking search button...')
        await search_btn.click()
        await asyncio.sleep(LONG_WAIT)
        await page.screenshot(path=str(OUTPUT_DIR / 'accela_buncombe_results.png'), full_page=True)

    # Extract results
    results = await extract_results(page)
    return results


async def extract_results(page):
    """
    Extract search results from Accela grid.
    """
    results = []

    # Look for results table
    table = await page.query_selector('table[id*="gdvPermitList"], table.ACA_GridView, table[class*="grid"]')

    if not table:
        logger.warning('No results table found')
        # Get visible text for debugging
        text = await page.evaluate('() => document.body.innerText.substring(0, 3000)')
        logger.info(f'Page text: {text[:1500]}')
        return []

    # Get headers
    headers = await page.evaluate('''() => {
        const table = document.querySelector('table[id*="gdvPermitList"], table.ACA_GridView');
        if (!table) return [];
        const ths = table.querySelectorAll('th');
        return Array.from(ths).map(th => th.innerText.trim()).filter(t => t);
    }''')
    logger.info(f'Headers: {headers}')

    # Get rows
    page_num = 1
    while True:
        logger.info(f'Extracting page {page_num}...')

        rows = await page.evaluate('''() => {
            const table = document.querySelector('table[id*="gdvPermitList"], table.ACA_GridView');
            if (!table) return [];
            const rows = [];
            table.querySelectorAll('tbody tr').forEach(tr => {
                const cells = tr.querySelectorAll('td');
                if (cells.length > 0) {
                    rows.push(Array.from(cells).map(td => td.innerText.trim()));
                }
            });
            return rows;
        }''')

        if not rows:
            logger.info('No more rows')
            break

        logger.info(f'Page {page_num}: {len(rows)} rows')

        # Convert to dicts
        for row in rows:
            if len(row) >= len(headers):
                record = dict(zip(headers, row[:len(headers)]))
                results.append(record)
            else:
                results.append({'raw': row})

        # Check for next page
        next_link = await page.query_selector('a:text("Next"), a[href*="Page$Next"]')
        if not next_link:
            break

        try:
            await next_link.click()
            await asyncio.sleep(MEDIUM_WAIT)
            page_num += 1
        except:
            break

        if page_num > 100:  # Safety limit
            break

    logger.info(f'Total results: {len(results)}')
    return results


async def main():
    from playwright.async_api import async_playwright

    logger.info('=' * 60)
    logger.info('BUNCOMBE COUNTY ACCELA SCRAPER - STARTING')
    logger.info('=' * 60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, slow_mo=500)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        page = await context.new_page()

        try:
            # Explore portal
            await explore_accela(page)

            # Search permits
            results = await search_permits(page)

            # Save results
            if results:
                output_file = OUTPUT_DIR / 'nc_buncombe_accela_permits.json'
                with open(output_file, 'w') as f:
                    json.dump({
                        'state': 'North Carolina',
                        'county': 'Buncombe',
                        'portal': 'Accela',
                        'extracted_at': datetime.now().isoformat(),
                        'record_count': len(results),
                        'records': results
                    }, f, indent=2)
                logger.info(f'Saved {len(results)} records')

            logger.info('Scraping complete!')

        except Exception as e:
            logger.error(f'Error: {e}')
            import traceback
            traceback.print_exc()
            await page.screenshot(path=str(OUTPUT_DIR / 'accela_buncombe_error.png'))
            raise
        finally:
            await browser.close()


if __name__ == '__main__':
    asyncio.run(main())
