# Tyler EnerGov Portal Inventory

> **Created:** 2026-01-20
> **Purpose:** Comprehensive list of all EnerGov CSS deployments for permit scraping
> **Status:** Discovery Phase

---

## Overview

Tyler Technologies' EnerGov is a widely-used government permit and land management platform. Many cities and counties use it for building permits, septic permits, planning, and code enforcement.

### Common URL Patterns
- `https://{jurisdiction}-energovweb.tylerhost.net/apps/SelfService`
- `https://{jurisdiction}-energovpub.tylerhost.net/apps/SelfService`
- `https://energov.{jurisdiction}.gov/`
- `https://{jurisdiction}.gov/energov/`

---

## TIER 1: Confirmed EnerGov Portals (Tyler-Hosted)

| # | State | Jurisdiction | URL | Est. Records | API Discovered | Notes |
|---|-------|-------------|-----|--------------|----------------|-------|
| 1 | CA | Yuba County | https://yubacountyca-energovweb.tylerhost.net/apps/SelfService | 20K+ | NO | County-level |
| 2 | CA | Hayward | https://haywardca-energovpub.tylerhost.net/Apps/SelfService | 30K+ | NO | City |
| 3 | CA | Carson | https://cityofcarsonca-energovweb.tylerhost.net/apps/selfservice | 15K+ | NO | City |
| 4 | CT | Hartford | https://hartfordct-energov.tylerhost.net/Apps/SelfService | 40K+ | NO | State capital |
| 5 | FL | Doral | https://doralfl-energovweb.tylerhost.net/apps/SelfService | 25K+ | NO | City |
| 6 | FL | New Smyrna Beach | https://newsmyrnabeachfl-energovweb.tylerhost.net/apps/SelfService | 15K+ | NO | City |
| 7 | GA | Atlanta | https://atlantaga-energov.tylerhost.net/Apps/SelfService | 100K+ | NO | Major city |
| 8 | NC | Wake County | https://wakecountync-energovpub.tylerhost.net/apps/SelfService | 75K+ | NO | Raleigh area |
| 9 | NC | Raleigh | https://raleighnc-energov.tylerhost.net/apps/SelfService | 60K+ | NO | State capital |
| 10 | NM | Albuquerque | https://cityofalbuquerquenm-energovweb.tylerhost.net/apps/selfservice | 50K+ | NO | Major city |

---

## TIER 2: Confirmed EnerGov Portals (Self-Hosted)

| # | State | Jurisdiction | URL | Est. Records | API Discovered | Notes |
|---|-------|-------------|-----|--------------|----------------|-------|
| 11 | CO | Boulder | https://bouldercolorado.gov/services/energov-customer-self-service-portal | 30K+ | NO | City |
| 12 | FL | Cape Coral | https://www.capecoral.gov/energov or CSS portal | 40K+ | NO | Large FL city |
| 13 | FL | Fort Myers | https://cdservices.cityftmyers.com/energovprod/selfservice | 35K+ | NO | City |
| 14 | FL | Hialeah | Tyler CSS portal | 45K+ | NO | Major FL city |
| 15 | FL | Ormond Beach | Tyler Civic Access | 15K+ | NO | City |
| 16 | FL | St. Lucie County | EnerGov platform | 50K+ | NO | County |
| 17 | IL | Elmhurst | Citizen Self-Service Portal | 20K+ | NO | City |
| 18 | OH | Worthington | EnerGov CSS portal | 10K+ | NO | City |
| 19 | SC | Pickens County | https://energovweb.pickenscountysc.us/EnerGovProd/SelfService | 15K+ | NO | County |
| 20 | TX | Princeton | EnerGov Self-Service Portal | 10K+ | NO | City |
| 21 | TX | Rosenberg | EnerGov portal | 8K+ | NO | City |
| 22 | MO | Columbia | EnerGov system | 25K+ | NO | University city |

---

## TIER 3: Large County Deployments (Research Needed)

Based on Tyler Technologies press releases, these large counties use EnerGov:

| # | State | Jurisdiction | URL | Est. Records | Status |
|---|-------|-------------|-----|--------------|--------|
| 23 | CA | Riverside County | rivcoplus.org/EnerGov_Prod | 100K+ | VERIFY URL |
| 24 | CA | Los Angeles County | Tyler EnerGov | 200K+ | FIND URL |
| 25 | GA | Barrow County | Tyler EnerGov | 15K+ | FIND URL |
| 26 | TX | Mesquite | energov.cityofmesquite.com | 20K+ | VERIFY URL |

---

## API Discovery Status

### Discovered API Patterns (2026-01-20)

Based on network interception on Doral FL portal:

**Base URL Pattern:** `/apps/selfservice/api/energov/{module}/{action}`

**Key Endpoints:**
```
/api/energov/search/criteria           - Get search criteria/options
/api/energov/permits/permit/status     - Permit status list
/api/energov/permits/search            - Search permits (requires TenantId header)
/api/energov/plans/plan/status         - Plan status
/api/energov/inspections/search/setup  - Inspection search config
/api/energov/codecases/codecase/status - Code case status
/api/energov/requests/request/status   - Request status
/api/energov/licenses/business/licensestatus - License status
```

**Required Headers:**
```
TenantId: 1
Content-Type: application/json
Accept: application/json
```

**IMPORTANT:** The EnerGov API requires session cookies established by the Angular app.
Direct REST calls may not work without proper session context. Use Playwright for
browser-based extraction with API response interception.

### Search Criteria Structure
```json
{
  "SearchModule": 1,
  "FilterModule": 0,
  "Keyword": "",
  "ExactMatch": false,
  "PermitCriteria": {
    "PageNumber": 1,
    "PageSize": 100,
    "SortBy": "PermitNumber",
    "SortAscending": true
  }
}
```

---

## Extraction Priority

### Phase 1: High-Volume Counties (Target First)
1. Wake County, NC - 75K+ estimated
2. Riverside County, CA - 100K+ estimated
3. Atlanta, GA - 100K+ estimated
4. St. Lucie County, FL - 50K+ estimated
5. Albuquerque, NM - 50K+ estimated

### Phase 2: Florida Cities (Many Septic Records)
6. Cape Coral, FL
7. Fort Myers, FL
8. Hialeah, FL
9. Doral, FL
10. New Smyrna Beach, FL

### Phase 3: Other States
11. Hartford, CT
12. Boulder, CO
13. Pickens County, SC
14. Columbia, MO

---

## Estimated Total Records

| Tier | Portals | Est. Records |
|------|---------|--------------|
| Tier 1 (Tyler-Hosted) | 10 | 430K+ |
| Tier 2 (Self-Hosted) | 12 | 323K+ |
| Tier 3 (Large Counties) | 4 | 335K+ |
| **TOTAL** | **26** | **1,088,000+** |

---

## Next Steps

1. [ ] Run API discovery on top 5 portals
2. [ ] Document authentication requirements
3. [ ] Test pagination patterns
4. [ ] Build generic scraper with configurations
5. [ ] Deploy to server with Decodo proxy

---

## Research Queries Used

```
site:tylerhost.net EnerGov permit search self service
"EnerGov" "Citizen Self Service" permit portal
inurl:energov permit search county city
"Tyler EnerGov" permit portal Florida Texas California
EnerGov Self Service portal building permit county
```

---

*Updated: 2026-01-20*
