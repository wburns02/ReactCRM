#!/usr/bin/env python3
"""
MGO Connect Texas Recursive Scraper

DELIBERATE, SLOW scraper for MGO Connect portal.
Uses recursive search patterns after login.

Portal: https://www.mgoconnect.org/cp/login
Credentials: willwalterburns@gmail.com / #Espn202512
"""

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

MGO_EMAIL = 'willwalterburns@gmail.com'
MGO_PASSWORD = '#Espn202512'
LOGIN_URL = 'https://www.mgoconnect.org/cp/login'

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/texas')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# VERY slow - user said it will block fast requests
SHORT_WAIT = 15
MEDIUM_WAIT = 25
LONG_WAIT = 40


async def login_to_mgo(page):
    """Login to MGO Connect - SLOW and DELIBERATE."""
    logger.info('Logging into MGO Connect...')

    await page.goto(LOGIN_URL, wait_until='networkidle', timeout=90000)
    await asyncio.sleep(SHORT_WAIT)

    # Find and fill email
    email_field = await page.wait_for_selector('input[name="email"], input[type="email"]', timeout=30000)
    await email_field.click()
    await asyncio.sleep(3)
    await page.keyboard.type(MGO_EMAIL, delay=200)
    await asyncio.sleep(SHORT_WAIT)

    # Find and fill password
    password_field = await page.wait_for_selector('input[type="password"]', timeout=30000)
    await password_field.click()
    await asyncio.sleep(3)
    await page.keyboard.type(MGO_PASSWORD, delay=200)
    await asyncio.sleep(SHORT_WAIT)

    # Screenshot before submit
    await page.screenshot(path=str(OUTPUT_DIR / 'mgo_pre_submit.png'))

    # Find and click the Login button (it's the blue button with "Login" text)
    await page.screenshot(path=str(OUTPUT_DIR / 'mgo_pre_submit.png'))

    # Try multiple selectors for the Login button
    submit_btn = await page.query_selector('button:has-text("Login")')
    if not submit_btn:
        submit_btn = await page.query_selector('button[type="submit"]')
    if not submit_btn:
        submit_btn = await page.query_selector('.btn-primary, .login-btn')
    if not submit_btn:
        # Try any button that looks like login
        buttons = await page.query_selector_all('button')
        for btn in buttons:
            text = await btn.inner_text()
            if 'login' in text.lower():
                submit_btn = btn
                break

    if submit_btn:
        logger.info('Clicking Login button...')
        await submit_btn.click()
        await asyncio.sleep(LONG_WAIT)
        await asyncio.sleep(LONG_WAIT)  # Extra wait for slow site
    else:
        logger.error('Login button not found!')
        return False

    await page.wait_for_load_state('networkidle', timeout=120000)
    await asyncio.sleep(MEDIUM_WAIT)
    await page.screenshot(path=str(OUTPUT_DIR / 'mgo_post_login.png'))

    # Check current URL
    current_url = page.url
    logger.info(f'Current URL after login: {current_url}')

    # Check if logged in
    page_text = await page.evaluate('() => document.body.innerText')
    if any(kw in page_text.lower() for kw in ['dashboard', 'welcome', 'texas', 'jurisdiction', 'select', 'search', 'permit', 'records']):
        logger.info('LOGIN SUCCESSFUL!')
        return True

    # Check if still on login page
    if 'login' in current_url.lower() or 'forgot' in page_text.lower():
        logger.error('Still on login page - login may have failed')
        await page.screenshot(path=str(OUTPUT_DIR / 'mgo_login_failed.png'))
        return False

    logger.warning('Login status unclear - continuing anyway')
    return True


