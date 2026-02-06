#!/usr/bin/env python3
"""
Multi-State ArcGIS Septic Data Scraper

Scrapes verified working ArcGIS endpoints for septic/OWTS data.
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

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/multi_state')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Verified working ArcGIS endpoints
ENDPOINTS = [
    {
        'name': 'Florida_Health_FLWMI_Wastewater',
        'url': 'https://gis.floridahealth.gov/server/rest/services/FLWMI/FLWMI_Wastewater/MapServer/0',
        'state': 'Florida',
        'max_records': 1000
    },
    {
        'name': 'Miami_Dade_DOH_Septic',
        'url': 'https://gisweb.miamidade.gov/arcgis/rest/services/Wasd/DOHSepticSystem_1_v1/MapServer/0',
        'state': 'Florida',
        'max_records': 1000
    },
    {
        'name': 'Orange_County_FL_Septic',
        'url': 'https://ocgis4.ocfl.net/arcgis/rest/services/AGOL_Open_Data/MapServer/69',
        'state': 'Florida',
        'max_records': 1000
    },
    {
        'name': 'Chatham_County_NC_Septic_Tanks',
        'url': 'https://gisservices.chathamcountync.gov/opendataagol/rest/services/EnvironmentalHealth/Chatham_SepticTanks/MapServer/0',
        'state': 'North Carolina',
        'max_records': 2000
    },
    {
        'name': 'Chatham_County_NC_Approved_Septic',
        'url': 'https://gisservices.chathamcountync.gov/opendataagol/rest/services/EnvironmentalHealth/Chatham_ApprovedSepticAreas/MapServer/0',
        'state': 'North Carolina',
        'max_records': 2000
    },
    {
        'name': 'Westchester_NY_Septic_PumpOut',
        'url': 'https://giswww.westchestergov.com/arcgis/rest/services/MappingWestchesterCounty/MapServer/201',
        'state': 'New York',
        'max_records': 1000
    },
    {
        'name': 'Maryland_Septic_Growth_Tiers',
        'url': 'https://mdpgis.mdp.state.md.us/arcgis/rest/services/PlanningCadastre/Septic_Growth_Tiers/MapServer/0',
        'state': 'Maryland',
        'max_records': 2000
    },
    {
        'name': 'Connecticut_Soil_Septic',
        'url': 'https://services1.arcgis.com/FjPcSmEFuDYlIdKC/arcgis/rest/services/Soils_Subsurface_Sewage_Disposal_Systems/FeatureServer/0',
        'state': 'Connecticut',
        'max_records': 2000
    },
]


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


async def fetch_records_batch(session, url, offset, batch_size=1000):
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


async def scrape_endpoint(session, endpoint):
    """Scrape all records from an endpoint."""
    name = endpoint['name']
    url = endpoint['url']
    batch_size = endpoint.get('max_records', 1000)

    logger.info(f"\n{'='*60}")
    logger.info(f"Scraping: {name}")
    logger.info(f"URL: {url}")
    logger.info(f"State: {endpoint['state']}")

    # Get total count
    count = await get_record_count(session, url)
    logger.info(f"Total records: {count:,}")

    if count == 0:
        logger.warning(f"No records found for {name}")
        return {'name': name, 'state': endpoint['state'], 'count': 0, 'records': []}

    # Fetch all records
    all_records = []
    offset = 0

    while offset < count:
        batch = await fetch_records_batch(session, url, offset, batch_size)
        if not batch:
            break

        all_records.extend(batch)
        offset += len(batch)

        if offset % 10000 == 0 or offset >= count:
            logger.info(f"  Progress: {offset:,}/{count:,} ({100*offset/count:.1f}%)")

        await asyncio.sleep(0.3)  # Rate limiting

    logger.info(f"  Downloaded {len(all_records):,} records")

    return {
        'name': name,
        'state': endpoint['state'],
        'url': url,
        'count': len(all_records),
        'records': all_records
    }


async def main():
    logger.info("=" * 60)
    logger.info("MULTI-STATE ARCGIS SEPTIC SCRAPER")
    logger.info(f"Endpoints to scrape: {len(ENDPOINTS)}")
    logger.info("=" * 60)

    all_results = []
    total_records = 0

    async with aiohttp.ClientSession() as session:
        for endpoint in ENDPOINTS:
            try:
                result = await scrape_endpoint(session, endpoint)
                all_results.append(result)
                total_records += result['count']

                # Save intermediate results
                if result['count'] > 0:
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    safe_name = result['name'].replace(' ', '_')
                    output_file = OUTPUT_DIR / f"{safe_name}_{timestamp}.json"

                    with open(output_file, 'w') as f:
                        json.dump({
                            'source': result['name'],
                            'state': result['state'],
                            'url': result['url'],
                            'count': result['count'],
                            'extracted_at': datetime.now().isoformat(),
                            'records': result['records']
                        }, f)

                    logger.info(f"  Saved to {output_file}")

            except Exception as e:
                logger.error(f"Error scraping {endpoint['name']}: {e}")

            await asyncio.sleep(1)  # Pause between endpoints

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("MULTI-STATE SCRAPER COMPLETE")
    logger.info("=" * 60)

    for result in all_results:
        logger.info(f"  {result['name']}: {result['count']:,} records")

    logger.info(f"\nTOTAL RECORDS: {total_records:,}")

    # Save summary
    summary_file = OUTPUT_DIR / f"scrape_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(summary_file, 'w') as f:
        json.dump({
            'total_records': total_records,
            'endpoints_scraped': len(all_results),
            'extracted_at': datetime.now().isoformat(),
            'results': [{k: v for k, v in r.items() if k != 'records'} for r in all_results]
        }, f, indent=2)

    logger.info(f"Summary saved to {summary_file}")


if __name__ == '__main__':
    asyncio.run(main())
