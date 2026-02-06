#!/usr/bin/env python3
"""
EnerGov Portal Discovery
Discovers all EnerGov/Tyler portals by checking URL patterns
"""
import requests
import json
import time
import re
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import urllib3
urllib3.disable_warnings()

OUTPUT_DIR = '/root/scrapers/output/platform_discovery'

print('='*60)
print('ENERGOV PORTAL DISCOVERY - TYLERHOST PATTERN')
print('='*60)

jurisdictions_found = []

# Common city/county name patterns to try
jurisdictions_to_try = [
    # Texas
    'austin', 'dallas', 'houston', 'sanantonio', 'fortworth', 'elpaso', 'arlington',
    'plano', 'laredo', 'lubbock', 'irving', 'garland', 'amarillo', 'grandprairie',
    'mckinney', 'frisco', 'brownsville', 'pasadena', 'mesquite', 'killeen',
    'mcallen', 'waco', 'carrollton', 'denton', 'midland', 'richardson',
    'lewisville', 'tyler', 'pearland', 'collegestation', 'beaumont', 'roundrock',
    'abilene', 'sugarland', 'odessa', 'corpuschristi', 'princeton', 'rosenberg',
    # Florida
    'miami', 'orlando', 'tampa', 'jacksonville', 'stpetersburg', 'hialeah',
    'tallahassee', 'fortlauderdale', 'capecoral', 'pembrokepines',
    'hollywood', 'miramar', 'gainesville', 'coralsprings', 'clearwater', 'brandon',
    'palmcoast', 'lakeland', 'pompanobeach', 'westpalmbeach', 'davie', 'boca',
    'sunrise', 'deltona', 'largo', 'deerfield', 'melbourne', 'boyntonbeach',
    'fortmyers', 'doral', 'newsmyrnabeach', 'ormondbeach', 'stlucie', 'stluciecounty',
    # California
    'losangeles', 'sandiego', 'sanjose', 'sanfrancisco', 'fresno', 'sacramento',
    'longbeach', 'oakland', 'bakersfield', 'anaheim', 'santaana', 'riverside',
    'stockton', 'irvine', 'chulavista', 'fremont', 'sanbernadino', 'modesto',
    'fontana', 'morenovalley', 'glendale', 'huntingtonbeach', 'santaclarita',
    'oceanside', 'ontario', 'santarosa', 'corona', 'lancaster',
    'palmdale', 'salinas', 'pomona', 'hayward', 'escondido', 'sunnyvale', 'torrance',
    'pasadena', 'orange', 'fullerton', 'roseville', 'visalia', 'concord',
    'santaclara', 'victorville', 'vallejo', 'berkeley',
    'downey', 'inglewood', 'carson', 'yuba', 'yubacounty', 'riversidecounty',
    # Georgia
    'atlanta', 'augusta', 'columbus', 'macon', 'savannah', 'athens',
    'roswell', 'albany', 'alpharetta', 'marietta', 'valdosta',
    'smyrna', 'dunwoody', 'brookhaven', 'newnan', 'dalton',
    'gainesville', 'lagrange', 'barrowcounty', 'barrow', 'gwinnett', 'cobb',
    'dekalb', 'fulton', 'cherokee', 'forsyth', 'henry', 'paulding',
    # North Carolina
    'charlotte', 'raleigh', 'greensboro', 'durham', 'winstonsalem', 'fayetteville',
    'cary', 'wilmington', 'highpoint', 'concord', 'greenville', 'asheville',
    'gastonia', 'chapel', 'huntersville', 'apex', 'burlington',
    'kannapolis', 'mooresville', 'wilson', 'hickory', 'sanford',
    'wake', 'wakecounty', 'mecklenburg', 'guilford', 'forsythcounty', 'union',
    # Others
    'albuquerque', 'boulder', 'columbia', 'hartford', 'elmhurst', 'worthington',
    'pickens', 'pickenscounty', 'cityofalbuquerque', 'cityofcarson',
]

# URL patterns to try
url_patterns = [
    'https://{j}-energov.tylerhost.net',
    'https://{j}-energovweb.tylerhost.net',
    'https://{j}-energovpub.tylerhost.net',
    'https://{j}energov.tylerhost.net',
    'https://{j}energovweb.tylerhost.net',
    'https://{j}energovpub.tylerhost.net',
]

# State suffixes to append
state_suffixes = ['', 'tx', 'fl', 'ca', 'ga', 'nc', 'nm', 'co', 'mo', 'ct', 'il', 'oh', 'sc']

def check_url(url):
    try:
        resp = requests.get(url, timeout=5, allow_redirects=True, verify=False)
        if resp.status_code == 200 and len(resp.text) > 1000:
            # Check if it's actually an EnerGov portal
            text_lower = resp.text.lower()
            if 'energov' in text_lower or 'tyler' in text_lower or 'selfservice' in resp.url.lower():
                return url
    except:
        pass
    return None

# Build all URLs to check
all_urls = set()
for j in jurisdictions_to_try:
    for pattern in url_patterns:
        for suffix in state_suffixes:
            jname = j + suffix
            url = pattern.format(j=jname)
            all_urls.add(url)

print(f'Checking {len(all_urls)} potential URLs...')

# Check URLs in parallel
found_urls = []
checked = 0
with ThreadPoolExecutor(max_workers=20) as executor:
    futures = {executor.submit(check_url, url): url for url in all_urls}
    for future in futures:
        result = future.result()
        if result:
            found_urls.append(result)
            print(f'  [FOUND] {result}')
        checked += 1
        if checked % 200 == 0:
            print(f'  Checked {checked}/{len(all_urls)}...')

print(f'\nFound {len(found_urls)} EnerGov portals via tylerhost pattern')

# Also check self-hosted patterns
print('\nChecking known self-hosted portals...')
self_hosted_urls = [
    'https://energov.cityofmesquite.com',
    'https://energovweb.capecoral.gov',
    'https://cdservices.cityftmyers.com',
    'https://energovweb.pickenscountysc.us',
    'https://bouldercolorado.gov/services/energov',
    'https://rivcoplus.org',
]

for url in self_hosted_urls:
    result = check_url(url)
    if result and result not in found_urls:
        found_urls.append(result)
        print(f'  [FOUND] {result}')

# Dedupe and parse
unique_portals = []
seen_urls = set()
for url in sorted(set(found_urls)):
    if url in seen_urls:
        continue
    seen_urls.add(url)

    # Extract jurisdiction name from URL
    match = re.search(r'https://([a-z\-]+?)(?:-energov|energov|\.tylerhost)', url, re.I)
    if match:
        jname = match.group(1).replace('-', ' ').title()
    else:
        jname = url.split('//')[1].split('.')[0].replace('-', ' ').title()

    unique_portals.append({
        'name': jname,
        'url': url,
        'status': 'active'
    })

print(f'\nTotal unique EnerGov portals: {len(unique_portals)}')

# Save results
result = {
    'platform': 'EnerGov/Tyler',
    'discovery_date': datetime.now().isoformat(),
    'total_portals': len(unique_portals),
    'portals': unique_portals
}

with open(f'{OUTPUT_DIR}/energov_tylerhost_discovery.json', 'w') as f:
    json.dump(result, f, indent=2)

print(f'Saved to: {OUTPUT_DIR}/energov_tylerhost_discovery.json')

# Print by state
print('\nBy inferred location:')
for p in unique_portals:
    print(f'  - {p["name"]}: {p["url"]}')
