#!/usr/bin/env python3
"""
Williamson County IDT Plans -> CRM Migration

Transforms scraped Williamson County permit data and ingests
via the CRM batch API endpoint.

Usage:
    python williamson_to_crm.py [--dry-run] [--token TOKEN]
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Tuple

try:
    import requests
except ImportError:
    print("Error: 'requests' package required. Install with: pip install requests")
    sys.exit(1)

# Configuration
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
INPUT_FILE = PROJECT_ROOT / "scrapers/output/williamson_county/williamson_projects_all.json"
API_URL = "https://react-crm-api-production.up.railway.app/api/v2/permits/batch"
BATCH_SIZE = 1000
SOURCE_PORTAL = "williamson_idt"
BASE_URL = "https://williamson.idtplans.com"


def parse_label(label: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Extract city and date from label.

    Example inputs:
    - "5671 BENDING CHESTNUT RD - MICHAEL ANGLIN ( Williamson County (Unincorporated Areas), TN) - 4/24/20"
    - "1000 Annecy Parkway (Nolensville, TN) - 1/8/26"
    - "1000 Aspen Loop (Franklin, TN) - 12/27/23"
    """
    # Extract city - handle nested parentheses
    # Pattern matches: (City Name, TN) or ( Williamson County (Unincorporated Areas), TN)
    city_match = re.search(r'\(\s*([^,]+(?:\([^)]*\)[^,]*)?),\s*TN\)', label)
    city = None
    if city_match:
        city = city_match.group(1).strip()
        # Clean up variations
        if "Unincorporated" in city:
            city = "Unincorporated"
        elif "Williamson County" in city:
            city = "Williamson County"

    # Extract date from end: " - M/D/YY"
    date_match = re.search(r' - (\d{1,2}/\d{1,2}/\d{2})$', label)
    permit_date = None
    if date_match:
        date_str = date_match.group(1)
        try:
            parts = date_str.split('/')
            month = int(parts[0])
            day = int(parts[1])
            year = int(parts[2])
            # Convert 2-digit year to 4-digit
            # Assuming 00-50 = 2000-2050, 51-99 = 1951-1999
            full_year = 2000 + year if year < 50 else 1900 + year
            permit_date = f"{full_year}-{month:02d}-{day:02d}"
        except (ValueError, IndexError):
            pass

    return city, permit_date


def transform_record(record: dict) -> dict:
    """Transform IDT Plans record to CRM PermitCreate format."""
    value = record.get("value", "").strip()
    label = record.get("label", "")
    proj_id = record.get("id", "")

    # Split value into address and owner/project name
    # Format: "ADDRESS - OWNER/PROJECT NAME"
    parts = value.split(" - ", 1)
    address = parts[0].strip() if parts else value
    owner_name = parts[1].strip() if len(parts) > 1 else None

    # Extract city and date from label
    city, permit_date = parse_label(label)

    # Build permit_url
    permit_url = None
    if proj_id:
        permit_url = f"{BASE_URL}{proj_id}"

    return {
        "state_code": "TN",
        "county_name": "Williamson",
        "address": address if address else None,
        "city": city,
        "owner_name": owner_name,
        "permit_date": permit_date,
        "permit_url": permit_url,
        "source_portal_code": SOURCE_PORTAL,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "raw_data": record
    }


def load_data(input_file: Path) -> list:
    """Load and return the permit records from JSON file."""
    print(f"Loading data from: {input_file}")

    if not input_file.exists():
        print(f"Error: Input file not found: {input_file}")
        sys.exit(1)

    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    records = data.get("data", [])
    print(f"Loaded {len(records)} records")
    print(f"Timestamp: {data.get('timestamp', 'N/A')}")
    print(f"Patterns searched: {data.get('patterns_searched', 'N/A')}")

    return records


