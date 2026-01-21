#!/usr/bin/env python3
"""
Direct database ingestion for Williamson County properties.

Bypasses the API and inserts properties directly into the production database,
then links permits by address hash.
"""

import hashlib
import json
import logging
import os
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List

import psycopg2
from psycopg2.extras import execute_values

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database connection
DATABASE_URL = "postgresql://postgres:HqKfMjYmMuPhdjXJqFuuNUTWzbPOvdJr@turntable.proxy.rlwy.net:27015/railway"

# File paths
SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR.parent / "output" / "williamson_county"
MATCHED_PROPERTIES_FILE = OUTPUT_DIR / "matched_properties.ndjson"


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
    }

    for pattern, replacement in replacements.items():
        normalized = re.sub(pattern, replacement, normalized)

    return normalized.strip()


def compute_address_hash(address_normalized: str, county_name: str, state_code: str) -> str:
    """Compute SHA256 hash for deduplication."""
    composite = f"{address_normalized or ''}|{county_name.upper()}|{state_code.upper()}"
    return hashlib.sha256(composite.encode()).hexdigest()


def load_properties(file_path: Path) -> List[Dict[str, Any]]:
    """Load properties from NDJSON file."""
    logger.info(f"Loading properties from {file_path}")
    properties = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                properties.append(json.loads(line))
    logger.info(f"Loaded {len(properties):,} properties")
    return properties


def get_state_county_ids(conn) -> tuple:
    """Get Tennessee state ID and Williamson county ID."""
    with conn.cursor() as cur:
        # Get Tennessee state ID
        cur.execute("SELECT id FROM states WHERE code = 'TN'")
        row = cur.fetchone()
        if not row:
            raise ValueError("Tennessee state not found in database")
        state_id = row[0]

        # Get Williamson county ID
        cur.execute("""
            SELECT id FROM counties
            WHERE state_id = %s AND normalized_name = 'WILLIAMSON'
        """, (state_id,))
        row = cur.fetchone()
        if not row:
            # Create Williamson county
            cur.execute("""
                INSERT INTO counties (state_id, name, normalized_name)
                VALUES (%s, 'Williamson', 'WILLIAMSON')
                RETURNING id
            """, (state_id,))
            county_id = cur.fetchone()[0]
            conn.commit()
            logger.info(f"Created Williamson county with ID {county_id}")
        else:
            county_id = row[0]

        logger.info(f"Using state_id={state_id}, county_id={county_id}")
        return state_id, county_id


