"""
Base Scraper Class for National Septic Permit OCR System

This module provides the abstract base class that all septic permit scrapers
must implement, along with common data structures and utilities.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import json
import logging
import time
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


class SearchMethod(Enum):
    """Supported search methods for permit lookups."""
    ADDRESS = "address"
    PARCEL = "parcel"
    PERMIT_NUMBER = "permit_number"
    OWNER_NAME = "owner_name"


class ScraperStatus(Enum):
    """Status codes for scraper operations."""
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"
    BLOCKED = "blocked"
    CAPTCHA = "captcha"
    LOGIN_REQUIRED = "login_required"
    NO_RESULTS = "no_results"


@dataclass
class SepticRecord:
    """Standard data structure for a septic permit record."""

    # Required fields
    permit_number: str
    state: str

    # Location fields
    address: Optional[str] = None
    city: Optional[str] = None
    county: Optional[str] = None
    zip_code: Optional[str] = None
    parcel_number: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # Owner/applicant info
    owner_name: Optional[str] = None
    applicant_name: Optional[str] = None
    contractor_name: Optional[str] = None

    # System details
    install_date: Optional[datetime] = None
    permit_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    system_type: Optional[str] = None
    tank_size_gallons: Optional[int] = None
    drainfield_size_sqft: Optional[int] = None
    bedrooms: Optional[int] = None
    daily_flow_gpd: Optional[int] = None

    # Document links
    pdf_url: Optional[str] = None
    permit_url: Optional[str] = None

    # Metadata
    source_portal: Optional[str] = None
    scraped_at: datetime = field(default_factory=datetime.now)
    raw_data: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert record to dictionary, handling datetime serialization."""
        data = asdict(self)
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
        return data

    def to_json(self) -> str:
        """Convert record to JSON string."""
        return json.dumps(self.to_dict(), indent=2)


@dataclass
class ScraperResult:
    """Result object returned by scraper operations."""

    status: ScraperStatus
    records: List[SepticRecord] = field(default_factory=list)
    query: str = ""
    search_method: SearchMethod = SearchMethod.ADDRESS
    portal_name: str = ""
    execution_time_seconds: float = 0.0
    error_message: Optional[str] = None
    warnings: List[str] = field(default_factory=list)

    @property
    def record_count(self) -> int:
        return len(self.records)

    @property
    def is_successful(self) -> bool:
        return self.status in [ScraperStatus.SUCCESS, ScraperStatus.PARTIAL]


