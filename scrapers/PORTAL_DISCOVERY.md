# Portal Discovery - New Extraction Targets

> **Date:** 2026-01-20
> **Purpose:** Comprehensive list of newly discovered permit portals
> **Estimated New Records:** 1,755,000+

---

## Executive Summary

| Category | Portals | Est. Records | Priority |
|----------|---------|--------------|----------|
| Statewide (Not Yet Scraped) | 10 | 980,000+ | HIGH |
| EnerGov Platform | 12 | 480,000+ | HIGH |
| Accela Platform (New) | 6 | 275,000+ | MEDIUM |
| SmartGov NC | 5 | 80,000+ | MEDIUM |
| **TOTAL NEW** | **33** | **1,815,000+** | - |

---

## PRIORITY 1: Statewide Portals (Not Yet Scraped)

These states have online statewide databases that we haven't captured yet.

| # | State | Portal Name | URL | Est. Records | Platform |
|---|-------|-------------|-----|--------------|----------|
| 1 | ME | Maine CDC Septic Plans | `apps.web.maine.gov/cgi-bin/online/mecdc/septicplans/` | 100,000+ | Custom |
| 2 | RI | DEM OWTS Search | `ri.gov/dem/owts` | 50,000+ | Custom |
| 3 | NM | NMED Liquid Waste Finder | `lwop.waste.web.env.nm.gov/wwtspf/` | 200,000+ | Custom |
| 4 | SC | DHEC Environmental Tracker | `apps.dhec.sc.gov/Environment/EnvironmentalApplicationTracker/` | 200,000+ | Custom |
| 5 | OK | DEQ Sewage Permit System | `applications.deq.ok.gov/sewagepermit/` | 100,000+ | Custom |
| 6 | AK | DEC EDMS | `dec.alaska.gov/water/edms` | 50,000+ | EDMS |
| 7 | MD | MDE Wastewater Portal | `mes-mde.mde.state.md.us/WastewaterPermitPortal/` | 150,000+ | Custom |
| 8 | NE | NDEQ Permit Search | `deq-iis.ne.gov/zs/permit/main_search.php` | 50,000+ | Custom |
| 9 | HI | DOH ePermit | `eha-cloud.doh.hawaii.gov/epermit/` | 50,000+ | Custom |
| 10 | OR | DEQ Wastewater DB | `oregon.gov/deq/wq/wqpermits/pages/wastewater-permits-database.aspx` | 30,000+ | Custom |

**Subtotal: 980,000+ estimated records**

---

## PRIORITY 2: Tyler EnerGov Platform

Tyler Technologies EnerGov CSS (Citizen Self Service) deployments with significant septic/permit data.

### Tier 1: Tyler-Hosted (Confirmed URLs)

| # | State | Jurisdiction | URL | Est. Records |
|---|-------|--------------|-----|--------------|
| 1 | NC | Wake County | `wakecountync-energovpub.tylerhost.net/apps/SelfService` | 75,000+ |
| 2 | GA | Atlanta | `atlantaga-energov.tylerhost.net/Apps/SelfService` | 100,000+ |
| 3 | NM | Albuquerque | `cityofalbuquerquenm-energovweb.tylerhost.net/apps/selfservice` | 50,000+ |
| 4 | FL | Doral | `doralfl-energovweb.tylerhost.net/apps/SelfService` | 25,000+ |
| 5 | CT | Hartford | `hartfordct-energov.tylerhost.net/Apps/SelfService` | 40,000+ |
| 6 | FL | New Smyrna Beach | `newsmyrnabeachfl-energovweb.tylerhost.net/apps/SelfService` | 15,000+ |
| 7 | CA | Hayward | `haywardca-energovpub.tylerhost.net/Apps/SelfService` | 30,000+ |
| 8 | CA | Yuba County | `yubacountyca-energovweb.tylerhost.net/apps/SelfService` | 20,000+ |
| 9 | CA | Carson | `cityofcarsonca-energovweb.tylerhost.net/apps/selfservice` | 15,000+ |
| 10 | NC | Raleigh | `raleighnc-energov.tylerhost.net/apps/SelfService` | 60,000+ |

### Tier 2: Self-Hosted (Confirmed)

| # | State | Jurisdiction | URL | Est. Records |
|---|-------|--------------|-----|--------------|
| 11 | SC | Pickens County | `energovweb.pickenscountysc.us/EnerGovProd/SelfService` | 15,000+ |
| 12 | FL | Fort Myers | `cdservices.cityftmyers.com/energovprod/selfservice` | 35,000+ |

**EnerGov Subtotal: 480,000+ estimated records**

### EnerGov API Patterns Discovered

```
Base: /apps/selfservice/api/energov/{module}/{action}

Endpoints:
- /api/energov/search/criteria
- /api/energov/permits/permit/status
- /api/energov/permits/search
- /api/energov/plans/plan/status
- /api/energov/inspections/search/setup
- /api/energov/codecases/codecase/status

Headers Required:
- TenantId: 1
- Content-Type: application/json

Note: Requires session cookies from Angular app
```

---

## PRIORITY 3: Accela Citizen Access (New Deployments)

Additional Accela deployments not in current queue.

