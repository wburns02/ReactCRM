#!/usr/bin/env python3
"""
Michigan EGLE ArcGIS Hub Septic Scraper

Target: 1.3M+ septic system records
Source: Michigan EGLE (Environment, Great Lakes, and Energy) ArcGIS Hub
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

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/michigan')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Michigan EGLE ArcGIS endpoints
MI_EGLE_ENDPOINTS = [
    # EGLE Hub - primary source
    "https://services.arcgis.com/hRUr1F8lE8Jq2uJo/arcgis/rest/services",
    # Michigan GIS Open Data
    "https://services5.arcgis.com/8i9BhkqZtXvZJ1Y3/arcgis/rest/services",
    # Michigan Geoportal
    "https://gis.michigan.opendata.arcgis.com/api/v3/datasets",
]

SEPTIC_KEYWORDS = ['septic', 'sewage', 'wastewater', 'onsite', 'owts', 'ssts', 'treatment', 'water']


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


async def discover_michigan_septic():
    """Discover and scrape Michigan septic data."""
    logger.info("=" * 60)
    logger.info("MICHIGAN EGLE HUB DISCOVERY")
    logger.info("=" * 60)

    all_records = []
    found_layers = []

    async with aiohttp.ClientSession() as session:
        for endpoint in MI_EGLE_ENDPOINTS:
            if 'api/v3' in endpoint:
                # Skip dataset API endpoints - use REST services
                continue

            logger.info(f"\nChecking: {endpoint}")

            services, folders = await discover_services(session, endpoint)
            logger.info(f"  Found {len(services)} services, {len(folders)} folders")

            # Check all services
            for svc in services:
                name = svc.get('name', '').lower()
                svc_type = svc.get('type', 'FeatureServer')
                logger.info(f"    Service: {svc.get('name')} ({svc_type})")

                svc_url = f"{endpoint}/{svc.get('name')}/{svc_type}"
                layers = await get_layers(session, svc_url)

                for layer in layers:
                    layer_name = layer.get('name', '').lower()
                    # Check for septic keywords or large datasets
                    if any(kw in name.lower() or kw in layer_name for kw in SEPTIC_KEYWORDS):
                        count = await get_count(session, f"{svc_url}/{layer.get('id')}")
                        if count > 0:
                            logger.info(f"      MATCH: {layer.get('name')} - {count:,} records")
                            found_layers.append({
                                'name': f"{svc.get('name')}/{layer.get('name')}",
                                'url': f"{svc_url}/{layer.get('id')}",
                                'count': count
                            })

            # Check folders
            for folder in folders:
                logger.info(f"  Checking folder: {folder}")
                folder_services = await search_folder(session, endpoint, folder)

                for svc in folder_services:
                    name = svc.get('name', '').lower()
                    svc_type = svc.get('type', 'FeatureServer')

                    if any(kw in name for kw in SEPTIC_KEYWORDS):
                        svc_url = f"{endpoint}/{svc.get('name')}/{svc_type}"
                        logger.info(f"    MATCH in {folder}: {svc.get('name')}")

                        layers = await get_layers(session, svc_url)
                        for layer in layers:
                            count = await get_count(session, f"{svc_url}/{layer.get('id')}")
                            if count > 0:
                                found_layers.append({
                                    'name': f"{svc.get('name')}/{layer.get('name')}",
                                    'url': f"{svc_url}/{layer.get('id')}",
                                    'count': count
                                })

        # Sort by count descending
        found_layers.sort(key=lambda x: x.get('count', 0), reverse=True)

        # Scrape found layers (largest first)
        if found_layers:
            logger.info(f"\nFound {len(found_layers)} layers to scrape")

            for layer in found_layers:
                logger.info(f"\nScraping: {layer['name']} ({layer.get('count', 0):,} records)")
                records = await scrape_layer(session, layer['url'], layer['name'])

                if records:
                    all_records.extend(records)

                    # Save intermediate
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    safe_name = layer['name'].replace('/', '_').replace(' ', '_')[:50]
                    output_file = OUTPUT_DIR / f"{safe_name}_{timestamp}.json"
                    with open(output_file, 'w') as f:
                        json.dump({
                            'source': layer['name'],
                            'state': 'Michigan',
                            'count': len(records),
                            'extracted_at': datetime.now().isoformat(),
                            'records': records
                        }, f)
                    logger.info(f"  Saved to {output_file}")

    return all_records


async def main():
    logger.info("=" * 60)
    logger.info("MICHIGAN EGLE HUB SCRAPER")
    logger.info("=" * 60)

    records = await discover_michigan_septic()

    logger.info("\n" + "=" * 60)
    logger.info("MICHIGAN EGLE SCRAPER COMPLETE")
    logger.info(f"Total records: {len(records):,}")
    logger.info("=" * 60)

    if records:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = OUTPUT_DIR / f'michigan_egle_hub_{timestamp}.json'

        with open(output_file, 'w') as f:
            json.dump({
                'state': 'Michigan',
                'count': len(records),
                'extracted_at': datetime.now().isoformat(),
                'records': records
            }, f)

        logger.info(f"Saved {len(records):,} records to {output_file}")


if __name__ == '__main__':
    asyncio.run(main())
