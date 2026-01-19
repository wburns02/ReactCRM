"""
Florida eBridge OSTDS (Onsite Sewage Treatment and Disposal Systems) Scraper

Portal: https://s1.ebridge-solutions.com/ebridge/3.0/default.aspx
Coverage: County-by-county OSTDS permits (varies by county)
Search Methods: Permit #, Address, Facility Name, Document Type, Date
Authentication: Public login (county-specific credentials)

Florida uses the eBridge document management system across most counties
for OSTDS (septic) permit records. Each county has its own "file cabinet"
with public access credentials.
"""

import re
import time
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from dataclasses import dataclass

import requests
from bs4 import BeautifulSoup

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from base_scraper import (
    BaseScraper,
    SepticRecord,
    ScraperResult,
    ScraperStatus,
    SearchMethod,
)

logger = logging.getLogger(__name__)


@dataclass
class EBridgeCountyConfig:
    """Configuration for accessing a specific county's eBridge system."""
    county_name: str
    file_cabinet: str
    username: str
    password: str


# Known eBridge county configurations with public access
FLORIDA_EBRIDGE_COUNTIES: Dict[str, EBridgeCountyConfig] = {
    "hillsborough": EBridgeCountyConfig(
        county_name="Hillsborough",
        file_cabinet="HCHD",
        username="public",
        password="publicuser"
    ),
    "martin": EBridgeCountyConfig(
        county_name="Martin",
        file_cabinet="Martin County",
        username="Public",
        password="public"
    ),
    "okeechobee": EBridgeCountyConfig(
        county_name="Okeechobee",
        file_cabinet="okeechobeechd",
        username="public",
        password="password"
    ),
    "osceola": EBridgeCountyConfig(
        county_name="Osceola",
        file_cabinet="OSCEOLACHD",
        username="public",
        password="oscguest"
    ),
    "charlotte": EBridgeCountyConfig(
        county_name="Charlotte",
        file_cabinet="CHARLOTTECHD",
        username="public",
        password="public"
    ),
    "lee": EBridgeCountyConfig(
        county_name="Lee",
        file_cabinet="LEECHD",
        username="public",
        password="public"
    ),
    "hernando": EBridgeCountyConfig(
        county_name="Hernando",
        file_cabinet="HERNANDOCHD",
        username="public",
        password="public"
    ),
    "brevard": EBridgeCountyConfig(
        county_name="Brevard",
        file_cabinet="BREVARDCHD",
        username="public",
        password="public"
    ),
    "volusia": EBridgeCountyConfig(
        county_name="Volusia",
        file_cabinet="VOLUSIACHD",
        username="public",
        password="public"
    ),
    "seminole": EBridgeCountyConfig(
        county_name="Seminole",
        file_cabinet="SEMINOLECHD",
        username="public",
        password="public"
    ),
    "orange": EBridgeCountyConfig(
        county_name="Orange",
        file_cabinet="ORANGECHD",
        username="public",
        password="public"
    ),
    "polk": EBridgeCountyConfig(
        county_name="Polk",
        file_cabinet="POLKCHD",
        username="public",
        password="public"
    ),
    "pasco": EBridgeCountyConfig(
        county_name="Pasco",
        file_cabinet="PASCOCHD",
        username="public",
        password="public"
    ),
    "pinellas": EBridgeCountyConfig(
        county_name="Pinellas",
        file_cabinet="PINELLASCHD",
        username="public",
        password="public"
    ),
    "sarasota": EBridgeCountyConfig(
        county_name="Sarasota",
        file_cabinet="SARASOTACHD",
        username="public",
        password="public"
    ),
    "manatee": EBridgeCountyConfig(
        county_name="Manatee",
        file_cabinet="MANATEECHD",
        username="public",
        password="public"
    ),
    "collier": EBridgeCountyConfig(
        county_name="Collier",
        file_cabinet="COLLIERCHD",
        username="public",
        password="public"
    ),
    "palm_beach": EBridgeCountyConfig(
        county_name="Palm Beach",
        file_cabinet="PBCHD",
        username="public",
        password="public"
    ),
    "broward": EBridgeCountyConfig(
        county_name="Broward",
        file_cabinet="BROWARDCHD",
        username="public",
        password="public"
    ),
    "miami_dade": EBridgeCountyConfig(
        county_name="Miami-Dade",
        file_cabinet="MDCHD",
        username="public",
        password="public"
    ),
}


