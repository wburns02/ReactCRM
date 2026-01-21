#!/usr/bin/env python3
"""
Enhanced Permit-to-Property Linking for Williamson County, TN

Fixes critical bugs in the original clean_address() function and adds:
1. Proper stripping of subdivision names, cities, states, zips
2. RapidFuzz for high-performance fuzzy matching
3. Street key matching for fallback
4. Classification of truly unmatchable permits

Target: 65-75% raw link rate, 85-92% effective link rate
"""

import hashlib
import re
import psycopg2
from typing import Optional, Tuple, Dict, List
import logging
from dataclasses import dataclass
from enum import Enum

try:
    from rapidfuzz import fuzz, process
    RAPIDFUZZ_AVAILABLE = True
except ImportError:
    RAPIDFUZZ_AVAILABLE = False
    print("WARNING: rapidfuzz not installed. Using fallback matching. Install with: pip install rapidfuzz")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

DATABASE_URL = "postgresql://postgres:HqKfMjYmMuPhdjXJqFuuNUTWzbPOvdJr@turntable.proxy.rlwy.net:27015/railway"


class UnmatchableCategory(Enum):
    """Categories for permits that legitimately cannot be linked."""
    INFRASTRUCTURE = "infrastructure"  # Cell towers, utilities
    PERSON_ONLY = "person_only"        # Just person names, no address
    LOT_ONLY = "lot_only"              # Lot reference without street
    NON_PERMIT = "non_permit"          # Inquiries, requirements
    DEVELOPMENT = "development"         # Plats, phases, subdivisions
    NEW_CONSTRUCTION = "new_construction"  # Valid address but no property match
    ADDRESSABLE = "addressable"         # Should be linkable


class MatchConfidence(Enum):
    """Confidence levels for matches."""
    EXACT = "exact"           # 100% match
    HIGH = "high"             # 95%+ fuzzy
    MEDIUM = "medium"         # 85-94% fuzzy
    LOW = "low"               # Street key match
    NONE = "none"             # No match


@dataclass
class LinkResult:
    """Result of attempting to link a permit."""
    permit_id: str
    property_id: Optional[str]
    confidence: MatchConfidence
    score: float
    method: str
    category: Optional[UnmatchableCategory]
    original_address: str
    cleaned_address: str


# Tennessee cities commonly found in Williamson County addresses
TN_CITIES = [
    'FRANKLIN', 'NASHVILLE', 'BRENTWOOD', 'NOLENSVILLE', 'ARRINGTON',
    'THOMPSONS STATION', 'COLLEGE GROVE', 'FAIRVIEW', 'SPRING HILL',
    'LEIPERS FORK', 'BETHESDA', 'PRIMM SPRINGS'
]

# Street suffixes to recognize
STREET_SUFFIXES = [
    'RD', 'DR', 'LN', 'CT', 'CIR', 'BLVD', 'AVE', 'ST', 'PL', 'WAY',
    'PKWY', 'TRL', 'CV', 'LOOP', 'HOLW', 'HWY', 'PIKE', 'PK', 'TER',
    'PT', 'RUN', 'XING', 'PATH', 'PASS', 'GLN', 'BND', 'VW', 'TRCE'
]


