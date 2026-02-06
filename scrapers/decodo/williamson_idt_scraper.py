#!/usr/bin/env python3
"""
Williamson County IDT Plans Scraper

Scrapes permit/project data from Williamson County's IDT Plans portal
using the public search API endpoint.

API: /secure/?action=search.suggest&step=project&fullsearch=1
Search requires 4+ characters
"""

import asyncio
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Optional
import aiohttp

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('williamson_scraper.log')
    ]
)
logger = logging.getLogger(__name__)

# Decodo Proxy Configuration
DECODO_CONFIG = {
    'host': 'dc.decodo.com',
    'ports': [10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009, 10010],
    'username': 'OpusCLI',
    'password': 'h+Mpb3hlLt1c5B1mpL'
}

# Output directory
if os.name == 'nt':
    OUTPUT_DIR = Path("C:/Users/Will/crm-work/ReactCRM/scrapers/output/williamson_county")
else:
    OUTPUT_DIR = Path("/home/will/scrapers/output/williamson_county")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Base URL
BASE_URL = "https://williamson.idtplans.com"
SEARCH_API = "/secure/?action=search.suggest&step=project&fullsearch=1"

# Search patterns - expanded for maximum coverage
SEARCH_PATTERNS = [
    # Numbers 100-9999 (address numbers) - finer granularity
    *[str(i) for i in range(1000, 9999, 50)],
    # Common street names
    'Main', 'Oak ', 'Pine', 'Elm ', 'Park', 'Lake', 'Hill', 'Wood',
    'Spring', 'Cedar', 'Maple', 'River', 'Creek', 'Valley', 'Ridge',
    'Church', 'Mill ', 'North', 'South', 'East', 'West', 'Center',
    'High', 'King', 'Queen', 'Maple', 'Cedar', 'Hickory', 'Walnut',
    # Permit type keywords
    'septic', 'sewer', 'plumb', 'drain', 'tank', 'pump', 'field',
    'repair', 'install', 'permit', 'SSDSLM', 'waste', 'disposal',
    # Common last name prefixes
    'Smith', 'Johns', 'Willi', 'Brown', 'Jones', 'Davis', 'Miller',
    'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White',
    'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark',
    # Years 1970-2026 (full range)
    *[str(year) for year in range(1970, 2027)],
    # Months (for date-based searches)
    '01/', '02/', '03/', '04/', '05/', '06/', '07/', '08/', '09/', '10/', '11/', '12/',
    # Additional address patterns
    *[f'{i} ' for i in range(100, 1000, 50)],  # Lower address numbers with space
]


def get_proxy_url(port_index: int = 0) -> str:
    """Get proxy URL for given port index."""
    port = DECODO_CONFIG['ports'][port_index % len(DECODO_CONFIG['ports'])]
    return f"http://{DECODO_CONFIG['username']}:{DECODO_CONFIG['password']}@{DECODO_CONFIG['host']}:{port}"


async def search_projects(session: aiohttp.ClientSession, term: str, proxy_url: str) -> list:
    """
    Search for projects using the IDT Plans API.

    Args:
        session: aiohttp session
        term: Search term (4+ chars)
        proxy_url: Decodo proxy URL

    Returns:
        List of project results
    """
    if len(term) < 4:
        logger.warning(f"Search term '{term}' too short (need 4+ chars)")
        return []

    url = f"{BASE_URL}{SEARCH_API}"
    params = {'term': term}

    try:
        async with session.get(url, params=params, proxy=proxy_url, timeout=30) as response:
            if response.status == 200:
                # API returns application/x-javascript content-type but it's valid JSON
                text = await response.text()
                data = json.loads(text)
                logger.info(f"Search '{term}': {len(data)} results")
                return data
            else:
                logger.warning(f"Search '{term}' returned status {response.status}")
                return []
    except json.JSONDecodeError as e:
        logger.error(f"Search '{term}' JSON decode error: {e}")
        return []
    except Exception as e:
        logger.error(f"Search '{term}' error: {e}")
        return []


