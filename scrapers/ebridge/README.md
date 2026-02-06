# eBridge Septic Permit Scraper

Extracts septic permit data from the eBridge document management system using direct HTTP requests.

## Scrapers Available

| Scraper | Method | Speed | Use Case |
|---------|--------|-------|----------|
| `ebridge-http-scraper.py` | HTTP requests | ~5 sec/4 counties | **Recommended** - Fast, reliable |
| `ebridge-playwright-scraper.py` | Browser automation | ~30 sec/county | Fallback for complex cases |

## Verified Working Counties (Jan 2026)

| County | Cabinet | Username | Password | Records |
|--------|---------|----------|----------|---------|
| Hillsborough | HCHD | public | publicuser | 1000+ |
| Osceola | OSCEOLACHD | public | oscguest | 1000+ |
| Okeechobee | okeechobeechd | public | password | 8 |
| Martin | Martin County | Public | public | 0 (no OSTDS data) |

**Total available**: ~2000+ records from 4 counties

### Counties NOT Working

Most Florida counties with `public/public` credentials fail authentication. These credentials may be:
- Outdated
- Disabled for public access
- Using different cabinet names

Failed counties: Orange, Brevard, Seminole, Polk, Pasco, Pinellas, Volusia, Lee, Collier, Sarasota, Manatee, Charlotte, Palm Beach, Broward, Miami-Dade, Hernando, etc.

## Quick Start

```bash
# Extract from all verified counties
python scrapers/ebridge/ebridge-http-scraper.py

# Single county
python scrapers/ebridge/ebridge-http-scraper.py --county hillsborough

# List available counties
python scrapers/ebridge/ebridge-http-scraper.py --list
```

## Data Extracted

| Field | Description |
|-------|-------------|
| permit_number | Permit ID (e.g., "4064415") |
| address | Property address |
| county | County name |
| state | FL |
| owner_name | Property owner / facility name |
| zipcode | ZIP code |
| doc_date | Document date (YYYYMMDD) |
| doc_type | Document type (Permit, Inspection, File, etc.) |

## Output Format

NDJSON files in `scrapers/output/ebridge/`:

```
fl_hillsborough_permits_20260120.ndjson
fl_osceola_permits_20260120.ndjson
fl_okeechobee_permits_20260120.ndjson
```

Example record:
```json
{"permit_number":"4064415","address":"9709 Riverview Dr","county":"Hillsborough","state":"FL","owner_name":"Forbes","zipcode":"33579","doc_date":"20260116","doc_type":"Inspection","source":"eBridge","scraped_at":"2026-01-20T11:28:53Z"}
```

## Technical Notes

### HTTP Scraper Approach

The HTTP scraper works by:
1. Generating a session GUID (timestamp + random number) - mimics JavaScript `GetGUID()`
2. POSTing login credentials with ASP.NET ViewState tokens
3. Following redirects to get the actual base URL (s1.ebridge.com)
4. POSTing search form with `index1=OSTDS` parameter
5. Parsing HTML table results

This approach is **much faster** than browser automation because it skips:
- Browser startup/shutdown
- JavaScript execution
- Iframe navigation
- Visual rendering

### Why Playwright Alternative Exists

Some edge cases may require browser automation:
- Counties with complex JavaScript validation
- CAPTCHA challenges (not currently seen)
- Dynamic form field requirements

## Requirements

```bash
pip install requests beautifulsoup4

# For Playwright scraper (optional)
pip install playwright
playwright install chromium
```

## Server Deployment

```bash
scp scrapers/ebridge/ebridge-http-scraper.py will@100.85.99.69:~/ebridge_extraction/

ssh will@100.85.99.69
cd ~/ebridge_extraction
nohup python ebridge-http-scraper.py > scraper.log 2>&1 &
```

## Finding More County Credentials

To find credentials for additional counties:
1. Visit the county health department website (e.g., `hillsborough.floridahealth.gov`)
2. Look for "eBridge" or "Public Records" links
3. Check for posted instructions with login credentials

Example search: `site:floridahealth.gov eBridge public password`