def clean_address(address: Optional[str]) -> Optional[str]:
    """
    Aggressively clean address by removing all extra text.

    Fixed patterns:
    - Subdivision names AFTER street suffix
    - City, state, zip at end
    - Underscore/dash descriptions
    - Owner names
    - Permit numbers
    - Square bracket content
    """
    if not address:
        return None

    cleaned = address.upper().strip()

    # 1. Remove square brackets and their content first
    cleaned = re.sub(r'\s*\[[^\]]+\]', '', cleaned)

    # 2. Remove parenthetical content
    cleaned = re.sub(r'\s*\([^)]*\)', '', cleaned)

    # 3. Strip everything after " -- " or " - " followed by description
    cleaned = re.sub(r'\s+--\s+.*$', '', cleaned)
    cleaned = re.sub(r'\s+-\s+[A-Z].*$', '', cleaned)

    # 4. Strip everything after underscore followed by words
    cleaned = re.sub(r'_[A-Z].*$', '', cleaned)

    # 5. Strip city, state, zip at end (with various formats)
    city_pattern = '|'.join(TN_CITIES)
    cleaned = re.sub(
        rf',?\s*({city_pattern}),?\s*(TN|TENNESSEE)?\s*\d{{5}}(-\d{{4}})?$',
        '', cleaned, flags=re.IGNORECASE
    )

    # 6. Strip city name only at end (no state/zip)
    cleaned = re.sub(
        rf'\s+({city_pattern})$',
        '', cleaned, flags=re.IGNORECASE
    )

    # 7. Strip TN or TENNESSEE at end
    cleaned = re.sub(r'\s+(TN|TENNESSEE)\s*\d*$', '', cleaned, flags=re.IGNORECASE)

    # 8. Remove common prefixes that aren't part of address
    cleaned = re.sub(r'^(LOT|TRACT|PHASE|UNIT|STCK|L)\s*\d*[A-Z]?\s*[-:]?\s*', '', cleaned)

    # 9. Extract address after "at" if present (e.g., "lot 101 at 7200 Main St")
    at_match = re.search(r'\bAT\s+(\d+\s+.+)$', cleaned, re.IGNORECASE)
    if at_match:
        cleaned = at_match.group(1).upper()

    # 10. If starts with subdivision name, try to extract street address
    # Pattern: "SUBDIVISION NAME 123 STREET NAME"
    if not re.match(r'^\d', cleaned):
        street_match = re.search(r'(\d+\s+[A-Z][A-Z0-9\s]+(?:' + '|'.join(STREET_SUFFIXES) + r'))', cleaned)
        if street_match:
            cleaned = street_match.group(1)

    # 11. Strip subdivision/development names AFTER street suffix
    # Pattern: "123 MAIN ST MAYBERRY STATION" -> "123 MAIN ST"
    suffix_pattern = '|'.join(STREET_SUFFIXES)
    cleaned = re.sub(
        rf'({suffix_pattern})\s+[A-Z][A-Z]+(\s+[A-Z]+)*$',
        r'\1', cleaned
    )

    # 12. Strip owner names at end (FIRST LAST or FIRST AND LAST patterns)
    # But be careful not to strip street names
    cleaned = re.sub(r'\s+[A-Z]+\s+AND\s+[A-Z]+\s+[A-Z]+$', '', cleaned)

    # 13. Strip permit numbers (XX-XXXX format)
    cleaned = re.sub(r'\s+\d{2}-\d{4}$', '', cleaned)

    # 14. Clean up punctuation and whitespace
    cleaned = re.sub(r'[.,#\'"()]+', ' ', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned)

    # 15. Standard abbreviation normalization
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
        r'\bSPRING\b': 'SPG',
        r'\bSPRINGS\b': 'SPGS',
        r'\bMOUNTAIN\b': 'MTN',
        r'\bPOINT\b': 'PT',
        r'\bCROSSING\b': 'XING',
        r'\bHEIGHTS\b': 'HTS',
        r'\bESTATES\b': 'ESTS',
        r'\bRIDGE\b': 'RDG',
        r'\bVALLEY\b': 'VLY',
        r'\bVIEW\b': 'VW',
        r'\bHILLS\b': 'HLS',
        r'\bHILL\b': 'HL',
        r'\bMILL\b': 'ML',
        r'\bSTATION\b': 'STA',
        r'\bBRANCH\b': 'BR',
        r'\bUNION\b': 'UN',
        r'\bBUILDING\b': 'BLDG',
        r'\bSQUARE\b': 'SQ',
        r'\bFLOOR\b': 'FL',
        r'\bFEET\b': 'FT',
    }

    for pattern, replacement in replacements.items():
        cleaned = re.sub(pattern, replacement, cleaned)

    cleaned = cleaned.strip()

    # Final validation: should start with a number for a valid street address
    if cleaned and not re.match(r'^\d+\s+', cleaned):
        # Not a valid street address, but might still be useful
        pass

    return cleaned if cleaned else None


