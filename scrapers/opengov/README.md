# OpenGov Permit Portal Scraper

## Overview

Scraper for OpenGov/ViewPointCloud permit portals. OpenGov powers permitting for 350+ government agencies across the US.

## Key Findings

### Architecture
- **Frontend**: Ember.js single-page application
- **Backend**: ViewPointCloud REST API + GraphQL
- **Auth**: Auth0 SSO

### API Endpoints

**Public (No Auth Required):**
```
GET https://api-east.viewpointcloud.com/v2/{tenant}/categories
GET https://api-east.viewpointcloud.com/v2/{tenant}/record_types
GET https://api-east.viewpointcloud.com/v2/{tenant}/general_settings/1
```

**Authenticated (Requires Auth0 Token):**
```
POST https://search.viewpointcloud.com/graphql
POST https://records.viewpointcloud.com/graphql
GET  https://api-east.viewpointcloud.com/v2/{tenant}/records
```

## Current Capabilities

### What Works:
- Extract categories and record types for any OpenGov jurisdiction
- Save jurisdiction metadata (permit types, categories)
- Playwright automation for portal navigation

### What Requires Auth:
- Actual permit records
- GraphQL search
- Detailed permit data

## Usage

```bash
# Extract public metadata only
npx tsx scrapers/opengov/opengov-scraper.ts

# With authentication (for full record access)
OPENGOV_EMAIL=your@email.com OPENGOV_PASSWORD=yourpass npx tsx scrapers/opengov/opengov-scraper.ts
```

## Output Files

```
scrapers/output/opengov/
├── {jurisdiction}_metadata.json   # Categories and record types
├── {jurisdiction}_permits_*.ndjson # Permit records (if authenticated)
└── checkpoint.json                # Resume state
```

## Discovered Jurisdictions

| Tenant | Name | State | Record Types |
|--------|------|-------|--------------|
| stpetersburgfl | St. Petersburg | FL | 9 |
| apopkafl | Apopka | FL | 50 |
| cocoabeachfl | Cocoa Beach | FL | 24 |
| arlingtonma | Arlington | MA | 41 |
| brownsburgin | Brownsburg | IN | 37 |
| countyoflakeca | Lake County | CA | TBD |
| providenceri | Providence | RI | TBD |

## Next Steps

1. **Create OpenGov account** for authentication
2. **Server deployment** to 100.85.99.69 for full extraction
3. **Expand jurisdiction list** via web search
4. **Add proxy rotation** for large-scale extraction

## Files

```
scrapers/opengov/
├── opengov-scraper.ts          # Main scraper
├── opengov-api-discovery.ts    # API endpoint discovery
├── opengov-config.ts           # Configuration
├── opengov-types.ts            # TypeScript interfaces
├── discovered-endpoints.json   # API documentation
└── README.md                   # This file
```

## Proxy Configuration

Uses Decodo datacenter proxies:
- Host: dc.decodo.com
- Ports: 10001-10010
- Rotation on 403/429 errors

## Authentication Notes

OpenGov uses Auth0 for authentication:
- Domain: accounts.viewpointcloud.com
- Client ID: Kne3XYPvChciFOG9DvQ01Ukm1wyBTdTQ
- Audience: viewpointcloud.com/api/production

To authenticate:
1. Sign up at any OpenGov portal
2. Set OPENGOV_EMAIL and OPENGOV_PASSWORD env vars
3. Scraper will attempt Auth0 login and capture bearer token
