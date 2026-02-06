#!/usr/bin/env python3
"""
Hays and Bexar County MGO Connect Scraper
Extracts OSSF/Septic permits from MGO Connect API

Based on discovered API patterns from mgo-full-scraper.ts
"""
import requests
import json
import time
import os
from datetime import datetime
from pathlib import Path

# Configuration
CONFIG = {
    "email": "willwalterburns@gmail.com",
    "password": "#Espn202512",
    "api_base": "https://api.mgoconnect.org",
    "legacy_api": "https://www.mygovernmentonline.org/api",
    "output_dir": "/root/scrapers/output/texas_counties",
    "batch_size": 100,
    "delay_between_requests": 1.5,
}

# Target counties
TEXAS_COUNTIES = [
    {"name": "Hays County", "state": "TX"},
    {"name": "Bexar County", "state": "TX"},  # Note: Bexar may not be on MGO
    {"name": "Travis County", "state": "TX"},
    {"name": "Williamson County", "state": "TX"},
    {"name": "Bastrop County", "state": "TX"},
    {"name": "Caldwell County", "state": "TX"},
    {"name": "Comal County", "state": "TX"},
]

class MGOScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
            "Content-Type": "application/json",
        })
        self.token = None
        self.jurisdictions = []

    def login(self):
        """Authenticate with MGO Connect"""
        print("Logging in to MGO Connect...")

        # Try the customer portal login
        login_url = f"{CONFIG['api_base']}/api/customer/v1/customer/login"
        payload = {
            "email": CONFIG["email"],
            "password": CONFIG["password"]
        }

        try:
            resp = self.session.post(login_url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                self.token = data.get("token") or data.get("accessToken")
                if self.token:
                    self.session.headers["Authorization"] = f"Bearer {self.token}"
                    print("[OK] Login successful")
                    return True
        except Exception as e:
            print(f"Login method 1 failed: {e}")

        # Try legacy API
        try:
            legacy_login = f"{CONFIG['legacy_api']}/login"
            resp = self.session.post(legacy_login, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                self.token = data.get("token")
                if self.token:
                    self.session.headers["Authorization"] = f"Bearer {self.token}"
                    print("[OK] Legacy login successful")
                    return True
        except Exception as e:
            print(f"Legacy login failed: {e}")

        print("[FAIL] Could not authenticate")
        return False

    def get_jurisdictions(self):
        """Fetch list of available jurisdictions"""
        print("Fetching jurisdictions...")

        endpoints = [
            f"{CONFIG['api_base']}/api/customer/v1/jurisdictions",
            f"{CONFIG['api_base']}/api/v3/jurisdictions",
            f"{CONFIG['legacy_api']}/jurisdictions",
        ]

        for endpoint in endpoints:
            try:
                resp = self.session.get(endpoint)
                if resp.status_code == 200:
                    data = resp.json()
                    self.jurisdictions = data if isinstance(data, list) else data.get("jurisdictions", [])
                    print(f"[OK] Found {len(self.jurisdictions)} jurisdictions")
                    return True
            except Exception as e:
                continue

        print("[FAIL] Could not fetch jurisdictions")
        return False

    def find_jurisdiction(self, county_name, state="TX"):
        """Find jurisdiction ID for a county"""
        for j in self.jurisdictions:
            name = j.get("jurisdictionName", j.get("name", "")).lower()
            j_state = j.get("stateID", j.get("state", "")).upper()
            if county_name.lower() in name and j_state == state:
                return j
        return None

    def get_project_types(self, jurisdiction_id):
        """Get available project types for a jurisdiction"""
        endpoints = [
            f"{CONFIG['api_base']}/api/customer/v1/projects/types?jurisdictionID={jurisdiction_id}",
            f"{CONFIG['api_base']}/api/v3/projectTypes/{jurisdiction_id}",
        ]

        for endpoint in endpoints:
            try:
                resp = self.session.get(endpoint)
                if resp.status_code == 200:
                    data = resp.json()
                    return data if isinstance(data, list) else data.get("projectTypes", [])
            except:
                continue
        return []

    def search_projects(self, jurisdiction_id, project_type_id=None, page=1, page_size=100):
        """Search for projects in a jurisdiction"""
        # Try different search endpoints
        endpoints = [
            {
                "url": f"{CONFIG['api_base']}/api/customer/v1/projects/search",
                "method": "POST",
                "payload": {
                    "jurisdictionID": jurisdiction_id,
                    "projectTypeID": project_type_id,
                    "page": page,
                    "pageSize": page_size,
                    "sortField": "dateCreated",
                    "sortOrder": "desc"
                }
            },
            {
                "url": f"{CONFIG['api_base']}/api/v3/projects",
                "method": "GET",
                "params": {
                    "jurisdictionID": jurisdiction_id,
                    "page": page,
                    "pageSize": page_size
                }
            }
        ]

        for ep in endpoints:
            try:
                if ep["method"] == "POST":
                    resp = self.session.post(ep["url"], json=ep["payload"])
                else:
                    resp = self.session.get(ep["url"], params=ep.get("params", {}))

                if resp.status_code == 200:
                    data = resp.json()
                    return data
            except Exception as e:
                continue

        return None

    def extract_county(self, county_name, state="TX"):
        """Extract all OSSF permits for a county"""
        print(f"\n{'='*60}")
        print(f"Extracting: {county_name}, {state}")
        print(f"{'='*60}")

        # Find jurisdiction
        jurisdiction = self.find_jurisdiction(county_name, state)
        if not jurisdiction:
            print(f"[WARN] {county_name} not found in MGO Connect")
            return []

        j_id = jurisdiction.get("jurisdictionID", jurisdiction.get("id"))
        j_name = jurisdiction.get("jurisdictionName", jurisdiction.get("name"))
        print(f"Found jurisdiction: {j_name} (ID: {j_id})")

        # Get project types
        project_types = self.get_project_types(j_id)
        print(f"Project types available: {len(project_types)}")

        # Find OSSF-related types
        ossf_types = []
        for pt in project_types:
            name = pt.get("name", "").lower()
            if any(x in name for x in ["ossf", "septic", "sewage", "wastewater"]):
                ossf_types.append(pt)
                print(f"  - {pt.get('name')} (ID: {pt.get('itemID', pt.get('id'))})")

        if not ossf_types:
            print("  No OSSF types found, extracting ALL project types")
            ossf_types = project_types[:5]  # Limit to first 5 types

        # Extract records
        all_records = []
        for pt in ossf_types:
            pt_id = pt.get("itemID", pt.get("id"))
            pt_name = pt.get("name")
            print(f"\nExtracting: {pt_name}")

            page = 1
            while True:
                result = self.search_projects(j_id, pt_id, page, CONFIG["batch_size"])
                if not result:
                    break

                records = result if isinstance(result, list) else result.get("projects", result.get("data", []))
                if not records:
                    break

                all_records.extend(records)
                total = result.get("totalRows", result.get("total", len(records)))
                print(f"  Page {page}: {len(records)} records (total: {len(all_records)}/{total})")

                if len(records) < CONFIG["batch_size"]:
                    break

                page += 1
                time.sleep(CONFIG["delay_between_requests"])

                # Safety limit
                if len(all_records) >= 100000:
                    print("  [WARN] Hit safety limit of 100k records")
                    break

        print(f"\n[OK] Extracted {len(all_records)} total records for {county_name}")
        return all_records

    def save_results(self, county_name, records):
        """Save extracted records to file"""
        os.makedirs(CONFIG["output_dir"], exist_ok=True)

        date_str = datetime.now().strftime("%Y%m%d")
        filename = f"{county_name.lower().replace(' ', '_')}_{date_str}.json"
        filepath = os.path.join(CONFIG["output_dir"], filename)

        output = {
            "county": county_name,
            "extraction_date": datetime.now().isoformat(),
            "record_count": len(records),
            "records": records
        }

        with open(filepath, "w") as f:
            json.dump(output, f, indent=2)

        print(f"Saved to: {filepath}")
        return filepath

    def run(self, counties=None):
        """Run extraction for specified counties"""
        if counties is None:
            counties = TEXAS_COUNTIES

        # Login
        if not self.login():
            print("Failed to authenticate, trying without login...")

        # Get jurisdictions
        if not self.get_jurisdictions():
            print("Failed to get jurisdictions, cannot continue")
            return

        # Filter to Texas jurisdictions
        tx_jurisdictions = [j for j in self.jurisdictions
                          if j.get("stateID", j.get("state", "")).upper() == "TX"]
        print(f"\nTexas jurisdictions available: {len(tx_jurisdictions)}")
        for j in tx_jurisdictions[:20]:
            print(f"  - {j.get('jurisdictionName', j.get('name'))}")
        if len(tx_jurisdictions) > 20:
            print(f"  ... and {len(tx_jurisdictions) - 20} more")

        # Extract each county
        results = {}
        for county_info in counties:
            county_name = county_info["name"]
            state = county_info.get("state", "TX")

            records = self.extract_county(county_name, state)
            if records:
                filepath = self.save_results(county_name, records)
                results[county_name] = {
                    "count": len(records),
                    "file": filepath
                }

        # Summary
        print("\n" + "="*60)
        print("EXTRACTION SUMMARY")
        print("="*60)
        total = 0
        for county, info in results.items():
            print(f"  {county}: {info['count']:,} records")
            total += info['count']
        print(f"\nTotal: {total:,} records")

        return results


if __name__ == "__main__":
    scraper = MGOScraper()

    # Focus on Hays and Bexar first
    priority_counties = [
        {"name": "Hays County", "state": "TX"},
        {"name": "Bexar County", "state": "TX"},
    ]

    scraper.run(priority_counties)
