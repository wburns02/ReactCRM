#!/usr/bin/env python3
"""
Ingest ALL 100,369 properties from Williamson County ArcGIS scrape.

Previously we only ingested 3,908 pre-matched properties.
Now we ingest all of them to maximize permit linking potential.
"""

import hashlib
import json
import logging
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List

import psycopg2

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

DATABASE_URL = "postgresql://postgres:HqKfMjYmMuPhdjXJqFuuNUTWzbPOvdJr@turntable.proxy.rlwy.net:27015/railway"

SCRIPT_DIR = Path(__file__).parent
PROPERTIES_FILE = SCRIPT_DIR.parent / "output" / "williamson_county" / "properties" / "properties_checkpoint_100369.json"


def normalize_address(address: Optional[str]) -> Optional[str]:
    """Normalize address for matching."""
    if not address:
        return None

    normalized = address.upper().strip()
    normalized = re.sub(r'[.,#\'"()]+', ' ', normalized)
    normalized = re.sub(r'\s+', ' ', normalized)

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
        r'\bPARKWAY\b': 'PKWY',
        r'\bNORTH\b': 'N',
        r'\bSOUTH\b': 'S',
        r'\bEAST\b': 'E',
        r'\bWEST\b': 'W',
        r'\bHOLLOW\b': 'HOLW',
        r'\bCREEK\b': 'CRK',
        r'\bHIGHWAY\b': 'HWY',
    }

    for pattern, replacement in replacements.items():
        normalized = re.sub(pattern, replacement, normalized)

    return normalized.strip()


def compute_address_hash(address_normalized: str, county_name: str, state_code: str) -> str:
    """Compute SHA256 hash for deduplication."""
    composite = f"{address_normalized or ''}|{county_name.upper()}|{state_code.upper()}"
    return hashlib.sha256(composite.encode()).hexdigest()


