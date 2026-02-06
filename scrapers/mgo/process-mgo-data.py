#!/usr/bin/env python3
"""
MGO Data Processing Pipeline

Processes extracted NDJSON files into:
1. SQLite database (queryable)
2. Organized directory structure (state/county/type)
3. CSV exports (for Excel)
4. CRM-ready import files

Usage:
    python3 process-mgo-data.py

Output:
    ~/mgo_extraction/processed/
    ├── mgo_permits.db          # SQLite database
    ├── by_state/               # Organized by geography
    │   ├── FL/
    │   │   ├── Crestview/
    │   │   │   ├── permits.csv
    │   │   │   └── code_enforcement.csv
    │   │   └── ...
    │   └── ...
    ├── by_category/            # Organized by permit type
    │   ├── septic_ossf.csv
    │   ├── building_permits.csv
    │   ├── code_enforcement.csv
    │   └── ...
    ├── crm_import/             # CRM-ready format
    │   └── leads.csv
    └── summary_report.md       # Statistics
"""

import os
import json
import sqlite3
import csv
from collections import defaultdict
from datetime import datetime
from pathlib import Path

# Configuration
INPUT_DIR = os.path.expanduser("~/mgo_extraction/mgo/scrapers/output/mgo/full_extraction")
OUTPUT_DIR = os.path.expanduser("~/mgo_extraction/processed")

# Category mappings - group similar project types
CATEGORY_MAP = {
    # Septic/OSSF (HIGH VALUE for your business)
    'OSSF': 'septic_ossf',
    'Septic': 'septic_ossf',
    'On-Site Sewage': 'septic_ossf',
    'Health District': 'septic_ossf',

    # Building Permits
    'Permit': 'building_permits',
    'Building': 'building_permits',
    'Building Division': 'building_permits',
    'Permitting': 'building_permits',
    'Permitting Inspections': 'building_permits',

    # Code Enforcement
    'Code Enforcement': 'code_enforcement',
    'Code Compliance': 'code_enforcement',
    'Unlicensed/Unpermitted': 'code_enforcement',

    # Planning & Zoning
    'Planning': 'planning_zoning',
    'Planning Division': 'planning_zoning',
    'Planning and Zoning': 'planning_zoning',
    'Development Services': 'planning_zoning',

    # Business Licenses
    'BTR': 'business_licenses',
    'Business Tax': 'business_licenses',
    'Contractor Registration': 'contractor_licenses',
    'Registrations': 'business_licenses',

    # Public Works
    'Public Works': 'public_works',
    'Stormwater': 'public_works',
    'Engineering': 'public_works',

    # Other
    'Solution Center': 'service_requests',
    'Animal': 'animal_services',
    'Tree': 'tree_services',
}

def get_category(project_type):
    """Map project type to standardized category"""
    if not project_type:
        return 'other'

    project_type_lower = project_type.lower()

    for key, category in CATEGORY_MAP.items():
        if key.lower() in project_type_lower:
            return category

    return 'other'

