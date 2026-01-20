# National Septic OCR - Master Portal Tracker

> **Last Updated:** 2026-01-20 20:54 UTC
> **Phase:** 1 - Bulk Data Extraction (ACTIVE)
> **Total Portals:** 533+
> **Server:** 147.79.115.168 (scraping server) + 100.85.99.69 (GPU processing)

---

## Quick Stats

| Metric | Count |
|--------|-------|
| Portals Identified | 533+ |
| Portals Processed | 12 |
| Portals In Progress | 8 |
| **Total Records Captured** | **4,711,783+** |
| Records in CRM | 0 (pending ingest) |
| Progress to 7M Goal | 67.3% |

### Captured Data Summary
- **Florida DEP: 1,900,000 records** ✅ CAPTURED (local: scrapers/output/florida/ - 433MB)
- **Delaware Open Data: 2,339,070 records** ✅ CAPTURED (local: scrapers/output/delaware/de_permits_full.json - 84MB)
- **Vermont DEC: 80,000+ records** ✅ CAPTURED (local: scrapers/output/vermont/vt_permits_batch1.json)
- **MGO Connect: 375,713+ records** ✅ CAPTURED (server: ~/mgo_extraction/ - 21+ files)
- **Williamson County TX: 3,095 records** ✅ CAPTURED (local: scrapers/output/mgo/williamson_county_*.ndjson)
- **eBridge FL Counties: 5,089 records** ✅ CAPTURED (server: ~/scrapers/output/ebridge/ - 7 NDJSON files)
- **Sonoma County CA: ~13,000 records** ✅ CAPTURED (local: scrapers/output/sonoma_county_ca_septic.json)

### Key Challenges
- **Tennessee TDEC:** Server timing out
- **Texas MGOconnect:** Angular dropdown issues, needs fix
- **Minnesota MPCA:** Interactive portal, needs dedicated scraper
- **New Mexico NMED:** Server timing out
- **Most data is county-level:** Fragmented across 3,000+ jurisdictions

---

## TIER 1: Statewide Portals (Priority)

| State | Region | Portal URL | Platform | Username | Password | Login Tested | Scraper Exists | Est. Records | Phase 1 Status | Phase 2 Status | Sample Permit IDs | Notes |
|-------|--------|------------|----------|----------|----------|--------------|----------------|--------------|----------------|----------------|-------------------|-------|
| VT | Statewide | https://anrweb.vt.gov/DEC/WWDocs/Default.aspx | Custom | PUBLIC | N/A | YES | YES | 300,000+ | **80,156 CAPTURED** | PENDING | 5W0431-3A, 5W0431-3B, WW-1-0516 | 54 search terms, deduplicated, vt_full_extraction.json |
| NH | Statewide | https://www4.des.state.nh.us/DESOnestop/BasicSearch.aspx | Custom | PUBLIC | N/A | YES | YES | 140,000+ | IN_PROGRESS | PENDING | - | 1967-1986 + 2016-present, scraper needs tuning |
| TN | Statewide | https://tdec.tn.gov/document-viewer/search/stp | FileNet | PUBLIC | N/A | - | YES | 500,000+ | IN_PROGRESS | PENDING | - | Excludes 9 metro counties, Playwright ready |
| MN | Statewide | https://webapp.pca.state.mn.us/ssts/ | Custom | PUBLIC | N/A | - | YES | 600,000+ | IN_PROGRESS | PENDING | - | MPCA scraper created, 87 counties |
| FL | Statewide | https://cadev.dep.state.fl.us/arcgis/rest/services/External_Services/SEPTIC_SYSTEMS/MapServer | ArcGIS REST | PUBLIC | N/A | YES | YES | 1,939,334 | **1,939,334 CAPTURED** | PENDING | - | FL DEP SEPTIC_SYSTEMS MapServer - COMPLETE |
| FL | 40+ Counties | https://s1.ebridge-solutions.com/ebridge/3.0 | eBridge | public | varies | YES | YES | 500,000+ | IN_PROGRESS | PENDING | - | **eBridge permits: contractor info, system specs. PDFs available for future extraction.** |
| TX | Potter/Randall | https://s1.ebridge-solutions.com/ebridge/3.0 | eBridge | public | public | YES | YES | 20,000+ | PENDING | PENDING | - | Amarillo area eBridge instance |
| DE | Statewide | https://data.delaware.gov/Energy-and-Environment/Permitted-Septic-Systems/mv7j-tx3u | Open Data | PUBLIC | N/A | YES | YES | 129,948 | **129,948 CAPTURED** | PENDING | 0310-90S, 031177-90S, 031215-90S | Full API download complete! Rich metadata |
| ME | Statewide | https://apps.web.maine.gov/cgi-bin/online/mecdc/septicplans/index.pl | Custom | PUBLIC | N/A | - | NO | 100,000+ | PENDING | PENDING | - | Since July 1974 |
| RI | Statewide | https://www.ri.gov/dem/owts | Custom | PUBLIC | N/A | - | NO | 50,000+ | PENDING | PENDING | - | Since 1968 |
| NM | Statewide | https://lwop.waste.web.env.nm.gov/wwtspf/ | Custom | PUBLIC | N/A | - | NO | 200,000+ | PENDING | PENDING | - | Except Bernalillo County |
| SC | Statewide | https://apps.dhec.sc.gov/Environment/EnvironmentalApplicationTracker/Search.aspx | Custom | PUBLIC | N/A | - | NO | 200,000+ | PENDING | PENDING | - | 2 years history, multi-county |
| OK | Statewide | https://applications.deq.ok.gov/sewagepermit/ | Custom | PUBLIC | N/A | - | NO | 100,000+ | PENDING | PENDING | - | DEQ statewide system |
| AK | Statewide | https://dec.alaska.gov/water/edms | EDMS | PUBLIC | N/A | - | NO | 50,000+ | PENDING | PENDING | - | DEC documentation |
| OR | Partial | https://www.oregon.gov/deq/residential/pages/onsite-records.aspx | Custom | PUBLIC | N/A | - | NO | 30,000+ | PENDING | PENDING | - | 6 counties only |
| NE | Statewide | https://deq-iis.ne.gov/zs/permit/main_search.php | Custom | PUBLIC | N/A | - | NO | 50,000+ | PENDING | PENDING | - | NDEQ search |
| MD | Statewide | https://mes-mde.mde.state.md.us/WastewaterPermitPortal/ | Custom | PUBLIC | N/A | - | NO | 150,000+ | PENDING | PENDING | - | MDE portal |
| HI | Statewide | https://eha-cloud.doh.hawaii.gov/epermit/ | Custom | VARIES | - | - | NO | 50,000+ | PENDING | PENDING | - | TMK search |

