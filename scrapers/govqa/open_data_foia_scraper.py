#!/usr/bin/env python3
"""
Open Data FOIA Scraper

Scrapes FOIA/public records request logs from government open data portals.
Many cities publish their FOIA logs on Socrata-powered data portals (data.gov derivatives).

This is a MORE EFFECTIVE approach than scraping GovQA directly since:
1. No authentication required
2. Direct API access with JSON/CSV downloads
3. No CAPTCHAs
4. Bulk download support
5. Well-documented APIs
"""

import json
import time
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import urlencode

import requests

from govqa_config import OUTPUT_DIR


# Known open data portals with FOIA datasets
OPEN_DATA_PORTALS = {
    "chicago": {
        "name": "City of Chicago",
        "state": "IL",
        "base_url": "https://data.cityofchicago.org",
        "datasets": {
            "police": {
                "id": "wjkc-agnm",
                "name": "FOIA Request Log - Police",
                "description": "FOIA requests received by Chicago Police Department"
            },
            "311": {
                "id": "j2p9-gdf5",
                "name": "FOIA Request Log - 311",
                "description": "FOIA requests to 311 services"
            },
            "planning": {
                "id": "5ztz-espx",
                "name": "FOIA Request Log - Planning and Development",
                "description": "Planning department FOIA requests"
            },
            "law": {
                "id": "44bx-ncpi",
                "name": "FOIA Request Log - Law",
                "description": "Law department FOIA requests"
            },
            "city_clerk": {
                "id": "72qm-3bwf",
                "name": "FOIA Request Log - City Clerk",
                "description": "City Clerk FOIA requests"
            },
            "library": {
                "id": "n379-5uzu",
                "name": "FOIA Request Log - Chicago Public Library",
                "description": "Library FOIA requests"
            }
        }
    },
    "san_francisco": {
        "name": "City of San Francisco",
        "state": "CA",
        "base_url": "https://data.sfgov.org",
        "datasets": {
            "public_records": {
                "id": "jsrk-e98x",
                "name": "Public Records Requests",
                "description": "Current public records requests"
            },
            "public_records_pre2020": {
                "id": "fwxs-ckd2",
                "name": "Public Record Requests Pre-2020",
                "description": "Historical public records requests before 2020"
            },
            "environment_historical": {
                "id": "s7ek-ru5b",
                "name": "FOIA Request Log - Environment - Historical",
                "description": "Historical environment FOIA requests"
            },
            "request_count": {
                "id": "m2ub-dqgp",
                "name": "Public Records Request Count by Year and Agency",
                "description": "Aggregated request counts"
            }
        }
    },
    # More portals can be added:
    # - New York City: https://data.cityofnewyork.us
    # - Los Angeles: https://data.lacity.org
    # - Seattle: https://data.seattle.gov
    # - Austin: https://data.austintexas.gov
}


