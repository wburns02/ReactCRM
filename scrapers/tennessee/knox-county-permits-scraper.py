#!/usr/bin/env python3
"""
Knox County TN Permit Portal Scraper
Scrapes permits from epw-permitsubmit.knoxcountytn.gov
"""
import json
import os
import re
import time
from datetime import datetime

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    os.system("pip install playwright && playwright install chromium")
    from playwright.sync_api import sync_playwright

OUTPUT_DIR = "/home/will/scrapers/output/tennessee"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "knox_county_permits.ndjson")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def scrape_knox_county():
    print("=" * 60)
    print("KNOX COUNTY TN PERMIT PORTAL SCRAPER")
    print("=" * 60)
    print(f"Started: {datetime.now().isoformat()}")

    total_records = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = context.new_page()

        try:
            print("\nNavigating to Knox County permit portal...")
            page.goto("https://epw-permitsubmit.knoxcountytn.gov/", timeout=60000)
            time.sleep(5)

            # Look for permit search or lookup
            print("Looking for search functionality...")

            # Try to find any links to permit search
            links = page.query_selector_all("a")
            for link in links:
                text = link.inner_text().strip().lower()
                if "search" in text or "lookup" in text or "permit" in text:
                    print(f"  Found link: {text}")
                    try:
                        href = link.get_attribute("href")
                        if href:
                            print(f"    href: {href}")
                    except:
                        pass

            # Try clicking on permit lookup if available
            lookup_btn = page.query_selector("a:has-text('Lookup'), button:has-text('Lookup'), a:has-text('Search')")
            if lookup_btn:
                print("Found lookup/search button, clicking...")
                lookup_btn.click()
                time.sleep(3)

            # Take screenshot for debugging
            page.screenshot(path="/home/will/scrapers/output/tennessee/knox_portal_screenshot.png")
            print("Screenshot saved")

            # Try to find any permit data
            tables = page.query_selector_all("table")
            for table in tables:
                rows = table.query_selector_all("tr")
                print(f"Found table with {len(rows)} rows")

                for row in rows[1:]:  # Skip header
                    cells = row.query_selector_all("td")
                    if cells:
                        record = {
                            "permit_number": cells[0].inner_text().strip() if cells else "",
                            "address": cells[1].inner_text().strip() if len(cells) > 1 else "",
                            "city": "Knoxville",
                            "county": "Knox",
                            "state": "TN",
                            "permit_type": cells[2].inner_text().strip() if len(cells) > 2 else "",
                            "status": cells[3].inner_text().strip() if len(cells) > 3 else "",
                            "description": "",
                            "source": "Knox County Permit Portal",
                            "scraped_at": datetime.now().isoformat()
                        }

                        with open(OUTPUT_FILE, "a") as f:
                            f.write(json.dumps(record) + "\n")
                        total_records += 1

            # Also try to find any list or card elements
            cards = page.query_selector_all("[class*='permit'], [class*='result'], [class*='card']")
            for card in cards:
                text = card.inner_text().strip()
                if len(text) > 20:
                    record = {
                        "permit_number": f"KNOX-{int(time.time())}-{total_records}",
                        "description": text[:500],
                        "city": "Knoxville",
                        "county": "Knox",
                        "state": "TN",
                        "source": "Knox County Permit Portal",
                        "scraped_at": datetime.now().isoformat()
                    }

                    with open(OUTPUT_FILE, "a") as f:
                        f.write(json.dumps(record) + "\n")
                    total_records += 1

        except Exception as e:
            print(f"Error: {e}")

        browser.close()

    print(f"\n{'=' * 60}")
    print(f"COMPLETE - Total records: {total_records}")
    print(f"Output: {OUTPUT_FILE}")

if __name__ == "__main__":
    scrape_knox_county()
