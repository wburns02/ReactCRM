# Existing Data Audit - National Permit Repository

> **Date:** 2026-01-20
> **Purpose:** Complete inventory of all captured permit data
> **Total Records:** 4,711,783+

---

## Executive Summary

| Category | Records | Files | Status |
|----------|---------|-------|--------|
| **Local Storage** | 4,339,165+ | 30+ | CAPTURED |
| **Server Storage** | 372,618+ | 21+ | IN PROGRESS |
| **GRAND TOTAL** | **4,711,783+** | **51+** | ~67% of 7M goal |

---

## LOCAL DATA INVENTORY

### Tier 1: Statewide Datasets (High Volume)

| State | Source | Records | File Size | Location | Record Type |
|-------|--------|---------|-----------|----------|-------------|
| **Florida** | DEP ArcGIS | 1,900,000 | 433 MB | `output/florida/` | Septic Permits |
| **Delaware** | Open Data | 2,339,070 | 84 MB | `output/delaware/` | Permit Records |
| **Vermont** | DEC WWDocs | 80,000+ | 22 MB | `output/vermont/` | Wastewater Docs |

**Subtotal: ~4,319,070 records**

### Tier 2: County/Regional Datasets

| State | County/Region | Records | Location | Record Type |
|-------|---------------|---------|----------|-------------|
| **California** | Sonoma County | ~13,000 | `output/sonoma_county_ca_septic.json` | Septic |
| **Texas** | Williamson County | 3,095 | `output/mgo/williamson_county_*.ndjson` | OSSF Permits |
| **Florida** | Hillsborough | 2,000 | `output/ebridge/` | County Permits |
| **Florida** | Osceola | 2,000 | `output/ebridge/` | County Permits |

**Subtotal: ~20,095 records**

### Tier 3: Partial/Exploration Data

| State | Source | Files | Location | Notes |
|-------|--------|-------|----------|-------|
| Arizona | GIO Parcels | 1 | `output/arizona/` | Exploration |
| Georgia | DPH/GEMA | 3 | `output/georgia/` | Healthcare data |
| Maryland | Montgomery | 1 | `output/maryland/` | Sewage permits |
| Michigan | EGLE | 21 | `output/michigan/` | Partial extraction |
| Minnesota | Counties | 46 | `output/minnesota/` | County data |
| North Carolina | Various | 11 | `output/north_carolina/` | Multiple sources |
| Ohio | Various | 6 | `output/ohio/` | Partial |
| Pennsylvania | DEP | 2 | `output/pennsylvania/` | Partial |
| South Carolina | DHEC | 17 | `output/south_carolina/` | Tracker data |
| Tennessee | TDEC | 6 | `output/tennessee/` | Attempts |
| Texas | Various | 8 | `output/texas/` | MGO counties |

---

## SERVER DATA INVENTORY

> **Note:** Server (147.79.115.168) connectivity issues as of 2026-01-20. Data based on last known status.

### MGO Connect Extraction (Last Known: ~372,618 records)

| State | Jurisdiction | Records | File |
|-------|--------------|---------|------|
| FL | Escambia County | 134,056 | `fl_escambia_county_*.ndjson` |
| FL | Destin | 104,668 | `fl_destin_*.ndjson` |
| CA | Campbell | 68,729 | `ca_campbell_*.ndjson` |
| AZ | Apache Junction | 30,889 | `az_apache_junction_*.ndjson` |
| DE | Kent County | 13,369 | `de_kent_county_*.ndjson` |
| Various | Other | ~20,907 | Multiple files |

**Server Location:** `~/mgo_extraction/scrapers/output/mgo/`

### eBridge Extraction (Status Unknown)

**Server Location:** `~/ebridge_extraction/`
**Target Counties:** Florida counties via eBridge platform

---

## DATA BY PLATFORM/SOURCE

| Platform | Records Captured | Portals | Notes |
|----------|-----------------|---------|-------|
| **Florida DEP ArcGIS** | 1,900,000 | 1 | Complete statewide |
| **Delaware Socrata** | 2,339,070 | 1 | Complete statewide |
| **Vermont DEC** | 80,000+ | 1 | Complete statewide |
| **MGO Connect** | 375,713 | 12+ | Multi-state API |
| **eBridge** | 4,000+ | 2+ | Florida counties |

