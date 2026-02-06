#!/usr/bin/env python3
"""
MGO Connect Texas Septic Permit Scraper

DELIBERATE, SLOW scraper for MGO Connect portal.
All actions have 10-30 second waits.

Portal: https://www.mgoconnect.org/cp/login
Credentials: willwalterburns@gmail.com / #Espn202512
"""

import asyncio
import json
import logging
import time
from datetime import datetime
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/mgo_texas.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Credentials (from user)
MGO_EMAIL = 'willwalterburns@gmail.com'
MGO_PASSWORD = '#Espn202512'
LOGIN_URL = 'https://www.mgoconnect.org/cp/login'

# Output directory
OUTPUT_DIR = Path('output/texas')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Delays (in seconds)
SHORT_WAIT = 10
MEDIUM_WAIT = 20
LONG_WAIT = 30
POST_LOGIN_WAIT = 45


async def get_page_state(page):
    """Log current page state for debugging."""
    title = await page.title()
    url = page.url
    logger.info(f'Page state - Title: {title}, URL: {url[:80]}')
    return {'title': title, 'url': url}


async def login_to_mgo(page):
    """
    Login to MGO Connect.
    SLOW and DELIBERATE.
    """
    logger.info('=' * 50)
    logger.info('STARTING LOGIN PROCESS')
    logger.info('=' * 50)

    # Navigate to login page
    logger.info(f'Navigating to {LOGIN_URL}')
    await page.goto(LOGIN_URL, wait_until='networkidle', timeout=60000)
    await asyncio.sleep(SHORT_WAIT)

    await get_page_state(page)

    # Screenshot before login
    await page.screenshot(path=str(OUTPUT_DIR / 'mgo_login_page.png'))
    logger.info('Saved login page screenshot')

    # Find and fill email field
    logger.info('Looking for email field...')
    email_selectors = [
        'input[name="email"]',
        'input[type="email"]',
        'input[id*="email"]',
    ]

    email_field = None
    for sel in email_selectors:
        try:
            email_field = await page.wait_for_selector(sel, timeout=5000)
            if email_field:
                logger.info(f'Found email field: {sel}')
                break
        except:
            continue

    if not email_field:
        logger.error('Could not find email field')
        return False

    # Type email slowly
    logger.info('Typing email slowly...')
    await email_field.click()
    await asyncio.sleep(2)
    await page.keyboard.type(MGO_EMAIL, delay=150)
    await asyncio.sleep(SHORT_WAIT)

    # Find password field
    logger.info('Looking for password field...')
    password_field = await page.wait_for_selector('input[type="password"]', timeout=10000)

    if not password_field:
        logger.error('Could not find password field')
        return False

    # Type password slowly
    logger.info('Typing password slowly...')
    await password_field.click()
    await asyncio.sleep(2)
    await page.keyboard.type(MGO_PASSWORD, delay=150)
    await asyncio.sleep(SHORT_WAIT)

    # Screenshot before submit
    await page.screenshot(path=str(OUTPUT_DIR / 'mgo_before_submit.png'))

    # Find submit button
    logger.info('Looking for submit button...')
    submit_btn = await page.query_selector('button[type="submit"], input[type="submit"]')

    if not submit_btn:
        # Try clicking any button with login text
        submit_btn = await page.query_selector('button')

    if not submit_btn:
        logger.error('Could not find submit button')
        return False

    # Click submit
    logger.info('Clicking submit button...')
    await submit_btn.click()

    # LONG wait after login
    logger.info(f'Waiting {POST_LOGIN_WAIT}s for login to complete...')
    await asyncio.sleep(POST_LOGIN_WAIT)

    # Check if logged in
    await get_page_state(page)
    await page.screenshot(path=str(OUTPUT_DIR / 'mgo_after_login.png'))

    # Look for dashboard indicators
    page_text = await page.evaluate('() => document.body.innerText')

    if any(kw in page_text.lower() for kw in ['dashboard', 'welcome', 'texas', 'jurisdiction', 'select']):
        logger.info('LOGIN SUCCESSFUL!')
        return True
    else:
        logger.warning('Login status unclear')
        logger.info(f'Page text preview: {page_text[:500]}')
        return True  # Continue anyway to check


