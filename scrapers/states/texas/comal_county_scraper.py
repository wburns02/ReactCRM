"""
Comal County Septic Permit Scraper
===================================

Extracts septic permit data from Comal County Engineer's Office (CCEO)
https://cceo.comalcounty.gov/searches/record_search.html

API Discovery:
- Found 4 typeahead JSON endpoints that can enumerate permits
- Main results endpoint is broken (PHP/SQL Server error)
- Estimated 100,000+ permits in system

Strategy:
1. Use typeahead endpoints to enumerate all permit numbers, addresses, owner names
2. Optionally use Playwright for full permit details (if needed)
"""

import requests
import json
import time
import os
import logging
from typing import List, Dict, Set, Optional
from datetime import datetime
from dataclasses import dataclass, asdict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class ComalPermitBasic:
    """Basic permit info from typeahead endpoints."""
    permit_number: str
    source_endpoint: str
    raw_value: str
    scraped_at: str


class ComalCountyScraper:
    """Scraper for Comal County Engineer's Office septic permits."""

    BASE_URL = "https://cceo.comalcounty.gov/searches/"

    ENDPOINTS = {
        "name": "NameSearch.php",
        "address": "AddressSearch.php",
        "permit": "PermitNumSearch.php",
        "subdivision": "SubnameSearch.php"
    }

    # Decodo proxy configuration
    DECODO_USER = "sp8b4zyxfs"
    DECODO_PASS = "0lc1bmjJ49laKet_BL"
    DECODO_HOST = "dc.decodo.com"
    DECODO_PORTS = list(range(10001, 10011))  # 10 rotating IPs

    def __init__(
        self,
        use_proxy: bool = True,
        request_delay: float = 0.3,
        output_dir: str = "scrapers/output/texas/comal_county"
    ):
        self.use_proxy = use_proxy
        self.request_delay = request_delay
        self.output_dir = output_dir
        self.current_port_idx = 0
        self.session = requests.Session()

        # Create output directory
        os.makedirs(output_dir, exist_ok=True)

    def _get_proxy(self) -> Optional[Dict[str, str]]:
        """Get current Decodo proxy configuration with rotation."""
        if not self.use_proxy:
            return None

        port = self.DECODO_PORTS[self.current_port_idx]
        self.current_port_idx = (self.current_port_idx + 1) % len(self.DECODO_PORTS)

        proxy_url = f"http://{self.DECODO_USER}:{self.DECODO_PASS}@{self.DECODO_HOST}:{port}"
        return {
            "http": proxy_url,
            "https": proxy_url
        }

    def _make_request(self, endpoint: str, query: str) -> Optional[List[Dict]]:
        """Make a request to a typeahead endpoint."""
        url = f"{self.BASE_URL}{endpoint}"
        params = {"query": query}

        try:
            response = self.session.get(
                url,
                params=params,
                proxies=self._get_proxy(),
                timeout=30,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "application/json, text/javascript, */*; q=0.01",
                    "X-Requested-With": "XMLHttpRequest"
                }
            )

            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"Request failed: {response.status_code} for query={query}")
                return None

        except Exception as e:
            logger.error(f"Request error: {e}")
            return None

    def enumerate_permits_by_prefix(
        self,
        start_prefix: int = 1,
        end_prefix: int = 1200,
        test_mode: bool = False
    ) -> Set[str]:
        """
        Enumerate all permit numbers by querying with numeric prefixes.

        The typeahead returns ~20 results per query, so we iterate through
        prefixes 1-1199 to cover permits 1-119999+.
        """
        all_permits: Set[str] = set()
        checkpoint_file = os.path.join(self.output_dir, "enumeration_checkpoint.json")

        # Load checkpoint if exists
        start_from = start_prefix
        if os.path.exists(checkpoint_file):
            with open(checkpoint_file, 'r') as f:
                checkpoint = json.load(f)
                start_from = checkpoint.get('last_prefix', start_prefix) + 1
                all_permits = set(checkpoint.get('permits', []))
                logger.info(f"Resuming from prefix {start_from}, {len(all_permits)} permits loaded")

        if test_mode:
            end_prefix = min(start_prefix + 10, end_prefix)
            logger.info(f"TEST MODE: Only checking prefixes {start_prefix}-{end_prefix}")

        for prefix in range(start_from, end_prefix + 1):
            results = self._make_request(self.ENDPOINTS["permit"], str(prefix))

            if results:
                new_permits = {item['value'] for item in results if 'value' in item}
                before_count = len(all_permits)
                all_permits.update(new_permits)
                added = len(all_permits) - before_count

                logger.info(f"Prefix {prefix}: {len(results)} results, {added} new permits (total: {len(all_permits)})")

            # Save checkpoint every 50 prefixes
            if prefix % 50 == 0:
                with open(checkpoint_file, 'w') as f:
                    json.dump({
                        'last_prefix': prefix,
                        'permits': list(all_permits),
                        'updated_at': datetime.now().isoformat()
                    }, f)
                logger.info(f"Checkpoint saved at prefix {prefix}")

            time.sleep(self.request_delay)

        return all_permits

    def enumerate_permits_deep(self) -> Set[str]:
        """
        Deep enumeration using 2-5 digit prefixes to get ALL permits.

        The typeahead returns max 20 results per query, so we need finer
        granularity to capture all ~119K permits.
        """
        all_permits: Set[str] = set()
        checkpoint_file = os.path.join(self.output_dir, "deep_enumeration_checkpoint.json")

        # Load checkpoint if exists
        completed_prefixes = set()
        if os.path.exists(checkpoint_file):
            with open(checkpoint_file, 'r') as f:
                checkpoint = json.load(f)
                all_permits = set(checkpoint.get('permits', []))
                completed_prefixes = set(checkpoint.get('completed_prefixes', []))
                logger.info(f"Resuming deep enumeration, {len(all_permits)} permits, {len(completed_prefixes)} prefixes done")

        # Strategy: Query all 2-digit to 6-digit prefixes
        # This ensures we hit every possible permit number range

        total_queries = 0

        # Phase 1: 1-digit prefixes (1-9)
        logger.info("Phase 1: 1-digit prefixes (1-9)")
        for i in range(1, 10):
            prefix = str(i)
            if prefix in completed_prefixes:
                continue
            results = self._make_request(self.ENDPOINTS["permit"], prefix)
            if results:
                new_permits = {item['value'] for item in results if 'value' in item}
                all_permits.update(new_permits)
            completed_prefixes.add(prefix)
            total_queries += 1
            time.sleep(self.request_delay)

        # Phase 2: 2-digit prefixes (10-99)
        logger.info("Phase 2: 2-digit prefixes (10-99)")
        for i in range(10, 100):
            prefix = str(i)
            if prefix in completed_prefixes:
                continue
            results = self._make_request(self.ENDPOINTS["permit"], prefix)
            if results:
                new_permits = {item['value'] for item in results if 'value' in item}
                all_permits.update(new_permits)
            completed_prefixes.add(prefix)
            total_queries += 1
            if total_queries % 50 == 0:
                logger.info(f"Progress: {total_queries} queries, {len(all_permits)} permits")
            time.sleep(self.request_delay)

        # Phase 3: 3-digit prefixes (100-999)
        logger.info("Phase 3: 3-digit prefixes (100-999)")
        for i in range(100, 1000):
            prefix = str(i)
            if prefix in completed_prefixes:
                continue
            results = self._make_request(self.ENDPOINTS["permit"], prefix)
            if results:
                new_permits = {item['value'] for item in results if 'value' in item}
                all_permits.update(new_permits)
            completed_prefixes.add(prefix)
            total_queries += 1
            if total_queries % 100 == 0:
                logger.info(f"Progress: {total_queries} queries, {len(all_permits)} permits")
                # Save checkpoint
                with open(checkpoint_file, 'w') as f:
                    json.dump({
                        'permits': list(all_permits),
                        'completed_prefixes': list(completed_prefixes),
                        'updated_at': datetime.now().isoformat()
                    }, f)
            time.sleep(self.request_delay)

        # Phase 4: 4-digit prefixes (1000-9999)
        logger.info("Phase 4: 4-digit prefixes (1000-9999)")
        for i in range(1000, 10000):
            prefix = str(i)
            if prefix in completed_prefixes:
                continue
            results = self._make_request(self.ENDPOINTS["permit"], prefix)
            if results:
                new_permits = {item['value'] for item in results if 'value' in item}
                all_permits.update(new_permits)
            completed_prefixes.add(prefix)
            total_queries += 1
            if total_queries % 500 == 0:
                logger.info(f"Progress: {total_queries} queries, {len(all_permits)} permits")
                # Save checkpoint
                with open(checkpoint_file, 'w') as f:
                    json.dump({
                        'permits': list(all_permits),
                        'completed_prefixes': list(completed_prefixes),
                        'updated_at': datetime.now().isoformat()
                    }, f)
            time.sleep(self.request_delay)

        # Phase 5: 5-digit prefixes (10000-99999)
        logger.info("Phase 5: 5-digit prefixes (10000-99999)")
        for i in range(10000, 100000):
            prefix = str(i)
            if prefix in completed_prefixes:
                continue
            results = self._make_request(self.ENDPOINTS["permit"], prefix)
            if results:
                new_permits = {item['value'] for item in results if 'value' in item}
                all_permits.update(new_permits)
            completed_prefixes.add(prefix)
            total_queries += 1
            if total_queries % 1000 == 0:
                logger.info(f"Progress: {total_queries} queries, {len(all_permits)} permits")
                # Save checkpoint
                with open(checkpoint_file, 'w') as f:
                    json.dump({
                        'permits': list(all_permits),
                        'completed_prefixes': list(completed_prefixes),
                        'updated_at': datetime.now().isoformat()
                    }, f)
            time.sleep(self.request_delay)

        # Phase 6: 6-digit prefixes for 100000-119999 range
        logger.info("Phase 6: 6-digit prefixes (100000-119999)")
        for i in range(100000, 120000):
            prefix = str(i)
            if prefix in completed_prefixes:
                continue
            results = self._make_request(self.ENDPOINTS["permit"], prefix)
            if results:
                new_permits = {item['value'] for item in results if 'value' in item}
                all_permits.update(new_permits)
            completed_prefixes.add(prefix)
            total_queries += 1
            if total_queries % 1000 == 0:
                logger.info(f"Progress: {total_queries} queries, {len(all_permits)} permits")
                # Save checkpoint
                with open(checkpoint_file, 'w') as f:
                    json.dump({
                        'permits': list(all_permits),
                        'completed_prefixes': list(completed_prefixes),
                        'updated_at': datetime.now().isoformat()
                    }, f)
            time.sleep(self.request_delay)

        logger.info(f"Deep enumeration complete: {total_queries} queries, {len(all_permits)} permits")
        return all_permits

    def enumerate_addresses(self, letter_prefixes: str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") -> Set[str]:
        """Enumerate addresses by querying with letter/number prefixes."""
        all_addresses: Set[str] = set()

        for prefix in letter_prefixes:
            results = self._make_request(self.ENDPOINTS["address"], prefix)

            if results:
                addresses = {item['value'] for item in results if 'value' in item}
                all_addresses.update(addresses)
                logger.info(f"Address prefix '{prefix}': {len(results)} results (total: {len(all_addresses)})")

            time.sleep(self.request_delay)

        return all_addresses

    def enumerate_owners(self, letter_prefixes: str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ") -> Set[str]:
        """Enumerate owner names by querying with letter prefixes."""
        all_owners: Set[str] = set()

        for prefix in letter_prefixes:
            results = self._make_request(self.ENDPOINTS["name"], prefix)

            if results:
                owners = {item['value'] for item in results if 'value' in item}
                all_owners.update(owners)
                logger.info(f"Owner prefix '{prefix}': {len(results)} results (total: {len(all_owners)})")

            time.sleep(self.request_delay)

        return all_owners

    def test_endpoints(self) -> Dict[str, any]:
        """Test all endpoints and return status report."""
        logger.info("Testing Comal County typeahead endpoints...")

        results = {}

        for name, endpoint in self.ENDPOINTS.items():
            test_queries = {
                "permit": "119",
                "address": "123",
                "name": "smith",
                "subdivision": "ranch"
            }

            query = test_queries.get(name, "test")
            data = self._make_request(endpoint, query)

            results[name] = {
                "endpoint": endpoint,
                "query": query,
                "status": "OK" if data else "FAILED",
                "count": len(data) if data else 0,
                "sample": data[:2] if data else None
            }

            logger.info(f"  {name}: {results[name]['status']} ({results[name]['count']} results)")
            time.sleep(0.5)

        return results

    def run_full_extraction(self, test_mode: bool = False) -> Dict[str, any]:
        """Run full extraction and save results."""
        start_time = datetime.now()

        logger.info("=" * 60)
        logger.info("COMAL COUNTY SEPTIC PERMIT EXTRACTION")
        logger.info("=" * 60)

        # Step 1: Test endpoints
        logger.info("\n[1/5] Testing endpoints...")
        endpoint_status = self.test_endpoints()

        # Step 2: Enumerate permits
        logger.info("\n[2/5] Enumerating permit numbers...")
        permits = self.enumerate_permits_by_prefix(test_mode=test_mode)

        # Step 3: Enumerate addresses
        logger.info("\n[3/5] Enumerating addresses...")
        addresses = self.enumerate_addresses()

        # Step 4: Enumerate owners
        logger.info("\n[4/5] Enumerating owner names...")
        owners = self.enumerate_owners()

        # Step 5: Save results
        logger.info("\n[5/5] Saving results...")

        output_file = os.path.join(
            self.output_dir,
            f"comal_full_extraction_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )

        results = {
            "portal": "Comal County Engineer's Office",
            "url": "https://cceo.comalcounty.gov/searches/record_search.html",
            "extraction_date": datetime.now().isoformat(),
            "permit_count": len(permits),
            "address_count": len(addresses),
            "owner_count": len(owners),
            "permits": sorted(list(permits)),
            "addresses": sorted(list(addresses)),
            "owners": sorted(list(owners)),
            "endpoint_status": endpoint_status
        }

        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)

        # Also save as NDJSON for easier processing
        ndjson_file = os.path.join(
            self.output_dir,
            f"comal_permits_{datetime.now().strftime('%Y%m%d_%H%M%S')}.ndjson"
        )
        with open(ndjson_file, 'w') as f:
            for permit in sorted(permits):
                record = {
                    "permit_number": permit,
                    "county": "Comal",
                    "state": "TX",
                    "source": "cceo.comalcounty.gov",
                    "scraped_at": datetime.now().isoformat()
                }
                f.write(json.dumps(record) + "\n")

        elapsed = (datetime.now() - start_time).total_seconds()

        logger.info("=" * 60)
        logger.info(f"EXTRACTION COMPLETE")
        logger.info(f"  Permits found: {len(permits)}")
        logger.info(f"  Addresses found: {len(addresses)}")
        logger.info(f"  Owners found: {len(owners)}")
        logger.info(f"  Output file: {output_file}")
        logger.info(f"  NDJSON file: {ndjson_file}")
        logger.info(f"  Elapsed time: {elapsed:.1f} seconds")
        logger.info("=" * 60)

        return results


def main():
    """Main entry point for the scraper."""
    import argparse

    parser = argparse.ArgumentParser(description="Comal County Septic Permit Scraper")
    parser.add_argument("--test", action="store_true", help="Run in test mode (limited queries)")
    parser.add_argument("--no-proxy", action="store_true", help="Disable Decodo proxy")
    parser.add_argument("--test-endpoints", action="store_true", help="Only test endpoints")
    args = parser.parse_args()

    scraper = ComalCountyScraper(
        use_proxy=not args.no_proxy,
        request_delay=0.3 if args.no_proxy else 0.2  # Faster with proxy
    )

    if args.test_endpoints:
        results = scraper.test_endpoints()
        print(json.dumps(results, indent=2))
    else:
        scraper.run_full_extraction(test_mode=args.test)


if __name__ == "__main__":
    main()
