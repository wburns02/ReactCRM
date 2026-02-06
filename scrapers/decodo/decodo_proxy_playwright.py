#!/usr/bin/env python3
"""
Playwright Scraper with Decodo Proxy Support

Uses Decodo's datacenter proxies with Playwright for scraping
Tennessee contract county portals that may have anti-bot measures.

Decodo Proxy Config:
- Address: dc.decodo.com
- Ports: 10001-10010
- Username: sp8b4zyxfs
- Password: 0lc1bmjJ49laKet_BL
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
        logging.FileHandler('decodo_proxy_scraper.log')
    ]
)
logger = logging.getLogger(__name__)

# Decodo Proxy Configuration (credentials from DECODO_PROXY_GUIDE.md)
DECODO_PROXY = {
    'server': 'http://dc.decodo.com:10001',
    'username': 'OpusCLI',
    'password': 'h+Mpb3hlLt1c5B1mpL'
}

# Output directory
if os.name == 'nt':
    OUTPUT_DIR = Path("C:/Users/Will/crm-work/ReactCRM/scrapers/output/contract_counties")
else:
    OUTPUT_DIR = Path("/home/will/scrapers/output/contract_counties")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


async def scrape_with_proxy(url: str, save_screenshot: bool = True) -> dict:
    """
    Scrape a URL using Playwright with Decodo proxy.

    Args:
        url: URL to scrape
        save_screenshot: Whether to save a screenshot

    Returns:
        Dict with page content and metadata
    """
    from playwright.async_api import async_playwright

    logger.info(f"Scraping: {url}")
    logger.info(f"Using proxy: {DECODO_PROXY['server']}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            proxy={
                'server': DECODO_PROXY['server'],
                'username': DECODO_PROXY['username'],
                'password': DECODO_PROXY['password']
            }
        )

        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )

        page = await context.new_page()

        try:
            # Navigate to page
            response = await page.goto(url, wait_until='networkidle', timeout=60000)
            await asyncio.sleep(3)  # Extra wait for JS

            # Get page content
            content = await page.content()
            title = await page.title()

            # Generate safe filename
            safe_filename = url.replace('https://', '').replace('http://', '').replace('/', '_')[:50]

            # Save screenshot if requested
            screenshot_path = None
            if save_screenshot:
                screenshot_path = OUTPUT_DIR / f"{safe_filename}.png"
                await page.screenshot(path=str(screenshot_path))
                logger.info(f"Screenshot saved: {screenshot_path}")

            # Save HTML
            html_path = OUTPUT_DIR / f"{safe_filename}.html"
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(content)
            logger.info(f"HTML saved: {html_path}")

            result = {
                'success': True,
                'url': url,
                'title': title,
                'status_code': response.status if response else None,
                'content_length': len(content),
                'screenshot': str(screenshot_path) if screenshot_path else None,
                'html_file': str(html_path)
            }

            logger.info(f"Success! Title: {title}, Status: {response.status if response else 'N/A'}")
            return result

        except Exception as e:
            logger.error(f"Error scraping {url}: {e}")

            # Try to save error screenshot
            try:
                error_screenshot = OUTPUT_DIR / f"error_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
                await page.screenshot(path=str(error_screenshot))
            except:
                pass

            return {
                'success': False,
                'url': url,
                'error': str(e)
            }

        finally:
            await browser.close()


async def test_proxy_connection():
    """Test that the proxy connection works."""
    logger.info("Testing proxy connection...")

    # Test with a simple site first
    result = await scrape_with_proxy('https://httpbin.org/ip', save_screenshot=False)

    if result['success']:
        logger.info("Proxy connection successful!")
        return True
    else:
        logger.error(f"Proxy test failed: {result.get('error')}")
        return False


async def explore_knox_county():
    """Explore Knox County permit portal with proxy."""
    logger.info("=" * 60)
    logger.info("EXPLORING KNOX COUNTY PERMIT PORTAL")
    logger.info("=" * 60)

    urls = [
        'https://epw-permitsubmit.knoxcountytn.gov/',
        'https://www.knoxcounty.org/health/groundwater_protection/',
    ]

    results = []
    for url in urls:
        result = await scrape_with_proxy(url)
        results.append(result)
        await asyncio.sleep(2)

    return results


async def explore_williamson_county():
    """Explore Williamson County permit portal with proxy."""
    logger.info("=" * 60)
    logger.info("EXPLORING WILLIAMSON COUNTY PORTAL")
    logger.info("=" * 60)

    urls = [
        'https://www.williamsoncounty-tn.gov/126/Sewage-Disposal',
        'https://williamson.idtplans.com/secure/',  # Login portal
    ]

    results = []
    for url in urls:
        result = await scrape_with_proxy(url)
        results.append(result)
        await asyncio.sleep(2)

    return results


async def main():
    """Main entry point."""
    logger.info("=" * 60)
    logger.info("DECODO PROXY PLAYWRIGHT SCRAPER")
    logger.info("=" * 60)

    # Test proxy first
    if not await test_proxy_connection():
        logger.error("Proxy test failed. Check credentials.")
        return

    # Explore contract county portals
    knox_results = await explore_knox_county()
    williamson_results = await explore_williamson_county()

    # Save summary
    summary = {
        'timestamp': datetime.now().isoformat(),
        'proxy': DECODO_PROXY['server'],
        'knox_county': knox_results,
        'williamson_county': williamson_results
    }

    summary_file = OUTPUT_DIR / 'exploration_summary.json'
    with open(summary_file, 'w') as f:
        json.dump(summary, f, indent=2)

    logger.info(f"Summary saved: {summary_file}")
    logger.info("=" * 60)
    logger.info("EXPLORATION COMPLETE")
    logger.info("=" * 60)


if __name__ == '__main__':
    asyncio.run(main())