async def select_mat_option(page, mat_select, option_text):
    """
    Select an option from Angular Material mat-select.
    DELIBERATE and SLOW.
    """
    # Click to open dropdown
    logger.info(f'Clicking mat-select to open dropdown...')
    await mat_select.click()
    await asyncio.sleep(SHORT_WAIT)

    # Wait for options panel to appear
    await page.wait_for_selector('mat-option', timeout=15000)
    await asyncio.sleep(3)

    # Find and click the option
    options = await page.query_selector_all('mat-option')
    logger.info(f'Found {len(options)} mat-options')

    for opt in options:
        text = await opt.inner_text()
        if option_text.lower() in text.lower():
            logger.info(f'Clicking option: {text}')
            await opt.click()
            await asyncio.sleep(MEDIUM_WAIT)
            return True

    logger.warning(f'Option "{option_text}" not found')
    return False


async def get_mat_select_options(page, mat_select):
    """
    Get all options from a mat-select dropdown.
    """
    # Click to open
    logger.info('Opening mat-select to get options...')
    await mat_select.click()
    await asyncio.sleep(SHORT_WAIT)

    # Wait for options
    try:
        await page.wait_for_selector('mat-option', timeout=15000)
        await asyncio.sleep(3)
    except:
        logger.warning('No mat-options appeared')
        return []

    # Get all options
    options = await page.query_selector_all('mat-option')
    result = []

    for opt in options:
        text = await opt.inner_text()
        value = await opt.get_attribute('value') or await opt.get_attribute('ng-value')
        result.append({
            'text': text.strip(),
            'value': value
        })

    # Close dropdown by pressing Escape
    await page.keyboard.press('Escape')
    await asyncio.sleep(3)

    return result


