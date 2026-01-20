#!/usr/bin/env python3
"""
Williamson County Property-to-Permit Matcher

This script matches property records (from ArcGIS) with septic permit records (from IDT Projects)
based on normalized addresses.

Output: A filtered list of properties that have matching septic permits.

Usage:
    python match_properties_to_permits.py [--properties FILE] [--permits FILE] [--output FILE]
"""

import argparse
import hashlib
import json
import logging
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# File paths
SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR.parent / "output" / "williamson_county"
PROPERTIES_DIR = OUTPUT_DIR / "properties"

DEFAULT_PROPERTIES_FILE = PROPERTIES_DIR / "williamson_properties_20260120_171252.ndjson"
DEFAULT_PERMITS_FILE = OUTPUT_DIR / "williamson_projects_all.json"


def normalize_address(address: Optional[str]) -> Optional[str]:
    """
    Normalize address for matching.

    - Convert to uppercase
    - Remove punctuation
    - Standardize street type abbreviations
    - Standardize directionals
    - Remove extra whitespace
    """
    if not address:
        return None

    # Basic cleanup
    normalized = address.upper().strip()

    # Remove punctuation
    normalized = re.sub(r'[.,#\'"()]+', ' ', normalized)

    # Normalize whitespace
    normalized = re.sub(r'\s+', ' ', normalized)

    # Street type abbreviations
    street_replacements = {
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
        r'\bHIGHWAY\b': 'HWY',
        r'\bTRAIL\b': 'TRL',
        r'\bHOLLOW\b': 'HOLW',
        r'\bCOVE\b': 'CV',
        r'\bWAY\b': 'WAY',
        r'\bPASS\b': 'PASS',
    }

    for pattern, replacement in street_replacements.items():
        normalized = re.sub(pattern, replacement, normalized)

    # Directional abbreviations
    directional_replacements = {
        r'\bNORTH\b': 'N',
        r'\bSOUTH\b': 'S',
        r'\bEAST\b': 'E',
        r'\bWEST\b': 'W',
        r'\bNORTHEAST\b': 'NE',
        r'\bNORTHWEST\b': 'NW',
        r'\bSOUTHEAST\b': 'SE',
        r'\bSOUTHWEST\b': 'SW',
    }

    for pattern, replacement in directional_replacements.items():
        normalized = re.sub(pattern, replacement, normalized)

    # Remove unit designators for matching purposes
    normalized = re.sub(r'\b(APT|UNIT|STE|SUITE|#)\s*\d*\w*', '', normalized)

    # Final cleanup
    normalized = re.sub(r'\s+', ' ', normalized).strip()

    return normalized


def extract_address_from_permit_label(label: str) -> Optional[str]:
    """
    Extract address from permit label format.

    Example labels:
    - " 5671 BENDING CHESTNUT RD - MICHAEL ANGLIN SSDSLM REVISION"
    - "1000 Annecy Parkway (Nolensville, TN) - 1/8/26"
    - "(VACANT) BETHESDA RD - Holt Property"
    """
    if not label:
        return None

    # Remove leading/trailing whitespace
    label = label.strip()

    # Skip records without proper addresses
    if label.startswith('(VACANT)') or label.startswith('(stck'):
        # Try to extract road name after (VACANT)
        match = re.match(r'\(VACANT\)\s*(.+?)\s*-', label)
        if match:
            return match.group(1).strip()
        return None

    # Try to extract the address part before any "(" or "-"
    # Pattern 1: "123 Street Name (...)" or "123 Street Name - ..."
    match = re.match(r'^(\d+[A-Za-z]?\s+.+?)(?:\s*[\(-]|\s*$)', label)
    if match:
        return match.group(1).strip()

    # Pattern 2: Just the beginning of the label up to a comma or parens
    match = re.match(r'^(.+?)\s*[\(,]', label)
    if match:
        return match.group(1).strip()

    return label.split(' - ')[0].strip() if ' - ' in label else None


