#!/usr/bin/env python3
"""
Williamson County ArcGIS Property Data Scraper

Scrapes property assessment data from Williamson County's ArcGIS REST API.
Source: http://arcgis2.williamson-tn.org/arcgis/rest/services/Williamson_Map_v10_LATEST2/MapServer/4

Data extracted:
- Owner information (owner1, owner2, mailing address)
- Address (ADDRESS, streetnumber, streetname, SUBDIVISION)
- Parcel IDs (parcel_id, GISLINK)
- Assessment values (total_asse, total_mark, imp_val, land_marke)
- Lot size (CALC_ACRE, AC, SQFT_ASSES)
- Transfer info (pxfer_date, deed_book, deed_page, considerat)

Note: Building details (year_built, bedrooms, foundation) require INIGO portal scraping.
"""

import asyncio
import aiohttp
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, List, Any
import re
import hashlib

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('williamson_arcgis_scraper.log')
    ]
)
logger = logging.getLogger(__name__)

# ArcGIS REST API Configuration
ARCGIS_BASE_URL = "http://arcgis2.williamson-tn.org/arcgis/rest/services/Williamson_Map_v10_LATEST2/MapServer/4"
QUERY_ENDPOINT = f"{ARCGIS_BASE_URL}/query"

# Fields to retrieve
OUT_FIELDS = [
    "OBJECTID", "GISLINK", "parcel_id", "county", "CITY",
    "ADDRESS", "streetnumber", "streetname", "SUBDIVISION",
    "owner1", "owner2", "own_street", "own_city", "own_state", "own_zip",
    "imp_assess", "imp_val", "land_asses", "land_marke", "total_asse", "total_mark",
    "AC", "CALC_ACRE", "SQFT_ASSES",
    "pxfer_date", "deed_book", "deed_page", "considerat",
    "property_T", "PARCEL_TYP"
]

# Output directory
OUTPUT_DIR = Path("C:/Users/Will/crm-work/ReactCRM/scrapers/output/williamson_county/properties")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def normalize_address(address: Optional[str]) -> Optional[str]:
    """Normalize address for matching."""
    if not address:
        return None

    # Uppercase and strip
    normalized = address.upper().strip()

    # Remove multiple spaces
    normalized = re.sub(r'\s+', ' ', normalized)

    # Standardize abbreviations
    replacements = {
        r'\bSTREET\b': 'ST',
        r'\bROAD\b': 'RD',
        r'\bDRIVE\b': 'DR',
        r'\bAVENUE\b': 'AVE',
        r'\bBOULEVARD\b': 'BLVD',
        r'\bLANE\b': 'LN',
        r'\bCOURT\b': 'CT',
        r'\bCIRCLE\b': 'CIR',
        r'\bPLACE\b': 'PL',
        r'\bTERRACE\b': 'TER',
        r'\bNORTH\b': 'N',
        r'\bSOUTH\b': 'S',
        r'\bEAST\b': 'E',
        r'\bWEST\b': 'W',
        r'\bHOLLOW\b': 'HOLW',
    }

    for pattern, replacement in replacements.items():
        normalized = re.sub(pattern, replacement, normalized)

    return normalized


def compute_address_hash(address_normalized: str, county: str, state: str) -> str:
    """Compute SHA256 hash for deduplication."""
    composite = f"{address_normalized or ''}|{county.upper()}|{state.upper()}"
    return hashlib.sha256(composite.encode()).hexdigest()


def convert_unix_timestamp(ms_timestamp: Optional[int]) -> Optional[str]:
    """Convert Unix millisecond timestamp to ISO date string."""
    if not ms_timestamp:
        return None
    try:
        dt = datetime.fromtimestamp(ms_timestamp / 1000, tz=timezone.utc)
        return dt.strftime('%Y-%m-%d')
    except (ValueError, OSError):
        return None