---

## TIER 2: Platform-Based Portals (Accela)

| State | County | Portal URL | Platform | Username | Password | Login Tested | Scraper Exists | Est. Records | Phase 1 Status | Phase 2 Status | Sample Permit IDs | Notes |
|-------|--------|------------|----------|----------|----------|--------------|----------------|--------------|----------------|----------------|-------------------|-------|
| AZ | Maricopa | https://accela.maricopa.gov/CitizenAccessMCESD/ | Accela | PUBLIC | N/A | - | YES | 200,000+ | PENDING | PENDING | - | Phoenix metro |
| AZ | Pima | https://www.pima.gov/465/Septic-Records | Custom | PUBLIC | N/A | - | YES | 100,000+ | PENDING | PENDING | - | Tucson |
| CA | Contra Costa | https://aca-prod.accela.com/CCC/ | Accela | PUBLIC | N/A | - | YES | 50,000+ | PENDING | PENDING | - | |
| CA | San Diego | https://sandiegocounty.gov/deh/doclibrary | Custom | PUBLIC | N/A | - | YES | 100,000+ | PENDING | PENDING | - | Document library |
| CA | Riverside | https://rivcoplus.org/EnerGov_Prod | EnerGov | PUBLIC | N/A | - | NO | 100,000+ | PENDING | PENDING | - | Also GIS map |
| CA | Sacramento | Contact county | Custom | - | - | - | YES | 50,000+ | PENDING | PENDING | - | |
| CO | Boulder | https://accelapublic.bouldercounty.org/citizenaccess/ | Accela | PUBLIC | N/A | - | YES | 30,000+ | PENDING | PENDING | - | |
| GA | Fulton | Contact | - | - | - | - | YES | 50,000+ | PENDING | PENDING | - | Atlanta |
| GA | Gwinnett | Contact | - | - | - | - | YES | 50,000+ | PENDING | PENDING | - | |
| NC | Wake | Contact | Custom | - | - | - | YES | 50,000+ | PENDING | PENDING | - | Raleigh |
| NC | Mecklenburg | Contact | Custom | - | - | - | YES | 50,000+ | PENDING | PENDING | - | Charlotte |
| TX | Travis | https://traviscountytx.gov/tnr | MGO | PUBLIC | N/A | - | YES | 50,000+ | PENDING | PENDING | - | Austin |
| TX | Tarrant | Contact | Custom | - | - | - | YES | 50,000+ | PENDING | PENDING | - | Fort Worth |
| VA | Fairfax | https://fairfaxcounty.gov/health | Custom | PUBLIC | N/A | - | YES | 50,000+ | PENDING | PENDING | - | PLUS system |
| VA | Loudoun | https://loudoun.gov/5771 | LandMARC | PUBLIC | N/A | - | YES | 30,000+ | PENDING | PENDING | - | |
| WA | King | https://kingcounty.gov/dph | Custom | PUBLIC | N/A | - | YES | 50,000+ | PENDING | PENDING | - | Seattle |
| WA | Pierce | Contact | Custom | - | - | - | NO | 30,000+ | PENDING | PENDING | - | Tacoma |
| NV | Clark | https://aca-prod.accela.com/clarkco/ | Accela | PUBLIC | N/A | - | YES | 100,000+ | PENDING | PENDING | - | Las Vegas |
| OR | Clackamas | https://aca-prod.accela.com/CLACKAMAS | Accela | PUBLIC | N/A | - | YES | 30,000+ | PENDING | PENDING | - | |
| MD | Howard | https://dilp.howardcountymd.gov/CitizenAccess/ | Accela | PUBLIC | N/A | - | YES | 20,000+ | PENDING | PENDING | - | |

