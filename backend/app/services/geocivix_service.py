"""
Geocivix Portal Integration Service.

Handles authentication and data extraction from Williamson County, TN
Geocivix permit portal (williamson.geocivix.com/secure/).
"""

import logging
import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from bs4 import BeautifulSoup
import httpx

logger = logging.getLogger(__name__)


class GeocivixService:
    """
    Service for interacting with Geocivix permit portal.

    Features:
    - Session-based authentication
    - Permit list extraction
    - Permit detail fetching
    - HTML parsing to structured data
    """

    BASE_URL = "https://williamson.geocivix.com/secure/"

    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password
        self.client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True
        )
        self.authenticated = False

    async def login(self) -> bool:
        """
        Authenticate with Geocivix portal.

        Authentication flow:
        1. POST to user.scheme with username
        2. POST to user.authenticate with username + password
        3. Session cookies are set automatically by httpx

        Returns:
            True if authentication successful, False otherwise
        """
        try:
            # Step 1: User scheme check
            logger.info(f"Geocivix: Checking user scheme for {self.username}")
            scheme_resp = await self.client.post(
                f"{self.BASE_URL}?action=user.scheme",
                data={
                    "username": self.username,
                    "rememberme": "false"
                }
            )
            logger.debug(f"Scheme response status: {scheme_resp.status_code}")

            # Step 2: Authenticate
            logger.info("Geocivix: Authenticating...")
            auth_resp = await self.client.post(
                f"{self.BASE_URL}?action=user.authenticate",
                data={
                    "username": self.username,
                    "password": self.password,
                    "rememberme": "false",
                    "token": ""
                }
            )

            # Parse JSON from response (it may have HTML wrapper)
            auth_text = auth_resp.text
            if '{"MESSAGE"' in auth_text:
                json_start = auth_text.find('{"MESSAGE"')
                json_end = auth_text.find('}', json_start) + 1
                json_str = auth_text[json_start:json_end]
                import json
                auth_data = json.loads(json_str)

                if auth_data.get("SUCCESS"):
                    self.authenticated = True
                    logger.info("Geocivix: Authentication successful")
                    return True
                else:
                    logger.error(f"Geocivix auth failed: {auth_data.get('MESSAGE')}")
                    return False
            else:
                # Check if we got redirected to home (success indicator)
                if "Home" in auth_text or auth_resp.status_code == 200:
                    self.authenticated = True
                    logger.info("Geocivix: Authentication successful (redirect)")
                    return True

                logger.error("Geocivix: Unexpected auth response format")
                return False

        except Exception as e:
            logger.exception(f"Geocivix login error: {e}")
            return False

    async def get_permit_list(self) -> List[Dict[str, Any]]:
        """
        Fetch and parse permit list from portal.

        Returns:
            List of permit dictionaries with structured data
        """
        if not self.authenticated:
            if not await self.login():
                raise Exception("Authentication failed")

        logger.info("Geocivix: Fetching permit list...")
        resp = await self.client.get(f"{self.BASE_URL}?action=permit.list")

        if resp.status_code != 200:
            logger.error(f"Permit list request failed: {resp.status_code}")
            raise Exception(f"Permit list request failed: {resp.status_code}")

        html = resp.text
        logger.info(f"Geocivix: Received {len(html)} bytes of permit data")

        permits = self._parse_permit_html(html)
        logger.info(f"Geocivix: Parsed {len(permits)} permits")

        return permits

    def _parse_permit_html(self, html: str) -> List[Dict[str, Any]]:
        """
        Parse HTML table into permit dictionaries.

        Args:
            html: Raw HTML from permit.list endpoint

        Returns:
            List of permit dictionaries
        """
        soup = BeautifulSoup(html, 'html.parser')
        permits = []

        table = soup.find('table')
        if not table:
            logger.warning("No permit table found in HTML")
            return []

        tbody = table.find('tbody')
        if not tbody:
            logger.warning("No tbody found in permit table")
            return []

        rows = tbody.find_all('tr')
        logger.debug(f"Found {len(rows)} table rows")

        for row in rows:
            cells = row.find_all('td')
            if len(cells) < 7:
                continue

            try:
                # Extract permit data from cells
                permit_link = cells[0].find('a')
                doc_link = cells[6].find('a')
                action_btn = row.find('button', {'data-issuanceid': True})

                # Get permit number and detail URL
                permit_number = permit_link.get_text(strip=True) if permit_link else ''
                detail_url = permit_link.get('href', '') if permit_link else ''

                # Get issuance ID (Geocivix's internal ID)
                issuance_id = action_btn.get('data-issuanceid') if action_btn else None
                if not issuance_id and detail_url:
                    # Try to extract from URL
                    match = re.search(r'issuanceid=(\d+)', detail_url)
                    if match:
                        issuance_id = match.group(1)

                permit = {
                    'permit_number': permit_number,
                    'detail_url': detail_url,
                    'permit_type': cells[1].get_text(strip=True),
                    'status': cells[2].get_text(strip=True),
                    'issue_date': self._parse_date(cells[3].get_text(strip=True)),
                    'issued_by': cells[4].get_text(strip=True) or None,
                    'expiration_date': self._parse_date(cells[5].get_text(strip=True)),
                    'document_url': doc_link.get('href', '') if doc_link else None,
                    'issuance_id': issuance_id,
                    'source': 'geocivix_williamson_tn'
                }

                # Extract document name if available
                if doc_link:
                    permit['document_name'] = doc_link.get_text(strip=True)

                permits.append(permit)

            except Exception as e:
                logger.warning(f"Failed to parse permit row: {e}")
                continue

        return permits

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """
        Parse date string from portal.

        Handles formats: M/D/YY, MM/DD/YY, MM/DD/YYYY, N/A

        Args:
            date_str: Date string from portal

        Returns:
            datetime object or None if invalid/N/A
        """
        if not date_str or date_str.lower() == 'n/a':
            return None

        # Try common date formats
        formats = ['%m/%d/%y', '%m/%d/%Y', '%Y-%m-%d']

        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue

        logger.debug(f"Could not parse date: {date_str}")
        return None

    async def get_permit_detail(self, issuance_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch detailed permit information.

        Args:
            issuance_id: Geocivix issuance ID

        Returns:
            Dictionary with full permit details or None
        """
        if not self.authenticated:
            if not await self.login():
                raise Exception("Authentication failed")

        url = f"{self.BASE_URL}permits/?issuanceid={issuance_id}"
        logger.debug(f"Fetching permit detail: {url}")

        resp = await self.client.get(url)

        if resp.status_code != 200:
            logger.error(f"Permit detail request failed: {resp.status_code}")
            return None

        return self._parse_permit_detail(resp.text, issuance_id)

    def _parse_permit_detail(self, html: str, issuance_id: str) -> Dict[str, Any]:
        """
        Parse permit detail page.

        Args:
            html: Raw HTML from permit detail page
            issuance_id: The permit's issuance ID

        Returns:
            Dictionary with detailed permit data
        """
        soup = BeautifulSoup(html, 'html.parser')

        detail = {
            'issuance_id': issuance_id,
            'raw_html': html[:50000]  # Store truncated for debugging
        }

        # Extract page title
        title = soup.find('title')
        if title:
            detail['page_title'] = title.get_text(strip=True)

        # Look for common detail patterns
        # (Geocivix uses various layouts, extract what we can find)

        # Try to find permit info sections
        for section in soup.find_all(['div', 'section'], class_=lambda x: x and 'permit' in x.lower() if x else False):
            # Extract text content from section
            text = section.get_text(separator=' ', strip=True)
            detail['section_text'] = text[:2000]
            break

        return detail

    async def close(self):
        """Close HTTP client and cleanup resources."""
        await self.client.aclose()
        logger.debug("Geocivix client closed")


# Factory function for dependency injection
def get_geocivix_service() -> GeocivixService:
    """
    Create GeocivixService instance with credentials from environment.

    Returns:
        Configured GeocivixService instance
    """
    import os

    username = os.getenv('GEOCIVIX_USERNAME', 'willwalterburns@gmail.com')
    password = os.getenv('GEOCIVIX_PASSWORD', '#Espn2025')

    return GeocivixService(username=username, password=password)