---

## SCRAPER INVENTORY

### Production Scrapers (45+ files)

**State-Level Scrapers:**
```
scrapers/states/vermont_dec_scraper.py      - VT statewide
scrapers/states/florida_ebridge_scraper.py  - FL counties
scrapers/states/tennessee_tdec_scraper.py   - TN statewide
scrapers/states/new_hampshire_ssb_scraper.py - NH statewide
scrapers/states/delaware_opendata_scraper.py - DE statewide
scrapers/states/minnesota_mpca_scraper.py   - MN statewide
scrapers/states/maine_septic_scraper.py     - ME statewide
```

**MGO TypeScript Scrapers:**
```
scrapers/mgo/mgo-full-scraper.ts            - API-first approach
scrapers/mgo/mgo-api-discovery.ts           - Network interception
+ 14 Texas-specific variants
```

**EnerGov Scrapers (NEW):**
```
scrapers/energov/energov-config.ts          - Portal configurations
scrapers/energov/energov-api-discovery.ts   - API discovery tool
scrapers/energov/energov-full-scraper.ts    - REST API approach
scrapers/energov/energov-playwright-scraper.ts - Browser extraction
```

---

## OUTPUT DIRECTORY STRUCTURE

```
scrapers/output/
├── arizona/           - 1 file, exploration
├── contract_counties/ - Exploration summaries
├── delaware/          - 1 file, 2.3M records (COMPLETE)
├── ebridge/           - 3 files, 4K+ records (IN PROGRESS)
├── energov/           - API discovery results
├── florida/           - 24 files, 1.9M records (COMPLETE)
├── georgia/           - 3 files, healthcare data
├── indiana/           - Exploration
├── knox_county/       - Exploration
├── maryland/          - 1 file, Montgomery County
├── mgo/               - 66+ files, 375K+ records
├── michigan/          - 21 files, partial
├── minnesota/         - 46 files, county data
├── multi_state/       - Cross-state queries
├── new_hampshire/     - Exploration
├── new_mexico/        - Exploration
├── north_carolina/    - 11 files, various
├── ohio/              - 6 files, partial
├── pennsylvania/      - 2 files, partial
├── south_carolina/    - 17 files, DHEC tracker
├── tennessee/         - 6 files, TDEC attempts
├── texas/             - 8 files, MGO data
├── vermont/           - 1 file, 80K records (COMPLETE)
└── williamson_county/ - 13 files, TX OSSF
```

---

## COMPLETE VS PARTIAL DATASETS

### COMPLETE (Statewide Coverage)

| State | Records | Confidence |
|-------|---------|------------|
| Florida | 1,900,000 | HIGH |
| Delaware | 2,339,070 | HIGH |
| Vermont | 80,000+ | HIGH |

### PARTIAL (County-Level Only)

| State | Counties Captured | Est. Remaining |
|-------|------------------|----------------|
| California | 2 (Sonoma, Campbell) | 50+ counties |
| Texas | 3 (Williamson, others) | 250+ counties |
| Florida | 4 (via eBridge/MGO) | 60+ counties |

### NOT YET CAPTURED

| State | Known Portal | Est. Records |
|-------|--------------|--------------|
| Maine | CDC Septic Plans | 100K+ |
| Rhode Island | DEM OWTS | 50K+ |
| New Mexico | NMED Finder | 200K+ |
| Oklahoma | DEQ Sewage | 100K+ |
| Maryland | MDE Portal | 150K+ |

---

## QUALITY NOTES

### Data Completeness Issues
- Florida DEP: Full statewide coverage verified
- Delaware: Full Socrata export, comprehensive
- Vermont: Batch 1 complete, additional batches may exist
- MGO: Jurisdictions vary in data completeness

### Known Gaps
- Tennessee TDEC: 403 Forbidden errors blocking access
- Minnesota MPCA: Requires business portal authentication
- California (LA/Orange): Phone request only

---

## NEXT STEPS FOR DATA COLLECTION

1. **Quick Wins:** Run existing scrapers (Maine, Minnesota)
2. **New Scrapers:** Build for Rhode Island, New Mexico, Oklahoma
3. **Platform Expansion:** EnerGov (420K+ records), SmartGov NC (80K+)
4. **County Focus:** High-population counties in captured states

---

*Last Updated: 2026-01-20*
