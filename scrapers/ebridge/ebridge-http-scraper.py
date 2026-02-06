#!/usr/bin/env python3
"""
eBridge HTTP-Based Scraper with Pagination

Uses direct HTTP requests instead of browser automation.
Handles the 1000-record limit by paginating via doc types and date ranges.

USAGE:
    python scrapers/ebridge/ebridge-http-scraper.py
    python scrapers/ebridge/ebridge-http-scraper.py --county hillsborough
    python scrapers/ebridge/ebridge-http-scraper.py --full  # Full extraction with pagination
"""

import os
import re
import json
import logging
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set
from dataclasses import dataclass, asdict
from urllib.parse import urljoin, parse_qs, urlparse

import random
import time
import requests
from bs4 import BeautifulSoup

# ============================================
# CONFIGURATION
# ============================================

EBRIDGE_BASE = "https://s1.ebridge-solutions.com/ebridge/3.0"
LOGIN_URL = f"{EBRIDGE_BASE}/default.aspx"

# Use absolute path or script directory for output
SCRIPT_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = SCRIPT_DIR.parent / "output" / "ebridge"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Doc types to search through for pagination
DOC_TYPES = [
    "Permit",
    "File",
    "Inspection",
    "Application",
    "Plan Review",
    "Correspondence",
    "Complaint",
    "Enforcement",
]

# Years to search through if hitting limits
YEARS = list(range(1990, 2027))

# County credentials - researched Jan 2026
COUNTIES = {
    # VERIFIED WORKING (tested)
    "hillsborough": {"cabinet": "HCHD", "user": "public", "pass": "publicuser"},
    "osceola": {"cabinet": "OSCEOLACHD", "user": "public", "pass": "oscguest"},
    "okeechobee": {"cabinet": "okeechobeechd", "user": "public", "pass": "password"},
    "martin": {"cabinet": "Martin County", "user": "Public", "pass": "public"},
    # NEW - from web research (need testing)
    "pinellas": {"cabinet": "PINCHD", "user": "public", "pass": "public"},
    "pasco": {"cabinet": "PASCODOH", "user": "public", "pass": "public"},
    "walton": {"cabinet": "WCHD EH", "user": "PUBLIC", "pass": "WALTONCHD"},
    "st_lucie": {"cabinet": "SLCDOH", "user": "public", "pass": "health"},
    "clay": {"cabinet": "CLAY DOH", "user": "Public", "pass": "Publicguest"},
    "collier": {"cabinet": "COLLIEREVH", "user": "public", "pass": "public"},
    "hernando": {"cabinet": "HERNANDODOH", "user": "public", "pass": "public"},
}

# Logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class PermitRecord:
    permit_number: str
    address: str
    county: str
    state: str = "FL"
    owner_name: Optional[str] = None
    zipcode: Optional[str] = None
    doc_date: Optional[str] = None
    doc_type: Optional[str] = None
    source: str = "eBridge"
    scraped_at: str = ""

    def __post_init__(self):
        if not self.scraped_at:
            self.scraped_at = datetime.now().isoformat() + "Z"


