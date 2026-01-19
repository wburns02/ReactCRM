"""
New Hampshire DES OneStop SSB (Subsurface Systems Bureau) Scraper

Portal: https://www4.des.state.nh.us/DESOnestop/BasicSearch.aspx
Alt: https://www4.des.state.nh.us/SSBOneStop/mainmenu.aspx
Coverage: Statewide permits 1967-1986 and 2016-present (140,000+ files)
Search Methods: Owner Name, Address, Designer, Installer, Approval #
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


class NewHampshireSSBScraper(BaseScraper):
    """
    Scraper for New Hampshire DES OneStop Subsurface Systems Database.

    NH DES maintains a searchable database of septic system permits
    covering 1967-1986 and 2016-present (ongoing digitization).
    """

    def __init__(self, **kwargs):
        super().__init__(
            portal_name="NH DES OneStop SSB",
            state="NH",
            use_playwright=False,
            **kwargs
        )
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

    @property
    def base_url(self) -> str:
        return "https://www4.des.state.nh.us/DESOnestop/BasicSearch.aspx"

    @property
    def supported_search_methods(self) -> List[SearchMethod]:
        return [
            SearchMethod.ADDRESS,
            SearchMethod.OWNER_NAME,
        ]

    def search_by_address(self, address: str) -> ScraperResult:
        """Search NH permits by address."""
        start_time = time.time()

        try:
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
        """NH DES does not support parcel search."""
        return ScraperResult(
            status=ScraperStatus.FAILED,
            query=parcel,
            search_method=SearchMethod.PARCEL,
            portal_name=self.portal_name,
            error_message="Parcel search not supported by NH DES OneStop",
        )

    def search_by_owner(self, owner_name: str) -> ScraperResult:
        """Search by property owner name."""
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
        owner: str = "",
        address: str = "",
        town: str = "",
        approval_num: str = "",
    ) -> List[SepticRecord]:
        """
        Execute search against NH DES OneStop.

        The portal uses ASP.NET with postback. Key form fields:
        - ctl00$ContentPlaceHolder1$txtOwnerName
        - ctl00$ContentPlaceHolder1$txtAddress
        - ctl00$ContentPlaceHolder1$ddlTown
        - ctl00$ContentPlaceHolder1$txtApprovalNumber
        """
        # Get the page to obtain viewstate
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

        # Find the SSB search section and its form fields
        # The page has multiple search sections, we want the SSB one

        # Build form data for SSB search
        form_data = {
            '__VIEWSTATE': viewstate_val,
            '__EVENTVALIDATION': validation_val,
            '__VIEWSTATEGENERATOR': viewstate_gen_val,
            '__EVENTTARGET': '',
            '__EVENTARGUMENT': '',
            # SSB search fields - using address field for general search
            'ctl00$ContentPlaceHolder1$txtSSBAddress': address,
            'ctl00$ContentPlaceHolder1$txtSSBOwner': owner,
            'ctl00$ContentPlaceHolder1$btnSSBSearch': 'Search',
        }

        # Submit search
        self._delay()
        response = self.session.post(
            self.base_url,
            data=form_data,
            timeout=self.timeout
        )
        response.raise_for_status()

        return self._parse_results(response.text)

    def _parse_results(self, html: str) -> List[SepticRecord]:
        """Parse search results from NH DES OneStop."""
        records = []
        soup = BeautifulSoup(html, 'html.parser')

        # Look for results - could be in a grid, table, or repeater
        # Try various possible result containers
        results_table = soup.find('table', {'id': re.compile(r'.*grd.*|.*Grid.*|.*Results.*', re.I)})

        if not results_table:
            # Try finding div with results
            results_div = soup.find('div', {'id': re.compile(r'.*Results.*|.*pnl.*', re.I)})
            if results_div:
                results_table = results_div.find('table')

        if not results_table:
            # Try any table with permit-like content
            tables = soup.find_all('table')
            for table in tables:
                text = table.get_text().lower()
                if 'approval' in text or 'permit' in text or 'owner' in text:
                    results_table = table
                    break

        if not results_table:
            logger.debug("No results table found")
            return records

        # Parse rows
        rows = results_table.find_all('tr')[1:]  # Skip header

        for row in rows:
            cells = row.find_all('td')
            if len(cells) < 2:
                continue

            try:
                raw_data = {}
                for i, cell in enumerate(cells):
                    raw_data[f'col_{i}'] = cell.get_text(strip=True)

                # Try to identify fields
                permit_num = ""
                owner = ""
                address = ""
                town = ""
                permit_date = None
                pdf_link = None

                for i, cell in enumerate(cells):
                    text = cell.get_text(strip=True)

                    # Approval number pattern (e.g., NH-12345, 2020-1234)
                    if re.match(r'^[A-Z]{2,3}[-\s]?\d{4,}', text) or re.match(r'^\d{4}-\d+', text):
                        permit_num = text

                    # Date pattern
                    elif re.match(r'\d{1,2}/\d{1,2}/\d{2,4}', text):
                        try:
                            permit_date = datetime.strptime(text, '%m/%d/%Y')
                        except:
                            pass

                    # Address pattern
                    elif re.search(r'\d+.*(?:st|street|rd|road|ave|dr|ln|way)', text, re.I):
                        address = text

                    # Look for PDF link
                    link = cell.find('a', href=True)
                    if link:
                        href = link['href']
                        if '.pdf' in href.lower() or 'document' in href.lower():
                            if not href.startswith('http'):
                                href = f"https://www4.des.state.nh.us{href}"
                            pdf_link = href

                # Use first non-empty text as owner if not identified
                if not owner:
                    for cell in cells:
                        text = cell.get_text(strip=True)
                        if text and len(text) > 2 and not text.isdigit() and text != permit_num:
                            owner = text
                            break

                if permit_num or address or owner:
                    if not permit_num:
                        permit_num = f"NH-{len(records)+1:05d}"

                    record = SepticRecord(
                        permit_number=permit_num,
                        state="NH",
                        address=address if address else None,
                        city=town if town else None,
                        owner_name=owner if owner else None,
                        permit_date=permit_date,
                        pdf_url=pdf_link,
                        source_portal=self.portal_name,
                        raw_data=raw_data,
                    )
                    records.append(record)

            except Exception as e:
                logger.warning(f"Failed to parse row: {e}")
                continue

        logger.info(f"Parsed {len(records)} records from NH DES OneStop")
        return records


# For direct testing
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    scraper = NewHampshireSSBScraper()
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