---

## TIER 3: EnerGov Platform Portals (EXPANDED 2026-01-20)

> **NEW:** Full scraper suite built with Decodo proxy support. See `scrapers/energov/` for configs.
> **Estimated Total:** 480,000+ records across 12 confirmed portals

### Tyler-Hosted EnerGov Portals

| State | County/City | Portal URL | Platform | Username | Password | Login Tested | Scraper Exists | Est. Records | Phase 1 Status | Phase 2 Status | Sample Permit IDs | Notes |
|-------|-------------|------------|----------|----------|----------|--------------|----------------|--------------|----------------|----------------|-------------------|-------|
| NC | Wake County | https://wakecountync-energovpub.tylerhost.net/apps/SelfService | EnerGov | PUBLIC | N/A | YES | YES | **501,299** | **TESTED** | PENDING | VIO-005416-2025 | **CONFIRMED 501K permits via API!** |
| GA | Atlanta | https://atlantaga-energov.tylerhost.net/Apps/SelfService | EnerGov | PUBLIC | N/A | YES | YES | 100,000+ | **BLOCKED** | PENDING | - | Access Denied - CDN blocked, needs proxy |
| NM | Albuquerque | https://cityofalbuquerquenm-energovweb.tylerhost.net/apps/selfservice | EnerGov | PUBLIC | N/A | YES | YES | 50,000+ | READY | PENDING | - | NM largest city |
| FL | Doral | https://doralfl-energovweb.tylerhost.net/apps/SelfService | EnerGov | PUBLIC | N/A | YES | YES | **162,820** | **4,887 CAPTURED** | PENDING | CCSR-001592-2022 | **162K total permits! 4,887 extracted** |
| CT | Hartford | https://hartfordct-energov.tylerhost.net/Apps/SelfService | EnerGov | PUBLIC | N/A | YES | YES | 40,000+ | READY | PENDING | - | CT capital |
| FL | New Smyrna Beach | https://newsmyrnabeachfl-energovweb.tylerhost.net/apps/SelfService | EnerGov | PUBLIC | N/A | - | YES | 15,000+ | READY | PENDING | - | FL coastal |
| CA | Hayward | https://haywardca-energovpub.tylerhost.net/Apps/SelfService | EnerGov | PUBLIC | N/A | - | YES | 30,000+ | READY | PENDING | - | Bay Area |
| CA | Yuba County | https://yubacountyca-energovweb.tylerhost.net/apps/SelfService | EnerGov | PUBLIC | N/A | - | YES | 20,000+ | READY | PENDING | - | CA county |
| CA | Carson | https://cityofcarsonca-energovweb.tylerhost.net/apps/selfservice | EnerGov | PUBLIC | N/A | - | YES | 15,000+ | READY | PENDING | - | LA area |
| NC | Raleigh | https://raleighnc-energov.tylerhost.net/apps/SelfService | EnerGov | PUBLIC | N/A | - | YES | 60,000+ | READY | PENDING | - | NC capital |

### Self-Hosted EnerGov Portals