def load_properties(file_path: Path) -> List[Dict[str, Any]]:
    """Load properties from JSON checkpoint file."""
    logger.info(f"Loading properties from {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    # Handle {'timestamp': ..., 'total_records': ..., 'data': [...]} format
    if isinstance(data, dict) and 'data' in data:
        properties = data['data']
    elif isinstance(data, dict) and 'properties' in data:
        properties = data['properties']
    elif isinstance(data, list):
        properties = data
    else:
        properties = list(data.values()) if isinstance(data, dict) else []
    logger.info(f"Loaded {len(properties):,} properties")
    return properties


def main():
    logger.info("=" * 60)
    logger.info("FULL PROPERTY INGESTION - 100K+ PROPERTIES")
    logger.info("=" * 60)

    if not PROPERTIES_FILE.exists():
        logger.error(f"File not found: {PROPERTIES_FILE}")
        return

    properties = load_properties(PROPERTIES_FILE)

    conn = psycopg2.connect(DATABASE_URL)

    try:
        with conn.cursor() as cur:
            # Get state/county IDs
            cur.execute("SELECT id FROM states WHERE code = 'TN'")
            state_id = cur.fetchone()[0]

            cur.execute("""
                SELECT id FROM counties
                WHERE state_id = %s AND normalized_name = 'WILLIAMSON'
            """, (state_id,))
            county_id = cur.fetchone()[0]
            logger.info(f"Using state_id={state_id}, county_id={county_id}")

            # Get existing address hashes to avoid duplicates
            cur.execute("""
                SELECT address_hash FROM properties
                WHERE county_id = %s AND is_active = TRUE AND address_hash IS NOT NULL
            """, (county_id,))
            existing_hashes = {row[0] for row in cur.fetchall()}
            logger.info(f"Found {len(existing_hashes):,} existing properties")

            inserted = 0
            skipped = 0
            errors = 0

            for i, prop in enumerate(properties):
                try:
                    # Get address - ArcGIS format
                    address = prop.get('address') or prop.get('ADDRESS')
                    if not address:
                        skipped += 1
                        continue

                    address_normalized = normalize_address(address)
                    if not address_normalized:
                        skipped += 1
                        continue

                    address_hash = compute_address_hash(address_normalized, 'Williamson', 'TN')

                    # Skip if already exists
                    if address_hash in existing_hashes:
                        skipped += 1
                        continue

                    # Mark as inserted to avoid re-processing
                    existing_hashes.add(address_hash)

                    # Extract fields - data is already normalized from scraper
                    prop_id = uuid.uuid4()

                    centroid_lat = prop.get('centroid_lat')
                    centroid_lon = prop.get('centroid_lon')
                    last_sale_date = prop.get('last_sale_date')

                    cur.execute("""
                        INSERT INTO properties (
                            id, state_id, county_id,
                            address, address_normalized, address_hash,
                            street_number, street_name, city, subdivision,
                            parcel_id, gis_link,
                            centroid_lat, centroid_lon,
                            assessed_value, assessed_land, assessed_improvement,
                            market_value, market_land, market_improvement,
                            lot_size_acres, calculated_acres, square_footage,
                            property_type_code, property_type, parcel_type,
                            owner_name, owner_name_2, owner_mailing_address,
                            owner_city, owner_state, owner_zip,
                            last_sale_date, last_sale_price, deed_book, deed_page,
                            source_portal_code, arcgis_object_id, scraped_at,
                            has_building_details, geocoded, is_active,
                            created_at, updated_at
                        ) VALUES (
                            %s, %s, %s,
                            %s, %s, %s,
                            %s, %s, %s, %s,
                            %s, %s,
                            %s, %s,
                            %s, %s, %s,
                            %s, %s, %s,
                            %s, %s, %s,
                            %s, %s, %s,
                            %s, %s, %s,
                            %s, %s, %s,
                            %s, %s, %s, %s,
                            %s, %s, %s,
                            %s, %s, %s,
                            NOW(), NOW()
                        )
                    """, (
                        str(prop_id), state_id, county_id,
                        address, address_normalized, address_hash,
                        prop.get('street_number'), prop.get('street_name'),
                        prop.get('city'), prop.get('subdivision'),
                        prop.get('parcel_id'), prop.get('gis_link'),
                        centroid_lat, centroid_lon,
                        prop.get('assessed_value'), prop.get('assessed_land'), prop.get('assessed_improvement'),
                        prop.get('market_value'), prop.get('market_land'), prop.get('market_improvement'),
                        prop.get('lot_size_acres'), prop.get('calculated_acres'), prop.get('square_footage'),
                        prop.get('property_type_code'), prop.get('property_type'), prop.get('parcel_type'),
                        prop.get('owner_name'), prop.get('owner_name_2'), prop.get('owner_mailing_address'),
                        prop.get('owner_city'), prop.get('owner_state'), prop.get('owner_zip'),
                        last_sale_date, prop.get('last_sale_price'), prop.get('deed_book'), prop.get('deed_page'),
                        prop.get('source_portal_code', 'williamson_arcgis_full'), prop.get('arcgis_object_id'),
                        datetime.now(timezone.utc),
                        False, centroid_lat is not None, True
                    ))

                    inserted += 1

                    if (i + 1) % 5000 == 0:
                        conn.commit()
                        logger.info(f"Progress: {i + 1:,}/{len(properties):,} - Inserted: {inserted:,}, Skipped: {skipped:,}")

                except Exception as e:
                    errors += 1
                    if errors <= 5:
                        logger.error(f"Error on property {i}: {e}")
                    conn.rollback()
                    continue

            conn.commit()

            # Get final count
            cur.execute("""
                SELECT COUNT(*) FROM properties WHERE county_id = %s AND is_active = TRUE
            """, (county_id,))
            total_count = cur.fetchone()[0]

            logger.info("=" * 60)
            logger.info("INGESTION COMPLETE")
            logger.info(f"  New properties inserted: {inserted:,}")
            logger.info(f"  Skipped (duplicates/no address): {skipped:,}")
            logger.info(f"  Errors: {errors:,}")
            logger.info(f"  Total properties in DB: {total_count:,}")
            logger.info("=" * 60)

    finally:
        conn.close()


if __name__ == "__main__":
    main()
