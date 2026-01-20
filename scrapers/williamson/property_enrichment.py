#!/usr/bin/env python3
"""
Williamson County Property Enrichment Script

Ingests property data from ArcGIS and links to existing permits.
Can run the ArcGIS scraper or load from existing files.

Usage:
    python property_enrichment.py [--scrape] [--dry-run] [--token TOKEN]
    python property_enrichment.py --file properties.json [--dry-run] [--token TOKEN]
"""

import argparse
import asyncio
import json
import logging
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any

try:
    import requests
except ImportError:
    print("Error: 'requests' package required. Install with: pip install requests")
    sys.exit(1)

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent))
from arcgis_property_scraper import scrape_all_properties, scrape_by_address

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR.parent / "output" / "williamson_county" / "properties"

# API Configuration
API_BASE_URL = "https://react-crm-api-production.up.railway.app/api/v2"
PROPERTIES_ENDPOINT = f"{API_BASE_URL}/properties/batch"
BATCH_SIZE = 500


def normalize_address(address: Optional[str]) -> Optional[str]:
    """Normalize address for matching."""
    if not address:
        return None

    normalized = address.upper().strip()
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
        r'\bNORTH\b': 'N',
        r'\bSOUTH\b': 'S',
        r'\bEAST\b': 'E',
        r'\bWEST\b': 'W',
        r'\bHOLLOW\b': 'HOLW',
    }

    for pattern, replacement in replacements.items():
        normalized = re.sub(pattern, replacement, normalized)

    return normalized


def transform_for_api(prop: Dict[str, Any]) -> Dict[str, Any]:
    """Transform ArcGIS property data to API format."""
    return {
        # Location
        "state_code": prop.get("state_code", "TN"),
        "county_name": prop.get("county_name", "Williamson"),

        # Address
        "address": prop.get("address"),
        "address_normalized": prop.get("address_normalized"),
        "street_number": prop.get("street_number"),
        "street_name": prop.get("street_name"),
        "city": prop.get("city"),
        "subdivision": prop.get("subdivision"),

        # Parcel IDs
        "parcel_id": prop.get("parcel_id"),
        "gis_link": prop.get("gis_link"),

        # Geo
        "centroid_lat": prop.get("centroid_lat"),
        "centroid_lon": prop.get("centroid_lon"),

        # Owner
        "owner_name": prop.get("owner_name"),
        "owner_name_2": prop.get("owner_name_2"),
        "owner_mailing_address": prop.get("owner_mailing_address"),
        "owner_city": prop.get("owner_city"),
        "owner_state": prop.get("owner_state"),
        "owner_zip": prop.get("owner_zip"),

        # Assessment
        "assessed_value": prop.get("assessed_value"),
        "assessed_land": prop.get("assessed_land"),
        "assessed_improvement": prop.get("assessed_improvement"),
        "market_value": prop.get("market_value"),
        "market_land": prop.get("market_land"),
        "market_improvement": prop.get("market_improvement"),

        # Lot
        "lot_size_acres": prop.get("lot_size_acres"),
        "calculated_acres": prop.get("calculated_acres"),
        "square_footage": prop.get("square_footage"),

        # Type
        "property_type_code": prop.get("property_type_code"),
        "property_type": prop.get("property_type"),
        "parcel_type": prop.get("parcel_type"),

        # Transfer
        "last_sale_date": prop.get("last_sale_date"),
        "last_sale_price": prop.get("last_sale_price"),
        "deed_book": prop.get("deed_book"),
        "deed_page": prop.get("deed_page"),

        # Source
        "source_portal_code": prop.get("source_portal_code", "williamson_arcgis"),
        "arcgis_object_id": prop.get("arcgis_object_id"),
        "scraped_at": prop.get("scraped_at")
    }


def load_properties_from_file(file_path: Path) -> List[Dict]:
    """Load property data from JSON or NDJSON file."""
    logger.info(f"Loading properties from {file_path}")

    if file_path.suffix == '.ndjson':
        properties = []
        with open(file_path, 'r') as f:
            for line in f:
                if line.strip():
                    properties.append(json.loads(line))
        return properties
    else:
        with open(file_path, 'r') as f:
            data = json.load(f)
            return data.get('data', data) if isinstance(data, dict) else data


def get_latest_property_file() -> Optional[Path]:
    """Get the most recent property data file."""
    if not OUTPUT_DIR.exists():
        return None

    files = list(OUTPUT_DIR.glob("williamson_properties_*.json"))
    if not files:
        return None

    return max(files, key=lambda p: p.stat().st_mtime)


