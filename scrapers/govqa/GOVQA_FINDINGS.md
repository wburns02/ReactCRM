# GovQA Platform Research Findings

## Executive Summary

**Conclusion:** GovQA platforms **require authentication** for meaningful data access. Unlike MGO Connect which has public REST APIs, GovQA is a protected system designed for requesters to track their own FOIA/public records requests.

### Key Findings

| Aspect | Finding |
|--------|---------|
| **Technology** | Legacy ASP.NET WebForms with Telerik/DevExpress controls |
| **Public API** | None available - all data requires authentication |
| **ID Enumeration** | Blocked - all direct request access redirects to error/login |
| **Archive Access** | Pages exist but data loads via authenticated WebMethods |
| **GovQA-Py Library** | Works for authenticated user's own requests |

---

## Research Details

### 1. Platform Architecture

**Technology Stack:**
- ASP.NET WebForms (not modern SPA)
- Telerik/DevExpress UI controls
- jQuery for AJAX
- Session-based auth with URL-embedded session IDs
- Pattern: `https://{tenant}.govqa.us/WEBAPP/_rs/(S({sessionId}))/{page}.aspx`

**Portal Structure:**
```
supporthome.aspx           # Home page (public)
Login.aspx                 # Login (public)
CustomerDetails.aspx       # Account creation (public)
FindAnswers.aspx           # Knowledge Base search (public)
OpenRecordsSummary.aspx    # Archive calendar (public shell, data requires auth)
RequestArchiveDetails.aspx # Individual archived requests (requires auth)
RequestOpen.aspx           # View request by rid (requires auth)
RequestEdit.aspx           # Edit request by rid (requires auth)
CustomerIssues.aspx        # User's request list (requires auth)
```

### 2. GovQA-Py Library Analysis

**Package:** `pip install govqa` (v1.0.1, DataMade)

**Working Methods:**
```python
from govqa import GovQA

client = GovQA(domain="https://chicagoil.govqa.us")

# Account creation form (works, requires CAPTCHA)
form = client.new_account_form()
form.schema  # JSON Schema of required fields
form.captcha # BytesIO of CAPTCHA image/audio

# Login (works)
client.login(username, password)

# List user's requests (requires auth)
requests = client.list_requests()  # [{id, reference_number, status}]

# Get request details (requires auth)
details = client.get_request(request_id)  # Full details + messages + attachments
```

**Limitations:**
- `request_form()` method has a bug (regex error when called without auth)
- Only retrieves authenticated user's OWN requests
- Cannot enumerate or access other users' public records

### 3. Security Findings

**From security disclosure (qwell, Sept 2024):**
- Vulnerabilities were disclosed for unauthorized access to requests
- Endpoints: `RequestOpen.aspx`, `RequestOpenCI.aspx`, `RequestEdit.aspx/DownloadAll`
- **Finding:** These vulnerabilities appear to have been PATCHED
- All direct request access now requires authentication

**Current Security Status:**
- ID enumeration blocked (all IDs return error page)
- WebMethods return 401 Unauthorized without session
- Sessions are URL-embedded and server-validated

### 4. Tested Jurisdictions

| Jurisdiction | Tenant | Status |
|--------------|--------|--------|
| Chicago, IL | chicagoil | Library works, auth required |
| Pierce County, WA | piercecountywa | Library works, auth required |
| California CDCR | californiacdcr | Library works, auth required |
| City of Phoenix, AZ | cityofphoenixaz | Library works, auth required |
| Texas Workforce Commission | twc | Library works, auth required |

All 5 jurisdictions:
- Successfully initialized GovQA client
- Retrieved account creation form
- Detected CAPTCHA requirements
- Blocked unauthenticated request access

---

## Extraction Strategy Options

### Option A: Authenticated User Approach (Recommended)

1. **Create accounts** on target jurisdictions
   - Use catch-all email domain for multiple accounts
   - Handle CAPTCHA (2Captcha service or manual)
   - Store credentials securely

2. **Submit requests** to build record history
   - Use `client.request_form()` (after fixing the bug)
   - Submit broad requests that agencies must respond to
   - Wait for responses

3. **Extract responses**
   - Use `client.list_requests()` to get request IDs
   - Use `client.get_request()` for details + attachments
   - Download and normalize data

**Pros:** Works within platform design, legal, reliable
**Cons:** Slow (depends on agency response times), limited to own requests

### Option B: Playwright Browser Automation

1. **Login via browser**
   - Use GovQA-Py or Playwright for authentication
   - Capture session cookies

2. **Navigate Archive pages**
   - Some jurisdictions may have public archive browsing
   - Extract data from HTML tables
   - Handle JavaScript-loaded content

3. **Search functionality**
   - Use date-range filtering
   - Extract results from search pages

**Pros:** Can access public archives if available
**Cons:** Slow, fragile, depends on UI structure

