# National Septic OCR - Master Portal Tracker

> **Last Updated:** 2026-01-19 00:00 UTC
> **Phase:** 1 - Metadata Collection
> **Total Portals:** 500+
> **Records Captured:** 0 (starting)

---

## Quick Stats

| Metric | Count |
|--------|-------|
| Portals Identified | 500+ |
| Portals Processed | 2 |
| Portals In Progress | 3 |
| **Total Records Captured** | **147,859** |
| Records in CRM | 0 (pending ingest) |

### Captured Data Summary
- Vermont DEC: 17,911 records
- Delaware Open Data: 129,948 records

---

## TIER 1: Statewide Portals (Priority)

| State | Region | Portal URL | Platform | Username | Password | Login Tested | Scraper Exists | Est. Records | Phase 1 Status | Phase 2 Status | Sample Permit IDs | Notes |
|-------|--------|------------|----------|----------|----------|--------------|----------------|--------------|----------------|----------------|-------------------|-------|
| VT | Statewide | https://anrweb.vt.gov/DEC/WWDocs/Default.aspx | Custom | PUBLIC | N/A | YES | YES | 300,000+ | **17,911 CAPTURED** | PENDING | 5W0431-3A, 5W0431-3B, WW-1-0516 | Batch 1 complete, more queries pending |
| NH | Statewide | https://www4.des.state.nh.us/DESOnestop/BasicSearch.aspx | Custom | PUBLIC | N/A | - | NO | 140,000+ | PENDING | PENDING | - | 1967-1986 + 2016-present |
| TN | Statewide | https://tdec.tn.gov/document-viewer/search/stp | FileNet | PUBLIC | N/A | - | YES | 500,000+ | PENDING | PENDING | - | Excludes 9 metro counties |
| MN | Statewide | https://webapp.pca.state.mn.us/ssts/ | Custom | PUBLIC | N/A | - | NO | 600,000+ | PENDING | PENDING | - | MPCA central database |
| FL | Statewide | https://www.floridahealth.gov/environmental-health/onsite-sewage/ | eBridge | PUBLIC | N/A | - | YES | 2,000,000+ | PENDING | PENDING | - | 67 counties, transitioning to DEP |
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

## TIER 3: EnerGov Platform Portals

| State | County/City | Portal URL | Platform | Username | Password | Login Tested | Scraper Exists | Est. Records | Phase 1 Status | Phase 2 Status | Sample Permit IDs | Notes |
|-------|-------------|------------|----------|----------|----------|--------------|----------------|--------------|----------------|----------------|-------------------|-------|
| SC | Pickens | https://energovweb.pickenscountysc.us/EnerGovProd/SelfService | EnerGov | PUBLIC | N/A | - | NO | 10,000+ | PENDING | PENDING | - | |
| FL | Cape Coral | energov portal | EnerGov | PUBLIC | N/A | - | NO | 20,000+ | PENDING | PENDING | - | |
| TX | Mesquite | https://energov.cityofmesquite.com/ | EnerGov | PUBLIC | N/A | - | NO | 10,000+ | PENDING | PENDING | - | |
| TX | Princeton | https://princetontx.gov/603/EnerGov-Self-Service-Portal | EnerGov | PUBLIC | N/A | - | NO | 5,000+ | PENDING | PENDING | - | |
| MI | Oakland | Tyler EnerGov | EnerGov | PUBLIC | N/A | - | NO | 50,000+ | PENDING | PENDING | - | |

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
| TX | Comal | https://cceo.org | Custom | PUBLIC | N/A | - | NO | 20,000+ | PENDING | PENDING | - | Environmental search |
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
| 2026-01-19 | - | TRACKER INITIALIZED | SUCCESS | 0 | Beginning assault |

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
