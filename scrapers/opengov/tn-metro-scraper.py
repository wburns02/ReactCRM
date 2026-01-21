#!/usr/bin/env python3
"""
TN Metro County OpenGov Scraper
Scrapes Nashville, Knox, and Shelby County OpenGov portals
"""
import json
import os
import re
import sys
import time
from datetime import datetime

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("Installing playwright...")
    os.system("pip install playwright && playwright install chromium")
    from playwright.sync_api import sync_playwright

OUTPUT_DIR = "/home/will/scrapers/output/tennessee"
os.makedirs(OUTPUT_DIR, exist_ok=True)

PORTALS = [
    {"name": "Nashville", "county": "Davidson", "url": "https://metronashvilletn.portal.opengov.com"},
    {"name": "Knox County", "county": "Knox", "url": "https://knoxcounty.portal.opengov.com"},
    {"name": "Shelby County", "county": "Shelby", "url": "https://shelbycountytn.portal.opengov.com"},
]

PERMIT_PATTERN = re.compile(r'([A-Z0-9]{2,}-?\d{4,}-?\d*)')

def extract_records(page):
    """Extract records from current page"""
    records = []

    # Try to get table rows
    rows = page.query_selector_all("table tr")
    for row in rows[1:]:  # Skip header
        cells = row.query_selector_all("td")
        if cells:
            records.append({
                "cells": [c.inner_text().strip() for c in cells],
                "links": [{"href": a.get_attribute("href"), "text": a.inner_text().strip()}
                         for a in row.query_selector_all("a")]
            })

    # Also try card-style results
    cards = page.query_selector_all("[class*='result'], [class*='card'], [class*='item']")
    for card in cards:
        text = card.inner_text().strip()
        if len(text) > 20:
            records.append({
                "text": text[:500],
                "links": [{"href": a.get_attribute("href"), "text": a.inner_text().strip()}
                         for a in card.query_selector_all("a")]
            })

    return records

def scrape_portal(portal_info):
    """Scrape a single OpenGov portal"""
    name = portal_info["name"]
    county = portal_info["county"]
    url = portal_info["url"]

    output_file = os.path.join(OUTPUT_DIR, f"{name.lower().replace(' ', '_')}_opengov_permits.ndjson")

    print(f"\n{'='*60}")
    print(f"Scraping {name} ({url})")
    print(f"Output: {output_file}")
    print(f"{'='*60}")

    total_records = 0
    search_terms = ["", "septic", "building", "permit", "residential", "commercial"]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = context.new_page()

        for term in search_terms:
            try:
                print(f"\n  Searching: '{term or 'all'}'...")
                page.goto(url, timeout=90000, wait_until="domcontentloaded")
                time.sleep(5)

                # Try to find and use search
                search_input = page.query_selector("input[type='search'], input[type='text'], input[placeholder*='search' i]")
                if search_input:
                    search_input.fill(term)
                    search_input.press("Enter")
                    time.sleep(5)

                # Wait for results
                try:
                    page.wait_for_selector("table, [class*='result'], [class*='card']", timeout=30000)
                except:
                    pass

                time.sleep(2)

                # Extract records
                page_num = 1
                while page_num <= 50:
                    records = extract_records(page)
                    print(f"    Page {page_num}: {len(records)} items")

                    for raw in records:
                        cell_text = str(raw.get("cells", [""])[0] if raw.get("cells") else "")
                        text_content = raw.get("text", "")
                        search_text = cell_text or text_content

                        permit_match = PERMIT_PATTERN.search(search_text)
                        permit_num = permit_match.group(1) if permit_match else f"{name[:4].upper()}-{int(time.time())}-{total_records}"

                        record = {
                            "permit_number": permit_num,
                            "address": raw.get("cells", ["", ""])[1] if raw.get("cells") and len(raw.get("cells", [])) > 1 else "",
                            "city": name.split()[0],
                            "county": county,
                            "state": "TN",
                            "permit_type": term or "General",
                            "status": "",
                            "description": (raw.get("text", "") or " ".join(raw.get("cells", [])))[:200],
                            "issue_date": "",
                            "owner_name": "",
                            "source": f"{name} OpenGov",
                            "scraped_at": datetime.now().isoformat(),
                            "raw_data": raw
                        }

                        with open(output_file, "a") as f:
                            f.write(json.dumps(record) + "\n")
                        total_records += 1

                    # Try next page
                    next_btn = page.query_selector("button:has-text('Next'), a:has-text('Next'), [class*='next']:not([class*='disabled'])")
                    if next_btn:
                        try:
                            next_btn.click()
                            time.sleep(3)
                            page_num += 1
                        except:
                            break
                    else:
                        break

            except Exception as e:
                print(f"    Error: {e}")

        browser.close()

    print(f"\n  Total from {name}: {total_records} records")
    return total_records

def main():
    print("="*60)
    print("TN METRO COUNTY OPENGOV SCRAPER")
    print("="*60)
    print(f"Started: {datetime.now().isoformat()}")

    grand_total = 0
    for portal in PORTALS:
        count = scrape_portal(portal)
        grand_total += count

    print(f"\n{'='*60}")
    print(f"COMPLETE - Grand total: {grand_total} records")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
