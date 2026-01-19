#!/usr/bin/env python3
"""
Minnesota MPCA SSTS (Subsurface Sewage Treatment Systems) Scraper

Portal: https://webapp.pca.state.mn.us/ssts/
Coverage: Statewide - 600,000+ systems
Search Methods: Address, Owner, Parcel, County
Authentication: Public access

The Minnesota Pollution Control Agency (MPCA) maintains the central SSTS
database for all subsurface sewage treatment systems in the state.
"""

import re
import time
import json
import logging
from typing import List, Optional, Dict, Any
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


# Minnesota Counties (87 total)
MN_COUNTIES = [
    'Aitkin', 'Anoka', 'Becker', 'Beltrami', 'Benton', 'Big Stone', 'Blue Earth',
    'Brown', 'Carlton', 'Carver', 'Cass', 'Chippewa', 'Chisago', 'Clay', 'Clearwater',
    'Cook', 'Cottonwood', 'Crow Wing', 'Dakota', 'Dodge', 'Douglas', 'Faribault',
    'Fillmore', 'Freeborn', 'Goodhue', 'Grant', 'Hennepin', 'Houston', 'Hubbard',
    'Isanti', 'Itasca', 'Jackson', 'Kanabec', 'Kandiyohi', 'Kittson', 'Koochiching',
    'Lac qui Parle', 'Lake', 'Lake of the Woods', 'Le Sueur', 'Lincoln', 'Lyon',
    'Mahnomen', 'Marshall', 'Martin', 'McLeod', 'Meeker', 'Mille Lacs', 'Morrison',
    'Mower', 'Murray', 'Nicollet', 'Nobles', 'Norman', 'Olmsted', 'Otter Tail',
    'Pennington', 'Pine', 'Pipestone', 'Polk', 'Pope', 'Ramsey', 'Red Lake',
    'Redwood', 'Renville', 'Rice', 'Rock', 'Roseau', 'Scott', 'Sherburne', 'Sibley',
    'St. Louis', 'Stearns', 'Steele', 'Stevens', 'Swift', 'Todd', 'Traverse',
    'Wabasha', 'Wadena', 'Waseca', 'Washington', 'Watonwan', 'Wilkin', 'Winona',
    'Wright', 'Yellow Medicine'
]


