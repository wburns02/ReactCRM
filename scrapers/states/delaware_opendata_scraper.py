"""
Delaware DNREC Open Data Septic Permit Scraper

Portal: https://data.delaware.gov/Energy-and-Environment/Permitted-Septic-Systems/mv7j-tx3u
Coverage: Statewide (129,948+ permits)
API: Socrata Open Data API - direct JSON download
Authentication: None required (public data)

This scraper uses the Socrata Open Data API which provides direct access
to the full dataset in JSON format - no web scraping required!
"""

import time
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime

import requests

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


class DelawareOpenDataScraper(BaseScraper):
    """
    Scraper for Delaware DNREC Open Data Septic Permit Database.

    Delaware provides excellent public access to all septic permit data
    through their Socrata-powered Open Data portal. The full dataset
    can be downloaded via API without any authentication.

    Dataset: Permitted Septic Systems
    ID: mv7j-tx3u
    Records: 129,948+
    """

    # Socrata API endpoints
    API_BASE = "https://data.delaware.gov"
    DATASET_ID = "mv7j-tx3u"

    def __init__(self, **kwargs):
        super().__init__(
            portal_name="Delaware DNREC Open Data",
            state="DE",
            use_playwright=False,
            **kwargs
        )
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
        })
        self._cached_data = None
        self._column_mapping = None

    @property
    def base_url(self) -> str:
        return f"{self.API_BASE}/api/views/{self.DATASET_ID}/rows.json?accessType=DOWNLOAD"

    @property
    def supported_search_methods(self) -> List[SearchMethod]:
        return [
            SearchMethod.ADDRESS,
            SearchMethod.OWNER_NAME,
            SearchMethod.PARCEL,
            SearchMethod.PERMIT_NUMBER,
        ]

    def _load_data(self) -> bool:
        """
        Download the full dataset from Socrata API.

        Returns:
            True if data loaded successfully
        """
        if self._cached_data is not None:
            return True

        try:
            logger.info("Downloading Delaware septic permit dataset...")
            response = self.session.get(self.base_url, timeout=120)
            response.raise_for_status()

            data = response.json()
            columns = data['meta']['view']['columns']
            self._column_mapping = {col['fieldName']: i for i, col in enumerate(columns)}
            self._cached_data = data['data']

            logger.info(f"Loaded {len(self._cached_data)} records")
            return True

        except Exception as e:
            logger.error(f"Failed to load data: {e}")
            return False

    def _get_field(self, row: List, field_name: str) -> Optional[str]:
        """Extract field value from row using column mapping."""
        if self._column_mapping is None:
            return None
        idx = self._column_mapping.get(field_name)
        if idx is not None and idx < len(row):
            return row[idx]
        return None

    def _row_to_record(self, row: List) -> SepticRecord:
        """Convert a data row to a SepticRecord."""
        permit_date = None
        date_str = self._get_field(row, 'approveddate')
        if date_str:
            try:
                permit_date = datetime.fromisoformat(date_str.replace('T', ' ').split('.')[0])
            except:
                pass

        return SepticRecord(
            permit_number=self._get_field(row, 'permitnumber') or '',
            state="DE",
            county=self._get_field(row, 'county'),
            parcel_number=self._get_field(row, 'taxparcelnumbers'),
            latitude=float(self._get_field(row, 'latitude')) if self._get_field(row, 'latitude') else None,
            longitude=float(self._get_field(row, 'longitude')) if self._get_field(row, 'longitude') else None,
            owner_name=self._get_field(row, 'ownername'),
            contractor_name=self._get_field(row, 'contractor'),
            system_type=self._get_field(row, 'septicsystemtype'),
            permit_date=permit_date,
            permit_url=self._get_field(row, 'url_for_permit_details'),
            source_portal=self.portal_name,
            raw_data={
                'system_subtype': self._get_field(row, 'septicsystemsubtype'),
                'designer': self._get_field(row, 'designer'),
                'permit_status': self._get_field(row, 'permitstatus'),
                'construction_type': self._get_field(row, 'constructiontype'),
                'pretreat_type': self._get_field(row, 'pretreattype'),
                'technology': self._get_field(row, 'technology'),
            }
        )

    def search_by_address(self, address: str) -> ScraperResult:
        """Search permits by address (not available - use download_all instead)."""
        return ScraperResult(
            status=ScraperStatus.FAILED,
            query=address,
            search_method=SearchMethod.ADDRESS,
            portal_name=self.portal_name,
            error_message="Address field not in dataset. Use download_all() for full data."
        )

    def search_by_parcel(self, parcel: str) -> ScraperResult:
        """Search permits by parcel number."""
        start_time = time.time()

        if not self._load_data():
            return ScraperResult(
                status=ScraperStatus.FAILED,
                query=parcel,
                search_method=SearchMethod.PARCEL,
                portal_name=self.portal_name,
                error_message="Failed to load dataset"
            )

        records = []
        parcel_lower = parcel.lower()

        for row in self._cached_data:
            parcel_field = self._get_field(row, 'taxparcelnumbers')
            if parcel_field and parcel_lower in parcel_field.lower():
                records.append(self._row_to_record(row))

        elapsed = time.time() - start_time

        return ScraperResult(
            status=ScraperStatus.SUCCESS if records else ScraperStatus.NO_RESULTS,
            records=records,
            query=parcel,
            search_method=SearchMethod.PARCEL,
            portal_name=self.portal_name,
            execution_time_seconds=elapsed,
        )

    def search_by_permit_number(self, permit_number: str) -> ScraperResult:
        """Search by permit number."""
        start_time = time.time()

        if not self._load_data():
            return ScraperResult(
                status=ScraperStatus.FAILED,
                query=permit_number,
                search_method=SearchMethod.PERMIT_NUMBER,
                portal_name=self.portal_name,
                error_message="Failed to load dataset"
            )

        records = []
        permit_lower = permit_number.lower()

        for row in self._cached_data:
            permit_field = self._get_field(row, 'permitnumber')
            if permit_field and permit_lower in permit_field.lower():
                records.append(self._row_to_record(row))

        elapsed = time.time() - start_time

        return ScraperResult(
            status=ScraperStatus.SUCCESS if records else ScraperStatus.NO_RESULTS,
            records=records,
            query=permit_number,
            search_method=SearchMethod.PERMIT_NUMBER,
            portal_name=self.portal_name,
            execution_time_seconds=elapsed,
        )

    def search_by_owner(self, owner_name: str) -> ScraperResult:
        """Search by owner name."""
        start_time = time.time()

        if not self._load_data():
            return ScraperResult(
                status=ScraperStatus.FAILED,
                query=owner_name,
                search_method=SearchMethod.OWNER_NAME,
                portal_name=self.portal_name,
                error_message="Failed to load dataset"
            )

        records = []
        owner_lower = owner_name.lower()

        for row in self._cached_data:
            owner_field = self._get_field(row, 'ownername')
            if owner_field and owner_lower in owner_field.lower():
                records.append(self._row_to_record(row))

        elapsed = time.time() - start_time

        return ScraperResult(
            status=ScraperStatus.SUCCESS if records else ScraperStatus.NO_RESULTS,
            records=records,
            query=owner_name,
            search_method=SearchMethod.OWNER_NAME,
            portal_name=self.portal_name,
            execution_time_seconds=elapsed,
        )

    def download_all(self) -> ScraperResult:
        """
        Download all permits from the dataset.

        This is the recommended method - downloads the complete dataset.

        Returns:
            ScraperResult with all records
        """
        start_time = time.time()

        if not self._load_data():
            return ScraperResult(
                status=ScraperStatus.FAILED,
                query="*",
                search_method=SearchMethod.ADDRESS,
                portal_name=self.portal_name,
                error_message="Failed to load dataset"
            )

        records = [self._row_to_record(row) for row in self._cached_data]
        elapsed = time.time() - start_time

        logger.info(f"Downloaded {len(records)} records in {elapsed:.1f}s")

        return ScraperResult(
            status=ScraperStatus.SUCCESS,
            records=records,
            query="*",
            search_method=SearchMethod.ADDRESS,
            portal_name=self.portal_name,
            execution_time_seconds=elapsed,
        )

    def get_county_stats(self) -> Dict[str, int]:
        """Get record counts by county."""
        if not self._load_data():
            return {}

        stats = {}
        for row in self._cached_data:
            county = self._get_field(row, 'county') or 'Unknown'
            stats[county] = stats.get(county, 0) + 1

        return stats


# For direct testing
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    scraper = DelawareOpenDataScraper()
    print(f"Testing {scraper.portal_name}")
    print(f"Supported methods: {scraper.supported_search_methods}")

    # Test full download
    print("\nDownloading all records...")
    result = scraper.download_all()
    print(f"Status: {result.status}")
    print(f"Records: {result.record_count}")
    print(f"Time: {result.execution_time_seconds:.1f}s")

    if result.records:
        print("\nSample records:")
        for r in result.records[:3]:
            print(f"  {r.permit_number} | {r.county} | {r.owner_name} | {r.system_type}")

        print("\nCounty stats:")
        stats = scraper.get_county_stats()
        for county, count in sorted(stats.items(), key=lambda x: -x[1]):
            print(f"  {county}: {count}")
