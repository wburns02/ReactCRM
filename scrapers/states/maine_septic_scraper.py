#!/usr/bin/env python3
"""
Maine CDC Septic Plans Search Scraper

Portal: https://apps.web.maine.gov/cgi-bin/online/mecdc/septicplans/index.pl
Coverage: Statewide permits since July 1974 (100,000+ records)
Search Methods: Address
Authentication: Public access

Maine Division of Environmental and Community Health maintains a searchable
database of septic system plans.
"""

import re
import time
import json
import logging
from typing import List, Optional, Dict, Any
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


class MaineSepticScraper(BaseScraper):
    """
    Scraper for Maine CDC Septic Plans Database.

    Maine maintains a statewide database of septic system plans since 1974.
    The portal uses simple HTTP GET requests for searching.
    """

    BASE_URL = 'https://apps.web.maine.gov/cgi-bin/online/mecdc/septicplans/index.pl'

    def __init__(self, **kwargs):
        super().__init__(
            portal_name='Maine CDC Septic Plans',
            state='ME',
            use_playwright=False,
            **kwargs
        )
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

    @property
    def base_url(self) -> str:
        return self.BASE_URL

    @property
    def supported_search_methods(self) -> List[SearchMethod]:
        return [
            SearchMethod.ADDRESS,
        ]

    def search_by_address(self, address: str) -> ScraperResult:
        """Search Maine septic plans by address."""
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
        """Maine CDC does not support parcel search."""
        return ScraperResult(
            status=ScraperStatus.FAILED,
            query=parcel,
            search_method=SearchMethod.PARCEL,
            portal_name=self.portal_name,
            error_message="Parcel search not supported by Maine CDC portal",
        )

    def search_by_owner(self, owner_name: str) -> ScraperResult:
        """Maine CDC does not support owner search."""
        return ScraperResult(
            status=ScraperStatus.FAILED,
            query=owner_name,
            search_method=SearchMethod.OWNER_NAME,
            portal_name=self.portal_name,
            error_message="Owner search not supported by Maine CDC portal",
        )

    def _do_search(self, address: str) -> List[SepticRecord]:
        """Execute search against Maine CDC portal."""
        # The Maine portal uses GET params for search
        params = {
            'address': address,
            'submit': 'Search'
        }

        self._delay()
        response = self.session.get(
            self.base_url,
            params=params,
            timeout=self.timeout
        )
        response.raise_for_status()

        return self._parse_results(response.text)

    def _parse_results(self, html: str) -> List[SepticRecord]:
        """Parse search results from Maine CDC."""
        records = []
        soup = BeautifulSoup(html, 'html.parser')

        # Look for results table
        results_table = soup.find('table')

        if not results_table:
            logger.debug("No results table found")
            return records

        # Parse rows (skip header)
        rows = results_table.find_all('tr')[1:]

        for i, row in enumerate(rows):
            cells = row.find_all('td')
            if len(cells) < 2:
                continue

            try:
                raw_data = {}
                cell_texts = []

                for j, cell in enumerate(cells):
                    text = cell.get_text(strip=True)
                    raw_data[f'col_{j}'] = text
                    cell_texts.append(text)

                # Extract fields
                permit_num = f"ME-{i+1:06d}"
                address = ''
                town = ''
                permit_date = None
                pdf_link = None

                for j, text in enumerate(cell_texts):
                    # Look for address pattern
                    if re.search(r'\d+.*(?:st|rd|ave|dr|ln|way|road)', text, re.I):
                        address = text

                    # Look for date pattern
                    if re.match(r'\d{1,2}/\d{1,2}/\d{2,4}', text):
                        try:
                            permit_date = datetime.strptime(text, '%m/%d/%Y')
                        except:
                            try:
                                permit_date = datetime.strptime(text, '%m/%d/%y')
                            except:
                                pass

                # Look for PDF link
                link = row.find('a', href=True)
                if link:
                    href = link['href']
                    if '.pdf' in href.lower() or 'document' in href.lower():
                        if not href.startswith('http'):
                            href = f"https://apps.web.maine.gov{href}"
                        pdf_link = href

                # Use first cell as permit number if it looks like one
                if cell_texts and re.match(r'^[A-Z0-9-]+$', cell_texts[0]):
                    permit_num = cell_texts[0]

                record = SepticRecord(
                    permit_number=permit_num,
                    state='ME',
                    address=address if address else None,
                    city=town if town else None,
                    permit_date=permit_date,
                    pdf_url=pdf_link,
                    source_portal=self.portal_name,
                    raw_data=raw_data,
                )
                records.append(record)

            except Exception as e:
                logger.warning(f"Failed to parse row {i}: {e}")
                continue

        logger.info(f"Parsed {len(records)} records from {self.portal_name}")
        return records

    def bulk_extract(self, output_file: str = None) -> Dict[str, Any]:
        """Attempt bulk extraction using common search terms."""
        searches = [
            'Main', 'Route', 'Road', 'Street', 'Lane', 'Drive',
            'Hill', 'Lake', 'River', 'Mountain', 'Pond', 'Brook',
            'Farm', 'School', 'Church', 'Mill', 'Pine', 'Oak', 'Maple',
            'North', 'South', 'East', 'West', 'Shore',
        ]

        all_records = []
        seen_permits = set()

        for term in searches:
            logger.info(f'Searching: {term}')
            result = self.search_by_address(term)

            if result.records:
                for r in result.records:
                    if r.permit_number not in seen_permits:
                        seen_permits.add(r.permit_number)
                        all_records.append(r)
                logger.info(f'  Found {result.record_count}, {len(seen_permits)} unique total')

            time.sleep(1)  # Rate limiting

        if output_file:
            with open(output_file, 'w') as f:
                json.dump({
                    'portal': self.portal_name,
                    'state': 'ME',
                    'record_count': len(all_records),
                    'records': [r.__dict__ for r in all_records]
                }, f, indent=2, default=str)

        return {
            'total_records': len(all_records),
        }


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)

    scraper = MaineSepticScraper()
    print(f'Testing {scraper.portal_name}')
    print(f'Base URL: {scraper.base_url}')

    # Test search
    result = scraper.search_by_address('Main')
    print(f'Search result: {result.status}')
    print(f'Records found: {result.record_count}')
