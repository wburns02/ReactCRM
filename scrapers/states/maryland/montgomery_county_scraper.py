#!/usr/bin/env python3
"""
Montgomery County, MD Sewage Disposal Permits Scraper

Source: Montgomery County Open Data Portal
URL: https://data.montgomerycountymd.gov/Licenses-Permits/Sewage-Disposal-Permits/jf73-mva3

Estimated records: 30,000+
Format: Socrata Open Data API
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

OUTPUT_DIR = Path('C:/Users/Will/crm-work/ReactCRM/scrapers/output/maryland')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Montgomery County uses Socrata API
SOCRATA_BASE = "https://data.montgomerycountymd.gov/resource/jf73-mva3.json"
SOCRATA_COUNT_URL = "https://data.montgomerycountymd.gov/resource/jf73-mva3.json?$select=count(*)"


async def get_total_count(session):
    """Get total record count from Socrata API."""
    try:
        async with session.get(SOCRATA_COUNT_URL, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status == 200:
                data = await resp.json()
                if data and len(data) > 0:
                    return int(data[0].get('count', 0))
    except Exception as e:
        logger.error(f"Error getting count: {e}")
    return 0


async def fetch_records_batch(session, offset, limit=50000):
    """Fetch a batch of records from Socrata API."""
    try:
        url = f"{SOCRATA_BASE}?$limit={limit}&$offset={offset}"
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=120)) as resp:
            if resp.status == 200:
                return await resp.json()
    except Exception as e:
        logger.error(f"Error fetching batch at offset {offset}: {e}")
    return []


async def scrape_montgomery_county():
    """Scrape Montgomery County sewage disposal permits."""
    logger.info("=" * 60)
    logger.info("MONTGOMERY COUNTY, MD SEWAGE PERMITS SCRAPER")
    logger.info("=" * 60)

    all_records = []

    async with aiohttp.ClientSession() as session:
        # Get total count
        total = await get_total_count(session)
        logger.info(f"Total records: {total:,}")

        if total == 0:
            # Try fetching directly without count
            logger.info("Trying direct fetch...")
            records = await fetch_records_batch(session, 0, 50000)
            if records:
                total = len(records)
                all_records.extend(records)
                logger.info(f"Fetched {len(records):,} records")

        else:
            # Batch download
            batch_size = 50000
            offset = 0

            while offset < total:
                batch = await fetch_records_batch(session, offset, batch_size)
                if not batch:
                    break

                all_records.extend(batch)
                offset += len(batch)

                logger.info(f"Progress: {offset:,}/{total:,} ({100*offset/total:.1f}%)")
                await asyncio.sleep(0.5)

    return all_records


async def main():
    logger.info("=" * 60)
    logger.info("MONTGOMERY COUNTY MD SEWAGE PERMITS SCRAPER")
    logger.info("Target: ~30,000 records")
    logger.info("=" * 60)

    records = await scrape_montgomery_county()

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("MONTGOMERY COUNTY SCRAPER COMPLETE")
    logger.info(f"Total records: {len(records):,}")
    logger.info("=" * 60)

    if records:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = OUTPUT_DIR / f'montgomery_county_sewage_{timestamp}.json'

        with open(output_file, 'w') as f:
            json.dump({
                'state': 'Maryland',
                'county': 'Montgomery County',
                'count': len(records),
                'extracted_at': datetime.now().isoformat(),
                'records': records
            }, f)

        logger.info(f"Saved {len(records):,} records to {output_file}")

        # Show sample record
        if records:
            logger.info("\nSample record fields:")
            for key in list(records[0].keys())[:10]:
                logger.info(f"  - {key}: {records[0].get(key)}")


if __name__ == '__main__':
    asyncio.run(main())