async def get_texas_counties(page):
    """
    Extract list of Texas counties from MGO.
    Uses Angular Material mat-select dropdowns.
    DELIBERATE navigation.
    """
    logger.info('=' * 50)
    logger.info('EXTRACTING TEXAS JURISDICTIONS')
    logger.info('=' * 50)

    await get_page_state(page)

    # Wait for Angular to fully render the page
    logger.info('Waiting for Angular components to load...')
    await asyncio.sleep(LONG_WAIT)

    # Try to wait for specific text that indicates page is ready
    try:
        await page.wait_for_selector('text=Select a State', timeout=30000)
        logger.info('Found "Select a State" text - page loaded')
    except:
        logger.warning('"Select a State" text not found')

    await asyncio.sleep(SHORT_WAIT)

    # Save current page for debugging
    html = await page.content()
    with open(str(OUTPUT_DIR / 'mgo_dashboard.html'), 'w') as f:
        f.write(html)

    # Screenshot before selection
    await page.screenshot(path=str(OUTPUT_DIR / 'mgo_before_state.png'))

    # Try multiple selectors for the dropdown
    mat_selects = await page.query_selector_all('mat-select')
    logger.info(f'Found {len(mat_selects)} mat-select elements')

    # If mat-select not found, try alternative selectors
    if len(mat_selects) == 0:
        # Try role-based selector
        mat_selects = await page.query_selector_all('[role="combobox"]')
        logger.info(f'Found {len(mat_selects)} combobox elements')

    if len(mat_selects) == 0:
        # Try aria-label selector
        state_select = await page.query_selector('[aria-label="Select a State"]')
        jurisdiction_select = await page.query_selector('[aria-label="Select a Jurisdiction"]')
        if state_select and jurisdiction_select:
            mat_selects = [state_select, jurisdiction_select]
            logger.info('Found selects via aria-label')

    if len(mat_selects) == 0:
        # Last resort: find by visible text container
        logger.info('Trying to find by text content...')
        all_elements = await page.evaluate('''() => {
            const elements = [];
            document.querySelectorAll('*').forEach(el => {
                if (el.innerText && el.innerText.includes('Select a State')) {
                    elements.push({
                        tag: el.tagName,
                        class: el.className,
                        id: el.id
                    });
                }
            });
            return elements.slice(0, 10);
        }''')
        logger.info(f'Elements containing "Select a State": {all_elements}')

    if len(mat_selects) < 2:
        logger.error('Expected at least 2 mat-select elements (State, Jurisdiction)')
        return []

    state_select = mat_selects[0]
    jurisdiction_select = mat_selects[1]

    # Step 1: Get state options
    logger.info('Getting state options...')
    state_options = await get_mat_select_options(page, state_select)
    logger.info(f'Found {len(state_options)} states')
    for opt in state_options[:10]:
        logger.info(f'  State: {opt["text"]}')

    await asyncio.sleep(SHORT_WAIT)

    # Step 2: Select Texas
    logger.info('Selecting Texas...')
    state_select = (await page.query_selector_all('mat-select'))[0]
    texas_found = await select_mat_option(page, state_select, 'Texas')

    if not texas_found:
        logger.error('Could not select Texas')
        return []

    await page.screenshot(path=str(OUTPUT_DIR / 'mgo_texas_selected.png'))
    await asyncio.sleep(LONG_WAIT)

    # Step 3: Get jurisdiction options (should now show Texas counties)
    logger.info('Getting jurisdiction options...')
    mat_selects = await page.query_selector_all('mat-select')
    if len(mat_selects) < 2:
        logger.error('Jurisdiction select not found after state selection')
        return []

    jurisdiction_select = mat_selects[1]
    jurisdictions = await get_mat_select_options(page, jurisdiction_select)
    logger.info(f'Found {len(jurisdictions)} Texas jurisdictions')

    for j in jurisdictions[:20]:
        logger.info(f'  Jurisdiction: {j["text"]}')

    # Save jurisdiction list
    if jurisdictions:
        output_file = OUTPUT_DIR / 'mgo_texas_jurisdictions.json'
        with open(output_file, 'w') as f:
            json.dump({
                'state': 'Texas',
                'portal': 'MGO Connect',
                'extracted_at': datetime.now().isoformat(),
                'jurisdiction_count': len(jurisdictions),
                'jurisdictions': jurisdictions
            }, f, indent=2)
        logger.info(f'Saved {len(jurisdictions)} jurisdictions to {output_file}')

    await page.screenshot(path=str(OUTPUT_DIR / 'mgo_jurisdictions.png'))

    return jurisdictions


async def main():
    """Main entry point."""
    from playwright.async_api import async_playwright

    logger.info('=' * 60)
    logger.info('MGO TEXAS SCRAPER - STARTING')
    logger.info('=' * 60)

    async with async_playwright() as p:
        # Launch browser with slow_mo for deliberate actions
        browser = await p.chromium.launch(
            headless=True,
            slow_mo=2000,  # 2 second delay between actions
        )

        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )

        page = await context.new_page()

        try:
            # Step 1: Login
            login_success = await login_to_mgo(page)

            if login_success:
                # Step 2: Get counties
                counties = await get_texas_counties(page)

                if counties:
                    logger.info(f'SUCCESS! Found {len(counties)} Texas counties')
                    for county in counties[:10]:
                        logger.info(f'  - {county["text"]}')
                else:
                    logger.warning('No counties found')
            else:
                logger.error('Login failed')

        except Exception as e:
            logger.error(f'Error: {e}')
            await page.screenshot(path=str(OUTPUT_DIR / 'mgo_error.png'))
            raise
        finally:
            await browser.close()


if __name__ == '__main__':
    asyncio.run(main())
