#!/usr/bin/env python3
"""
Unified Permit Data Processor

Processes ALL scraped data from multiple sources into a single SQLite database:
- MGO Connect (NDJSON)
- Delaware Open Data (JSON)
- EnerGov (NDJSON)
- eBridge (NDJSON)
- State-specific scrapers (JSON/NDJSON)

Usage:
    python3 unified-data-processor.py

Output:
    scrapers/output/unified/
    ├── permits_unified.db      # Master SQLite database
    ├── by_trade/               # Trade-specific CSVs
    ├── by_state/               # State-organized CSVs
    └── summary_report.md       # Statistics
"""

import os
import sys
import json
import sqlite3
import csv
import glob
import subprocess
import hashlib
from collections import defaultdict
from datetime import datetime
from pathlib import Path

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "output", "unified")
SERVER_HOST = "will@100.85.99.69"
SERVER_DATA_DIR = "~/mgo_extraction/mgo/scrapers/output/mgo/full_extraction"
TEMP_SERVER_DIR = os.path.join(BASE_DIR, "output", "_server_sync")

# Skip patterns for file discovery
SKIP_PATTERNS = ['checkpoint', 'partial', 'backup', '_old', '.bak']

# Known data source configurations (for field mapping)
DATA_SOURCES = [
    {
        "name": "MGO Connect",
        "path": "output/mgo/full_extraction/*.ndjson",
        "format": "ndjson",
        "field_map": {
            "permit_number": "projectNumber",
            "address": "projectAddress",
            "city": "projectCity",
            "state": "_state",
            "zip": "projectZip",
            "county": "_jurisdiction",
            "project_type": "_projectType",
            "work_type": "workType",
            "description": "projectDescription",
            "status": "projectStatus",
            "date_created": "dateCreated",
            "owner_name": "projectName",
            "lat": "projectLat",
            "lng": "projectLng",
            "parcel_number": "parcelNumber",
        }
    },
    {
        "name": "MGO Connect (Local)",
        "path": "output/mgo/*.ndjson",
        "format": "ndjson",
        "field_map": {
            "permit_number": "permit_number",
            "address": "address",
            "city": "city",
            "state": "state",
            "zip": "zip",
            "county": "county",
            "project_type": "system_type",
            "work_type": "project_type",
            "description": None,
            "status": "status",
            "date_created": "install_date",
            "owner_name": "owner_name",
        }
    },
    {
        "name": "Delaware Open Data",
        "path": "output/delaware/*.json",
        "format": "json_array",  # JSON with records array
        "field_map": {
            "permit_number": "permit_number",
            "address": "address",
            "city": "city",
            "state": "state",
            "zip": "zip",
            "county": "county",
            "project_type": "permit_type",
            "work_type": "work_type",
            "description": "description",
            "status": "status",
            "date_created": "issue_date",
            "owner_name": "owner_name",
            "lat": "latitude",
            "lng": "longitude",
        }
    },
    {
        "name": "EnerGov",
        "path": "output/energov/*.ndjson",
        "format": "ndjson",
        "field_map": {
            "permit_number": "permit_number",
            "address": "address",
            "city": "city",
            "state": "state",
            "zip": "zip",
            "county": "jurisdiction",
            "project_type": "permit_type",
            "work_type": "work_type",
            "description": "description",
            "status": "status",
            "date_created": "issue_date",
            "owner_name": "applicant_name",
        }
    },
    {
        "name": "eBridge",
        "path": "output/ebridge/*.ndjson",
        "format": "ndjson",
        "field_map": {
            "permit_number": "permit_number",
            "address": "address",
            "city": "city",
            "state": "state",
            "zip": "zip",
            "county": "county",
            "project_type": "permit_type",
            "work_type": "work_type",
            "description": "description",
            "status": "status",
            "date_created": "issue_date",
            "owner_name": "owner_name",
        }
    },
    {
        "name": "State Septic Data",
        "path": "output/*/",
        "format": "auto",  # Auto-detect JSON or NDJSON
        "include_patterns": ["*septic*.json", "*septic*.ndjson", "*permits*.json"],
        "field_map": {
            "permit_number": ["permit_number", "permit_id", "id", "permit_no"],
            "address": ["address", "location", "site_address", "property_address"],
            "city": ["city", "municipality", "town"],
            "state": ["state", "state_code"],
            "zip": ["zip", "zipcode", "zip_code", "postal_code"],
            "county": ["county", "jurisdiction", "parish"],
            "project_type": ["permit_type", "type", "category"],
            "work_type": ["work_type", "work_description"],
            "description": ["description", "notes", "comments"],
            "status": ["status", "permit_status"],
            "date_created": ["issue_date", "date_issued", "date_created", "install_date", "date"],
            "owner_name": ["owner_name", "owner", "applicant", "property_owner"],
            "lat": ["lat", "latitude", "y"],
            "lng": ["lng", "longitude", "lon", "x"],
        }
    }
]

