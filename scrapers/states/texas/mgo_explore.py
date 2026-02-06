#!/usr/bin/env python3
"""
MGO Connect Explorer - Find navigation structure.

Goal: After login, explore what's actually visible on the dashboard.
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
        logging.FileHandler('logs/mgo_explore.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Credentials
MGO_EMAIL = 'willwalterburns@gmail.com'
MGO_PASSWORD = '#Espn202512'
LOGIN_URL = 'https://www.mgoconnect.org/cp/login'

OUTPUT_DIR = Path('output/texas')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


async def explore_page(page):
    """Get comprehensive page info."""
    logger.info('Exploring page structure...')

    # Get all visible text
    visible_text = await page.evaluate('''() => {
        return document.body.innerText;
    }''')
    logger.info(f'Visible text (first 2000 chars): {visible_text[:2000]}')

    # Get all links
    links = await page.evaluate('''() => {
        return Array.from(document.querySelectorAll('a')).map(a => ({
            href: a.href,
            text: a.innerText.trim().substring(0, 100),
            visible: a.offsetParent !== null
        })).filter(l => l.visible && l.text);
    }''')
    logger.info(f'Found {len(links)} visible links')
    for link in links[:20]:
        logger.info(f'  Link: {link["text"][:50]} -> {link["href"][:80]}')

    # Get all buttons
    buttons = await page.evaluate('''() => {
        return Array.from(document.querySelectorAll('button, [role="button"]')).map(b => ({
            text: b.innerText.trim().substring(0, 100),
            classes: b.className,
            visible: b.offsetParent !== null
        })).filter(b => b.visible);
    }''')
    logger.info(f'Found {len(buttons)} visible buttons')
    for btn in buttons[:20]:
        logger.info(f'  Button: {btn["text"][:50]}')

    # Get all input fields
    inputs = await page.evaluate('''() => {
        return Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
            type: i.type || i.tagName.toLowerCase(),
            placeholder: i.placeholder,
            name: i.name,
            id: i.id,
            visible: i.offsetParent !== null
        })).filter(i => i.visible);
    }''')
    logger.info(f'Found {len(inputs)} visible inputs')
    for inp in inputs[:20]:
        logger.info(f'  Input: type={inp["type"]}, name={inp["name"]}, placeholder={inp.get("placeholder", "")}')

    # Get all mat-select (Angular Material dropdowns)
    mat_selects = await page.evaluate('''() => {
        return Array.from(document.querySelectorAll('mat-select, [role="combobox"], [role="listbox"]')).map(s => ({
            text: s.innerText.trim(),
            ariaLabel: s.getAttribute('aria-label'),
            visible: s.offsetParent !== null
        })).filter(s => s.visible);
    }''')
    logger.info(f'Found {len(mat_selects)} mat-select elements')
    for sel in mat_selects:
        logger.info(f'  Mat-select: {sel["text"][:50]} (aria: {sel.get("ariaLabel", "")})')

    # Get navigation items
    nav_items = await page.evaluate('''() => {
        return Array.from(document.querySelectorAll('nav a, .nav a, [class*="menu"] a, [class*="nav"] a, li a')).map(a => ({
            href: a.href,
            text: a.innerText.trim().substring(0, 100),
            visible: a.offsetParent !== null
        })).filter(l => l.visible && l.text);
    }''')
    logger.info(f'Found {len(nav_items)} nav items')
    for item in nav_items[:30]:
        logger.info(f'  Nav: {item["text"][:50]} -> {item["href"][:80]}')

    # Look for dropdown triggers
    dropdowns = await page.evaluate('''() => {
        return Array.from(document.querySelectorAll('[class*="dropdown"], [class*="select"], [class*="menu-trigger"]')).map(d => ({
            text: d.innerText.trim().substring(0, 100),
            tag: d.tagName,
            classes: d.className
        }));
    }''')
    logger.info(f'Found {len(dropdowns)} dropdown-like elements')
    for dd in dropdowns[:20]:
        logger.info(f'  Dropdown: {dd["tag"]} - {dd["text"][:50]}')

    return {
        'visible_text': visible_text,
        'links': links,
        'buttons': buttons,
        'inputs': inputs,
        'mat_selects': mat_selects,
        'nav_items': nav_items,
        'dropdowns': dropdowns
    }


async def main():
    from playwright.async_api import async_playwright

    logger.info('=' * 60)
    logger.info('MGO CONNECT EXPLORER')
    logger.info('=' * 60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, slow_mo=1000)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        page = await context.new_page()

        try:
            # Login
            logger.info(f'Navigating to {LOGIN_URL}')
            await page.goto(LOGIN_URL, wait_until='networkidle', timeout=60000)
            await asyncio.sleep(5)

            # Fill email
            email_field = await page.wait_for_selector('input[type="email"], input[name="email"]', timeout=10000)
            await email_field.click()
            await page.keyboard.type(MGO_EMAIL, delay=100)
            await asyncio.sleep(2)

            # Fill password
            pwd_field = await page.wait_for_selector('input[type="password"]', timeout=10000)
            await pwd_field.click()
            await page.keyboard.type(MGO_PASSWORD, delay=100)
            await asyncio.sleep(2)

            # Submit
            submit = await page.query_selector('button[type="submit"], input[type="submit"], button')
            if submit:
                await submit.click()

            # Wait for dashboard
            logger.info('Waiting for dashboard to load...')
            await asyncio.sleep(30)

            # Take screenshot
            await page.screenshot(path=str(OUTPUT_DIR / 'mgo_dashboard_explore.png'), full_page=True)
            logger.info('Screenshot saved')

            # Explore
            info = await explore_page(page)

            # Save exploration results
            with open(OUTPUT_DIR / 'mgo_exploration.json', 'w') as f:
                json.dump({
                    'timestamp': datetime.now().isoformat(),
                    'url': page.url,
                    'title': await page.title(),
                    'links_count': len(info['links']),
                    'buttons_count': len(info['buttons']),
                    'links': info['links'][:50],
                    'buttons': [b['text'] for b in info['buttons'][:50]],
                    'nav_items': info['nav_items'][:50],
                    'visible_text_preview': info['visible_text'][:5000]
                }, f, indent=2)

            logger.info('Exploration complete!')

            # Check if there's a search feature or permit link
            if 'permit' in info['visible_text'].lower() or 'search' in info['visible_text'].lower():
                logger.info('Found permit/search in visible text!')

            # Look for specific menu items
            for link in info['links']:
                if any(kw in link['text'].lower() for kw in ['jurisdiction', 'search', 'permit', 'texas', 'county']):
                    logger.info(f'*** INTERESTING LINK: {link["text"]} -> {link["href"]}')

        except Exception as e:
            logger.error(f'Error: {e}')
            await page.screenshot(path=str(OUTPUT_DIR / 'mgo_error.png'))
            raise
        finally:
            await browser.close()


if __name__ == '__main__':
    asyncio.run(main())
