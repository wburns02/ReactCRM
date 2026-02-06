#!/usr/bin/env python3
"""
eBridge Full Extraction Scraper with Decodo Proxy Support

Extracts septic permit data (contractor info, system specs) from eBridge portal.
Covers 40+ Florida counties + 2 Texas counties.

FEATURES:
- Decodo datacenter proxy rotation (10 IPs)
- Checkpoint saves for resume capability
- Rate limiting with exponential backoff
- NDJSON output format

USAGE:
    python scrapers/ebridge/ebridge-full-scraper.py
    python scrapers/ebridge/ebridge-full-scraper.py --county hillsborough
    python scrapers/ebridge/ebridge-full-scraper.py --resume

REQUIREMENTS:
    pip install requests beautifulsoup4
"""

import os
import re
import sys
import json
import time
import logging
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from urllib.parse import urlencode

import requests
from bs4 import BeautifulSoup

# ============================================
# CONFIGURATION
# ============================================

# Decodo Proxy Configuration
PROXY_CONFIG = {
    'host': 'dc.decodo.com',
    'ports': [10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009, 10010],
    'username': os.environ.get('DECODO_USER', 'OpusCLI'),
    'password': os.environ.get('DECODO_PASS', 'h+Mpb3hlLt1c5B1mpL'),
    'enabled': True  # Set to False to disable proxy
}

# eBridge Portal Configuration
# eBridge uses redirects - use canonical URL
EBRIDGE_BASE_URL = "https://s1.ebridge.com/ebridge/3.0"
EBRIDGE_LOGIN_URL = f"{EBRIDGE_BASE_URL}/default.aspx"
EBRIDGE_SEARCH_URL = f"{EBRIDGE_BASE_URL}/Search.aspx"

# Extraction Settings
EXTRACTION_CONFIG = {
    'delay_between_requests': 2.0,  # seconds
    'delay_between_counties': 5.0,
    'checkpoint_interval': 500,  # records
    'max_retries': 5,
    'timeout': 60,
    'cooldown_after_block': 300,  # 5 minutes
}

# Output Configuration
OUTPUT_DIR = Path("scrapers/output/ebridge")
CHECKPOINT_FILE = OUTPUT_DIR / "checkpoint.json"

# ============================================
# COUNTY CONFIGURATIONS
# ============================================

# Florida counties with public access credentials
FLORIDA_COUNTIES = {
    "hillsborough": {"cabinet": "HCHD", "user": "public", "pass": "publicuser"},
    "martin": {"cabinet": "Martin County", "user": "Public", "pass": "public"},
    "okeechobee": {"cabinet": "okeechobeechd", "user": "public", "pass": "password"},
    "osceola": {"cabinet": "OSCEOLACHD", "user": "public", "pass": "oscguest"},
    "charlotte": {"cabinet": "CHARLOTTECHD", "user": "public", "pass": "public"},
    "lee": {"cabinet": "LEECHD", "user": "public", "pass": "public"},
    "hernando": {"cabinet": "HERNANDOCHD", "user": "public", "pass": "public"},
    "brevard": {"cabinet": "BREVARDCHD", "user": "public", "pass": "public"},
    "volusia": {"cabinet": "VOLUSIACHD", "user": "public", "pass": "public"},
    "seminole": {"cabinet": "SEMINOLECHD", "user": "public", "pass": "public"},
    "orange": {"cabinet": "ORANGECHD", "user": "public", "pass": "public"},
    "polk": {"cabinet": "POLKCHD", "user": "public", "pass": "public"},
    "pasco": {"cabinet": "PASCOCHD", "user": "public", "pass": "public"},
    "pinellas": {"cabinet": "PINELLASCHD", "user": "public", "pass": "public"},
    "sarasota": {"cabinet": "SARASOTACHD", "user": "public", "pass": "public"},
    "manatee": {"cabinet": "MANATEECHD", "user": "public", "pass": "public"},
    "collier": {"cabinet": "COLLIERCHD", "user": "public", "pass": "public"},
    "palm_beach": {"cabinet": "PBCHD", "user": "public", "pass": "public"},
    "broward": {"cabinet": "BROWARDCHD", "user": "public", "pass": "public"},
    "miami_dade": {"cabinet": "MDCHD", "user": "public", "pass": "public"},
    "clay": {"cabinet": "CLAYCHD", "user": "public", "pass": "public"},
    "walton": {"cabinet": "WALTONCHD", "user": "public", "pass": "public"},
    "okaloosa": {"cabinet": "OKALOOSACHD", "user": "public", "pass": "public"},
    "santa_rosa": {"cabinet": "SANTAROSACHD", "user": "public", "pass": "public"},
    "escambia": {"cabinet": "ESCAMBIACHD", "user": "public", "pass": "public"},
    "leon": {"cabinet": "LEONCHD", "user": "public", "pass": "public"},
    "alachua": {"cabinet": "ALACHUACHD", "user": "public", "pass": "public"},
    "marion": {"cabinet": "MARIONCHD", "user": "public", "pass": "public"},
    "lake": {"cabinet": "LAKECHD", "user": "public", "pass": "public"},
    "sumter": {"cabinet": "SUMTERCHD", "user": "public", "pass": "public"},
    "citrus": {"cabinet": "CITRUSCHD", "user": "public", "pass": "public"},
    "levy": {"cabinet": "LEVYCHD", "user": "public", "pass": "public"},
    "flagler": {"cabinet": "FLAGLERCHD", "user": "public", "pass": "public"},
    "putnam": {"cabinet": "PUTNAMCHD", "user": "public", "pass": "public"},
    "st_johns": {"cabinet": "STJOHNSCHD", "user": "public", "pass": "public"},
    "nassau": {"cabinet": "NASSAUCHD", "user": "public", "pass": "public"},
    "indian_river": {"cabinet": "INDIANRIVERCHD", "user": "public", "pass": "public"},
    "st_lucie": {"cabinet": "STLUCIECHD", "user": "public", "pass": "public"},
    "highlands": {"cabinet": "HIGHLANDSCHD", "user": "public", "pass": "public"},
    "desoto": {"cabinet": "DESOTOCHD", "user": "public", "pass": "public"},
}

