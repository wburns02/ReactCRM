#!/usr/bin/env python3
"""
H-GAC OSSF Direct ArcGIS Extractor

Extracts OSSF (septic) permit data directly from H-GAC's ArcGIS REST services.
No browser automation needed - direct API queries.

Discovered endpoints:
- https://gis.h-gac.com/arcgis/rest/services/OSSF/Permitted_OSSFs/MapServer/0

Usage:
    python hgac_ossf_direct_extractor.py
"""

import asyncio
import aiohttp
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional


# Configuration
OUTPUT_DIR = Path("scrapers/output/harris_county")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ArcGIS endpoints discovered from H-GAC OSSF map
ARCGIS_ENDPOINTS = {
    "permitted_ossf": {
        "name": "Permitted OSSFs",
        "url": "https://gis.h-gac.com/arcgis/rest/services/OSSF/Permitted_OSSFs/MapServer/0",
        "description": "All permitted On-Site Sewage Facilities"
    },
    "ossf_by_agent": {
        "name": "OSSFs by Authorized Agent",
        "url": "https://gis.h-gac.com/arcgis/rest/services/OSSF/Permitted_OSSFs_by_Agent/MapServer/0",
        "description": "OSSFs grouped by permitting agent"
    },
    "ossf_by_age": {
        "name": "OSSFs by Permit Age",
        "url": "https://gis.h-gac.com/arcgis/rest/services/OSSF/Permitted_OSSFs_by_Permit_Age/MapServer/0",
        "description": "OSSFs grouped by permit age"
    },
    "ossf_density": {
        "name": "OSSFs Per Square Mile",
        "url": "https://gis.h-gac.com/arcgis/rest/services/OSSF/Permitted_OSSFs_Per_SqMi/MapServer/0",
        "description": "OSSF density analysis"
    },
    "ossf_residential": {
        "name": "OSSF Residential Analysis",
        "url": "https://gis.h-gac.com/arcgis/rest/services/OSSF/OSSF_Residential_Analysis/MapServer/0",
        "description": "Residential OSSF analysis"
    }
}

# Harris County bounds (approximate)
HARRIS_COUNTY_BOUNDS = {
    "xmin": -95.91,
    "ymin": 29.48,
    "xmax": -94.91,
    "ymax": 30.17
}


class ArcGISExtractor:
    """Direct ArcGIS REST API extractor."""

    def __init__(self, session: aiohttp.ClientSession):
        self.session = session

    async def get_service_info(self, base_url: str) -> Dict:
        """Get service metadata."""
        url = f"{base_url}?f=json"
        async with self.session.get(url) as response:
            return await response.json()

    async def get_record_count(self, base_url: str, where: str = "1=1") -> int:
        """Get total record count."""
        url = f"{base_url}/query"
        params = {
            "where": where,
            "returnCountOnly": "true",
            "f": "json"
        }
        async with self.session.get(url, params=params) as response:
            data = await response.json()
            return data.get("count", 0)

    async def query_features(
        self,
        base_url: str,
        where: str = "1=1",
        out_fields: str = "*",
        result_offset: int = 0,
        result_record_count: int = 1000,
        geometry_type: str = "esriGeometryEnvelope",
        geometry: Dict = None,
        spatial_rel: str = "esriSpatialRelIntersects",
        return_geometry: bool = True
    ) -> Dict:
        """Query features from ArcGIS service."""
        url = f"{base_url}/query"

        params = {
            "where": where,
            "outFields": out_fields,
            "returnGeometry": str(return_geometry).lower(),
            "resultOffset": result_offset,
            "resultRecordCount": result_record_count,
            "f": "json"
        }

        if geometry:
            params["geometry"] = json.dumps(geometry)
            params["geometryType"] = geometry_type
            params["spatialRel"] = spatial_rel
            params["inSR"] = "4326"
            params["outSR"] = "4326"

        async with self.session.get(url, params=params) as response:
            return await response.json()

    async def extract_all_features(
        self,
        base_url: str,
        where: str = "1=1",
        geometry: Dict = None,
        batch_size: int = 1000
    ) -> List[Dict]:
        """Extract all features with pagination."""
        all_features = []
        offset = 0

        # Get total count first
        total = await self.get_record_count(base_url, where)
        print(f"  Total records: {total}")

        while True:
            print(f"  Fetching records {offset} - {offset + batch_size}...")

            result = await self.query_features(
                base_url,
                where=where,
                result_offset=offset,
                result_record_count=batch_size,
                geometry=geometry
            )

            features = result.get("features", [])
            if not features:
                break

            all_features.extend(features)
            offset += len(features)

            print(f"    Retrieved {len(features)} features (total: {len(all_features)})")

            if len(features) < batch_size:
                break

            # Rate limiting
            await asyncio.sleep(0.5)

        return all_features