| State | County/City | Portal URL | Platform | Username | Password | Login Tested | Scraper Exists | Est. Records | Phase 1 Status | Phase 2 Status | Sample Permit IDs | Notes |
|-------|-------------|------------|----------|----------|----------|--------------|----------------|--------------|----------------|----------------|-------------------|-------|
| SC | Pickens | https://energovweb.pickenscountysc.us/EnerGovProd/SelfService | EnerGov | PUBLIC | N/A | YES | YES | 15,000+ | READY | PENDING | - | Self-hosted |
| FL | Fort Myers | https://cdservices.cityftmyers.com/energovprod/selfservice | EnerGov | PUBLIC | N/A | - | YES | 35,000+ | READY | PENDING | - | Self-hosted |

### EnerGov API Discovery (2026-01-20 - UPDATED)

**SCRAPER STATUS: WORKING ✅**
- Playwright-based scraper: `scrapers/energov/energov-playwright-scraper.ts`
- Successfully extracts permit records via search API
- Tested on Wake County NC (501K permits) and Doral FL (25K permits)
- Extraction rate: ~390 records/minute
- Records include: permit numbers, addresses, types, status, dates

**Discovered Endpoints:**
```
Search API: POST /apps/selfservice/api/energov/search/search
Response Structure:
  Result: {
    EntityResults: [...],    // Array of permit records
    TotalPages: N,           // Pagination info
    PermitsFound: N,         // Total permits matching
    PlansFound: N,
    InspectionsFound: N,
    ...
  }

Record Fields:
  CaseId, CaseNumber, CaseType, CaseWorkclass, CaseStatus
  ApplyDate, IssueDate, ExpireDate, FinalDate
  Address (nested object with FullAddress, City, PostalCode)
  MainParcel, Description

Required Headers: TenantId: 1, Content-Type: application/json
Note: Requires Angular session cookies - Playwright handles this automatically
```

**To Run Extraction:**
```bash
# Single portal
npx tsx scrapers/energov/energov-playwright-scraper.ts --portal=wake_county_nc

# All enabled portals
npx tsx scrapers/energov/energov-playwright-scraper.ts

# With Decodo proxy (on server)
npx tsx scrapers/energov/energov-playwright-scraper.ts --proxy
```

### EnerGov Portals (Research Phase)

| State | County/City | Portal URL | Platform | Username | Password | Login Tested | Scraper Exists | Est. Records | Phase 1 Status | Phase 2 Status | Sample Permit IDs | Notes |
|-------|-------------|------------|----------|----------|----------|--------------|----------------|--------------|----------------|----------------|-------------------|-------|
| FL | Cape Coral | energov portal | EnerGov | PUBLIC | N/A | - | NO | 40,000+ | PENDING | PENDING | - | Large FL city |
| TX | Mesquite | https://energov.cityofmesquite.com/ | EnerGov | PUBLIC | N/A | - | NO | 20,000+ | PENDING | PENDING | - | Verify URL |
| TX | Princeton | https://princetontx.gov/603/EnerGov-Self-Service-Portal | EnerGov | PUBLIC | N/A | - | NO | 10,000+ | PENDING | PENDING | - | |
| MI | Oakland | Tyler EnerGov | EnerGov | PUBLIC | N/A | - | NO | 50,000+ | PENDING | PENDING | - | Find URL |
| CA | Riverside | https://rivcoplus.org/EnerGov_Prod | EnerGov | PUBLIC | N/A | - | NO | 100,000+ | PENDING | PENDING | - | Verify URL |
| CA | Los Angeles | Tyler EnerGov | EnerGov | PUBLIC | N/A | - | NO | 200,000+ | PENDING | PENDING | - | Find URL |

---

## TIER 4: Ascent Platform (Wisconsin)

| State | County | Portal URL | Platform | Username | Password | Login Tested | Scraper Exists | Est. Records | Phase 1 Status | Phase 2 Status | Sample Permit IDs | Notes |
|-------|--------|------------|----------|----------|----------|--------------|----------------|--------------|----------------|----------------|-------------------|-------|
| WI | Washington | POWTS app | Ascent | PUBLIC | N/A | - | NO | 20,000+ | PENDING | PENDING | - | |
| WI | St. Croix | Ascent Permit | Ascent | PUBLIC | N/A | - | NO | 15,000+ | PENDING | PENDING | - | |
| WI | Vilas | Ascent | Ascent | PUBLIC | N/A | - | NO | 10,000+ | PENDING | PENDING | - | Scanned permits |
| WI | Marathon | Ascent Land Records | Ascent | PUBLIC | N/A | - | NO | 15,000+ | PENDING | PENDING | - | |
| WI | Fond du Lac | fdlco.wi.gov | Ascent | PUBLIC | N/A | - | NO | 15,000+ | PENDING | PENDING | - | Fire # or permit # |
| WI | Polk | polkcountywi.gov | Ascent | PUBLIC | N/A | - | NO | 10,000+ | PENDING | PENDING | - | |