# Trade keyword mappings
TRADE_KEYWORDS = {
    'electrical': ['Electrical', 'Electric', 'Generator', 'EV Charging', 'Panel', 'Wiring', 'Circuit'],
    'plumbing': ['Plumbing', 'Plumber', 'Water Heater', 'Sewer', 'Drain', 'Pipe', 'Fixture', 'Backflow'],
    'hvac': ['Mechanical', 'HVAC', 'Air Condition', 'Heating', 'Furnace', 'Duct', 'Heat Pump', 'AC'],
    'roofing': ['Roof', 'Roofing', 'Re-Roof', 'Shingle'],
    'septic': ['Septic', 'OSSF', 'On-Site Sewage', 'Sewage Facility', 'Aerobic', 'Drainfield', 'Onsite'],
    'solar': ['Solar', 'Photovoltaic', 'PV System', 'Panel Installation'],
    'pool': ['Pool', 'Spa', 'Hot Tub', 'Swimming'],
    'gas': ['Gas', 'Propane', 'Natural Gas', 'LP Gas'],
    'general_building': ['Building', 'Construction', 'Addition', 'Renovation', 'Remodel', 'New Home'],
}


# ============================================================================
# SERVER SYNC AND FILE DISCOVERY
# ============================================================================

def sync_server_data():
    """Sync data from remote server via rsync"""
    print("\n" + "=" * 50)
    print("SYNCING SERVER DATA")
    print("=" * 50)
    print(f"Server: {SERVER_HOST}")
    print(f"Source: {SERVER_DATA_DIR}")
    print(f"Destination: {TEMP_SERVER_DIR}")
    print()

    os.makedirs(TEMP_SERVER_DIR, exist_ok=True)

    # Use scp on Windows (rsync may not be available)
    # First try rsync, fall back to scp
    try:
        # Try rsync first (works if available via WSL or Git Bash)
        cmd = f'rsync -avz --progress "{SERVER_HOST}:{SERVER_DATA_DIR}/" "{TEMP_SERVER_DIR}/"'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=600)

        if result.returncode == 0:
            files = list(Path(TEMP_SERVER_DIR).glob("*.ndjson"))
            print(f"  Synced {len(files)} NDJSON files from server")
            return len(files)
        else:
            print(f"  rsync not available, trying scp...")
    except Exception as e:
        print(f"  rsync failed: {e}, trying scp...")

    # Fallback: Use scp to copy files
    try:
        # First get list of files
        list_cmd = f'ssh {SERVER_HOST} "ls {SERVER_DATA_DIR}/*.ndjson 2>/dev/null"'
        result = subprocess.run(list_cmd, shell=True, capture_output=True, text=True, timeout=60)

        if result.returncode == 0 and result.stdout.strip():
            remote_files = result.stdout.strip().split('\n')
            print(f"  Found {len(remote_files)} files on server")

            # Copy each file
            for remote_file in remote_files:
                filename = os.path.basename(remote_file.strip())
                local_path = os.path.join(TEMP_SERVER_DIR, filename)

                # Skip if already exists and recent
                if os.path.exists(local_path):
                    continue

                scp_cmd = f'scp "{SERVER_HOST}:{remote_file.strip()}" "{local_path}"'
                subprocess.run(scp_cmd, shell=True, capture_output=True, timeout=300)
                print(f"    Copied: {filename}")

            files = list(Path(TEMP_SERVER_DIR).glob("*.ndjson"))
            print(f"  Total synced: {len(files)} files")
            return len(files)
    except Exception as e:
        print(f"  Warning: Server sync failed - {e}")
        print("  Continuing with local files only...")

    return 0