# Texas counties
TEXAS_COUNTIES = {
    "potter_tx": {"cabinet": "AmarilloHD", "user": "public", "pass": "public", "state": "TX"},
    "randall_tx": {"cabinet": "AmarilloHD", "user": "public", "pass": "public", "state": "TX"},
}

# Combined county list
ALL_COUNTIES = {**FLORIDA_COUNTIES, **TEXAS_COUNTIES}

# ============================================
# DATA CLASSES
# ============================================

@dataclass
class PermitRecord:
    """Represents a single permit record."""
    permit_number: str
    address: str
    city: str
    county: str
    state: str
    owner_name: Optional[str] = None
    install_date: Optional[str] = None
    system_type: Optional[str] = None
    contractor_name: Optional[str] = None
    contractor_license: Optional[str] = None
    inspection_date: Optional[str] = None
    inspection_result: Optional[str] = None
    pdf_url: Optional[str] = None
    source: str = "eBridge"
    scraped_at: str = ""
    raw_data: Optional[Dict] = None

    def __post_init__(self):
        if not self.scraped_at:
            self.scraped_at = datetime.utcnow().isoformat() + "Z"

    def to_json(self) -> str:
        return json.dumps(asdict(self), ensure_ascii=False)


@dataclass
class Checkpoint:
    """Checkpoint for resume capability."""
    last_county: str
    last_page: int
    completed_counties: List[str]
    total_records: int
    timestamp: str

    @classmethod
    def load(cls) -> Optional['Checkpoint']:
        if CHECKPOINT_FILE.exists():
            with open(CHECKPOINT_FILE) as f:
                data = json.load(f)
                return cls(**data)
        return None

    def save(self):
        CHECKPOINT_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CHECKPOINT_FILE, 'w') as f:
            json.dump(asdict(self), f, indent=2)


# ============================================
# LOGGING
# ============================================

logging.basicConfig(
    level=logging.DEBUG,  # Enable debug logging
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(OUTPUT_DIR / 'scraper.log')
    ]
)
logger = logging.getLogger(__name__)
# Suppress noisy urllib3 debug
logging.getLogger('urllib3').setLevel(logging.WARNING)


# ============================================
# PROXY MANAGEMENT
# ============================================

