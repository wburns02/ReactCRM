#!/usr/bin/env python3
"""
Texas OSSF Data Discovery
Discovers and extracts OSSF (septic) permit data from various Texas sources:
1. TCEQ GIS Services
2. H-GAC (13-county Houston region)
3. CAPCOG (10-county Austin region including Hays)
4. AACOG (Bexar/San Antonio region)
5. Other COG regions
"""
import requests
import json
import time
import os
from datetime import datetime
from typing import Dict, List, Any

OUTPUT_DIR = "/root/scrapers/output/texas_ossf_discovery"

# Known ArcGIS endpoints to check
ARCGIS_ENDPOINTS = [
    # H-GAC (Houston region - 13 counties)
    {
        "name": "H-GAC OSSF Permits",
        "url": "https://gis.h-gac.com/arcgis/rest/services/OSSF",
        "region": "Houston-Galveston",
        "counties": ["Harris", "Fort Bend", "Montgomery", "Brazoria", "Galveston", "Liberty",
                    "Chambers", "Waller", "Austin", "Colorado", "Walker", "Matagorda", "Wharton"]
    },
    # TCEQ
    {
        "name": "TCEQ GIS Services",
        "url": "https://gisweb.tceq.texas.gov/arcgis/rest/services",
        "region": "Statewide"
    },
    {
        "name": "TCEQ Open Data",
        "url": "https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services",
        "region": "Statewide"
    },
    # CAPCOG (Austin region - Hays County)
    {
        "name": "CAPCOG GIS",
        "url": "https://maps.capcog.org/arcgis/rest/services",
        "region": "Capital Area",
        "counties": ["Travis", "Williamson", "Hays", "Bastrop", "Caldwell", "Blanco",
                    "Burnet", "Fayette", "Lee", "Llano"]
    },
    # Bexar County direct
    {
        "name": "Bexar County GIS",
        "url": "https://gis.bexar.org/arcgis/rest/services",
        "region": "Bexar"
    },
    # Hays County direct
    {
        "name": "Hays County GIS",
        "url": "https://maps.co.hays.tx.us/arcgis/rest/services",
        "region": "Hays"
    }
]

def fetch_json(url: str, params: Dict = None) -> Any:
    """Fetch JSON from URL"""
    try:
        if params is None:
            params = {"f": "json"}
        resp = requests.get(url, params=params, timeout=30)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"  Error fetching {url}: {e}")
    return None

def discover_services(base_url: str) -> List[Dict]:
    """Discover all services at an ArcGIS REST endpoint"""
    services = []

    # Get root services
    data = fetch_json(base_url)
    if not data:
        return services

    # Process folders
    folders = data.get("folders", [])
    for folder in folders:
        folder_url = f"{base_url}/{folder}"
        folder_data = fetch_json(folder_url)
        if folder_data:
            for svc in folder_data.get("services", []):
                services.append({
                    "name": svc.get("name"),
                    "type": svc.get("type"),
                    "url": f"{base_url}/{svc.get('name')}/{svc.get('type')}"
                })

    # Process root services
    for svc in data.get("services", []):
        services.append({
            "name": svc.get("name"),
            "type": svc.get("type"),
            "url": f"{base_url}/{svc.get('name')}/{svc.get('type')}"
        })

    return services

def get_layer_info(service_url: str) -> List[Dict]:
    """Get layer information from a MapServer or FeatureServer"""
    layers = []
    data = fetch_json(service_url)
    if not data:
        return layers

    for layer in data.get("layers", []):
        layer_info = {
            "id": layer.get("id"),
            "name": layer.get("name"),
            "url": f"{service_url}/{layer.get('id')}"
        }
        layers.append(layer_info)

    return layers

def query_layer(layer_url: str, where: str = "1=1", out_fields: str = "*",
                return_count_only: bool = False) -> Any:
    """Query a feature layer"""
    params = {
        "where": where,
        "outFields": out_fields,
        "f": "json"
    }

    if return_count_only:
        params["returnCountOnly"] = "true"

    return fetch_json(f"{layer_url}/query", params)