class BaseScraper(ABC):
    """
    Abstract base class for all septic permit scrapers.

    All platform-specific and state-specific scrapers must inherit from this
    class and implement the required abstract methods.
    """

    def __init__(
        self,
        portal_name: str,
        state: str,
        use_playwright: bool = False,
        headless: bool = True,
        request_delay: float = 1.0,
        max_retries: int = 3,
        timeout: int = 30
    ):
        """
        Initialize the base scraper.

        Args:
            portal_name: Human-readable name for this portal
            state: Two-letter state code
            use_playwright: Whether to use Playwright for browser automation
            headless: Run browser in headless mode (if using Playwright)
            request_delay: Delay between requests in seconds
            max_retries: Maximum number of retry attempts
            timeout: Request timeout in seconds
        """
        self.portal_name = portal_name
        self.state = state
        self.use_playwright = use_playwright
        self.headless = headless
        self.request_delay = request_delay
        self.max_retries = max_retries
        self.timeout = timeout

        self.logger = logging.getLogger(f"scraper.{portal_name}")
        self.browser = None
        self.page = None
        self.session = None

        self._results: List[SepticRecord] = []

    @property
    @abstractmethod
    def base_url(self) -> str:
        """Return the base URL for this portal."""
        pass

    @property
    @abstractmethod
    def supported_search_methods(self) -> List[SearchMethod]:
        """Return list of search methods supported by this portal."""
        pass

    @abstractmethod
    def search_by_address(self, address: str) -> ScraperResult:
        """
        Search for permits by address.

        Args:
            address: Full or partial address string

        Returns:
            ScraperResult containing found records
        """
        pass

    @abstractmethod
    def search_by_parcel(self, parcel: str) -> ScraperResult:
        """
        Search for permits by parcel number.

        Args:
            parcel: Parcel/APN number string

        Returns:
            ScraperResult containing found records
        """
        pass

    def search_by_permit_number(self, permit_number: str) -> ScraperResult:
        """
        Search for permits by permit number.

        Args:
            permit_number: Permit number string

        Returns:
            ScraperResult containing found records

        Note: Not all portals support this method. Override if supported.
        """
        return ScraperResult(
            status=ScraperStatus.FAILED,
            search_method=SearchMethod.PERMIT_NUMBER,
            query=permit_number,
            portal_name=self.portal_name,
            error_message="Permit number search not supported by this portal"
        )

    def search_by_owner(self, owner_name: str) -> ScraperResult:
        """
        Search for permits by owner name.

        Args:
            owner_name: Owner name string

        Returns:
            ScraperResult containing found records

        Note: Not all portals support this method. Override if supported.
        """
        return ScraperResult(
            status=ScraperStatus.FAILED,
            search_method=SearchMethod.OWNER_NAME,
            query=owner_name,
            portal_name=self.portal_name,
            error_message="Owner name search not supported by this portal"
        )

    def download_pdf(
        self,
        record: SepticRecord,
        output_dir: str
    ) -> Optional[str]:
        """
        Download PDF associated with a permit record.

        Args:
            record: SepticRecord with pdf_url
            output_dir: Directory to save the PDF

        Returns:
            Path to downloaded file, or None if failed
        """
        if not record.pdf_url:
            self.logger.warning(f"No PDF URL for permit {record.permit_number}")
            return None

        os.makedirs(output_dir, exist_ok=True)
        filename = f"{record.permit_number.replace('/', '_')}.pdf"
        filepath = os.path.join(output_dir, filename)

        try:
            # Implementation depends on whether using requests or playwright
            self.logger.info(f"Downloading PDF to {filepath}")
            # Subclasses should implement actual download
            return filepath
        except Exception as e:
            self.logger.error(f"Failed to download PDF: {e}")
            return None

    def run_test(
        self,
        test_queries: List[str],
        search_method: SearchMethod = SearchMethod.ADDRESS,
        min_records: int = 15
    ) -> Dict[str, Any]:
        """
        Run a test suite against this portal.

        Args:
            test_queries: List of test search queries
            search_method: Which search method to use
            min_records: Minimum records needed for success

        Returns:
            Test results dictionary
        """
        start_time = time.time()
        all_records: List[SepticRecord] = []
        errors: List[str] = []

        self.logger.info(f"Starting test run with {len(test_queries)} queries")

        for query in test_queries:
            self.logger.info(f"Testing query: {query}")

            try:
                if search_method == SearchMethod.ADDRESS:
                    result = self.search_by_address(query)
                elif search_method == SearchMethod.PARCEL:
                    result = self.search_by_parcel(query)
                elif search_method == SearchMethod.PERMIT_NUMBER:
                    result = self.search_by_permit_number(query)
                else:
                    result = self.search_by_owner(query)

                if result.is_successful:
                    all_records.extend(result.records)
                    self.logger.info(f"Found {result.record_count} records")
                else:
                    errors.append(f"{query}: {result.error_message}")

            except Exception as e:
                errors.append(f"{query}: {str(e)}")
                self.logger.error(f"Error on query '{query}': {e}")

            # Respect rate limiting
            time.sleep(self.request_delay)

        # Deduplicate by permit number
        unique_records = {r.permit_number: r for r in all_records}
        unique_count = len(unique_records)

        elapsed = time.time() - start_time
        success = unique_count >= min_records

        return {
            "portal_name": self.portal_name,
            "state": self.state,
            "test_passed": success,
            "total_queries": len(test_queries),
            "total_records": len(all_records),
            "unique_records": unique_count,
            "min_required": min_records,
            "execution_time_seconds": elapsed,
            "errors": errors,
            "sample_records": [r.to_dict() for r in list(unique_records.values())[:3]]
        }

    def save_results(self, records: List[SepticRecord], output_path: str) -> None:
        """
        Save scraped records to JSON file.

        Args:
            records: List of SepticRecord objects
            output_path: Path to output JSON file
        """
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        data = {
            "portal_name": self.portal_name,
            "state": self.state,
            "scraped_at": datetime.now().isoformat(),
            "record_count": len(records),
            "records": [r.to_dict() for r in records]
        }

        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2)

        self.logger.info(f"Saved {len(records)} records to {output_path}")

    async def setup_browser(self) -> None:
        """Initialize Playwright browser (if needed)."""
        if not self.use_playwright:
            return

        try:
            from playwright.async_api import async_playwright

            playwright = await async_playwright().start()
            self.browser = await playwright.chromium.launch(
                headless=self.headless
            )
            self.page = await self.browser.new_page()
            self.logger.info("Browser initialized")
        except ImportError:
            self.logger.error("Playwright not installed. Run: pip install playwright && playwright install")
            raise

    async def close_browser(self) -> None:
        """Close Playwright browser."""
        if self.browser:
            await self.browser.close()
            self.browser = None
            self.page = None

    def _delay(self) -> None:
        """Apply request delay for rate limiting."""
        time.sleep(self.request_delay)

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} portal='{self.portal_name}' state='{self.state}'>"


# Utility functions

def validate_state_code(code: str) -> bool:
    """Validate a two-letter US state code."""
    valid_codes = {
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
        'DC', 'PR', 'VI', 'GU', 'AS', 'MP'
    }
    return code.upper() in valid_codes


def normalize_address(address: str) -> str:
    """Normalize an address string for consistent searching."""
    # Basic normalization - expand as needed
    address = address.strip()
    replacements = {
        'street': 'st',
        'avenue': 'ave',
        'boulevard': 'blvd',
        'drive': 'dr',
        'lane': 'ln',
        'road': 'rd',
        'court': 'ct',
        'circle': 'cir',
        'place': 'pl',
    }
    lower_addr = address.lower()
    for full, abbrev in replacements.items():
        lower_addr = lower_addr.replace(full, abbrev)
    return lower_addr
