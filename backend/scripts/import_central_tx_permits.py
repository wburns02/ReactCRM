#!/usr/bin/env python3
"""
Import Central Texas Permits to Railway Production

Imports ~1M Central TX permits from local SQLite to Railway PostgreSQL.
Run locally (not on Railway) to avoid timeout issues.

Usage:
    export DATABASE_URL="postgresql://..."
    python import_central_tx_permits.py

Or:
    python import_central_tx_permits.py --database-url "postgresql://..."
"""

import os
import sys
import sqlite3
import uuid
import json
import argparse
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Generator
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# === CONFIGURATION ===
SQLITE_PATH = '/home/will/mgo-unified-output/crm_permits.db'
BATCH_SIZE = 5000
SOURCE_PORTAL_CODE = 'central_tx_mgo'

# Central TX Jurisdictions to import (with estimated counts)
# Total: ~1,051,000 permits
CENTRAL_TX_JURISDICTIONS = [
    # Bell County area (~300K)
    'Temple',           # 212,492
    'Harker Heights',   # 27,817
    'Killeen',          # 26,979
    'Copperas Cove',    # 19,511 (Coryell, but included)
    'Belton',           # 12,550
    'Bell County',      # 452
    "Morgan's Point Resort",  # 1

    # Williamson County area (~289K)
    'Cedar Park',       # 195,301
    'Williamson County', # 64,579
    'Taylor',           # 18,085
    'Georgetown',       # 8,528
    'City of Jarrell',  # 2,572
    'Liberty Hill',     # 6
    'Bartlett',         # 2

    # Hays County area (~202K)
    'San Marcos',       # 112,904
    'Hays County',      # 59,027
    'Buda',             # 19,123
    'Dripping Springs', # 7,770
    'Uhland',           # 3,019
    'Niederwald',       # 4
    'Lockhart',         # 2 (Caldwell County)

    # Travis County area (~133K)
    'Travis County',    # 52,915
    'LCRA',             # 30,938
    'Lago Vista',       # 27,723
    'Bee Cave',         # 8,174
    'Jonestown',        # 7,232
    'City of West Lake Hills',  # 3,061
    'Travis County WCID No. 17', # 1,535
    'Rollingwood',      # 682
    'Sunset Valley',    # 334
    'West Travis County Public Utility Agency', # 296
    'Manor',            # 187
    'Village of Volente', # 2
    'Mustang Ridge',    # 2
    'Point Venture',    # 1

    # Bastrop County area (~56K)
    'Bastrop County',   # 52,125
    'Elgin',            # 3,753
    'City of Bastrop',  # 116

    # Kendall County area (~15K)
    'Kendall County',   # 13,976
    'Boerne',           # 712

    # Burnet County area (~10K)
    'Burnet',           # 5,852
    'Marble Falls',     # 4,302
    'Lampasas',         # 1,248 (nearby, included)

    # Guadalupe County (~46K)
    'Cibolo',           # 46,205

    # Additional Central TX nearby
    'Bulverde',         # 3,985 (Comal County)
    'Fredericksburg',   # 1,471 (Gillespie County)
    'Kerrville',        # 14,703 (Kerr County - hill country)
]

