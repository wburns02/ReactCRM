"""
Vermont DEC Wastewater Permit Scraper

Portal: https://anrweb.vt.gov/DEC/WWDocs/Default.aspx
Coverage: Statewide permits since September 18, 1969
Search Methods: Permit #, Town, Owner/Applicant, Street/Road
"""

import re
import time
import logging
from typing import List, Optional
from datetime import datetime

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


class VermontDECScraper(BaseScraper):
    """
    Scraper for Vermont DEC Wastewater Permit Database.

    The Vermont DEC maintains a searchable database of wastewater and
    potable water supply permits going back to September 1969.
    """

    def __init__(self, **kwargs):
        super().__init__(
            portal_name="Vermont DEC Wastewater",
            state="VT",
            use_playwright=False,
            **kwargs
        )
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

    @property
    def base_url(self) -> str:
        return "https://anrweb.vt.gov/DEC/WWDocs/Default.aspx"

    @property
    def supported_search_methods(self) -> List[SearchMethod]:
        return [
            SearchMethod.ADDRESS,
            SearchMethod.OWNER_NAME,
            SearchMethod.PERMIT_NUMBER,
        ]

    def search_by_address(self, address: str) -> ScraperResult:
        """
        Search Vermont permits by street address.

        Args:
            address: Street name or partial address

        Returns:
            ScraperResult with found records
        """
        start_time = time.time()

        try:
            records = self._do_search(street=address)
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
        """Vermont DEC does not support parcel search."""
        return ScraperResult(
            status=ScraperStatus.FAILED,
            query=parcel,
            search_method=SearchMethod.PARCEL,
            portal_name=self.portal_name,
            error_message="Parcel search not supported by Vermont DEC portal",
        )

    def search_by_permit_number(self, permit_number: str) -> ScraperResult:
        """
        Search by Vermont permit number.

        Args:
            permit_number: VT permit number

        Returns:
            ScraperResult with found records
        """
        start_time = time.time()

        try:
            records = self._do_search(permit_number=permit_number)
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
        Search by property owner name.

        Args:
            owner_name: Owner or applicant name

        Returns:
            ScraperResult with found records
        """
        start_time = time.time()

        try:
            records = self._do_search(owner=owner_name)
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
        permit_number: str = "",
        town: str = "",
        owner: str = "",
        street: str = "",
    ) -> List[SepticRecord]:
        """
        Execute search against Vermont DEC database.

        Args:
            permit_number: Optional permit number
            town: Optional town name
            owner: Optional owner/applicant name
            street: Optional street/road name

        Returns:
            List of SepticRecord objects
        """
        # First, get the page to obtain ASP.NET viewstate
        response = self.session.get(self.base_url, timeout=self.timeout)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Extract ASP.NET form fields
        viewstate = soup.find('input', {'name': '__VIEWSTATE'})
        viewstate_val = viewstate['value'] if viewstate else ""

        validation = soup.find('input', {'name': '__EVENTVALIDATION'})
        validation_val = validation['value'] if validation else ""

        viewstate_gen = soup.find('input', {'name': '__VIEWSTATEGENERATOR'})
        viewstate_gen_val = viewstate_gen['value'] if viewstate_gen else ""

        # Build form data
        form_data = {
            '__VIEWSTATE': viewstate_val,
            '__EVENTVALIDATION': validation_val,
            '__VIEWSTATEGENERATOR': viewstate_gen_val,
            'ctl00$MainContent$txtPermitNo': permit_number,
            'ctl00$MainContent$txtTown': town,
            'ctl00$MainContent$txtLandOwner': owner,
            'ctl00$MainContent$txtStreet': street,
            'ctl00$MainContent$btnSearch': 'Search',
        }

        # Submit search
        self._delay()
        response = self.session.post(
            self.base_url,
            data=form_data,
            timeout=self.timeout
        )
        response.raise_for_status()

        # Parse results
        return self._parse_results(response.text)

    def _parse_results(self, html: str) -> List[SepticRecord]:
        """
        Parse search results HTML into SepticRecord objects.

        Args:
            html: Response HTML

        Returns:
            List of SepticRecord objects
        """
        records = []
        soup = BeautifulSoup(html, 'html.parser')

        # Look for results table
        results_table = soup.find('table', {'id': 'MainContent_gvResults'})
        if not results_table:
            results_table = soup.find('table', class_='GridView')

        if not results_table:
            logger.debug("No results table found")
            return records

        # Skip header row
        rows = results_table.find_all('tr')[1:]

        for row in rows:
            cells = row.find_all('td')
            if len(cells) < 4:
                continue

            try:
                # Extract fields based on table structure
                # Typical columns: Permit#, Town, Owner, Street, Documents
                permit_num = cells[0].get_text(strip=True)
                town = cells[1].get_text(strip=True) if len(cells) > 1 else ""
                owner = cells[2].get_text(strip=True) if len(cells) > 2 else ""
                street = cells[3].get_text(strip=True) if len(cells) > 3 else ""

                # Look for PDF link
                pdf_link = None
                doc_cell = cells[-1] if cells else None
                if doc_cell:
                    link = doc_cell.find('a', href=True)
                    if link and '.pdf' in link['href'].lower():
                        pdf_link = link['href']
                        if not pdf_link.startswith('http'):
                            pdf_link = f"https://anrweb.vt.gov{pdf_link}"

                record = SepticRecord(
                    permit_number=permit_num,
                    state="VT",
                    address=street,
                    city=town,
                    county=None,  # Town name used instead
                    owner_name=owner,
                    pdf_url=pdf_link,
                    source_portal=self.portal_name,
                    raw_data={
                        'town': town,
                        'owner': owner,
                        'street': street,
                    }
                )
                records.append(record)

            except Exception as e:
                logger.warning(f"Failed to parse row: {e}")
                continue

        logger.info(f"Parsed {len(records)} records from Vermont DEC")
        return records


# For direct testing
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    scraper = VermontDECScraper()
    print(f"Testing {scraper.portal_name}")
    print(f"Base URL: {scraper.base_url}")
    print(f"Supported methods: {scraper.supported_search_methods}")

    # Test search
    result = scraper.search_by_address("Main")
    print(f"\nSearch result: {result.status}")
    print(f"Records found: {result.record_count}")

    if result.records:
        print("\nSample record:")
        print(result.records[0].to_json())