### Option C: Direct Data Request (Alternative)

Many agencies publish FOIA logs separately:
- Chicago publishes FOIA logs at data.cityofchicago.org
- Look for open data portals with FOIA/public records datasets
- May be easier than scraping GovQA directly

---

## Files Created

```
scrapers/govqa/
├── test_govqa_library.py    # Library validation script
├── govqa_config.py          # Jurisdiction configurations
├── govqa_client.py          # Extended client with ID scanning
├── GOVQA_FINDINGS.md        # This document
├── credentials/             # Credential storage (gitignored)
└── (output files in scrapers/output/govqa/)
```

---

## Comparison: GovQA vs Other Platforms

| Platform | Public API | Auth Required | Bulk Access |
|----------|------------|---------------|-------------|
| **MGO Connect** | Yes (REST) | Optional | Easy - API search |
| **OpenGov** | Yes (GraphQL) | Yes (Auth0) | Medium - paginated API |
| **GovQA** | No | Yes | Hard - user's own only |
| **EnerGov** | Partial | Varies | Medium - varies by city |

---

## SUCCESSFUL EXTRACTION: Open Data Portals

### Major Discovery: Chicago Publishes FOIA Logs Publicly

Instead of scraping GovQA, we discovered that **Chicago publishes FOIA logs on their open data portal** with:
- No authentication required
- Direct JSON/CSV download via Socrata API
- 135,534+ total FOIA records available

### Extracted Data (January 2026)

| Dataset | Records | File |
|---------|---------|------|
| Police FOIA | 76,427 | foia_police_20260121.json |
| Planning FOIA | 48,763 | foia_planning_20260121.json |
| City Clerk FOIA | 4,878 | foia_city_clerk_20260121.json |
| Law FOIA | 3,370 | foia_law_20260121.json |
| 311 FOIA | 1,680 | foia_311_20260121.json |
| Library FOIA | 416 | foia_library_20260121.json |
| **TOTAL** | **135,534** | ~45MB |

### Open Data Scraper Created

**File:** `scrapers/govqa/open_data_foia_scraper.py`

```python
from open_data_foia_scraper import SocrataFOIAScraper

# Fetch all Chicago FOIA data
scraper = SocrataFOIAScraper("chicago")
results = scraper.scrape_all_datasets()
```

**Key Benefits over GovQA scraping:**
- No authentication required
- No CAPTCHAs
- Bulk download support (50,000 records per request)
- Well-documented Socrata API
- Direct JSON/CSV access

### Other Cities with Open Data

Many cities publish FOIA logs on Socrata-powered portals:
- **Washington, D.C.**: opendata.dc.gov (FOIA Requests dataset)
- **New York City**: data.cityofnewyork.us (FOIL request tracking)
- **Los Angeles**: data.lacity.org
- **Seattle**: data.seattle.gov
- **Austin**: data.austintexas.gov

**Federal Resource:** FOIA.gov provides annual FOIA reports from all federal agencies.

---

## Recommendation: Use Open Data First

Before attempting GovQA scraping:

1. **Check if the city has an open data portal** (data.{city}.gov or similar)
2. **Search for "FOIA" or "public records" datasets**
3. **Use the Socrata API** for bulk extraction

This approach is:
- Faster (direct API access)
- Legal (published for public use)
- Reliable (official data source)
- Scalable (batch downloads)

---

## Files Created

```
scrapers/govqa/
├── test_govqa_library.py         # GovQA-Py library tests
├── govqa_config.py               # Jurisdiction configs
├── govqa_client.py               # Extended GovQA client
├── account_creator.py            # Account creation helper
├── open_data_foia_scraper.py     # Socrata API scraper ← NEW
├── GOVQA_FINDINGS.md             # This document
└── credentials/                  # Credential storage

scrapers/output/govqa/
├── open_data_chicago/            # Extracted Chicago FOIA data
│   ├── foia_police_20260121.json
│   ├── foia_planning_20260121.json
│   ├── foia_city_clerk_20260121.json
│   ├── foia_law_20260121.json
│   ├── foia_311_20260121.json
│   └── foia_library_20260121.json
└── govqa_library_test_*.json     # Test results
```

---

## References

- [GovQA-Py Documentation](https://govqa-py.readthedocs.io/en/latest/)
- [GovQA-Py PyPI](https://pypi.org/project/govqa/)
- [DataMade (Library Authors)](https://datamade.us)
- [Security Disclosure](https://github.com/qwell/disclosure-granicus-govqa)
- [Granicus Support](https://support.granicus.com)
- [Chicago Open Data Portal](https://data.cityofchicago.org)
- [Socrata API Documentation](https://dev.socrata.com/)
- [Data.gov FOIA Datasets](https://catalog.data.gov/dataset/?tags=foia)