# Jurisdiction -> County Code mapping
JURISDICTION_TO_COUNTY = {
    # Bell County
    'Temple': 'BELL',
    'Harker Heights': 'BELL',
    'Killeen': 'BELL',
    'Belton': 'BELL',
    'Bell County': 'BELL',
    "Morgan's Point Resort": 'BELL',
    'Copperas Cove': 'CORYELL',  # Technically Coryell

    # Williamson County
    'Cedar Park': 'WILLIAMSON',
    'Williamson County': 'WILLIAMSON',
    'Taylor': 'WILLIAMSON',
    'Georgetown': 'WILLIAMSON',
    'City of Jarrell': 'WILLIAMSON',
    'Liberty Hill': 'WILLIAMSON',
    'Bartlett': 'WILLIAMSON',

    # Hays County
    'San Marcos': 'HAYS',
    'Hays County': 'HAYS',
    'Buda': 'HAYS',
    'Dripping Springs': 'HAYS',
    'Uhland': 'HAYS',
    'Niederwald': 'HAYS',

    # Caldwell County
    'Lockhart': 'CALDWELL',

    # Travis County
    'Travis County': 'TRAVIS',
    'LCRA': 'TRAVIS',
    'Lago Vista': 'TRAVIS',
    'Bee Cave': 'TRAVIS',
    'Jonestown': 'TRAVIS',
    'City of West Lake Hills': 'TRAVIS',
    'Travis County WCID No. 17': 'TRAVIS',
    'Rollingwood': 'TRAVIS',
    'Sunset Valley': 'TRAVIS',
    'West Travis County Public Utility Agency': 'TRAVIS',
    'Manor': 'TRAVIS',
    'Village of Volente': 'TRAVIS',
    'Mustang Ridge': 'TRAVIS',
    'Point Venture': 'TRAVIS',

    # Bastrop County
    'Bastrop County': 'BASTROP',
    'Elgin': 'BASTROP',
    'City of Bastrop': 'BASTROP',

    # Kendall County
    'Kendall County': 'KENDALL',
    'Boerne': 'KENDALL',

    # Burnet County
    'Burnet': 'BURNET',
    'Marble Falls': 'BURNET',

    # Lampasas County
    'Lampasas': 'LAMPASAS',

    # Guadalupe County
    'Cibolo': 'GUADALUPE',

    # Comal County
    'Bulverde': 'COMAL',

    # Gillespie County
    'Fredericksburg': 'GILLESPIE',

    # Kerr County
    'Kerrville': 'KERR',
}

# County codes to names (for creating county records)
COUNTY_NAMES = {
    'BELL': 'Bell County',
    'WILLIAMSON': 'Williamson County',
    'HAYS': 'Hays County',
    'TRAVIS': 'Travis County',
    'BASTROP': 'Bastrop County',
    'CALDWELL': 'Caldwell County',
    'KENDALL': 'Kendall County',
    'BURNET': 'Burnet County',
    'LAMPASAS': 'Lampasas County',
    'GUADALUPE': 'Guadalupe County',
    'COMAL': 'Comal County',
    'CORYELL': 'Coryell County',
    'GILLESPIE': 'Gillespie County',
    'KERR': 'Kerr County',
}


def normalize_address(address: Optional[str]) -> Optional[str]:
    """Normalize address for consistent matching."""
    if not address:
        return None

    # Basic normalization
    addr = address.upper().strip()

    # Common replacements
    replacements = {
        ' STREET': ' ST',
        ' AVENUE': ' AVE',
        ' BOULEVARD': ' BLVD',
        ' DRIVE': ' DR',
        ' ROAD': ' RD',
        ' LANE': ' LN',
        ' COURT': ' CT',
        ' CIRCLE': ' CIR',
        ' PLACE': ' PL',
        ' HIGHWAY': ' HWY',
        ' PARKWAY': ' PKWY',
        '.': '',
        ',': '',
    }

    for old, new in replacements.items():
        addr = addr.replace(old, new)

    # Remove extra spaces
    addr = ' '.join(addr.split())

    return addr


def compute_address_hash(address: str, city: str, state: str) -> Optional[str]:
    """Compute hash for address deduplication."""
    if not address:
        return None

    normalized = f"{normalize_address(address)}|{(city or '').upper()}|{state.upper()}"
    return hashlib.md5(normalized.encode()).hexdigest()


def parse_date(date_str: Optional[str]) -> Optional[datetime]:
    """Parse date string to datetime."""
    if not date_str:
        return None

    try:
        # Try ISO format first
        if 'T' in date_str:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        # Try common date formats
        for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y']:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
    except Exception:
        pass

    return None


