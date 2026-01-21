#!/usr/bin/env python3
"""
Improved Permit-to-Property Linking for Williamson County

This script addresses the issue where only 2,296 out of 10,029 permits were linked
because permit addresses contain extra text (lot numbers, tract info, prefixes)
that don't exist in property records.

Strategy:
1. Clean permit addresses by removing parenthetical content, lot/tract info
2. Extract core street address
3. Compute new hash and match against properties
4. Link additional permits
"""

import hashlib
import re
import psycopg2
from typing import Optional, Tuple
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

DATABASE_URL = "postgresql://postgres:HqKfMjYmMuPhdjXJqFuuNUTWzbPOvdJr@turntable.proxy.rlwy.net:27015/railway"


def clean_address(address: Optional[str]) -> Optional[str]:
    """
    Clean address by removing extra text that prevents matching.

    Examples:
    - "(stck 401) 7243 Murrel Drive" -> "7243 MURREL DR"
    - "7277 Murrel Drive (stck 312)" -> "7277 MURREL DR"
    - "Starnes Creek lot 101 at 7200 Murrel Drive" -> "7200 MURREL DR"
    - "(VACANT) BETHESDA RD" -> "BETHESDA RD"
    """
    if not address:
        return None

    cleaned = address.upper().strip()

    # Remove parenthetical content at start or end
    cleaned = re.sub(r'^\([^)]+\)\s*', '', cleaned)  # (stck 401) at start
    cleaned = re.sub(r'\s*\([^)]+\)$', '', cleaned)  # (stck 312) at end
    cleaned = re.sub(r'\s*\([^)]+\)\s*', ' ', cleaned)  # (anything) in middle

    # Extract address after "at" if present (e.g., "lot 101 at 7200 Murrel Drive")
    at_match = re.search(r'\bAT\s+(\d+\s+.+)$', cleaned, re.IGNORECASE)
    if at_match:
        cleaned = at_match.group(1)

    # Remove lot/tract/phase/unit prefixes
    cleaned = re.sub(r'^(LOT|TRACT|PHASE|UNIT|STCK)\s*\d*[A-Z]?\s*', '', cleaned)
    cleaned = re.sub(r'\b(LOT|TRACT|PHASE|UNIT|STCK)\s*\d+[A-Z]?\b', '', cleaned)

    # Remove "VACANT" marker
    cleaned = re.sub(r'\bVACANT\b', '', cleaned)

    # Remove subdivision/property names before street number
    # Pattern: words before a street number
    street_match = re.search(r'(\d+\s+[A-Z].+)', cleaned)
    if street_match:
        cleaned = street_match.group(1)

    # Standard normalization (same as direct_ingestion.py)
    cleaned = re.sub(r'[.,#\'"()]+', ' ', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned)

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
        r'\bPIKE\b': 'PK',
    }

    for pattern, replacement in replacements.items():
        cleaned = re.sub(pattern, replacement, cleaned)

    return cleaned.strip() if cleaned.strip() else None


def compute_address_hash(address_normalized: str, county_name: str, state_code: str) -> str:
    """Compute SHA256 hash for matching."""
    composite = f"{address_normalized or ''}|{county_name.upper()}|{state_code.upper()}"
    return hashlib.sha256(composite.encode()).hexdigest()


def main():
    logger.info("=" * 60)
    logger.info("IMPROVED PERMIT-TO-PROPERTY LINKING")
    logger.info("=" * 60)

    conn = psycopg2.connect(DATABASE_URL)

    try:
        with conn.cursor() as cur:
            # Get state and county IDs
            cur.execute("SELECT id FROM states WHERE code = 'TN'")
            state_id = cur.fetchone()[0]

            cur.execute("""
                SELECT id FROM counties
                WHERE state_id = %s AND normalized_name = 'WILLIAMSON'
            """, (state_id,))
            county_id = cur.fetchone()[0]

            # Build property lookup by address hash
            cur.execute("""
                SELECT address_hash, id, address_normalized
                FROM properties
                WHERE county_id = %s AND is_active = TRUE AND address_hash IS NOT NULL
            """, (county_id,))
            property_lookup = {row[0]: (row[1], row[2]) for row in cur.fetchall()}
            logger.info(f"Loaded {len(property_lookup):,} properties for matching")

            # Also build lookup by cleaned address (without hash)
            # to enable matching on cleaned text directly
            address_to_property = {}
            for hash_val, (prop_id, addr_norm) in property_lookup.items():
                if addr_norm:
                    address_to_property[addr_norm] = prop_id

            # Get unlinked permits
            cur.execute("""
                SELECT id, address, address_normalized, address_hash
                FROM septic_permits
                WHERE state_id = %s AND county_id = %s
                  AND property_id IS NULL AND is_active = TRUE
            """, (state_id, county_id))
            unlinked_permits = cur.fetchall()
            logger.info(f"Found {len(unlinked_permits):,} unlinked permits")

            # Try to link each permit
            linked_by_hash = 0
            linked_by_address = 0
            still_unlinked = 0

            for permit_id, address, address_normalized, address_hash in unlinked_permits:
                # Clean the address
                cleaned = clean_address(address)

                if not cleaned:
                    still_unlinked += 1
                    continue

                # Try direct address match first
                if cleaned in address_to_property:
                    property_id = address_to_property[cleaned]
                    cur.execute("""
                        UPDATE septic_permits SET property_id = %s WHERE id = %s
                    """, (str(property_id), str(permit_id)))
                    linked_by_address += 1
                    continue

                # Try hash match with cleaned address
                new_hash = compute_address_hash(cleaned, 'Williamson', 'TN')
                if new_hash in property_lookup:
                    property_id = property_lookup[new_hash][0]
                    cur.execute("""
                        UPDATE septic_permits SET property_id = %s WHERE id = %s
                    """, (str(property_id), str(permit_id)))
                    linked_by_hash += 1
                    continue

                still_unlinked += 1

            conn.commit()

            # Final statistics
            cur.execute("""
                SELECT COUNT(*) FROM septic_permits
                WHERE state_id = %s AND county_id = %s AND property_id IS NOT NULL
            """, (state_id, county_id))
            total_linked = cur.fetchone()[0]

            cur.execute("""
                SELECT COUNT(*) FROM septic_permits
                WHERE state_id = %s AND county_id = %s
            """, (state_id, county_id))
            total_permits = cur.fetchone()[0]

            logger.info("=" * 60)
            logger.info("LINKING RESULTS")
            logger.info("=" * 60)
            logger.info(f"  Newly linked by address match: {linked_by_address:,}")
            logger.info(f"  Newly linked by hash match: {linked_by_hash:,}")
            logger.info(f"  Still unlinked: {still_unlinked:,}")
            logger.info(f"  Total linked now: {total_linked:,} / {total_permits:,}")
            logger.info(f"  Link rate: {total_linked/total_permits*100:.1f}%")
            logger.info("=" * 60)

            # Show sample of still-unlinked for analysis
            logger.info("\nSample of still-unlinked permits:")
            cur.execute("""
                SELECT address, address_normalized
                FROM septic_permits
                WHERE state_id = %s AND county_id = %s AND property_id IS NULL
                LIMIT 10
            """, (state_id, county_id))
            for addr, norm in cur.fetchall():
                cleaned = clean_address(addr)
                logger.info(f"  Original: {addr}")
                logger.info(f"  Cleaned:  {cleaned}")
                logger.info("")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