class MinnesotaMPCAScraper(BaseScraper):
    """
    Scraper for Minnesota MPCA SSTS Database.

    MPCA maintains the central Subsurface Sewage Treatment Systems (SSTS)
    database with 600,000+ systems statewide. Local units of government
    (counties, cities, townships) enforce the SSTS rules.
    """

    BASE_URL = 'https://webapp.pca.state.mn.us/ssts/'

    def __init__(self, county: Optional[str] = None, **kwargs):
        super().__init__(
            portal_name='Minnesota MPCA SSTS',
            state='MN',
            use_playwright=True,
            **kwargs
        )
        self.county = county

    @property
    def base_url(self) -> str:
        return self.BASE_URL

    @property
    def supported_search_methods(self) -> List[SearchMethod]:
        return [
            SearchMethod.ADDRESS,
            SearchMethod.OWNER_NAME,
            SearchMethod.PARCEL,
        ]

    def search_by_address(self, address: str) -> ScraperResult:
        return asyncio.get_event_loop().run_until_complete(
            self._async_search(address=address)
        )

    def search_by_parcel(self, parcel: str) -> ScraperResult:
        return asyncio.get_event_loop().run_until_complete(
            self._async_search(parcel=parcel)
        )

    def search_by_owner(self, owner_name: str) -> ScraperResult:
        return asyncio.get_event_loop().run_until_complete(
            self._async_search(owner=owner_name)
        )

    def search_by_county(self, county: str) -> ScraperResult:
        """Search all records in a county."""
        return asyncio.get_event_loop().run_until_complete(
            self._async_search(county=county)
        )

    async def _async_search(
        self,
        address: str = '',
        owner: str = '',
        parcel: str = '',
        county: str = '',
    ) -> ScraperResult:
        """Execute async search using Playwright."""
        start_time = time.time()
        query = address or owner or parcel or county
        method = (
            SearchMethod.ADDRESS if address else
            SearchMethod.OWNER_NAME if owner else
            SearchMethod.PARCEL
        )

        try:
            from playwright.async_api import async_playwright

            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=self.headless)
                page = await browser.new_page()

                await page.goto(self.base_url, timeout=self.timeout * 1000)
                await page.wait_for_load_state('networkidle')

                if county:
                    county_sel = await page.query_selector('select[id*="county"], select[name*="county"]')
                    if county_sel:
                        await county_sel.select_option(label=county)

                if address:
                    addr_field = await page.query_selector('input[id*="address"], input[name*="address"]')
                    if addr_field:
                        await addr_field.fill(address)

                if owner:
                    owner_field = await page.query_selector('input[id*="owner"], input[name*="owner"]')
                    if owner_field:
                        await owner_field.fill(owner)

                if parcel:
                    parcel_field = await page.query_selector('input[id*="parcel"], input[name*="parcel"]')
                    if parcel_field:
                        await parcel_field.fill(parcel)

                search_btn = await page.query_selector('button[type="submit"], input[type="submit"], button:has-text("Search")')
                if search_btn:
                    await search_btn.click()
                    await page.wait_for_load_state('networkidle')
                    await asyncio.sleep(2)

                records = await self._parse_results(page)

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
                error_message='Playwright not installed'
            )
        except Exception as e:
            logger.error(f'Search failed: {e}')
            return ScraperResult(
                status=ScraperStatus.FAILED,
                query=query,
                search_method=method,
                portal_name=self.portal_name,
                error_message=str(e),
            )

    async def _parse_results(self, page) -> List[SepticRecord]:
        """Parse search results from page."""
        records = []

        try:
            table = await page.query_selector('table')
            if not table:
                return records

            rows = await table.query_selector_all('tr')

            for i, row in enumerate(rows[1:]):
                cells = await row.query_selector_all('td')
                if len(cells) < 3:
                    continue

                try:
                    raw_data = {}
                    cell_texts = []

                    for j, cell in enumerate(cells):
                        text = await cell.text_content()
                        text = text.strip() if text else ''
                        raw_data[f'col_{j}'] = text
                        cell_texts.append(text)

                    permit_num = cell_texts[0] if cell_texts else f'MN-{i+1:06d}'
                    county = self.county or ''
                    owner = ''
                    address = ''
                    system_type = ''

                    for text in cell_texts:
                        if re.search(r'\d+.*(?:st|rd|ave|dr|ln)', text, re.I):
                            address = text
                        elif text in MN_COUNTIES:
                            county = text

                    record = SepticRecord(
                        permit_number=permit_num,
                        state='MN',
                        county=county,
                        address=address if address else None,
                        owner_name=owner if owner else None,
                        system_type=system_type if system_type else None,
                        source_portal=self.portal_name,
                        raw_data=raw_data,
                    )
                    records.append(record)

                except Exception as e:
                    logger.warning(f'Failed to parse row {i}: {e}')
                    continue

        except Exception as e:
            logger.error(f'Failed to parse results: {e}')

        logger.info(f'Parsed {len(records)} records from {self.portal_name}')
        return records

    async def scrape_all_counties(self, output_file: str = None) -> Dict[str, Any]:
        """Scrape all counties sequentially."""
        all_records = []
        county_stats = {}

        for county in MN_COUNTIES:
            logger.info(f'Scraping {county} County...')
            result = await self._async_search(county=county)

            if result.status == ScraperStatus.SUCCESS:
                all_records.extend(result.records)
                county_stats[county] = len(result.records)
                logger.info(f'{county}: {len(result.records)} records')
            else:
                county_stats[county] = 0
                logger.warning(f'{county}: FAILED - {result.error_message}')

            await asyncio.sleep(2)

        if output_file:
            with open(output_file, 'w') as f:
                json.dump({
                    'portal': self.portal_name,
                    'state': 'MN',
                    'record_count': len(all_records),
                    'county_stats': county_stats,
                    'records': [r.__dict__ for r in all_records]
                }, f, indent=2, default=str)

        return {
            'total_records': len(all_records),
            'county_stats': county_stats,
        }

    @staticmethod
    def get_counties() -> List[str]:
        return MN_COUNTIES


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)

    scraper = MinnesotaMPCAScraper()
    print(f'Testing {scraper.portal_name}')
    print(f'Base URL: {scraper.base_url}')
    print(f'Counties: {len(MN_COUNTIES)}')
