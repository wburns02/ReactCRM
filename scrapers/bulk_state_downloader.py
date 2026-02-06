#!/usr/bin/env python3
"""
Multi-State Septic Permit Bulk Downloader

Downloads septic permit data from all discovered ArcGIS and Open Data sources.
Target: 7 million records
Current: 2.09M records
Need: 4.9M more records

Sources:
1. Florida DEP SEPTIC_SYSTEMS - 1.94M (DONE)
2. Delaware DNREC - 130K (DONE)
3. Vermont DEC - 18K (DONE)
4. Mesa County CO - ~10K
5. Boulder County CO - Unknown
6. King County WA - ~635K parcels
7. New Mexico NMED - ~200K
8. Minnesota MPCA - ~600K (interactive only)
"""

import json
import time
import requests
from pathlib import Path
from datetime import datetime

OUTPUT_DIR = Path("output")
OUTPUT_DIR.mkdir(exist_ok=True)

# Rate limiting
REQUEST_DELAY = 1.0

def download_arcgis(name, base_url, fields="*", where="1=1", batch_size=2000, max_records=None):
    """Download from ArcGIS REST API endpoint."""
    print(f"\n{'='*60}")
    print(f"DOWNLOADING: {name}")
    print(f"{'='*60}")

    # Get record count
    count_url = f"{base_url}/query"
    count_params = {
        "where": where,
        "returnCountOnly": "true",
        "f": "json"
    }

    try:
        resp = requests.get(count_url, params=count_params, timeout=30)
        count_data = resp.json()
        total_count = count_data.get("count", 0)
        print(f"Total records available: {total_count:,}")

        if total_count == 0:
            print("No records found")
            return 0

        if max_records:
            total_count = min(total_count, max_records)
            print(f"Limiting to: {max_records:,}")

    except Exception as e:
        print(f"Error getting count: {e}")
        return 0

    # Download in batches
    all_records = []
    offset = 0

    while offset < total_count:
        query_params = {
            "where": where,
            "outFields": fields,
            "returnGeometry": "false",
            "resultOffset": offset,
            "resultRecordCount": batch_size,
            "f": "json"
        }

        try:
            resp = requests.get(count_url, params=query_params, timeout=60)
            data = resp.json()

            features = data.get("features", [])
            if not features:
                print(f"No more features at offset {offset}")
                break

            records = [f.get("attributes", f) for f in features]
            all_records.extend(records)

            print(f"Offset {offset:,}: Downloaded {len(records):,} | Total: {len(all_records):,}")
            offset += batch_size

            # Save checkpoint every 100K
            if len(all_records) % 100000 < batch_size:
                checkpoint_file = OUTPUT_DIR / f"{name.lower().replace(' ', '_')}_checkpoint.json"
                with open(checkpoint_file, 'w') as f:
                    json.dump(all_records, f)
                print(f"Checkpoint saved: {len(all_records):,} records")

            time.sleep(REQUEST_DELAY)

        except Exception as e:
            print(f"Error at offset {offset}: {e}")
            time.sleep(5)
            continue

    # Save final results
    if all_records:
        output_file = OUTPUT_DIR / f"{name.lower().replace(' ', '_')}.json"
        with open(output_file, 'w') as f:
            json.dump({
                "source": name,
                "url": base_url,
                "extracted_at": datetime.now().isoformat(),
                "total_records": len(all_records),
                "records": all_records
            }, f)
        print(f"\nSaved {len(all_records):,} records to {output_file}")

    return len(all_records)


def download_socrata(name, base_url, limit=50000):
    """Download from Socrata Open Data API."""
    print(f"\n{'='*60}")
    print(f"DOWNLOADING: {name}")
    print(f"{'='*60}")

    all_records = []
    offset = 0
    batch_size = 10000

    while True:
        url = f"{base_url}?$limit={batch_size}&$offset={offset}"

        try:
            resp = requests.get(url, timeout=60)
            data = resp.json()

            if not data:
                break

            all_records.extend(data)
            print(f"Offset {offset:,}: Downloaded {len(data):,} | Total: {len(all_records):,}")

            if len(data) < batch_size:
                break

            offset += batch_size
            time.sleep(REQUEST_DELAY)

            if len(all_records) >= limit:
                print(f"Reached limit of {limit:,}")
                break

        except Exception as e:
            print(f"Error at offset {offset}: {e}")
            break

    # Save results
    if all_records:
        output_file = OUTPUT_DIR / f"{name.lower().replace(' ', '_')}.json"
        with open(output_file, 'w') as f:
            json.dump({
                "source": name,
                "url": base_url,
                "extracted_at": datetime.now().isoformat(),
                "total_records": len(all_records),
                "records": all_records
            }, f)
        print(f"\nSaved {len(all_records):,} records to {output_file}")

    return len(all_records)


# Data sources to download
SOURCES = {
    # Colorado Open Data
    "mesa_county_co": {
        "type": "socrata",
        "name": "Mesa County CO Septic",
        "url": "https://data.colorado.gov/resource/vqx7-fwxd.json"
    },
    "boulder_county_co": {
        "type": "socrata",
        "name": "Boulder County CO Septic",
        "url": "https://data.colorado.gov/resource/ihbp-hi2s.json"
    },

    # New Mexico ArcGIS (if accessible)
    "new_mexico": {
        "type": "arcgis",
        "name": "New Mexico NMED Septic",
        "url": "https://arcgis.env.nm.gov/server/rest/services/ehb/onsite_wastewater_compliance/FeatureServer/0"
    },

    # Sherburne County MN
    "sherburne_mn": {
        "type": "arcgis",
        "name": "Sherburne County MN",
        "url": "https://gis.co.sherburne.mn.us/arcgis5/rest/services/PZPermits/Bldg_Inspector_Septic_10_Day/MapServer/1"
    },

    # Carver County MN
    "carver_mn": {
        "type": "arcgis",
        "name": "Carver County MN",
        "url": "https://gis.co.carver.mn.us/arcgis_ea/rest/services/Specialty/CC_AGM_Septic_Components/FeatureServer/6"
    },
}


def main():
    print("="*60)
    print("MULTI-STATE SEPTIC PERMIT BULK DOWNLOADER")
    print("="*60)
    print(f"Current: 2,087,193 records")
    print(f"Goal: 7,000,000 records")
    print(f"Need: 4,912,807 more records")
    print("="*60)

    total_new = 0

    for source_id, config in SOURCES.items():
        try:
            if config["type"] == "socrata":
                count = download_socrata(config["name"], config["url"])
            elif config["type"] == "arcgis":
                count = download_arcgis(config["name"], config["url"])

            total_new += count
            print(f"\n{config['name']}: {count:,} records")

        except Exception as e:
            print(f"Error with {source_id}: {e}")
            continue

    print("\n" + "="*60)
    print("DOWNLOAD COMPLETE")
    print("="*60)
    print(f"New records downloaded: {total_new:,}")
    print(f"Previous total: 2,087,193")
    print(f"New total: {2087193 + total_new:,}")
    print(f"Progress: {(2087193 + total_new) / 7000000 * 100:.1f}% of 7M goal")


if __name__ == "__main__":
    main()
