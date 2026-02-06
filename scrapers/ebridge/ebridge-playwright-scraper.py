#!/usr/bin/env python3
"""
eBridge Playwright-Based Scraper

Uses Playwright browser automation to handle eBridge's iframe-based architecture.
More reliable than pure HTTP requests due to JavaScript-driven navigation.

USAGE:
    python scrapers/ebridge/ebridge-playwright-scraper.py
    python scrapers/ebridge/ebridge-playwright-scraper.py --county hillsborough
    python scrapers/ebridge/ebridge-playwright-scraper.py --headless

REQUIREMENTS:
    pip install playwright
    playwright install chromium
"""

import os
import json
import time
import asyncio
import argparse
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict

from playwright.async_api import async_playwright, Page, Frame

# ============================================
# CONFIGURATION
# ============================================

# Note: Some counties may use ebridge-solutions.com instead of ebridge.com
# Both URLs redirect to the same system
EBRIDGE_URL = "https://s1.ebridge-solutions.com/ebridge/3.0/default.aspx"

OUTPUT_DIR = Path("scrapers/output/ebridge")
CHECKPOINT_FILE = OUTPUT_DIR / "playwright_checkpoint.json"

# County configurations - VERIFIED WORKING only
# Tested on 2026-01-20 - only these 4 counties have working public credentials
COUNTIES = {
    # VERIFIED WORKING (unique passwords)
    "hillsborough": {"cabinet": "HCHD", "user": "public", "pass": "publicuser"},
    "osceola": {"cabinet": "OSCEOLACHD", "user": "public", "pass": "oscguest"},
    "okeechobee": {"cabinet": "okeechobeechd", "user": "public", "pass": "password"},
    "martin": {"cabinet": "Martin County", "user": "Public", "pass": "public"},
    # Pinellas - uses s2.ebridge.com server and PINCHD cabinet
    # Needs server switch logic to work
    "pinellas": {"cabinet": "PINCHD", "user": "public", "pass": "public", "server": "s2"},
}

# ============================================
# LOGGING
# ============================================

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(OUTPUT_DIR / 'playwright_scraper.log')
    ]
)
logger = logging.getLogger(__name__)
# Reduce Playwright internal logging
logging.getLogger('asyncio').setLevel(logging.WARNING)


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
    doc_type: Optional[str] = None
    pdf_url: Optional[str] = None
    source: str = "eBridge"
    scraped_at: str = ""
    raw_data: Optional[Dict] = None

    def __post_init__(self):
        if not self.scraped_at:
            self.scraped_at = datetime.now().isoformat() + "Z"

    def to_json(self) -> str:
        return json.dumps(asdict(self), ensure_ascii=False)


# ============================================
# SCRAPER
# ============================================