def ingest_batch(
    properties: List[Dict],
    token: str,
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Ingest a batch of properties via API.

    Returns:
        Dict with insert/update/skip counts
    """
    if dry_run:
        logger.info(f"DRY RUN: Would ingest {len(properties)} properties")
        return {
            "inserted": 0,
            "updated": 0,
            "skipped": len(properties),
            "errors": 0,
            "dry_run": True
        }

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    payload = {
        "properties": properties,
        "source_portal_code": "williamson_arcgis"
    }

    try:
        response = requests.post(
            PROPERTIES_ENDPOINT,
            headers=headers,
            json=payload,
            timeout=120
        )

        if response.status_code == 200:
            return response.json()
        elif response.status_code == 401:
            logger.error("Authentication failed - check token")
            return {"errors": len(properties), "error": "auth_failed"}
        else:
            logger.error(f"API error {response.status_code}: {response.text[:500]}")
            return {"errors": len(properties), "error": f"http_{response.status_code}"}

    except requests.exceptions.RequestException as e:
        logger.error(f"Request failed: {e}")
        return {"errors": len(properties), "error": str(e)}


def ingest_all_properties(
    properties: List[Dict],
    token: str,
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Ingest all properties in batches.

    Returns:
        Summary statistics
    """
    logger.info(f"Ingesting {len(properties):,} properties in batches of {BATCH_SIZE}")

    total_stats = {
        "inserted": 0,
        "updated": 0,
        "skipped": 0,
        "errors": 0,
        "batches_processed": 0
    }

    for i in range(0, len(properties), BATCH_SIZE):
        batch = properties[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (len(properties) + BATCH_SIZE - 1) // BATCH_SIZE

        logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} records)")

        # Transform for API
        api_batch = [transform_for_api(p) for p in batch]

        # Ingest
        result = ingest_batch(api_batch, token, dry_run)

        total_stats["inserted"] += result.get("inserted", 0)
        total_stats["updated"] += result.get("updated", 0)
        total_stats["skipped"] += result.get("skipped", 0)
        total_stats["errors"] += result.get("errors", 0)
        total_stats["batches_processed"] += 1

        if result.get("error"):
            logger.warning(f"Batch {batch_num} had errors: {result.get('error')}")

    return total_stats


async def main_async(args):
    """Main async entry point."""
    logger.info("=" * 60)
    logger.info("WILLIAMSON COUNTY PROPERTY ENRICHMENT")
    logger.info("=" * 60)

    properties = []

    # Load or scrape properties
    if args.file:
        file_path = Path(args.file)
        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            sys.exit(1)
        properties = load_properties_from_file(file_path)

    elif args.scrape:
        logger.info("Running ArcGIS scraper...")
        properties = await scrape_all_properties()

    else:
        # Try to load most recent file
        latest = get_latest_property_file()
        if latest:
            logger.info(f"Using latest property file: {latest}")
            properties = load_properties_from_file(latest)
        else:
            logger.info("No existing data found. Running scraper...")
            properties = await scrape_all_properties()

    if not properties:
        logger.error("No property data to process")
        sys.exit(1)

    logger.info(f"Loaded {len(properties):,} properties")

    # Filter for valid addresses
    valid_properties = [p for p in properties if p.get('address')]
    logger.info(f"Properties with addresses: {len(valid_properties):,}")

    # Get token
    token = args.token or os.getenv("CRM_API_TOKEN")
    if not token and not args.dry_run:
        logger.error("No API token provided. Use --token or set CRM_API_TOKEN env var")
        logger.info("Running in dry-run mode instead")
        args.dry_run = True

    # Ingest
    stats = ingest_all_properties(valid_properties, token or "", args.dry_run)

    # Summary
    logger.info("=" * 60)
    logger.info("ENRICHMENT COMPLETE")
    logger.info(f"  Inserted: {stats['inserted']:,}")
    logger.info(f"  Updated: {stats['updated']:,}")
    logger.info(f"  Skipped: {stats['skipped']:,}")
    logger.info(f"  Errors: {stats['errors']:,}")
    logger.info(f"  Batches: {stats['batches_processed']}")
    logger.info("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Williamson County Property Enrichment")
    parser.add_argument("--scrape", action="store_true", help="Run ArcGIS scraper first")
    parser.add_argument("--file", type=str, help="Load properties from JSON/NDJSON file")
    parser.add_argument("--dry-run", action="store_true", help="Don't actually ingest")
    parser.add_argument("--token", type=str, help="API authentication token")

    args = parser.parse_args()

    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
