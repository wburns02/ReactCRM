"""
Accela Citizen Access Generic Platform Scraper

Accela is one of the most widely used government permitting platforms in the US.
Many counties and cities use Accela Citizen Access (ACA) for their septic/OWTS permits.

Common URL patterns:
- https://aca.countyname.gov/CitizenAccess/
- https://citizenaccess.countyname.gov/
- https://permits.countyname.gov/citizenaccess/

Search typically requires:
1. Navigate to "Search for a Permit" or similar
2. Select permit type (Septic, OWTS, Environmental Health)
3. Enter search criteria (address, parcel, permit number)
"""

import re
import time
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from dataclasses import dataclass
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


@dataclass
class AccelaPortalConfig:
    """Configuration for an Accela Citizen Access portal."""
    name: str
    state: str
    county: str
    base_url: str
    permit_module: str = "Environmental Health"
    permit_type: str = "Septic"
    # Optional overrides for portal-specific selectors
    search_link_text: str = "Search"
    permit_type_selector: Optional[str] = None
    results_table_id: Optional[str] = None


# Known Accela portals for septic permits
ACCELA_PORTALS: Dict[str, AccelaPortalConfig] = {
    # Arizona
    "maricopa_az": AccelaPortalConfig(
        name="Maricopa County, AZ",
        state="AZ",
        county="Maricopa",
        base_url="https://accela.maricopa.gov/CitizenAccess/",
        permit_module="Environmental Services",
        permit_type="Onsite Wastewater"
    ),
    "pima_az": AccelaPortalConfig(
        name="Pima County, AZ",
        state="AZ",
        county="Pima",
        base_url="https://webcms.pima.gov/",
        permit_module="Development Services",
        permit_type="Septic"
    ),

    # California
    "san_diego_ca": AccelaPortalConfig(
        name="San Diego County, CA",
        state="CA",
        county="San Diego",
        base_url="https://publicservices.sdcounty.ca.gov/citizenaccess/",
        permit_module="Environmental Health",
        permit_type="OWTS"
    ),
    "riverside_ca": AccelaPortalConfig(
        name="Riverside County, CA",
        state="CA",
        county="Riverside",
        base_url="https://aca.rivcoeh.org/citizenaccess/",
        permit_module="Environmental Health",
        permit_type="Septic"
    ),
    "sacramento_ca": AccelaPortalConfig(
        name="Sacramento County, CA",
        state="CA",
        county="Sacramento",
        base_url="https://acaweb.saccounty.net/",
        permit_module="Environmental Management",
        permit_type="Onsite Sewage"
    ),

    # Colorado
    "el_paso_co": AccelaPortalConfig(
        name="El Paso County, CO",
        state="CO",
        county="El Paso",
        base_url="https://epcdevplanreview.com/CitizenAccess/",
        permit_module="Public Health",
        permit_type="OWTS"
    ),

    # Georgia
    "fulton_ga": AccelaPortalConfig(
        name="Fulton County, GA",
        state="GA",
        county="Fulton",
        base_url="https://aca.fultoncountyga.gov/",
        permit_module="Environmental Health",
        permit_type="Septic"
    ),
    "gwinnett_ga": AccelaPortalConfig(
        name="Gwinnett County, GA",
        state="GA",
        county="Gwinnett",
        base_url="https://gis.gwinnettcounty.com/citizenaccess/",
        permit_module="Environmental Health",
        permit_type="Septic"
    ),

    # North Carolina
    "wake_nc": AccelaPortalConfig(
        name="Wake County, NC",
        state="NC",
        county="Wake",
        base_url="https://portal.wakegov.com/citizenaccess/",
        permit_module="Environmental Services",
        permit_type="Septic"
    ),
    "mecklenburg_nc": AccelaPortalConfig(
        name="Mecklenburg County, NC",
        state="NC",
        county="Mecklenburg",
        base_url="https://aca.mecknc.gov/citizenaccess/",
        permit_module="Environmental Health",
        permit_type="Septic"
    ),

    # Texas
    "travis_tx": AccelaPortalConfig(
        name="Travis County, TX",
        state="TX",
        county="Travis",
        base_url="https://aca.traviscountytx.gov/CitizenAccess/",
        permit_module="Development Services",
        permit_type="OSSF"  # On-Site Sewage Facility
    ),
    "tarrant_tx": AccelaPortalConfig(
        name="Tarrant County, TX",
        state="TX",
        county="Tarrant",
        base_url="https://acaweb.tarrantcounty.com/CitizenAccess/",
        permit_module="Public Health",
        permit_type="Septic"
    ),

    # Virginia
    "fairfax_va": AccelaPortalConfig(
        name="Fairfax County, VA",
        state="VA",
        county="Fairfax",
        base_url="https://aca.fairfaxcounty.gov/CitizenAccess/",
        permit_module="Health Department",
        permit_type="Septic"
    ),
    "loudoun_va": AccelaPortalConfig(
        name="Loudoun County, VA",
        state="VA",
        county="Loudoun",
        base_url="https://aca.loudoun.gov/citizenaccess/",
        permit_module="Health",
        permit_type="AOSE"  # Alternative Onsite Sewage
    ),

    # Washington
    "king_wa": AccelaPortalConfig(
        name="King County, WA",
        state="WA",
        county="King",
        base_url="https://blue.kingcounty.gov/Permits/",
        permit_module="Public Health",
        permit_type="Septic"
    ),
    "pierce_wa": AccelaPortalConfig(
        name="Pierce County, WA",
        state="WA",
        county="Pierce",
        base_url="https://permits.co.pierce.wa.us/citizenaccess/",
        permit_module="Environmental Health",
        permit_type="OSS"  # On-Site Sewage
    ),
}