async def click_dropdown_and_select(page, dropdown_selector, option_text):
    """Click a combobox/dropdown and select an option - SLOW."""
    logger.info(f'Opening dropdown for "{option_text}"...')

    # Find the dropdown trigger
    dropdown = await page.query_selector(dropdown_selector)
    if not dropdown:
        logger.warning(f'Dropdown not found: {dropdown_selector}')
        return False

    await dropdown.click()
    await asyncio.sleep(SHORT_WAIT)

    # Wait for options to appear
    await asyncio.sleep(5)

    # Try to find and click the option
    option = await page.query_selector(f'mat-option:has-text("{option_text}"), .mat-option:has-text("{option_text}"), [role="option"]:has-text("{option_text}")')

    if not option:
        # Try clicking by text
        options = await page.query_selector_all('mat-option, .mat-option, [role="option"]')
        for opt in options:
            text = await opt.inner_text()
            if option_text.lower() in text.lower():
                option = opt
                break

    if option:
        await option.click()
        await asyncio.sleep(MEDIUM_WAIT)
        logger.info(f'Selected: {option_text}')
        return True

    # Close dropdown
    await page.keyboard.press('Escape')
    await asyncio.sleep(5)
    return False


async def search_permits(page, search_params):
    """Search for permits with given parameters."""
    records = []

    try:
        # Navigate to search
        search_nav = await page.query_selector('a:has-text("Search"), button:has-text("Search")')
        if search_nav:
            await search_nav.click()
            await asyncio.sleep(MEDIUM_WAIT)

        # Fill search fields
        for field_name, value in search_params.items():
            field = await page.query_selector(f'input[name*="{field_name}" i], input[placeholder*="{field_name}" i]')
            if field:
                await field.fill(value)
                await asyncio.sleep(5)

        # Submit search
        submit_btn = await page.query_selector('button:has-text("Search"), button[type="submit"]')
        if submit_btn:
            await submit_btn.click()
            await asyncio.sleep(LONG_WAIT)

        # Extract results
        await page.wait_for_load_state('networkidle', timeout=60000)

        rows = await page.evaluate('''() => {
            const results = [];
            const table = document.querySelector('table, .results-table');
            if (!table) return results;

            const rows = table.querySelectorAll('tr, .result-row');
            rows.forEach((row, idx) => {
                if (idx === 0) return;
                const cells = row.querySelectorAll('td, .cell');
                if (cells.length >= 3) {
                    results.push({
                        permit_id: cells[0]?.innerText?.trim() || '',
                        address: cells[1]?.innerText?.trim() || '',
                        owner: cells[2]?.innerText?.trim() || '',
                        date: cells[3]?.innerText?.trim() || '',
                        status: cells[4]?.innerText?.trim() || ''
                    });
                }
            });
            return results;
        }''')

        if rows:
            records.extend(rows)
            logger.info(f'Found {len(rows)} results')

    except Exception as e:
        logger.error(f'Search error: {e}')

    return records


