#!/usr/bin/env python3
"""
SmartGov NC County Septic Scraper

Counties using SmartGov:
- Catawba: https://co-catawba-nc.smartgovcommunity.com/Public/Home
- Columbus: https://co-columbus-nc.smartgovcommunity.com/Public/Home
- Henderson: https://co-henderson-nc.smartgovcommunity.com/Public/Home

No login required for search.
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
        logging.FileHandler('logs/nc_smartgov.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# SmartGov county portals
COUNTIES = {
    'Catawba': 'https://co-catawba-nc.smartgovcommunity.com',
    'Columbus': 'https://co-columbus-nc.smartgovcommunity.com',
    'Henderson': 'https://co-henderson-nc.smartgovcommunity.com'
}

OUTPUT_DIR = Path('output/north_carolina')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Delays
SHORT_WAIT = 3
MEDIUM_WAIT = 5
LONG_WAIT = 10


async def explore_smartgov(page, county_name, base_url):
    """
    Explore SmartGov portal structure.
    """
    logger.info(f'=' * 50)
    logger.info(f'EXPLORING {county_name.upper()} SMARTGOV')
    logger.info(f'=' * 50)

    url = f'{base_url}/Public/Home'
    logger.info(f'Navigating to {url}')
    await page.goto(url, wait_until='networkidle', timeout=60000)
    await asyncio.sleep(MEDIUM_WAIT)

    await page.screenshot(path=str(OUTPUT_DIR / f'smartgov_{county_name.lower()}_home.png'), full_page=True)

    # Get page title
    title = await page.title()
    logger.info(f'Page title: {title}')

    # Find all links
    links = await page.evaluate('''() => {
        return Array.from(document.querySelectorAll('a')).map(a => ({
            href: a.href,
            text: a.innerText.trim()
        })).filter(l => l.text);
    }''')

    logger.info(f'Found {len(links)} links')
    for link in links[:30]:
        if any(kw in link['text'].lower() for kw in ['permit', 'search', 'application', 'parcel']):
            logger.info(f'  Relevant: {link["text"]} -> {link["href"]}')

    # Look for permit search page
    permit_links = [l for l in links if 'permit' in l['text'].lower() or 'application' in l['text'].lower()]

    if permit_links:
        logger.info(f'Found permit links: {permit_links}')
        # Try the first permit-related link
        await page.goto(permit_links[0]['href'], wait_until='networkidle', timeout=60000)
        await asyncio.sleep(MEDIUM_WAIT)
        await page.screenshot(path=str(OUTPUT_DIR / f'smartgov_{county_name.lower()}_permits.png'), full_page=True)

    return links


async def search_permits(page, county_name, base_url):
    """
    Search for septic permits in SmartGov.
    """
    logger.info(f'Searching permits in {county_name}...')

    # Try direct permit search URL patterns
    search_urls = [
        f'{base_url}/ApplicationPublic/ApplicationHome',
        f'{base_url}/PermitSearch/Index',
        f'{base_url}/Public/PermitSearch',
        f'{base_url}/ApplicationPublic/Search'
    ]

    for search_url in search_urls:
        try:
            logger.info(f'Trying {search_url}')
            await page.goto(search_url, wait_until='networkidle', timeout=30000)
            await asyncio.sleep(MEDIUM_WAIT)

            # Check if we're on a search page
            page_text = await page.evaluate('() => document.body.innerText')
            if 'search' in page_text.lower() or 'permit' in page_text.lower():
                logger.info(f'Found search page at {search_url}')
                await page.screenshot(path=str(OUTPUT_DIR / f'smartgov_{county_name.lower()}_search.png'), full_page=True)
                break
        except:
            continue

    # Look for search form
    search_form = await page.query_selector('form, [id*="search"], [class*="search"]')
    if not search_form:
        logger.warning('No search form found')
        return []

    # Try searching for "septic"
    search_input = await page.query_selector('input[type="text"], input[type="search"], input[name*="search"], input[id*="search"]')
    if search_input:
        logger.info('Found search input, searching for septic...')
        await search_input.fill('septic')
        await asyncio.sleep(SHORT_WAIT)

        # Look for search button
        search_btn = await page.query_selector('button[type="submit"], input[type="submit"], button:text("Search")')
        if search_btn:
            await search_btn.click()
            await asyncio.sleep(LONG_WAIT)

        await page.screenshot(path=str(OUTPUT_DIR / f'smartgov_{county_name.lower()}_results.png'), full_page=True)

    # Extract results
    results = await extract_results(page)
    return results


async def extract_results(page):
    """
    Extract search results from SmartGov.
    """
    results = []

    # Look for results table or list
    table = await page.query_selector('table, [class*="results"], [class*="list"]')
    if not table:
        logger.warning('No results container found')
        return []

    # Get all rows
    rows = await page.evaluate('''() => {
        const rows = [];
        // Try table rows
        document.querySelectorAll('table tbody tr, .result-item, .list-item').forEach(row => {
            const cells = row.querySelectorAll('td, .field, .value');
            if (cells.length > 0) {
                rows.push(Array.from(cells).map(c => c.innerText.trim()));
            }
        });
        return rows;
    }''')

    logger.info(f'Found {len(rows)} result rows')
    for row in rows:
        results.append({'data': row})

    return results


async def main():
    from playwright.async_api import async_playwright

    logger.info('=' * 60)
    logger.info('NC SMARTGOV SCRAPER - STARTING')
    logger.info('=' * 60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, slow_mo=500)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        page = await context.new_page()

        all_results = {}

        for county_name, base_url in COUNTIES.items():
            try:
                logger.info(f'\n{"=" * 60}')
                logger.info(f'PROCESSING {county_name.upper()}')
                logger.info(f'{"=" * 60}')

                # Explore portal
                await explore_smartgov(page, county_name, base_url)

                # Search permits
                results = await search_permits(page, county_name, base_url)
                all_results[county_name] = results

                # Save county results
                if results:
                    county_file = OUTPUT_DIR / f'nc_{county_name.lower()}_smartgov_permits.json'
                    with open(county_file, 'w') as f:
                        json.dump({
                            'state': 'North Carolina',
                            'county': county_name,
                            'portal': 'SmartGov',
                            'extracted_at': datetime.now().isoformat(),
                            'record_count': len(results),
                            'records': results
                        }, f, indent=2)
                    logger.info(f'Saved {len(results)} records for {county_name}')

                await asyncio.sleep(MEDIUM_WAIT)

            except Exception as e:
                logger.error(f'Error processing {county_name}: {e}')
                import traceback
                traceback.print_exc()
                await page.screenshot(path=str(OUTPUT_DIR / f'smartgov_{county_name.lower()}_error.png'))

        # Summary
        logger.info('\n' + '=' * 60)
        logger.info('SCRAPING COMPLETE')
        logger.info('=' * 60)
        total = 0
        for county, results in all_results.items():
            logger.info(f'  {county}: {len(results)} records')
            total += len(results)
        logger.info(f'TOTAL: {total} records')

        await browser.close()


if __name__ == '__main__':
    asyncio.run(main())