async def extract_harris_county_ossf():
    """Extract OSSF data for Harris County."""

    print("=" * 60)
    print("H-GAC OSSF Data Extractor - Direct ArcGIS API")
    print("=" * 60)
    print(f"Output: {OUTPUT_DIR}")
    print()

    # Create session
    async with aiohttp.ClientSession() as session:
        extractor = ArcGISExtractor(session)

        results = {
            "extraction_date": datetime.now().isoformat(),
            "source": "H-GAC ArcGIS REST Services",
            "target_county": "Harris",
            "endpoints": {}
        }

        # Process each endpoint
        for key, endpoint in ARCGIS_ENDPOINTS.items():
            print(f"\n{'='*60}")
            print(f"Extracting: {endpoint['name']}")
            print(f"URL: {endpoint['url']}")
            print(f"{'='*60}")

            try:
                # Get service info
                info = await extractor.get_service_info(endpoint['url'])
                print(f"  Service type: {info.get('type', 'unknown')}")
                print(f"  Geometry type: {info.get('geometryType', 'unknown')}")

                # Get fields
                fields = info.get('fields', [])
                field_names = [f['name'] for f in fields]
                print(f"  Fields: {', '.join(field_names[:10])}...")

                # Check if service supports query
                if 'Query' not in info.get('capabilities', ''):
                    print("  [SKIP] Service doesn't support query")
                    continue

                # Query for Harris County
                # Try with geometry filter first
                harris_geometry = {
                    "xmin": HARRIS_COUNTY_BOUNDS["xmin"],
                    "ymin": HARRIS_COUNTY_BOUNDS["ymin"],
                    "xmax": HARRIS_COUNTY_BOUNDS["xmax"],
                    "ymax": HARRIS_COUNTY_BOUNDS["ymax"],
                    "spatialReference": {"wkid": 4326}
                }

                # Try to find county field
                county_fields = [f for f in field_names if 'county' in f.lower()]
                where_clause = "1=1"
                if county_fields:
                    # Try querying with county filter
                    where_clause = f"{county_fields[0]} LIKE '%Harris%'"
                    print(f"  Using county filter: {where_clause}")

                # Get total count
                total_count = await extractor.get_record_count(endpoint['url'], where_clause)
                print(f"  Total records matching filter: {total_count}")

                if total_count == 0:
                    # Try without county filter but with geometry
                    print("  Trying with geometry filter instead...")
                    total_count = await extractor.get_record_count(endpoint['url'], "1=1")
                    print(f"  Total records (all): {total_count}")
                    where_clause = "1=1"

                # Extract features
                features = await extractor.extract_all_features(
                    endpoint['url'],
                    where=where_clause,
                    geometry=harris_geometry if total_count > 10000 else None,
                    batch_size=1000
                )

                print(f"  Total features extracted: {len(features)}")

                # Save to file
                output_file = OUTPUT_DIR / f"hgac_{key}_{datetime.now().strftime('%Y%m%d')}.json"
                with open(output_file, 'w') as f:
                    json.dump({
                        "endpoint": endpoint,
                        "service_info": {
                            "type": info.get('type'),
                            "geometryType": info.get('geometryType'),
                            "fields": fields
                        },
                        "extraction_params": {
                            "where": where_clause,
                            "geometry_filter": harris_geometry if total_count > 10000 else None
                        },
                        "record_count": len(features),
                        "features": features
                    }, f, indent=2)

                print(f"  Saved to: {output_file}")

                results["endpoints"][key] = {
                    "name": endpoint['name'],
                    "url": endpoint['url'],
                    "record_count": len(features),
                    "output_file": str(output_file)
                }

            except Exception as e:
                print(f"  [ERROR] {e}")
                results["endpoints"][key] = {
                    "name": endpoint['name'],
                    "url": endpoint['url'],
                    "error": str(e)
                }

        # Save summary
        summary_file = OUTPUT_DIR / f"hgac_extraction_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(summary_file, 'w') as f:
            json.dump(results, f, indent=2)

        print(f"\n{'='*60}")
        print("EXTRACTION COMPLETE")
        print(f"{'='*60}")
        print(f"Summary saved to: {summary_file}")

        total_records = sum(
            ep.get('record_count', 0)
            for ep in results['endpoints'].values()
            if isinstance(ep.get('record_count'), int)
        )
        print(f"Total records extracted: {total_records}")

        return results


async def main():
    """Main entry point."""
    results = await extract_harris_county_ossf()
    return results


if __name__ == "__main__":
    asyncio.run(main())
