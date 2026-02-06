#!/usr/bin/env python3
"""
Knox County Permit Portal Scraper

Scrapes permit data from Knox County's EPW Permit Submit portal.
Uses Playwright WITHOUT proxy since direct access works and datacenter IPs are blocked.

Portal: https://epw-permitsubmit.knoxcountytn.gov/
"""

import asyncio
import json
import logging
import os
from datetime import datetime
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('knox_county_scraper.log')
    ]
)
logger = logging.getLogger(__name__)

# Output directory
if os.name == 'nt':
    OUTPUT_DIR = Path("C:/Users/Will/crm-work/ReactCRM/scrapers/output/knox_county")
else:
    OUTPUT_DIR = Path("/home/will/scrapers/output/knox_county")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

BASE_URL = "https://epw-permitsubmit.knoxcountytn.gov"


async def explore_portal():
    """
    Explore the Knox County permit portal to understand its structure.
    This SPA likely has search functionality we need to discover.
    """
    from playwright.async_api import async_playwright

    logger.info("=" * 60)
    logger.info("EXPLORING KNOX COUNTY PERMIT PORTAL")
    logger.info("=" * 60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
        )

        page = await context.new_page()

        # Enable request/response logging to find API endpoints
        api_calls = []

        async def log_request(request):
            if 'api' in request.url.lower() or 'permit' in request.url.lower():
                api_calls.append({
                    'url': request.url,
                    'method': request.method,
                    'type': 'request'
                })

        async def log_response(response):
            if 'api' in response.url.lower() or 'permit' in response.url.lower():
                api_calls.append({
                    'url': response.url,
                    'status': response.status,
                    'type': 'response'
                })

        page.on('request', log_request)
        page.on('response', log_response)

        try:
            logger.info(f"Navigating to {BASE_URL}")
            await page.goto(BASE_URL, wait_until='networkidle', timeout=60000)
            await asyncio.sleep(5)  # Wait for SPA to render

            # Take screenshot
            screenshot_path = OUTPUT_DIR / "knox_portal_home.png"
            await page.screenshot(path=str(screenshot_path))
            logger.info(f"Screenshot saved: {screenshot_path}")

            # Get page content
            content = await page.content()
            html_path = OUTPUT_DIR / "knox_portal_home.html"
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(content)
            logger.info(f"HTML saved: {html_path}")

            # Log page title and URL
            title = await page.title()
            logger.info(f"Page title: {title}")
            logger.info(f"Current URL: {page.url}")

            # Look for search inputs, buttons, navigation
            logger.info("Looking for interactive elements...")

            # Find all buttons
            buttons = await page.query_selector_all('button')
            logger.info(f"Found {len(buttons)} buttons")
            for i, btn in enumerate(buttons[:10]):
                text = await btn.inner_text()
                logger.info(f"  Button {i+1}: {text[:50] if text else '(no text)'}")

            # Find all inputs
            inputs = await page.query_selector_all('input')
            logger.info(f"Found {len(inputs)} inputs")
            for i, inp in enumerate(inputs[:10]):
                placeholder = await inp.get_attribute('placeholder')
                input_type = await inp.get_attribute('type')
                logger.info(f"  Input {i+1}: type={input_type}, placeholder={placeholder}")

            # Find all links
            links = await page.query_selector_all('a')
            logger.info(f"Found {len(links)} links")
            for i, link in enumerate(links[:10]):
                href = await link.get_attribute('href')
                text = await link.inner_text()
                logger.info(f"  Link {i+1}: {text[:30] if text else '(no text)'} -> {href}")

            # Log API calls found
            logger.info(f"\nAPI calls detected: {len(api_calls)}")
            for call in api_calls:
                logger.info(f"  {call}")

            # Try clicking on "Search" or similar if found
            search_selectors = [
                'text=Search',
                'text=Permits',
                'text=Find',
                'text=Lookup',
                '[placeholder*="search" i]',
                '[placeholder*="permit" i]',
            ]

            for selector in search_selectors:
                try:
                    elem = await page.query_selector(selector)
                    if elem:
                        logger.info(f"Found element matching '{selector}'")
                        await elem.click()
                        await asyncio.sleep(3)

                        # Take another screenshot
                        screenshot2 = OUTPUT_DIR / f"knox_after_click_{selector.replace('*', '').replace('[', '').replace(']', '')[:20]}.png"
                        await page.screenshot(path=str(screenshot2))
                        logger.info(f"Screenshot after click: {screenshot2}")
                        break
                except Exception as e:
                    logger.debug(f"Selector {selector} not found or error: {e}")

            # Save exploration results
            results = {
                'timestamp': datetime.now().isoformat(),
                'url': page.url,
                'title': title,
                'buttons_count': len(buttons),
                'inputs_count': len(inputs),
                'links_count': len(links),
                'api_calls': api_calls,
                'screenshot': str(screenshot_path),
                'html': str(html_path)
            }

            results_file = OUTPUT_DIR / "exploration_results.json"
            with open(results_file, 'w') as f:
                json.dump(results, f, indent=2)
            logger.info(f"Results saved: {results_file}")

            return results

        except Exception as e:
            logger.error(f"Error exploring portal: {e}")
            # Try to save error screenshot
            try:
                error_screenshot = OUTPUT_DIR / f"error_{datetime.now().strftime('%H%M%S')}.png"
                await page.screenshot(path=str(error_screenshot))
                logger.info(f"Error screenshot saved: {error_screenshot}")
            except:
                pass
            return None

        finally:
            await browser.close()


async def main():
    """Main entry point."""
    logger.info("=" * 60)
    logger.info("KNOX COUNTY PERMIT PORTAL SCRAPER")
    logger.info("=" * 60)
    logger.info("Note: Using direct connection (no proxy) - datacenter IPs are blocked")

    results = await explore_portal()

    if results:
        logger.info("=" * 60)
        logger.info("EXPLORATION COMPLETE")
        logger.info(f"Found {results['buttons_count']} buttons, {results['inputs_count']} inputs")
        logger.info(f"API calls detected: {len(results['api_calls'])}")
        logger.info("=" * 60)
    else:
        logger.error("Exploration failed")


if __name__ == '__main__':
    asyncio.run(main())
