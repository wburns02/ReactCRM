# OpenGov Permit Portal Scraper - Opus CLI Prompt

Copy and paste this into a new Opus CLI session to build an OpenGov scraper.

---

## PROMPT START

I need to build a comprehensive web scraper for OpenGov permit portals. OpenGov is a government software platform used by hundreds of cities and counties to manage permits, licenses, and records. The goal is to extract ALL permit records from OpenGov-powered jurisdictions.

### Background Context

We successfully built a scraper for MGO Connect that extracted 392,000+ records from 432 jurisdictions across 30 states. The key to success was:
1. Network interception to discover API endpoints
2. Direct API calls instead of UI automation
3. Proxy rotation for rate limit avoidance
4. NDJSON output format for streaming records

### OpenGov Overview

**OpenGov Products:**
- **OpenGov Permitting & Licensing** - Building permits, contractor licenses
- **OpenGov Records Management** - Public records requests
- **OpenGov Reporting** - Financial/budget reports
- **OpenGov Citizen Services** - Various civic portals

**Common OpenGov URLs:**
- `https://opengov.com/`
- `https://{jurisdiction}.opengov.com/`
- `https://opengov.{jurisdiction}.gov/`
- `https://permits.{jurisdiction}.gov/` (often OpenGov-powered)

### Technical Requirements

**Output Format:** NDJSON (one JSON record per line)
```json
{"permit_number":"BP-2024-12345","address":"123 Main St","city":"Austin","state":"TX","county":"Travis","permit_type":"Building","status":"Issued","issue_date":"2024-03-15","applicant":"John Doe","source":"OpenGov","jurisdiction":"Austin, TX","scraped_at":"2026-01-20T12:00:00Z"}
```

**Required Fields:**
- permit_number (unique ID)
- address (property address)
- city
- state (2-letter code)
- county
- permit_type (Building, Electrical, Plumbing, HVAC, etc.)
- status
- issue_date
- applicant/owner name (if available)
- source = "OpenGov"
- jurisdiction (city/county name)
- scraped_at (ISO timestamp)

**Optional Fields:**
- lat/lng coordinates
- parcel_number
- contractor_name
- contractor_license
- valuation
- description
- expiration_date

### Proxy Configuration (Decodo)

Use the Decodo proxy service to avoid rate limiting:

```
Host: dc.decodo.com
Username: OpusCLI
Password: h+Mpb3hlLt1c5B1mpL
Ports: 10001-10010 (10 datacenter IPs for rotation)
```

**Proxy URL format:**
```
http://OpusCLI:h+Mpb3hlLt1c5B1mpL@dc.decodo.com:10001
```

### Implementation Approach

**Phase 1: Discovery**
1. Search for known OpenGov jurisdictions
2. Visit several OpenGov portals and capture network traffic
3. Document the API endpoint patterns
4. Identify authentication requirements

**Phase 2: API Client**
1. Build a TypeScript/Playwright scraper
2. Implement network interception to capture API responses
3. Paginate through results
4. Handle rate limits with proxy rotation

**Phase 3: Extraction**
1. Run against all discovered jurisdictions
2. Save to NDJSON files per jurisdiction
3. Implement checkpointing for resume capability

### Server Execution

Run the scraper on our Linux server:
- Host: 100.85.99.69 (Tailscale IP)
- User: will
- Node.js available via nvm
- Working directory: ~/mgo_extraction/ (or create ~/opengov_extraction/)

**Execution pattern:**
```bash
nohup npx ts-node opengov-scraper.ts > opengov_extraction.log 2>&1 &
```

### Discovery Resources

**Finding OpenGov Jurisdictions:**
1. Search: `site:opengov.com permits`
2. Search: `"powered by opengov" permits`
3. Check state/county government websites for permit portals
4. OpenGov has a customer directory

**Target States (prioritize these):**
- Texas (septic permits are primary goal)
- Florida
- California
- North Carolina
- Georgia
- Ohio
- Pennsylvania

### File Structure

Create these files:
```
scrapers/opengov/
├── opengov-scraper.ts       # Main scraper
├── opengov-config.ts        # Jurisdiction configs
├── opengov-api-client.ts    # API wrapper
├── opengov-types.ts         # TypeScript interfaces
└── output/                  # NDJSON output files
```

### First Steps

1. **Research Phase:**
   - Find 5-10 example OpenGov permit portals
   - Open each in browser with DevTools Network tab
   - Document all API calls made when searching/loading permits
   - Note authentication patterns

2. **API Documentation:**
   - Create a document listing discovered endpoints
   - Include request/response examples
   - Note pagination parameters

3. **Build Scraper:**
   - Start with a single jurisdiction as proof of concept
   - Verify data extraction works
   - Then expand to all jurisdictions

### Existing Infrastructure

I have existing scraper infrastructure you can reference:
- `scrapers/base_scraper.py` - Python base class with common patterns
- `scrapers/mgo/mgo-full-scraper.ts` - MGO Connect scraper (working example)
- `scrapers/utils/browser.py` - Browser management utilities

### Output Directory

Save output to:
```
scrapers/output/opengov/{jurisdiction_slug}_permits_YYYYMMDD.ndjson
```

Example: `scrapers/output/opengov/austin_tx_permits_20260120.ndjson`

### Success Criteria

1. Discover API endpoints for OpenGov permits
2. Successfully extract records from at least one jurisdiction
3. Build a scraper that can run autonomously
4. Extract 50,000+ records as initial goal

### Questions to Answer During Research

1. Does OpenGov use a standard API across all jurisdictions?
2. Is authentication required? If so, what type?
3. Are there rate limits? What are they?
4. How is pagination handled?
5. What's the maximum date range for queries?

---

## END PROMPT

Begin by researching OpenGov portals and documenting their API patterns. Create a discovery script first, then build the full scraper based on findings.
