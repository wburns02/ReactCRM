#!/usr/bin/env python3
"""
Hays and Bexar County MGO Connect Scraper v2
Uses correct API endpoints from mgo-full-scraper.ts

API Structure:
- Login: POST https://www.mygovernmentonline.org/api/user/login/-
- Jurisdictions: GET https://api.mgoconnect.org/api/v3/cp/public/jurisdictions
- Project Types: GET https://api.mgoconnect.org/api/v3/cp/filter-items/jurisdiction-project-types/{id}
- Search: POST https://api.mgoconnect.org/api/v3/cp/projects
"""
import requests
import json
import time
import os
import urllib.parse
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
    {"name": "Bexar County", "state": "TX"},
    {"name": "Travis County", "state": "TX"},
    {"name": "Williamson County", "state": "TX"},
    {"name": "Bastrop County", "state": "TX"},
]

class MGOScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "accept": "application/json, text/plain, */*",
            "sourceplatform": "MGO Connect Web",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "referer": "https://www.mgoconnect.org/",
        })
        self.token = None
        self.jurisdictions = []

    def login(self):
        """Authenticate with MGO Connect using legacy API"""
        print("Logging in to MGO Connect...")

        # The login uses URL-encoded JSON payload
        login_url = f"{CONFIG['legacy_api']}/user/login/-"
        json_payload = json.dumps({
            "Email": CONFIG["email"],
            "Password": CONFIG["password"]
        })
        body = "=" + urllib.parse.quote(json_payload)

        try:
            resp = self.session.post(
                login_url,
                data=body,
                headers={
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    **self.session.headers
                }
            )

            if resp.status_code == 200:
                data = resp.json()
                self.token = data.get("UserToken")
                if self.token:
                    self.session.headers["authorization-token"] = self.token
                    print(f"[OK] Login successful. User ID: {data.get('UserID')}")
                    return True
                else:
                    print(f"[WARN] Login returned but no token: {data}")
        except Exception as e:
            print(f"[ERROR] Login failed: {e}")

        print("[FAIL] Could not authenticate")
        return False

    def get_jurisdictions(self):
        """Fetch list of available jurisdictions"""
        print("Fetching jurisdictions...")

        try:
            resp = self.session.get(
                f"{CONFIG['api_base']}/api/v3/cp/public/jurisdictions"
            )

            if resp.status_code == 200:
                data = resp.json()
                self.jurisdictions = data.get("data", data)
                print(f"[OK] Found {len(self.jurisdictions)} jurisdictions")
                return True
            else:
                print(f"[FAIL] Jurisdictions request failed: {resp.status_code}")
                print(f"  Response: {resp.text[:500]}")
        except Exception as e:
            print(f"[ERROR] {e}")

        return False

    def find_jurisdiction(self, county_name, state="TX"):
        """Find jurisdiction ID for a county"""
        for j in self.jurisdictions:
            name = j.get("jurisdictionName", "").lower()
            j_state = j.get("stateID", "").upper()
            if county_name.lower() in name and j_state == state:
                return j
        return None

    def get_project_types(self, jurisdiction_id):
        """Get available project types for a jurisdiction"""
        try:
            resp = self.session.get(
                f"{CONFIG['api_base']}/api/v3/cp/filter-items/jurisdiction-project-types/{jurisdiction_id}"
            )

            if resp.status_code == 200:
                data = resp.json()
                return data.get("data", [])
        except Exception as e:
            print(f"  [WARN] Could not get project types: {e}")

        return []

    def search_projects(self, jurisdiction_id, project_type_id=None, offset=0, limit=100):
        """Search for projects in a jurisdiction"""
        try:
            payload = {
                "jurisdictionID": jurisdiction_id,
                "startRow": offset,
                "endRow": offset + limit,
                "sortField": "dateCreated",
                "sortOrder": "desc",
                "keyword": ""
            }

            if project_type_id:
                payload["projectTypeID"] = project_type_id

            resp = self.session.post(
                f"{CONFIG['api_base']}/api/v3/cp/projects",
                json=payload,
                headers={"content-type": "application/json"}
            )

            if resp.status_code == 200:
                return resp.json()
        except Exception as e:
            print(f"  [ERROR] Search failed: {e}")

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
            # List similar names
            for j in self.jurisdictions:
                if state.upper() in j.get("stateID", "").upper():
                    jname = j.get("jurisdictionName", "")
                    if any(word in jname.lower() for word in county_name.lower().split()):
                        print(f"  Did you mean: {jname}?")
            return []

        j_id = jurisdiction.get("jurisdictionID")
        j_name = jurisdiction.get("jurisdictionName")
        print(f"Found jurisdiction: {j_name} (ID: {j_id})")

        # Get project types
        project_types = self.get_project_types(j_id)
        print(f"Project types available: {len(project_types)}")

        # Find OSSF-related types
        ossf_types = []
        for pt in project_types:
            name = pt.get("name", "").lower()
            if any(x in name for x in ["ossf", "septic", "sewage", "wastewater", "on-site"]):
                ossf_types.append(pt)
                print(f"  [OSSF] {pt.get('name')} (ID: {pt.get('itemID')})")

        # If no OSSF types found, show all types for debugging
        if not ossf_types:
            print("  [INFO] No OSSF-specific types found. Available types:")
            for pt in project_types[:15]:
                print(f"    - {pt.get('name')}")
            # Try extracting all records without type filter
            ossf_types = [None]  # Will search without type filter

        # Extract records
        all_records = []
        for pt in ossf_types:
            pt_id = pt.get("itemID") if pt else None
            pt_name = pt.get("name") if pt else "ALL TYPES"
            print(f"\nExtracting: {pt_name}")

            offset = 0
            while True:
                result = self.search_projects(j_id, pt_id, offset, CONFIG["batch_size"])
                if not result:
                    break

                records = result.get("data", result.get("projects", []))
                total = result.get("totalRows", result.get("total", 0))

                if not records:
                    break

                all_records.extend(records)
                print(f"  Offset {offset}: {len(records)} records (total: {len(all_records)}/{total})")

                if len(records) < CONFIG["batch_size"]:
                    break

                offset += CONFIG["batch_size"]
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
        safe_name = county_name.lower().replace(" ", "_")
        filename = f"{safe_name}_mgo_{date_str}.json"
        filepath = os.path.join(CONFIG["output_dir"], filename)

        output = {
            "county": county_name,
            "source": "MGO Connect",
            "extraction_date": datetime.now().isoformat(),
            "record_count": len(records),
            "records": records
        }

        with open(filepath, "w") as f:
            json.dump(output, f, indent=2)

        print(f"Saved to: {filepath}")

        # Also save as NDJSON for easier processing
        ndjson_path = filepath.replace(".json", ".ndjson")
        with open(ndjson_path, "w") as f:
            for record in records:
                f.write(json.dumps(record) + "\n")

        return filepath

    def run(self, counties=None):
        """Run extraction for specified counties"""
        if counties is None:
            counties = TEXAS_COUNTIES

        # Login
        if not self.login():
            print("Continuing without authentication (public data only)...")

        # Get jurisdictions
        if not self.get_jurisdictions():
            print("Failed to get jurisdictions, cannot continue")
            return

        # Filter to Texas jurisdictions and display
        tx_jurisdictions = [j for j in self.jurisdictions
                          if j.get("stateID", "").upper() == "TX"]
        print(f"\nTexas jurisdictions available: {len(tx_jurisdictions)}")
        for j in tx_jurisdictions[:30]:
            print(f"  - {j.get('jurisdictionName')}")
        if len(tx_jurisdictions) > 30:
            print(f"  ... and {len(tx_jurisdictions) - 30} more")

        # Extract each county
        results = {}
        for county_info in counties:
            county_name = county_info["name"]
            state = county_info.get("state", "TX")

            try:
                records = self.extract_county(county_name, state)
                if records:
                    filepath = self.save_results(county_name, records)
                    results[county_name] = {
                        "count": len(records),
                        "file": filepath
                    }
            except Exception as e:
                print(f"[ERROR] Failed to extract {county_name}: {e}")

            time.sleep(2)  # Delay between counties

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
