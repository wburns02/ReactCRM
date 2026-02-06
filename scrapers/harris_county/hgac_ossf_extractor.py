#!/usr/bin/env python3
"""
H-GAC OSSF Data Extractor for Harris County

Extracts OSSF (On-Site Sewage Facility / Septic) permit data from the
Houston-Galveston Area Council regional mapping tool.

Target: https://datalab.h-gac.com/ossf/
This is an ArcGIS web application showing OSSF permits for the Houston-Galveston
region (13 counties including Harris County).

Strategy:
1. Use Playwright to load the H-GAC OSSF mapping page
2. Intercept network requests to discover ArcGIS service URLs
3. Once endpoints are found, query them directly for Harris County data
4. Extract all OSSF permit locations with metadata
5. Save results to scrapers/output/harris_county/hgac_ossf_data.json

Usage:
    python hgac_ossf_extractor.py              # Full extraction
    python hgac_ossf_extractor.py --discover   # Only discover endpoints
    python hgac_ossf_extractor.py --test       # Test with sample data
"""

import asyncio
import aiohttp
import json
import logging
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Set, Any
from urllib.parse import urlparse, parse_qs

# Playwright imports
try:
    from playwright.async_api import async_playwright, Page, Route, Request
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("Warning: Playwright not available. Install with: pip install playwright && playwright install")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('hgac_ossf_extractor.log')
    ]
)
logger = logging.getLogger(__name__)

# Configuration
HGAC_OSSF_URL = "https://datalab.h-gac.com/ossf/"
OUTPUT_DIR = Path("C:/Users/Will/crm-work/ReactCRM/scrapers/output/harris_county")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Counties in H-GAC region (FIPS codes)
HGAC_COUNTIES = {
    '48039': 'Brazoria',
    '48071': 'Chambers',
    '48157': 'Fort Bend',
    '48167': 'Galveston',
    '48201': 'Harris',
    '48291': 'Liberty',
    '48339': 'Montgomery',
    '48473': 'Waller',
    '48015': 'Austin',
    '48089': 'Colorado',
    '48321': 'Matagorda',
    '48481': 'Wharton',
    '48187': 'Guadalupe',
}

# Harris County FIPS
HARRIS_COUNTY_FIPS = '48201'


class ArcGISEndpointDiscovery:
    """Discovers ArcGIS endpoints from web application network traffic."""

    def __init__(self):
        self.discovered_endpoints: Set[str] = set()
        self.feature_server_urls: List[str] = []
        self.map_server_urls: List[str] = []
        self.query_urls: List[Dict[str, Any]] = []

    def is_arcgis_url(self, url: str) -> bool:
        """Check if URL is an ArcGIS REST service."""
        arcgis_patterns = [
            r'arcgis/rest/services',
            r'services\.arcgis\.com',
            r'/FeatureServer/',
            r'/MapServer/',
            r'/query\?',
        ]
        return any(re.search(pattern, url, re.IGNORECASE) for pattern in arcgis_patterns)

    def extract_base_service_url(self, url: str) -> Optional[str]:
        """Extract the base service URL from a query URL."""
        # Remove query parameters
        base_url = url.split('?')[0]

        # Remove trailing /query, /0, /1, etc.
        base_url = re.sub(r'/query$', '', base_url)
        base_url = re.sub(r'/\d+$', '', base_url)

        return base_url

    def process_url(self, url: str, request_type: str = 'unknown'):
        """Process a discovered URL."""
        if not self.is_arcgis_url(url):
            return

        if url in self.discovered_endpoints:
            return

        self.discovered_endpoints.add(url)
        logger.info(f"  [{request_type}] Discovered ArcGIS URL: {url[:100]}...")

        # Categorize the URL
        if '/FeatureServer/' in url:
            base = self.extract_base_service_url(url)
            if base and base not in self.feature_server_urls:
                self.feature_server_urls.append(base)
                logger.info(f"    → FeatureServer: {base}")

        elif '/MapServer/' in url:
            base = self.extract_base_service_url(url)
            if base and base not in self.map_server_urls:
                self.map_server_urls.append(base)
                logger.info(f"    → MapServer: {base}")

        if '/query' in url:
            parsed = urlparse(url)
            query_params = parse_qs(parsed.query)
            self.query_urls.append({
                'url': url,
                'base': url.split('?')[0],
                'params': query_params
            })


