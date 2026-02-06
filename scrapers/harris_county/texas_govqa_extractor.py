#!/usr/bin/env python3
"""
Texas GovQA Multi-County Extractor

Extracts FOIA request attachments and data from multiple Texas county GovQA portals.
Supports: Harris County, Bexar County, Hays County

Uses the GovQA-Py library for authenticated access.
"""

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from govqa import GovQA
    from govqa.base import UnauthenticatedError
    GOVQA_AVAILABLE = True
except ImportError:
    GOVQA_AVAILABLE = False
    print("Warning: GovQA library not installed. Run: pip install govqa")

import requests


# Texas GovQA portals to check
TEXAS_GOVQA_PORTALS = {
    "harris": {
        "name": "Harris County Engineering",
        "domain": "https://hctxeng.govqa.us",
        "tenant": "hctxeng",
        "department": "Office of County Engineer",
        "notes": "OSSF/Septic permits managed by OCE"
    },
    "bexar": {
        "name": "Bexar County",
        "domain": "https://bexarcountytx.govqa.us",
        "tenant": "bexarcountytx",
        "department": "General",
        "notes": "San Antonio area"
    },
    "bexar_county": {
        "name": "Bexar County (Alt)",
        "domain": "https://county-bexarcountytx.govqa.us",
        "tenant": "county-bexarcountytx",
        "department": "County Services",
        "notes": "Alternative portal"
    },
    "hays": {
        "name": "Hays County",
        "domain": "https://hayscountytx.govqa.us",
        "tenant": "hayscountytx",
        "department": "General",
        "notes": "Austin metro area"
    }
}


class TexasGovQAExtractor:
    """
    Extracts data from Texas county GovQA portals.
    """

    def __init__(
        self,
        username: str,
        password: str,
        output_dir: str = "scrapers/output"
    ):
        self.username = username
        self.password = password
        self.output_dir = Path(output_dir)
        self.results = {}

    def test_portal(self, portal_key: str) -> Dict[str, Any]:
        """
        Test if a GovQA portal is accessible and can be logged into.

        Returns dict with status and any requests found.
        """
        if portal_key not in TEXAS_GOVQA_PORTALS:
            return {"status": "error", "message": f"Unknown portal: {portal_key}"}

        portal = TEXAS_GOVQA_PORTALS[portal_key]
        result = {
            "portal": portal["name"],
            "domain": portal["domain"],
            "tenant": portal["tenant"],
            "status": "unknown",
            "requests": [],
            "error": None,
            "timestamp": datetime.now().isoformat()
        }

        print(f"\n{'='*60}")
        print(f"Testing: {portal['name']}")
        print(f"Domain: {portal['domain']}")
        print(f"{'='*60}")

        if not GOVQA_AVAILABLE:
            result["status"] = "error"
            result["error"] = "GovQA library not installed"
            return result

        try:
            # Initialize client
            print("  Initializing GovQA client...")
            client = GovQA(domain=portal["domain"])
            result["status"] = "client_initialized"

            # Try to login
            print(f"  Logging in as {self.username}...")
            client.login(self.username, self.password)
            result["status"] = "logged_in"
            print("  [OK] Login successful!")

            # List requests
            print("  Fetching requests...")
            requests_list = client.list_requests()
            result["requests"] = requests_list
            result["request_count"] = len(requests_list)
            result["status"] = "success"

            print(f"  [OK] Found {len(requests_list)} request(s)")

            # Get details for each request
            if requests_list:
                print("  Fetching request details...")
                detailed_requests = []
                for req in requests_list:
                    try:
                        details = client.get_request(req['id'])
                        detailed_requests.append({
                            "basic": req,
                            "details": details
                        })
                        print(f"    - Request {req.get('reference_number', req['id'])}: {req.get('status', 'unknown')}")
                    except Exception as e:
                        print(f"    - Request {req['id']}: Error getting details - {e}")
                        detailed_requests.append({
                            "basic": req,
                            "details": None,
                            "error": str(e)
                        })

                result["detailed_requests"] = detailed_requests

        except UnauthenticatedError:
            result["status"] = "auth_failed"
            result["error"] = "Invalid credentials or account not registered on this portal"
            print(f"  [FAIL] Authentication failed - account may not exist on this portal")

        except Exception as e:
            result["status"] = "error"
            result["error"] = str(e)
            print(f"  [FAIL] Error: {e}")

        return result

    def test_all_portals(self) -> Dict[str, Any]:
        """
        Test all configured Texas GovQA portals.
        """
        results = {
            "timestamp": datetime.now().isoformat(),
            "username": self.username,
            "portals": {}
        }

        for portal_key in TEXAS_GOVQA_PORTALS:
            results["portals"][portal_key] = self.test_portal(portal_key)
            time.sleep(2)  # Rate limit between portals

        # Save results
        output_file = self.output_dir / "govqa_portal_test_results.json"
        output_file.parent.mkdir(parents=True, exist_ok=True)

        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)

        print(f"\n{'='*60}")
        print("SUMMARY")
        print(f"{'='*60}")

        for portal_key, result in results["portals"].items():
            status_icon = "[OK]" if result["status"] == "success" else "[FAIL]"
            request_count = result.get("request_count", 0)
            print(f"  {status_icon} {result['portal']}: {result['status']} ({request_count} requests)")

        print(f"\nResults saved to: {output_file}")

        return results

    def download_attachments(self, portal_key: str, request_id: int) -> List[str]:
        """
        Download all attachments for a specific request.

        Returns list of downloaded file paths.
        """
        if portal_key not in TEXAS_GOVQA_PORTALS:
            raise ValueError(f"Unknown portal: {portal_key}")

        portal = TEXAS_GOVQA_PORTALS[portal_key]

        if not GOVQA_AVAILABLE:
            raise RuntimeError("GovQA library not installed")

        client = GovQA(domain=portal["domain"])
        client.login(self.username, self.password)

        # Get request details
        details = client.get_request(request_id)

        # Create output directory for this request
        request_dir = self.output_dir / portal["tenant"] / f"request_{request_id}"
        request_dir.mkdir(parents=True, exist_ok=True)

        downloaded = []

        # Download attachments if available
        if "attachments" in details:
            for i, attachment in enumerate(details["attachments"]):
                # Attachment structure varies - try common patterns
                if isinstance(attachment, dict):
                    filename = attachment.get("filename", f"attachment_{i}")
                    url = attachment.get("url")
                    if url:
                        # Download file
                        try:
                            response = client.session.get(url)
                            filepath = request_dir / filename
                            with open(filepath, 'wb') as f:
                                f.write(response.content)
                            downloaded.append(str(filepath))
                            print(f"  Downloaded: {filename}")
                        except Exception as e:
                            print(f"  Error downloading {filename}: {e}")

        # Save request details
        details_file = request_dir / "request_details.json"
        with open(details_file, 'w') as f:
            json.dump(details, f, indent=2, default=str)
        downloaded.append(str(details_file))

        return downloaded

    def extract_all_from_portal(self, portal_key: str) -> Dict[str, Any]:
        """
        Extract all requests and attachments from a portal.
        """
        result = self.test_portal(portal_key)

        if result["status"] != "success":
            return result

        portal = TEXAS_GOVQA_PORTALS[portal_key]

        # Download attachments for each request
        for req in result.get("requests", []):
            print(f"\nDownloading attachments for request {req['id']}...")
            try:
                files = self.download_attachments(portal_key, req["id"])
                print(f"  Downloaded {len(files)} files")
            except Exception as e:
                print(f"  Error: {e}")

        return result