def extract_street_key(address: str) -> Optional[str]:
    """
    Extract a simplified street key for fuzzy matching.

    Returns: "123 MAIN ST" style key (just number and street name/type)
    """
    if not address:
        return None

    # Look for pattern: number + street name
    match = re.match(r'^(\d+[A-Za-z]?)\s+(.+)$', address)
    if match:
        number = match.group(1)
        street = match.group(2)
        # Just take the first 3 words of the street
        street_parts = street.split()[:3]
        return f"{number} {' '.join(street_parts)}"

    return address


def load_properties(file_path: Path) -> List[Dict[str, Any]]:
    """Load property records from NDJSON file."""
    logger.info(f"Loading properties from {file_path}")

    properties = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            if line.strip():
                try:
                    properties.append(json.loads(line))
                except json.JSONDecodeError as e:
                    logger.warning(f"Line {line_num}: JSON decode error: {e}")

    logger.info(f"Loaded {len(properties):,} properties")
    return properties


def load_permits(file_path: Path) -> List[Dict[str, Any]]:
    """Load permit records from JSON file."""
    logger.info(f"Loading permits from {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    permits = data.get('data', data) if isinstance(data, dict) else data
    logger.info(f"Loaded {len(permits):,} permits")
    return permits


def build_property_index(properties: List[Dict]) -> Dict[str, List[Dict]]:
    """
    Build an index of properties by normalized address.

    Returns: Dict mapping normalized_address -> list of property records
    """
    index = defaultdict(list)

    for prop in properties:
        address = prop.get('address') or prop.get('address_normalized')
        if address:
            normalized = normalize_address(address)
            if normalized:
                index[normalized].append(prop)

    logger.info(f"Built property index with {len(index):,} unique normalized addresses")
    return index


def build_fuzzy_property_index(properties: List[Dict]) -> Dict[str, List[Dict]]:
    """
    Build a fuzzy index using street keys for fallback matching.

    Returns: Dict mapping street_key -> list of property records
    """
    index = defaultdict(list)

    for prop in properties:
        address = prop.get('address') or prop.get('address_normalized')
        if address:
            normalized = normalize_address(address)
            if normalized:
                key = extract_street_key(normalized)
                if key:
                    index[key].append(prop)

    logger.info(f"Built fuzzy index with {len(index):,} unique street keys")
    return index


def match_permits_to_properties(
    properties: List[Dict],
    permits: List[Dict]
) -> Tuple[List[Dict], Dict[str, Any]]:
    """
    Match permit records to property records by address.

    Returns:
        Tuple of:
        - List of matched properties (with permit data attached)
        - Statistics dict
    """
    # Build indexes
    prop_index = build_property_index(properties)
    fuzzy_index = build_fuzzy_property_index(properties)

    # Track matches
    matched_properties: Dict[str, Dict] = {}  # address_hash -> property with permits
    exact_matches = 0
    fuzzy_matches = 0
    no_match = 0
    no_address = 0

    # Process each permit
    for permit in permits:
        # Extract address from permit value or label
        permit_value = permit.get('value', '')
        permit_label = permit.get('label', '')

        # Try to extract address
        permit_address = extract_address_from_permit_label(permit_value)
        if not permit_address:
            permit_address = extract_address_from_permit_label(permit_label)

        if not permit_address:
            no_address += 1
            continue

        # Normalize permit address
        permit_normalized = normalize_address(permit_address)
        if not permit_normalized:
            no_address += 1
            continue

        # Try exact match first
        matched_props = prop_index.get(permit_normalized, [])
        match_type = 'exact'

        # If no exact match, try fuzzy match
        if not matched_props:
            permit_key = extract_street_key(permit_normalized)
            if permit_key:
                matched_props = fuzzy_index.get(permit_key, [])
                match_type = 'fuzzy'

        if matched_props:
            # Use first match (could refine with more sophisticated matching)
            prop = matched_props[0]

            # Get address hash as key
            addr_hash = prop.get('address_hash')
            if not addr_hash:
                # Generate hash if not present
                addr_hash = hashlib.sha256(
                    f"{prop.get('address_normalized', '')}|Williamson|TN".encode()
                ).hexdigest()

            if addr_hash not in matched_properties:
                matched_properties[addr_hash] = {
                    **prop,
                    'matched_permits': [],
                    'match_type': match_type
                }

            # Add permit info
            matched_properties[addr_hash]['matched_permits'].append({
                'permit_id': permit.get('id'),
                'permit_value': permit_value,
                'permit_address': permit_address,
                'permit_normalized': permit_normalized
            })

            if match_type == 'exact':
                exact_matches += 1
            else:
                fuzzy_matches += 1
        else:
            no_match += 1

    stats = {
        'total_permits': len(permits),
        'permits_with_no_address': no_address,
        'exact_matches': exact_matches,
        'fuzzy_matches': fuzzy_matches,
        'no_match': no_match,
        'unique_properties_matched': len(matched_properties),
        'total_properties_available': len(properties)
    }

    logger.info(f"Matching complete:")
    logger.info(f"  Total permits: {stats['total_permits']:,}")
    logger.info(f"  Permits with no extractable address: {stats['permits_with_no_address']:,}")
    logger.info(f"  Exact matches: {stats['exact_matches']:,}")
    logger.info(f"  Fuzzy matches: {stats['fuzzy_matches']:,}")
    logger.info(f"  No match found: {stats['no_match']:,}")
    logger.info(f"  Unique properties matched: {stats['unique_properties_matched']:,}")

    return list(matched_properties.values()), stats


def save_matched_properties(
    matched_properties: List[Dict],
    output_file: Path,
    stats: Dict[str, Any]
):
    """Save matched properties to output file."""
    logger.info(f"Saving {len(matched_properties):,} matched properties to {output_file}")

    # Create output directory if needed
    output_file.parent.mkdir(parents=True, exist_ok=True)

    # Save as JSON with metadata
    output_data = {
        'timestamp': datetime.now().isoformat(),
        'statistics': stats,
        'properties': matched_properties
    }

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, default=str)

    # Also save NDJSON version for ingestion
    ndjson_file = output_file.with_suffix('.ndjson')
    with open(ndjson_file, 'w', encoding='utf-8') as f:
        for prop in matched_properties:
            # Remove matched_permits for ingestion (just keep property data)
            prop_for_ingestion = {k: v for k, v in prop.items() if k not in ['matched_permits', 'match_type']}
            f.write(json.dumps(prop_for_ingestion, default=str) + '\n')

    logger.info(f"Also saved NDJSON version: {ndjson_file}")