def classify_unmatchable(address: str, cleaned: Optional[str]) -> UnmatchableCategory:
    """Classify why a permit address is unmatchable."""
    addr_upper = (address or '').upper()

    # Infrastructure: cell towers, utilities
    infra_keywords = ['CROWN', 'VERIZON', 'T-MOBILE', 'TMOBILE', 'ANTENNA',
                      'TOWER', 'AT&T', 'ATT', 'WIRELESS', 'CELL']
    if any(kw in addr_upper for kw in infra_keywords):
        return UnmatchableCategory.INFRASTRUCTURE

    # Non-permit: inquiries, requirements
    non_permit_keywords = ['INQUIRY', 'REQUIREMENT', 'SETBACK', 'INSPECTION',
                           'RENEWAL', 'LICENSE', 'SIGN PERMIT', 'PRELIMINARY PLAT']
    if any(kw in addr_upper for kw in non_permit_keywords):
        return UnmatchableCategory.NON_PERMIT

    # Development: plats, phases
    dev_keywords = ['PRELIMINARY', 'PLAT', 'PHASE', 'SUBDIVISION',
                    'DEVELOPMENT', 'SECTION']
    if any(kw in addr_upper for kw in dev_keywords) and not re.search(r'\d+\s+[A-Z]', addr_upper):
        return UnmatchableCategory.DEVELOPMENT

    # Person only: no street number, looks like a name
    if cleaned is None or not re.search(r'\d', cleaned):
        # Check if it looks like a person's name
        if re.match(r'^[A-Z]+,?\s+[A-Z]+', addr_upper) or \
           re.match(r'^[A-Z]+\s+(AND|&)\s+[A-Z]+', addr_upper):
            return UnmatchableCategory.PERSON_ONLY

    # Lot only: just lot reference, no street
    if re.match(r'^(LOT|TRACT)\s+\d+', addr_upper) and not re.search(r'\d+\s+[A-Z]+\s+(RD|DR|LN|ST|CT|CIR|AVE|BLVD)', addr_upper):
        return UnmatchableCategory.LOT_ONLY

    # If has valid street number and suffix, it's addressable
    if cleaned and re.match(r'^\d+\s+[A-Z]', cleaned):
        return UnmatchableCategory.ADDRESSABLE

    # Default: mark as new construction (valid but no match)
    return UnmatchableCategory.NEW_CONSTRUCTION


def extract_street_key(address: str) -> Optional[str]:
    """Extract street number + first word of street name for broad matching."""
    match = re.match(r'^(\d+)\s+([A-Z]+)', address)
    if match:
        return f"{match.group(1)} {match.group(2)}"
    return None


def fuzzy_match(cleaned_addr: str, property_addresses: Dict[str, str], threshold: int = 92) -> Tuple[Optional[str], float]:
    """Find best fuzzy match using RapidFuzz."""
    if not RAPIDFUZZ_AVAILABLE or not cleaned_addr:
        return None, 0

    result = process.extractOne(
        cleaned_addr,
        list(property_addresses.keys()),
        scorer=fuzz.token_sort_ratio,
        score_cutoff=threshold
    )

    if result:
        matched_addr, score, _ = result
        return property_addresses[matched_addr], score
    return None, 0