def send_batch(permits: list, token: str, batch_num: int, total_batches: int) -> dict:
    """Send a batch of permits to the API."""
    payload = {
        "source_portal_code": SOURCE_PORTAL,
        "permits": permits
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    response = requests.post(API_URL, json=payload, headers=headers, timeout=120)

    if response.ok:
        return response.json()
    else:
        print(f"Batch {batch_num}/{total_batches} FAILED: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        return {"error": response.status_code, "message": response.text}


def migrate(token: str, dry_run: bool = False):
    """Run the migration."""
    # Load data
    records = load_data(INPUT_FILE)

    if not records:
        print("No records to migrate.")
        return

    # Transform all records
    print("\nTransforming records...")
    permits = []
    errors = []

    for i, record in enumerate(records):
        try:
            transformed = transform_record(record)
            permits.append(transformed)
        except Exception as e:
            errors.append({"index": i, "error": str(e), "record": record})

    print(f"Transformed: {len(permits)} records")
    if errors:
        print(f"Transform errors: {len(errors)}")

    # Show sample
    if permits:
        print("\nSample transformed record:")
        sample = permits[0]
        for key, value in sample.items():
            if key != "raw_data":
                print(f"  {key}: {value}")

    if dry_run:
        print("\n[DRY RUN] Would send to API:")
        print(f"  Total records: {len(permits)}")
        print(f"  Batch size: {BATCH_SIZE}")
        print(f"  Total batches: {(len(permits) + BATCH_SIZE - 1) // BATCH_SIZE}")
        print(f"  API endpoint: {API_URL}")
        return

    # Batch ingest
    print(f"\nSending to API in batches of {BATCH_SIZE}...")
    total_batches = (len(permits) + BATCH_SIZE - 1) // BATCH_SIZE

    stats = {
        "total_sent": 0,
        "inserted": 0,
        "updated": 0,
        "skipped": 0,
        "errors": 0,
        "api_errors": 0
    }

    for i in range(0, len(permits), BATCH_SIZE):
        batch = permits[i:i+BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1

        print(f"Batch {batch_num}/{total_batches} ({len(batch)} records)...", end=" ", flush=True)

        result = send_batch(batch, token, batch_num, total_batches)

        if "error" in result:
            stats["api_errors"] += 1
            print("FAILED")
        else:
            batch_stats = result.get("stats", result)
            stats["total_sent"] += len(batch)
            stats["inserted"] += batch_stats.get("inserted", 0)
            stats["updated"] += batch_stats.get("updated", 0)
            stats["skipped"] += batch_stats.get("skipped", 0)
            stats["errors"] += batch_stats.get("errors", 0)
            print(f"OK (inserted: {batch_stats.get('inserted', 0)}, updated: {batch_stats.get('updated', 0)})")

    # Summary
    print("\n" + "=" * 50)
    print("MIGRATION COMPLETE")
    print("=" * 50)
    print(f"Total records sent: {stats['total_sent']}")
    print(f"Inserted: {stats['inserted']}")
    print(f"Updated: {stats['updated']}")
    print(f"Skipped: {stats['skipped']}")
    print(f"Errors: {stats['errors']}")
    print(f"API failures: {stats['api_errors']}")


def main():
    parser = argparse.ArgumentParser(description="Migrate Williamson County permits to CRM")
    parser.add_argument("--dry-run", action="store_true", help="Transform only, don't send to API")
    parser.add_argument("--token", type=str, help="API auth token (or set CRM_API_TOKEN env var)")
    args = parser.parse_args()

    # Get token
    token = args.token or os.environ.get("CRM_API_TOKEN")

    if not token and not args.dry_run:
        print("Error: API token required. Use --token or set CRM_API_TOKEN env var")
        print("Tip: Use --dry-run to test transformation without API access")
        sys.exit(1)

    print("=" * 50)
    print("WILLIAMSON COUNTY -> CRM MIGRATION")
    print("=" * 50)
    print(f"Source: {INPUT_FILE}")
    print(f"Target: {API_URL}")
    print(f"Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
    print()

    migrate(token or "", dry_run=args.dry_run)


if __name__ == "__main__":
    main()