def create_database(db_path):
    """Create SQLite database with schema"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Main permits table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS permits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            permit_number TEXT,
            project_uid TEXT,

            -- Location
            address TEXT,
            city TEXT,
            state TEXT,
            zip TEXT,
            county TEXT,
            jurisdiction TEXT,
            jurisdiction_id INTEGER,
            lat TEXT,
            lng TEXT,
            parcel_number TEXT,

            -- Classification
            project_type TEXT,
            project_type_id INTEGER,
            category TEXT,
            work_type TEXT,

            -- Details
            project_name TEXT,
            description TEXT,
            status TEXT,
            status_id INTEGER,

            -- Dates
            date_created TEXT,
            extracted_at TEXT,

            -- Source
            source TEXT DEFAULT 'MGO Connect',
            source_file TEXT,

            -- Raw data (JSON)
            raw_json TEXT
        )
    ''')

    # Create indexes for fast queries
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_state ON permits(state)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_city ON permits(city)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_jurisdiction ON permits(jurisdiction)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_category ON permits(category)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_project_type ON permits(project_type)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_date ON permits(date_created)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_permit_number ON permits(permit_number)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_address ON permits(address)')

    conn.commit()
    return conn

def process_record(record, source_file):
    """Convert raw record to normalized format"""
    return {
        'project_id': record.get('projectID'),
        'permit_number': record.get('projectNumber'),
        'project_uid': record.get('projectUID'),

        # Location
        'address': record.get('projectAddress', ''),
        'city': record.get('projectCity', ''),
        'state': record.get('_state', record.get('projectState', '')),
        'zip': record.get('projectZip', ''),
        'county': record.get('_jurisdiction', ''),
        'jurisdiction': record.get('_jurisdiction', record.get('jurisdiction', '')),
        'jurisdiction_id': record.get('_jurisdictionID'),
        'lat': record.get('projectLat', ''),
        'lng': record.get('projectLng', ''),
        'parcel_number': record.get('parcelNumber', ''),

        # Classification
        'project_type': record.get('_projectType', ''),
        'project_type_id': record.get('_projectTypeID'),
        'category': get_category(record.get('_projectType', '')),
        'work_type': record.get('workType', ''),

        # Details
        'project_name': record.get('projectName', ''),
        'description': record.get('projectDescription', ''),
        'status': record.get('projectStatus', ''),
        'status_id': record.get('projectStatusID'),

        # Dates
        'date_created': record.get('dateCreated', ''),
        'extracted_at': record.get('_extractedAt', ''),

        # Source
        'source': 'MGO Connect',
        'source_file': source_file,

        # Raw
        'raw_json': json.dumps(record)
    }

def insert_record(cursor, record):
    """Insert record into database"""
    cursor.execute('''
        INSERT INTO permits (
            project_id, permit_number, project_uid,
            address, city, state, zip, county, jurisdiction, jurisdiction_id, lat, lng, parcel_number,
            project_type, project_type_id, category, work_type,
            project_name, description, status, status_id,
            date_created, extracted_at,
            source, source_file, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        record['project_id'], record['permit_number'], record['project_uid'],
        record['address'], record['city'], record['state'], record['zip'],
        record['county'], record['jurisdiction'], record['jurisdiction_id'],
        record['lat'], record['lng'], record['parcel_number'],
        record['project_type'], record['project_type_id'], record['category'], record['work_type'],
        record['project_name'], record['description'], record['status'], record['status_id'],
        record['date_created'], record['extracted_at'],
        record['source'], record['source_file'], record['raw_json']
    ))

def export_csv(conn, output_path, query, headers):
    """Export query results to CSV"""
    cursor = conn.cursor()
    cursor.execute(query)

    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for row in cursor:
            writer.writerow(row)

def main():
    print("=" * 60)
    print("MGO DATA PROCESSING PIPELINE")
    print("=" * 60)
    print(f"Started: {datetime.now().isoformat()}")
    print(f"Input: {INPUT_DIR}")
    print(f"Output: {OUTPUT_DIR}")
    print()

    # Create output directories
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(f"{OUTPUT_DIR}/by_state", exist_ok=True)
    os.makedirs(f"{OUTPUT_DIR}/by_category", exist_ok=True)
    os.makedirs(f"{OUTPUT_DIR}/crm_import", exist_ok=True)

    # Create database
    db_path = f"{OUTPUT_DIR}/mgo_permits.db"
    print(f"Creating database: {db_path}")
    conn = create_database(db_path)
    cursor = conn.cursor()

    # Process all NDJSON files
    total_records = 0
    stats = defaultdict(lambda: defaultdict(int))

    ndjson_files = sorted(Path(INPUT_DIR).glob("*.ndjson"))
    print(f"Found {len(ndjson_files)} NDJSON files")
    print()

    for filepath in ndjson_files:
        filename = filepath.name
        print(f"Processing: {filename}")

        file_records = 0
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    try:
                        raw = json.loads(line)
                        record = process_record(raw, filename)
                        insert_record(cursor, record)

                        # Track stats
                        stats[record['state']][record['jurisdiction']] += 1
                        stats['_categories'][record['category']] += 1
                        stats['_project_types'][record['project_type']] += 1

                        file_records += 1
                        total_records += 1

                    except json.JSONDecodeError:
                        pass

        print(f"  -> {file_records:,} records")

        # Commit every file
        conn.commit()

    print()
    print(f"Total records loaded: {total_records:,}")
    print()

    # Export by category
    print("Exporting by category...")
    categories = [
        'septic_ossf', 'building_permits', 'code_enforcement',
        'planning_zoning', 'business_licenses', 'contractor_licenses',
        'public_works', 'service_requests', 'other'
    ]

    headers = ['permit_number', 'address', 'city', 'state', 'zip', 'jurisdiction',
               'project_type', 'description', 'status', 'date_created']

    for category in categories:
        output_file = f"{OUTPUT_DIR}/by_category/{category}.csv"
        query = f'''
            SELECT permit_number, address, city, state, zip, jurisdiction,
                   project_type, description, status, date_created
            FROM permits WHERE category = '{category}'
            ORDER BY state, city, date_created DESC
        '''
        export_csv(conn, output_file, query, headers)

        cursor.execute(f"SELECT COUNT(*) FROM permits WHERE category = '{category}'")
        count = cursor.fetchone()[0]
        print(f"  {category}: {count:,} records")

    print()

    # Export by state
    print("Exporting by state...")
    cursor.execute("SELECT DISTINCT state FROM permits ORDER BY state")
    states = [row[0] for row in cursor.fetchall() if row[0]]

    for state in states:
        state_dir = f"{OUTPUT_DIR}/by_state/{state}"
        os.makedirs(state_dir, exist_ok=True)

        # Get jurisdictions in this state
        cursor.execute(f"SELECT DISTINCT jurisdiction FROM permits WHERE state = '{state}' ORDER BY jurisdiction")
        jurisdictions = [row[0] for row in cursor.fetchall() if row[0]]

        for jurisdiction in jurisdictions:
            safe_name = jurisdiction.replace('/', '_').replace('\\', '_').replace(' ', '_')
            jur_dir = f"{state_dir}/{safe_name}"
            os.makedirs(jur_dir, exist_ok=True)

            # Export all records for this jurisdiction
            output_file = f"{jur_dir}/all_permits.csv"
            query = f'''
                SELECT permit_number, address, city, state, zip,
                       project_type, category, description, status, date_created
                FROM permits
                WHERE state = '{state}' AND jurisdiction = '{jurisdiction.replace("'", "''")}'
                ORDER BY date_created DESC
            '''
            export_csv(conn, output_file, query,
                      ['permit_number', 'address', 'city', 'state', 'zip',
                       'project_type', 'category', 'description', 'status', 'date_created'])

        cursor.execute(f"SELECT COUNT(*) FROM permits WHERE state = '{state}'")
        count = cursor.fetchone()[0]
        print(f"  {state}: {count:,} records in {len(jurisdictions)} jurisdictions")

    print()

    # Export CRM-ready leads (addresses with geographic data)
    print("Exporting CRM-ready leads...")
    crm_query = '''
        SELECT DISTINCT
            address, city, state, zip, jurisdiction as county,
            lat, lng, parcel_number,
            GROUP_CONCAT(DISTINCT project_type) as permit_types,
            COUNT(*) as permit_count,
            MAX(date_created) as last_permit_date
        FROM permits
        WHERE address IS NOT NULL AND address != ''
        GROUP BY address, city, state
        ORDER BY state, city, address
    '''
    export_csv(conn, f"{OUTPUT_DIR}/crm_import/property_leads.csv", crm_query,
              ['address', 'city', 'state', 'zip', 'county', 'lat', 'lng',
               'parcel_number', 'permit_types', 'permit_count', 'last_permit_date'])

    cursor.execute("SELECT COUNT(DISTINCT address || city || state) FROM permits WHERE address != ''")
    unique_addresses = cursor.fetchone()[0]
    print(f"  Unique properties: {unique_addresses:,}")

    print()

    # Generate summary report
    print("Generating summary report...")
    report = f"""# MGO Data Processing Report

