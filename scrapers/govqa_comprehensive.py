#!/usr/bin/env python3
"""
Comprehensive GovQA Portal Discovery
Discovers all GovQA portals by checking subdomain patterns
"""
import requests
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

OUTPUT_DIR = '/root/scrapers/output/platform_discovery'

print('='*60)
print('COMPREHENSIVE GOVQA PORTAL DISCOVERY')
print('='*60)

# All 50 US states
states = ['al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga',
          'hi', 'id', 'il', 'in', 'ia', 'ks', 'ky', 'la', 'me', 'md',
          'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj',
          'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc',
          'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy', 'dc']

# Major cities
cities = [
    'newyork', 'losangeles', 'chicago', 'houston', 'phoenix', 'philadelphia',
    'sanantonio', 'sandiego', 'dallas', 'sanjose', 'austin', 'jacksonville',
    'fortworth', 'columbus', 'indianapolis', 'charlotte', 'sanfrancisco',
    'seattle', 'denver', 'washington', 'boston', 'elpaso', 'nashville',
    'detroit', 'portland', 'memphis', 'oklahomacity', 'lasvegas', 'louisville',
    'baltimore', 'milwaukee', 'albuquerque', 'tucson', 'fresno', 'sacramento',
    'kansascity', 'mesa', 'atlanta', 'omaha', 'coloradosprings', 'raleigh',
    'longbeach', 'virginiabeach', 'miami', 'oakland', 'minneapolis', 'tulsa',
    'bakersfield', 'wichita', 'arlington', 'aurora', 'tampa', 'neworleans',
    'cleveland', 'anaheim', 'honolulu', 'henderson', 'stockton', 'lexington',
    'riverside', 'santaana', 'irvine', 'orlando', 'newark', 'cincinnati',
    'stpaul', 'pittsburgh', 'greensboro', 'stlouis', 'lincoln', 'plano', 'anchorage',
    'durham', 'jerseycity', 'chandler', 'buffalo', 'gilbert', 'madison', 'reno',
    'toledo', 'fortwayne', 'lubbock', 'stpetersburg', 'laredo', 'irving',
    'chesapeake', 'glendale', 'winston', 'scottsdale', 'garland', 'boise',
    'norfolk', 'spokane', 'fremont', 'richmond', 'santaclarita', 'hialeah',
    'tacoma', 'modesto', 'huntington', 'desmoines', 'fontana', 'fayetteville',
    'birmingham', 'rochester', 'grandrapids', 'saltlakecity', 'syracuse',
    'worcester', 'amarillo', 'oxnard', 'knoxville', 'huntsville', 'grandprairie',
    'montgomery', 'littlerock', 'akron', 'augusta', 'shreveport', 'mobile',
    'tallahassee', 'capecoral', 'springfield', 'fortlauderdale', 'tempe',
    'ontario', 'pembrokepines', 'vancouver', 'peoria', 'providence',
    'chattanooga', 'oceanside', 'fortcollins', 'santarosa', 'eugene', 'cary',
    'corona', 'lakewood', 'hayward', 'alexandria', 'hollywood', 'clarksville',
    'lancaster', 'salinas', 'palmdale', 'macon', 'joliet', 'naperville',
    'pasadena', 'rockford', 'paterson', 'bridgeport', 'savannah', 'escondido',
    'mesquite', 'fullerton', 'killeen', 'olathe', 'dayton', 'mcallen', 'thornton',
    'waco', 'carrollton', 'denton', 'midland', 'richardson', 'lewisville',
    'murfreesboro', 'surprise'
]

# County names
county_names = ['harris', 'maricopa', 'sandiego', 'orange', 'miami', 'dallas', 'kings',
                'riverside', 'clark', 'tarrant', 'bexar', 'broward', 'wayne', 'santa',
                'alameda', 'queens', 'sacramento', 'cuyahoga', 'allegheny', 'franklin',
                'milwaukee', 'hillsborough', 'suffolk', 'palm', 'hennepin', 'travis',
                'wake', 'oakland', 'duval', 'fairfax', 'saltlake', 'shelby', 'erie',
                'pinellas', 'hamilton', 'marion', 'montgomery', 'bernalillo', 'fulton',
                'kern', 'fresno', 'pima', 'dekalb', 'essex', 'pierce', 'ventura',
                'gwinnett', 'multnomah', 'snohomish', 'dupage', 'hidalgo', 'denton',
                'collin', 'nueces', 'volusia', 'jefferson', 'washtenaw', 'genesee',
                'leon', 'lake', 'cook', 'dane', 'ramsey', 'douglas', 'manatee',
                'brevard', 'alachua', 'boulder', 'lubbock', 'charleston', 'mecklenburg',
                'guilford', 'forsyth', 'hays', 'williamson', 'travis']

# Build all subdomains to check
subdomains = set()

# Add states with variations
for state in states:
    subdomains.add(state)
    subdomains.add(f'county{state}')
    subdomains.add(f'{state}county')
    subdomains.add(f'state{state}')
    subdomains.add(f'{state}state')

# Add cities with variations
for city in cities:
    subdomains.add(city)
    subdomains.add(f'{city}city')
    subdomains.add(f'cityof{city}')
    subdomains.add(f'{city}-city')

# Add counties with state suffixes
for county in county_names:
    for state in states:
        subdomains.add(f'{county}county{state}')
        subdomains.add(f'{county}{state}')
        subdomains.add(f'county-{county}{state}')

print(f'Checking {len(subdomains)} potential subdomains...')

def check_subdomain(subdomain):
    url = f'https://{subdomain}.govqa.us'
    try:
        resp = requests.get(url, timeout=3, allow_redirects=True)
        if resp.status_code == 200 and len(resp.text) > 500:
            return {'domain': subdomain, 'url': url, 'status': 'active'}
    except:
        pass
    return None

# Check in parallel
active_portals = []
checked = 0

with ThreadPoolExecutor(max_workers=50) as executor:
    futures = {executor.submit(check_subdomain, sd): sd for sd in subdomains}
    for future in futures:
        result = future.result()
        if result:
            active_portals.append(result)
            print(f'  [FOUND] {result["url"]}')
        checked += 1
        if checked % 500 == 0:
            print(f'  Checked {checked}/{len(subdomains)}... Found {len(active_portals)} so far')

print(f'\nTotal GovQA portals found: {len(active_portals)}')

# Dedupe by domain
unique = {}
for p in active_portals:
    unique[p['domain']] = p

active_portals = list(unique.values())
print(f'Unique portals: {len(active_portals)}')

# Save
result = {
    'platform': 'GovQA',
    'discovery_date': datetime.now().isoformat(),
    'total_portals': len(active_portals),
    'checked_subdomains': len(subdomains),
    'portals': sorted(active_portals, key=lambda x: x['domain'])
}

with open(f'{OUTPUT_DIR}/govqa_comprehensive.json', 'w') as f:
    json.dump(result, f, indent=2)

print(f'Saved to: {OUTPUT_DIR}/govqa_comprehensive.json')

# Summary by state
print('\nPortals by state pattern:')
state_counts = {}
for p in active_portals:
    domain = p['domain']
    for state in states:
        if state in domain:
            state_counts[state.upper()] = state_counts.get(state.upper(), 0) + 1
            break

for state, count in sorted(state_counts.items(), key=lambda x: -x[1])[:20]:
    print(f'  {state}: {count}')