async def explore_and_extract(page):
    """Explore the portal and extract available data."""
    logger.info('Exploring MGO Connect portal...')

    await asyncio.sleep(MEDIUM_WAIT)

    # Get page state
    html = await page.content()
    with open(OUTPUT_DIR / 'mgo_dashboard.html', 'w', encoding='utf-8') as f:
        f.write(html)

    # Screenshot
    await page.screenshot(path=str(OUTPUT_DIR / 'mgo_dashboard.png'), full_page=True)

    # Log current URL
    logger.info(f'Dashboard URL: {page.url}')

    # Look for any dropdowns/selects on the page
    selects = await page.query_selector_all('select')
    logger.info(f'Found {len(selects)} select elements')

    # Look for links that might lead to permit search
    links = await page.evaluate('''() => {
        const links = document.querySelectorAll('a');
        return Array.from(links).map(a => ({href: a.href, text: a.innerText.trim()}));
    }''')
    logger.info(f'Found {len(links)} links:')
    for link in links[:15]:
        logger.info(f'  - {link["text"]}: {link["href"]}')

    # Look for navigation items
    nav_items = await page.evaluate('''() => {
        const items = document.querySelectorAll('nav a, .nav a, .menu a, .sidebar a');
        return Array.from(items).map(a => ({href: a.href, text: a.innerText.trim()}));
    }''')
    if nav_items:
        logger.info(f'Navigation items:')
        for item in nav_items[:10]:
            logger.info(f'  - {item["text"]}: {item["href"]}')

    # Try clicking on "Search" or "Permits" or "Records" link
    for keyword in ['search', 'permit', 'record', 'septic', 'owts']:
        search_link = await page.query_selector(f'a:has-text("{keyword}"), button:has-text("{keyword}")')
        if search_link:
            logger.info(f'Found {keyword} link - clicking...')
            await search_link.click()
            await asyncio.sleep(LONG_WAIT)
            await page.wait_for_load_state('networkidle', timeout=60000)
            await page.screenshot(path=str(OUTPUT_DIR / f'mgo_{keyword}_page.png'))

            # Save this page's HTML
            search_html = await page.content()
            with open(OUTPUT_DIR / f'mgo_{keyword}_page.html', 'w', encoding='utf-8') as f:
                f.write(search_html)
            break

    # Now try to find state/jurisdiction selects
    # First look for standard HTML selects
    for select in selects:
        options = await select.evaluate('''el => {
            return Array.from(el.options).map(o => ({value: o.value, text: o.text.trim()}));
        }''')
        if options:
            logger.info(f'Select with {len(options)} options:')
            for opt in options[:5]:
                logger.info(f'  - {opt["text"]} ({opt["value"]})')

            # If this looks like state dropdown, try to select Texas
            for opt in options:
                if 'texas' in opt['text'].lower():
                    logger.info(f'Found Texas in dropdown!')
                    await select.select_option(value=opt['value'])
                    await asyncio.sleep(LONG_WAIT)
                    await page.screenshot(path=str(OUTPUT_DIR / 'mgo_texas_selected.png'))

                    # Now look for jurisdiction dropdown
                    await asyncio.sleep(MEDIUM_WAIT)
                    new_selects = await page.query_selector_all('select')
                    for new_select in new_selects:
                        new_options = await new_select.evaluate('''el => {
                            return Array.from(el.options).map(o => ({value: o.value, text: o.text.trim()}));
                        }''')
                        if new_options and len(new_options) > 10:
                            jurisdictions = [o['text'] for o in new_options if o['text']]
                            logger.info(f'Found {len(jurisdictions)} jurisdictions')
                            with open(OUTPUT_DIR / 'mgo_jurisdictions.json', 'w') as f:
                                json.dump({
                                    'state': 'Texas',
                                    'extracted_at': datetime.now().isoformat(),
                                    'jurisdictions': jurisdictions
                                }, f, indent=2)
                            return jurisdictions

    # If no standard selects, look for Angular Material or custom dropdowns
    dropdowns = await page.query_selector_all('[role="combobox"], [role="listbox"], .dropdown, .select')
    logger.info(f'Found {len(dropdowns)} custom dropdown elements')

    return []


async def main():
    from playwright.async_api import async_playwright

    logger.info('=' * 60)
    logger.info('MGO CONNECT TEXAS RECURSIVE SCRAPER')
    logger.info('=' * 60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, slow_mo=3000)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        page = await context.new_page()

        try:
            # Login
            if await login_to_mgo(page):
                # Explore portal
                jurisdictions = await explore_and_extract(page)

                if jurisdictions:
                    logger.info(f'Successfully extracted {len(jurisdictions)} Texas jurisdictions')
                else:
                    logger.warning('Could not extract jurisdictions')

        except Exception as e:
            logger.error(f'Error: {e}')
            import traceback
            traceback.print_exc()
            await page.screenshot(path=str(OUTPUT_DIR / 'mgo_error.png'))
        finally:
            await browser.close()


if __name__ == '__main__':
    asyncio.run(main())