class EBridgePlaywrightScraper:
    """Playwright-based scraper for eBridge portal."""

    def __init__(self, headless: bool = True):
        self.headless = headless
        self.browser = None
        self.context = None
        self.page = None

    async def start(self):
        """Initialize browser."""
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(
            headless=self.headless,
            slow_mo=100 if not self.headless else 0
        )
        self.context = await self.browser.new_context(
            viewport={"width": 1400, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        self.page = await self.context.new_page()
        logger.info(f"Browser started (headless={self.headless})")

    async def stop(self):
        """Close browser."""
        if self.browser:
            await self.browser.close()
            logger.info("Browser closed")

    async def login(self, county: str) -> bool:
        """Login to eBridge for a specific county."""
        if county not in COUNTIES:
            logger.error(f"Unknown county: {county}")
            return False

        config = COUNTIES[county]
        logger.info(f"Logging into eBridge for {county.upper()}...")

        try:
            # Clear cookies and navigate to fresh login page
            await self.context.clear_cookies()
            await self.page.goto(EBRIDGE_URL, wait_until="domcontentloaded")
            await self.page.wait_for_timeout(2000)  # Allow page to fully render
            await self.page.wait_for_load_state("networkidle")

            # Wait for login form to be visible
            await self.page.wait_for_selector("#tbUserName", timeout=10000)

            # Fill login form
            await self.page.fill("#tbUserName", config["user"])
            await self.page.fill("#tbPassword", config["pass"])
            await self.page.fill("#tbFileCabinet", config["cabinet"])

            # Click login
            await self.page.click("#btnLogin")
            await self.page.wait_for_timeout(3000)
            await self.page.wait_for_load_state("networkidle")

            # Check if we're on main page
            if "main.aspx" in self.page.url:
                logger.info(f"Successfully logged into {county.upper()}")
                return True
            else:
                # Check for error message
                error_elem = await self.page.query_selector(".error, .error-message, #lblError")
                if error_elem:
                    error_text = await error_elem.inner_text()
                    logger.warning(f"Login failed for {county}: {error_text}")
                else:
                    logger.warning(f"Login may have failed for {county} - not on main page")
                return False

        except Exception as e:
            logger.error(f"Login failed for {county}: {e}")
            return False

    async def search_ostds_permits(self, county: str, start_date: str = None, end_date: str = None) -> List[PermitRecord]:
        """Search for OSTDS (septic) permits.

        Args:
            county: County name
            start_date: Optional start date filter (MM/DD/YYYY)
            end_date: Optional end date filter (MM/DD/YYYY)
        """
        records = []

        try:
            # Wait for page to fully load
            await self.page.wait_for_timeout(3000)

            # Log all frames for debugging
            logger.debug(f"Available frames: {[f.url for f in self.page.frames]}")

            # The main page loads main_inner.aspx in an iframe
            # We need to wait for the iframe to load and then interact with it

            # Find the outer iframe first
            outer_iframe = None
            for frame in self.page.frames:
                if "main_inner" in frame.url:
                    outer_iframe = frame
                    logger.debug(f"Found outer iframe: {frame.url}")
                    break

            if not outer_iframe:
                # Try waiting for it
                await self.page.wait_for_timeout(2000)
                for frame in self.page.frames:
                    if "main_inner" in frame.url:
                        outer_iframe = frame
                        break

            if not outer_iframe:
                logger.error("Could not find main_inner frame")
                # Save screenshot for debugging
                await self.page.screenshot(path=str(OUTPUT_DIR / f"debug_{county}_no_frame.png"))
                return records

            # Click on Retrieve/Search button in the outer frame
            try:
                retrieve_btn = await outer_iframe.wait_for_selector("#btnNavRetrieve", timeout=10000)
                if retrieve_btn:
                    await retrieve_btn.click()
                    logger.info("Clicked Retrieve button")
                    await self.page.wait_for_timeout(3000)
            except Exception as e:
                logger.warning(f"Could not find Retrieve button: {e}")
                # Save screenshot
                await self.page.screenshot(path=str(OUTPUT_DIR / f"debug_{county}_no_retrieve.png"))

            # Now find the search frame (nested inside)
            # The search loads into ifMain inside main_inner
            # We need to wait for it and then find the correct frame
            search_frame = None

            # Poll for the search frame to appear (max 30 seconds)
            for _ in range(15):
                await self.page.wait_for_timeout(2000)

                # List all frames for debugging
                frame_urls = [f.url for f in self.page.frames]
                logger.debug(f"Current frames: {frame_urls}")

                for frame in self.page.frames:
                    frame_url = frame.url.lower()
                    if "retrieve/search" in frame_url or ("search" in frame_url and "retrieve" in frame_url):
                        search_frame = frame
                        logger.info(f"Found search frame: {frame.url}")
                        break

                if search_frame:
                    break

            if not search_frame:
                logger.warning("Could not find search frame via URL, trying by content...")
                # Try finding frame that has the index1 element
                for frame in self.page.frames:
                    try:
                        elem = await frame.query_selector("#index1", timeout=1000)
                        if elem:
                            search_frame = frame
                            logger.info(f"Found search frame by content: {frame.url}")
                            break
                    except:
                        pass

            if not search_frame:
                logger.error("Could not find search frame after multiple attempts")
                await self.page.screenshot(path=str(OUTPUT_DIR / f"debug_{county}_no_search.png"))
                # Log all frames
                for frame in self.page.frames:
                    logger.debug(f"  Frame: {frame.url}")
                return records

            # Wait for the search form to load - look for the Search button
            try:
                await search_frame.wait_for_selector("input[value='Search'], button:has-text('Search')", timeout=10000)
                logger.info("Search form loaded")
            except Exception as e:
                logger.error(f"Search form not found: {e}")
                await self.page.screenshot(path=str(OUTPUT_DIR / f"debug_{county}_no_form.png"))
                return records

            # The form uses dhtmlXCombo for dropdowns
            # index1 = Program dropdown (OSTDS is an option)
            # index7 = Doc Type dropdown (Permit is an option)
            # Text fields: index2=Permit#, index3=Name, index4=Address, index5=ZipCode, index6=DocDate

            # Find all dhtmlXCombo inputs (there should be at least 1)
            combo_inputs = await search_frame.query_selector_all(".dhx_combo_input")
            logger.info(f"Found {len(combo_inputs)} dhtmlXCombo dropdowns")

            # First combo is Program Name / Reports and Permits - select OSTDS
            # Different counties have different form structures but first combo is always Program
            if combo_inputs:
                program_combo = combo_inputs[0]
                try:
                    # Click to activate dropdown
                    await program_combo.click()
                    await self.page.wait_for_timeout(500)

                    # Clear any existing value and type OSTDS
                    await program_combo.press("Control+a")
                    await program_combo.type("OSTDS", delay=50)
                    await self.page.wait_for_timeout(500)

                    # Press Enter to select (works whether dropdown visible or not)
                    await program_combo.press("Enter")
                    logger.info("Typed OSTDS in Program dropdown")
                    await self.page.wait_for_timeout(1000)
                except Exception as e:
                    logger.warning(f"Failed to set Program dropdown: {e}")
            else:
                logger.warning("No dhtmlXCombo dropdowns found")
                await self.page.screenshot(path=str(OUTPUT_DIR / f"debug_{county}_no_combo.png"))
                return records

            # Optional: fill date range filters
            if start_date:
                start_input = await search_frame.query_selector("#start_date")
                if start_input:
                    await start_input.fill(start_date)
                    logger.info(f"Set start date: {start_date}")

            if end_date:
                end_input = await search_frame.query_selector("#end_date")
                if end_input:
                    await end_input.fill(end_date)
                    logger.info(f"Set end date: {end_date}")

            # Always click search button to trigger the search
            search_btn = await search_frame.query_selector("#btnSearchF")
            if search_btn:
                await search_btn.click()
                logger.info("Clicked Search button")
            else:
                logger.warning("Search button not found")

            # Wait for results to load
            await self.page.wait_for_timeout(8000)

            # Take screenshot of results
            await self.page.screenshot(path=str(OUTPUT_DIR / f"debug_{county}_results.png"))

            # Re-find the results frame (page may have navigated)
            results_frame = None
            for frame in self.page.frames:
                frame_url = frame.url.lower()
                if "search" in frame_url or "result" in frame_url or "retrieve" in frame_url:
                    # Check if this frame has results table
                    table = await frame.query_selector("table")
                    if table:
                        results_frame = frame
                        logger.info(f"Found results frame: {frame.url}")
                        break

            if not results_frame:
                # Try the main_inner frame
                for frame in self.page.frames:
                    if "main_inner" in frame.url:
                        results_frame = frame
                        break

            if results_frame:
                records = await self._parse_search_results(results_frame, county)
                logger.info(f"Found {len(records)} records in {county}")
            else:
                logger.warning("Could not find results frame")

        except Exception as e:
            logger.error(f"Search failed for {county}: {e}")
            import traceback
            logger.debug(traceback.format_exc())
            try:
                await self.page.screenshot(path=str(OUTPUT_DIR / f"debug_{county}_error.png"))
            except:
                pass

        return records

    async def _parse_search_results(self, frame: Frame, county: str) -> List[PermitRecord]:
        """Parse search results from the results frame.

        Table columns based on actual eBridge output:
        0: VIEW (row number/checkbox)
        1: Program (OSTDS)
        2: Permit number
        3: Name (owner/facility)
        4: Address
        5: ZipCode
        6: Doc Date
        7: Doc Type (Permit, Inspection, File, etc.)
        8: DATE (scan timestamp)
        9: TYPE (pdf)
        10: PAGES
        11: NOTE
        12: AUDIT
        """
        records = []

        try:
            # Wait for results table to load
            await frame.wait_for_selector("table", timeout=10000)

            # Get all result rows - the table has header row
            rows = await frame.query_selector_all("table tr")
            logger.debug(f"Found {len(rows)} table rows")

            # Debug: log first few rows to understand structure
            debug_rows = 0
            for row in rows[1:]:  # Skip header row
                cells = await row.query_selector_all("td")
                if len(cells) < 5:
                    continue

                raw_data = {}
                cell_texts = []
                for i, cell in enumerate(cells):
                    text = await cell.inner_text()
                    text = text.strip()
                    raw_data[f"col_{i}"] = text
                    cell_texts.append(text)

                # Debug: log first 3 rows to see structure
                if debug_rows < 3:
                    logger.debug(f"Row cells: {cell_texts[:8]}")
                    debug_rows += 1

                # The actual table structure (verified from output):
                # Col 0: row number
                # Col 1: checkbox (empty)
                # Col 2: Program (OSTDS)
                # Col 3: Permit number
                # Col 4: Name
                # Col 5: Address
                # Col 6: ZipCode
                # Col 7: Doc Date
                # Col 8: Doc Type (Permit, Inspection, File, etc.)
                # Col 9: DATE (timestamp)
                # Col 10: TYPE (pdf)
                # Col 11: PAGES

                permit_num = raw_data.get("col_3", "")
                name = raw_data.get("col_4", "")
                address = raw_data.get("col_5", "")
                zipcode = raw_data.get("col_6", "")
                doc_date = raw_data.get("col_7", "")
                doc_type = raw_data.get("col_8", "")

                # Permit numbers should be numeric strings like "4064415"
                if permit_num and len(permit_num) >= 4:
                    record = PermitRecord(
                        permit_number=permit_num,
                        address=address,
                        city="",  # Not in table
                        county=county.replace("_", " ").title(),
                        state="FL",
                        owner_name=name,
                        install_date=doc_date,
                        doc_type=doc_type,
                        raw_data=raw_data
                    )
                    records.append(record)

            logger.info(f"Parsed {len(records)} records from table")

        except Exception as e:
            logger.warning(f"Error parsing results: {e}")
            import traceback
            logger.debug(traceback.format_exc())

        return records


# ============================================
# MAIN
# ============================================

async def run_extraction(counties: List[str], headless: bool = True, batch_by_month: bool = False):
    """Run extraction for specified counties.

    Args:
        counties: List of county names to extract
        headless: Run browser in headless mode
        batch_by_month: If True, extract data month by month to avoid result limits
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    scraper = EBridgePlaywrightScraper(headless=headless)
    await scraper.start()

    total_records = 0
    failed_counties = []

    try:
        for county in counties:
            logger.info(f"\n{'='*60}")
            logger.info(f"Processing: {county.upper()}")
            logger.info(f"{'='*60}")

            county_records = 0

            try:
                if not await scraper.login(county):
                    logger.error(f"Login failed for {county}")
                    failed_counties.append(county)
                    continue

                if batch_by_month:
                    # Extract by monthly batches to get all records
                    # Start from 2020 to current date
                    from datetime import date
                    current_date = date.today()
                    year = 2020
                    month = 1

                    while year < current_date.year or (year == current_date.year and month <= current_date.month):
                        # Calculate date range
                        start_date = f"{month:02d}/01/{year}"
                        if month == 12:
                            end_date = f"12/31/{year}"
                        else:
                            # Last day of month
                            import calendar
                            last_day = calendar.monthrange(year, month)[1]
                            end_date = f"{month:02d}/{last_day}/{year}"

                        logger.info(f"Extracting {county} for {start_date} to {end_date}")
                        records = await scraper.search_ostds_permits(county, start_date, end_date)

                        if records:
                            # Save batch
                            timestamp = datetime.now().strftime("%Y%m%d")
                            output_file = OUTPUT_DIR / f"fl_{county}_permits_{timestamp}.ndjson"
                            with open(output_file, 'a') as f:
                                for record in records:
                                    f.write(record.to_json() + '\n')
                            county_records += len(records)
                            logger.info(f"Batch: {len(records)} records for {month}/{year}")

                        # Next month
                        month += 1
                        if month > 12:
                            month = 1
                            year += 1

                        # Re-login between batches to avoid session timeout
                        await scraper.login(county)
                else:
                    # Single extraction (may be limited to 1000)
                    records = await scraper.search_ostds_permits(county)

                    if records:
                        timestamp = datetime.now().strftime("%Y%m%d")
                        output_file = OUTPUT_DIR / f"fl_{county}_permits_{timestamp}.ndjson"
                        with open(output_file, 'a') as f:
                            for record in records:
                                f.write(record.to_json() + '\n')
                        county_records = len(records)
                        logger.info(f"Saved {county_records} records to {output_file}")

                total_records += county_records
                logger.info(f"County {county.upper()} complete: {county_records} records")

            except Exception as e:
                logger.error(f"Error processing {county}: {e}")
                failed_counties.append(county)

    finally:
        await scraper.stop()

    logger.info(f"\n{'='*60}")
    logger.info(f"EXTRACTION COMPLETE")
    logger.info(f"Total records: {total_records}")
    if failed_counties:
        logger.warning(f"Failed counties: {', '.join(failed_counties)}")
    logger.info(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(description='eBridge Playwright Scraper')
    parser.add_argument('--county', type=str, help='Specific county to scrape')
    parser.add_argument('--headless', action='store_true', default=True, help='Run in headless mode')
    parser.add_argument('--visible', action='store_true', help='Run with visible browser')
    parser.add_argument('--list', action='store_true', help='List available counties')
    parser.add_argument('--batch', action='store_true', help='Extract by monthly batches to get all records')
    parser.add_argument('--test', action='store_true', help='Quick test with first 3 counties')

    args = parser.parse_args()

    if args.list:
        print("Available counties:")
        for county in COUNTIES:
            print(f"  - {county}")
        return

    headless = not args.visible

    if args.county:
        counties = [args.county]
    elif args.test:
        # Quick test with first 3 counties
        counties = list(COUNTIES.keys())[:3]
        print(f"Test mode: {counties}")
    else:
        counties = list(COUNTIES.keys())

    asyncio.run(run_extraction(counties, headless, batch_by_month=args.batch))


if __name__ == "__main__":
    main()