def main():
    parser = argparse.ArgumentParser(description="Match Williamson County properties to permits")
    parser.add_argument(
        '--properties',
        type=Path,
        default=DEFAULT_PROPERTIES_FILE,
        help=f"Properties NDJSON file (default: {DEFAULT_PROPERTIES_FILE.name})"
    )
    parser.add_argument(
        '--permits',
        type=Path,
        default=DEFAULT_PERMITS_FILE,
        help=f"Permits JSON file (default: {DEFAULT_PERMITS_FILE.name})"
    )
    parser.add_argument(
        '--output',
        type=Path,
        default=OUTPUT_DIR / "matched_properties.json",
        help="Output file for matched properties"
    )

    args = parser.parse_args()

    # Validate inputs
    if not args.properties.exists():
        logger.error(f"Properties file not found: {args.properties}")
        sys.exit(1)

    if not args.permits.exists():
        logger.error(f"Permits file not found: {args.permits}")
        sys.exit(1)

    logger.info("=" * 60)
    logger.info("WILLIAMSON COUNTY PROPERTY-PERMIT MATCHER")
    logger.info("=" * 60)

    # Load data
    properties = load_properties(args.properties)
    permits = load_permits(args.permits)

    # Match
    matched_properties, stats = match_permits_to_properties(properties, permits)

    # Save
    save_matched_properties(matched_properties, args.output, stats)

    logger.info("=" * 60)
    logger.info("MATCHING COMPLETE")
    logger.info(f"Matched {len(matched_properties):,} properties with septic permits")
    logger.info(f"Output: {args.output}")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