def find_ossf_layers(endpoint: Dict) -> List[Dict]:
    """Find OSSF-related layers in an endpoint"""
    ossf_layers = []
    print(f"\nSearching: {endpoint['name']} ({endpoint.get('region', 'Unknown region')})")
    print(f"URL: {endpoint['url']}")

    # Discover services
    services = discover_services(endpoint["url"])
    print(f"  Found {len(services)} services")

    # Look for OSSF-related services
    for svc in services:
        name = svc.get("name", "").lower()
        keywords = ["ossf", "septic", "sewage", "wastewater", "onsite", "permit"]

        if any(kw in name for kw in keywords):
            print(f"  [OSSF] {svc['name']} ({svc['type']})")

            # Get layers
            layers = get_layer_info(svc["url"])
            for layer in layers:
                # Get record count
                count_data = query_layer(layer["url"], return_count_only=True)
                count = count_data.get("count", 0) if count_data else 0

                layer["service_name"] = svc["name"]
                layer["service_url"] = svc["url"]
                layer["record_count"] = count
                layer["endpoint"] = endpoint["name"]
                layer["region"] = endpoint.get("region", "Unknown")
                ossf_layers.append(layer)

                print(f"    - {layer['name']}: {count:,} records")

    return ossf_layers

def extract_layer_data(layer: Dict, output_dir: str, county_filter: str = None) -> Dict:
    """Extract all data from a layer"""
    url = layer["url"]
    name = layer["name"].replace(" ", "_").replace("/", "_")

    # Get field info
    layer_info = fetch_json(url)
    if not layer_info:
        return {"error": "Could not get layer info"}

    # Build where clause
    where = "1=1"
    if county_filter:
        # Try common county field names
        for field in layer_info.get("fields", []):
            fname = field.get("name", "").lower()
            if "county" in fname:
                where = f"{field['name']} = '{county_filter}'"
                break

    # Query in batches
    all_features = []
    offset = 0
    batch_size = 1000

    while True:
        params = {
            "where": where,
            "outFields": "*",
            "returnGeometry": "true",
            "resultOffset": offset,
            "resultRecordCount": batch_size,
            "f": "json"
        }

        data = fetch_json(f"{url}/query", params)
        if not data:
            break

        features = data.get("features", [])
        if not features:
            break

        all_features.extend(features)
        print(f"  Retrieved {len(all_features)} records...")

        if len(features) < batch_size:
            break

        offset += batch_size
        time.sleep(0.5)  # Rate limiting

    # Save results
    output_file = os.path.join(output_dir, f"{name}_{datetime.now().strftime('%Y%m%d')}.json")

    result = {
        "layer_name": layer["name"],
        "layer_url": url,
        "where_clause": where,
        "record_count": len(all_features),
        "extraction_date": datetime.now().isoformat(),
        "features": all_features
    }

    with open(output_file, "w") as f:
        json.dump(result, f)

    print(f"  Saved {len(all_features)} records to {output_file}")
    return {"file": output_file, "count": len(all_features)}

def main():
    """Main discovery and extraction"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("="*60)
    print("TEXAS OSSF DATA DISCOVERY")
    print("="*60)

    all_layers = []

    # Discover OSSF layers in all endpoints
    for endpoint in ARCGIS_ENDPOINTS:
        try:
            layers = find_ossf_layers(endpoint)
            all_layers.extend(layers)
        except Exception as e:
            print(f"  Error: {e}")

    # Summary
    print("\n" + "="*60)
    print("DISCOVERY SUMMARY")
    print("="*60)

    total_records = 0
    for layer in all_layers:
        print(f"  {layer['endpoint']}: {layer['name']} - {layer.get('record_count', 0):,} records")
        total_records += layer.get("record_count", 0)

    print(f"\nTotal OSSF layers found: {len(all_layers)}")
    print(f"Total records available: {total_records:,}")

    # Save discovery results
    discovery_file = os.path.join(OUTPUT_DIR, f"discovery_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(discovery_file, "w") as f:
        json.dump({
            "discovery_date": datetime.now().isoformat(),
            "endpoints_searched": len(ARCGIS_ENDPOINTS),
            "layers_found": len(all_layers),
            "total_records": total_records,
            "layers": all_layers
        }, f, indent=2)

    print(f"\nDiscovery results saved to: {discovery_file}")

    # Extract data from H-GAC (which we know works)
    print("\n" + "="*60)
    print("EXTRACTING H-GAC DATA (All 13 counties)")
    print("="*60)

    hgac_layers = [l for l in all_layers if "H-GAC" in l.get("endpoint", "")]
    for layer in hgac_layers:
        if layer.get("record_count", 0) > 0:
            print(f"\nExtracting: {layer['name']}")
            extract_layer_data(layer, OUTPUT_DIR)

    print("\nDone!")

if __name__ == "__main__":
    main()