| # | State | Jurisdiction | URL | Est. Records |
|---|-------|--------------|-----|--------------|
| 1 | FL | Sarasota County | `scgov.net/online-permitting` | 50,000+ |
| 2 | NY | Suffolk County | `aca-prod.accela.com/SUFFOLKCO` | 75,000+ |
| 3 | OK | Oklahoma City | `access.okc.gov` | 30,000+ |
| 4 | CA | Huntington Beach | `engage.huntingtonbeachca.gov/CitizenAccess` | 20,000+ |
| 5 | TX | Fort Worth | `aca-prod.accela.com/CFW` | 50,000+ |
| 6 | VA | Fairfax County | `plus.fairfaxcounty.gov` | 50,000+ |

**Accela Subtotal: 275,000+ estimated records**

---

## PRIORITY 4: SmartGov (North Carolina Focus)

NC counties using CentralSquare SmartGov platform.

| # | County | URL/Notes | Est. Records |
|---|--------|-----------|--------------|
| 1 | McDowell | `co-mcdowell-nc.smartgovcommunity.com` | 5,000+ |
| 2 | Columbus | SmartGov portal | 10,000+ |
| 3 | Henderson | 1968-2004 + 2004+ archives | 30,000+ |
| 4 | Johnston | `johnstonnc.gov/envhealth` | 15,000+ |
| 5 | Iredell | GIS Map integration | 20,000+ |

**SmartGov Subtotal: 80,000+ estimated records**

---

## BLOCKED PORTALS (Need Workaround)

| State | Portal | Issue | Potential Workaround |
|-------|--------|-------|---------------------|
| TN | TDEC FileNet | 403 Forbidden | Alternate URLs or county-level |
| MN | MPCA SSTS | Business portal only | County GIS systems |
| CA | LA County DPH | Phone request only | FOIA or (562) 345-3404 |
| CA | Orange County | Phone request only | (714) 433-6000 |

---

## COUNTY PORTALS DISCOVERED

### Iowa (Online Portals Found)

| County | URL | Notes |
|--------|-----|-------|
| Polk County | `polkcountyiowa.gov` | OpenGov platform |
| Linn County | Online permits since 2011 | |
| Pottawattamie County | Online submission | |

### New Jersey (CEHA Programs)

| County | Notes |
|--------|-------|
| Warren County | NEW self-service database (no OPRA required) |
| Atlantic County | CEHA permits |
| Cape May County | CEHA environmental services |

### Washington (Additional to King County)

| County | Status |
|--------|--------|
| Pierce County | Online permit portal |
| Snohomish County | CSS system |
| Clark County | Permits online |

---

## STATES WITH NO ONLINE STATEWIDE DATABASE

These states require county-by-county approach or FOIA requests:

- Alabama, Arkansas, Connecticut, Georgia, Illinois, Kansas
- Kentucky, Louisiana, Massachusetts, Mississippi, Missouri
- New Jersey, New York, North Dakota, South Dakota, Utah
- West Virginia

---

## EXTRACTION PRIORITY RANKING

### Phase 1: Quick Wins (Existing Scrapers)
1. Maine CDC - Scraper exists, deploy to server
2. Minnesota MPCA - Run county iteration

### Phase 2: High-Value New Scrapers
1. Rhode Island DEM OWTS - 50K+ since 1968
2. New Mexico NMED Finder - 200K+
3. Oklahoma DEQ Sewage - 100K+
4. South Carolina DHEC Tracker - 200K+

### Phase 3: Platform Generic Scrapers
1. EnerGov Generic - 12 jurisdictions, 480K+
2. SmartGov NC - 5 counties, 80K+
3. Additional Accela - 6 cities, 275K+

### Phase 4: County Expansion
1. Iowa: Polk, Linn, Pottawattamie
2. New Jersey: Warren (new self-service)
3. Washington: Additional counties

---

## ESTIMATED TOTAL ACCESSIBLE RECORDS

| Source | Portals | Records |
|--------|---------|---------|
| Already Captured | 6 | 4,711,783 |
| Statewide (New) | 10 | 980,000+ |
| EnerGov | 12 | 480,000+ |
| Accela (New) | 6 | 275,000+ |
| SmartGov | 5 | 80,000+ |
| **TOTAL ACCESSIBLE** | **39** | **6,526,783+** |

**Progress to 7M Goal: ~93% accessible**

---

## RESEARCH QUERIES USED

```
site:tylerhost.net EnerGov permit search self service
"EnerGov" "Citizen Self Service" permit portal
inurl:energov permit search county city
"Tyler EnerGov" permit portal Florida Texas California
EnerGov Self Service portal building permit county
"{state} septic permit database online"
"{state} onsite sewage permit search"
"{county} septic permit records online"
```

---

## SOURCES

- Oregon DEQ Onsite Records
- Maine CDC Septic Plans
- Rhode Island OWTS Search
- Tennessee TDEC FileNet (blocked)
- Florida DEP Onsite Sewage
- Tyler EnerGov Platform documentation
- EPA NPDES Permits
- Georgia DPH Onsite Sewage
- North Carolina Henderson County
- Massachusetts Title 5
- New Jersey CEHA programs

---

*Last Updated: 2026-01-20*