def extract_property_data(feature: Dict[str, Any]) -> Dict[str, Any]:
    """Extract and transform property data from ArcGIS feature."""
    attrs = feature.get('attributes', {})
    geometry = feature.get('geometry', {})

    # Get address
    address = attrs.get('ADDRESS') or ''
    address_normalized = normalize_address(address)

    # Extract centroid from polygon if available
    centroid_lat = None
    centroid_lon = None
    if geometry and 'rings' in geometry:
        rings = geometry['rings']
        if rings and rings[0]:
            coords = rings[0]
            xs = [c[0] for c in coords]
            ys = [c[1] for c in coords]
            centroid_lon = sum(xs) / len(xs)
            centroid_lat = sum(ys) / len(ys)

    # Build owner mailing address
    owner_mailing = None
    if attrs.get('own_street'):
        parts = [attrs.get('own_street')]
        city_state_zip = []
        if attrs.get('own_city'):
            city_state_zip.append(attrs.get('own_city'))
        if attrs.get('own_state'):
            city_state_zip.append(attrs.get('own_state'))
        if attrs.get('own_zip'):
            city_state_zip.append(attrs.get('own_zip'))
        if city_state_zip:
            parts.append(', '.join(city_state_zip))
        owner_mailing = ', '.join(parts)

    # Convert property type code to readable string
    property_type_code = attrs.get('property_T')
    property_type = map_property_type(property_type_code)

    return {
        # Identifiers
        'arcgis_object_id': attrs.get('OBJECTID'),
        'gis_link': attrs.get('GISLINK'),
        'parcel_id': attrs.get('parcel_id'),

        # Address
        'address': address,
        'address_normalized': address_normalized,
        'address_hash': compute_address_hash(address_normalized, 'WILLIAMSON', 'TN') if address_normalized else None,
        'street_number': attrs.get('streetnumber'),
        'street_name': attrs.get('streetname'),
        'city': attrs.get('CITY'),
        'subdivision': attrs.get('SUBDIVISION'),
        'county': attrs.get('county') or '094',  # Williamson County FIPS

        # Geo
        'centroid_lat': centroid_lat,
        'centroid_lon': centroid_lon,

        # Owner info
        'owner_name': attrs.get('owner1'),
        'owner_name_2': attrs.get('owner2'),
        'owner_mailing_address': owner_mailing,
        'owner_city': attrs.get('own_city'),
        'owner_state': attrs.get('own_state'),
        'owner_zip': attrs.get('own_zip'),

        # Assessment values
        'assessed_value': safe_int(attrs.get('total_asse')),
        'assessed_land': safe_int(attrs.get('land_asses')),
        'assessed_improvement': safe_int(attrs.get('imp_assess')),
        'market_value': safe_int(attrs.get('total_mark')),
        'market_land': safe_int(attrs.get('land_marke')),
        'market_improvement': safe_int(attrs.get('imp_val')),

        # Lot size
        'lot_size_acres': attrs.get('AC'),
        'calculated_acres': attrs.get('CALC_ACRE'),
        'square_footage': safe_int(attrs.get('SQFT_ASSES')),

        # Property type
        'property_type_code': str(property_type_code) if property_type_code else None,
        'property_type': property_type,
        'parcel_type': attrs.get('PARCEL_TYP'),

        # Transfer info
        'last_sale_date': convert_unix_timestamp(attrs.get('pxfer_date')),
        'last_sale_price': safe_int(attrs.get('considerat')),
        'deed_book': attrs.get('deed_book'),
        'deed_page': attrs.get('deed_page'),

        # Metadata
        'source_portal_code': 'williamson_arcgis',
        'scraped_at': datetime.now(timezone.utc).isoformat(),
        'state_code': 'TN',
        'county_name': 'Williamson',

        # Raw data for debugging
        'raw_arcgis_data': attrs
    }


def safe_int(value) -> Optional[int]:
    """Safely convert to integer."""
    if value is None:
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None


def map_property_type(code) -> Optional[str]:
    """Map property type code to human-readable string."""
    if code is None:
        return None

    # Common Williamson County property type codes
    type_map = {
        1: 'single_family',
        2: 'duplex',
        3: 'triplex',
        4: 'fourplex',
        5: 'multi_family',
        10: 'residential',
        20: 'commercial',
        30: 'industrial',
        40: 'agricultural',
        50: 'vacant_land',
        60: 'exempt',
    }

    try:
        code_int = int(float(code))
        return type_map.get(code_int, f'code_{code_int}')
    except (ValueError, TypeError):
        return str(code)


