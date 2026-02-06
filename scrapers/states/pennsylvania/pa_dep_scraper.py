#!/usr/bin/env python3
"""
Pennsylvania DEP Septic/Sewage Scraper

Source: PA DEP Open Data
URL: https://newdata-padep-1.opendata.arcgis.com/

PA has Act 537 sewage facilities data.
"""

import asyncio
import aiohttp
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

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/pennsylvania')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# PA DEP ArcGIS endpoints
PA_DEP_ENDPOINTS = [
    # PA DEP Open Data Hub
    "https://services1.arcgis.com/yNIg8y7QYVBRy4Lj/arcgis/rest/services",
    # PA GIS Services
    "https://gis.dep.pa.gov/arcgis/rest/services",
    # Alternative
    "https://mapservices.pasda.psu.edu/server/rest/services",
]

SEPTIC_KEYWORDS = ['septic', 'sewage', 'act537', 'onsite', 'wastewater', 'sewer', 'sanitary', 'permit']


async def discover_services(session, base_url):
    """Discover services at an endpoint."""
    try:
        url = f"{base_url}?f=json"
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get('services', []), data.get('folders', [])
    except Exception as e:
        logger.debug(f"Error: {e}")
    return [], []


async def search_folder(session, base_url, folder):
    """Search a folder for services."""
    try:
        url = f"{base_url}/{folder}?f=json"
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get('services', [])
    except Exception as e:
        logger.debug(f"Error: {e}")
    return []


async def get_layer_info(session, service_url):
    """Get layers from a service."""
    try:
        url = f"{service_url}?f=json"
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get('layers', [])
    except Exception as e:
        logger.debug(f"Error: {e}")
    return []


async def get_count(session, layer_url):
    """Get record count."""
    try:
        url = f"{layer_url}/query?where=1=1&returnCountOnly=true&f=json"
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get('count', 0)
    except Exception as e:
        logger.debug(f"Error: {e}")
    return 0


async def fetch_batch(session, layer_url, offset, batch_size=2000):
    """Fetch a batch of records."""
    try:
        params = {
            'where': '1=1',
            'outFields': '*',
            'returnGeometry': 'false',
            'resultOffset': offset,
            'resultRecordCount': batch_size,
            'f': 'json'
        }
        url = f"{layer_url}/query"
        async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=60)) as resp:
            if resp.status == 200:
                data = await resp.json()
                return [f.get('attributes', {}) for f in data.get('features', [])]
    except Exception as e:
        logger.error(f"Error: {e}")
    return []


async def scrape_layer(session, layer_url, name):
    """Scrape all records from a layer."""
    count = await get_count(session, layer_url)
    logger.info(f"  {name}: {count:,} records")

    if count == 0:
        return []

    all_records = []
    offset = 0

    while offset < count:
        batch = await fetch_batch(session, layer_url, offset)
        if not batch:
            break

        all_records.extend(batch)
        offset += len(batch)

        if offset % 10000 == 0 or offset >= count:
            logger.info(f"    Progress: {offset:,}/{count:,}")

        await asyncio.sleep(0.3)

    return all_records


async def discover_pa_septic():
    """Discover and scrape PA septic data."""
    logger.info("=" * 60)
    logger.info("PENNSYLVANIA DEP SEPTIC DISCOVERY")
    logger.info("=" * 60)

    all_records = []
    found_layers = []

    async with aiohttp.ClientSession() as session:
        for endpoint in PA_DEP_ENDPOINTS:
            logger.info(f"\nChecking: {endpoint}")

            services, folders = await discover_services(session, endpoint)
            logger.info(f"  Found {len(services)} services, {len(folders)} folders")

            # Check direct services
            for svc in services:
                name = svc.get('name', '').lower()
                svc_type = svc.get('type', 'MapServer')

                if any(kw in name for kw in SEPTIC_KEYWORDS):
                    svc_url = f"{endpoint}/{svc.get('name')}/{svc_type}"
                    logger.info(f"  MATCH: {svc.get('name')}")

                    # Get layers
                    layers = await get_layer_info(session, svc_url)
                    for layer in layers:
                        layer_name = layer.get('name', '').lower()
                        if any(kw in layer_name for kw in SEPTIC_KEYWORDS + ['point', 'facility', 'site']):
                            found_layers.append({
                                'name': f"{svc.get('name')}/{layer.get('name')}",
                                'url': f"{svc_url}/{layer.get('id')}"
                            })

            # Check folders
            for folder in folders:
                folder_services = await search_folder(session, endpoint, folder)
                for svc in folder_services:
                    name = svc.get('name', '').lower()
                    if any(kw in name for kw in SEPTIC_KEYWORDS):
                        svc_type = svc.get('type', 'MapServer')
                        svc_url = f"{endpoint}/{svc.get('name')}/{svc_type}"
                        logger.info(f"  MATCH in {folder}: {svc.get('name')}")

                        layers = await get_layer_info(session, svc_url)
                        for layer in layers:
                            found_layers.append({
                                'name': f"{svc.get('name')}/{layer.get('name')}",
                                'url': f"{svc_url}/{layer.get('id')}"
                            })

        # Scrape found layers
        if found_layers:
            logger.info(f"\nFound {len(found_layers)} layers to scrape")

            for layer in found_layers:
                records = await scrape_layer(session, layer['url'], layer['name'])
                if records:
                    all_records.extend(records)

    return all_records


async def main():
    logger.info("=" * 60)
    logger.info("PENNSYLVANIA DEP SEPTIC SCRAPER")
    logger.info("=" * 60)

    records = await discover_pa_septic()

    logger.info("\n" + "=" * 60)
    logger.info("PA DEP SCRAPER COMPLETE")
    logger.info(f"Total records: {len(records):,}")
    logger.info("=" * 60)

    if records:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = OUTPUT_DIR / f'pa_dep_septic_{timestamp}.json'

        with open(output_file, 'w') as f:
            json.dump({
                'state': 'Pennsylvania',
                'count': len(records),
                'extracted_at': datetime.now().isoformat(),
                'records': records
            }, f)

        logger.info(f"Saved {len(records):,} records to {output_file}")


if __name__ == '__main__':
    asyncio.run(main())
