#!/usr/bin/env python3
"""
North Carolina Septic Permit Scraper

Searches NC ArcGIS endpoints for septic/OWTS data.
"""

import asyncio
import aiohttp
import json
import logging
from datetime import datetime
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/north_carolina')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

NC_ARCGIS_ENDPOINTS = [
    "https://services.nconemap.gov/secure/rest/services",
    "https://gis.ncdenr.org/arcgis/rest/services",
    "https://services1.arcgis.com/x1FmPno0qiwwrg8y/arcgis/rest/services",
    "https://gis.mecklenburgcountync.gov/arcgis/rest/services",
    "https://maps.wakegov.com/arcgis/rest/services",
    "https://maps.guilfordcountync.gov/arcgis/rest/services",
    "https://gisweb.forsyth.cc/arcgis/rest/services",
]

SEPTIC_KEYWORDS = ['septic', 'owts', 'onsite', 'wastewater', 'sewer', 'permit', 'sanitary', 'effluent', 'sewage']


async def fetch_json(session, url, params=None):
    """Fetch JSON from URL."""
    try:
        async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=60)) as resp:
            if resp.status == 200:
                return await resp.json()
    except Exception as e:
        logger.debug(f"Fetch error: {e}")
    return None


async def get_services(session, base_url):
    """Get list of services from ArcGIS endpoint."""
    services = []
    try:
        data = await fetch_json(session, base_url, {'f': 'json'})
        if data:
            for svc in data.get('services', []):
                services.append(svc)
            for folder in data.get('folders', []):
                folder_data = await fetch_json(session, f"{base_url}/{folder}", {'f': 'json'})
                if folder_data:
                    for svc in folder_data.get('services', []):
                        services.append(svc)
    except Exception as e:
        logger.debug(f"Service list error: {e}")
    return services


async def check_layer_for_septic(session, layer_url, layer_name):
    """Check if layer contains septic data."""
    name_lower = layer_name.lower()
    for keyword in SEPTIC_KEYWORDS:
        if keyword in name_lower:
            return True

    # Check fields
    try:
        data = await fetch_json(session, layer_url, {'f': 'json'})
        if data and 'fields' in data:
            for field in data['fields']:
                field_name = field.get('name', '').lower()
                for keyword in SEPTIC_KEYWORDS:
                    if keyword in field_name:
                        return True
    except:
        pass
    return False


async def scrape_layer(session, layer_url, layer_name, all_records):
    """Scrape all records from a layer."""
    try:
        # Get record count
        count_data = await fetch_json(session, f"{layer_url}/query", {
            'where': '1=1',
            'returnCountOnly': 'true',
            'f': 'json'
        })

        if not count_data or 'count' not in count_data:
            return 0

        total_count = count_data['count']
        if total_count == 0:
            return 0

        logger.info(f"  {layer_name}: {total_count:,} records")

        # Fetch in batches
        offset = 0
        batch_size = 2000
        layer_records = []

        while offset < total_count:
            batch = await fetch_json(session, f"{layer_url}/query", {
                'where': '1=1',
                'outFields': '*',
                'resultOffset': offset,
                'resultRecordCount': batch_size,
                'f': 'json'
            })

            if batch and 'features' in batch:
                for feature in batch['features']:
                    attrs = feature.get('attributes', {})
                    attrs['_source'] = layer_name
                    attrs['_state'] = 'North Carolina'
                    layer_records.append(attrs)

                offset += len(batch['features'])
                if len(batch['features']) < batch_size:
                    break
            else:
                break

            if offset % 10000 == 0:
                logger.info(f"    Progress: {offset:,}/{total_count:,}")

        all_records.extend(layer_records)
        return len(layer_records)

    except Exception as e:
        logger.error(f"  Error scraping {layer_name}: {e}")
        return 0


async def main():
    logger.info("=" * 60)
    logger.info("NORTH CAROLINA SEPTIC SCRAPER")
    logger.info("=" * 60)

    all_records = []

    async with aiohttp.ClientSession() as session:
        for endpoint in NC_ARCGIS_ENDPOINTS:
            logger.info(f"\nChecking: {endpoint}")

            try:
                services = await get_services(session, endpoint)
                logger.info(f"  Found {len(services)} services")

                for svc in services:
                    svc_name = svc.get('name', '')
                    svc_type = svc.get('type', '')

                    if svc_type not in ['MapServer', 'FeatureServer']:
                        continue

                    # Check service name for keywords
                    name_lower = svc_name.lower()
                    matches_keyword = any(kw in name_lower for kw in SEPTIC_KEYWORDS)

                    if matches_keyword or 'environmental' in name_lower or 'health' in name_lower:
                        svc_url = f"{endpoint}/{svc_name}/{svc_type}"
                        svc_data = await fetch_json(session, svc_url, {'f': 'json'})

                        if svc_data and 'layers' in svc_data:
                            for layer in svc_data['layers']:
                                layer_id = layer.get('id')
                                layer_name = layer.get('name', '')
                                layer_url = f"{svc_url}/{layer_id}"

                                if await check_layer_for_septic(session, layer_url, layer_name):
                                    await scrape_layer(session, layer_url, f"{svc_name}/{layer_name}", all_records)

            except Exception as e:
                logger.error(f"Error with {endpoint}: {e}")

    # Save results
    logger.info("\n" + "=" * 60)
    logger.info(f"NORTH CAROLINA COMPLETE: {len(all_records):,} records")
    logger.info("=" * 60)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = OUTPUT_DIR / f'nc_septic_{timestamp}.json'

    with open(output_file, 'w') as f:
        json.dump({
            'state': 'North Carolina',
            'count': len(all_records),
            'extracted_at': datetime.now().isoformat(),
            'records': all_records
        }, f)

    logger.info(f"Saved: {output_file}")


if __name__ == '__main__':
    asyncio.run(main())