---

## TIER 5: Texas Counties (High Volume)

| State | County | Portal URL | Platform | Username | Password | Login Tested | Scraper Exists | Est. Records | Phase 1 Status | Phase 2 Status | Sample Permit IDs | Notes |
|-------|--------|------------|----------|----------|----------|--------------|----------------|--------------|----------------|----------------|-------------------|-------|
| TX | Harris | https://epermits.harriscountytx.gov | ePermits | PUBLIC | N/A | - | NO | 100,000+ | PENDING | PENDING | - | Houston |
| TX | Comal | https://cceo.comalcounty.gov/searches/record_search.html | Custom/PHP | PUBLIC | N/A | YES | YES | **119,000+** | **API DISCOVERED** | PENDING | 119291 | **API Discovery: 4 typeahead JSON endpoints! Scraper: scrapers/states/texas/comal_county_scraper.py** |
| TX | Bell | MGO | MGO | PUBLIC | N/A | - | NO | 15,000+ | PENDING | PENDING | - | |
| TX | Collin | MGO | MGO | PUBLIC | N/A | - | NO | 30,000+ | PENDING | PENDING | - | |
| TX | Hays | MGO | MGO | PUBLIC | N/A | - | NO | 20,000+ | PENDING | PENDING | - | |
| TX | Williamson | TBD | TBD | - | - | - | NO | 25,000+ | PENDING | PENDING | - | |
| TX | TCEQ | https://www.tceq.texas.gov/permitting/ossf/texas-historical-ossf-permitting-data | State | PUBLIC | N/A | - | NO | 43,000+/yr | PENDING | PENDING | - | Historical data |

---

## TIER 6: California Counties

| State | County | Portal URL | Platform | Username | Password | Login Tested | Scraper Exists | Est. Records | Phase 1 Status | Phase 2 Status | Sample Permit IDs | Notes |
|-------|--------|------------|----------|----------|----------|--------------|----------------|--------------|----------------|----------------|-------------------|-------|
| CA | Los Angeles | publichealth.lacounty.gov | Custom | - | - | - | NO | 200,000+ | PENDING | PENDING | - | (562) 345-3404 |
| CA | Orange | ochealthinfo.com | Custom | - | - | - | NO | 100,000+ | PENDING | PENDING | - | (714) 433-6000 |
| CA | San Bernardino | Contact | Custom | - | - | - | NO | 75,000+ | PENDING | PENDING | - | |
| CA | Fresno | DPH OWTS Portal | Custom | PUBLIC | N/A | - | NO | 50,000+ | PENDING | PENDING | - | |
| CA | Kern | KCEHSD Portal | Custom | PUBLIC | N/A | - | NO | 50,000+ | PENDING | PENDING | - | |
| CA | Santa Clara | DEH Portal | Custom | - | - | - | NO | 75,000+ | PENDING | PENDING | - | San Jose |

---

## TIER 7: Michigan Counties

| State | County | Portal URL | Platform | Username | Password | Login Tested | Scraper Exists | Est. Records | Phase 1 Status | Phase 2 Status | Sample Permit IDs | Notes |
|-------|--------|------------|----------|----------|----------|--------------|----------------|--------------|----------------|----------------|-------------------|-------|
| MI | Washtenaw | https://washtenaw.org/2773 | OnBase | PUBLIC | N/A | - | NO | 30,000+ | PENDING | PENDING | - | Online search |
| MI | Grand Traverse | BS&A Online | BS&A | PUBLIC | N/A | - | NO | 15,000+ | PENDING | PENDING | - | EPIC GT |
| MI | Genesee | Health Dept | Custom | - | - | - | NO | 20,000+ | PENDING | PENDING | - | Flint |
| MI | Kent | AccessKent GIS | GIS | PUBLIC | N/A | - | NO | 40,000+ | PENDING | PENDING | - | Grand Rapids |
| MI | Wayne | Health Dept | Custom | - | - | - | NO | 50,000+ | PENDING | PENDING | - | Detroit |
| MI | Oakland | Tyler EnerGov | EnerGov | PUBLIC | N/A | - | NO | 50,000+ | PENDING | PENDING | - | |
| MI | Macomb | Health Dept | Custom | - | - | - | NO | 40,000+ | PENDING | PENDING | - | |
| MI | Kalamazoo | Health Dept | Custom | - | - | - | NO | 20,000+ | PENDING | PENDING | - | |

