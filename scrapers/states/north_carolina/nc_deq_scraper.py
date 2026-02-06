#!/usr/bin/env python3
"""
North Carolina DEQ Septic/OWTS Scraper

Source: NC DEQ GIS Data Hub
URL: https://data-ncdenr.opendata.arcgis.com/

NC has high septic population - looking for permits and system data.
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

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/north_carolina')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# NC DEQ ArcGIS endpoints
NC_ENDPOINTS = [
    # NC DEQ Open Data
    "https://services.arcgis.com/pNe24xBP42pdFGyx/arcgis/rest/services",
    # NC DEQ GIS Services
    "https://data-ncdenr.opendata.arcgis.com",
    # NC GIS Services
    "https://services.nconemap.gov/secure/rest/services",
]

# Keywords for septic/OWTS layers
SEPTIC_KEYWORDS = ['septic', 'owts', 'onsite', 'sewage', 'wastewater', 'permit', 'environmental', 'health']


async def discover_services(session, base_url):
    """Discover services at an ArcGIS endpoint."""
    try:
        url = f"{base_url}?f=json"
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status == 200:
                text = await resp.text()
                if text.startswith('{'):
                    data = json.loads(text)
                    services = data.get('services', [])
                    folders = data.get('folders', [])
                    return services, folders
    except Exception as e:
        logger.debug(f"Error: {e}")
    return [], []


async def search_folder_for_layers(session, base_url, folder):
    """Search a folder for septic-related layers."""
    found_layers = []
    try:
        url = f"{base_url}/{folder}?f=json"
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status == 200:
                data = await resp.json()
                services = data.get('services', [])

                for svc in services:
                    name = svc.get('name', '').lower()
                    if any(kw in name for kw in SEPTIC_KEYWORDS):
                        svc_type = svc.get('type', 'MapServer')
                        svc_url = f"{base_url}/{svc.get('name')}/{svc_type}"
                        found_layers.append({
                            'name': svc.get('name'),
                            'type': svc_type,
                            'url': svc_url
                        })
    except Exception as e:
        logger.debug(f"Error: {e}")
    return found_layers


async def get_layer_count(session, url):
    """Get record count from a layer."""
    try:
        count_url = f"{url}/query?where=1=1&returnCountOnly=true&f=json"
        async with session.get(count_url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get('count', 0)
    except Exception as e:
        logger.debug(f"Error: {e}")
    return 0


async def fetch_batch(session, url, offset, batch_size=2000):
    """Fetch a batch of records."""
    try:
        query_url = f"{url}/query"
        params = {
            'where': '1=1',
            'outFields': '*',
            'returnGeometry': 'false',
            'resultOffset': offset,
            'resultRecordCount': batch_size,
            'f': 'json'
        }
        async with session.get(query_url, params=params, timeout=aiohttp.ClientTimeout(total=60)) as resp:
            if resp.status == 200:
                data = await resp.json()
                features = data.get('features', [])
                return [f.get('attributes', {}) for f in features]
    except Exception as e:
        logger.error(f"Error: {e}")
    return []


async def scrape_layer(session, url, name):
    """Scrape all records from a layer."""
    logger.info(f"Scraping: {name}")

    count = await get_layer_count(session, url)
    logger.info(f"  Records: {count:,}")

    if count == 0:
        return []

    all_records = []
    offset = 0

    while offset < count:
        batch = await fetch_batch(session, url, offset)
        if not batch:
            break

        all_records.extend(batch)
        offset += len(batch)

        if offset % 10000 == 0 or offset >= count:
            logger.info(f"  Progress: {offset:,}/{count:,}")

        await asyncio.sleep(0.3)

    return all_records


async def discover_nc_septic_data():
    """Discover and scrape NC septic data."""
    logger.info("=" * 60)
    logger.info("NORTH CAROLINA DEQ SEPTIC DATA DISCOVERY")
    logger.info("=" * 60)

    all_records = []
    found_layers = []

    async with aiohttp.ClientSession() as session:
        for endpoint in NC_ENDPOINTS:
            logger.info(f"\nChecking: {endpoint}")

            services, folders = await discover_services(session, endpoint)
            logger.info(f"  Found {len(services)} services, {len(folders)} folders")

            # Check services for septic keywords
            for svc in services:
                name = svc.get('name', '').lower()
                if any(kw in name for kw in SEPTIC_KEYWORDS):
                    svc_type = svc.get('type', 'MapServer')
                    svc_url = f"{endpoint}/{svc.get('name')}/{svc_type}"
                    logger.info(f"  MATCH: {svc.get('name')}")
                    found_layers.append({
                        'name': svc.get('name'),
                        'url': svc_url
                    })

            # Check folders
            for folder in folders:
                folder_layers = await search_folder_for_layers(session, endpoint, folder)
                for layer in folder_layers:
                    logger.info(f"  MATCH in {folder}: {layer['name']}")
                    found_layers.append(layer)

        # Scrape found layers
        if found_layers:
            logger.info(f"\nFound {len(found_layers)} potential layers")

            for layer in found_layers:
                # Check if MapServer, need to get layer 0
                if 'MapServer' in layer.get('url', ''):
                    layer_url = f"{layer['url']}/0"
                else:
                    layer_url = layer['url']

                records = await scrape_layer(session, layer_url, layer['name'])
                if records:
                    all_records.extend(records)
                    logger.info(f"  Got {len(records):,} records from {layer['name']}")

    return all_records


async def main():
    logger.info("=" * 60)
    logger.info("NORTH CAROLINA DEQ SEPTIC SCRAPER")
    logger.info("=" * 60)

    records = await discover_nc_septic_data()

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("NC DEQ SCRAPER COMPLETE")
    logger.info(f"Total records: {len(records):,}")
    logger.info("=" * 60)

    if records:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = OUTPUT_DIR / f'nc_deq_septic_{timestamp}.json'

        with open(output_file, 'w') as f:
            json.dump({
                'state': 'North Carolina',
                'count': len(records),
                'extracted_at': datetime.now().isoformat(),
                'records': records
            }, f)

        logger.info(f"Saved {len(records):,} records to {output_file}")


if __name__ == '__main__':
    asyncio.run(main())
