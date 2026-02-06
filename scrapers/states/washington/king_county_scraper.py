#!/usr/bin/env python3
"""
King County, WA Septic Systems Scraper

Source: King County Open Data
URL: https://gis-kingcounty.opendata.arcgis.com/datasets/parcels-with-onsite-sewage-designations-in-king-county-septic-onsite-parcel-area

Estimated records: 100,000+
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

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/washington')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# King County ArcGIS endpoints
KING_COUNTY_ENDPOINTS = [
    # Parcels with Onsite Sewage Designations
    "https://gisdata.kingcounty.gov/arcgis/rest/services/OpenDataPortal/property__parcel_address_area/MapServer/565",
    # Alternative endpoints
    "https://services.arcgis.com/vgHBEcBBDvPyLurv/arcgis/rest/services/Parcels_with_Onsite_Sewage_Designations/FeatureServer/0",
    "https://gisdata.kingcounty.gov/arcgis/rest/services/OpenDataPortal/property__parcel_address_area/MapServer/0",
]


async def get_layer_info(session, url):
    """Get layer information and field names."""
    try:
        info_url = f"{url}?f=json"
        async with session.get(info_url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status == 200:
                data = await resp.json()
                return {
                    'name': data.get('name'),
                    'fields': [f.get('name') for f in data.get('fields', [])],
                    'geometry_type': data.get('geometryType'),
                    'max_record_count': data.get('maxRecordCount', 2000)
                }
    except Exception as e:
        logger.debug(f"Error getting layer info: {e}")
    return None


async def get_record_count(session, url):
    """Get total record count for a layer."""
    try:
        count_url = f"{url}/query?where=1=1&returnCountOnly=true&f=json"
        async with session.get(count_url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get('count', 0)
    except Exception as e:
        logger.debug(f"Error getting count: {e}")
    return 0


async def fetch_records_batch(session, url, offset, batch_size=2000):
    """Fetch a batch of records from a layer."""
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
        logger.error(f"Error fetching batch at offset {offset}: {e}")
    return []


async def scrape_king_county():
    """Scrape King County septic data."""
    logger.info("=" * 60)
    logger.info("KING COUNTY, WA SEPTIC SYSTEMS SCRAPER")
    logger.info("=" * 60)

    all_records = []

    async with aiohttp.ClientSession() as session:
        for endpoint in KING_COUNTY_ENDPOINTS:
            logger.info(f"\nTrying endpoint: {endpoint}")

            # Get layer info
            info = await get_layer_info(session, endpoint)
            if info:
                logger.info(f"  Layer: {info['name']}")
                logger.info(f"  Fields: {len(info['fields'])} fields")

            # Get count
            count = await get_record_count(session, endpoint)
            logger.info(f"  Record count: {count:,}")

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
                        logger.info(f"  Progress: {offset:,}/{count:,} ({100*offset/count:.1f}%)")

                    await asyncio.sleep(0.3)  # Rate limiting

                logger.info(f"  Downloaded {len(all_records):,} records from this endpoint")
                break  # Found working endpoint

            await asyncio.sleep(1)

    return all_records


async def main():
    logger.info("=" * 60)
    logger.info("KING COUNTY WA SEPTIC SCRAPER")
    logger.info("Target: ~100,000 records")
    logger.info("=" * 60)

    records = await scrape_king_county()

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("KING COUNTY SCRAPER COMPLETE")
    logger.info(f"Total records: {len(records):,}")
    logger.info("=" * 60)

    if records:
        # Save results
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = OUTPUT_DIR / f'king_county_septic_{timestamp}.json'

        with open(output_file, 'w') as f:
            json.dump({
                'state': 'Washington',
                'county': 'King County',
                'count': len(records),
                'extracted_at': datetime.now().isoformat(),
                'records': records
            }, f)

        logger.info(f"Saved {len(records):,} records to {output_file}")

        # Also save CSV for easier viewing
        csv_file = OUTPUT_DIR / f'king_county_septic_{timestamp}.csv'
        if records:
            import csv
            keys = records[0].keys()
            with open(csv_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=keys)
                writer.writeheader()
                writer.writerows(records)
            logger.info(f"Saved CSV to {csv_file}")


if __name__ == '__main__':
    asyncio.run(main())
