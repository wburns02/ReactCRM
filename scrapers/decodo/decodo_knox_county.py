#!/usr/bin/env python3
"""
Knox County Tennessee Septic Records Scraper using Decodo API

This scraper uses Decodo's Web Scraping API to access Knox County's permit portal
which requires JavaScript rendering.

Portal: https://epw-permitsubmit.knoxcountytn.gov/
Target: Knox County septic/sewage disposal permits

Decodo API Docs: https://help.decodo.com/docs/web-scraping-api-introduction
"""

import asyncio
import json
import logging
import os
import time
from datetime import datetime
from pathlib import Path
import requests

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('knox_county_decodo.log')
    ]
)
logger = logging.getLogger(__name__)

# Decodo API Configuration
# Get credentials from environment variables or set them here
DECODO_USERNAME = os.getenv('DECODO_USERNAME', 'sp8b4zyxfs')
DECODO_PASSWORD = os.getenv('DECODO_PASSWORD', '0lc1bmjJ49laKet_BL')

DECODO_API_URL = 'https://scraper-api.decodo.com/v2/scrape'

# Knox County Configuration
KNOX_PERMIT_PORTAL = 'https://epw-permitsubmit.knoxcountytn.gov/'
KNOX_HEALTH_DEPT_URL = 'https://www.knoxcounty.org/health/groundwater_protection/'

# Output configuration
if os.name == 'nt':
    OUTPUT_DIR = Path("C:/Users/Will/crm-work/ReactCRM/scrapers/output/knox_county")
else:
    OUTPUT_DIR = Path("/home/will/scrapers/output/knox_county")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def scrape_with_decodo(url: str, render_js: bool = True) -> dict:
    """
    Scrape a URL using Decodo's Web Scraping API.

    Args:
        url: The URL to scrape
        render_js: Whether to use JavaScript rendering

    Returns:
        Dict with the scraping result
    """
    payload = {
        'target': 'universal',
        'url': url,
        'headless': 'chrome' if render_js else 'html',
    }

    try:
        response = requests.post(
            DECODO_API_URL,
            json=payload,
            auth=(DECODO_USERNAME, DECODO_PASSWORD),
            timeout=120
        )

        if response.status_code == 200:
            return {
                'success': True,
                'content': response.text,
                'status_code': response.status_code
            }
        else:
            logger.error(f"Decodo API error: {response.status_code} - {response.text}")
            return {
                'success': False,
                'error': response.text,
                'status_code': response.status_code
            }

    except Exception as e:
        logger.error(f"Request failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'status_code': 0
        }


def explore_knox_portal():
    """
    Explore the Knox County permit portal to understand its structure.
    """
    logger.info("=" * 60)
    logger.info("EXPLORING KNOX COUNTY PERMIT PORTAL")
    logger.info("=" * 60)

    # First, fetch the main portal page with JS rendering
    logger.info(f"Fetching: {KNOX_PERMIT_PORTAL}")
    result = scrape_with_decodo(KNOX_PERMIT_PORTAL, render_js=True)

    if result['success']:
        # Save the HTML for analysis
        output_file = OUTPUT_DIR / 'knox_portal_rendered.html'
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(result['content'])
        logger.info(f"Saved rendered HTML to: {output_file}")

        # Try to find forms, search fields, etc.
        content = result['content'].lower()

        if 'search' in content:
            logger.info("Found 'search' keyword in page")
        if 'permit' in content:
            logger.info("Found 'permit' keyword in page")
        if 'septic' in content:
            logger.info("Found 'septic' keyword in page")
        if 'form' in content:
            logger.info("Found 'form' keyword in page")

        return result['content']
    else:
        logger.error(f"Failed to fetch portal: {result['error']}")
        return None


def explore_health_dept():
    """
    Explore the Knox County Health Dept groundwater page.
    """
    logger.info("=" * 60)
    logger.info("EXPLORING KNOX COUNTY HEALTH DEPT")
    logger.info("=" * 60)

    logger.info(f"Fetching: {KNOX_HEALTH_DEPT_URL}")
    result = scrape_with_decodo(KNOX_HEALTH_DEPT_URL, render_js=False)

    if result['success']:
        output_file = OUTPUT_DIR / 'knox_health_dept.html'
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(result['content'])
        logger.info(f"Saved HTML to: {output_file}")
        return result['content']
    else:
        logger.error(f"Failed to fetch: {result['error']}")
        return None


def main():
    """Main entry point."""
    logger.info("=" * 60)
    logger.info("KNOX COUNTY DECODO SCRAPER - STARTING")
    logger.info("=" * 60)

    # Verify Decodo credentials
    if DECODO_USERNAME == 'YOUR_USERNAME':
        logger.error("Please set DECODO_USERNAME and DECODO_PASSWORD environment variables")
        logger.error("Or update the credentials in this script")
        return

    # Explore the portals
    portal_html = explore_knox_portal()
    health_html = explore_health_dept()

    if portal_html:
        logger.info("Portal exploration complete. Review the saved HTML files.")
        logger.info("Next steps:")
        logger.info("1. Analyze the HTML structure")
        logger.info("2. Identify search forms and parameters")
        logger.info("3. Implement targeted scraping logic")

    logger.info("=" * 60)
    logger.info("EXPLORATION COMPLETE")
    logger.info("=" * 60)


if __name__ == '__main__':
    main()