def detect_source_from_path(filepath):
    """Detect data source from file path"""
    path_lower = filepath.lower().replace('\\', '/')

    # Check for specific source directories
    if '_server_sync' in path_lower:
        return 'MGO Connect'
    elif '/mgo/' in path_lower or 'mgo_' in path_lower:
        return 'MGO Connect'
    elif '/energov/' in path_lower:
        return 'EnerGov'
    elif '/ebridge/' in path_lower:
        return 'eBridge'
    elif '/delaware/' in path_lower:
        return 'Delaware Open Data'
    elif '/florida/' in path_lower:
        return 'Florida State'
    elif '/georgia/' in path_lower:
        return 'Georgia State'
    elif '/ohio/' in path_lower:
        return 'Ohio State'
    elif '/texas/' in path_lower:
        return 'Texas State'
    elif '/arizona/' in path_lower:
        return 'Arizona State'
    elif '/maryland/' in path_lower:
        return 'Maryland State'
    elif '/minnesota/' in path_lower:
        return 'Minnesota State'
    elif '/north_carolina/' in path_lower:
        return 'North Carolina State'
    elif '/pennsylvania/' in path_lower:
        return 'Pennsylvania State'
    elif '/south_carolina/' in path_lower:
        return 'South Carolina State'
    elif '/tennessee/' in path_lower:
        return 'Tennessee State'
    elif '/michigan/' in path_lower:
        return 'Michigan State'
    elif '/multi_state/' in path_lower:
        return 'Multi-State'
    else:
        return 'Unknown'


def discover_data_files(base_path):
    """Recursively find all JSON/NDJSON data files"""
    print("\n" + "=" * 50)
    print("DISCOVERING DATA FILES")
    print("=" * 50)
    print(f"Scanning: {base_path}")
    print()

    data_files = []
    skipped = 0

    for root, dirs, files in os.walk(base_path):
        # Skip hidden directories and unified output
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'unified' and d != '__pycache__']

        for filename in files:
            # Only process JSON and NDJSON files
            if not filename.endswith(('.json', '.ndjson')):
                continue

            filepath = os.path.join(root, filename)
            filename_lower = filename.lower()

            # Skip files matching skip patterns
            if any(pattern in filename_lower for pattern in SKIP_PATTERNS):
                skipped += 1
                continue

            # Skip empty files
            try:
                if os.path.getsize(filepath) == 0:
                    skipped += 1
                    continue
            except:
                continue

            # Detect source and format
            source = detect_source_from_path(filepath)
            fmt = 'ndjson' if filename.endswith('.ndjson') else 'json'

            data_files.append({
                'path': filepath,
                'filename': filename,
                'source': source,
                'format': fmt,
                'size': os.path.getsize(filepath)
            })

    # Sort by source then filename
    data_files.sort(key=lambda x: (x['source'], x['filename']))

    # Print summary by source
    source_counts = defaultdict(int)
    for f in data_files:
        source_counts[f['source']] += 1

    print("Files found by source:")
    for source, count in sorted(source_counts.items()):
        print(f"  {source}: {count} files")

    print(f"\nTotal: {len(data_files)} files ({skipped} skipped)")
    return data_files


