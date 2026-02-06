#!/usr/bin/env python3
"""
Ohio Septic Permit Scraper

Searches Ohio ArcGIS endpoints for septic/HSTS data.
"""

import asyncio
import aiohttp
import json
import logging
from datetime import datetime
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/ohio')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OHIO_ENDPOINTS = [
    "https://gis.epa.ohio.gov/arcgis/rest/services",
    "https://services1.arcgis.com/y1k1xbknhLYH9wMU/arcgis/rest/services",
    "https://gis.franklincountyohio.gov/arcgis/rest/services",
    "https://gis.cuyahogacounty.us/arcgis/rest/services",
    "https://services.arcgis.com/y1k1xbknhLYH9wMU/arcgis/rest/services",
]

KEYWORDS = ['septic', 'hsts', 'sewage', 'onsite', 'wastewater', 'permit', 'sanitary']


async def fetch_json(session, url, params=None):
    try:
        async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=60)) as resp:
            if resp.status == 200:
                return await resp.json()
    except:
        pass
    return None


async def scrape_layer(session, layer_url, layer_name, all_records):
    try:
        count_data = await fetch_json(session, f"{layer_url}/query", {
            'where': '1=1', 'returnCountOnly': 'true', 'f': 'json'
        })

        if not count_data or 'count' not in count_data:
            return 0

        total = count_data['count']
        if total == 0:
            return 0

        logger.info(f"  {layer_name}: {total:,} records")

        offset = 0
        while offset < total:
            batch = await fetch_json(session, f"{layer_url}/query", {
                'where': '1=1', 'outFields': '*', 'resultOffset': offset,
                'resultRecordCount': 2000, 'f': 'json'
            })

            if batch and 'features' in batch:
                for f in batch['features']:
                    attrs = f.get('attributes', {})
                    attrs['_source'] = layer_name
                    attrs['_state'] = 'Ohio'
                    all_records.append(attrs)
                offset += len(batch['features'])
                if len(batch['features']) < 2000:
                    break
            else:
                break

            if offset % 10000 == 0:
                logger.info(f"    Progress: {offset:,}/{total:,}")

        return total

    except Exception as e:
        logger.error(f"  Error: {e}")
        return 0


async def main():
    logger.info("=" * 60)
    logger.info("OHIO SEPTIC SCRAPER")
    logger.info("=" * 60)

    all_records = []

    async with aiohttp.ClientSession() as session:
        for endpoint in OHIO_ENDPOINTS:
            logger.info(f"\nChecking: {endpoint}")

            try:
                data = await fetch_json(session, endpoint, {'f': 'json'})
                if not data:
                    continue

                services = data.get('services', [])
                for folder in data.get('folders', []):
                    folder_data = await fetch_json(session, f"{endpoint}/{folder}", {'f': 'json'})
                    if folder_data:
                        services.extend(folder_data.get('services', []))

                logger.info(f"  Found {len(services)} services")

                for svc in services:
                    svc_name = svc.get('name', '')
                    svc_type = svc.get('type', '')

                    if svc_type not in ['MapServer', 'FeatureServer']:
                        continue

                    name_lower = svc_name.lower()
                    if any(kw in name_lower for kw in KEYWORDS + ['environmental', 'health']):
                        svc_url = f"{endpoint}/{svc_name}/{svc_type}"
                        svc_data = await fetch_json(session, svc_url, {'f': 'json'})

                        if svc_data and 'layers' in svc_data:
                            for layer in svc_data['layers']:
                                layer_name = layer.get('name', '')
                                if any(kw in layer_name.lower() for kw in KEYWORDS):
                                    await scrape_layer(
                                        session,
                                        f"{svc_url}/{layer['id']}",
                                        f"{svc_name}/{layer_name}",
                                        all_records
                                    )

            except Exception as e:
                logger.error(f"Error: {e}")

    logger.info(f"\nOHIO COMPLETE: {len(all_records):,} records")

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = OUTPUT_DIR / f'ohio_septic_{timestamp}.json'

    with open(output_file, 'w') as f:
        json.dump({
            'state': 'Ohio',
            'count': len(all_records),
            'extracted_at': datetime.now().isoformat(),
            'records': all_records
        }, f)

    logger.info(f"Saved: {output_file}")


if __name__ == '__main__':
    asyncio.run(main())