class EBridgeHTTPScraper:
    """HTTP-based eBridge scraper using requests with pagination support."""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        })
        self.guid = None
        self.base_url = None  # Will be set after login based on redirect
        self.search_url = None
        self.seen_permits: Set[str] = set()  # Track duplicates

    def login(self, county: str) -> bool:
        """Login to eBridge for a specific county."""
        if county not in COUNTIES:
            logger.error(f"Unknown county: {county}")
            return False

        config = COUNTIES[county]
        logger.info(f"Logging into eBridge for {county.upper()}...")

        try:
            # Get login page to extract form tokens
            # Note: may redirect from ebridge-solutions.com to ebridge.com
            resp = self.session.get(LOGIN_URL)
            resp.raise_for_status()
            actual_login_url = resp.url  # Use the actual URL after any redirects
            logger.debug(f"Login page URL (after redirects): {actual_login_url}")
            soup = BeautifulSoup(resp.text, 'html.parser')

            # Extract ASP.NET form tokens (login page may not have EventValidation)
            viewstate = soup.find('input', {'name': '__VIEWSTATE'})
            viewstate_gen = soup.find('input', {'name': '__VIEWSTATEGENERATOR'})
            viewstate_enc = soup.find('input', {'name': '__VIEWSTATEENCRYPTED'})
            event_validation = soup.find('input', {'name': '__EVENTVALIDATION'})
            hf_s = soup.find('input', {'name': 'hfS'})
            hf_guid = soup.find('input', {'name': 'hfGuid'})

            if not viewstate:
                logger.error("Could not find __VIEWSTATE token")
                logger.debug(f"Page content preview: {resp.text[:500]}")
                return False

            # Build login form data
            form_data = {
                '__VIEWSTATE': viewstate.get('value', ''),
                '__VIEWSTATEGENERATOR': viewstate_gen.get('value', '') if viewstate_gen else '',
                'tbUserName': config['user'],
                'tbPassword': config['pass'],
                'tbFileCabinet': config['cabinet'],
                'btnLogin': 'Login',
            }

            # Add optional fields if present
            if viewstate_enc:
                form_data['__VIEWSTATEENCRYPTED'] = viewstate_enc.get('value', '')
            if event_validation:
                form_data['__EVENTVALIDATION'] = event_validation.get('value', '')

            # Generate GUID like JavaScript GetGUID(): timestamp + random(1-1000)
            # This is required - the JS generates this before form submit
            generated_guid = str(int(time.time() * 1000)) + str(random.randint(1, 1000))
            form_data['hfGuid'] = generated_guid
            self.guid = generated_guid  # Save for later use

            # Set screen dimensions (hfS) - simulates JavaScript
            form_data['hfS'] = '1920 X 1080'

            # Submit login to the actual URL (after any redirects)
            logger.debug(f"Posting to: {actual_login_url}")
            logger.debug(f"Form data keys: {list(form_data.keys())}")
            logger.debug(f"Generated GUID: {generated_guid}")
            resp = self.session.post(actual_login_url, data=form_data, allow_redirects=True)
            logger.info(f"Response URL: {resp.url}")
            logger.info(f"Response status: {resp.status_code}")

            # Check if we got redirected to main.aspx
            if 'main.aspx' in resp.url:
                logger.info(f"Successfully logged into {county.upper()}")

                # Save the base URL from the actual server we're connected to
                parsed = urlparse(resp.url)
                self.base_url = f"{parsed.scheme}://{parsed.netloc}/ebridge/3.0"
                logger.info(f"Base URL: {self.base_url}")

                # Extract GUID from the main page (use the one from iframe if available)
                soup = BeautifulSoup(resp.text, 'html.parser')
                iframe = soup.find('iframe', {'id': 'ifMain'}) or soup.find('iframe', src=True)
                if iframe and iframe.get('src'):
                    parsed_iframe = urlparse(iframe['src'])
                    params = parse_qs(parsed_iframe.query)
                    if 'guid' in params:
                        self.guid = params['guid'][0]
                        logger.info(f"Using iframe GUID: {self.guid}")

                # Set search URL for later use
                self.search_url = f"{self.base_url}/retrieve/search.aspx?search=new&guid={self.guid}"
                return True
            else:
                logger.warning(f"Login failed for {county} - not redirected to main page")
                # Save response for debugging
                with open(OUTPUT_DIR / f"debug_{county}_login_response.html", 'w') as f:
                    f.write(resp.text)
                return False

        except Exception as e:
            logger.error(f"Login error for {county}: {e}")
            return False

    def _get_search_tokens(self) -> Optional[Dict]:
        """Get fresh form tokens from search page."""
        try:
            resp = self.session.get(self.search_url)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'html.parser')

            viewstate = soup.find('input', {'name': '__VIEWSTATE'})
            viewstate_gen = soup.find('input', {'name': '__VIEWSTATEGENERATOR'})
            event_validation = soup.find('input', {'name': '__EVENTVALIDATION'})

            if not viewstate:
                return None

            return {
                '__VIEWSTATE': viewstate.get('value', ''),
                '__VIEWSTATEGENERATOR': viewstate_gen.get('value', '') if viewstate_gen else '',
                '__EVENTVALIDATION': event_validation.get('value', '') if event_validation else '',
            }
        except Exception as e:
            logger.error(f"Error getting search tokens: {e}")
            return None

    def search(self, county: str, doc_type: str = "", start_date: str = "", end_date: str = "") -> List[PermitRecord]:
        """Search for OSTDS permits with optional filters."""
        records = []

        if not self.guid or not self.base_url:
            logger.error("No session GUID or base URL - must login first")
            return records

        try:
            # Get fresh form tokens
            tokens = self._get_search_tokens()
            if not tokens:
                logger.error("Could not get search form tokens")
                return records

            # Build search form data
            form_data = {
                **tokens,
                'index1': 'OSTDS',
                'index1_new_value': 'false',
                'index2': '',
                'index3': '',
                'index4': '',
                'index5': '',
                'index6': '',
                'index7': doc_type,
                'index7_new_value': 'false',
                'start_date': start_date,
                'end_date': end_date,
                'text': '',
                'btnSearch': 'Search',
            }

            # Submit search
            search_desc = f"OSTDS"
            if doc_type:
                search_desc += f" ({doc_type})"
            if start_date or end_date:
                search_desc += f" [{start_date or '*'} - {end_date or '*'}]"
            logger.info(f"Searching: {search_desc}")

            resp = self.session.post(self.search_url, data=form_data, allow_redirects=True)
            soup = BeautifulSoup(resp.text, 'html.parser')

            if 'No results found' in resp.text:
                logger.debug(f"No results for {search_desc}")
                return records

            # Parse results
            records = self._parse_results(soup, county)

            # Filter duplicates
            new_records = []
            for r in records:
                key = f"{r.permit_number}|{r.doc_type}|{r.doc_date}"
                if key not in self.seen_permits:
                    self.seen_permits.add(key)
                    new_records.append(r)

            logger.info(f"Found {len(records)} records, {len(new_records)} new")
            return new_records

        except Exception as e:
            logger.error(f"Search error: {e}")
            import traceback
            logger.debug(traceback.format_exc())
            return records

    def search_ostds(self, county: str) -> List[PermitRecord]:
        """Search for OSTDS permits (basic search, no pagination)."""
        return self.search(county)

    def extract_all(self, county: str) -> List[PermitRecord]:
        """Extract all records using pagination strategies."""
        all_records = []
        self.seen_permits.clear()

        # Strategy 1: Search by each doc type
        logger.info(f"Paginating by doc type for {county.upper()}")
        for doc_type in DOC_TYPES:
            records = self.search(county, doc_type=doc_type)
            all_records.extend(records)

            # If we hit 1000 (the limit), paginate by year
            if len(records) >= 1000:
                logger.info(f"Hit 1000 limit for {doc_type}, paginating by year...")
                for year in YEARS:
                    start = f"01/01/{year}"
                    end = f"12/31/{year}"
                    year_records = self.search(county, doc_type=doc_type, start_date=start, end_date=end)
                    all_records.extend(year_records)

                    # If still hitting 1000, paginate by quarter
                    if len(year_records) >= 1000:
                        logger.info(f"Hit 1000 limit for {doc_type} {year}, paginating by quarter...")
                        quarters = [
                            (f"01/01/{year}", f"03/31/{year}"),
                            (f"04/01/{year}", f"06/30/{year}"),
                            (f"07/01/{year}", f"09/30/{year}"),
                            (f"10/01/{year}", f"12/31/{year}"),
                        ]
                        for q_start, q_end in quarters:
                            q_records = self.search(county, doc_type=doc_type, start_date=q_start, end_date=q_end)
                            all_records.extend(q_records)
                            time.sleep(0.3)

                    time.sleep(0.3)

            time.sleep(0.2)

        # Strategy 2: Search all without doc type filter (catches misc types)
        logger.info(f"Searching all doc types combined")
        records = self.search(county)
        all_records.extend(records)

        # Deduplicate final results
        unique_records = []
        seen = set()
        for r in all_records:
            key = f"{r.permit_number}|{r.doc_type}|{r.doc_date}"
            if key not in seen:
                seen.add(key)
                unique_records.append(r)

        logger.info(f"Total unique records for {county}: {len(unique_records)}")
        return unique_records

    def _parse_results(self, soup: BeautifulSoup, county: str) -> List[PermitRecord]:
        """Parse results table from search response."""
        records = []

        # Find results table
        tables = soup.find_all('table')
        if not tables:
            logger.warning("No tables found in results")
            return records

        # Usually the results table is the main one with many rows
        for table in tables:
            rows = table.find_all('tr')
            if len(rows) < 2:
                continue

            logger.info(f"Found table with {len(rows)} rows")

            # Skip header row
            for row in rows[1:]:
                cells = row.find_all('td')
                if len(cells) < 6:
                    continue

                # Extract cell values
                cell_texts = [cell.get_text(strip=True) for cell in cells]

                # Log first few rows for debugging
                if len(records) < 3:
                    logger.debug(f"Row: {cell_texts[:8]}")

                # Column mapping (varies by county):
                # Hillsborough: 0=row#, 1=checkbox, 2=Program, 3=Permit#, 4=Name, 5=Address, 6=Zip, 7=DocDate, 8=DocType
                # Try to identify permit number (numeric, 5-10 chars)
                permit_idx = None
                for i, text in enumerate(cell_texts):
                    if text and len(text) >= 4 and any(c.isdigit() for c in text):
                        # Check if it looks like a permit number
                        if text != 'OSTDS' and not text.startswith('http'):
                            permit_idx = i
                            break

                if permit_idx is None or permit_idx >= len(cell_texts):
                    continue

                permit_num = cell_texts[permit_idx] if permit_idx < len(cell_texts) else ""
                name = cell_texts[permit_idx + 1] if permit_idx + 1 < len(cell_texts) else ""
                address = cell_texts[permit_idx + 2] if permit_idx + 2 < len(cell_texts) else ""
                zipcode = cell_texts[permit_idx + 3] if permit_idx + 3 < len(cell_texts) else ""
                doc_date = cell_texts[permit_idx + 4] if permit_idx + 4 < len(cell_texts) else ""
                doc_type = cell_texts[permit_idx + 5] if permit_idx + 5 < len(cell_texts) else ""

                if permit_num:
                    record = PermitRecord(
                        permit_number=permit_num,
                        address=address,
                        county=county.replace("_", " ").title(),
                        owner_name=name,
                        zipcode=zipcode,
                        doc_date=doc_date,
                        doc_type=doc_type
                    )
                    records.append(record)

            # If we found records, stop looking at other tables
            if records:
                break

        return records

    def save_records(self, records: List[PermitRecord], county: str):
        """Save records to NDJSON file."""
        if not records:
            return

        date_str = datetime.now().strftime("%Y%m%d")
        filename = OUTPUT_DIR / f"fl_{county}_permits_{date_str}.ndjson"

        with open(filename, 'w') as f:
            for record in records:
                f.write(json.dumps(asdict(record)) + '\n')

        logger.info(f"Saved {len(records)} records to {filename}")


