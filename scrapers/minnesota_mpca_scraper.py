#!/usr/bin/env python3
"""
Minnesota MPCA SSTS (Subsurface Sewage Treatment Systems) Scraper

Target: 600,000+ records across 87 counties
Source: Minnesota Pollution Control Agency SSTS Portal
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

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/minnesota')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Minnesota MPCA endpoints to check
MPCA_ENDPOINTS = [
    # MPCA ArcGIS services
    "https://services.arcgis.com/4bZHOTCZCXpLwDsq/arcgis/rest/services",
    "https://arcgis.pca.state.mn.us/arcgis/rest/services",
    "https://gis.pca.state.mn.us/arcgis/rest/services",
    # MnGeo services
    "https://services.arcgis.com/8df8p0NlLFEShl0r/arcgis/rest/services",
    # Minnesota Geospatial Commons
    "https://gisdata.mn.gov/server/rest/services",
]

SEPTIC_KEYWORDS = ['ssts', 'septic', 'sewage', 'wastewater', 'onsite', 'subsurface', 'treatment']


async def discover_services(session, base_url):
    """Discover services at an endpoint."""
    try:
        url = f"{base_url}?f=json"
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30), ssl=False) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get('services', []), data.get('folders', [])
    except Exception as e:
        logger.debug(f"Error at {base_url}: {e}")
    return [], []


async def search_folder(session, base_url, folder):
    """Search a folder for services."""
    try:
        url = f"{base_url}/{folder}?f=json"
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30), ssl=False) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get('services', [])
    except Exception as e:
        logger.debug(f"Error in folder {folder}: {e}")
    return []


async def get_layers(session, service_url):
    """Get layers from a service."""
    try:
        url = f"{service_url}?f=json"
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30), ssl=False) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get('layers', [])
    except Exception as e:
        logger.debug(f"Error getting layers: {e}")
    return []


async def get_count(session, layer_url):
    """Get record count."""
    try:
        url = f"{layer_url}/query?where=1=1&returnCountOnly=true&f=json"
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30), ssl=False) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get('count', 0)
    except Exception as e:
        logger.debug(f"Error getting count: {e}")
    return 0


async def fetch_batch(session, layer_url, offset, batch_size=2000):
    """Fetch records batch."""
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
        async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=60), ssl=False) as resp:
            if resp.status == 200:
                data = await resp.json()
                return [f.get('attributes', {}) for f in data.get('features', [])]
    except Exception as e:
        logger.error(f"Error fetching batch: {e}")
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


async def discover_minnesota_ssts():
    """Discover and scrape Minnesota SSTS data."""
    logger.info("=" * 60)
    logger.info("MINNESOTA MPCA SSTS DISCOVERY")
    logger.info("=" * 60)

    all_records = []
    found_layers = []

    async with aiohttp.ClientSession() as session:
        for endpoint in MPCA_ENDPOINTS:
            logger.info(f"\nChecking: {endpoint}")

            services, folders = await discover_services(session, endpoint)
            logger.info(f"  Found {len(services)} services, {len(folders)} folders")

            # Check all services
            for svc in services:
                name = svc.get('name', '').lower()
                svc_type = svc.get('type', 'MapServer')
                logger.info(f"    Service: {svc.get('name')} ({svc_type})")

                # Check for septic keywords or just explore all
                svc_url = f"{endpoint}/{svc.get('name')}/{svc_type}"
                layers = await get_layers(session, svc_url)

                for layer in layers:
                    layer_name = layer.get('name', '').lower()
                    if any(kw in name.lower() or kw in layer_name for kw in SEPTIC_KEYWORDS):
                        logger.info(f"      MATCH: {layer.get('name')}")
                        found_layers.append({
                            'name': f"{svc.get('name')}/{layer.get('name')}",
                            'url': f"{svc_url}/{layer.get('id')}"
                        })
                    elif 'permit' in layer_name or 'site' in layer_name:
                        # Also capture permit/site data
                        count = await get_count(session, f"{svc_url}/{layer.get('id')}")
                        if count > 1000:
                            logger.info(f"      LARGE: {layer.get('name')} - {count:,} records")
                            found_layers.append({
                                'name': f"{svc.get('name')}/{layer.get('name')}",
                                'url': f"{svc_url}/{layer.get('id')}"
                            })

            # Check folders
            for folder in folders:
                logger.info(f"  Checking folder: {folder}")
                folder_services = await search_folder(session, endpoint, folder)

                for svc in folder_services:
                    name = svc.get('name', '').lower()
                    svc_type = svc.get('type', 'MapServer')

                    if any(kw in name for kw in SEPTIC_KEYWORDS):
                        svc_url = f"{endpoint}/{svc.get('name')}/{svc_type}"
                        logger.info(f"    MATCH in {folder}: {svc.get('name')}")

                        layers = await get_layers(session, svc_url)
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

                    # Save intermediate
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    safe_name = layer['name'].replace('/', '_').replace(' ', '_')
                    output_file = OUTPUT_DIR / f"{safe_name}_{timestamp}.json"
                    with open(output_file, 'w') as f:
                        json.dump({
                            'source': layer['name'],
                            'state': 'Minnesota',
                            'count': len(records),
                            'extracted_at': datetime.now().isoformat(),
                            'records': records
                        }, f)
                    logger.info(f"    Saved to {output_file}")

    return all_records


async def main():
    logger.info("=" * 60)
    logger.info("MINNESOTA MPCA SSTS SCRAPER")
    logger.info("=" * 60)

    records = await discover_minnesota_ssts()

    logger.info("\n" + "=" * 60)
    logger.info("MINNESOTA SCRAPER COMPLETE")
    logger.info(f"Total records: {len(records):,}")
    logger.info("=" * 60)

    if records:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = OUTPUT_DIR / f'minnesota_ssts_{timestamp}.json'

        with open(output_file, 'w') as f:
            json.dump({
                'state': 'Minnesota',
                'count': len(records),
                'extracted_at': datetime.now().isoformat(),
                'records': records
            }, f)

        logger.info(f"Saved {len(records):,} records to {output_file}")


if __name__ == '__main__':
    asyncio.run(main())
