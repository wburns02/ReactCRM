# National Septic OCR - Coverage Map

> **Generated:** 2026-01-18
> **Status:** Phase 3-4 - Scrapers Built, Testing In Progress

---

## Coverage Summary

| Category | Count |
|----------|-------|
| States Researched | 50/50 |
| Statewide Portals | 12 |
| Counties Documented | 600+ |
| Online Portals Identified | 500+ |
| Scrapers Implemented | 4 |
| Scrapers Tested | 1 |
| Estimated Accessible Records | 7M+ |

---

## Scraper Status by State

### Tier 1: Scrapers Built & Tested

| State | Scraper | Portal | Test Status | Records |
|-------|---------|--------|-------------|---------|
| VT | `VermontDECScraper` | DEC Wastewater | ✅ PASSED | 4,828+ |

### Tier 2: Scrapers Built (Pending Testing)

| State | Scraper | Portal | Counties/Coverage |
|-------|---------|--------|-------------------|
| FL | `FloridaEBridgeScraper` | eBridge OSTDS | 20 counties |
| TN | `TennesseeTDECScraper` | TDEC FileNet | Statewide (86 counties) |

### Tier 3: Platform Scrapers (Multi-State)

| Platform | Scraper | States | Portals |
|----------|---------|--------|---------|
| Accela | `AccelaScraper` | 8 | 16 |

---

## State-by-State Coverage

### Legend
- ✅ Scraper implemented and tested
- 🔧 Scraper built, pending testing
- 📋 Portal documented, scraper pending
- ❌ No online portal / FOIA required

---

### Northeast Region

| State | Coverage | Portal Type | Scraper Status |
|-------|----------|-------------|----------------|
| CT | 📋 | Town Health Depts | Contact required |
| MA | 📋 | Town BOH | Contact required |
| ME | 📋 | State Portal | Pending |
| NH | 📋 | SSB OneStop | Pending |
| NJ | 📋 | County Health | Contact required |
| NY | 📋 | County Health (partial) | Pending |
| PA | 📋 | Local SEOs | Contact required |
| RI | 📋 | DEM OWTS | Pending |
| VT | ✅ | DEC Wastewater | **TESTED** |

### Southeast Region

| State | Coverage | Portal Type | Scraper Status |
|-------|----------|-------------|----------------|
| AL | ❌ | County Health | FOIA required |
| FL | 🔧 | eBridge OSTDS | Built - 20 counties |
| GA | 📋 | County Health | Accela available |
| KY | ❌ | County Health | FOIA required |
| MD | 📋 | MDE Portal | Pending |
| NC | 📋 | County Health | Accela available |
| SC | 📋 | DHEC Tracker | Pending |
| TN | 🔧 | TDEC FileNet | Built - Playwright |
| VA | 📋 | Local Health | Accela available |
| WV | 📋 | County/OEHS | Partial |

### Midwest Region

| State | Coverage | Portal Type | Scraper Status |
|-------|----------|-------------|----------------|
| IA | 📋 | County Health | Partial |
| IL | 📋 | County Health | Partial |
| IN | 📋 | County Health | Partial |
| KS | ❌ | County Health/P&Z | Contact required |
| MI | 📋 | County Health | Partial |
| MN | 📋 | County-managed | MPCA tracks pros only |
| MO | ❌ | County/DHSS | Contact required |
| NE | 📋 | NDEQ Search | Pending |
| ND | ❌ | Local Health | Contact required |
| OH | 📋 | County Health | Partial |
| SD | ❌ | County Planning | Contact required |
| WI | 📋 | County Ascent | Pending |

### Southwest Region

| State | Coverage | Portal Type | Scraper Status |
|-------|----------|-------------|----------------|
| AZ | 📋 | Maricopa/Pima | Accela available |
| NM | 📋 | NMED Permit Finder | Pending |
| OK | 📋 | DEQ Online | Pending |
| TX | 📋 | TCEQ + Counties | Accela available |

### Mountain Region

| State | Coverage | Portal Type | Scraper Status |
|-------|----------|-------------|----------------|
| CO | 📋 | County Health | Accela (El Paso) |
| ID | 📋 | Health Districts | Partial |
| MT | 📋 | County Health | Partial |
| NV | 📋 | NDEP + Clark | Pending |
| UT | ❌ | County Health | Contact required |
| WY | 📋 | DEQ + Counties | Partial |

### Pacific Region

| State | Coverage | Portal Type | Scraper Status |
|-------|----------|-------------|----------------|
| AK | 📋 | DEC EDMS | Pending |
| CA | 📋 | CIWQS + Counties | Accela available |
| HI | 📋 | DOH e-Permitting | Pending |
| OR | 📋 | DEQ Records | Partial |
| WA | 📋 | County Portals | Accela available |

### Other Regions

| State | Coverage | Portal Type | Scraper Status |
|-------|----------|-------------|----------------|
| AR | ❌ | County Health Units | Contact required |
| DE | 📋 | DNREC Multi-portal | Pending |
| LA | 📋 | Parish Health/LDEQ | Pending |
| MS | 📋 | MSDH | Partial |

---

## Accela Platform Coverage

The `AccelaScraper` supports 16 configured portals across 8 states:

### Arizona
- Maricopa County (Environmental Services / Onsite Wastewater)
- Pima County (Development Services / Septic)