def get_source_config(source_name):
    """Get the appropriate field mapping configuration for a source"""
    # Default flexible field map for unknown sources
    default_config = {
        'name': source_name,
        'format': 'auto',
        'field_map': {
            'permit_number': ['permit_number', 'permit_id', 'projectNumber', 'id', 'permit_no', 'PermitNumber'],
            'address': ['address', 'projectAddress', 'location', 'site_address', 'property_address', 'Address'],
            'city': ['city', 'projectCity', 'municipality', 'town', 'City'],
            'state': ['state', '_state', 'projectState', 'state_code', 'State'],
            'zip': ['zip', 'projectZip', 'zipcode', 'zip_code', 'postal_code', 'Zip'],
            'county': ['county', '_jurisdiction', 'jurisdiction', 'parish', 'County'],
            'project_type': ['project_type', '_projectType', 'permit_type', 'type', 'category', 'ProjectType'],
            'work_type': ['work_type', 'workType', 'work_description', 'WorkType'],
            'description': ['description', 'projectDescription', 'notes', 'comments', 'Description'],
            'status': ['status', 'projectStatus', 'permit_status', 'Status'],
            'date_created': ['date_created', 'dateCreated', 'issue_date', 'date_issued', 'install_date', 'date', 'Date'],
            'owner_name': ['owner_name', 'projectName', 'owner', 'applicant', 'property_owner', 'OwnerName'],
            'lat': ['lat', 'projectLat', 'latitude', 'y', 'Lat'],
            'lng': ['lng', 'projectLng', 'longitude', 'lon', 'x', 'Lng'],
            'parcel_number': ['parcel_number', 'parcelNumber', 'parcel', 'ParcelNumber'],
        }
    }

    # Source-specific configurations
    source_configs = {
        'MGO Connect': {
            'name': 'MGO Connect',
            'format': 'ndjson',
            'field_map': {
                'permit_number': 'projectNumber',
                'address': 'projectAddress',
                'city': 'projectCity',
                'state': '_state',
                'zip': 'projectZip',
                'county': '_jurisdiction',
                'project_type': '_projectType',
                'work_type': 'workType',
                'description': 'projectDescription',
                'status': 'projectStatus',
                'date_created': 'dateCreated',
                'owner_name': 'projectName',
                'lat': 'projectLat',
                'lng': 'projectLng',
                'parcel_number': 'parcelNumber',
            }
        },
        'EnerGov': {
            'name': 'EnerGov',
            'format': 'ndjson',
            'field_map': {
                'permit_number': 'permit_number',
                'address': 'address',
                'city': 'city',
                'state': 'state',
                'zip': 'zip',
                'county': 'jurisdiction',
                'project_type': 'permit_type',
                'work_type': 'work_type',
                'description': 'description',
                'status': 'status',
                'date_created': 'issue_date',
                'owner_name': 'applicant_name',
            }
        },
        'eBridge': {
            'name': 'eBridge',
            'format': 'ndjson',
            'field_map': {
                'permit_number': 'permit_number',
                'address': 'address',
                'city': 'city',
                'state': 'state',
                'zip': 'zip',
                'county': 'county',
                'project_type': 'permit_type',
                'work_type': 'work_type',
                'description': 'description',
                'status': 'status',
                'date_created': 'issue_date',
                'owner_name': 'owner_name',
            }
        },
    }

    return source_configs.get(source_name, default_config)


def get_record_hash(record):
    """Generate a hash for deduplication"""
    key = f"{record.get('address', '')}-{record.get('city', '')}-{record.get('state', '')}-{record.get('permit_number', '')}"
    return hashlib.md5(key.lower().encode()).hexdigest()


def get_trade(record):
    """Determine trade category from record fields"""
    searchable = ' '.join([
        str(record.get('work_type', '')),
        str(record.get('project_type', '')),
        str(record.get('description', '')),
    ]).lower()

    for trade, keywords in TRADE_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in searchable:
                return trade
    return 'other'


def extract_field(record, field_map):
    """Extract field value using field map (handles multiple possible field names)"""
    if isinstance(field_map, list):
        for field_name in field_map:
            if field_name in record and record[field_name]:
                return record[field_name]
        return None
    elif isinstance(field_map, str):
        return record.get(field_map)
    return None