async def discover_endpoints_with_playwright() -> ArcGISEndpointDiscovery:
    """
    Use Playwright to load the H-GAC OSSF page and discover ArcGIS endpoints.

    Returns:
        ArcGISEndpointDiscovery object with discovered endpoints
    """
    if not PLAYWRIGHT_AVAILABLE:
        raise RuntimeError("Playwright is required for endpoint discovery")

    discovery = ArcGISEndpointDiscovery()

    logger.info("=" * 60)
    logger.info("DISCOVERING ARCGIS ENDPOINTS")
    logger.info(f"Target: {HGAC_OSSF_URL}")
    logger.info("=" * 60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        page = await context.new_page()

        # Set up request interception
        async def handle_request(request: Request):
            url = request.url
            discovery.process_url(url, 'REQUEST')

        async def handle_response(response):
            url = response.url
            discovery.process_url(url, 'RESPONSE')

        page.on('request', handle_request)
        page.on('response', handle_response)

        logger.info("Loading H-GAC OSSF page...")

        try:
            # Navigate to the page
            await page.goto(HGAC_OSSF_URL, timeout=60000, wait_until='networkidle')
            logger.info("Page loaded successfully")

            # Wait for map to initialize
            await asyncio.sleep(5)

            # Try to interact with the map to trigger more requests
            logger.info("Interacting with map to discover additional endpoints...")

            # Try clicking on the map area to trigger feature queries
            try:
                # Look for map container
                map_selectors = [
                    '.esri-view-root',
                    '#viewDiv',
                    '.esri-ui',
                    '[data-testid="map-container"]',
                    'canvas',
                ]

                for selector in map_selectors:
                    try:
                        element = await page.query_selector(selector)
                        if element:
                            box = await element.bounding_box()
                            if box:
                                # Click center of map
                                center_x = box['x'] + box['width'] / 2
                                center_y = box['y'] + box['height'] / 2
                                await page.mouse.click(center_x, center_y)
                                logger.info(f"Clicked on {selector}")
                                await asyncio.sleep(2)
                                break
                    except Exception as e:
                        continue

            except Exception as e:
                logger.debug(f"Map interaction failed: {e}")

            # Try zooming to trigger tile/data requests
            try:
                await page.keyboard.press('+')
                await asyncio.sleep(2)
                await page.keyboard.press('+')
                await asyncio.sleep(2)
            except Exception as e:
                logger.debug(f"Zoom failed: {e}")

            # Look for layer toggle buttons or filter controls
            try:
                buttons = await page.query_selector_all('button, [role="button"]')
                for btn in buttons[:5]:  # Try first 5 buttons
                    try:
                        text = await btn.text_content()
                        if text and any(kw in text.lower() for kw in ['layer', 'filter', 'search', 'data']):
                            await btn.click()
                            await asyncio.sleep(1)
                    except Exception:
                        continue
            except Exception as e:
                logger.debug(f"Button interaction failed: {e}")

            # Final wait for any async requests
            await asyncio.sleep(3)

            # Take a screenshot for debugging
            screenshot_path = OUTPUT_DIR / 'hgac_ossf_discovery.png'
            await page.screenshot(path=str(screenshot_path))
            logger.info(f"Screenshot saved: {screenshot_path}")

            # Get page HTML for analysis
            html = await page.content()
            html_path = OUTPUT_DIR / 'hgac_ossf_page.html'
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html)
            logger.info(f"Page HTML saved: {html_path}")

            # Look for embedded config/URLs in the page
            scripts = await page.query_selector_all('script')
            for script in scripts:
                try:
                    content = await script.text_content()
                    if content:
                        # Look for ArcGIS URLs in scripts
                        urls = re.findall(r'https?://[^\s"\'<>]+arcgis[^\s"\'<>]+', content)
                        for url in urls:
                            discovery.process_url(url, 'SCRIPT')
                except Exception:
                    continue

        except Exception as e:
            logger.error(f"Error during discovery: {e}")

        finally:
            await browser.close()

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("DISCOVERY RESULTS")
    logger.info("=" * 60)
    logger.info(f"Total URLs discovered: {len(discovery.discovered_endpoints)}")
    logger.info(f"FeatureServer URLs: {len(discovery.feature_server_urls)}")
    logger.info(f"MapServer URLs: {len(discovery.map_server_urls)}")
    logger.info(f"Query URLs captured: {len(discovery.query_urls)}")

    if discovery.feature_server_urls:
        logger.info("\nFeatureServer Endpoints:")
        for url in discovery.feature_server_urls:
            logger.info(f"  - {url}")

    if discovery.map_server_urls:
        logger.info("\nMapServer Endpoints:")
        for url in discovery.map_server_urls:
            logger.info(f"  - {url}")

    return discovery