class ProxyManager:
    """Manages Decodo proxy rotation."""

    def __init__(self):
        self.current_index = 0
        self.consecutive_failures = 0

    def get_proxy(self) -> Optional[Dict[str, str]]:
        """Get next proxy in rotation."""
        if not PROXY_CONFIG['enabled']:
            return None

        port = PROXY_CONFIG['ports'][self.current_index]
        self.current_index = (self.current_index + 1) % len(PROXY_CONFIG['ports'])

        proxy_url = f"http://{PROXY_CONFIG['username']}:{PROXY_CONFIG['password']}@{PROXY_CONFIG['host']}:{port}"

        return {
            'http': proxy_url,
            'https': proxy_url
        }

    def record_success(self):
        """Record successful request."""
        self.consecutive_failures = 0

    def record_failure(self) -> bool:
        """Record failed request. Returns True if cooldown needed."""
        self.consecutive_failures += 1
        if self.consecutive_failures >= 10:
            self.consecutive_failures = 0
            return True  # All ports blocked, need cooldown
        return False


# ============================================
# EBRIDGE SCRAPER
# ============================================

class EBridgeScraper:
    """Main scraper for eBridge portal."""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        })
        self.proxy_manager = ProxyManager()
        self.logged_in_county = None
        self.viewstate = ""
        self.eventvalidation = ""

    def _get_with_retry(self, url: str, **kwargs) -> requests.Response:
        """GET request with retry and proxy rotation."""
        for attempt in range(EXTRACTION_CONFIG['max_retries']):
            try:
                proxy = self.proxy_manager.get_proxy()
                response = self.session.get(
                    url,
                    proxies=proxy,
                    timeout=EXTRACTION_CONFIG['timeout'],
                    **kwargs
                )

                if response.status_code == 403:
                    need_cooldown = self.proxy_manager.record_failure()
                    if need_cooldown:
                        logger.warning("ALL PORTS BLOCKED! Taking 5-minute cooldown...")
                        time.sleep(EXTRACTION_CONFIG['cooldown_after_block'])
                    else:
                        wait = 2 ** attempt * 5
                        logger.warning(f"403 Forbidden. Rotating proxy, waiting {wait}s...")
                        time.sleep(wait)
                    continue

                if response.status_code == 429:
                    wait = 2 ** attempt * 10
                    logger.warning(f"Rate limited. Waiting {wait}s...")
                    time.sleep(wait)
                    continue

                response.raise_for_status()
                self.proxy_manager.record_success()
                return response

            except requests.exceptions.RequestException as e:
                logger.warning(f"Request failed (attempt {attempt + 1}): {e}")
                if attempt < EXTRACTION_CONFIG['max_retries'] - 1:
                    time.sleep(2 ** attempt * 2)

        raise Exception(f"All retry attempts failed for {url}")

    def _post_with_retry(self, url: str, data: Dict, **kwargs) -> requests.Response:
        """POST request with retry and proxy rotation."""
        for attempt in range(EXTRACTION_CONFIG['max_retries']):
            try:
                proxy = self.proxy_manager.get_proxy()
                response = self.session.post(
                    url,
                    data=data,
                    proxies=proxy,
                    timeout=EXTRACTION_CONFIG['timeout'],
                    allow_redirects=True,  # Explicitly follow redirects
                    **kwargs
                )

                if response.status_code in [403, 429]:
                    need_cooldown = self.proxy_manager.record_failure()
                    if need_cooldown:
                        logger.warning("ALL PORTS BLOCKED! Taking 5-minute cooldown...")
                        time.sleep(EXTRACTION_CONFIG['cooldown_after_block'])
                    else:
                        wait = 2 ** attempt * 5
                        logger.warning(f"HTTP {response.status_code}. Rotating proxy, waiting {wait}s...")
                        time.sleep(wait)
                    continue

                response.raise_for_status()
                self.proxy_manager.record_success()
                return response

            except requests.exceptions.RequestException as e:
                logger.warning(f"Request failed (attempt {attempt + 1}): {e}")
                if attempt < EXTRACTION_CONFIG['max_retries'] - 1:
                    time.sleep(2 ** attempt * 2)

        raise Exception(f"All retry attempts failed for {url}")

    def _extract_asp_fields(self, html: str) -> Dict[str, str]:
        """Extract ASP.NET hidden form fields."""
        soup = BeautifulSoup(html, 'html.parser')
        fields = {}

        # Standard ASP.NET fields
        for field_name in ['__VIEWSTATE', '__EVENTVALIDATION', '__VIEWSTATEGENERATOR', '__VIEWSTATEENCRYPTED']:
            field = soup.find('input', {'name': field_name})
            if field:
                fields[field_name] = field.get('value', '')

        # eBridge-specific hidden fields
        for field_name in ['hfCabSet', 'hfCabs', 'hfS', 'hfGuid']:
            field = soup.find('input', {'id': field_name})
            if field:
                fields[field_name] = field.get('value', '')

        return fields

    def login(self, county: str) -> bool:
        """Login to eBridge for a specific county."""
        if county not in ALL_COUNTIES:
            logger.error(f"Unknown county: {county}")
            return False

        config = ALL_COUNTIES[county]
        logger.info(f"Logging into eBridge for {county.upper()}...")

        try:
            # Get login page (use fresh session)
            self.session = requests.Session()
            self.session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            })

            response = self._get_with_retry(EBRIDGE_LOGIN_URL)
            logger.debug(f"Login page URL: {response.url}")
            asp_fields = self._extract_asp_fields(response.text)
            logger.debug(f"ASP.NET fields: __VIEWSTATE={len(asp_fields.get('__VIEWSTATE', ''))} chars")

            # Build login form (field names from eBridge HTML)
            form_data = {
                **asp_fields,
                'tbUserName': config['user'],
                'tbPassword': config['pass'],
                'tbFileCabinet': config['cabinet'],
                'btnLogin': 'Log In',
            }
            # Ensure required hidden fields have values
            form_data['hfS'] = form_data.get('hfS', '') or '1920 X 1080'
            form_data['hfGuid'] = form_data.get('hfGuid', '') or str(int(time.time() * 1000))
            form_data['hfCabSet'] = form_data.get('hfCabSet', '') or config['cabinet']
            form_data['hfCabs'] = form_data.get('hfCabs', '') or ''

            logger.debug(f"Form data keys: {list(form_data.keys())}")

            time.sleep(EXTRACTION_CONFIG['delay_between_requests'])

            # Submit login
            logger.debug(f"Posting to: {EBRIDGE_LOGIN_URL}")
            logger.debug(f"Form fields: tbUserName={form_data['tbUserName']}, tbFileCabinet={form_data['tbFileCabinet']}")
            response = self._post_with_retry(EBRIDGE_LOGIN_URL, form_data)
            logger.debug(f"Login response URL: {response.url}")
            logger.debug(f"Response history: {[r.url for r in response.history]}")

            # Check for success - login redirects to main.aspx on success
            html_lower = response.text.lower()

            # Success indicators: redirected away from login, has main menu
            login_success = (
                'main.aspx' in response.url or
                ('search' in html_lower and 'tbusername' not in html_lower) or
                'logout' in html_lower
            )

            # Failure: still on login page with form fields
            login_failure = (
                'default.aspx' in response.url and
                'tbusername' in html_lower
            )

            if login_success:
                logger.info(f"Successfully logged into {county.upper()}")
                self.logged_in_county = county
                self.last_response = response
                return True
            elif login_failure:
                # Check for error message
                soup = BeautifulSoup(response.text, 'html.parser')
                error_label = soup.find('span', {'id': 'lblLoginMessage'})
                if error_label and error_label.get_text(strip=True):
                    logger.warning(f"Login failed for {county}: {error_label.get_text(strip=True)}")
                else:
                    logger.warning(f"Login failed for {county} - still on login page")
                return False
            else:
                # Unknown state - dump debug info
                logger.warning(f"Login status unclear for {county}, URL: {response.url}")
                soup = BeautifulSoup(response.text, 'html.parser')
                error_label = soup.find('span', {'id': 'lblLoginMessage'})
                if error_label and error_label.get_text(strip=True):
                    logger.debug(f"Error label: {error_label.get_text(strip=True)}")
                logger.debug(f"Page title: {soup.title.string if soup.title else 'N/A'}")
                logger.debug(f"Has search: {'search' in html_lower}, Has logout: {'logout' in html_lower}")
                logger.debug(f"Response text (first 500): {response.text[:500]}")
                return False

        except Exception as e:
            logger.error(f"Login failed for {county}: {e}")
            return False

    def search_all_permits(self, county: str, start_page: int = 1) -> List[PermitRecord]:
        """Search and extract all permits for a county."""
        if self.logged_in_county != county:
            if not self.login(county):
                return []

        state = ALL_COUNTIES[county].get('state', 'FL')
        county_name = county.replace('_', ' ').title()
        if county.endswith('_tx'):
            county_name = county.replace('_tx', '').replace('_', ' ').title()

        all_records = []
        page = start_page

        # Search with wildcard to get all records
        # Try different search strategies
        search_queries = [
            {'program': 'Septic', 'permit': ''},  # All septic
            {'program': 'Septic', 'address': '*'},  # Wildcard
        ]

        for query in search_queries:
            logger.info(f"Searching {county_name} with query: {query}")

            try:
                # Get search page
                response = self._get_with_retry(EBRIDGE_SEARCH_URL)
                asp_fields = self._extract_asp_fields(response.text)

                # Build search form
                form_data = {
                    **asp_fields,
                    'ddlProgram': query.get('program', 'Septic'),
                    'txtPermit': query.get('permit', ''),
                    'txtFacilityName': query.get('facility', ''),
                    'txtAddress': query.get('address', ''),
                    'txtZipcode': query.get('zipcode', ''),
                    'btnSearch': 'Search',
                }

                time.sleep(EXTRACTION_CONFIG['delay_between_requests'])

                # Submit search
                response = self._post_with_retry(EBRIDGE_SEARCH_URL, form_data)

                # Parse results
                records = self._parse_search_results(response.text, county_name, state)
                if records:
                    all_records.extend(records)
                    logger.info(f"Found {len(records)} records in {county_name}")

                    # Check for pagination
                    # TODO: Handle pagination when we understand the structure

            except Exception as e:
                logger.error(f"Search failed for {county}: {e}")

        return all_records

    def _parse_search_results(self, html: str, county: str, state: str) -> List[PermitRecord]:
        """Parse eBridge search results page."""
        records = []
        soup = BeautifulSoup(html, 'html.parser')

        # Look for results table
        results_table = soup.find('table', {'id': re.compile(r'.*gvResults.*', re.I)})
        if not results_table:
            results_table = soup.find('table', class_=re.compile(r'.*grid.*', re.I))
        if not results_table:
            # Try any table with permit data
            for table in soup.find_all('table'):
                if 'permit' in table.get_text().lower():
                    results_table = table
                    break

        if not results_table:
            return records

        # Get header row to identify columns
        headers = []
        header_row = results_table.find('tr')
        if header_row:
            for th in header_row.find_all(['th', 'td']):
                headers.append(th.get_text(strip=True).lower())

        # Parse data rows
        rows = results_table.find_all('tr')[1:]  # Skip header

        for row in rows:
            cells = row.find_all('td')
            if len(cells) < 3:
                continue

            try:
                raw_data = {}
                for i, cell in enumerate(cells):
                    col_name = headers[i] if i < len(headers) else f'col_{i}'
                    raw_data[col_name] = cell.get_text(strip=True)

                # Extract fields
                permit_num = ""
                address = ""
                owner = ""
                doc_date = None
                pdf_url = None
                system_type = None
                contractor = None

                for i, cell in enumerate(cells):
                    text = cell.get_text(strip=True)
                    col_name = headers[i] if i < len(headers) else ""

                    # Identify by column name first
                    if 'permit' in col_name:
                        permit_num = text
                    elif 'address' in col_name:
                        address = text
                    elif 'facility' in col_name or 'owner' in col_name:
                        owner = text
                    elif 'date' in col_name:
                        doc_date = text
                    elif 'type' in col_name or 'system' in col_name:
                        system_type = text
                    elif 'contractor' in col_name:
                        contractor = text

                    # Pattern matching fallback
                    if not permit_num and re.match(r'^[A-Z]{2,3}-?\d{2,}-\d+', text):
                        permit_num = text
                    elif not permit_num and re.match(r'^\d{4,}-\d+', text):
                        permit_num = text

                    if not address and re.search(
                        r'\d+.*(?:st|street|rd|road|ave|avenue|dr|drive|ln|lane|ct|court|blvd|way|pl)',
                        text, re.I
                    ):
                        address = text

                    # Look for PDF link
                    link = cell.find('a', href=True)
                    if link and '.pdf' in link['href'].lower():
                        href = link['href']
                        if not href.startswith('http'):
                            href = f"{EBRIDGE_BASE_URL}/{href.lstrip('/')}"
                        pdf_url = href

                # Use fallbacks
                if not permit_num and cells:
                    permit_num = cells[0].get_text(strip=True)
                if not owner and len(cells) > 1:
                    owner = cells[1].get_text(strip=True)
                if not address and len(cells) > 2:
                    address = cells[2].get_text(strip=True)

                # Parse city from address
                city = ""
                if address:
                    # Common FL city patterns
                    city_match = re.search(r',\s*([A-Za-z\s]+)(?:,|\s+FL|\s+\d{5})', address)
                    if city_match:
                        city = city_match.group(1).strip()

                if permit_num:
                    record = PermitRecord(
                        permit_number=permit_num,
                        address=address,
                        city=city,
                        county=county,
                        state=state,
                        owner_name=owner if owner else None,
                        install_date=doc_date,
                        system_type=system_type,
                        contractor_name=contractor,
                        pdf_url=pdf_url,
                        raw_data=raw_data
                    )
                    records.append(record)

            except Exception as e:
                logger.warning(f"Failed to parse row: {e}")
                continue

        return records


