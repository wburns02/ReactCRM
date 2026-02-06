# OpenGov Permitting & Licensing - Deep Analysis

## Executive Summary

**Platform Overview:**
- OpenGov serves 2,000+ government jurisdictions
- Permitting & Licensing is one module of their larger "Public Service Platform"
- Portals use JavaScript SPAs (Ember.js framework)
- **Backend: ViewpointCloud** - API infrastructure fully discovered

**MAJOR DISCOVERY: ViewpointCloud API Infrastructure**

We have reverse-engineered the complete API architecture:

| Component | URL | Auth Required |
|-----------|-----|---------------|
| REST API Base | `https://api-east.viewpointcloud.com/v2/{tenant}` | Varies |
| GraphQL Search | `https://search.viewpointcloud.com/graphql` | YES |
| GraphQL Records | `https://records.viewpointcloud.com/graphql` | YES |
| GraphQL Inspections | `https://inspections.viewpointcloud.com/graphql` | YES |
| Auth Provider | Auth0 at `accounts.viewpointcloud.com` | N/A |

**Data Extracted So Far:**
- **215 jurisdictions** with metadata
- **7.7MB of category/record type data**
- Record types include: Building Permits, Planning Applications, Solar Permits, etc.

**Current Limitation:** Actual permit records require Auth0 authentication. Public endpoints only provide metadata (categories, record types).

---

## 1. Portal URL Patterns Discovered

### Primary Pattern
```
https://[jurisdiction].portal.opengov.com/
```

### URL Structure
| Pattern | Purpose | Example |
|---------|---------|---------|
| `/` | Home/landing page | `cambridgema.portal.opengov.com/` |
| `/search` | Permit search | `apopkafl.portal.opengov.com/search` |
| `/records/{id}` | Individual record | `eastgreenwichri.portal.opengov.com/records/21916` |
| `/categories/{id}` | Category listing | `glynncountyga.portal.opengov.com/categories/1082` |
| `/categories/{id}/record-types/{id}` | Record types | `mountvernonny.portal.opengov.com/categories/1079/record-types/6823` |
| `/login` | Authentication | `gardnerma.portal.opengov.com/login` |

### Backend/Staff Pattern
```
https://[jurisdiction].workflow.opengov.com/
```
(Requires staff authentication)

### Shared Services
```
https://accounts.portal.opengov.com/ - Central account management
https://help.portal.opengov.com/ - Help documentation
```

---

## 2. Discovered OpenGov Portals (Sample)

### Texas
- Galveston County TX: `galvestoncountytx.portal.opengov.com`

### Massachusetts
- Cambridge: `cambridgema.portal.opengov.com`
- Worcester: `worcesterma.portal.opengov.com`
- Haverhill: `haverhillma.portal.opengov.com`
- Newton: `newtonma.portal.opengov.com`
- Gardner: `gardnerma.portal.opengov.com`
- North Andover: `northandoverma.portal.opengov.com`

### Rhode Island
- Providence: `providenceri.portal.opengov.com`
- East Greenwich: `eastgreenwichri.portal.opengov.com`
- Glocester: `glocesterri.portal.opengov.com`

### Florida
- Apopka: `apopkafl.portal.opengov.com`

### Pennsylvania
- Cheltenham Township: `cheltenhamtownship.portal.opengov.com`
- Cranberry Township: `cranberrytownshippa.portal.opengov.com`

### Maryland
- Baltimore DHCD: `baltimoremddhcd.portal.opengov.com`
- Frederick: `frederickmd.portal.opengov.com`

### Georgia
- Glynn County: `glynncountyga.portal.opengov.com`

### South Carolina
- Anderson County: `countyofandersonsc.portal.opengov.com`
- North Myrtle Beach: `northmyrtlebeachsc.portal.opengov.com`

### New York
- Mount Vernon: `mountvernonny.portal.opengov.com`
- Hempstead: `hempsteadny.portal.opengov.com`

### Other States
- Gary, IN: `garyin.portal.opengov.com`
- Jackson, TN: `jacksontn.portal.opengov.com`
- Franklin County, NC: `franklincountync.portal.opengov.com`
- North St. Paul, MN: `northstpaulmn.portal.opengov.com`
- Watertown, SD: `watertownsd.portal.opengov.com`
- Goddard, KS: `goddardks.portal.opengov.com`
- Tallmadge, OH: `tallmadgeoh.portal.opengov.com`
- Industry, CA: `industryca.portal.opengov.com`

---

## 3. Technology Stack & API Architecture

### Frontend
- **Framework:** Ember.js (JavaScript SPA)
- **Loading:** Client-side rendering with initial loading spinner
- **State Management:** Ember Data
- **Error Handling:** Custom fallback for app initialization failures

### Backend: ViewpointCloud API (FULLY DISCOVERED)

