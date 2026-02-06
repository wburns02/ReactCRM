#!/usr/bin/env python3
"""
MGO Connect Texas Scraper v4

Fixed jurisdiction dropdown selection.
The key is to click the SECOND ng-select after Texas is selected.

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

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/texas')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Very slow timing
SHORT_WAIT = 15
MEDIUM_WAIT = 25
LONG_WAIT = 40


async def login_to_mgo(page):
    """Login to MGO Connect."""
    logger.info('Logging into MGO Connect...')

    await page.goto(LOGIN_URL, wait_until='networkidle', timeout=90000)
    await asyncio.sleep(SHORT_WAIT)

    email_field = await page.wait_for_selector('input[name="email"], input[type="email"]', timeout=30000)
    await email_field.click()
    await asyncio.sleep(3)
    await page.keyboard.type(MGO_EMAIL, delay=200)
    await asyncio.sleep(SHORT_WAIT)

    password_field = await page.wait_for_selector('input[type="password"]', timeout=30000)
    await password_field.click()
    await asyncio.sleep(3)
    await page.keyboard.type(MGO_PASSWORD, delay=200)
    await asyncio.sleep(SHORT_WAIT)

    login_btn = await page.query_selector('button:has-text("Login")')
    if login_btn:
        logger.info('Clicking Login button...')
        await login_btn.click()
        await asyncio.sleep(LONG_WAIT * 2)

    await page.wait_for_load_state('networkidle', timeout=120000)
    await asyncio.sleep(MEDIUM_WAIT)

    if '/home' in page.url or '/portal' in page.url:
        logger.info('LOGIN SUCCESSFUL!')
        return True
    return False


async def select_texas(page):
    """Select Texas from the State dropdown."""
    logger.info('Selecting Texas...')

    await asyncio.sleep(MEDIUM_WAIT)

    # Click on the State dropdown (first dropdown with "Select a State")
    # The dropdown container has class containing ng-select
    state_clicked = await page.evaluate('''() => {
        // Find all ng-select elements
        const ngSelects = document.querySelectorAll('ng-select');
        if (ngSelects.length > 0) {
            // Click the first one (State)
            ngSelects[0].click();
            return 'clicked first ng-select';
        }

        // Alternative: find by placeholder
        const placeholder = Array.from(document.querySelectorAll('*')).find(
            el => el.innerText && el.innerText.includes('Select a State')
        );
        if (placeholder) {
            placeholder.click();
            return 'clicked placeholder';
        }

        return 'not found';
    }''')

    logger.info(f'State dropdown: {state_clicked}')
    await asyncio.sleep(MEDIUM_WAIT)
    await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v4_state_open.png'))

    # Type Texas to filter and select
    await page.keyboard.type('Texas', delay=100)
    await asyncio.sleep(SHORT_WAIT)

    # Click the Texas option or press Enter
    texas_clicked = await page.evaluate('''() => {
        const opts = document.querySelectorAll('.ng-option, [role="option"]');
        for (const opt of opts) {
            const text = opt.innerText.trim();
            if (text === 'Texas' || text.includes('Texas')) {
                opt.click();
                return true;
            }
        }
        return false;
    }''')

    if not texas_clicked:
        await page.keyboard.press('Enter')

    logger.info('Texas selected')
    await asyncio.sleep(LONG_WAIT)
    await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v4_texas_selected.png'))
    return True


async def get_jurisdictions(page):
    """Get all Texas jurisdictions by clicking the second dropdown."""
    logger.info('Getting Texas jurisdictions...')

    await asyncio.sleep(MEDIUM_WAIT)

    # Click the Jurisdiction dropdown (second ng-select)
    jur_clicked = await page.evaluate('''() => {
        const ngSelects = document.querySelectorAll('ng-select');
        if (ngSelects.length > 1) {
            // Click the second one (Jurisdiction)
            ngSelects[1].click();
            return 'clicked second ng-select';
        }

        // Alternative: find by "Select a Jurisdiction" text
        const elements = document.querySelectorAll('*');
        for (const el of elements) {
            if (el.innerText && el.innerText.includes('Select a Jurisdiction')) {
                // Find the clickable parent
                let target = el;
                while (target && !target.classList.contains('ng-select') && target.tagName !== 'NG-SELECT') {
                    target = target.parentElement;
                }
                if (target) {
                    target.click();
                    return 'clicked via placeholder parent';
                }
                el.click();
                return 'clicked placeholder';
            }
        }

        return 'not found';
    }''')

    logger.info(f'Jurisdiction dropdown: {jur_clicked}')
    await asyncio.sleep(MEDIUM_WAIT)
    await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v4_jurisdictions_open.png'))

    # Extract all jurisdiction options
    jurisdictions = await page.evaluate('''() => {
        const opts = document.querySelectorAll('.ng-option, [role="option"], .ng-dropdown-panel-items div');
        const results = [];
        opts.forEach(opt => {
            const text = opt.innerText.trim();
            if (text && !text.includes('Select') && text.length > 1) {
                results.push(text);
            }
        });
        return [...new Set(results)];  // Remove duplicates
    }''')

    logger.info(f'Found {len(jurisdictions)} jurisdictions')
    for j in jurisdictions[:20]:
        logger.info(f'  - {j}')

    # Save jurisdictions list
    with open(OUTPUT_DIR / 'mgo_texas_jurisdictions_v4.json', 'w') as f:
        json.dump({
            'state': 'Texas',
            'extracted_at': datetime.now().isoformat(),
            'count': len(jurisdictions),
            'jurisdictions': jurisdictions
        }, f, indent=2)

    # Close dropdown
    await page.keyboard.press('Escape')
    await asyncio.sleep(5)

    return jurisdictions


async def select_jurisdiction_and_continue(page, jurisdiction):
    """Select a jurisdiction and click Continue."""
    logger.info(f'Selecting jurisdiction: {jurisdiction}')

    # Click jurisdiction dropdown
    await page.evaluate('''() => {
        const ngSelects = document.querySelectorAll('ng-select');
        if (ngSelects.length > 1) ngSelects[1].click();
    }''')
    await asyncio.sleep(SHORT_WAIT)

    # Type to filter
    await page.keyboard.type(jurisdiction[:10], delay=100)
    await asyncio.sleep(SHORT_WAIT)

    # Click matching option
    clicked = await page.evaluate(f'''() => {{
        const opts = document.querySelectorAll('.ng-option, [role="option"]');
        for (const opt of opts) {{
            if (opt.innerText.includes('{jurisdiction.split()[0]}')) {{
                opt.click();
                return true;
            }}
        }}
        return false;
    }}''')

    if not clicked:
        await page.keyboard.press('Enter')

    await asyncio.sleep(MEDIUM_WAIT)

    # Click Continue button
    continue_btn = await page.query_selector('button:has-text("Continue")')
    if continue_btn:
        is_enabled = await continue_btn.evaluate('btn => !btn.disabled')
        if is_enabled:
            logger.info('Clicking Continue...')
            await continue_btn.click()
            await asyncio.sleep(LONG_WAIT)
            await page.wait_for_load_state('networkidle', timeout=120000)
            await page.screenshot(path=str(OUTPUT_DIR / f'mgo_v4_{jurisdiction.replace(" ", "_")[:20]}_page.png'))
            return True

    return False


async def explore_permit_search(page, jurisdiction):
    """Explore the permit search page for a jurisdiction."""
    logger.info(f'Exploring permits for {jurisdiction}...')

    records = []

    # Save the page HTML
    html = await page.content()
    safe_name = jurisdiction.replace(' ', '_')[:20]
    with open(OUTPUT_DIR / f'mgo_v4_{safe_name}_page.html', 'w', encoding='utf-8') as f:
        f.write(html)

    # Look for search functionality
    # Check for links to permit search
    links = await page.evaluate('''() => {
        const links = document.querySelectorAll('a');
        return Array.from(links).map(a => ({
            text: a.innerText.trim(),
            href: a.href
        })).filter(l => l.text);
    }''')

    logger.info(f'Found {len(links)} links on page')
    for link in links[:10]:
        logger.info(f'  - {link["text"]}: {link["href"]}')

    return records


async def main():
    from playwright.async_api import async_playwright

    logger.info('=' * 60)
    logger.info('MGO CONNECT TEXAS SCRAPER v4')
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
                await select_texas(page)
                jurisdictions = await get_jurisdictions(page)

                if jurisdictions:
                    logger.info(f'SUCCESS: Found {len(jurisdictions)} Texas jurisdictions')

                    # Try first jurisdiction
                    if len(jurisdictions) > 0:
                        if await select_jurisdiction_and_continue(page, jurisdictions[0]):
                            await explore_permit_search(page, jurisdictions[0])
                else:
                    logger.warning('Could not get jurisdictions')

        except Exception as e:
            logger.error(f'Error: {e}')
            import traceback
            traceback.print_exc()
            await page.screenshot(path=str(OUTPUT_DIR / 'mgo_v4_error.png'))
        finally:
            await browser.close()


if __name__ == '__main__':
    asyncio.run(main())