# ============================================
# MAIN EXTRACTION
# ============================================

def run_extraction(
    counties: Optional[List[str]] = None,
    resume: bool = False
):
    """Run full extraction across counties."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load checkpoint if resuming
    checkpoint = None
    completed_counties = []
    total_records = 0

    if resume:
        checkpoint = Checkpoint.load()
        if checkpoint:
            completed_counties = checkpoint.completed_counties
            total_records = checkpoint.total_records
            logger.info(f"Resuming from checkpoint: {checkpoint.last_county}, {total_records} records")

    # Determine counties to process
    if counties:
        target_counties = [c for c in counties if c in ALL_COUNTIES]
    else:
        target_counties = list(ALL_COUNTIES.keys())

    # Filter out completed
    remaining_counties = [c for c in target_counties if c not in completed_counties]

    logger.info(f"Starting extraction for {len(remaining_counties)} counties")
    logger.info(f"Proxy enabled: {PROXY_CONFIG['enabled']}")

    scraper = EBridgeScraper()

    for county in remaining_counties:
        logger.info(f"\n{'='*60}")
        logger.info(f"Processing: {county.upper()}")
        logger.info(f"{'='*60}")

        try:
            # Extract records
            records = scraper.search_all_permits(county)

            if records:
                # Save to NDJSON
                state = ALL_COUNTIES[county].get('state', 'FL')
                timestamp = datetime.now().strftime("%Y%m%d")
                output_file = OUTPUT_DIR / f"{state.lower()}_{county}_permits_{timestamp}.ndjson"

                with open(output_file, 'a') as f:
                    for record in records:
                        f.write(record.to_json() + '\n')

                total_records += len(records)
                logger.info(f"Saved {len(records)} records to {output_file}")

            completed_counties.append(county)

            # Save checkpoint
            checkpoint = Checkpoint(
                last_county=county,
                last_page=0,
                completed_counties=completed_counties,
                total_records=total_records,
                timestamp=datetime.utcnow().isoformat()
            )
            checkpoint.save()

            # Delay between counties
            time.sleep(EXTRACTION_CONFIG['delay_between_counties'])

        except Exception as e:
            logger.error(f"Failed to process {county}: {e}")
            # Save checkpoint before continuing
            checkpoint = Checkpoint(
                last_county=county,
                last_page=0,
                completed_counties=completed_counties,
                total_records=total_records,
                timestamp=datetime.utcnow().isoformat()
            )
            checkpoint.save()

    logger.info(f"\n{'='*60}")
    logger.info(f"EXTRACTION COMPLETE")
    logger.info(f"Total records: {total_records}")
    logger.info(f"Counties processed: {len(completed_counties)}")
    logger.info(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(description='eBridge Full Extraction Scraper')
    parser.add_argument('--county', type=str, help='Specific county to scrape')
    parser.add_argument('--resume', action='store_true', help='Resume from checkpoint')
    parser.add_argument('--list', action='store_true', help='List available counties')
    parser.add_argument('--no-proxy', action='store_true', help='Disable proxy')

    args = parser.parse_args()

    if args.list:
        print("Available counties:")
        print("\nFlorida:")
        for county in FLORIDA_COUNTIES:
            print(f"  - {county}")
        print("\nTexas:")
        for county in TEXAS_COUNTIES:
            print(f"  - {county}")
        return

    if args.no_proxy:
        PROXY_CONFIG['enabled'] = False

    counties = [args.county] if args.county else None
    run_extraction(counties=counties, resume=args.resume)


if __name__ == "__main__":
    main()