def main():
    parser = argparse.ArgumentParser(description='eBridge HTTP Scraper')
    parser.add_argument('--county', help='Single county to scrape')
    parser.add_argument('--list', action='store_true', help='List available counties')
    parser.add_argument('--full', action='store_true', help='Full extraction with pagination (bypasses 1000 limit)')
    args = parser.parse_args()

    if args.list:
        print("Available counties:")
        for county, config in COUNTIES.items():
            print(f"  {county}: {config['cabinet']}")
        return

    counties = [args.county] if args.county else list(COUNTIES.keys())
    total_records = 0

    for county in counties:
        logger.info(f"\n{'='*60}")
        logger.info(f"Processing: {county.upper()}")
        logger.info(f"{'='*60}")

        # Create fresh scraper for each county
        scraper = EBridgeHTTPScraper()

        if scraper.login(county):
            if args.full:
                # Full extraction with pagination
                records = scraper.extract_all(county)
            else:
                # Quick search (max 1000 records)
                records = scraper.search_ostds(county)

            if records:
                # Save with different filename for full extraction
                if args.full:
                    date_str = datetime.now().strftime("%Y%m%d")
                    filename = OUTPUT_DIR / f"fl_{county}_full_{date_str}.ndjson"
                    with open(filename, 'w') as f:
                        for record in records:
                            f.write(json.dumps(asdict(record)) + '\n')
                    logger.info(f"Saved {len(records)} records to {filename}")
                else:
                    scraper.save_records(records, county)

                total_records += len(records)
        else:
            logger.warning(f"Skipping {county} - login failed")

    logger.info(f"\n{'='*60}")
    logger.info(f"COMPLETE - Total records: {total_records}")
    logger.info(f"{'='*60}")


if __name__ == "__main__":
    main()
