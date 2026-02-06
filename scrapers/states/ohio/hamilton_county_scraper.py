#!/usr/bin/env python3
"""
Hamilton County, OH Private Sewage Treatment Systems Scraper

Source: Hamilton County Public Health via ArcGIS Hub
URL: https://hub.arcgis.com/maps/CAGISPortal::private-sewage-treatment-systems-managed-and-permitted-by-hamilton-county-public-health-ohio-usa

Estimated records: 50,000+
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

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/ohio')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Hamilton County ArcGIS endpoints to try
HAMILTON_ENDPOINTS = [
    # CAGIS Portal - Hamilton County
    "https://cagisonline.hamilton-co.org/arcgis/rest/services/CAGIS/PublicHealth/MapServer/0",
    "https://cagisonline.hamilton-co.org/arcgis/rest/services/Health/PrivateSewage/FeatureServer/0",
    "https://services.arcgis.com/pNe24xBP42pdFGyx/arcgis/rest/services/Private_Sewage_Treatment_Systems/FeatureServer/0",
    # Alternative discovery
    "https://cagisonline.hamilton-co.org/arcgis/rest/services",
]


async def discover_services(session, base_url):
    """Discover available services at an ArcGIS endpoint."""
    try:
        url = f"{base_url}?f=json"
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status == 200:
                data = await resp.json()
                services = data.get('services', [])
                folders = data.get('folders', [])
                logger.info(f"Found {len(services)} services, {len(folders)} folders")

                for svc in services[:20]:
                    logger.info(f"  Service: {svc.get('name')} ({svc.get('type')})")

                return services, folders
    except Exception as e:
        logger.debug(f"Error discovering: {e}")
    return [], []


async def get_layer_info(session, url):
    """Get layer information."""
    try:
        info_url = f"{url}?f=json"
        async with session.get(info_url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status == 200:
                data = await resp.json()
                return {
                    'name': data.get('name'),
                    'fields': [f.get('name') for f in data.get('fields', [])],
                    'max_record_count': data.get('maxRecordCount', 2000)
                }
    except Exception as e:
        logger.debug(f"Error: {e}")
    return None


async def get_record_count(session, url):
    """Get total record count."""
    try:
        count_url = f"{url}/query?where=1=1&returnCountOnly=true&f=json"
        async with session.get(count_url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get('count', 0)
    except Exception as e:
        logger.debug(f"Error: {e}")
    return 0


async def fetch_records_batch(session, url, offset, batch_size=2000):
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
        logger.error(f"Error fetching batch: {e}")
    return []


async def search_for_sewage_layers(session, base_url):
    """Search for sewage/septic related layers."""
    services, folders = await discover_services(session, base_url)

    sewage_layers = []
    keywords = ['sewage', 'septic', 'onsite', 'health', 'environmental']

    for svc in services:
        name = svc.get('name', '').lower()
        svc_type = svc.get('type', 'MapServer')

        if any(kw in name for kw in keywords):
            svc_url = f"{base_url}/{svc.get('name')}/{svc_type}"
            logger.info(f"  Checking service: {svc.get('name')}")

            # Get layers in this service
            try:
                layers_url = f"{svc_url}?f=json"
                async with session.get(layers_url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        for layer in data.get('layers', []):
                            layer_name = layer.get('name', '').lower()
                            if any(kw in layer_name for kw in ['sewage', 'septic', 'permit']):
                                sewage_layers.append({
                                    'service': svc.get('name'),
                                    'layer_id': layer.get('id'),
                                    'layer_name': layer.get('name'),
                                    'url': f"{svc_url}/{layer.get('id')}"
                                })
            except Exception as e:
                logger.debug(f"Error checking service: {e}")

    return sewage_layers


async def scrape_hamilton_county():
    """Scrape Hamilton County sewage data."""
    logger.info("=" * 60)
    logger.info("HAMILTON COUNTY, OH SEPTIC SYSTEMS SCRAPER")
    logger.info("=" * 60)

    all_records = []

    async with aiohttp.ClientSession() as session:
        # Try direct endpoints first
        for endpoint in HAMILTON_ENDPOINTS[:-1]:  # Skip the discovery endpoint
            logger.info(f"\nTrying: {endpoint}")

            info = await get_layer_info(session, endpoint)
            if info and info.get('name'):
                logger.info(f"  Layer: {info['name']}")

            count = await get_record_count(session, endpoint)
            logger.info(f"  Count: {count:,}")

            if count > 0:
                logger.info(f"  Downloading {count:,} records...")

                batch_size = 2000
                offset = 0

                while offset < count:
                    batch = await fetch_records_batch(session, endpoint, offset, batch_size)
                    if not batch:
                        break

                    all_records.extend(batch)
                    offset += len(batch)

                    if offset % 10000 == 0 or offset >= count:
                        logger.info(f"  Progress: {offset:,}/{count:,}")

                    await asyncio.sleep(0.3)

                break  # Found working endpoint

            await asyncio.sleep(1)

        # If no direct endpoints worked, try discovery
        if not all_records:
            logger.info("\nTrying service discovery...")
            discovery_url = HAMILTON_ENDPOINTS[-1]

            sewage_layers = await search_for_sewage_layers(session, discovery_url)

            if sewage_layers:
                logger.info(f"Found {len(sewage_layers)} potential layers")

                for layer in sewage_layers:
                    logger.info(f"\nScraping: {layer['layer_name']}")
                    count = await get_record_count(session, layer['url'])

                    if count > 0:
                        logger.info(f"  Found {count:,} records")

                        offset = 0
                        while offset < count:
                            batch = await fetch_records_batch(session, layer['url'], offset, 2000)
                            if not batch:
                                break

                            all_records.extend(batch)
                            offset += len(batch)

                            if offset % 5000 == 0:
                                logger.info(f"  Progress: {offset:,}/{count:,}")

                            await asyncio.sleep(0.3)

    return all_records


async def main():
    logger.info("=" * 60)
    logger.info("HAMILTON COUNTY OH SEPTIC SCRAPER")
    logger.info("Target: ~50,000 records")
    logger.info("=" * 60)

    records = await scrape_hamilton_county()

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("HAMILTON COUNTY SCRAPER COMPLETE")
    logger.info(f"Total records: {len(records):,}")
    logger.info("=" * 60)

    if records:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = OUTPUT_DIR / f'hamilton_county_septic_{timestamp}.json'

        with open(output_file, 'w') as f:
            json.dump({
                'state': 'Ohio',
                'county': 'Hamilton County',
                'count': len(records),
                'extracted_at': datetime.now().isoformat(),
                'records': records
            }, f)

        logger.info(f"Saved {len(records):,} records to {output_file}")


if __name__ == '__main__':
    asyncio.run(main())