def direct_portal_check(domain: str) -> Dict[str, Any]:
    """
    Check if a GovQA portal exists using direct HTTP request.
    """
    result = {
        "domain": domain,
        "accessible": False,
        "status_code": None,
        "error": None
    }

    try:
        # Try to access the support home page
        url = f"{domain}/WEBAPP/_rs/supporthome.aspx"
        response = requests.get(url, timeout=10, allow_redirects=True)
        result["status_code"] = response.status_code
        result["accessible"] = response.status_code == 200
        result["final_url"] = response.url

        # Check if it's actually a GovQA portal
        if "GovQA" in response.text or "govqa" in response.text.lower():
            result["is_govqa"] = True
        else:
            result["is_govqa"] = False

    except Exception as e:
        result["error"] = str(e)

    return result


def main():
    """Main entry point."""
    print("="*60)
    print("Texas GovQA Multi-County Extractor")
    print("="*60)

    # Credentials from user
    username = "willwalterburns@gmail.com"
    password = "#Espn2025"

    # First, check which portals are accessible via HTTP
    print("\n--- Phase 1: Portal Accessibility Check ---\n")

    for portal_key, portal in TEXAS_GOVQA_PORTALS.items():
        check = direct_portal_check(portal["domain"])
        status = "[OK]" if check["accessible"] else "[FAIL]"
        print(f"  {status} {portal['name']}: {portal['domain']}")
        if check.get("error"):
            print(f"      Error: {check['error']}")

    # Now test with authentication
    print("\n--- Phase 2: Authentication & Data Extraction ---\n")

    extractor = TexasGovQAExtractor(
        username=username,
        password=password,
        output_dir="scrapers/output"
    )

    results = extractor.test_all_portals()

    # Summary of what was found
    print("\n--- Phase 3: Summary ---\n")

    total_requests = 0
    for portal_key, result in results["portals"].items():
        if result["status"] == "success":
            count = result.get("request_count", 0)
            total_requests += count
            if count > 0:
                print(f"\n{result['portal']}:")
                for req in result.get("detailed_requests", []):
                    basic = req.get("basic", {})
                    print(f"  - {basic.get('reference_number', 'N/A')}: {basic.get('status', 'unknown')}")

    print(f"\nTotal requests found across all portals: {total_requests}")

    return results


if __name__ == "__main__":
    main()