async def query_parcels(
    session: aiohttp.ClientSession,
    where_clause: str = "1=1",
    offset: int = 0,
    batch_size: int = 1000,
    min_objectid: Optional[int] = None
) -> Dict[str, Any]:
    """
    Query ArcGIS REST API for parcel data.

    Args:
        session: aiohttp session
        where_clause: SQL WHERE clause for filtering
        offset: Result offset for pagination (may be ignored by server)
        batch_size: Number of records per request (max ~1000)
        min_objectid: For OBJECTID-based pagination (more reliable)

    Returns:
        JSON response with features
    """
    # Use OBJECTID-based pagination if server ignores offset
    effective_where = where_clause
    if min_objectid is not None:
        if where_clause == "1=1":
            effective_where = f"OBJECTID > {min_objectid}"
        else:
            effective_where = f"({where_clause}) AND OBJECTID > {min_objectid}"

    params = {
        'where': effective_where,
        'outFields': ','.join(OUT_FIELDS),
        'returnGeometry': 'true',
        'outSR': '4326',  # WGS84 lat/lon
        'f': 'json',
        'orderByFields': 'OBJECTID ASC',
        'resultRecordCount': batch_size
    }

    try:
        async with session.get(QUERY_ENDPOINT, params=params, timeout=60) as response:
            if response.status == 200:
                # Handle text/plain content type - server returns JSON with wrong mimetype
                text = await response.text()
                data = json.loads(text)
                return data
            else:
                logger.error(f"Query failed with status {response.status}")
                return {'features': [], 'error': f'HTTP {response.status}'}
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        return {'features': [], 'error': str(e)}
    except Exception as e:
        logger.error(f"Query error: {e}")
        return {'features': [], 'error': str(e)}


async def get_total_count(session: aiohttp.ClientSession, where_clause: str = "1=1") -> int:
    """Get total record count for query."""
    params = {
        'where': where_clause,
        'returnCountOnly': 'true',
        'f': 'json'
    }

    try:
        async with session.get(QUERY_ENDPOINT, params=params, timeout=30) as response:
            if response.status == 200:
                # Handle text/plain content type
                text = await response.text()
                data = json.loads(text)
                return data.get('count', 0)
    except json.JSONDecodeError as e:
        logger.error(f"Count JSON decode error: {e}")
    except Exception as e:
        logger.error(f"Count query error: {e}")

    return 0


