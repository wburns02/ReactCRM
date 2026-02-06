#!/usr/bin/env python3
"""
GovQA-Py Library Test Script

Tests the GovQA-Py library across multiple jurisdictions to validate:
1. Library can connect to different GovQA portals
2. Account creation form retrieval works
3. Form schemas are parseable
4. CAPTCHA detection works

Usage:
    python test_govqa_library.py
"""

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

# Test if govqa is installed
try:
    from govqa import GovQA
    print("GovQA-Py library imported successfully!")
except ImportError as e:
    print(f"ERROR: Failed to import govqa: {e}")
    print("Run: pip install govqa")
    sys.exit(1)


# Test jurisdictions - mix of cities, counties, and state agencies
TEST_JURISDICTIONS = [
    {
        "name": "Chicago, IL",
        "tenant": "chicagoil",
        "domain": "https://chicagoil.govqa.us",
        "type": "city"
    },
    {
        "name": "Pierce County, WA",
        "tenant": "piercecountywa",
        "domain": "https://piercecountywa.govqa.us",
        "type": "county"
    },
    {
        "name": "California CDCR",
        "tenant": "californiacdcr",
        "domain": "https://californiacdcr.govqa.us",
        "type": "state_agency"
    },
    {
        "name": "City of Phoenix, AZ",
        "tenant": "cityofphoenixaz",
        "domain": "https://cityofphoenixaz.govqa.us",
        "type": "city"
    },
    {
        "name": "Texas Workforce Commission",
        "tenant": "twc",
        "domain": "https://twc.govqa.us",
        "type": "state_agency"
    }
]


def test_jurisdiction(jurisdiction: dict) -> dict:
    """
    Test GovQA-Py library against a single jurisdiction.

    Returns a dict with test results.
    """
    results = {
        "jurisdiction": jurisdiction["name"],
        "tenant": jurisdiction["tenant"],
        "domain": jurisdiction["domain"],
        "type": jurisdiction["type"],
        "timestamp": datetime.now().isoformat(),
        "tests": {},
        "errors": []
    }

    print(f"\n{'='*60}")
    print(f"Testing: {jurisdiction['name']}")
    print(f"Domain: {jurisdiction['domain']}")
    print(f"{'='*60}")

    try:
        # Test 1: Client initialization
        print("\n[Test 1] Creating GovQA client...")
        client = GovQA(domain=jurisdiction["domain"])
        results["tests"]["client_init"] = True
        print("  SUCCESS: Client created")

    except Exception as e:
        results["tests"]["client_init"] = False
        results["errors"].append(f"Client init failed: {str(e)}")
        print(f"  FAILED: {e}")
        return results

    # Test 2: New account form retrieval
    try:
        print("\n[Test 2] Fetching new account form...")
        account_form = client.new_account_form()
        results["tests"]["account_form_fetch"] = True
        print("  SUCCESS: Account form retrieved")

        # Test 2a: Check schema
        if hasattr(account_form, 'schema') and account_form.schema:
            results["tests"]["account_form_schema"] = True
            results["account_form_schema"] = account_form.schema
            print(f"  Schema fields: {list(account_form.schema.get('properties', {}).keys()) if isinstance(account_form.schema, dict) else 'N/A'}")
        else:
            results["tests"]["account_form_schema"] = False
            print("  WARNING: No schema found")

        # Test 2b: Check CAPTCHA
        if hasattr(account_form, 'captcha'):
            has_captcha = account_form.captcha is not None
            results["tests"]["account_form_captcha_check"] = True
            results["has_captcha"] = has_captcha
            print(f"  CAPTCHA required: {has_captcha}")

            if has_captcha:
                # Check captcha format
                captcha_type = type(account_form.captcha).__name__
                print(f"  CAPTCHA type: {captcha_type}")
        else:
            results["tests"]["account_form_captcha_check"] = False
            print("  WARNING: No captcha attribute found")

    except Exception as e:
        results["tests"]["account_form_fetch"] = False
        results["errors"].append(f"Account form fetch failed: {str(e)}")
        print(f"  FAILED: {e}")

    # Test 3: Request form retrieval (public records request)
    try:
        print("\n[Test 3] Fetching public records request form...")
        request_form = client.request_form(request_type=1)
        results["tests"]["request_form_fetch"] = True
        print("  SUCCESS: Request form retrieved")

        # Check schema
        if hasattr(request_form, 'schema') and request_form.schema:
            results["tests"]["request_form_schema"] = True
            results["request_form_schema"] = request_form.schema
            schema_props = request_form.schema.get('properties', {}) if isinstance(request_form.schema, dict) else {}
            print(f"  Schema fields: {list(schema_props.keys())[:10]}...")  # First 10 fields
        else:
            results["tests"]["request_form_schema"] = False
            print("  WARNING: No schema found")

    except Exception as e:
        results["tests"]["request_form_fetch"] = False
        results["errors"].append(f"Request form fetch failed: {str(e)}")
        print(f"  FAILED: {e}")

    # Calculate success rate
    passed = sum(1 for v in results["tests"].values() if v)
    total = len(results["tests"])
    results["success_rate"] = f"{passed}/{total}"
    print(f"\n  Result: {passed}/{total} tests passed")

    return results


