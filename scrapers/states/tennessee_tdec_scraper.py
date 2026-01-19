"""
Tennessee TDEC FileNet Septic System Records Scraper

Portal: https://tdec.tn.gov/filenetsearch
Alt Portal: https://tdec.tn.gov/document-viewer/search/stp
Coverage: Statewide (except contract counties: Blount, Davidson, Hamilton,
          Jefferson, Knox, Madison, Sevier, Shelby, Williamson)
Search Methods: County, Owner Name, Address, Map/Parcel

TDEC uses a FileNet document management system for septic permit records.
The system allows partial matches and returns scanned permit documents.
"""

import re
import time
import logging
from typing import List, Optional
from datetime import datetime
import asyncio

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


# Counties NOT in TDEC FileNet (they have their own systems)
CONTRACT_COUNTIES = [
    "Blount", "Davidson", "Hamilton", "Jefferson",
    "Knox", "Madison", "Sevier", "Shelby", "Williamson"
]


class TennesseeTDECScraper(BaseScraper):
    """
    Scraper for Tennessee TDEC FileNet Septic System Database.

    Tennessee maintains a statewide FileNet system with digitized septic
    permit records. The system supports searching by county, owner name,
    address, subdivision, lot number, and map/parcel.

    Note: Contract counties (Blount, Davidson, Hamilton, Jefferson, Knox,
    Madison, Sevier, Shelby, Williamson) maintain their own records and
    are not included in the state FileNet system.
    """

    # Use Playwright since the site requires JavaScript
    SEARCH_URL = "https://tdec.tn.gov/filenetsearch"
    DOCUMENT_VIEWER_URL = "https://tdec.tn.gov/document-viewer/search/stp"

    def __init__(self, county: Optional[str] = None, **kwargs):
        """
        Initialize the Tennessee TDEC scraper.

        Args:
            county: Optional county to filter results (must not be a contract county)
            **kwargs: Additional arguments passed to BaseScraper
        """
        super().__init__(
            portal_name="Tennessee TDEC FileNet",
            state="TN",
            use_playwright=True,
            **kwargs
        )

        if county and county.title() in CONTRACT_COUNTIES:
            logger.warning(f"{county} is a contract county - records not in TDEC FileNet")

        self.county = county

    @property
    def base_url(self) -> str:
        return self.SEARCH_URL

    @property
    def supported_search_methods(self) -> List[SearchMethod]:
        return [
            SearchMethod.ADDRESS,
            SearchMethod.OWNER_NAME,
            SearchMethod.PARCEL,
        ]

    def search_by_address(self, address: str) -> ScraperResult:
        """
        Search Tennessee TDEC by address.

        Args:
            address: Street address or partial address

        Returns:
            ScraperResult with found records
        """
        return asyncio.get_event_loop().run_until_complete(
            self._async_search(address=address)
        )

    def search_by_parcel(self, parcel: str) -> ScraperResult:
        """
        Search Tennessee TDEC by map/parcel number.

        Args:
            parcel: Map and parcel number

        Returns:
            ScraperResult with found records
        """
        return asyncio.get_event_loop().run_until_complete(
            self._async_search(parcel=parcel)
        )

    def search_by_owner(self, owner_name: str) -> ScraperResult:
        """
        Search by owner name.

        Args:
            owner_name: Owner/applicant name

        Returns:
            ScraperResult with found records
        """
        return asyncio.get_event_loop().run_until_complete(
            self._async_search(owner=owner_name)
        )

    async def _async_search(
        self,
        owner: str = "",
        address: str = "",
        parcel: str = "",
    ) -> ScraperResult:
        """
        Execute async search using Playwright.

        Args:
            owner: Owner name
            address: Street address
            parcel: Map/parcel number

        Returns:
            ScraperResult with found records
        """
        start_time = time.time()
        query = owner or address or parcel
        method = (
            SearchMethod.OWNER_NAME if owner else
            SearchMethod.ADDRESS if address else
            SearchMethod.PARCEL
        )

        try:
            from playwright.async_api import async_playwright

            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=self.headless)
                page = await browser.new_page()

                # Navigate to search page
                await page.goto(self.base_url, timeout=self.timeout * 1000)
                await page.wait_for_load_state('networkidle')

                # Fill search form
                # The form typically has fields for:
                # - County dropdown
                # - Owner Name
                # - Street Address
                # - Subdivision
                # - Lot Number
                # - Map Number
                # - Parcel Number

                if self.county:
                    # Select county from dropdown
                    county_selector = 'select[name*="county"], #county, [id*="County"]'
                    county_dropdown = await page.query_selector(county_selector)
                    if county_dropdown:
                        await county_dropdown.select_option(label=self.county.title())

                if owner:
                    # Find owner name field
                    owner_field = await page.query_selector(
                        'input[name*="owner"], input[id*="owner"], input[placeholder*="owner"]'
                    )
                    if owner_field:
                        await owner_field.fill(owner)

                if address:
                    # Find address field
                    address_field = await page.query_selector(
                        'input[name*="address"], input[id*="address"], input[placeholder*="address"]'
                    )
                    if address_field:
                        await address_field.fill(address)

                if parcel:
                    # Find parcel field (may be split into map/parcel)
                    parcel_field = await page.query_selector(
                        'input[name*="parcel"], input[id*="parcel"]'
                    )
                    if parcel_field:
                        await parcel_field.fill(parcel)

                # Click search button
                search_btn = await page.query_selector(
                    'button[type="submit"], input[type="submit"], button:has-text("Search")'
                )
                if search_btn:
                    await search_btn.click()
                    await page.wait_for_load_state('networkidle')

                # Wait for results
                await asyncio.sleep(2)

                # Parse results
                records = await self._parse_playwright_results(page)

                await browser.close()

                elapsed = time.time() - start_time

                return ScraperResult(
                    status=ScraperStatus.SUCCESS if records else ScraperStatus.NO_RESULTS,
                    records=records,
                    query=query,
                    search_method=method,
                    portal_name=self.portal_name,
                    execution_time_seconds=elapsed,
                )

        except ImportError:
            return ScraperResult(
                status=ScraperStatus.FAILED,
                query=query,
                search_method=method,
                portal_name=self.portal_name,
                error_message="Playwright not installed. Run: pip install playwright && playwright install"
            )

        except Exception as e:
            logger.error(f"Search failed: {e}")
            return ScraperResult(
                status=ScraperStatus.FAILED,
                query=query,
                search_method=method,
                portal_name=self.portal_name,
                error_message=str(e),
            )

    async def _parse_playwright_results(self, page) -> List[SepticRecord]:
        """
        Parse search results from the Playwright page.

        Args:
            page: Playwright page object

        Returns:
            List of SepticRecord objects
        """
        records = []

        try:
            # Look for results table
            table = await page.query_selector('table')
            if not table:
                logger.debug("No results table found")
                return records

            # Get all rows (skip header)
            rows = await table.query_selector_all('tr')

            for i, row in enumerate(rows[1:]):  # Skip header row
                cells = await row.query_selector_all('td')
                if len(cells) < 3:
                    continue

                try:
                    raw_data = {}
                    cell_texts = []

                    for j, cell in enumerate(cells):
                        text = await cell.text_content()
                        text = text.strip() if text else ""
                        raw_data[f'col_{j}'] = text
                        cell_texts.append(text)

                    # Try to identify fields from cell content
                    permit_num = ""
                    county = ""
                    owner = ""
                    address = ""
                    pdf_link = None

                    for j, text in enumerate(cell_texts):
                        # Look for permit pattern
                        if re.match(r'^\d{4,}-\d+', text) or re.match(r'^[A-Z]{2,}-\d+', text):
                            permit_num = text

                        # Look for county name
                        elif text.lower().endswith('county') or text.title() in self._get_tn_counties():
                            county = text

                        # Look for address pattern
                        elif re.search(r'\d+.*(?:st|rd|ave|dr|ln|ct|blvd|way|hwy)', text, re.I):
                            address = text

                        # Otherwise might be owner name
                        elif not owner and len(text) > 2 and not text.isdigit():
                            owner = text

                    # Look for PDF link
                    link = await row.query_selector('a[href*=".pdf"], a[href*="document"]')
                    if link:
                        href = await link.get_attribute('href')
                        if href:
                            if not href.startswith('http'):
                                href = f"https://tdec.tn.gov{href}"
                            pdf_link = href

                    # Generate permit number if not found
                    if not permit_num:
                        permit_num = f"TN-{i+1:05d}"

                    record = SepticRecord(
                        permit_number=permit_num,
                        state="TN",
                        county=county if county else self.county,
                        address=address if address else None,
                        owner_name=owner if owner else None,
                        pdf_url=pdf_link,
                        source_portal=self.portal_name,
                        raw_data=raw_data,
                    )
                    records.append(record)

                except Exception as e:
                    logger.warning(f"Failed to parse row {i}: {e}")
                    continue

        except Exception as e:
            logger.error(f"Failed to parse results: {e}")

        logger.info(f"Parsed {len(records)} records from {self.portal_name}")
        return records

    def _get_tn_counties(self) -> List[str]:
        """Get list of Tennessee counties."""
        return [
            "Anderson", "Bedford", "Benton", "Bledsoe", "Blount", "Bradley",
            "Campbell", "Cannon", "Carroll", "Carter", "Cheatham", "Chester",
            "Claiborne", "Clay", "Cocke", "Coffee", "Crockett", "Cumberland",
            "Davidson", "Decatur", "DeKalb", "Dickson", "Dyer", "Fayette",
            "Fentress", "Franklin", "Gibson", "Giles", "Grainger", "Greene",
            "Grundy", "Hamblen", "Hamilton", "Hancock", "Hardeman", "Hardin",
            "Hawkins", "Haywood", "Henderson", "Henry", "Hickman", "Houston",
            "Humphreys", "Jackson", "Jefferson", "Johnson", "Knox", "Lake",
            "Lauderdale", "Lawrence", "Lewis", "Lincoln", "Loudon", "Macon",
            "Madison", "Marion", "Marshall", "Maury", "McMinn", "McNairy",
            "Meigs", "Monroe", "Montgomery", "Moore", "Morgan", "Obion",
            "Overton", "Perry", "Pickett", "Polk", "Putnam", "Rhea", "Roane",
            "Robertson", "Rutherford", "Scott", "Sequatchie", "Sevier",
            "Shelby", "Smith", "Stewart", "Sullivan", "Sumner", "Tipton",
            "Trousdale", "Unicoi", "Union", "Van Buren", "Warren", "Washington",
            "Wayne", "Weakley", "White", "Williamson", "Wilson"
        ]

    @staticmethod
    def get_contract_counties() -> List[str]:
        """Get list of contract counties not in TDEC FileNet."""
        return CONTRACT_COUNTIES


# For direct testing
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    scraper = TennesseeTDECScraper()
    print(f"Testing {scraper.portal_name}")
    print(f"Base URL: {scraper.base_url}")
    print(f"Supported methods: {scraper.supported_search_methods}")
    print(f"Contract counties (not in FileNet): {TennesseeTDECScraper.get_contract_counties()}")

    # Note: Testing requires Playwright installed
    print("\nNote: Live testing requires Playwright: pip install playwright && playwright install")
