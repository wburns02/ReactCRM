#!/usr/bin/env python3
"""
Master test runner for all septic permit scrapers.

Usage:
    python test_all_portals.py                    # Test all portals
    python test_all_portals.py --portal florida   # Test specific portal
    python test_all_portals.py --state FL         # Test all FL portals
    python test_all_portals.py --min-records 5    # Lower threshold for testing
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

from config import (
    PORTAL_CONFIGS,
    TEST_ADDRESSES,
    TEST_PARCELS,
    SCRAPER_SETTINGS,
    OUTPUT_PATHS,
)
from base_scraper import ScraperStatus, SearchMethod


def get_scraper_for_portal(portal_key: str):
    """
    Dynamically load the scraper class for a portal.

    Returns:
        Scraper instance or None if not implemented
    """
    portal_to_module = {
        "florida_ebridge": "states.florida_ostds_scraper",
        "minnesota_ssts": "states.minnesota_ssts_scraper",
        "vermont_dec": "states.vermont_dec_scraper",
        "new_hampshire_ssb": "states.new_hampshire_ssb_scraper",
        "delaware_dnrec": "states.delaware_dnrec_scraper",
        "tennessee_tdec": "states.tennessee_tdec_scraper",
        "new_mexico_nmed": "states.new_mexico_nmed_scraper",
        "maine_septic": "states.maine_septic_scraper",
        "rhode_island_owts": "states.rhode_island_owts_scraper",
        "south_carolina_dhec": "states.south_carolina_dhec_scraper",
        "alaska_edms": "states.alaska_edms_scraper",
        # Accela portals
        "az_maricopa_accela": "platforms.accela_scraper",
        "nv_clark_accela": "platforms.accela_scraper",
        "ny_suffolk_accela": "platforms.accela_scraper",
        "or_clackamas_accela": "platforms.accela_scraper",
        # EnerGov portals
        "ca_riverside_energov": "platforms.energov_scraper",
        "sc_pickens_energov": "platforms.energov_scraper",
    }

    module_name = portal_to_module.get(portal_key)
    if not module_name:
        return None

    try:
        # This would dynamically import the module
        # For now, return None until scrapers are implemented
        print(f"  [STUB] Scraper module '{module_name}' not yet implemented")
        return None
    except ImportError as e:
        print(f"  [ERROR] Could not import {module_name}: {e}")
        return None


def test_portal(
    portal_key: str,
    min_records: int = 15,
    save_results: bool = True
) -> Dict[str, Any]:
    """
    Run tests against a single portal.

    Args:
        portal_key: Key from PORTAL_CONFIGS
        min_records: Minimum records needed for pass
        save_results: Whether to save results to disk

    Returns:
        Test results dictionary
    """
    if portal_key not in PORTAL_CONFIGS:
        return {
            "portal_key": portal_key,
            "status": "error",
            "error": f"Unknown portal: {portal_key}"
        }

    config = PORTAL_CONFIGS[portal_key]
    print(f"\n{'='*60}")
    print(f"Testing: {config.name}")
    print(f"State: {config.state}")
    print(f"Platform: {config.platform}")
    print(f"URL: {config.base_url}")
    print(f"{'='*60}")

    # Get test queries for this state
    test_addresses = TEST_ADDRESSES.get(config.state, [])
    test_parcels_key = f"{config.state}_{portal_key.split('_')[1] if '_' in portal_key else ''}"
    test_parcels = TEST_PARCELS.get(test_parcels_key, [])

    if not test_addresses and not test_parcels:
        print(f"  [WARNING] No test queries configured for {config.state}")

    # Get or create scraper instance
    scraper = get_scraper_for_portal(portal_key)

    if scraper is None:
        # Return stub result for unimplemented scrapers
        return {
            "portal_key": portal_key,
            "portal_name": config.name,
            "state": config.state,
            "platform": config.platform,
            "status": "not_implemented",
            "test_queries": len(test_addresses) + len(test_parcels),
            "min_records_required": min_records,
            "records_found": 0,
            "test_passed": False,
            "timestamp": datetime.now().isoformat(),
        }

    # Run the actual test
    start_time = time.time()
    results = scraper.run_test(
        test_queries=test_addresses[:5],  # Use first 5 addresses
        search_method=SearchMethod.ADDRESS,
        min_records=min_records
    )
    elapsed = time.time() - start_time

    results["portal_key"] = portal_key
    results["elapsed_seconds"] = elapsed
    results["timestamp"] = datetime.now().isoformat()

    # Save results if requested
    if save_results:
        output_dir = os.path.join(OUTPUT_PATHS["test_samples"], portal_key)
        os.makedirs(output_dir, exist_ok=True)
        results_file = os.path.join(output_dir, "test_results.json")
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"  Results saved to: {results_file}")

    return results


def test_all_portals(
    state_filter: Optional[str] = None,
    platform_filter: Optional[str] = None,
    min_records: int = 15
) -> Dict[str, Any]:
    """
    Run tests against all configured portals.

    Args:
        state_filter: Only test portals for this state
        platform_filter: Only test portals on this platform
        min_records: Minimum records needed for pass

    Returns:
        Summary of all test results
    """
    print("\n" + "="*70)
    print("NATIONAL SEPTIC PERMIT SCRAPER - TEST SUITE")
    print("="*70)
    print(f"Started: {datetime.now().isoformat()}")
    print(f"Total portals configured: {len(PORTAL_CONFIGS)}")

    if state_filter:
        print(f"State filter: {state_filter}")
    if platform_filter:
        print(f"Platform filter: {platform_filter}")

    results_by_portal = {}
    passed = 0
    failed = 0
    not_implemented = 0

    for portal_key, config in PORTAL_CONFIGS.items():
        # Apply filters
        if state_filter and config.state != state_filter.upper():
            continue
        if platform_filter and config.platform != platform_filter.lower():
            continue

        result = test_portal(portal_key, min_records=min_records)
        results_by_portal[portal_key] = result

        # Count results
        if result.get("status") == "not_implemented":
            not_implemented += 1
            print(f"  [STUB] {config.name} - Not yet implemented")
        elif result.get("test_passed"):
            passed += 1
            print(f"  [PASS] {config.name} - {result.get('unique_records', 0)} records")
        else:
            failed += 1
            print(f"  [FAIL] {config.name} - {result.get('error_message', 'Unknown error')}")

    # Generate summary
    summary = {
        "test_run_timestamp": datetime.now().isoformat(),
        "total_portals": len(results_by_portal),
        "passed": passed,
        "failed": failed,
        "not_implemented": not_implemented,
        "min_records_required": min_records,
        "state_filter": state_filter,
        "platform_filter": platform_filter,
        "results": results_by_portal,
    }

    # Print summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    print(f"Total Portals Tested: {len(results_by_portal)}")
    print(f"  Passed: {passed}")
    print(f"  Failed: {failed}")
    print(f"  Not Implemented: {not_implemented}")
    print("="*70)

    # Save summary
    summary_file = os.path.join(OUTPUT_PATHS["test_samples"], "test_summary.json")
    os.makedirs(os.path.dirname(summary_file), exist_ok=True)
    with open(summary_file, 'w') as f:
        json.dump(summary, f, indent=2, default=str)
    print(f"\nSummary saved to: {summary_file}")

    return summary


def main():
    """Main entry point for the test runner."""
    parser = argparse.ArgumentParser(
        description="Test septic permit scrapers against live portals"
    )
    parser.add_argument(
        "--portal",
        type=str,
        help="Test a specific portal by key (e.g., 'florida_ebridge')"
    )
    parser.add_argument(
        "--state",
        type=str,
        help="Test all portals for a specific state (e.g., 'FL')"
    )
    parser.add_argument(
        "--platform",
        type=str,
        help="Test all portals on a specific platform (e.g., 'accela')"
    )
    parser.add_argument(
        "--min-records",
        type=int,
        default=15,
        help="Minimum records required for test to pass (default: 15)"
    )
    parser.add_argument(
        "--list-portals",
        action="store_true",
        help="List all configured portals and exit"
    )

    args = parser.parse_args()

    # List portals mode
    if args.list_portals:
        print("\nConfigured Portals:")
        print("-" * 60)
        for key, config in PORTAL_CONFIGS.items():
            print(f"  {key}")
            print(f"    Name: {config.name}")
            print(f"    State: {config.state}")
            print(f"    Platform: {config.platform}")
            print(f"    URL: {config.base_url}")
            print()
        return 0

    # Single portal test
    if args.portal:
        result = test_portal(args.portal, min_records=args.min_records)
        return 0 if result.get("test_passed") else 1

    # Run all tests with optional filters
    summary = test_all_portals(
        state_filter=args.state,
        platform_filter=args.platform,
        min_records=args.min_records
    )

    # Return non-zero if any tests failed
    return 0 if summary["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