### California
- San Diego County (Environmental Health / OWTS)
- Riverside County (Environmental Health / Septic)
- Sacramento County (Environmental Management / Onsite Sewage)

### Colorado
- El Paso County (Public Health / OWTS)

### Georgia
- Fulton County (Environmental Health / Septic)
- Gwinnett County (Environmental Health / Septic)

### North Carolina
- Wake County (Environmental Services / Septic)
- Mecklenburg County (Environmental Health / Septic)

### Texas
- Travis County (Development Services / OSSF)
- Tarrant County (Public Health / Septic)

### Virginia
- Fairfax County (Health Department / Septic)
- Loudoun County (Health / AOSE)

### Washington
- King County (Public Health / Septic)
- Pierce County (Environmental Health / OSS)

---

## Florida eBridge Coverage

The `FloridaEBridgeScraper` supports 20 Florida counties with public eBridge access:

| County | File Cabinet | Credentials |
|--------|--------------|-------------|
| Hillsborough | HCHD | public/publicuser |
| Martin | Martin County | Public/public |
| Okeechobee | okeechobeechd | public/password |
| Osceola | OSCEOLACHD | public/oscguest |
| Charlotte | CHARLOTTECHD | public/public |
| Lee | LEECHD | public/public |
| Hernando | HERNANDOCHD | public/public |
| Brevard | BREVARDCHD | public/public |
| Volusia | VOLUSIACHD | public/public |
| Seminole | SEMINOLECHD | public/public |
| Orange | ORANGECHD | public/public |
| Polk | POLKCHD | public/public |
| Pasco | PASCOCHD | public/public |
| Pinellas | PINELLASCHD | public/public |
| Sarasota | SARASOTACHD | public/public |
| Manatee | MANATEECHD | public/public |
| Collier | COLLIERCHD | public/public |
| Palm Beach | PBCHD | public/public |
| Broward | BROWARDCHD | public/public |
| Miami-Dade | MDCHD | public/public |

---

## Tennessee TDEC Coverage

The `TennesseeTDECScraper` covers 86 of 95 Tennessee counties through the statewide FileNet system.

### Contract Counties (NOT in FileNet)
The following 9 counties maintain their own systems:
- Blount
- Davidson (Nashville)
- Hamilton (Chattanooga)
- Jefferson
- Knox (Knoxville)
- Madison (Jackson)
- Sevier (Gatlinburg)
- Shelby (Memphis)
- Williamson (Franklin)

---

## Next Priority Scrapers

Based on estimated record counts and accessibility:

### High Priority
1. **Minnesota** - County-level Ascent/custom portals (~300K records)
2. **South Carolina** - DHEC Tracker statewide (~200K records)
3. **Delaware** - DNREC multi-portal (~50K records)
4. **Rhode Island** - DEM OWTS statewide (~40K records)

### Medium Priority
5. **New Mexico** - NMED Permit Finder (~100K records)
6. **Oklahoma** - DEQ Online statewide (~150K records)
7. **Nebraska** - NDEQ Search statewide (~80K records)
8. **Maryland** - MDE Portal (~100K records)

### Platform Expansions
9. **EnerGov** - Generic platform scraper (used by 8+ counties)
10. **Ascent** - Wisconsin county platform (~100K records)

---

## Estimated Total Records

| Category | Portals | Est. Records |
|----------|---------|--------------|
| Tier 1: Statewide (scrapers built) | 3 | 500K+ |
| Tier 2: Statewide (pending) | 9 | 2M+ |
| Tier 3: Accela counties | 16 | 1M+ |
| Tier 4: Other county portals | 50+ | 2M+ |
| Tier 5: FOIA-only states | 12 | 2M+ |
| **TOTAL** | **~90** | **7M+** |

---

## Technical Notes

### Scraper Dependencies

```bash
# Required for all scrapers
pip install requests beautifulsoup4

# Required for Playwright-based scrapers (TN, Accela)
pip install playwright
playwright install chromium

# Optional for PDF processing
pip install PyPDF2 pdfplumber
```

### Rate Limiting

All scrapers implement:
- 1 second delay between requests (configurable)
- Exponential backoff on errors
- Maximum 3 retries
- Random jitter to appear human-like

### Running Tests

```bash
cd scrapers

# Test Vermont scraper
python states/vermont_dec_scraper.py

# Test with specific query
python -c "
from states.vermont_dec_scraper import VermontDECScraper
scraper = VermontDECScraper()
result = scraper.search_by_address('Main')
print(f'Found {result.record_count} records')
"

# Run full test suite
python test_all_portals.py
```

---

## Data Quality

### Vermont DEC (Tested)
- **Fields Available:** Permit#, Town, Owner, Address, Applicant, SPAN#, Date, Description
- **Date Range:** 1969-present
- **Record Quality:** High (structured database)
- **PDF Documents:** Yes (linked from results)

### Florida eBridge (Pending Test)
- **Fields Available:** Permit#, Facility, Address, Date, Document Type
- **Date Range:** Varies by county
- **Record Quality:** Medium-High (document management)
- **PDF Documents:** Yes (scanned permits)

### Tennessee TDEC (Pending Test)
- **Fields Available:** Permit#, County, Owner, Address, Map/Parcel
- **Date Range:** Varies (recent decades digitized)
- **Record Quality:** Medium (digitized paper records)
- **PDF Documents:** Yes (scanned permits)

---

*Last Updated: 2026-01-18*