def normalize_record(record, source_config, source_file):
    """Normalize a record to standard schema"""
    field_map = source_config['field_map']

    normalized = {
        'permit_number': extract_field(record, field_map.get('permit_number')),
        'address': extract_field(record, field_map.get('address')) or '',
        'city': extract_field(record, field_map.get('city')) or '',
        'state': extract_field(record, field_map.get('state')) or '',
        'zip': extract_field(record, field_map.get('zip')) or '',
        'county': extract_field(record, field_map.get('county')) or '',
        'project_type': extract_field(record, field_map.get('project_type')) or '',
        'work_type': extract_field(record, field_map.get('work_type')) or '',
        'description': extract_field(record, field_map.get('description')) or '',
        'status': extract_field(record, field_map.get('status')) or '',
        'date_created': extract_field(record, field_map.get('date_created')) or '',
        'owner_name': extract_field(record, field_map.get('owner_name')) or '',
        'lat': extract_field(record, field_map.get('lat')) or '',
        'lng': extract_field(record, field_map.get('lng')) or '',
        'parcel_number': extract_field(record, field_map.get('parcel_number')) or '',
        'source': source_config['name'],
        'source_file': source_file,
        'raw_json': json.dumps(record),
    }

    # Determine trade
    normalized['trade'] = get_trade(normalized)

    return normalized


