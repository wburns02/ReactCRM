#!/usr/bin/env python3
"""
Complete Property Ingestion for Williamson County TN

Resumes ingestion of the full 100,369 property dataset.
Previous ingestion timed out after ~32k records.

This script:
1. Loads existing hashes from database
2. Loads all properties from JSON
3. Inserts only missing properties
4. Uses batch commits for reliability
"""

import hashlib
import json
import logging
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List, Set

import psycopg2

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

DATABASE_URL = "postgresql://postgres:HqKfMjYmMuPhdjXJqFuuNUTWzbPOvdJr@turntable.proxy.rlwy.net:27015/railway"

SCRIPT_DIR = Path(__file__).parent
PROPERTIES_FILE = SCRIPT_DIR.parent / "output" / "williamson_county" / "properties" / "properties_checkpoint_100369.json"

BATCH_SIZE = 500  # Commit every 500 records


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

    if isinstance(data, dict) and 'data' in data:
        properties = data['data']
    elif isinstance(data, dict) and 'properties' in data:
        properties = data['properties']
    elif isinstance(data, list):
        properties = data
    else:
        properties = list(data.values()) if isinstance(data, dict) else []

    logger.info(f"Loaded {len(properties):,} properties from file")
    return properties


def get_existing_hashes(conn, county_id: int) -> Set[str]:
    """Get all existing address hashes from database."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT address_hash FROM properties
            WHERE county_id = %s AND is_active = TRUE AND address_hash IS NOT NULL
        """, (county_id,))
        hashes = {row[0] for row in cur.fetchall()}
    logger.info(f"Found {len(hashes):,} existing properties in database")
    return hashes


def main():
    logger.info("=" * 70)
    logger.info("COMPLETE PROPERTY INGESTION - Williamson County TN")
    logger.info("=" * 70)

    if not PROPERTIES_FILE.exists():
        logger.error(f"File not found: {PROPERTIES_FILE}")
        return

    # Load all properties from file
    all_properties = load_properties(PROPERTIES_FILE)

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

            # Get existing hashes
            existing_hashes = get_existing_hashes(conn, county_id)

            # Filter to only new properties
            new_properties = []
            for prop in all_properties:
                address = prop.get('address')
                if not address:
                    continue

                address_normalized = prop.get('address_normalized') or normalize_address(address)
                if not address_normalized:
                    continue

                address_hash = prop.get('address_hash')
                if not address_hash:
                    address_hash = compute_address_hash(address_normalized, 'Williamson', 'TN')

                if address_hash not in existing_hashes:
                    prop['_computed_hash'] = address_hash
                    prop['_computed_norm'] = address_normalized
                    new_properties.append(prop)
                    existing_hashes.add(address_hash)  # Avoid duplicates in same batch

            logger.info(f"Found {len(new_properties):,} NEW properties to insert")

            if not new_properties:
                logger.info("No new properties to insert. Database is complete.")
                return

            # Insert new properties in batches
            inserted = 0
            errors = 0

            for i, prop in enumerate(new_properties):
                try:
                    prop_id = uuid.uuid4()
                    address = prop.get('address')
                    address_normalized = prop.get('_computed_norm')
                    address_hash = prop.get('_computed_hash')

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
                        prop.get('source_portal_code', 'williamson_arcgis_complete'), prop.get('arcgis_object_id'),
                        datetime.now(timezone.utc),
                        False, centroid_lat is not None, True
                    ))

                    inserted += 1

                    # Batch commit
                    if (i + 1) % BATCH_SIZE == 0:
                        conn.commit()
                        logger.info(f"Progress: {i + 1:,}/{len(new_properties):,} - Inserted: {inserted:,}")

                except Exception as e:
                    errors += 1
                    if errors <= 5:
                        logger.error(f"Error on property {i}: {e}")
                    conn.rollback()
                    continue

            # Final commit
            conn.commit()

            # Get final count
            cur.execute("""
                SELECT COUNT(*) FROM properties WHERE county_id = %s AND is_active = TRUE
            """, (county_id,))
            total_count = cur.fetchone()[0]

            logger.info("=" * 70)
            logger.info("INGESTION COMPLETE")
            logger.info("=" * 70)
            logger.info(f"  New properties inserted: {inserted:,}")
            logger.info(f"  Errors: {errors:,}")
            logger.info(f"  TOTAL PROPERTIES IN DB: {total_count:,}")
            logger.info("=" * 70)

    finally:
        conn.close()


if __name__ == "__main__":
    main()
