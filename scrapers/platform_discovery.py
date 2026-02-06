#!/usr/bin/env python3
"""
Platform Jurisdiction Discovery
Discovers all jurisdictions available on GovPilot, GovQA, and EnerGov platforms
"""
import requests
import json
import time
import os
import re
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

OUTPUT_DIR = '/root/scrapers/output/platform_discovery'
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ============================================================================
# GOVPILOT DISCOVERY
# ============================================================================
def discover_govpilot():
    """Discover GovPilot jurisdictions by checking their map API and known patterns"""
    print("\n" + "="*60)
    print("GOVPILOT JURISDICTION DISCOVERY")
    print("="*60)

    jurisdictions = []

    # Method 1: Try the map API
    map_endpoints = [
        "https://map.govpilot.com/api/jurisdictions",
        "https://map.govpilot.com/api/v1/jurisdictions",
        "https://api.govpilot.com/jurisdictions",
        "https://api.govpilot.com/v1/jurisdictions",
    ]

    for endpoint in map_endpoints:
        try:
            resp = requests.get(endpoint, timeout=30)
            print(f"  Trying {endpoint}: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list):
                    jurisdictions = data
                    print(f"  [OK] Found {len(jurisdictions)} jurisdictions")
                    break
        except Exception as e:
            print(f"  [FAIL] {endpoint}: {e}")

    # Method 2: Check state-based URL pattern
    if not jurisdictions:
        print("\n  Trying state-based discovery...")
        states = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
                  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
                  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
                  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
                  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY']

        for state in states:
            try:
                # Try different URL patterns
                urls = [
                    f"https://map.govpilot.com/map/{state}",
                    f"https://map.govpilot.com/api/jurisdictions/{state}",
                ]
                for url in urls:
                    resp = requests.get(url, timeout=10, allow_redirects=True)
                    if resp.status_code == 200 and len(resp.text) > 500:
                        # Parse for jurisdiction names
                        matches = re.findall(r'/map/[A-Z]{2}/([a-z0-9\-]+)', resp.text)
                        for m in matches:
                            j = {"state": state, "slug": m}
                            if j not in jurisdictions:
                                jurisdictions.append(j)
            except:
                pass

    # Method 3: Scrape known jurisdictions from website
    if not jurisdictions:
        print("\n  Trying website scrape...")
        try:
            resp = requests.get("https://www.govpilot.com/", timeout=30)
            if resp.status_code == 200:
                # Look for jurisdiction names in the page
                matches = re.findall(r'map\.govpilot\.com/map/([A-Z]{2})/([a-z0-9\-]+)', resp.text)
                for state, slug in matches:
                    j = {"state": state, "slug": slug}
                    if j not in jurisdictions:
                        jurisdictions.append(j)
        except Exception as e:
            print(f"  [FAIL] Website scrape: {e}")

    # Save results
    result = {
        "platform": "GovPilot",
        "discovery_date": datetime.now().isoformat(),
        "total_jurisdictions": len(jurisdictions),
        "jurisdictions": jurisdictions
    }

    with open(f"{OUTPUT_DIR}/govpilot_jurisdictions.json", "w") as f:
        json.dump(result, f, indent=2)

    print(f"\n  Total GovPilot jurisdictions found: {len(jurisdictions)}")
    return result


# ============================================================================
# GOVQA DISCOVERY
# ============================================================================
def discover_govqa():
    """Discover GovQA portals by checking common patterns"""
    print("\n" + "="*60)
    print("GOVQA PORTAL DISCOVERY")
    print("="*60)

    portals = []

    # Known GovQA portal patterns
    # Format: {entity}.govqa.us or {entity}-{entity}.govqa.us

    # Try API first
    api_endpoints = [
        "https://govqa.us/api/portals",
        "https://www.govqa.us/api/portals",
        "https://api.govqa.us/portals",
    ]

    for endpoint in api_endpoints:
        try:
            resp = requests.get(endpoint, timeout=30)
            print(f"  Trying {endpoint}: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list):
                    portals = data
                    print(f"  [OK] Found {len(portals)} portals")
                    break
        except Exception as e:
            print(f"  [FAIL] {endpoint}: {e}")

    # Method 2: Check known county/city patterns
    if not portals:
        print("\n  Trying pattern-based discovery...")

        # Texas counties we know use GovQA
        known_portals = [
            "bexarcountytx",
            "county-bexarcountytx",
            "hayscountytx",
            "hctxeng",  # Harris County Engineering
            "traviscountytx",
            "dallascountytx",
            "tarrantcountytx",
        ]

        # Common city/county patterns to try
        test_patterns = []

        # Add state abbreviations with county
        states = ['tx', 'ca', 'fl', 'ny', 'il', 'pa', 'oh', 'ga', 'nc', 'mi',
                  'nj', 'va', 'wa', 'az', 'ma', 'tn', 'in', 'mo', 'md', 'wi']

        for state in states:
            test_patterns.extend([
                f"{state}",
                f"county{state}",
                f"{state}county",
            ])

        all_patterns = known_portals + test_patterns

        found = 0
        for pattern in all_patterns:
            url = f"https://{pattern}.govqa.us"
            try:
                resp = requests.get(url, timeout=5, allow_redirects=True)
                if resp.status_code == 200:
                    portals.append({
                        "domain": pattern,
                        "url": url,
                        "status": "active"
                    })
                    found += 1
                    print(f"  [OK] {url}")
            except:
                pass

        print(f"  Found {found} active portals from pattern check")

    # Method 3: Search for GovQA subdomains via web search
    print("\n  Searching for additional GovQA portals...")
    try:
        # This would require web search, but we can check common patterns
        common_cities = [
            "chicago", "houston", "phoenix", "philadelphia", "sanantonio",
            "sandiego", "dallas", "austin", "jacksonville", "fortworth",
            "columbus", "indianapolis", "charlotte", "seattle", "denver",
            "boston", "nashville", "baltimore", "louisville", "milwaukee"
        ]

        for city in common_cities:
            for suffix in ["", "city", "-city"]:
                domain = f"{city}{suffix}"
                url = f"https://{domain}.govqa.us"
                try:
                    resp = requests.get(url, timeout=3, allow_redirects=True)
                    if resp.status_code == 200 and "govqa" in resp.text.lower():
                        if not any(p.get("domain") == domain for p in portals):
                            portals.append({
                                "domain": domain,
                                "url": url,
                                "status": "active"
                            })
                            print(f"  [OK] {url}")
                except:
                    pass
    except Exception as e:
        print(f"  Error in city search: {e}")

    # Save results
    result = {
        "platform": "GovQA",
        "discovery_date": datetime.now().isoformat(),
        "total_portals": len(portals),
        "portals": portals
    }

    with open(f"{OUTPUT_DIR}/govqa_portals.json", "w") as f:
        json.dump(result, f, indent=2)

    print(f"\n  Total GovQA portals found: {len(portals)}")
    return result


# ============================================================================
# ENERGOV DISCOVERY
# ============================================================================
def discover_energov():
    """Discover EnerGov jurisdictions via their API"""
    print("\n" + "="*60)
    print("ENERGOV JURISDICTION DISCOVERY")
    print("="*60)

    jurisdictions = []

    # EnerGov/Tyler Technologies common patterns
    # Format: {city/county}.energov.com or energov.{domain}

    # Try known API endpoints
    api_endpoints = [
        "https://energov.com/api/jurisdictions",
        "https://api.energov.com/jurisdictions",
        "https://css.tylertech.com/api/clients",
        "https://selfservice.energov.com/api/jurisdictions",
    ]

    for endpoint in api_endpoints:
        try:
            resp = requests.get(endpoint, timeout=30)
            print(f"  Trying {endpoint}: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list):
                    jurisdictions = data
                    print(f"  [OK] Found {len(jurisdictions)} jurisdictions")
                    break
        except Exception as e:
            print(f"  [FAIL] {endpoint}: {e}")

    # Method 2: Check Tyler CSS (Citizen Self Service) portals
    if not jurisdictions:
        print("\n  Checking Tyler CSS portal patterns...")

        # Known EnerGov CSS portals pattern
        css_patterns = [
            ("Wake County NC", "https://energov.wakegov.com"),
            ("Doral FL", "https://css.cityofdoral.com"),
            ("Fort Myers FL", "https://energov.cityftmyers.com"),
            ("Carson CA", "https://css.carson.ca.us"),
            ("Albuquerque NM", "https://posse.cabq.gov"),
            ("Riverside CA", "https://css.riversideca.gov"),
            ("New Smyrna Beach FL", "https://css.cityofnsb.com"),
            ("Barrow County GA", "https://css.barrowga.org"),
        ]

        for name, url in css_patterns:
            try:
                resp = requests.get(url, timeout=10, allow_redirects=True)
                if resp.status_code == 200:
                    jurisdictions.append({
                        "name": name,
                        "url": url,
                        "status": "active"
                    })
                    print(f"  [OK] {name}: {url}")
            except:
                print(f"  [FAIL] {name}")

    # Method 3: Search for more EnerGov CSS portals
    print("\n  Searching for additional EnerGov/CSS portals...")

    # Common city patterns
    test_cities = [
        "atlanta", "miami", "tampa", "orlando", "jacksonville",
        "richmond", "norfolk", "raleigh", "durham", "greensboro",
        "memphis", "knoxville", "chattanooga", "birmingham", "huntsville",
        "newark", "jerseycity", "paterson", "trenton", "camden",
    ]

    css_url_patterns = [
        "https://css.{city}.gov",
        "https://energov.{city}.gov",
        "https://css.cityof{city}.com",
        "https://energov.cityof{city}.com",
        "https://permits.{city}.gov",
    ]

    for city in test_cities:
        for pattern in css_url_patterns:
            url = pattern.format(city=city)
            try:
                resp = requests.get(url, timeout=3, allow_redirects=True)
                if resp.status_code == 200 and ("energov" in resp.text.lower() or "tyler" in resp.text.lower() or "css" in resp.url.lower()):
                    if not any(j.get("url") == url for j in jurisdictions):
                        jurisdictions.append({
                            "name": city.title(),
                            "url": url,
                            "status": "active"
                        })
                        print(f"  [OK] {city}: {url}")
                        break
            except:
                pass

    # Save results
    result = {
        "platform": "EnerGov",
        "discovery_date": datetime.now().isoformat(),
        "total_jurisdictions": len(jurisdictions),
        "jurisdictions": jurisdictions
    }

    with open(f"{OUTPUT_DIR}/energov_jurisdictions.json", "w") as f:
        json.dump(result, f, indent=2)

    print(f"\n  Total EnerGov jurisdictions found: {len(jurisdictions)}")
    return result


# ============================================================================
# MGO CONNECT VERIFICATION
# ============================================================================
def verify_mgo_connect():
    """Verify MGO Connect jurisdiction count"""
    print("\n" + "="*60)
    print("MGO CONNECT VERIFICATION")
    print("="*60)

    jurisdictions = []

    # MGO Connect public jurisdictions API
    try:
        resp = requests.get(
            "https://api.mgoconnect.org/api/v3/cp/public/jurisdictions",
            headers={
                "accept": "application/json",
                "sourceplatform": "MGO Connect Web",
                "referer": "https://www.mgoconnect.org/"
            },
            timeout=30
        )

        if resp.status_code == 200:
            data = resp.json()
            jurisdictions = data.get("data", data)
            print(f"  [OK] Found {len(jurisdictions)} jurisdictions")

            # Count by state
            states = {}
            for j in jurisdictions:
                state = j.get("stateID", "Unknown")
                states[state] = states.get(state, 0) + 1

            print("\n  By State:")
            for state, count in sorted(states.items(), key=lambda x: -x[1])[:20]:
                print(f"    {state}: {count}")

    except Exception as e:
        print(f"  [ERROR] {e}")

    # Save results
    result = {
        "platform": "MGO Connect",
        "discovery_date": datetime.now().isoformat(),
        "total_jurisdictions": len(jurisdictions),
        "jurisdictions": jurisdictions
    }

    with open(f"{OUTPUT_DIR}/mgo_connect_jurisdictions.json", "w") as f:
        json.dump(result, f, indent=2)

    return result


# ============================================================================
# MAIN
# ============================================================================
def main():
    print("="*60)
    print("PERMIT PLATFORM JURISDICTION DISCOVERY")
    print("="*60)
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Started: {datetime.now().isoformat()}")

    results = {}

    # Run discoveries
    results["mgo"] = verify_mgo_connect()
    results["govpilot"] = discover_govpilot()
    results["govqa"] = discover_govqa()
    results["energov"] = discover_energov()

    # Summary
    print("\n" + "="*60)
    print("DISCOVERY SUMMARY")
    print("="*60)

    total = 0
    for platform, data in results.items():
        count = data.get("total_jurisdictions", data.get("total_portals", 0))
        print(f"  {platform.upper()}: {count} jurisdictions/portals")
        total += count

    print(f"\n  TOTAL: {total}")

    # Save combined summary
    summary = {
        "discovery_date": datetime.now().isoformat(),
        "platforms": {
            "mgo_connect": results["mgo"]["total_jurisdictions"],
            "govpilot": results["govpilot"]["total_jurisdictions"],
            "govqa": results["govqa"]["total_portals"],
            "energov": results["energov"]["total_jurisdictions"],
        },
        "total": total
    }

    with open(f"{OUTPUT_DIR}/discovery_summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\n  Summary saved to: {OUTPUT_DIR}/discovery_summary.json")


if __name__ == "__main__":
    main()
