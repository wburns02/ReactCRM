#!/usr/bin/env python3
"""
Florida Water Management Inventory (FLWMI) Scraper

Extracts wastewater (septic/sewer) classification data from Florida DOH GIS.
This is the most comprehensive FL database with 10+ million parcels.

API: https://gis.floridahealth.gov/server/rest/services/FLWMI/FLWMI_Wastewater/MapServer/0/query

USAGE:
    python scrapers/florida/flwmi-scraper.py
    python scrapers/florida/flwmi-scraper.py --county 29  # Hillsborough only
"""

import json
import time
import logging
import argparse
from datetime import datetime
from pathlib import Path
import requests

# Configuration
FLWMI_URL = "https://gis.floridahealth.gov/server/rest/services/FLWMI/FLWMI_Wastewater/MapServer/0/query"
MAX_RECORDS_PER_REQUEST = 1000

# Output directory
SCRIPT_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = SCRIPT_DIR.parent / "output" / "florida"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# FL county codes
FL_COUNTIES = {
    '01': 'Alachua', '02': 'Baker', '03': 'Bay', '04': 'Bradford', '05': 'Brevard',
    '06': 'Broward', '07': 'Calhoun', '08': 'Charlotte', '09': 'Citrus', '10': 'Clay',
    '11': 'Collier', '12': 'Columbia', '13': 'Miami-Dade', '14': 'DeSoto', '15': 'Dixie',
    '16': 'Duval', '17': 'Escambia', '18': 'Flagler', '19': 'Franklin', '20': 'Gadsden',
    '21': 'Gilchrist', '22': 'Glades', '23': 'Gulf', '24': 'Hamilton', '25': 'Hardee',
    '26': 'Hendry', '27': 'Hernando', '28': 'Highlands', '29': 'Hillsborough', '30': 'Holmes',
    '31': 'Indian River', '32': 'Jackson', '33': 'Jefferson', '34': 'Lafayette', '35': 'Lake',
    '36': 'Lee', '37': 'Leon', '38': 'Levy', '39': 'Liberty', '40': 'Madison',
    '41': 'Manatee', '42': 'Marion', '43': 'Martin', '44': 'Monroe', '45': 'Nassau',
    '46': 'Okaloosa', '47': 'Okeechobee', '48': 'Orange', '49': 'Osceola', '50': 'Palm Beach',
    '51': 'Pasco', '52': 'Pinellas', '53': 'Polk', '54': 'Putnam', '55': 'St. Johns',
    '56': 'St. Lucie', '57': 'Santa Rosa', '58': 'Sarasota', '59': 'Seminole', '60': 'Sumter',
    '61': 'Suwannee', '62': 'Taylor', '63': 'Union', '64': 'Volusia', '65': 'Wakulla',
    '66': 'Walton', '67': 'Washington'
}

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


def get_county_count(county_code: str) -> int:
    """Get total record count for a county."""
    params = {
        'where': f"CO_NO='{county_code}'",
        'returnCountOnly': 'true',
        'f': 'json'
    }
    try:
        resp = requests.get(FLWMI_URL, params=params, timeout=30)
        data = resp.json()
        return data.get('count', 0)
    except Exception as e:
        logger.error(f"Error getting count for county {county_code}: {e}")
        return 0


def get_county_septic_count(county_code: str) -> int:
    """Get septic record count for a county."""
    params = {
        'where': f"CO_NO='{county_code}' AND WW LIKE '%Septic%'",
        'returnCountOnly': 'true',
        'f': 'json'
    }
    try:
        resp = requests.get(FLWMI_URL, params=params, timeout=30)
        data = resp.json()
        return data.get('count', 0)
    except Exception as e:
        logger.error(f"Error getting septic count for county {county_code}: {e}")
        return 0


def extract_county_data(county_code: str, septic_only: bool = True) -> list:
    """Extract all records for a county using pagination."""
    records = []

    # Build where clause
    if septic_only:
        where = f"CO_NO='{county_code}' AND WW LIKE '%Septic%'"
    else:
        where = f"CO_NO='{county_code}'"

    # Get total count first
    params = {'where': where, 'returnCountOnly': 'true', 'f': 'json'}
    resp = requests.get(FLWMI_URL, params=params, timeout=30)
    total = resp.json().get('count', 0)

    if total == 0:
        return records

    logger.info(f"County {county_code} ({FL_COUNTIES.get(county_code, 'Unknown')}): {total:,} records to extract")

    # Paginate through results
    offset = 0
    while offset < total:
        params = {
            'where': where,
            'outFields': '*',
            'returnGeometry': 'false',
            'resultOffset': offset,
            'resultRecordCount': MAX_RECORDS_PER_REQUEST,
            'f': 'json'
        }

        try:
            resp = requests.get(FLWMI_URL, params=params, timeout=60)
            data = resp.json()

            features = data.get('features', [])
            if not features:
                break

            for f in features:
                attr = f.get('attributes', {})
                records.append(attr)

            offset += len(features)
            logger.info(f"  Extracted {offset:,} / {total:,} records")

            time.sleep(0.3)  # Rate limiting

        except Exception as e:
            logger.error(f"Error at offset {offset}: {e}")
            time.sleep(5)
            continue

    return records


def save_records(records: list, county_code: str, septic_only: bool):
    """Save records to NDJSON file."""
    county_name = FL_COUNTIES.get(county_code, county_code).lower().replace(' ', '_').replace('-', '_')
    suffix = "_septic" if septic_only else "_all"
    filename = OUTPUT_DIR / f"fl_flwmi_{county_name}{suffix}.ndjson"

    with open(filename, 'w') as f:
        for rec in records:
            f.write(json.dumps(rec) + '\n')

    logger.info(f"Saved {len(records):,} records to {filename}")
    return filename


def show_county_summary():
    """Show summary of all counties."""
    print("\nFLWMI County Summary (Septic Records)")
    print("="*60)

    total_septic = 0
    for code, name in sorted(FL_COUNTIES.items(), key=lambda x: x[1]):
        count = get_county_septic_count(code)
        total_septic += count
        if count > 0:
            print(f"{name:20} (CO {code}): {count:>10,}")
        time.sleep(0.2)

    print("="*60)
    print(f"{'TOTAL':20}: {total_septic:>10,}")


def main():
    parser = argparse.ArgumentParser(description='FLWMI Wastewater Scraper')
    parser.add_argument('--county', help='County code (e.g., 29 for Hillsborough)')
    parser.add_argument('--all', action='store_true', help='Extract all data (not just septic)')
    parser.add_argument('--summary', action='store_true', help='Show county summary')
    parser.add_argument('--list', action='store_true', help='List county codes')
    args = parser.parse_args()

    if args.list:
        print("Florida County Codes:")
        for code, name in sorted(FL_COUNTIES.items(), key=lambda x: x[1]):
            print(f"  {code}: {name}")
        return

    if args.summary:
        show_county_summary()
        return

    septic_only = not args.all

    if args.county:
        counties = [args.county.zfill(2)]
    else:
        # High-priority counties first
        priority = ['29', '51', '52', '27', '49', '05', '48', '53', '36', '58']
        counties = priority + [c for c in FL_COUNTIES.keys() if c not in priority]

    total_records = 0
    for county_code in counties:
        records = extract_county_data(county_code, septic_only)
        if records:
            save_records(records, county_code, septic_only)
            total_records += len(records)

    logger.info(f"\n{'='*60}")
    logger.info(f"COMPLETE - Total records: {total_records:,}")
    logger.info(f"{'='*60}")


if __name__ == "__main__":
    main()