async def scrape_all_properties(batch_size: int = 1000, save_interval: int = 5000) -> List[Dict]:
    """
    Scrape all property records from Williamson County ArcGIS.

    Args:
        batch_size: Records per API request
        save_interval: Save checkpoint every N records

    Returns:
        List of property records
    """
    logger.info("=" * 60)
    logger.info("WILLIAMSON COUNTY ARCGIS PROPERTY SCRAPER")
    logger.info("=" * 60)

    all_properties = []
    seen_parcel_ids = set()

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
    }

    async with aiohttp.ClientSession(headers=headers) as session:
        # Get total count
        total_count = await get_total_count(session)
        logger.info(f"Total parcels in database: {total_count:,}")

        if total_count == 0:
            logger.error("No records found or count query failed")
            return []

        batch_num = 0
        max_objectid = 0  # Track highest OBJECTID seen for pagination
        consecutive_empty = 0  # Track empty batches to detect end

        while len(all_properties) < total_count and consecutive_empty < 3:
            batch_num += 1
            logger.info(f"Fetching batch {batch_num} (after OBJECTID {max_objectid:,}, have {len(all_properties):,} / {total_count:,})")

            # Use OBJECTID-based pagination
            result = await query_parcels(session, batch_size=batch_size, min_objectid=max_objectid if max_objectid > 0 else None)

            features = result.get('features', [])
            if not features:
                consecutive_empty += 1
                logger.warning(f"No features in batch {batch_num}, empty count: {consecutive_empty}")
                if result.get('error'):
                    logger.error(f"API error: {result.get('error')}")
                continue

            consecutive_empty = 0  # Reset on success

            # Process features
            batch_max_id = 0
            for feature in features:
                prop = extract_property_data(feature)

                # Track max OBJECTID for pagination
                object_id = prop.get('arcgis_object_id')
                if object_id:
                    batch_max_id = max(batch_max_id, object_id)

                    # Skip if already seen
                    if object_id in seen_parcel_ids:
                        continue

                    seen_parcel_ids.add(object_id)

                all_properties.append(prop)

            # Update max OBJECTID for next query
            if batch_max_id > 0:
                max_objectid = batch_max_id

            logger.info(f"  → {len(features)} features, {len(all_properties)} total unique, max OBJECTID: {max_objectid:,}")

            # Save checkpoint
            if len(all_properties) % save_interval < batch_size:
                checkpoint_file = OUTPUT_DIR / f"properties_checkpoint_{len(all_properties)}.json"
                with open(checkpoint_file, 'w') as f:
                    json.dump({
                        'timestamp': datetime.now().isoformat(),
                        'total_records': len(all_properties),
                        'data': all_properties
                    }, f, indent=2)
                logger.info(f"  → Checkpoint saved: {checkpoint_file}")

            # Rate limiting - be polite to the server
            await asyncio.sleep(0.5)

    # Save final results
    final_file = OUTPUT_DIR / f"williamson_properties_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(final_file, 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'source': 'williamson_arcgis',
            'total_records': len(all_properties),
            'data': all_properties
        }, f, indent=2)

    # Also save as NDJSON for streaming
    ndjson_file = OUTPUT_DIR / f"williamson_properties_{datetime.now().strftime('%Y%m%d_%H%M%S')}.ndjson"
    with open(ndjson_file, 'w') as f:
        for prop in all_properties:
            f.write(json.dumps(prop) + '\n')

    logger.info("=" * 60)
    logger.info(f"SCRAPING COMPLETE")
    logger.info(f"Total unique properties: {len(all_properties):,}")
    logger.info(f"Saved to: {final_file}")
    logger.info(f"NDJSON: {ndjson_file}")
    logger.info("=" * 60)

    return all_properties


async def scrape_by_address(address: str) -> Optional[Dict]:
    """
    Scrape property data for a specific address.

    Args:
        address: Property address to search

    Returns:
        Property record or None
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
    }

    # Clean address for query
    address_clean = address.upper().strip().replace("'", "''")
    where_clause = f"ADDRESS LIKE '%{address_clean}%'"

    async with aiohttp.ClientSession(headers=headers) as session:
        result = await query_parcels(session, where_clause=where_clause, batch_size=10)

        features = result.get('features', [])
        if features:
            return extract_property_data(features[0])

    return None


async def test_api():
    """Test the ArcGIS API with a sample query."""
    logger.info("Testing Williamson County ArcGIS API...")

    headers = {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
    }

    async with aiohttp.ClientSession(headers=headers) as session:
        # Test count
        count = await get_total_count(session)
        logger.info(f"Total parcels: {count:,}")

        # Test sample query
        result = await query_parcels(session, batch_size=3)
        features = result.get('features', [])

        if features:
            logger.info(f"Sample query returned {len(features)} records")
            sample = extract_property_data(features[0])
            logger.info(f"Sample property:")
            logger.info(f"  Address: {sample.get('address')}")
            logger.info(f"  Owner: {sample.get('owner_name')}")
            logger.info(f"  Parcel: {sample.get('parcel_id')}")
            logger.info(f"  Market Value: ${sample.get('market_value', 0):,}")
            logger.info(f"  Acres: {sample.get('lot_size_acres')}")
            return True
        else:
            logger.error("No records returned")
            return False


if __name__ == '__main__':
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == '--test':
        asyncio.run(test_api())
    elif len(sys.argv) > 1 and sys.argv[1] == '--address':
        address = ' '.join(sys.argv[2:])
        result = asyncio.run(scrape_by_address(address))
        if result:
            print(json.dumps(result, indent=2))
        else:
            print(f"No property found for: {address}")
    else:
        asyncio.run(scrape_all_properties())