**REST API Endpoints (Public - No Auth):**
```bash
# List categories for a jurisdiction
GET https://api-east.viewpointcloud.com/v2/{tenant}/categories

# List record types for a jurisdiction
GET https://api-east.viewpointcloud.com/v2/{tenant}/record_types

# General settings
GET https://api-east.viewpointcloud.com/v2/{tenant}/general_settings/1

# Project templates
GET https://api-east.viewpointcloud.com/v2/{tenant}/project_templates
```

**REST API Endpoints (Auth Required):**
```bash
# List actual permit records (returns empty without auth)
GET https://api-east.viewpointcloud.com/v2/{tenant}/records

# Requires Bearer token from Auth0
Authorization: Bearer <token>
```

**GraphQL Endpoints (All Require Auth):**
```graphql
# Search endpoint
POST https://search.viewpointcloud.com/graphql

query SearchRecords($tenant: String!, $query: String, $limit: Int, $offset: Int) {
  searchRecords(tenant: $tenant, query: $query, limit: $limit, offset: $offset) {
    records {
      id
      recordNumber
      recordType
      status
      address
      city
      state
      zipCode
      applicantName
      createdAt
      updatedAt
    }
    total
    hasMore
  }
}
```

**Auth0 Configuration:**
```javascript
{
  domain: 'accounts.viewpointcloud.com',
  clientId: 'Kne3XYPvChciFOG9DvQ01Ukm1wyBTdTQ',
  audience: 'viewpointcloud.com/api/production'
}
```

### Known Limitations for Scraping
- SPAs require JavaScript execution (Playwright/Selenium)
- Simple HTTP requests only return loading/error HTML
- No static HTML to parse without browser automation
- **Actual permit records require Auth0 authentication**

---

## 4. Developer Portal Analysis

### Official Resources
| Resource | URL | Access |
|----------|-----|--------|
| Developer Portal | developer.opengov.com | Requires registration |
| API Catalog | developer.opengov.com/catalog | Requires registration |
| Permitting API Docs | developer.opengov.com/catalog/public-service-platform-permitting-and-licensing | Requires registration |
| API Portal | api.docs.opengov.com | Requires login (Redocly) |
| Quickstart | developer.opengov.com/docs/quickstart | Requires registration |

### Claimed API Features (from marketing)
- OpenAPI/Swagger specs
- GraphQL support
- Webhooks
- OAuth/SSO
- Sandbox environment
- Postman collections

### Reality Check
- All API documentation is behind authentication
- No public API endpoints discovered
- Portal data access requires browser automation

---

## 5. Authentication Analysis

### Public Access
- Portal landing pages accessible without login
- Search pages accessible without login
- Individual records MAY be accessible without login (varies by jurisdiction)

### Authenticated Access
- Account creation appears to be per-portal
- Central account service at `accounts.portal.opengov.com`
- Staff access via `workflow.opengov.com` subdomains

### API Authentication
- Developer portal requires registration
- API likely uses OAuth 2.0 or API keys (unconfirmed)
- Per-tenant API access (each jurisdiction separate)

---

## 6. Data Extraction Strategies

### Strategy A: Playwright Browser Automation (RECOMMENDED)

```typescript
// Pseudocode for OpenGov portal scraper
const browser = await playwright.chromium.launch();
const page = await browser.newPage();

// Navigate to search page
await page.goto('https://[jurisdiction].portal.opengov.com/search');

// Wait for Ember app to load
await page.waitForSelector('[data-permit-search]', { timeout: 30000 });

// Perform search
await page.fill('[name="address"]', '123 Main St');
await page.click('[data-search-button]');

// Wait for results
await page.waitForSelector('[data-search-results]');

// Extract data from DOM
const permits = await page.$$eval('[data-permit-row]', rows =>
  rows.map(row => ({
    permitNumber: row.querySelector('[data-permit-number]')?.textContent,
    address: row.querySelector('[data-address]')?.textContent,
    status: row.querySelector('[data-status]')?.textContent,
    // ... more fields
  }))
);
```

**Pros:**
- Works with JavaScript SPAs
- Can handle dynamic content
- Can intercept network requests

**Cons:**
- Slower than direct API
- Resource intensive
- May trigger anti-bot detection

### Strategy B: Network Interception

```typescript
// Intercept API calls made by Ember app
page.on('response', async response => {
  const url = response.url();
  if (url.includes('/api/') || url.includes('graphql')) {
    const data = await response.json();
    console.log('Intercepted API call:', url, data);
    // Learn endpoint patterns from captured traffic
  }
});
```

### Strategy C: Developer Portal Registration

1. Register for OpenGov Developer account
2. Request API access for research purposes
3. Use official API if granted access
4. Document endpoints and rate limits

---

## 7. Comparison with Other Platforms