class AccelaScraper(BaseScraper):
    """
    Generic scraper for Accela Citizen Access portals.

    Accela is widely used for government permitting. This scraper handles
    the common Accela interface patterns while allowing portal-specific
    configuration through AccelaPortalConfig.

    Uses Playwright for browser automation since Accela sites typically
    require JavaScript and may have anti-bot measures.
    """

    def __init__(
        self,
        portal_key: Optional[str] = None,
        config: Optional[AccelaPortalConfig] = None,
        **kwargs
    ):
        """
        Initialize the Accela scraper.

        Args:
            portal_key: Key from ACCELA_PORTALS dict (e.g., "maricopa_az")
            config: Direct AccelaPortalConfig (alternative to portal_key)
            **kwargs: Additional arguments passed to BaseScraper
        """
        if config:
            self.config = config
        elif portal_key:
            if portal_key not in ACCELA_PORTALS:
                available = ", ".join(ACCELA_PORTALS.keys())
                raise ValueError(f"Unknown portal '{portal_key}'. Available: {available}")
            self.config = ACCELA_PORTALS[portal_key]
        else:
            raise ValueError("Must provide either portal_key or config")

        super().__init__(
            portal_name=f"Accela - {self.config.name}",
            state=self.config.state,
            use_playwright=True,
            **kwargs
        )

    @property
    def base_url(self) -> str:
        return self.config.base_url

    @property
    def supported_search_methods(self) -> List[SearchMethod]:
        return [
            SearchMethod.ADDRESS,
            SearchMethod.PARCEL,
            SearchMethod.PERMIT_NUMBER,
        ]

    def search_by_address(self, address: str) -> ScraperResult:
        """Search Accela by address."""
        return asyncio.get_event_loop().run_until_complete(
            self._async_search(address=address)
        )

    def search_by_parcel(self, parcel: str) -> ScraperResult:
        """Search Accela by parcel number."""
        return asyncio.get_event_loop().run_until_complete(
            self._async_search(parcel=parcel)
        )

    def search_by_permit_number(self, permit_number: str) -> ScraperResult:
        """Search Accela by permit number."""
        return asyncio.get_event_loop().run_until_complete(
            self._async_search(permit_number=permit_number)
        )

    async def _async_search(
        self,
        address: str = "",
        parcel: str = "",
        permit_number: str = "",
    ) -> ScraperResult:
        """
        Execute async search using Playwright.

        Accela Citizen Access typical workflow:
        1. Go to base URL
        2. Click "Search for a Permit/Application" link
        3. Select module (Environmental Health, etc.)
        4. Select permit type (Septic, OWTS, etc.)
        5. Enter search criteria
        6. Click Search
        7. Parse results table
        """
        start_time = time.time()
        query = address or parcel or permit_number
        method = (
            SearchMethod.ADDRESS if address else
            SearchMethod.PARCEL if parcel else
            SearchMethod.PERMIT_NUMBER
        )

        try:
            from playwright.async_api import async_playwright

            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=self.headless)
                context = await browser.new_context(
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                )
                page = await context.new_page()

                # Navigate to base URL
                await page.goto(self.base_url, timeout=self.timeout * 1000)
                await page.wait_for_load_state('networkidle')

                # Look for search link
                search_link = await page.query_selector(
                    f'a:has-text("{self.config.search_link_text}"), '
                    'a:has-text("Search for a Permit"), '
                    'a:has-text("Search Permits"), '
                    'a[href*="PermitSearch"], '
                    'a[href*="GlobalSearch"]'
                )

                if search_link:
                    await search_link.click()
                    await page.wait_for_load_state('networkidle')
                    await asyncio.sleep(1)

                # Try to select module/permit type if dropdowns exist
                module_selector = await page.query_selector(
                    'select[id*="Module"], select[name*="Module"]'
                )
                if module_selector:
                    try:
                        await module_selector.select_option(label=self.config.permit_module)
                        await asyncio.sleep(0.5)
                    except:
                        pass

                type_selector = await page.query_selector(
                    'select[id*="Type"], select[name*="permitType"]'
                )
                if type_selector:
                    try:
                        await type_selector.select_option(label=self.config.permit_type)
                        await asyncio.sleep(0.5)
                    except:
                        pass

                # Fill search criteria
                if address:
                    address_field = await page.query_selector(
                        'input[id*="Address"], input[name*="Address"], '
                        'input[placeholder*="Address"], input[id*="streetName"]'
                    )
                    if address_field:
                        await address_field.fill(address)

                if parcel:
                    parcel_field = await page.query_selector(
                        'input[id*="Parcel"], input[name*="Parcel"], '
                        'input[id*="APN"], input[placeholder*="Parcel"]'
                    )
                    if parcel_field:
                        await parcel_field.fill(parcel)

                if permit_number:
                    permit_field = await page.query_selector(
                        'input[id*="Permit"], input[name*="PermitNumber"], '
                        'input[id*="recordNumber"], input[placeholder*="Permit"]'
                    )
                    if permit_field:
                        await permit_field.fill(permit_number)

                # Click search button
                search_btn = await page.query_selector(
                    'button:has-text("Search"), input[type="submit"][value*="Search"], '
                    'a:has-text("Search"), button[id*="Search"]'
                )
                if search_btn:
                    await search_btn.click()
                    await page.wait_for_load_state('networkidle')
                    await asyncio.sleep(2)

                # Parse results
                records = await self._parse_accela_results(page)

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

    async def _parse_accela_results(self, page) -> List[SepticRecord]:
        """
        Parse Accela search results.

        Accela results typically show in a table with columns like:
        - Record Number
        - Record Type
        - Address
        - Status
        - Date

        Args:
            page: Playwright page object

        Returns:
            List of SepticRecord objects
        """
        records = []

        try:
            # Look for results table (Accela uses various table IDs)
            table_selectors = [
                'table[id*="Result"]',
                'table[id*="gdvPermit"]',
                'table.ACA_Grid',
                '#divGlobalSearchResult table',
                '.ACA_TabRow table'
            ]

            table = None
            for selector in table_selectors:
                table = await page.query_selector(selector)
                if table:
                    break

            if not table:
                # Try generic table in results area
                table = await page.query_selector('div[class*="result"] table, table')

            if not table:
                logger.debug("No results table found")
                return records

            # Get rows
            rows = await table.query_selector_all('tr')

            # Determine header columns
            headers = []
            header_row = rows[0] if rows else None
            if header_row:
                header_cells = await header_row.query_selector_all('th, td')
                for cell in header_cells:
                    text = await cell.text_content()
                    headers.append(text.strip().lower() if text else "")

            # Parse data rows
            for row in rows[1:]:  # Skip header
                cells = await row.query_selector_all('td')
                if len(cells) < 2:
                    continue

                try:
                    raw_data = {}
                    cell_data = {}

                    for i, cell in enumerate(cells):
                        text = await cell.text_content()
                        text = text.strip() if text else ""
                        col_name = headers[i] if i < len(headers) else f'col_{i}'
                        raw_data[col_name] = text
                        cell_data[i] = text

                    # Extract fields based on header names or position
                    permit_num = ""
                    address = ""
                    status = ""
                    permit_date = None

                    for key, value in raw_data.items():
                        key_lower = key.lower()
                        if 'record' in key_lower or 'permit' in key_lower or 'number' in key_lower:
                            if not permit_num and value:
                                permit_num = value
                        elif 'address' in key_lower or 'location' in key_lower:
                            if not address and value:
                                address = value
                        elif 'status' in key_lower:
                            status = value
                        elif 'date' in key_lower:
                            try:
                                permit_date = datetime.strptime(value, '%m/%d/%Y')
                            except:
                                try:
                                    permit_date = datetime.strptime(value, '%Y-%m-%d')
                                except:
                                    pass

                    # Fallback: use first column as permit number
                    if not permit_num and cell_data:
                        permit_num = cell_data.get(0, "")

                    # Look for detail link
                    detail_link = await row.query_selector('a[href*="Record"], a[href*="Permit"]')
                    permit_url = None
                    if detail_link:
                        href = await detail_link.get_attribute('href')
                        if href and not href.startswith('http'):
                            href = f"{self.config.base_url.rstrip('/')}/{href.lstrip('/')}"
                        permit_url = href

                    if permit_num:
                        record = SepticRecord(
                            permit_number=permit_num,
                            state=self.config.state,
                            county=self.config.county,
                            address=address if address else None,
                            permit_date=permit_date,
                            permit_url=permit_url,
                            source_portal=self.portal_name,
                            raw_data=raw_data,
                        )
                        records.append(record)

                except Exception as e:
                    logger.warning(f"Failed to parse row: {e}")
                    continue

        except Exception as e:
            logger.error(f"Failed to parse Accela results: {e}")

        logger.info(f"Parsed {len(records)} records from {self.portal_name}")
        return records

    @staticmethod
    def get_available_portals() -> List[str]:
        """Get list of available portal keys."""
        return list(ACCELA_PORTALS.keys())

    @staticmethod
    def get_portal_info(portal_key: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific portal."""
        if portal_key in ACCELA_PORTALS:
            config = ACCELA_PORTALS[portal_key]
            return {
                "name": config.name,
                "state": config.state,
                "county": config.county,
                "base_url": config.base_url,
                "permit_module": config.permit_module,
                "permit_type": config.permit_type,
            }
        return None


def create_accela_scraper(portal_key: str, **kwargs) -> AccelaScraper:
    """
    Factory function to create an Accela scraper for a specific portal.

    Args:
        portal_key: Key from ACCELA_PORTALS (e.g., "maricopa_az")
        **kwargs: Additional scraper arguments

    Returns:
        Configured AccelaScraper instance
    """
    return AccelaScraper(portal_key=portal_key, **kwargs)


# For direct testing
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    print("Accela Platform Scraper")
    print("=" * 50)
    print(f"Available portals: {len(ACCELA_PORTALS)}")
    print()

    for key, config in ACCELA_PORTALS.items():
        print(f"  {key}: {config.name}")
        print(f"    URL: {config.base_url}")
        print(f"    Module: {config.permit_module} / {config.permit_type}")
        print()

    print("Note: Live testing requires Playwright: pip install playwright && playwright install")
