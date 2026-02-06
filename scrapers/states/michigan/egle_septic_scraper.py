#!/usr/bin/env python3
"""
Michigan EGLE Septic Systems Scraper

Michigan has ~1.3 MILLION septic systems statewide.
Source: EGLE (Environment, Great Lakes, and Energy) GIS Hub

Portal: https://gis-egle.hub.arcgis.com/
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

# Michigan EGLE potential endpoints to try
POTENTIAL_ENDPOINTS = [
    # EGLE ArcGIS Hub
    "https://services1.arcgis.com/5CdUY0RNjR3UwBpi/arcgis/rest/services",
    "https://services.arcgis.com/hRUr1F8lE8Jq2uJo/arcgis/rest/services",
    # Michigan GIS Open Data
    "https://gisservices.michigan.gov/arcgis/rest/services",
    # EGLE specific
    "https://gisp.mcgi.state.mi.us/arcgis/rest/services",
]

# Keywords to search for septic-related layers
SEPTIC_KEYWORDS = ['septic', 'owts', 'onsite', 'sewage', 'wastewater', 'sewer', 'sanitary']


async def discover_services(session, base_url):
    """Discover all available services at an ArcGIS endpoint."""
    try:
        url = f"{base_url}?f=json"
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status == 200:
                data = await resp.json()
                services = data.get('services', [])
                folders = data.get('folders', [])
                logger.info(f"  Found {len(services)} services, {len(folders)} folders at {base_url}")
                return services, folders
    except Exception as e:
        logger.debug(f"  Error accessing {base_url}: {e}")
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
        logger.debug(f"  Error accessing folder {folder}: {e}")
    return []


async def check_layer_for_septic(session, service_url):
    """Check if a service contains septic-related data."""
    try:
        url = f"{service_url}?f=json"
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status == 200:
                data = await resp.json()
                name = data.get('name', '').lower()
                description = data.get('description', '').lower()

                # Check layers
                layers = data.get('layers', [])
                for layer in layers:
                    layer_name = layer.get('name', '').lower()
                    for keyword in SEPTIC_KEYWORDS:
                        if keyword in layer_name or keyword in name or keyword in description:
                            return {
                                'service_url': service_url,
                                'layer_id': layer.get('id'),
                                'layer_name': layer.get('name'),
                                'service_name': data.get('name')
                            }
    except Exception as e:
        logger.debug(f"  Error checking layer: {e}")
    return None


async def get_record_count(session, layer_url):
    """Get total record count for a layer."""
    try:
        url = f"{layer_url}/query?where=1=1&returnCountOnly=true&f=json"
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get('count', 0)
    except Exception as e:
        logger.debug(f"  Error getting count: {e}")
    return 0


async def fetch_records_batch(session, layer_url, offset, batch_size=2000):
    """Fetch a batch of records from a layer."""
    try:
        url = f"{layer_url}/query"
        params = {
            'where': '1=1',
            'outFields': '*',
            'returnGeometry': 'false',
            'resultOffset': offset,
            'resultRecordCount': batch_size,
            'f': 'json'
        }
        async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=60)) as resp:
            if resp.status == 200:
                data = await resp.json()
                features = data.get('features', [])
                return [f.get('attributes', {}) for f in features]
    except Exception as e:
        logger.error(f"Error fetching batch at offset {offset}: {e}")
    return []


async def scrape_layer(session, layer_url, layer_name):
    """Scrape all records from a layer."""
    logger.info(f"Scraping layer: {layer_name}")

    # Get total count
    total_count = await get_record_count(session, layer_url)
    logger.info(f"  Total records: {total_count:,}")

    if total_count == 0:
        return []

    all_records = []
    batch_size = 2000
    offset = 0

    while offset < total_count:
        batch = await fetch_records_batch(session, layer_url, offset, batch_size)
        if not batch:
            break

        all_records.extend(batch)
        offset += len(batch)

        if offset % 10000 == 0 or offset >= total_count:
            logger.info(f"  Progress: {offset:,}/{total_count:,} ({100*offset/total_count:.1f}%)")

        await asyncio.sleep(0.5)  # Rate limiting

    return all_records


async def discover_michigan_septic_data():
    """Discover septic-related data in Michigan ArcGIS services."""
    logger.info("=" * 60)
    logger.info("MICHIGAN EGLE SEPTIC DATA DISCOVERY")
    logger.info("=" * 60)

    septic_layers = []

    async with aiohttp.ClientSession() as session:
        for endpoint in POTENTIAL_ENDPOINTS:
            logger.info(f"\nChecking endpoint: {endpoint}")

            services, folders = await discover_services(session, endpoint)

            # Check top-level services
            for svc in services:
                svc_name = svc.get('name', '')
                svc_type = svc.get('type', 'MapServer')
                svc_url = f"{endpoint}/{svc_name}/{svc_type}"

                # Check for septic keywords in service name
                if any(kw in svc_name.lower() for kw in SEPTIC_KEYWORDS):
                    logger.info(f"  POTENTIAL MATCH: {svc_name}")
                    layer_info = await check_layer_for_septic(session, svc_url)
                    if layer_info:
                        septic_layers.append(layer_info)

            # Check folders
            for folder in folders:
                folder_services = await search_folder(session, endpoint, folder)
                for svc in folder_services:
                    svc_name = svc.get('name', '')
                    svc_type = svc.get('type', 'MapServer')
                    svc_url = f"{endpoint}/{svc_name}/{svc_type}"

                    if any(kw in svc_name.lower() for kw in SEPTIC_KEYWORDS):
                        logger.info(f"  POTENTIAL MATCH in {folder}: {svc_name}")
                        layer_info = await check_layer_for_septic(session, svc_url)
                        if layer_info:
                            septic_layers.append(layer_info)

    return septic_layers


async def try_known_michigan_sources():
    """Try known Michigan septic data sources directly."""
    logger.info("\n" + "=" * 60)
    logger.info("TRYING KNOWN MICHIGAN DATA SOURCES")
    logger.info("=" * 60)

    # Known or likely Michigan septic data endpoints
    known_sources = [
        # State GIS services
        {
            'name': 'Michigan SSTS',
            'url': 'https://services1.arcgis.com/5CdUY0RNjR3UwBpi/arcgis/rest/services/Septic_Systems/FeatureServer/0'
        },
        {
            'name': 'Michigan Onsite Wastewater',
            'url': 'https://gisservices.michigan.gov/arcgis/rest/services/EGLE/Septic/MapServer/0'
        },
        {
            'name': 'Michigan Environmental Permits',
            'url': 'https://gisp.mcgi.state.mi.us/arcgis/rest/services/EGLE/Environmental_Permits/MapServer/0'
        },
    ]

    all_records = []

    async with aiohttp.ClientSession() as session:
        for source in known_sources:
            logger.info(f"\nTrying: {source['name']}")
            count = await get_record_count(session, source['url'])

            if count > 0:
                logger.info(f"  Found {count:,} records!")
                records = await scrape_layer(session, source['url'], source['name'])
                all_records.extend(records)

                # Save intermediate results
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                output_file = OUTPUT_DIR / f"michigan_{source['name'].lower().replace(' ', '_')}_{timestamp}.json"
                with open(output_file, 'w') as f:
                    json.dump({
                        'source': source['name'],
                        'url': source['url'],
                        'count': len(records),
                        'extracted_at': datetime.now().isoformat(),
                        'records': records[:100]  # Sample for inspection
                    }, f, indent=2)
                logger.info(f"  Saved sample to {output_file}")
            else:
                logger.info(f"  No records or endpoint not accessible")

    return all_records


async def main():
    logger.info("=" * 60)
    logger.info("MICHIGAN SEPTIC SYSTEMS SCRAPER")
    logger.info("Target: ~1.3 MILLION records")
    logger.info("=" * 60)

    # First try known sources
    records = await try_known_michigan_sources()

    if not records:
        # Discover services if known sources don't work
        septic_layers = await discover_michigan_septic_data()

        if septic_layers:
            logger.info(f"\nFound {len(septic_layers)} septic-related layers")

            # Save discovery results
            with open(OUTPUT_DIR / 'michigan_septic_layers.json', 'w') as f:
                json.dump(septic_layers, f, indent=2)

            # Scrape each layer
            async with aiohttp.ClientSession() as session:
                for layer in septic_layers:
                    layer_url = f"{layer['service_url']}/{layer['layer_id']}"
                    layer_records = await scrape_layer(session, layer_url, layer['layer_name'])
                    records.extend(layer_records)
        else:
            logger.warning("No septic data layers found")

    # Final summary
    logger.info("\n" + "=" * 60)
    logger.info("MICHIGAN SCRAPER COMPLETE")
    logger.info(f"Total records: {len(records):,}")
    logger.info("=" * 60)

    if records:
        # Save final results
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = OUTPUT_DIR / f'michigan_septic_all_{timestamp}.json'
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