def create_database(db_path):
    """Create SQLite database with schema"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS permits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            permit_number TEXT,
            address TEXT,
            city TEXT,
            state TEXT,
            zip TEXT,
            county TEXT,
            project_type TEXT,
            work_type TEXT,
            trade TEXT,
            description TEXT,
            status TEXT,
            date_created TEXT,
            owner_name TEXT,
            lat TEXT,
            lng TEXT,
            parcel_number TEXT,
            source TEXT,
            source_file TEXT,
            raw_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Create indexes
    indexes = ['state', 'city', 'county', 'trade', 'project_type', 'work_type',
               'date_created', 'permit_number', 'address', 'source']
    for idx in indexes:
        cursor.execute(f'CREATE INDEX IF NOT EXISTS idx_{idx} ON permits({idx})')

    conn.commit()
    return conn


def insert_record(cursor, record):
    """Insert normalized record into database"""
    cursor.execute('''
        INSERT INTO permits (
            permit_number, address, city, state, zip, county,
            project_type, work_type, trade, description, status,
            date_created, owner_name, lat, lng, parcel_number,
            source, source_file, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        record['permit_number'], record['address'], record['city'],
        record['state'], record['zip'], record['county'],
        record['project_type'], record['work_type'], record['trade'],
        record['description'], record['status'], record['date_created'],
        record['owner_name'], record['lat'], record['lng'],
        record['parcel_number'], record['source'], record['source_file'],
        record['raw_json']
    ))


def process_ndjson_file(filepath, source_config):
    """Process NDJSON file and yield normalized records"""
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            if line.strip():
                try:
                    record = json.loads(line)
                    yield normalize_record(record, source_config, os.path.basename(filepath))
                except json.JSONDecodeError:
                    continue


def process_json_file(filepath, source_config):
    """Process JSON file (array or object with records) and yield normalized records"""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            data = json.load(f)

        # Handle different JSON structures
        records = []
        if isinstance(data, list):
            records = data
        elif isinstance(data, dict):
            # Look for common array keys
            for key in ['records', 'data', 'features', 'results', 'items']:
                if key in data and isinstance(data[key], list):
                    records = data[key]
                    break
            if not records and 'features' in data:
                # GeoJSON format
                records = [f.get('properties', f) for f in data['features']]

        for record in records:
            if isinstance(record, dict):
                yield normalize_record(record, source_config, os.path.basename(filepath))

    except (json.JSONDecodeError, Exception) as e:
        print(f"    Error processing {filepath}: {e}")


def export_by_trade(conn, output_dir):
    """Export CSVs by trade"""
    trade_dir = os.path.join(output_dir, 'by_trade')
    os.makedirs(trade_dir, exist_ok=True)

    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT trade FROM permits")
    trades = [row[0] for row in cursor.fetchall()]

    headers = ['permit_number', 'address', 'city', 'state', 'zip', 'county',
               'project_type', 'work_type', 'description', 'status',
               'date_created', 'owner_name', 'source']

    for trade in trades:
        if not trade:
            continue
        output_file = os.path.join(trade_dir, f'{trade}.csv')
        cursor.execute('''
            SELECT permit_number, address, city, state, zip, county,
                   project_type, work_type, description, status,
                   date_created, owner_name, source
            FROM permits WHERE trade = ?
            ORDER BY state, city, date_created DESC
        ''', (trade,))

        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(cursor.fetchall())

        cursor.execute("SELECT COUNT(*) FROM permits WHERE trade = ?", (trade,))
        count = cursor.fetchone()[0]
        print(f"    {trade}: {count:,} records")


def export_by_state(conn, output_dir):
    """Export CSVs organized by state/county"""
    state_dir = os.path.join(output_dir, 'by_state')
    os.makedirs(state_dir, exist_ok=True)

    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT state FROM permits WHERE state != '' AND TRIM(state) != '' ORDER BY state")
    states = [row[0].strip() for row in cursor.fetchall() if row[0] and row[0].strip()]

    headers = ['permit_number', 'address', 'city', 'zip', 'county',
               'project_type', 'work_type', 'trade', 'status', 'date_created', 'source']

    for state in states:
        if not state or not state.strip():
            continue

        # Create safe directory name
        safe_state = state.strip().replace('/', '_').replace('\\', '_')
        state_path = os.path.join(state_dir, safe_state)
        os.makedirs(state_path, exist_ok=True)

        # Export all records for this state
        output_file = os.path.join(state_path, 'all_permits.csv')
        cursor.execute('''
            SELECT permit_number, address, city, zip, county,
                   project_type, work_type, trade, status, date_created, source
            FROM permits WHERE state = ?
            ORDER BY county, city, date_created DESC
        ''', (state,))

        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(cursor.fetchall())

        cursor.execute("SELECT COUNT(*) FROM permits WHERE state = ?", (state,))
        count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(DISTINCT county) FROM permits WHERE state = ?", (state,))
        counties = cursor.fetchone()[0]
        print(f"    {state}: {count:,} records, {counties} counties")


def main():
    print("=" * 70)
    print("UNIFIED PERMIT DATA PROCESSOR")
    print("=" * 70)
    print(f"Started: {datetime.now().isoformat()}")
    print(f"Output: {OUTPUT_DIR}")
    print()

    # Parse command line args
    no_sync = '--no-sync' in sys.argv
    verbose = '--verbose' in sys.argv

    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Step 1: Sync server data (unless --no-sync)
    if not no_sync:
        sync_server_data()
    else:
        print("\nSkipping server sync (--no-sync)")

    # Step 2: Discover all data files
    output_base = os.path.join(BASE_DIR, "output")
    data_files = discover_data_files(output_base)

    if not data_files:
        print("No data files found!")
        return

    # Create database
    db_path = os.path.join(OUTPUT_DIR, 'permits_unified.db')
    print(f"\nCreating database: {db_path}")

    # Remove old database to start fresh
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except PermissionError:
            print("  Warning: Could not delete existing database (file locked)")
            print("  Creating new database with timestamp...")
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            db_path = os.path.join(OUTPUT_DIR, f'permits_unified_{timestamp}.db')
            print(f"  New path: {db_path}")

    conn = create_database(db_path)
    cursor = conn.cursor()

    total_records = 0
    source_stats = defaultdict(int)
    seen_hashes = set()  # For deduplication
    duplicates = 0

    # Group files by source for better output
    files_by_source = defaultdict(list)
    for f in data_files:
        files_by_source[f['source']].append(f)

    # Step 3: Process files by source
    for source_name, files in sorted(files_by_source.items()):
        print(f"\n{'='*50}")
        print(f"Processing: {source_name} ({len(files)} files)")
        print('='*50)

        source_config = get_source_config(source_name)
        source_records = 0
        source_dupes = 0

        for file_info in files:
            filepath = file_info['path']
            filename = file_info['filename']
            file_format = file_info['format']
            file_records = 0
            file_dupes = 0

            try:
                if file_format == 'ndjson':
                    for record in process_ndjson_file(filepath, source_config):
                        # Deduplication check
                        record_hash = get_record_hash(record)
                        if record_hash in seen_hashes:
                            file_dupes += 1
                            continue
                        seen_hashes.add(record_hash)

                        insert_record(cursor, record)
                        file_records += 1
                else:  # json
                    for record in process_json_file(filepath, source_config):
                        # Deduplication check
                        record_hash = get_record_hash(record)
                        if record_hash in seen_hashes:
                            file_dupes += 1
                            continue
                        seen_hashes.add(record_hash)

                        insert_record(cursor, record)
                        file_records += 1

                if file_records > 0 or verbose:
                    dupe_note = f" ({file_dupes} dupes)" if file_dupes > 0 else ""
                    print(f"    {filename}: {file_records:,} records{dupe_note}")

                source_records += file_records
                source_dupes += file_dupes
                total_records += file_records
                duplicates += file_dupes

                # Commit every file
                conn.commit()

            except Exception as e:
                print(f"    Error processing {filename}: {e}")
                if verbose:
                    import traceback
                    traceback.print_exc()
                continue

        source_stats[source_name] = source_records
        if source_dupes > 0:
            print(f"  Source total: {source_records:,} records ({source_dupes} duplicates skipped)")

    print(f"\n{'='*50}")
    print(f"Total records loaded: {total_records:,}")
    print(f"Duplicates skipped: {duplicates:,}")
    print('='*50)

    # Export by trade
    print("\nExporting by trade...")
    export_by_trade(conn, OUTPUT_DIR)

    # Export by state
    print("\nExporting by state...")
    export_by_state(conn, OUTPUT_DIR)

    # Generate summary report
    print("\nGenerating summary report...")

    cursor.execute("SELECT COUNT(*) FROM permits")
    total = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(DISTINCT address || city || state) FROM permits WHERE address != ''")
    unique_properties = cursor.fetchone()[0]

    report = f"""# Unified Permit Data Report