def run_all_tests() -> list:
    """Run tests against all jurisdictions."""
    all_results = []

    print("\n" + "="*70)
    print("GovQA-Py Library Test Suite")
    print(f"Testing {len(TEST_JURISDICTIONS)} jurisdictions")
    print("="*70)

    for jurisdiction in TEST_JURISDICTIONS:
        try:
            result = test_jurisdiction(jurisdiction)
            all_results.append(result)
        except Exception as e:
            print(f"\n  CRITICAL ERROR testing {jurisdiction['name']}: {e}")
            all_results.append({
                "jurisdiction": jurisdiction["name"],
                "tenant": jurisdiction["tenant"],
                "error": str(e),
                "tests": {}
            })

    return all_results


def print_summary(results: list):
    """Print a summary of all test results."""
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)

    for result in results:
        name = result.get("jurisdiction", "Unknown")
        success_rate = result.get("success_rate", "N/A")
        errors = result.get("errors", [])
        has_captcha = result.get("has_captcha", "Unknown")

        status = "PASS" if not errors else "PARTIAL" if "client_init" in result.get("tests", {}) else "FAIL"
        print(f"\n{name}:")
        print(f"  Status: {status}")
        print(f"  Tests: {success_rate}")
        print(f"  CAPTCHA: {has_captcha}")
        if errors:
            print(f"  Errors: {len(errors)}")
            for err in errors[:3]:  # Show first 3 errors
                print(f"    - {err[:80]}...")


def save_results(results: list, output_dir: Path):
    """Save test results to JSON file."""
    output_file = output_dir / f"govqa_library_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

    # Clean up non-serializable items
    clean_results = []
    for r in results:
        clean = {k: v for k, v in r.items() if k not in ['account_form_schema', 'request_form_schema']}
        # Store schemas separately if they exist
        if 'account_form_schema' in r:
            try:
                clean['account_form_schema'] = json.loads(json.dumps(r['account_form_schema'], default=str))
            except:
                clean['account_form_schema'] = str(r['account_form_schema'])
        if 'request_form_schema' in r:
            try:
                clean['request_form_schema'] = json.loads(json.dumps(r['request_form_schema'], default=str))
            except:
                clean['request_form_schema'] = str(r['request_form_schema'])
        clean_results.append(clean)

    with open(output_file, 'w') as f:
        json.dump(clean_results, f, indent=2, default=str)

    print(f"\nResults saved to: {output_file}")
    return output_file


def main():
    """Main entry point."""
    output_dir = Path(__file__).parent.parent / "output" / "govqa"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Run all tests
    results = run_all_tests()

    # Print summary
    print_summary(results)

    # Save results
    save_results(results, output_dir)

    # Final verdict
    total_jurisdictions = len(results)
    working = sum(1 for r in results if r.get("tests", {}).get("client_init", False))

    print("\n" + "="*70)
    print("FINAL VERDICT")
    print("="*70)
    print(f"\nGovQA-Py library works with {working}/{total_jurisdictions} tested jurisdictions")

    if working == total_jurisdictions:
        print("\n SUCCESS: Library is fully functional!")
        return 0
    elif working > 0:
        print("\n PARTIAL: Library works but some jurisdictions failed")
        return 0
    else:
        print("\n FAILURE: Library does not work with any tested jurisdiction")
        return 1


if __name__ == "__main__":
    sys.exit(main())