**Generated:** {datetime.now().isoformat()}
**Total Records:** {total_records:,}

## By State

| State | Records | Jurisdictions |
|-------|---------|---------------|
"""

    for state in states:
        cursor.execute(f"SELECT COUNT(*) FROM permits WHERE state = '{state}'")
        count = cursor.fetchone()[0]
        cursor.execute(f"SELECT COUNT(DISTINCT jurisdiction) FROM permits WHERE state = '{state}'")
        jur_count = cursor.fetchone()[0]
        report += f"| {state} | {count:,} | {jur_count} |\n"

    report += """
## By Category

| Category | Records |
|----------|---------|
"""

    for category in categories:
        cursor.execute(f"SELECT COUNT(*) FROM permits WHERE category = '{category}'")
        count = cursor.fetchone()[0]
        report += f"| {category} | {count:,} |\n"

    report += f"""
## Output Files

- **Database:** `{db_path}`
- **By State:** `{OUTPUT_DIR}/by_state/`
- **By Category:** `{OUTPUT_DIR}/by_category/`
- **CRM Import:** `{OUTPUT_DIR}/crm_import/property_leads.csv`

## Sample Queries

```sql
-- Count septic/OSSF permits by state
SELECT state, COUNT(*) as count
FROM permits WHERE category = 'septic_ossf'
GROUP BY state ORDER BY count DESC;

-- Find all permits for an address
SELECT * FROM permits WHERE address LIKE '%123 Main%';

-- Recent permits by jurisdiction
SELECT jurisdiction, COUNT(*) as count
FROM permits
WHERE date_created > '2024-01-01'
GROUP BY jurisdiction
ORDER BY count DESC LIMIT 20;

-- Properties with multiple permits (good leads!)
SELECT address, city, state, COUNT(*) as permit_count
FROM permits
GROUP BY address, city, state
HAVING permit_count > 3
ORDER BY permit_count DESC;
```
"""

    with open(f"{OUTPUT_DIR}/summary_report.md", 'w') as f:
        f.write(report)

    print(f"Report saved to: {OUTPUT_DIR}/summary_report.md")

    conn.close()

    print()
    print("=" * 60)
    print("PROCESSING COMPLETE")
    print("=" * 60)
    print(f"Total records: {total_records:,}")
    print(f"Unique addresses: {unique_addresses:,}")
    print(f"Output: {OUTPUT_DIR}/")

if __name__ == '__main__':
    main()