| Feature | MGO Connect | GovQA | OpenGov |
|---------|-------------|-------|---------|
| Public API | YES | NO | **PARTIAL** |
| Search without login | YES | NO | NO (metadata only) |
| Bulk data export | YES | NO (FOIA only) | **YES with Auth** |
| Technology | Angular | ASP.NET | Ember.js + ViewpointCloud |
| Jurisdictions | 432 | 8,220+ | **215 discovered** |
| Primary data type | Permits | FOIA requests | Permits |
| API Backend | Custom REST | ASP.NET WebMethods | ViewpointCloud GraphQL |
| Auth System | None | GovQA accounts | Auth0 OAuth |

### Key Differences

**MGO Connect (BEST):**
- Fully public API, no auth needed
- 1M+ permits extracted
- Direct JSON responses

**OpenGov (PARTIAL):**
- Public endpoints for metadata only
- Records require Auth0 token
- 215 jurisdictions configured with scraper
- GraphQL + REST hybrid API

**GovQA (WORST):**
- Not a permit platform (FOIA requests)
- All endpoints require auth
- No bulk data access

---

## 8. Estimated Data Volume

Based on claimed 2,000+ jurisdictions:
- If each has 1,000-50,000 permits: **2-100 million permits**
- Focus on Texas jurisdictions first
- Galveston County TX is confirmed OpenGov client

---

## 9. Challenges & Risks

### Technical Challenges
1. **JavaScript SPA:** Requires browser automation
2. **No Public API:** Must reverse-engineer endpoints
3. **Per-Portal Variation:** Each jurisdiction may have different categories/types
4. **Rate Limiting:** Unknown throttling policies

### Legal/Ethical Considerations
1. Terms of Service may prohibit scraping
2. Government data is generally public record
3. Be respectful with request rates
4. Consider requesting official API access

### Anti-Bot Measures
1. Cloudflare protection possible
2. Session management complexity
3. CAPTCHA challenges possible
4. IP blocking risk

---

## 10. Recommended Next Steps

### Immediate (Phase 1)
1. **Build Playwright scraper** for single portal (Galveston County TX)
2. **Intercept network traffic** to discover actual API endpoints
3. **Document discovered endpoints** with request/response examples

### Short-term (Phase 2)
1. **Register for OpenGov Developer Portal**
2. **Request API documentation**
3. **Test if official API access is feasible**

### Medium-term (Phase 3)
1. **Build multi-portal scraper** if API unavailable
2. **Enumerate all portal subdomains** using DNS/patterns
3. **Extract and store permit data**
4. **Link to CRM properties**

---

## 11. Portal Discovery Strategy

### DNS Enumeration
```bash
# Pattern: [jurisdiction].portal.opengov.com
# Try common city/county names combined with state codes
# Examples: austintx, dallasTX, harriscountytx
```

### Search-Based Discovery
```
site:portal.opengov.com + [state name]
```

### Government Website Scraping
- Check city/county websites for "permits" links
- Many link to OpenGov portals directly

---

## References

- OpenGov Developer Portal: https://developer.opengov.com
- OpenGov API Portal: https://api.docs.opengov.com
- OpenGov Products: https://opengov.com/products/permitting-and-licensing/
- GitHub qwell/disclosures (for methodology): https://github.com/qwell/disclosures

---

## Existing Infrastructure

### Files in scrapers/opengov/
| File | Purpose |
|------|---------|
| `opengov-config.ts` | 215 jurisdictions + ViewpointCloud API config |
| `opengov-scraper.ts` | Playwright-based scraper with Auth0 support |
| `opengov-auth.ts` | Auth0 authentication handling |
| `opengov-types.ts` | TypeScript type definitions |
| `opengov-api-discovery.ts` | API endpoint discovery tool |
| `discovered-endpoints.json` | Documented API endpoints |

### Output Data
- Location: `scrapers/output/opengov/`
- Files: 215 metadata files (7.7MB total)
- Contents: Categories, record types, jurisdiction info

### To Extract Actual Records

1. **Set environment variables:**
   ```bash
   export OPENGOV_EMAIL=your_email
   export OPENGOV_PASSWORD=your_password
   ```

2. **Run scraper:**
   ```bash
   npx tsx scrapers/opengov/opengov-scraper.ts
   ```

3. **Scraper will:**
   - Authenticate via Auth0
   - Capture Bearer token from network traffic
   - Call GraphQL/REST APIs with token
   - Extract permit records

---

*Analysis Date: 2026-01-22*
*Status: API Infrastructure Discovered - Auth Required for Records*

## Next Steps to Get Permit Records

1. **Create OpenGov Account** on any portal (e.g., galvestoncountytx.portal.opengov.com)
2. **Set credentials** in environment variables
3. **Run scraper** with authentication
4. **Monitor** for rate limiting and adjust delays
5. **Scale** to all 215 jurisdictions