def main():
    logger.info("=" * 70)
    logger.info("ENHANCED PERMIT-TO-PROPERTY LINKING - Williamson County TN")
    logger.info("=" * 70)

    if not RAPIDFUZZ_AVAILABLE:
        logger.warning("RapidFuzz not available - fuzzy matching disabled")

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

            # Load all properties
            cur.execute("""
                SELECT id, address_normalized
                FROM properties
                WHERE county_id = %s AND is_active = TRUE AND address_normalized IS NOT NULL
            """, (county_id,))
            properties = cur.fetchall()

            # Build lookup structures
            address_to_property = {row[1]: str(row[0]) for row in properties}

            # Build street key index for fallback matching
            street_key_to_properties: Dict[str, List[Tuple[str, str]]] = {}
            for addr, prop_id in address_to_property.items():
                key = extract_street_key(addr)
                if key:
                    if key not in street_key_to_properties:
                        street_key_to_properties[key] = []
                    street_key_to_properties[key].append((addr, prop_id))

            logger.info(f"Loaded {len(address_to_property):,} properties")
            logger.info(f"Built {len(street_key_to_properties):,} street key groups")

            # Get all permits (including already linked for re-processing)
            cur.execute("""
                SELECT id, address, address_normalized, property_id
                FROM septic_permits
                WHERE state_id = %s AND county_id = %s AND is_active = TRUE
            """, (state_id, county_id))
            all_permits = cur.fetchall()
            logger.info(f"Processing {len(all_permits):,} permits")

            # Track results
            results = {
                'exact': 0,
                'fuzzy_high': 0,
                'fuzzy_medium': 0,
                'street_key': 0,
                'already_linked': 0,
                'unmatched': 0,
            }

            categories = {cat: 0 for cat in UnmatchableCategory}

            newly_linked = 0

            for permit_id, address, address_normalized, existing_property_id in all_permits:
                # Clean the address
                cleaned = clean_address(address)

                # Skip if already correctly linked
                if existing_property_id and cleaned:
                    # Verify the link is still valid
                    results['already_linked'] += 1
                    continue

                matched_property_id = None
                confidence = MatchConfidence.NONE
                method = "none"
                score = 0.0

                if cleaned:
                    # Layer 1: Exact match
                    if cleaned in address_to_property:
                        matched_property_id = address_to_property[cleaned]
                        confidence = MatchConfidence.EXACT
                        method = "exact"
                        score = 100.0
                        results['exact'] += 1

                    # Layer 2: Fuzzy match (high confidence >= 95)
                    elif RAPIDFUZZ_AVAILABLE:
                        prop_id, fuzz_score = fuzzy_match(cleaned, address_to_property, threshold=95)
                        if prop_id:
                            matched_property_id = prop_id
                            confidence = MatchConfidence.HIGH
                            method = "fuzzy_high"
                            score = fuzz_score
                            results['fuzzy_high'] += 1
                        else:
                            # Layer 3: Fuzzy match (medium confidence 85-94)
                            prop_id, fuzz_score = fuzzy_match(cleaned, address_to_property, threshold=85)
                            if prop_id:
                                matched_property_id = prop_id
                                confidence = MatchConfidence.MEDIUM
                                method = "fuzzy_medium"
                                score = fuzz_score
                                results['fuzzy_medium'] += 1

                    # Layer 4: Street key match (if still no match)
                    if not matched_property_id:
                        street_key = extract_street_key(cleaned)
                        if street_key and street_key in street_key_to_properties:
                            candidates = street_key_to_properties[street_key]
                            if len(candidates) == 1:
                                # Unique match on street key
                                matched_property_id = candidates[0][1]
                                confidence = MatchConfidence.LOW
                                method = "street_key_unique"
                                score = 75.0
                                results['street_key'] += 1

                # Update permit if we found a match
                if matched_property_id:
                    cur.execute("""
                        UPDATE septic_permits SET property_id = %s WHERE id = %s
                    """, (matched_property_id, str(permit_id)))
                    newly_linked += 1
                else:
                    # Classify why it's unmatchable
                    category = classify_unmatchable(address, cleaned)
                    categories[category] += 1
                    results['unmatched'] += 1

            conn.commit()

            # Get final counts
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

            # Calculate effective rate
            unmatchable_count = sum([
                categories[UnmatchableCategory.INFRASTRUCTURE],
                categories[UnmatchableCategory.PERSON_ONLY],
                categories[UnmatchableCategory.NON_PERMIT],
                categories[UnmatchableCategory.DEVELOPMENT],
            ])
            addressable_total = total_permits - unmatchable_count
            effective_rate = (total_linked / addressable_total * 100) if addressable_total > 0 else 0

            # Report results
            logger.info("=" * 70)
            logger.info("LINKING RESULTS")
            logger.info("=" * 70)
            logger.info(f"")
            logger.info(f"MATCHING BREAKDOWN:")
            logger.info(f"  Already linked:      {results['already_linked']:,}")
            logger.info(f"  Exact matches:       {results['exact']:,}")
            logger.info(f"  Fuzzy (high ≥95%):   {results['fuzzy_high']:,}")
            logger.info(f"  Fuzzy (med 85-94%):  {results['fuzzy_medium']:,}")
            logger.info(f"  Street key unique:   {results['street_key']:,}")
            logger.info(f"  Unmatched:           {results['unmatched']:,}")
            logger.info(f"")
            logger.info(f"UNMATCHABLE CATEGORIES:")
            for cat, count in categories.items():
                logger.info(f"  {cat.value:20}: {count:,}")
            logger.info(f"")
            logger.info(f"FINAL METRICS:")
            logger.info(f"  Total permits:       {total_permits:,}")
            logger.info(f"  Total linked:        {total_linked:,}")
            logger.info(f"  Newly linked:        {newly_linked:,}")
            logger.info(f"  Raw link rate:       {total_linked/total_permits*100:.1f}%")
            logger.info(f"  Legitimately unmatchable: {unmatchable_count:,}")
            logger.info(f"  Addressable permits: {addressable_total:,}")
            logger.info(f"  EFFECTIVE LINK RATE: {effective_rate:.1f}%")
            logger.info("=" * 70)

            # Show sample of still-unlinked addressable permits
            logger.info("\nSample of still-unlinked ADDRESSABLE permits:")
            cur.execute("""
                SELECT address, address_normalized
                FROM septic_permits
                WHERE state_id = %s AND county_id = %s AND property_id IS NULL
                ORDER BY RANDOM()
                LIMIT 15
            """, (state_id, county_id))

            addressable_samples = 0
            for addr, norm in cur.fetchall():
                cleaned = clean_address(addr)
                category = classify_unmatchable(addr, cleaned)
                if category == UnmatchableCategory.ADDRESSABLE or category == UnmatchableCategory.NEW_CONSTRUCTION:
                    addressable_samples += 1
                    logger.info(f"  Original: {addr}")
                    logger.info(f"  Cleaned:  {cleaned}")
                    logger.info(f"  Category: {category.value}")
                    logger.info("")
                    if addressable_samples >= 5:
                        break

    finally:
        conn.close()


if __name__ == "__main__":
    main()