**Generated:** {datetime.now().isoformat()}
**Database:** {db_path}

## Summary

| Metric | Value |
|--------|-------|
| **Total Records** | {total:,} |
| **Unique Properties** | {unique_properties:,} |
| **Data Sources** | {len(source_stats)} |

## By Source

| Source | Records |
|--------|---------|
"""
    for source, count in sorted(source_stats.items(), key=lambda x: -x[1]):
        report += f"| {source} | {count:,} |\n"

    report += """
## By State

| State | Records |
|-------|---------|
"""
    cursor.execute("""
        SELECT state, COUNT(*) as count FROM permits
        WHERE state != '' GROUP BY state ORDER BY count DESC
    """)
    for row in cursor.fetchall():
        report += f"| {row[0]} | {row[1]:,} |\n"

    report += """
## By Trade

| Trade | Records |
|-------|---------|
"""
    cursor.execute("""
        SELECT trade, COUNT(*) as count FROM permits
        GROUP BY trade ORDER BY count DESC
    """)
    for row in cursor.fetchall():
        report += f"| {row[0]} | {row[1]:,} |\n"

    report += f"""
## Sample Queries

```sql
-- Open database
sqlite3 {db_path}

-- Count by source
SELECT source, COUNT(*) FROM permits GROUP BY source;

-- Find all septic permits
SELECT * FROM permits WHERE trade = 'septic';

-- Search by address
SELECT * FROM permits WHERE address LIKE '%Main St%';

-- Properties with multiple permits
SELECT address, city, state, COUNT(*) as count
FROM permits GROUP BY address, city, state
HAVING count > 1 ORDER BY count DESC LIMIT 20;
```

---
*Generated by unified-data-processor.py*
"""

    report_path = os.path.join(OUTPUT_DIR, 'summary_report.md')
    with open(report_path, 'w') as f:
        f.write(report)

    conn.close()

    print(f"\nReport saved: {report_path}")
    print()
    print("=" * 70)
    print("PROCESSING COMPLETE")
    print("=" * 70)
    print(f"Total records: {total:,}")
    print(f"Unique properties: {unique_properties:,}")
    print(f"Output: {OUTPUT_DIR}/")


if __name__ == '__main__':
    main()