class SocrataFOIAScraper:
    """
    Scraper for Socrata-based open data portals (data.gov derivatives).

    Socrata API documentation: https://dev.socrata.com/
    """

    def __init__(self, portal_key: str):
        """
        Initialize scraper for a specific portal.

        :param portal_key: Key from OPEN_DATA_PORTALS dict
        """
        if portal_key not in OPEN_DATA_PORTALS:
            raise ValueError(f"Unknown portal: {portal_key}")

        self.portal = OPEN_DATA_PORTALS[portal_key]
        self.portal_key = portal_key
        self.base_url = self.portal["base_url"]
        self.session = requests.Session()
        self.session.headers.update({
            "Accept": "application/json",
            "User-Agent": "GovQA-FOIA-Scraper/1.0"
        })

        self.output_dir = OUTPUT_DIR / f"open_data_{portal_key}"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def get_dataset_metadata(self, dataset_id: str) -> dict:
        """
        Get metadata for a dataset.

        :param dataset_id: Socrata dataset ID (e.g., "wjkc-agnm")
        :returns: Dataset metadata dict
        """
        url = f"{self.base_url}/api/views/{dataset_id}.json"
        response = self.session.get(url, timeout=30)
        response.raise_for_status()
        return response.json()

    def get_record_count(self, dataset_id: str) -> int:
        """
        Get total record count for a dataset.

        :param dataset_id: Socrata dataset ID
        :returns: Number of records
        """
        url = f"{self.base_url}/resource/{dataset_id}.json"
        params = {"$select": "count(*)"}
        response = self.session.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        if data and isinstance(data, list) and data[0]:
            return int(data[0].get("count", 0))
        return 0

    def fetch_records(
        self,
        dataset_id: str,
        limit: int = 1000,
        offset: int = 0,
        where: str = None,
        order: str = None
    ) -> list:
        """
        Fetch records from a dataset.

        :param dataset_id: Socrata dataset ID
        :param limit: Max records to return (max 50000)
        :param offset: Starting offset
        :param where: SoQL WHERE clause
        :param order: SoQL ORDER BY clause
        :returns: List of record dicts
        """
        url = f"{self.base_url}/resource/{dataset_id}.json"
        params = {
            "$limit": min(limit, 50000),
            "$offset": offset
        }
        if where:
            params["$where"] = where
        if order:
            params["$order"] = order

        response = self.session.get(url, params=params, timeout=60)
        response.raise_for_status()
        return response.json()

    def fetch_all_records(
        self,
        dataset_id: str,
        batch_size: int = 10000,
        where: str = None,
        progress_callback=None
    ) -> list:
        """
        Fetch all records from a dataset with pagination.

        :param dataset_id: Socrata dataset ID
        :param batch_size: Records per request
        :param where: Optional SoQL WHERE filter
        :param progress_callback: Optional callback(fetched, total)
        :returns: All records
        """
        all_records = []
        offset = 0
        total = self.get_record_count(dataset_id)

        print(f"Fetching {total} records from dataset {dataset_id}...")

        while True:
            batch = self.fetch_records(
                dataset_id,
                limit=batch_size,
                offset=offset,
                where=where,
                order=":id"  # Consistent ordering
            )

            if not batch:
                break

            all_records.extend(batch)
            offset += len(batch)

            if progress_callback:
                progress_callback(len(all_records), total)
            else:
                print(f"  Progress: {len(all_records)}/{total} records")

            # Rate limiting
            time.sleep(0.5)

            if len(batch) < batch_size:
                break

        return all_records

    def download_csv(self, dataset_id: str, output_file: Path = None) -> Path:
        """
        Download entire dataset as CSV.

        :param dataset_id: Socrata dataset ID
        :param output_file: Output file path
        :returns: Path to downloaded file
        """
        url = f"{self.base_url}/api/views/{dataset_id}/rows.csv?accessType=DOWNLOAD"

        if output_file is None:
            output_file = self.output_dir / f"{dataset_id}.csv"

        print(f"Downloading CSV to {output_file}...")

        response = self.session.get(url, stream=True, timeout=300)
        response.raise_for_status()

        with open(output_file, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        print(f"Downloaded: {output_file}")
        return output_file

    def scrape_all_datasets(self) -> dict:
        """
        Scrape all FOIA datasets for this portal.

        :returns: Summary dict with results
        """
        results = {
            "portal": self.portal["name"],
            "timestamp": datetime.now().isoformat(),
            "datasets": {}
        }

        for key, dataset_info in self.portal["datasets"].items():
            dataset_id = dataset_info["id"]
            print(f"\n=== Processing: {dataset_info['name']} ({dataset_id}) ===")

            try:
                # Get metadata
                metadata = self.get_dataset_metadata(dataset_id)
                record_count = self.get_record_count(dataset_id)

                # Download all records
                records = self.fetch_all_records(dataset_id)

                # Save to JSON
                output_file = self.output_dir / f"foia_{key}_{datetime.now().strftime('%Y%m%d')}.json"
                with open(output_file, "w") as f:
                    json.dump({
                        "dataset": dataset_info,
                        "metadata": {
                            "name": metadata.get("name"),
                            "description": metadata.get("description"),
                            "columns": [c.get("fieldName") for c in metadata.get("columns", [])]
                        },
                        "record_count": len(records),
                        "records": records
                    }, f, indent=2, default=str)

                results["datasets"][key] = {
                    "status": "success",
                    "record_count": len(records),
                    "output_file": str(output_file)
                }

                print(f"  Saved {len(records)} records to {output_file}")

            except Exception as e:
                results["datasets"][key] = {
                    "status": "error",
                    "error": str(e)
                }
                print(f"  ERROR: {e}")

        # Save summary
        summary_file = self.output_dir / f"scrape_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(summary_file, "w") as f:
            json.dump(results, f, indent=2)

        print(f"\n=== Summary saved to {summary_file} ===")
        return results


def discover_foia_datasets(portal_url: str) -> list:
    """
    Discover FOIA-related datasets on a Socrata portal.

    :param portal_url: Base URL of Socrata portal
    :returns: List of discovered datasets
    """
    # Search for FOIA-related datasets
    search_url = f"{portal_url}/api/catalog/v1"
    params = {
        "q": "FOIA OR freedom of information OR public records",
        "limit": 100
    }

    response = requests.get(search_url, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    datasets = []
    for result in data.get("results", []):
        resource = result.get("resource", {})
        datasets.append({
            "id": resource.get("id"),
            "name": resource.get("name"),
            "description": resource.get("description", "")[:200],
            "type": resource.get("type"),
            "updated": resource.get("updatedAt")
        })

    return datasets


def main():
    """Main entry point - scrape Chicago FOIA data."""
    print("=" * 60)
    print("Open Data FOIA Scraper")
    print("=" * 60)

    # Scrape Chicago data
    scraper = SocrataFOIAScraper("chicago")

    # Get sample data first to verify
    print("\n=== Testing with Police FOIA dataset ===")
    sample = scraper.fetch_records("wjkc-agnm", limit=5)
    print(f"Sample records: {len(sample)}")
    if sample:
        print(f"Fields: {list(sample[0].keys())}")

    # Full scrape
    print("\n=== Starting full scrape ===")
    results = scraper.scrape_all_datasets()

    # Summary
    total_records = sum(
        d.get("record_count", 0)
        for d in results["datasets"].values()
        if d.get("status") == "success"
    )
    print(f"\n=== COMPLETE ===")
    print(f"Total records scraped: {total_records}")
    print(f"Output directory: {scraper.output_dir}")


if __name__ == "__main__":
    main()