class PermitImporter:
    def __init__(self, sqlite_path: str, pg_url: str, dry_run: bool = False):
        self.sqlite_path = sqlite_path
        self.pg_url = pg_url
        self.dry_run = dry_run
        self.sqlite_conn = None
        self.pg_conn = None
        self.state_id_cache = {}
        self.county_id_cache = {}

    def connect(self):
        """Establish database connections."""
        logger.info(f"Connecting to SQLite: {self.sqlite_path}")
        self.sqlite_conn = sqlite3.connect(self.sqlite_path)
        self.sqlite_conn.row_factory = sqlite3.Row

        if not self.dry_run:
            logger.info("Connecting to PostgreSQL...")
            import psycopg2
            self.pg_conn = psycopg2.connect(self.pg_url)
            self.pg_conn.autocommit = False

    def close(self):
        """Close database connections."""
        if self.sqlite_conn:
            self.sqlite_conn.close()
        if self.pg_conn:
            self.pg_conn.close()

    def setup_reference_data(self):
        """Ensure states, counties, and source portal exist."""
        if self.dry_run:
            logger.info("[DRY RUN] Would setup reference data")
            return

        cur = self.pg_conn.cursor()

        # Get or create TX state
        cur.execute("SELECT id FROM states WHERE code = 'TX'")
        row = cur.fetchone()
        if row:
            self.state_id_cache['TX'] = row[0]
            logger.info(f"Found TX state with id={row[0]}")
        else:
            cur.execute("""
                INSERT INTO states (code, name, fips_code, region, is_active)
                VALUES ('TX', 'Texas', '48', 'South', true)
                RETURNING id
            """)
            self.state_id_cache['TX'] = cur.fetchone()[0]
            logger.info(f"Created TX state with id={self.state_id_cache['TX']}")

        tx_state_id = self.state_id_cache['TX']

        # Create/get counties
        for county_code, county_name in COUNTY_NAMES.items():
            normalized_name = county_name.upper().replace(' COUNTY', '').strip()

            cur.execute("""
                SELECT id FROM counties
                WHERE state_id = %s AND (normalized_name = %s OR name ILIKE %s)
            """, (tx_state_id, normalized_name, f"%{county_name}%"))

            row = cur.fetchone()
            if row:
                self.county_id_cache[county_code] = row[0]
            else:
                cur.execute("""
                    INSERT INTO counties (state_id, name, normalized_name, is_active)
                    VALUES (%s, %s, %s, true)
                    ON CONFLICT (state_id, normalized_name) DO UPDATE SET name = EXCLUDED.name
                    RETURNING id
                """, (tx_state_id, county_name, normalized_name))
                self.county_id_cache[county_code] = cur.fetchone()[0]
                logger.info(f"Created county: {county_name}")

        # Create source portal
        cur.execute("""
            INSERT INTO source_portals (code, name, state_id, platform, is_active)
            VALUES (%s, %s, %s, %s, true)
            ON CONFLICT (code) DO UPDATE SET
                name = EXCLUDED.name,
                updated_at = NOW()
            RETURNING id
        """, (SOURCE_PORTAL_CODE, 'Central Texas MGO Import', tx_state_id, 'MGOConnect'))

        self.pg_conn.commit()
        logger.info(f"Reference data setup complete. Counties: {len(self.county_id_cache)}")

    def get_central_tx_permits(self) -> Generator[sqlite3.Row, None, None]:
        """Generator yielding permits from SQLite."""
        placeholders = ','.join(['?' for _ in CENTRAL_TX_JURISDICTIONS])

        query = f"""
            SELECT * FROM permits
            WHERE state = 'TX'
            AND jurisdiction_name IN ({placeholders})
            ORDER BY jurisdiction_name, created_date
        """

        cursor = self.sqlite_conn.cursor()
        cursor.execute(query, CENTRAL_TX_JURISDICTIONS)

        while True:
            rows = cursor.fetchmany(1000)
            if not rows:
                break
            for row in rows:
                yield row

    def transform_permit(self, row: sqlite3.Row) -> Optional[Dict]:
        """Transform SQLite row to PostgreSQL format."""
        jurisdiction = row['jurisdiction_name']
        county_code = JURISDICTION_TO_COUNTY.get(jurisdiction)

        if not county_code:
            logger.warning(f"Unknown jurisdiction: {jurisdiction}")
            return None

        county_id = self.county_id_cache.get(county_code)
        if not county_id and not self.dry_run:
            logger.warning(f"County not found for code: {county_code}")
            return None

        # Parse dates
        permit_date = parse_date(row['created_date']) or parse_date(row['issued_date'])

        # Parse OSSF details if present
        ossf_details = None
        if row['ossf_details']:
            try:
                ossf_details = json.loads(row['ossf_details'])
            except:
                pass

        # Compute address hash for deduplication
        address_hash = compute_address_hash(
            row['address'],
            row['city'],
            'TX'
        )

        return {
            'id': str(uuid.uuid4()),
            'permit_number': row['permit_number'],
            'state_id': self.state_id_cache.get('TX', 1),
            'county_id': county_id,
            'address': row['address'],
            'address_normalized': normalize_address(row['address']),
            'address_hash': address_hash,
            'city': row['city'],
            'zip_code': row['zip'],
            'parcel_number': row['parcel_id'],
            'latitude': row['lat'],
            'longitude': row['lng'],
            'owner_name': row['owner_name'],
            'owner_name_normalized': (row['owner_name'] or '').upper().strip() if row['owner_name'] else None,
            'applicant_name': row['applicant_name'],
            'contractor_name': row['applicant_company'],
            'permit_date': permit_date,
            'system_type_raw': row['trade'] or (ossf_details.get('system_type') if ossf_details else None),
            'source_portal_code': SOURCE_PORTAL_CODE,
            'jurisdiction_name': jurisdiction,
            'scraped_at': parse_date(row['scraped_at']),
            'raw_data': row['raw_original'],
            'is_active': True,
            'version': 1,
        }

    def insert_batch(self, permits: List[Dict]):
        """Insert batch of permits using execute_values with ON CONFLICT."""
        if self.dry_run or not permits:
            return len(permits), 0

        from psycopg2.extras import execute_values

        cur = self.pg_conn.cursor()

        # Prepare values - skip raw_data to avoid data issues
        values = []
        for p in permits:
            values.append((
                p['id'],
                p['permit_number'],
                p['state_id'],
                p['county_id'],
                p['address'],
                p['address_normalized'],
                p['address_hash'],
                p['city'],
                p['zip_code'],
                p['parcel_number'],
                p['latitude'],
                p['longitude'],
                p['owner_name'],
                p['owner_name_normalized'],
                p['applicant_name'],
                p['contractor_name'],
                p['permit_date'],
                p['system_type_raw'],
                p['source_portal_code'],
                p['scraped_at'],
                p['is_active'],
                p['version'],
            ))

        sql = """
            INSERT INTO septic_permits (
                id, permit_number, state_id, county_id,
                address, address_normalized, address_hash,
                city, zip_code, parcel_number,
                latitude, longitude,
                owner_name, owner_name_normalized,
                applicant_name, contractor_name,
                permit_date, system_type_raw,
                source_portal_code, scraped_at,
                is_active, version, created_at, updated_at
            ) VALUES %s
            ON CONFLICT (id) DO NOTHING
        """

        template = """(
            %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s,
            %s, %s,
            %s, %s,
            %s, %s,
            %s, %s,
            %s, %s,
            %s, %s, NOW(), NOW()
        )"""

        try:
            execute_values(cur, sql, values, template=template, page_size=1000)
            inserted = cur.rowcount
            self.pg_conn.commit()
            return inserted, len(permits) - inserted
        except Exception as e:
            self.pg_conn.rollback()
            logger.warning(f"Batch insert failed: {e}")
            # Fall back to one-by-one insert
            inserted = 0
            for v in values:
                try:
                    cur.execute("""
                        INSERT INTO septic_permits (
                            id, permit_number, state_id, county_id,
                            address, address_normalized, address_hash,
                            city, zip_code, parcel_number,
                            latitude, longitude,
                            owner_name, owner_name_normalized,
                            applicant_name, contractor_name,
                            permit_date, system_type_raw,
                            source_portal_code, scraped_at,
                            is_active, version, created_at, updated_at
                        ) VALUES (
                            %s, %s, %s, %s,
                            %s, %s, %s,
                            %s, %s, %s,
                            %s, %s,
                            %s, %s,
                            %s, %s,
                            %s, %s,
                            %s, %s,
                            %s, %s, NOW(), NOW()
                        )
                        ON CONFLICT (id) DO NOTHING
                    """, v)
                    self.pg_conn.commit()
                    inserted += 1
                except Exception:
                    self.pg_conn.rollback()
            return inserted, len(permits) - inserted

    def run(self) -> Tuple[int, int]:
        """Execute full import."""
        logger.info("=" * 60)
        logger.info("Central Texas Permit Import")
        logger.info("=" * 60)

        if self.dry_run:
            logger.info("*** DRY RUN MODE - No data will be inserted ***")

        self.connect()

        try:
            # Phase 1: Setup
            logger.info("\nPhase 1: Setting up reference data...")
            self.setup_reference_data()

            # Phase 2-3: Transform and Insert
            logger.info("\nPhase 2-3: Transforming and inserting permits...")
            batch = []
            total = 0
            total_skipped = 0
            errors = 0
            last_jurisdiction = None
            jurisdiction_counts = {}

            for row in self.get_central_tx_permits():
                try:
                    # Track progress by jurisdiction
                    jurisdiction = row['jurisdiction_name']
                    if jurisdiction != last_jurisdiction:
                        if last_jurisdiction:
                            logger.info(f"  {last_jurisdiction}: {jurisdiction_counts.get(last_jurisdiction, 0):,} permits")
                        last_jurisdiction = jurisdiction

                    jurisdiction_counts[jurisdiction] = jurisdiction_counts.get(jurisdiction, 0) + 1

                    permit = self.transform_permit(row)
                    if permit:
                        batch.append(permit)

                    if len(batch) >= BATCH_SIZE:
                        result = self.insert_batch(batch)
                        if result:
                            inserted, skipped = result
                            total += inserted
                            total_skipped += skipped
                        else:
                            total += len(batch)
                        logger.info(f"  Progress: {total:,} permits imported...")
                        batch = []

                except Exception as e:
                    errors += 1
                    if errors <= 10:
                        logger.warning(f"Error transforming permit: {e}")
                    elif errors == 11:
                        logger.warning("... suppressing further error messages")

            # Final batch
            if batch:
                result = self.insert_batch(batch)
                if result:
                    inserted, skipped = result
                    total += inserted
                    total_skipped += skipped
                else:
                    total += len(batch)

            # Log final jurisdiction
            if last_jurisdiction:
                logger.info(f"  {last_jurisdiction}: {jurisdiction_counts.get(last_jurisdiction, 0):,} permits")

            logger.info("\n" + "=" * 60)
            logger.info(f"Import complete!")
            logger.info(f"  Total permits imported: {total:,}")
            logger.info(f"  Skipped (duplicates): {total_skipped:,}")
            logger.info(f"  Transform errors: {errors}")
            logger.info("=" * 60)

            # Summary by jurisdiction
            logger.info("\nPermits by jurisdiction:")
            for j, c in sorted(jurisdiction_counts.items(), key=lambda x: -x[1]):
                logger.info(f"  {j}: {c:,}")

            return total, errors

        finally:
            self.close()


def main():
    parser = argparse.ArgumentParser(description='Import Central TX permits to Railway PostgreSQL')
    parser.add_argument('--database-url',
                        default=os.environ.get('DATABASE_URL'),
                        help='PostgreSQL connection URL (or set DATABASE_URL env var)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Transform without inserting (test mode)')
    parser.add_argument('--sqlite-path',
                        default=SQLITE_PATH,
                        help='Path to SQLite database')
    args = parser.parse_args()

    if not args.database_url and not args.dry_run:
        print("ERROR: DATABASE_URL required (set env var or use --database-url)")
        print("\nGet your Railway DATABASE_URL from:")
        print("  Railway Dashboard -> react-crm-api -> PostgreSQL -> Variables")
        sys.exit(1)

    importer = PermitImporter(
        args.sqlite_path or SQLITE_PATH,
        args.database_url or '',
        args.dry_run
    )

    total, errors = importer.run()

    if errors > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()