async def test_api_access():
    """Test if the API is accessible through proxy."""
    logger.info("=" * 60)
    logger.info("TESTING WILLIAMSON IDT PLANS API ACCESS")
    logger.info("=" * 60)

    proxy_url = get_proxy_url(0)
    logger.info(f"Using proxy: {proxy_url.split('@')[1]}")

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': f'{BASE_URL}/secure/'
    }

    async with aiohttp.ClientSession(headers=headers) as session:
        # Test with a common search term
        test_terms = ['septic', 'sewer', 'drain']

        for term in test_terms:
            results = await search_projects(session, term, proxy_url)

            if results:
                logger.info(f"SUCCESS! Found {len(results)} results for '{term}'")
                # Show sample
                if len(results) > 0:
                    sample = results[0]
                    logger.info(f"  Sample: {json.dumps(sample)[:300]}...")
                return True

            await asyncio.sleep(2)  # Polite delay

        logger.error("API test failed - no results returned")
        return False


async def scrape_all_projects():
    """Scrape all projects using search patterns."""
    logger.info("=" * 60)
    logger.info("SCRAPING WILLIAMSON COUNTY PROJECTS")
    logger.info("=" * 60)

    all_projects = {}
    proxy_index = 0

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': f'{BASE_URL}/secure/'
    }

    async with aiohttp.ClientSession(headers=headers) as session:
        for i, pattern in enumerate(SEARCH_PATTERNS):
            proxy_url = get_proxy_url(proxy_index)
            proxy_index = (proxy_index + 1) % len(DECODO_CONFIG['ports'])

            logger.info(f"[{i+1}/{len(SEARCH_PATTERNS)}] Searching: '{pattern}'")

            results = await search_projects(session, pattern, proxy_url)

            # Deduplicate by project ID
            for project in results:
                if isinstance(project, dict):
                    proj_id = project.get('id', project.get('value', str(project)))
                    if proj_id not in all_projects:
                        all_projects[proj_id] = project
                elif isinstance(project, str):
                    if project not in all_projects:
                        all_projects[project] = {'id': project, 'label': project}

            # Progress update
            if (i + 1) % 10 == 0:
                logger.info(f"Progress: {i+1}/{len(SEARCH_PATTERNS)} patterns, {len(all_projects)} unique projects")

            # Save checkpoint every 25 patterns
            if (i + 1) % 25 == 0:
                checkpoint_file = OUTPUT_DIR / f"williamson_checkpoint_{i+1}.json"
                with open(checkpoint_file, 'w') as f:
                    json.dump({
                        'timestamp': datetime.now().isoformat(),
                        'patterns_searched': i + 1,
                        'total_projects': len(all_projects),
                        'data': list(all_projects.values())
                    }, f, indent=2)
                logger.info(f"Checkpoint saved: {checkpoint_file}")

            await asyncio.sleep(1.5)  # Polite delay

    # Save final results
    final_file = OUTPUT_DIR / "williamson_projects_all.json"
    with open(final_file, 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_projects': len(all_projects),
            'patterns_searched': len(SEARCH_PATTERNS),
            'data': list(all_projects.values())
        }, f, indent=2)

    logger.info("=" * 60)
    logger.info(f"COMPLETE! {len(all_projects)} unique projects saved to {final_file}")
    logger.info("=" * 60)

    return all_projects


async def main():
    """Main entry point."""
    logger.info("=" * 60)
    logger.info("WILLIAMSON COUNTY IDT PLANS SCRAPER")
    logger.info("=" * 60)

    # First test API access
    if await test_api_access():
        logger.info("API access confirmed, starting full scrape...")
        await scrape_all_projects()
    else:
        logger.error("API access test failed. Check proxy or try without proxy.")


if __name__ == '__main__':
    asyncio.run(main())