async def get_service_info(session: aiohttp.ClientSession, base_url: str) -> Dict[str, Any]:
    """Get metadata about an ArcGIS service."""
    try:
        info_url = f"{base_url}?f=json"
        async with session.get(info_url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status == 200:
                return await resp.json()
    except Exception as e:
        logger.debug(f"Error getting service info: {e}")
    return {}


async def get_layer_info(session: aiohttp.ClientSession, layer_url: str) -> Dict[str, Any]:
    """Get metadata about a specific layer."""
    try:
        info_url = f"{layer_url}?f=json"
        async with session.get(info_url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status == 200:
                return await resp.json()
    except Exception as e:
        logger.debug(f"Error getting layer info: {e}")
    return {}


async def get_record_count(session: aiohttp.ClientSession, layer_url: str, where: str = "1=1") -> int:
    """Get total record count for a layer with optional filter."""
    try:
        count_url = f"{layer_url}/query"
        params = {
            'where': where,
            'returnCountOnly': 'true',
            'f': 'json'
        }
        async with session.get(count_url, params=params, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get('count', 0)
    except Exception as e:
        logger.debug(f"Error getting count: {e}")
    return 0


async def fetch_records_batch(
    session: aiohttp.ClientSession,
    layer_url: str,
    where: str = "1=1",
    offset: int = 0,
    batch_size: int = 1000,
    out_fields: str = "*",
    return_geometry: bool = True,
    min_objectid: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Fetch a batch of records from an ArcGIS layer.

    Uses OBJECTID-based pagination for reliability.
    """
    try:
        query_url = f"{layer_url}/query"

        # Use OBJECTID-based pagination if provided
        effective_where = where
        if min_objectid is not None:
            if where == "1=1":
                effective_where = f"OBJECTID > {min_objectid}"
            else:
                effective_where = f"({where}) AND OBJECTID > {min_objectid}"

        params = {
            'where': effective_where,
            'outFields': out_fields,
            'returnGeometry': 'true' if return_geometry else 'false',
            'outSR': '4326',  # WGS84 lat/lon
            'orderByFields': 'OBJECTID ASC',
            'resultRecordCount': batch_size,
            'f': 'json'
        }

        # Only use offset if not using OBJECTID pagination
        if min_objectid is None:
            params['resultOffset'] = offset

        async with session.get(query_url, params=params, timeout=aiohttp.ClientTimeout(total=120)) as resp:
            if resp.status == 200:
                data = await resp.json()

                # Check for error
                if 'error' in data:
                    logger.error(f"ArcGIS error: {data['error']}")
                    return []

                features = data.get('features', [])
                return features

    except Exception as e:
        logger.error(f"Error fetching batch: {e}")
    return []


def extract_ossf_data(feature: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract and transform OSSF permit data from an ArcGIS feature.

    Common OSSF fields:
    - Permit number/ID
    - Permit date
    - System type (conventional, aerobic, etc.)
    - System age
    - Owner information
    - Address/location
    - County
    """
    attrs = feature.get('attributes', {})
    geometry = feature.get('geometry', {})

    # Extract coordinates
    latitude = None
    longitude = None

    if geometry:
        if 'x' in geometry and 'y' in geometry:
            longitude = geometry['x']
            latitude = geometry['y']
        elif 'rings' in geometry:
            # Polygon - calculate centroid
            rings = geometry['rings']
            if rings and rings[0]:
                coords = rings[0]
                xs = [c[0] for c in coords]
                ys = [c[1] for c in coords]
                longitude = sum(xs) / len(xs)
                latitude = sum(ys) / len(ys)

    # Convert timestamp fields
    def convert_timestamp(ts):
        if ts is None:
            return None
        try:
            if isinstance(ts, (int, float)):
                # Unix timestamp in milliseconds
                dt = datetime.fromtimestamp(ts / 1000, tz=timezone.utc)
                return dt.strftime('%Y-%m-%d')
            return str(ts)
        except Exception:
            return str(ts) if ts else None

    # Look for common field names (case-insensitive)
    def get_field(field_names: List[str], default=None):
        """Get field value, trying multiple possible field names."""
        for name in field_names:
            # Try exact match
            if name in attrs:
                return attrs[name]
            # Try case-insensitive
            for key in attrs:
                if key.lower() == name.lower():
                    return attrs[key]
        return default

    # Build standardized record
    record = {
        # Identifiers
        'object_id': get_field(['OBJECTID', 'ObjectID', 'objectid', 'FID']),
        'permit_id': get_field(['PermitID', 'PERMIT_ID', 'Permit_ID', 'PermitNo', 'PERMIT_NO',
                                'permit_number', 'PERMIT_NUMBER', 'OSSF_ID', 'ossf_id']),

        # Location
        'latitude': latitude,
        'longitude': longitude,
        'address': get_field(['Address', 'ADDRESS', 'Site_Address', 'SITE_ADDRESS',
                             'SiteAddress', 'Property_Address', 'PROPERTY_ADDRESS']),
        'city': get_field(['City', 'CITY', 'Site_City', 'SITE_CITY']),
        'county': get_field(['County', 'COUNTY', 'County_Name', 'COUNTY_NAME']),
        'county_fips': get_field(['County_FIPS', 'FIPS', 'CNTY_FIPS']),
        'zip_code': get_field(['Zip', 'ZIP', 'Zip_Code', 'ZIP_CODE', 'Zipcode']),

        # Permit details
        'permit_date': convert_timestamp(get_field(['PermitDate', 'PERMIT_DATE', 'Permit_Date',
                                                    'Issue_Date', 'ISSUE_DATE', 'IssueDate'])),
        'permit_year': get_field(['PermitYear', 'PERMIT_YEAR', 'Year', 'YEAR']),
        'permit_type': get_field(['PermitType', 'PERMIT_TYPE', 'Permit_Type', 'Type', 'TYPE']),
        'permit_status': get_field(['Status', 'STATUS', 'Permit_Status', 'PERMIT_STATUS']),

        # System details
        'system_type': get_field(['SystemType', 'SYSTEM_TYPE', 'System_Type', 'OSSF_Type',
                                  'OSSFType', 'Septic_Type', 'SEPTIC_TYPE']),
        'system_age': get_field(['Age', 'AGE', 'System_Age', 'SYSTEM_AGE', 'Years']),
        'system_size': get_field(['Size', 'SIZE', 'System_Size', 'SYSTEM_SIZE', 'GPD', 'Gallons']),
        'treatment_type': get_field(['Treatment', 'TREATMENT', 'Treatment_Type']),
        'disposal_type': get_field(['Disposal', 'DISPOSAL', 'Disposal_Type', 'DISPOSAL_TYPE']),

        # Owner info
        'owner_name': get_field(['Owner', 'OWNER', 'Owner_Name', 'OWNER_NAME',
                                'PropertyOwner', 'PROPERTY_OWNER']),

        # Metadata
        'source': 'hgac_ossf',
        'scraped_at': datetime.now(timezone.utc).isoformat(),

        # Keep all raw attributes for reference
        'raw_attributes': attrs
    }

    return record


async def scrape_ossf_data(
    layer_urls: List[str],
    county_filter: Optional[str] = None,
    batch_size: int = 1000
) -> List[Dict[str, Any]]:
    """
    Scrape OSSF data from discovered ArcGIS layers.

    Args:
        layer_urls: List of ArcGIS layer URLs to scrape
        county_filter: Optional county name to filter (e.g., 'Harris')
        batch_size: Records per batch

    Returns:
        List of OSSF records
    """
    all_records = []

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, */*',
        'Referer': HGAC_OSSF_URL
    }

    async with aiohttp.ClientSession(headers=headers) as session:
        for layer_url in layer_urls:
            logger.info("\n" + "-" * 60)
            logger.info(f"Scraping: {layer_url}")

            # Get layer info
            layer_info = await get_layer_info(session, layer_url)
            layer_name = layer_info.get('name', 'Unknown')
            logger.info(f"Layer name: {layer_name}")

            # Log available fields
            fields = layer_info.get('fields', [])
            if fields:
                field_names = [f.get('name') for f in fields]
                logger.info(f"Fields: {', '.join(field_names[:20])}...")

                # Save field info
                fields_file = OUTPUT_DIR / f"layer_fields_{layer_name.replace(' ', '_')}.json"
                with open(fields_file, 'w') as f:
                    json.dump(fields, f, indent=2)

            # Build WHERE clause for county filter
            where_clause = "1=1"
            if county_filter:
                # Try different county field names
                county_fields = ['County', 'COUNTY', 'County_Name', 'COUNTY_NAME', 'CNTY']
                for field in field_names:
                    if field.lower() in [cf.lower() for cf in county_fields]:
                        where_clause = f"{field} = '{county_filter}'"
                        logger.info(f"Using county filter: {where_clause}")
                        break

            # Get total count
            total_count = await get_record_count(session, layer_url, where_clause)
            logger.info(f"Total records: {total_count:,}")

            if total_count == 0:
                logger.warning("No records found for this layer")
                continue

            # Fetch all records using OBJECTID pagination
            layer_records = []
            max_objectid = 0
            consecutive_empty = 0

            while len(layer_records) < total_count and consecutive_empty < 3:
                logger.info(f"  Fetching after OBJECTID {max_objectid:,} ({len(layer_records):,}/{total_count:,})")

                features = await fetch_records_batch(
                    session,
                    layer_url,
                    where=where_clause,
                    batch_size=batch_size,
                    min_objectid=max_objectid if max_objectid > 0 else None
                )

                if not features:
                    consecutive_empty += 1
                    logger.warning(f"  Empty batch, count: {consecutive_empty}")
                    continue

                consecutive_empty = 0

                # Process features
                batch_max_id = 0
                for feature in features:
                    record = extract_ossf_data(feature)

                    # Track max OBJECTID
                    obj_id = record.get('object_id')
                    if obj_id:
                        batch_max_id = max(batch_max_id, obj_id)

                    layer_records.append(record)

                if batch_max_id > max_objectid:
                    max_objectid = batch_max_id

                # Rate limiting
                await asyncio.sleep(0.5)

            logger.info(f"  Retrieved {len(layer_records):,} records from {layer_name}")
            all_records.extend(layer_records)

            # Save intermediate results
            if layer_records:
                layer_file = OUTPUT_DIR / f"ossf_{layer_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                with open(layer_file, 'w') as f:
                    json.dump({
                        'source': layer_url,
                        'layer_name': layer_name,
                        'count': len(layer_records),
                        'extracted_at': datetime.now().isoformat(),
                        'records': layer_records
                    }, f)
                logger.info(f"  Saved: {layer_file}")

    return all_records


async def probe_common_hgac_endpoints(session: aiohttp.ClientSession) -> List[str]:
    """
    Probe common H-GAC ArcGIS endpoint patterns to find OSSF services.

    H-GAC typically uses patterns like:
    - https://gis.h-gac.com/arcgis/rest/services/...
    - https://services.arcgis.com/gl6...../arcgis/rest/services/...
    """
    discovered_layers = []

    # Common H-GAC service patterns to try
    potential_bases = [
        "https://gis.h-gac.com/arcgis/rest/services",
        "https://services.arcgis.com/gl6pnCO7DYTywmpe/arcgis/rest/services",
        "https://services1.arcgis.com/gl6pnCO7DYTywmpe/arcgis/rest/services",
        "https://services2.arcgis.com/gl6pnCO7DYTywmpe/arcgis/rest/services",
    ]

    # Common service name patterns
    service_patterns = [
        "OSSF", "ossf", "Septic", "septic",
        "Wastewater", "OnsiteSewage", "OnSite_Sewage",
        "EnvironmentalHealth", "Environmental_Health"
    ]

    logger.info("Probing common H-GAC ArcGIS endpoints...")

    for base in potential_bases:
        # Try to get service catalog
        try:
            catalog_url = f"{base}?f=json"
            async with session.get(catalog_url, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    services = data.get('services', [])
                    folders = data.get('folders', [])

                    logger.info(f"Found catalog at {base}")
                    logger.info(f"  Services: {len(services)}, Folders: {len(folders)}")

                    # Check services for OSSF-related names
                    for svc in services:
                        name = svc.get('name', '')
                        svc_type = svc.get('type', '')

                        if any(pattern.lower() in name.lower() for pattern in service_patterns):
                            if svc_type in ['FeatureServer', 'MapServer']:
                                layer_url = f"{base}/{name}/{svc_type}/0"
                                discovered_layers.append(layer_url)
                                logger.info(f"  Found potential OSSF service: {name}")

                    # Check folders
                    for folder in folders:
                        try:
                            folder_url = f"{base}/{folder}?f=json"
                            async with session.get(folder_url, timeout=aiohttp.ClientTimeout(total=10)) as folder_resp:
                                if folder_resp.status == 200:
                                    folder_data = await folder_resp.json()
                                    for svc in folder_data.get('services', []):
                                        name = svc.get('name', '')
                                        svc_type = svc.get('type', '')

                                        if any(pattern.lower() in name.lower() for pattern in service_patterns):
                                            if svc_type in ['FeatureServer', 'MapServer']:
                                                layer_url = f"{base}/{name}/{svc_type}/0"
                                                discovered_layers.append(layer_url)
                                                logger.info(f"  Found potential OSSF service in {folder}: {name}")
                        except Exception:
                            continue

        except Exception as e:
            logger.debug(f"Error probing {base}: {e}")

    return discovered_layers


async def main():
    """Main entry point."""
    logger.info("=" * 60)
    logger.info("H-GAC OSSF DATA EXTRACTOR")
    logger.info(f"Target: {HGAC_OSSF_URL}")
    logger.info(f"Output: {OUTPUT_DIR}")
    logger.info("=" * 60)

    # Check command line arguments
    discover_only = '--discover' in sys.argv
    test_mode = '--test' in sys.argv

    # Step 1: Discover ArcGIS endpoints
    layer_urls = []

    if PLAYWRIGHT_AVAILABLE:
        try:
            discovery = await discover_endpoints_with_playwright()

            # Collect all discovered layer URLs
            for url in discovery.feature_server_urls:
                # Add layer 0 by default
                layer_urls.append(f"{url}/0")

            for url in discovery.map_server_urls:
                # Add layer 0 by default
                layer_urls.append(f"{url}/0")

            # Also extract layer URLs from query URLs
            for query in discovery.query_urls:
                base = query.get('base', '')
                if base and base not in layer_urls:
                    # Remove /query suffix
                    base = re.sub(r'/query$', '', base)
                    layer_urls.append(base)

        except Exception as e:
            logger.error(f"Playwright discovery failed: {e}")
    else:
        logger.warning("Playwright not available, using fallback endpoint probing")

    # Step 2: Probe common endpoints as fallback
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
    }

    async with aiohttp.ClientSession(headers=headers) as session:
        probed_urls = await probe_common_hgac_endpoints(session)
        for url in probed_urls:
            if url not in layer_urls:
                layer_urls.append(url)

    # Remove duplicates and validate URLs
    layer_urls = list(set(layer_urls))

    # Save discovered endpoints
    endpoints_file = OUTPUT_DIR / 'discovered_endpoints.json'
    with open(endpoints_file, 'w') as f:
        json.dump({
            'discovered_at': datetime.now().isoformat(),
            'layer_urls': layer_urls
        }, f, indent=2)
    logger.info(f"\nDiscovered endpoints saved: {endpoints_file}")

    if discover_only:
        logger.info("\nDiscovery-only mode, exiting")
        return

    if not layer_urls:
        logger.error("No ArcGIS layer URLs discovered!")
        logger.info("Try running with --discover to see detailed discovery output")

        # Provide manual fallback URLs to try
        logger.info("\nAttempting known H-GAC patterns...")

        # These are educated guesses based on H-GAC patterns
        fallback_urls = [
            "https://services.arcgis.com/gl6pnCO7DYTywmpe/arcgis/rest/services/OSSF/FeatureServer/0",
            "https://gis.h-gac.com/arcgis/rest/services/OSSF/MapServer/0",
        ]
        layer_urls = fallback_urls

    logger.info(f"\nTotal layer URLs to scrape: {len(layer_urls)}")
    for url in layer_urls:
        logger.info(f"  - {url}")

    # Step 3: Validate endpoints and scrape data
    valid_urls = []

    async with aiohttp.ClientSession(headers=headers) as session:
        for url in layer_urls:
            logger.info(f"\nValidating: {url}")
            try:
                count = await get_record_count(session, url)
                if count > 0:
                    logger.info(f"  → Valid ({count:,} records)")
                    valid_urls.append(url)
                else:
                    logger.info(f"  → No records or invalid")
            except Exception as e:
                logger.error(f"  → Error: {e}")

    if not valid_urls:
        logger.error("No valid ArcGIS endpoints found!")
        return

    # Step 4: Scrape OSSF data
    if test_mode:
        logger.info("\nTest mode: Scraping sample data only")
        # Just fetch a few records
        all_records = await scrape_ossf_data(valid_urls[:1], batch_size=10)
        if all_records:
            logger.info(f"\nSample record:")
            logger.info(json.dumps(all_records[0], indent=2, default=str))
    else:
        # Full extraction for Harris County
        logger.info("\nExtracting Harris County OSSF data...")
        all_records = await scrape_ossf_data(valid_urls, county_filter='Harris', batch_size=1000)

        # If no Harris County filter worked, try without filter
        if not all_records:
            logger.info("No Harris County data found, trying without county filter...")
            all_records = await scrape_ossf_data(valid_urls, batch_size=1000)

    # Step 5: Save final results
    if all_records:
        output_file = OUTPUT_DIR / 'hgac_ossf_data.json'
        with open(output_file, 'w') as f:
            json.dump({
                'source': 'H-GAC OSSF Regional Mapping',
                'url': HGAC_OSSF_URL,
                'total_records': len(all_records),
                'extracted_at': datetime.now().isoformat(),
                'records': all_records
            }, f)

        logger.info("\n" + "=" * 60)
        logger.info("EXTRACTION COMPLETE")
        logger.info("=" * 60)
        logger.info(f"Total records: {len(all_records):,}")
        logger.info(f"Output file: {output_file}")

        # Summary by county
        county_counts = {}
        for record in all_records:
            county = record.get('county') or 'Unknown'
            county_counts[county] = county_counts.get(county, 0) + 1

        logger.info("\nRecords by county:")
        for county, count in sorted(county_counts.items(), key=lambda x: -x[1]):
            logger.info(f"  {county}: {count:,}")
    else:
        logger.warning("No records extracted!")


if __name__ == '__main__':
    asyncio.run(main())