class FloridaEBridgeScraper(BaseScraper):
    """
    Scraper for Florida eBridge OSTDS (septic) permit database.

    eBridge is used by most Florida counties to store and provide public
    access to OSTDS permits and related documents. Each county has its
    own file cabinet with specific login credentials.
    """

    # eBridge base URL
    EBRIDGE_BASE_URL = "https://s1.ebridge-solutions.com/ebridge/3.0"

    def __init__(self, county: str = "hillsborough", **kwargs):
        """
        Initialize the Florida eBridge scraper.

        Args:
            county: County name key (lowercase, e.g., "hillsborough", "martin")
            **kwargs: Additional arguments passed to BaseScraper
        """
        county_key = county.lower().replace(" ", "_").replace("-", "_")

        if county_key not in FLORIDA_EBRIDGE_COUNTIES:
            available = ", ".join(FLORIDA_EBRIDGE_COUNTIES.keys())
            raise ValueError(f"Unknown county '{county}'. Available: {available}")

        self.county_config = FLORIDA_EBRIDGE_COUNTIES[county_key]

        super().__init__(
            portal_name=f"Florida eBridge - {self.county_config.county_name}",
            state="FL",
            use_playwright=False,
            **kwargs
        )

        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        self._logged_in = False

    @property
    def base_url(self) -> str:
        return f"{self.EBRIDGE_BASE_URL}/default.aspx"

    @property
    def supported_search_methods(self) -> List[SearchMethod]:
        return [
            SearchMethod.ADDRESS,
            SearchMethod.PERMIT_NUMBER,
            SearchMethod.OWNER_NAME,
        ]

    def _login(self) -> bool:
        """
        Login to eBridge with county-specific public credentials.

        Returns:
            True if login successful, False otherwise
        """
        if self._logged_in:
            return True

        try:
            # Get the login page
            login_url = self.base_url
            response = self.session.get(login_url, timeout=self.timeout)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')

            # Extract ASP.NET form fields
            viewstate = soup.find('input', {'name': '__VIEWSTATE'})
            viewstate_val = viewstate['value'] if viewstate else ""

            validation = soup.find('input', {'name': '__EVENTVALIDATION'})
            validation_val = validation['value'] if validation else ""

            viewstate_gen = soup.find('input', {'name': '__VIEWSTATEGENERATOR'})
            viewstate_gen_val = viewstate_gen['value'] if viewstate_gen else ""

            # Build login form data
            form_data = {
                '__VIEWSTATE': viewstate_val,
                '__EVENTVALIDATION': validation_val,
                '__VIEWSTATEGENERATOR': viewstate_gen_val,
                'txtUserName': self.county_config.username,
                'txtPassword': self.county_config.password,
                'ddlFileCabinets': self.county_config.file_cabinet,
                'btnLogin': 'Login',
            }

            # Submit login
            self._delay()
            response = self.session.post(
                login_url,
                data=form_data,
                timeout=self.timeout
            )
            response.raise_for_status()

            # Check for successful login (look for search interface)
            if 'search' in response.text.lower() or 'logout' in response.text.lower():
                self._logged_in = True
                logger.info(f"Successfully logged into eBridge for {self.county_config.county_name}")
                return True
            else:
                logger.warning(f"Login may have failed for {self.county_config.county_name}")
                return False

        except Exception as e:
            logger.error(f"Login failed: {e}")
            return False

    def search_by_address(self, address: str) -> ScraperResult:
        """
        Search Florida eBridge permits by address.

        Args:
            address: Street address to search

        Returns:
            ScraperResult with found records
        """
        start_time = time.time()

        try:
            if not self._login():
                return ScraperResult(
                    status=ScraperStatus.LOGIN_REQUIRED,
                    query=address,
                    search_method=SearchMethod.ADDRESS,
                    portal_name=self.portal_name,
                    error_message="Failed to login to eBridge"
                )

            records = self._do_search(address=address)
            elapsed = time.time() - start_time

            return ScraperResult(
                status=ScraperStatus.SUCCESS if records else ScraperStatus.NO_RESULTS,
                records=records,
                query=address,
                search_method=SearchMethod.ADDRESS,
                portal_name=self.portal_name,
                execution_time_seconds=elapsed,
            )

        except Exception as e:
            logger.error(f"Search failed for address '{address}': {e}")
            return ScraperResult(
                status=ScraperStatus.FAILED,
                query=address,
                search_method=SearchMethod.ADDRESS,
                portal_name=self.portal_name,
                error_message=str(e),
            )

    def search_by_parcel(self, parcel: str) -> ScraperResult:
        """Florida eBridge typically doesn't support parcel search."""
        return ScraperResult(
            status=ScraperStatus.FAILED,
            query=parcel,
            search_method=SearchMethod.PARCEL,
            portal_name=self.portal_name,
            error_message="Parcel search not supported by eBridge"
        )

    def search_by_permit_number(self, permit_number: str) -> ScraperResult:
        """
        Search by permit number.

        Args:
            permit_number: OSTDS permit number

        Returns:
            ScraperResult with found records
        """
        start_time = time.time()

        try:
            if not self._login():
                return ScraperResult(
                    status=ScraperStatus.LOGIN_REQUIRED,
                    query=permit_number,
                    search_method=SearchMethod.PERMIT_NUMBER,
                    portal_name=self.portal_name,
                    error_message="Failed to login to eBridge"
                )

            records = self._do_search(permit=permit_number)
            elapsed = time.time() - start_time

            return ScraperResult(
                status=ScraperStatus.SUCCESS if records else ScraperStatus.NO_RESULTS,
                records=records,
                query=permit_number,
                search_method=SearchMethod.PERMIT_NUMBER,
                portal_name=self.portal_name,
                execution_time_seconds=elapsed,
            )

        except Exception as e:
            logger.error(f"Search failed for permit '{permit_number}': {e}")
            return ScraperResult(
                status=ScraperStatus.FAILED,
                query=permit_number,
                search_method=SearchMethod.PERMIT_NUMBER,
                portal_name=self.portal_name,
                error_message=str(e),
            )

    def search_by_owner(self, owner_name: str) -> ScraperResult:
        """
        Search by facility/owner name.

        Args:
            owner_name: Owner or facility name

        Returns:
            ScraperResult with found records
        """
        start_time = time.time()

        try:
            if not self._login():
                return ScraperResult(
                    status=ScraperStatus.LOGIN_REQUIRED,
                    query=owner_name,
                    search_method=SearchMethod.OWNER_NAME,
                    portal_name=self.portal_name,
                    error_message="Failed to login to eBridge"
                )

            records = self._do_search(facility_name=owner_name)
            elapsed = time.time() - start_time

            return ScraperResult(
                status=ScraperStatus.SUCCESS if records else ScraperStatus.NO_RESULTS,
                records=records,
                query=owner_name,
                search_method=SearchMethod.OWNER_NAME,
                portal_name=self.portal_name,
                execution_time_seconds=elapsed,
            )

        except Exception as e:
            logger.error(f"Search failed for owner '{owner_name}': {e}")
            return ScraperResult(
                status=ScraperStatus.FAILED,
                query=owner_name,
                search_method=SearchMethod.OWNER_NAME,
                portal_name=self.portal_name,
                error_message=str(e),
            )

    def _do_search(
        self,
        permit: str = "",
        facility_name: str = "",
        address: str = "",
        zipcode: str = "",
        program: str = "Septic",
    ) -> List[SepticRecord]:
        """
        Execute search against eBridge.

        eBridge supports searching by:
        - Program (Septic, Well)
        - Permit number
        - Facility name
        - Address
        - Zipcode
        - Document date
        - Document type

        Args:
            permit: Permit number
            facility_name: Facility/owner name
            address: Street address
            zipcode: ZIP code
            program: Program type (Septic or Well)

        Returns:
            List of SepticRecord objects
        """
        search_url = f"{self.EBRIDGE_BASE_URL}/Search.aspx"

        try:
            # Get search page
            response = self.session.get(search_url, timeout=self.timeout)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')

            # Extract ASP.NET form fields
            viewstate = soup.find('input', {'name': '__VIEWSTATE'})
            viewstate_val = viewstate['value'] if viewstate else ""

            validation = soup.find('input', {'name': '__EVENTVALIDATION'})
            validation_val = validation['value'] if validation else ""

            # Build search form
            form_data = {
                '__VIEWSTATE': viewstate_val,
                '__EVENTVALIDATION': validation_val,
                'ddlProgram': program,
                'txtPermit': permit,
                'txtFacilityName': facility_name,
                'txtAddress': address,
                'txtZipcode': zipcode,
                'btnSearch': 'Search',
            }

            # Submit search
            self._delay()
            response = self.session.post(
                search_url,
                data=form_data,
                timeout=self.timeout
            )
            response.raise_for_status()

            return self._parse_results(response.text)

        except Exception as e:
            logger.error(f"Search failed: {e}")
            raise

    def _parse_results(self, html: str) -> List[SepticRecord]:
        """
        Parse eBridge search results.

        Args:
            html: Response HTML

        Returns:
            List of SepticRecord objects
        """
        records = []
        soup = BeautifulSoup(html, 'html.parser')

        # Look for results table/grid
        results_table = soup.find('table', {'id': re.compile(r'.*gvResults.*', re.I)})
        if not results_table:
            results_table = soup.find('table', class_=re.compile(r'.*grid.*', re.I))

        if not results_table:
            # Try finding any table with permit-like data
            tables = soup.find_all('table')
            for table in tables:
                if 'permit' in table.get_text().lower():
                    results_table = table
                    break

        if not results_table:
            logger.debug("No results table found")
            return records

        # Parse rows (skip header)
        rows = results_table.find_all('tr')[1:]

        for row in rows:
            cells = row.find_all('td')
            if len(cells) < 3:
                continue

            try:
                # eBridge typical columns: Document, Permit#, Facility, Address, Date
                # Column order may vary by county configuration
                raw_data = {}

                for i, cell in enumerate(cells):
                    text = cell.get_text(strip=True)
                    raw_data[f'col_{i}'] = text

                # Try to identify key fields from cell contents
                permit_num = ""
                address = ""
                facility = ""
                doc_date = None
                pdf_link = None

                for i, cell in enumerate(cells):
                    text = cell.get_text(strip=True)

                    # Look for permit number pattern
                    if re.match(r'^[A-Z]{2,3}-?\d{2,}-\d+', text) or \
                       re.match(r'^\d{4,}-\d+', text):
                        permit_num = text

                    # Look for address (contains numbers and common street terms)
                    elif re.search(r'\d+.*(?:st|street|rd|road|ave|avenue|dr|drive|ln|lane|ct|court|blvd|way|pl)', text, re.I):
                        address = text

                    # Look for date pattern
                    elif re.match(r'\d{1,2}/\d{1,2}/\d{2,4}', text):
                        try:
                            doc_date = datetime.strptime(text, '%m/%d/%Y')
                        except:
                            try:
                                doc_date = datetime.strptime(text, '%m/%d/%y')
                            except:
                                pass

                    # Look for PDF link
                    link = cell.find('a', href=True)
                    if link and '.pdf' in link['href'].lower():
                        href = link['href']
                        if not href.startswith('http'):
                            href = f"{self.EBRIDGE_BASE_URL}/{href.lstrip('/')}"
                        pdf_link = href

                # Use first cell as permit number if not found
                if not permit_num and cells:
                    permit_num = cells[0].get_text(strip=True)

                # Use second or third cell as facility/address if not found
                if not facility and len(cells) > 1:
                    facility = cells[1].get_text(strip=True)
                if not address and len(cells) > 2:
                    address = cells[2].get_text(strip=True)

                if permit_num:
                    record = SepticRecord(
                        permit_number=permit_num,
                        state="FL",
                        county=self.county_config.county_name,
                        address=address if address else None,
                        owner_name=facility if facility else None,
                        permit_date=doc_date,
                        pdf_url=pdf_link,
                        source_portal=self.portal_name,
                        raw_data=raw_data,
                    )
                    records.append(record)

            except Exception as e:
                logger.warning(f"Failed to parse row: {e}")
                continue

        logger.info(f"Parsed {len(records)} records from {self.portal_name}")
        return records

    def get_all_counties(self) -> List[str]:
        """Get list of all configured Florida counties."""
        return list(FLORIDA_EBRIDGE_COUNTIES.keys())


def create_scraper_for_county(county: str) -> FloridaEBridgeScraper:
    """
    Factory function to create a scraper for a specific Florida county.

    Args:
        county: County name (case-insensitive)

    Returns:
        Configured FloridaEBridgeScraper instance
    """
    return FloridaEBridgeScraper(county=county)


# For direct testing
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    # Test with Hillsborough county
    scraper = FloridaEBridgeScraper(county="hillsborough")
    print(f"Testing {scraper.portal_name}")
    print(f"Base URL: {scraper.base_url}")
    print(f"Supported methods: {scraper.supported_search_methods}")
    print(f"Available counties: {scraper.get_all_counties()}")

    # Test search
    print("\nTesting address search...")
    result = scraper.search_by_address("Main")
    print(f"Search result: {result.status}")
    print(f"Records found: {result.record_count}")

    if result.records:
        print("\nSample record:")
        print(result.records[0].to_json())