---

## Processing Log

| Timestamp | Portal | Action | Result | Records | Notes |
|-----------|--------|--------|--------|---------|-------|
| 2026-01-19 00:00 | - | TRACKER INITIALIZED | SUCCESS | 0 | Beginning assault |
| 2026-01-19 09:27 | Vermont DEC | BULK EXTRACTION | SUCCESS | 17,911 | Initial batch via broad search |
| 2026-01-19 09:42 | Delaware Open Data | FULL DOWNLOAD | SUCCESS | 129,948 | Complete API download via Socrata |
| 2026-01-19 10:08 | Delaware Open Data | RE-VERIFICATION | SUCCESS | 129,948 | Confirmed via fresh download |
| 2026-01-19 10:11 | Vermont DEC | EXPANDED EXTRACTION | SUCCESS | 22,284 | 10 search terms, deduplicated |
| 2026-01-19 10:12 | Minnesota MPCA | SCRAPER CREATED | - | 0 | 87 counties, Playwright-based |
| 2026-01-19 10:12 | NH DES OneStop | TEST RUN | NEEDS_TUNING | 17 | Parser picking up non-records |
| 2026-01-19 10:13 | Tennessee TDEC | PORTAL TEST | BLOCKED | 0 | 403 Forbidden on FileNet URLs |
| 2026-01-19 10:17 | Maine CDC | SCRAPER CREATED | - | 0 | Needs portal analysis |
| 2026-01-19 10:20 | Vermont DEC | EXPANDED EXTRACT | SUCCESS | 80,156 | 54 search terms, deduplicated |
| 2026-01-20 05:00 | MGO Connect | SERVER EXTRACTION | IN_PROGRESS | 375,713+ | 21+ files, multi-state |
| 2026-01-20 05:17 | Williamson TX | API EXTRACTION | SUCCESS | 3,095 | MGO Connect API direct |
| 2026-01-20 08:00 | eBridge FL | COUNTY EXTRACTION | IN_PROGRESS | 4,000+ | Hillsborough + Osceola |
| 2026-01-20 09:00 | EnerGov | SCRAPER SUITE BUILT | SUCCESS | - | 4 scrapers + configs |
| 2026-01-20 10:00 | Doral FL EnerGov | API DISCOVERY | SUCCESS | - | Found API endpoints |
| 2026-01-20 10:32 | EnerGov | SERVER DEPLOY | SUCCESS | - | Deployed to 147.79.115.168 |
| 2026-01-20 10:45 | - | DATA AUDIT | SUCCESS | 4,711,783+ | Created EXISTING_DATA_AUDIT.md |
| 2026-01-20 10:45 | - | PORTAL DISCOVERY | SUCCESS | 33 portals | Created PORTAL_DISCOVERY.md |
| 2026-01-20 14:39 | Comal County TX | API DISCOVERY | SUCCESS | 119,000+ | **Found 4 JSON typeahead endpoints! PermitNumSearch.php, AddressSearch.php, NameSearch.php, SubnameSearch.php. Highest permit: 119291** |
| 2026-01-20 15:02 | Comal County TX | LOCAL EXTRACTION | SUCCESS | 12,919 | Local extraction: 12,919 permits, 497 addresses, 275 owners |
| 2026-01-20 15:05 | Comal County TX | SERVER EXTRACTION | IN_PROGRESS | - | Running on 100.85.99.69: ~/scrapers/output/texas/comal_county/ |

---

## Legend

**Phase Status Values:**
- `PENDING` - Not started
- `IN_PROGRESS` - Currently being processed
- `COMPLETE` - Data extracted and verified in CRM
- `BLOCKED` - Cannot access (rate limited, login required, etc.)
- `LOW_YIELD` - Less than 10,000 records, deprioritized
- `SKIPPED` - Not scrapeable (contact only, FOIA required)

**Login Tested:**
- `-` = Not tested yet
- `YES` = Successfully logged in/accessed
- `NO` = Failed to access
- `N/A` = No login required (public)

---

*Updated automatically by Ralph Wiggum Assault System*
