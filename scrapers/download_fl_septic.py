#!/usr/bin/env python3
"""
Download Florida DEP Septic Systems data via ArcGIS REST API.
Total records: 1,939,334
"""

import json
import requests
import time
from pathlib import Path

BASE_URL = "https://cadev.dep.state.fl.us/arcgis/rest/services/External_Services/SEPTIC_SYSTEMS/MapServer/0/query"
OUTPUT_DIR = Path("output/florida")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Correct fields from the service
FIELDS = "OBJECTID,CO_NO,LANDUSE,PARCELNO,PHY_ADD1,PHY_CITY,PHY_ZIPCD,WW,WW_UPD,WW_SRC_TYP,WW_SRC_NAM,WW_CENTRAX,ACRES"
BATCH_SIZE = 2000

def download_florida_septic():
    """Download all Florida septic records."""
    all_records = []
    offset = 0

    print(f"Starting Florida septic download...")
    print(f"Expected records: ~1,939,334")

    while True:
        params = {
            "where": "1=1",
            "outFields": FIELDS,
            "returnGeometry": "false",
            "resultOffset": offset,
            "resultRecordCount": BATCH_SIZE,
            "f": "json"
        }

        try:
            response = requests.get(BASE_URL, params=params, timeout=120)
            data = response.json()

            if "error" in data:
                print(f"Error: {data['error']}")
                break

            if "features" not in data or len(data["features"]) == 0:
                print(f"No more records at offset {offset}")
                break

            features = data["features"]
            records = [f["attributes"] for f in features]
            all_records.extend(records)

            print(f"Offset {offset}: Downloaded {len(records)} records, Total: {len(all_records)}")

            # Check if we've reached the end
            if len(records) < BATCH_SIZE:
                break

            offset += BATCH_SIZE

            # Save checkpoint every 100K records
            if len(all_records) % 100000 < BATCH_SIZE:
                checkpoint_file = OUTPUT_DIR / f"fl_septic_checkpoint_{len(all_records)}.json"
                with open(checkpoint_file, 'w') as f:
                    json.dump(all_records, f)
                print(f"Checkpoint saved: {checkpoint_file}")

            # Small delay to be respectful
            time.sleep(0.3)

        except Exception as e:
            print(f"Error at offset {offset}: {e}")
            time.sleep(5)
            continue

    # Save final file
    output_file = OUTPUT_DIR / "fl_dep_septic_all.json"
    with open(output_file, 'w') as f:
        json.dump({
            "state": "Florida",
            "source": "Florida DEP SEPTIC_SYSTEMS MapServer",
            "url": BASE_URL,
            "total_records": len(all_records),
            "records": all_records
        }, f)

    print(f"\n=== DOWNLOAD COMPLETE ===")
    print(f"Total records: {len(all_records)}")
    print(f"Output file: {output_file}")

    return len(all_records)

if __name__ == "__main__":
    download_florida_septic()
