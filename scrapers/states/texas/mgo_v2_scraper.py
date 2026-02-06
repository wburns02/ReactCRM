#!/usr/bin/env python3
"""
MGO Connect Texas Scraper v2

Based on actual dashboard analysis:
- Login successful
- Dashboard has State/Jurisdiction ng-select dropdowns
- Need to select Texas, then jurisdiction, then Continue

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


async def select_state_jurisdiction(page, state_name='Texas'):
    """Select state and get jurisdictions using ng-select dropdowns."""
    logger.info(f'Selecting state: {state_name}')

    await asyncio.sleep(MEDIUM_WAIT)
    await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v2_dashboard.png'), full_page=True)

    # Find State dropdown - look for ng-select or custom dropdown with "Select a State"
    state_dropdown = await page.query_selector('ng-select, .ng-select, [class*="select"]:has-text("State")')
    if not state_dropdown:
        # Try by placeholder text
        state_dropdown = await page.query_selector('[placeholder*="State" i], :has-text("Select a State")')

    if not state_dropdown:
        # Try to find by clicking on the dropdown area
        state_label = await page.query_selector('label:has-text("State"), div:has-text("State *")')
        if state_label:
            parent = await state_label.evaluate_handle('el => el.parentElement')
            state_dropdown = await parent.query_selector('ng-select, .ng-select, [class*="select"]')

    if state_dropdown:
        logger.info('Found State dropdown, clicking...')
        await state_dropdown.click()
        await asyncio.sleep(MEDIUM_WAIT)

        # Wait for options to appear
        await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v2_state_options.png'))

        # Look for Texas in the dropdown options
        texas_option = await page.query_selector(f'[role="option"]:has-text("{state_name}"), .ng-option:has-text("{state_name}"), div:has-text("{state_name}")')

        if not texas_option:
            # Try typing to filter
            await page.keyboard.type(state_name, delay=100)
            await asyncio.sleep(SHORT_WAIT)
            texas_option = await page.query_selector(f'[role="option"]:has-text("{state_name}"), .ng-option:has-text("{state_name}")')

        if texas_option:
            logger.info(f'Found {state_name} option, clicking...')
            await texas_option.click()
            await asyncio.sleep(LONG_WAIT)
            await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v2_texas_selected.png'))
        else:
            logger.warning(f'{state_name} option not found')
            await page.keyboard.press('Escape')
            await asyncio.sleep(5)
            return []
    else:
        logger.warning('State dropdown not found')
        return []

    # Now find Jurisdiction dropdown
    await asyncio.sleep(MEDIUM_WAIT)

    jur_dropdown = await page.query_selector('ng-select:nth-of-type(2), .ng-select:nth-of-type(2)')
    if not jur_dropdown:
        jur_label = await page.query_selector('label:has-text("Jurisdiction"), div:has-text("Jurisdiction *")')
        if jur_label:
            parent = await jur_label.evaluate_handle('el => el.parentElement')
            jur_dropdown = await parent.query_selector('ng-select, .ng-select, [class*="select"]')

    jurisdictions = []
    if jur_dropdown:
        logger.info('Found Jurisdiction dropdown, clicking...')
        await jur_dropdown.click()
        await asyncio.sleep(MEDIUM_WAIT)

        await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v2_jurisdictions.png'))

        # Extract all jurisdiction options
        jurisdictions = await page.evaluate('''() => {
            const options = document.querySelectorAll('[role="option"], .ng-option, .dropdown-item');
            return Array.from(options).map(o => o.innerText.trim()).filter(t => t && !t.includes('Select'));
        }''')

        logger.info(f'Found {len(jurisdictions)} jurisdictions')
        for j in jurisdictions[:10]:
            logger.info(f'  - {j}')

        # Save jurisdictions
        with open(OUTPUT_DIR / 'mgo_texas_jurisdictions.json', 'w') as f:
            json.dump({
                'state': state_name,
                'extracted_at': datetime.now().isoformat(),
                'count': len(jurisdictions),
                'jurisdictions': jurisdictions
            }, f, indent=2)

        await page.keyboard.press('Escape')
        await asyncio.sleep(5)

    return jurisdictions


async def main():
    from playwright.async_api import async_playwright

    logger.info('=' * 60)
    logger.info('MGO CONNECT TEXAS SCRAPER v2')
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
                jurisdictions = await select_state_jurisdiction(page, 'Texas')

                if jurisdictions:
                    logger.info(f'SUCCESS: Found {len(jurisdictions)} Texas jurisdictions')
                else:
                    logger.warning('Could not extract jurisdictions')

        except Exception as e:
            logger.error(f'Error: {e}')
            import traceback
            traceback.print_exc()
            await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v2_error.png'))
        finally:
            await browser.close()


if __name__ == '__main__':
    asyncio.run(main())
