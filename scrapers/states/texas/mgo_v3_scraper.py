#!/usr/bin/env python3
"""
MGO Connect Texas Scraper v3

Based on actual screenshot analysis:
- State dropdown: "Select a State" placeholder
- Jurisdiction dropdown: "Select a Jurisdiction" placeholder
- Continue button (grayed out until selections made)
- Custom dropdowns (not standard HTML selects)

Portal: https://www.mgoconnect.org/cp/home
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
DASHBOARD_URL = 'https://www.mgoconnect.org/cp/home'

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/texas')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Very slow timing - user said it blocks fast requests
SHORT_WAIT = 15
MEDIUM_WAIT = 25
LONG_WAIT = 40


async def login_to_mgo(page):
    """Login to MGO Connect."""
    logger.info('Logging into MGO Connect...')

    await page.goto(LOGIN_URL, wait_until='networkidle', timeout=90000)
    await asyncio.sleep(SHORT_WAIT)

    # Fill email
    email_field = await page.wait_for_selector('input[name="email"], input[type="email"]', timeout=30000)
    await email_field.click()
    await asyncio.sleep(3)
    await page.keyboard.type(MGO_EMAIL, delay=200)
    await asyncio.sleep(SHORT_WAIT)

    # Fill password
    password_field = await page.wait_for_selector('input[type="password"]', timeout=30000)
    await password_field.click()
    await asyncio.sleep(3)
    await page.keyboard.type(MGO_PASSWORD, delay=200)
    await asyncio.sleep(SHORT_WAIT)

    # Click Login button
    login_btn = await page.query_selector('button:has-text("Login")')
    if login_btn:
        logger.info('Clicking Login button...')
        await login_btn.click()
        await asyncio.sleep(LONG_WAIT)
        await asyncio.sleep(LONG_WAIT)

    await page.wait_for_load_state('networkidle', timeout=120000)
    await asyncio.sleep(MEDIUM_WAIT)

    current_url = page.url
    logger.info(f'Current URL: {current_url}')

    if '/home' in current_url or '/portal' in current_url:
        logger.info('LOGIN SUCCESSFUL!')
        return True

    return False


async def select_state_texas(page):
    """Select Texas from the state dropdown using keyboard navigation."""
    logger.info('Selecting Texas from State dropdown...')

    await asyncio.sleep(MEDIUM_WAIT)
    await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v3_before_state.png'), full_page=True)

    # Get all clickable elements that might be the state dropdown
    # The screenshot shows "Select a State" text in a dropdown-like container

    # Try clicking on the dropdown by finding element with "Select a State" text
    state_dropdown = await page.query_selector('div:has-text("Select a State")')

    if not state_dropdown:
        # Try finding by the visible placeholder text
        state_dropdown = await page.evaluate('''() => {
            const elements = document.querySelectorAll('*');
            for (const el of elements) {
                if (el.innerText && el.innerText.includes('Select a State') &&
                    (el.classList.contains('ng-select') ||
                     el.closest('.ng-select') ||
                     el.tagName === 'NG-SELECT' ||
                     el.classList.contains('dropdown') ||
                     el.querySelector('.ng-arrow-wrapper'))) {
                    return true;
                }
            }
            return false;
        }''')

    # Click on the area with "Select a State"
    logger.info('Clicking State dropdown area...')

    # Use JavaScript to find and click the ng-select component
    clicked = await page.evaluate('''() => {
        // Look for ng-select with State label above it
        const labels = document.querySelectorAll('*');
        for (const el of labels) {
            if (el.innerText === 'State *' || el.innerText === 'State*') {
                // Find the next ng-select sibling or nearby element
                let sibling = el.nextElementSibling;
                while (sibling) {
                    if (sibling.tagName === 'NG-SELECT' || sibling.classList.contains('ng-select')) {
                        sibling.click();
                        return 'clicked ng-select';
                    }
                    sibling = sibling.nextElementSibling;
                }
            }
        }

        // Try clicking any ng-select
        const ngSelect = document.querySelector('ng-select');
        if (ngSelect) {
            ngSelect.click();
            return 'clicked first ng-select';
        }

        // Try clicking by placeholder text
        const placeholder = document.querySelector('.ng-placeholder, [class*="placeholder"]');
        if (placeholder && placeholder.innerText.includes('State')) {
            placeholder.click();
            return 'clicked placeholder';
        }

        return 'not found';
    }''')

    logger.info(f'Click result: {clicked}')
    await asyncio.sleep(MEDIUM_WAIT)
    await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v3_dropdown_open.png'), full_page=True)

    # Now try to find Texas in the dropdown options
    # Wait for dropdown panel to appear
    await asyncio.sleep(10)

    # Get all visible dropdown options
    options = await page.evaluate('''() => {
        const opts = document.querySelectorAll('.ng-option, [role="option"], .ng-dropdown-panel-items div, .dropdown-item');
        return Array.from(opts).map(o => o.innerText.trim()).filter(t => t);
    }''')

    logger.info(f'Found {len(options)} dropdown options')
    for opt in options[:20]:
        logger.info(f'  Option: {opt}')

    # Save options
    with open(OUTPUT_DIR / 'mgo_v3_state_options.json', 'w') as f:
        json.dump({'options': options, 'timestamp': datetime.now().isoformat()}, f, indent=2)

    # Try to click Texas
    texas_clicked = await page.evaluate('''() => {
        const opts = document.querySelectorAll('.ng-option, [role="option"], .ng-dropdown-panel-items div');
        for (const opt of opts) {
            if (opt.innerText.trim() === 'Texas' || opt.innerText.trim().includes('Texas')) {
                opt.click();
                return true;
            }
        }
        return false;
    }''')

    if texas_clicked:
        logger.info('Clicked Texas option!')
        await asyncio.sleep(LONG_WAIT)
        await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v3_texas_selected.png'), full_page=True)
        return True
    else:
        # Try typing "Texas" to filter
        logger.info('Texas not found, trying to type to filter...')
        await page.keyboard.type('Texas', delay=150)
        await asyncio.sleep(SHORT_WAIT)
        await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v3_typed_texas.png'), full_page=True)

        # Try clicking again after filtering
        texas_clicked = await page.evaluate('''() => {
            const opts = document.querySelectorAll('.ng-option, [role="option"], .ng-dropdown-panel-items div');
            for (const opt of opts) {
                if (opt.innerText.trim().toLowerCase().includes('texas')) {
                    opt.click();
                    return true;
                }
            }
            return false;
        }''')

        if texas_clicked:
            logger.info('Clicked Texas after typing!')
            await asyncio.sleep(LONG_WAIT)
            return True

        # Press Enter to select first filtered result
        await page.keyboard.press('Enter')
        await asyncio.sleep(MEDIUM_WAIT)

    await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v3_after_state.png'), full_page=True)
    return False


async def get_jurisdictions(page):
    """Get list of jurisdictions after Texas is selected."""
    logger.info('Getting jurisdictions...')

    await asyncio.sleep(MEDIUM_WAIT)

    # Click on Jurisdiction dropdown
    jur_clicked = await page.evaluate('''() => {
        const labels = document.querySelectorAll('*');
        for (const el of labels) {
            if (el.innerText === 'Jurisdiction *' || el.innerText === 'Jurisdiction*') {
                let sibling = el.nextElementSibling;
                while (sibling) {
                    if (sibling.tagName === 'NG-SELECT' || sibling.classList.contains('ng-select')) {
                        sibling.click();
                        return true;
                    }
                    sibling = sibling.nextElementSibling;
                }
            }
        }

        // Try second ng-select
        const ngSelects = document.querySelectorAll('ng-select');
        if (ngSelects.length > 1) {
            ngSelects[1].click();
            return true;
        }
        return false;
    }''')

    if not jur_clicked:
        logger.warning('Could not click Jurisdiction dropdown')
        return []

    await asyncio.sleep(MEDIUM_WAIT)
    await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v3_jurisdictions_open.png'), full_page=True)

    # Get all jurisdictions
    jurisdictions = await page.evaluate('''() => {
        const opts = document.querySelectorAll('.ng-option, [role="option"], .ng-dropdown-panel-items div');
        return Array.from(opts)
            .map(o => o.innerText.trim())
            .filter(t => t && !t.includes('Select') && t.length > 2);
    }''')

    logger.info(f'Found {len(jurisdictions)} jurisdictions')
    for j in jurisdictions[:15]:
        logger.info(f'  - {j}')

    # Save jurisdictions
    with open(OUTPUT_DIR / 'mgo_texas_jurisdictions_v3.json', 'w') as f:
        json.dump({
            'state': 'Texas',
            'extracted_at': datetime.now().isoformat(),
            'count': len(jurisdictions),
            'jurisdictions': jurisdictions
        }, f, indent=2)

    return jurisdictions


async def scrape_jurisdiction(page, jurisdiction_name):
    """Scrape permits for a specific jurisdiction."""
    logger.info(f'Scraping jurisdiction: {jurisdiction_name}')

    records = []

    # Click jurisdiction to select it
    await page.evaluate(f'''() => {{
        const opts = document.querySelectorAll('.ng-option, [role="option"]');
        for (const opt of opts) {{
            if (opt.innerText.trim() === '{jurisdiction_name}') {{
                opt.click();
                return true;
            }}
        }}
        return false;
    }}''')

    await asyncio.sleep(MEDIUM_WAIT)

    # Click Continue button
    continue_btn = await page.query_selector('button:has-text("Continue")')
    if continue_btn:
        await continue_btn.click()
        await asyncio.sleep(LONG_WAIT)
        await page.wait_for_load_state('networkidle', timeout=120000)

    # Look for search or permit listing page
    await page.screenshot(path=str(OUTPUT_DIR / f'mgo_v3_{jurisdiction_name}_page.png'), full_page=True)

    # Try to find permit data
    # This will depend on the actual page structure after Continue
    page_html = await page.content()
    with open(OUTPUT_DIR / f'mgo_v3_{jurisdiction_name}_page.html', 'w', encoding='utf-8') as f:
        f.write(page_html)

    return records


async def main():
    from playwright.async_api import async_playwright

    logger.info('=' * 60)
    logger.info('MGO CONNECT TEXAS SCRAPER v3')
    logger.info('=' * 60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, slow_mo=3000)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        page = await context.new_page()

        try:
            if await login_to_mgo(page):
                # Try to select Texas
                if await select_state_texas(page):
                    # Get jurisdictions
                    jurisdictions = await get_jurisdictions(page)

                    if jurisdictions:
                        logger.info(f'SUCCESS: Found {len(jurisdictions)} Texas jurisdictions')

                        # Try first jurisdiction as test
                        if len(jurisdictions) > 0:
                            await scrape_jurisdiction(page, jurisdictions[0])
                    else:
                        logger.warning('Could not get jurisdictions')
                else:
                    logger.warning('Could not select Texas')

                    # Save page state for debugging
                    html = await page.content()
                    with open(OUTPUT_DIR / 'mgo_v3_debug.html', 'w', encoding='utf-8') as f:
                        f.write(html)

        except Exception as e:
            logger.error(f'Error: {e}')
            import traceback
            traceback.print_exc()
            await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v3_error.png'))
        finally:
            await browser.close()


if __name__ == '__main__':
    asyncio.run(main())