def insert_properties(conn, properties: List[Dict], state_id: int, county_id: int) -> int:
    """Insert properties into the database."""
    logger.info(f"Inserting {len(properties):,} properties...")

    inserted = 0
    skipped = 0

    with conn.cursor() as cur:
        for i, prop in enumerate(properties):
            try:
                # Generate UUID
                prop_id = uuid.uuid4()

                # Get address info
                address = prop.get('address')
                address_normalized = prop.get('address_normalized') or normalize_address(address)
                address_hash = prop.get('address_hash')
                if not address_hash and address_normalized:
                    address_hash = compute_address_hash(address_normalized, 'Williamson', 'TN')

                # Check if already exists
                cur.execute("""
                    SELECT id FROM properties
                    WHERE address_hash = %s AND county_id = %s AND is_active = TRUE
                """, (address_hash, county_id))
                if cur.fetchone():
                    skipped += 1
                    continue

                # Parse dates
                last_sale_date = None
                if prop.get('last_sale_date'):
                    try:
                        last_sale_date = prop['last_sale_date']
                    except:
                        pass

                scraped_at = prop.get('scraped_at')
                if isinstance(scraped_at, str):
                    try:
                        scraped_at = datetime.fromisoformat(scraped_at.replace('Z', '+00:00'))
                    except:
                        scraped_at = datetime.now(timezone.utc)

                # Insert property
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
                    prop.get('street_number'), prop.get('street_name'), prop.get('city'), prop.get('subdivision'),
                    prop.get('parcel_id'), prop.get('gis_link'),
                    prop.get('centroid_lat'), prop.get('centroid_lon'),
                    prop.get('assessed_value'), prop.get('assessed_land'), prop.get('assessed_improvement'),
                    prop.get('market_value'), prop.get('market_land'), prop.get('market_improvement'),
                    prop.get('lot_size_acres'), prop.get('calculated_acres'), prop.get('square_footage'),
                    prop.get('property_type_code'), prop.get('property_type'), prop.get('parcel_type'),
                    prop.get('owner_name'), prop.get('owner_name_2'), prop.get('owner_mailing_address'),
                    prop.get('owner_city'), prop.get('owner_state'), prop.get('owner_zip'),
                    last_sale_date, prop.get('last_sale_price'), prop.get('deed_book'), prop.get('deed_page'),
                    prop.get('source_portal_code', 'williamson_arcgis'), prop.get('arcgis_object_id'), scraped_at,
                    False, prop.get('centroid_lat') is not None, True
                ))

                inserted += 1

                if (i + 1) % 500 == 0:
                    conn.commit()
                    logger.info(f"Progress: {i + 1:,}/{len(properties):,} - Inserted: {inserted:,}, Skipped: {skipped:,}")

            except Exception as e:
                logger.error(f"Error inserting property {i}: {e}")
                conn.rollback()
                continue

        conn.commit()

    logger.info(f"Inserted {inserted:,} properties, skipped {skipped:,} duplicates")
    return inserted


def link_permits(conn, state_id: int, county_id: int) -> int:
    """Link permits to properties by address hash."""
    logger.info("Linking permits to properties...")

    with conn.cursor() as cur:
        # Build address hash -> property_id lookup
        cur.execute("""
            SELECT address_hash, id FROM properties
            WHERE state_id = %s AND county_id = %s AND address_hash IS NOT NULL AND is_active = TRUE
        """, (state_id, county_id))
        hash_to_property = {row[0]: row[1] for row in cur.fetchall()}
        logger.info(f"Found {len(hash_to_property):,} properties with address hashes")

        # Find unlinked permits with matching hashes
        cur.execute("""
            SELECT id, address_hash FROM septic_permits
            WHERE state_id = %s AND county_id = %s
            AND address_hash IS NOT NULL AND property_id IS NULL AND is_active = TRUE
        """, (state_id, county_id))
        permits = cur.fetchall()
        logger.info(f"Found {len(permits):,} unlinked permits")

        # Link permits
        linked = 0
        for permit_id, address_hash in permits:
            if address_hash in hash_to_property:
                property_id = hash_to_property[address_hash]
                cur.execute("""
                    UPDATE septic_permits SET property_id = %s WHERE id = %s
                """, (str(property_id), str(permit_id)))
                linked += 1

        conn.commit()
        logger.info(f"Linked {linked:,} permits to properties")
        return linked


def main():
    logger.info("=" * 60)
    logger.info("DIRECT PROPERTY INGESTION")
    logger.info("=" * 60)

    # Check file exists
    if not MATCHED_PROPERTIES_FILE.exists():
        logger.error(f"File not found: {MATCHED_PROPERTIES_FILE}")
        sys.exit(1)

    # Load properties
    properties = load_properties(MATCHED_PROPERTIES_FILE)

    # Connect to database
    logger.info("Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)

    try:
        # Get state/county IDs
        state_id, county_id = get_state_county_ids(conn)

        # Insert properties
        inserted = insert_properties(conn, properties, state_id, county_id)

        # Link permits
        linked = link_permits(conn, state_id, county_id)

        logger.info("=" * 60)
        logger.info("INGESTION COMPLETE")
        logger.info(f"  Properties inserted: {inserted:,}")
        logger.info(f"  Permits linked: {linked:,}")
        logger.info("=" * 60)

    finally:
        conn.close()


if __name__ == "__main__":
    main()
