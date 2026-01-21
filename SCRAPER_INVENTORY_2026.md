# Scraper Inventory Report

> **Generated:** January 21, 2026
> **Time Window:** Last 48 hours (Jan 19-21, 2026)
> **Total Scrapers Identified:** 52

---

## Summary

| Category | Count |
|----------|-------|
| **Active/In-Progress** | 3 |
| **Completed (48h)** | 15 |
| **Available (Not Run)** | 34 |
| **Total Scrapers** | 52 |

---

## ACTIVE SCRAPERS (Currently Running/In-Progress)

### 1. MGO Connect Full Extraction
| Attribute | Value |
|-----------|-------|
| **File** | `scrapers/mgo/mgo-full-scraper.ts` |
| **Status** | **ACTIVE** |
| **Last Activity** | 2026-01-21 05:50 UTC |
| **Records Extracted** | 1,190,754 |
| **Jurisdictions Completed** | 34 |
| **Current Jurisdiction ID** | 275 |
| **Output Directory** | `scrapers/output/mgo/full_extraction/` |

**Recent Extractions (Jan 21):**
- FL Indian River County: 366.8 MB
- FL Parkland: 187.0 MB
- FL Pensacola: 60.4 MB
- FL Orange County Public Schools: 44.7 MB
- FL North Palm Beach: 7.3 MB
- FL Palm Beach Shores: 1.7 MB
- FL Manalapan: 0.8 MB

---

### 2. Comal County TX (Server-Side)
| Attribute | Value |
|-----------|-------|
| **File** | `scrapers/states/texas/comal_county_scraper.py` |
| **Status** | **IN_PROGRESS (Server)** |
| **Server** | 100.85.99.69 |
| **Started** | 2026-01-20 15:05 |
| **Est. Records** | 119,000+ |
| **Output** | `~/scrapers/output/texas/comal_county/` |

---

### 3. OpenGov Metadata Scraper
| Attribute | Value |
|-----------|-------|
| **File** | `scrapers/opengov/opengov-scraper.ts` |
| **Status** | **IDLE (Checkpoint Available)** |
| **Last Activity** | 2026-01-20 21:27 UTC |
| **Current Jurisdiction** | brownsburgin |
| **Records** | 0 (metadata collection) |

---

## COMPLETED SCRAPERS (Last 48 Hours)

### Statewide Extractions

| # | Scraper | File | Completed | Records | Output |
|---|---------|------|-----------|---------|--------|
| 1 | **Vermont DEC** | `states/vermont_dec_scraper.py` | Jan 19 10:20 | 80,156 | `output/vermont/` |
| 2 | **Delaware Open Data** | `states/delaware_opendata_scraper.py` | Jan 19 09:42 | 129,948 | `output/delaware/` |
| 3 | **Florida DEP ArcGIS** | `multi_state_arcgis_scraper.py` | Jan 19 | 1,939,334 | `output/florida/` |

### Tennessee TDEC Extractions

| # | Scraper | File | Completed | Records | Output |
|---|---------|------|-----------|---------|--------|
| 4 | **TN TDEC Recursive** | `states/tennessee/tdec_recursive_scraper.py` | Jan 20 | 114,354 | `output/tennessee/` |

### MGO Connect Jurisdictions (Jan 20-21)

| # | Jurisdiction | State | Completed | Records | File Size |
|---|--------------|-------|-----------|---------|-----------|
| 5 | Escambia County | FL | Jan 20 15:02 | 380,390 | 411 MB |
| 6 | Destin | FL | Jan 20 08:42 | 104,668 | 126 MB |
| 7 | Campbell | CA | Jan 20 06:56 | 68,729 | 80 MB |
| 8 | Fort Walton Beach | FL | Jan 20 15:36 | 39,588 | 48 MB |
| 9 | Indian River County | FL | Jan 21 00:25 | 318,666 | 367 MB |
| 10 | Parkland | FL | Jan 21 05:50 | 143,589 | 187 MB |

### EnerGov Platform Extractions (Jan 20)

| # | Jurisdiction | State | Completed | Records | Notes |
|---|--------------|-------|-----------|---------|-------|
| 11 | Wake County | NC | Jan 20 20:00 | 4,839 | 501K total available |
| 12 | Doral | FL | Jan 20 20:30 | 4,887 | 163K total available |
| 13 | New Smyrna Beach | FL | Jan 20 21:00 | 9,348 | 35K total |
| 14 | Carson | CA | Jan 20 22:33 | 9,178 | Complete |
| 15 | Albuquerque | NM | Jan 20 22:26 | 4,970 | 467K total available |

**EnerGov Scraper:** `scrapers/energov/energov-playwright-scraper.ts`
**Total EnerGov Records:** 33,222

### Williamson County TX (Jan 20)

| # | Scraper | File | Completed | Records | Output |
|---|---------|------|-----------|---------|--------|
| 16 | **Williamson OSSF** | `mgo/mgo-full-scraper.ts` | Jan 20 05:17 | 3,095 | `output/mgo/` |
| 17 | **Williamson Properties** | `williamson/arcgis_property_scraper.py` | Jan 20 17:12 | 100,369 | `output/williamson_county/` |
| 18 | **Williamson Matching** | `williamson/improved_permit_linking.py` | Jan 20 17:48 | 7,524 | `output/williamson_county/` |

### eBridge FL Counties (Jan 20)

| # | County | Records | File |
|---|--------|---------|------|
| 19 | Hernando | 1,000 | `output/ebridge/fl_hernando_permits_*.ndjson` |
| 20 | Hillsborough | 1,000 | `output/ebridge/fl_hillsborough_permits_*.ndjson` |
| 21 | Osceola | 1,000 | `output/ebridge/fl_osceola_permits_*.ndjson` |
| 22 | Pasco | 1,000 | `output/ebridge/fl_pasco_permits_*.ndjson` |
| 23 | Pinellas | 1,000 | `output/ebridge/fl_pinellas_permits_*.ndjson` |
| 24 | Walton | 81 | `output/ebridge/fl_walton_permits_*.ndjson` |
| 25 | Okeechobee | 8 | `output/ebridge/fl_okeechobee_permits_*.ndjson` |

**eBridge Scraper:** `scrapers/ebridge/ebridge-playwright-scraper.py`
**Total eBridge Records:** 5,089

---

## FAILED/BLOCKED SCRAPERS (Last 48 Hours)

| Scraper | Portal | Date | Error | Notes |
|---------|--------|------|-------|-------|
| EnerGov | Hartford CT | Jan 20 22:00 | DNS not resolving | Portal may be down |
| EnerGov | Hayward CA | Jan 20 22:00 | No search input | Different UI structure |
| EnerGov | Yuba County CA | Jan 20 22:00 | No search input | Different UI structure |
| EnerGov | Atlanta GA | Jan 20 | Access Denied | CDN blocked |
| TDEC | Tennessee Metro | Jan 19 | 403 Forbidden | FileNet URLs blocked |

---

## AVAILABLE SCRAPERS (Ready to Run)

### State-Level Scrapers

| # | State | Scraper | File | Est. Records | Status |
|---|-------|---------|------|--------------|--------|
| 1 | Florida | eBridge Full | `ebridge/ebridge-full-scraper.py` | 500,000+ | Ready |
| 2 | Minnesota | MPCA | `states/minnesota_mpca_scraper.py` | 600,000+ | Ready |
| 3 | Maine | CDC Septic | `states/maine_septic_scraper.py` | 100,000+ | Needs portal analysis |
| 4 | New Hampshire | DES OneStop | `states/new_hampshire_ssb_scraper.py` | 140,000+ | Needs tuning |
| 5 | Tennessee | TDEC FileNet | `states/tennessee/tdec_filenet_scraper.py` | 500,000+ | Blocked (403) |
| 6 | Michigan | EGLE Hub | `michigan_egle_hub_scraper.py` | 200,000+ | Ready |
| 7 | Georgia | Septic | `georgia_septic_scraper.py` | 100,000+ | Ready |
| 8 | South Carolina | DHEC | `south_carolina_dhec_scraper.py` | 200,000+ | Ready |
| 9 | Arizona | Septic | `arizona_septic_scraper.py` | 300,000+ | Ready |
| 10 | New Mexico | NMED | `new_mexico_nmed_scraper.py` | 200,000+ | Ready |
| 11 | New Hampshire | DES | `new_hampshire_des_scraper.py` | 140,000+ | Ready |

### County-Level Scrapers

| # | State | County | File | Est. Records | Status |
|---|-------|--------|------|--------------|--------|
| 12 | NC | CDPEHS | `states/north_carolina/cdpehs_scraper.py` | 50,000+ | Ready |
| 13 | NC | SmartGov | `states/north_carolina/smartgov_nc_scraper.py` | 80,000+ | Ready |
| 14 | NC | Buncombe Accela | `states/north_carolina/accela_buncombe_scraper.py` | 30,000+ | Ready |
| 15 | NC | DEQ | `states/north_carolina/nc_deq_scraper.py` | 50,000+ | Ready |
| 16 | NC | Avery County | `states/north_carolina/avery_county_scraper.py` | 10,000+ | Ready |
| 17 | TX | Travis County | `states/texas/travis_county_scraper.py` | 50,000+ | Ready |
| 18 | TX | Travis MGO | `states/texas/travis_mgo_scraper.py` | 50,000+ | Ready |
| 19 | TX | MGO v2-v5 | `states/texas/mgo_v*.py` | Variable | Development |
| 20 | MI | EGLE Septic | `states/michigan/egle_septic_scraper.py` | 100,000+ | Ready |
| 21 | WA | King County | `states/washington/king_county_scraper.py` | 50,000+ | Ready |
| 22 | OH | Hamilton | `states/ohio/hamilton_county_scraper.py` | 30,000+ | Ready |
| 23 | MD | Montgomery | `states/maryland/montgomery_county_scraper.py` | 20,000+ | Ready |
| 24 | PA | DEP | `states/pennsylvania/pa_dep_scraper.py` | 50,000+ | Ready |
| 25 | IN | Septic | `states/indiana/indiana_septic_scraper.py` | 30,000+ | Ready |
| 26 | WI | POWTS | `states/wisconsin/wisconsin_powts_scraper.py` | 50,000+ | Ready |

### Platform Scrapers

| # | Platform | File | Portals | Est. Records | Status |
|---|----------|------|---------|--------------|--------|
| 27 | Accela | `platforms/accela_scraper.py` | 20+ | 500,000+ | Ready |
| 28 | EnerGov Full | `energov/energov-full-scraper.ts` | 12 | 480,000+ | Ready |
| 29 | MGO API | `mgo/mgo-api-scraper.ts` | 30+ | 500,000+ | Ready |
| 30 | MGO Priority | `mgo/mgo-priority-scraper.ts` | 10 | 200,000+ | Ready |
| 31 | eBridge HTTP | `ebridge/ebridge-http-scraper.py` | 40+ | 500,000+ | Ready |

### Specialized Scrapers

| # | Target | File | Est. Records | Status |
|---|--------|------|--------------|--------|
| 32 | Knox County | `decodo/knox_county_scraper.py` | 20,000+ | Ready |
| 33 | Williamson IDT | `decodo/williamson_idt_scraper.py` | 25,000+ | Ready |
| 34 | FL WLMI | `florida/flwmi-scraper.py` | 100,000+ | Ready |
| 35 | Multi-State ArcGIS | `multi_state_arcgis_scraper.py` | 1,000,000+ | Ready |

---

## SCRAPER FILE INVENTORY

### Root Level (`scrapers/`)

```
base_scraper.py                  - Base class for all scrapers
multi_state_arcgis_scraper.py    - Multi-state ArcGIS REST API
minnesota_mpca_scraper.py        - Minnesota MPCA portal
michigan_egle_hub_scraper.py     - Michigan EGLE hub
new_mexico_nmed_scraper.py       - New Mexico NMED
south_carolina_dhec_scraper.py   - South Carolina DHEC tracker
georgia_septic_scraper.py        - Georgia septic data
arizona_septic_scraper.py        - Arizona parcel/septic
new_hampshire_des_scraper.py     - New Hampshire DES
unified-data-processor.py        - Data unification utility
```

### By State (`scrapers/states/`)

```
states/
├── florida_ebridge_scraper.py
├── tennessee_tdec_scraper.py
├── vermont_dec_scraper.py
├── new_hampshire_ssb_scraper.py
├── delaware_opendata_scraper.py
├── minnesota_mpca_scraper.py
├── maine_septic_scraper.py
├── texas/
│   ├── mgo_texas_scraper.py
│   ├── mgo_recursive_scraper.py
│   ├── mgo_v2_scraper.py
│   ├── mgo_v3_scraper.py
│   ├── mgo_v4_scraper.py
│   ├── mgo_v5_scraper.py
│   ├── travis_county_scraper.py
│   ├── travis_mgo_scraper.py
│   └── comal_county_scraper.py
├── north_carolina/
│   ├── cdpehs_scraper.py
│   ├── smartgov_nc_scraper.py
│   ├── accela_buncombe_scraper.py
│   ├── nc_deq_scraper.py
│   └── avery_county_scraper.py
├── tennessee/
│   ├── tdec_filenet_scraper.py
│   └── tdec_recursive_scraper.py
├── michigan/
│   └── egle_septic_scraper.py
├── washington/
│   └── king_county_scraper.py
├── ohio/
│   └── hamilton_county_scraper.py
├── maryland/
│   └── montgomery_county_scraper.py
├── pennsylvania/
│   └── pa_dep_scraper.py
├── indiana/
│   └── indiana_septic_scraper.py
└── wisconsin/
    └── wisconsin_powts_scraper.py
```

### By Platform

```
platforms/
└── accela_scraper.py

mgo/
├── mgo-api-scraper.ts
├── mgo-full-scraper.ts
└── mgo-priority-scraper.ts

energov/
├── energov-full-scraper.ts
└── energov-playwright-scraper.ts

ebridge/
├── ebridge-full-scraper.py
├── ebridge-playwright-scraper.py
└── ebridge-http-scraper.py

opengov/
└── opengov-scraper.ts

decodo/
├── knox_county_scraper.py
└── williamson_idt_scraper.py

williamson/
├── arcgis_property_scraper.py
├── improved_permit_linking.py
└── ingest_all_properties.py

florida/
└── flwmi-scraper.py
```

---

## LOG FILES (Last 48 Hours)

| Log File | Last Modified | Size | Scraper |
|----------|---------------|------|---------|
| `williamson/williamson_arcgis_scraper.log` | Jan 20 18:21 | 13.7 KB | Williamson ArcGIS |
| `output/ebridge/playwright_scraper.log` | Jan 20 11:14 | 47.7 KB | eBridge Playwright |
| `output/ebridge/scraper.log` | Jan 20 08:06 | 11.7 KB | eBridge HTTP |
| `decodo/williamson_scraper.log` | Jan 20 07:56 | 84.4 KB | Williamson IDT |
| `decodo/knox_county_scraper.log` | Jan 20 07:09 | 3.3 KB | Knox County |
| `decodo/decodo_proxy_scraper.log` | Jan 20 06:53 | 3.8 KB | Decodo Proxy |

---

## CHECKPOINT FILES (Active/Recent)

| Checkpoint | Last Updated | Records | Status |
|------------|--------------|---------|--------|
| `mgo/checkpoint.json` | Jan 21 05:50 | 1,190,754 | **ACTIVE** |
| `energov/checkpoint.json` | Jan 20 22:33 | 28,252 | Complete |
| `opengov/checkpoint.json` | Jan 20 21:27 | 0 | Idle |
| `ebridge/checkpoint.json` | Jan 20 14:06 | 0 | Complete |

---

## EXTRACTION SUMMARY (Last 48 Hours)

| Source | Records | Files | Data Size |
|--------|---------|-------|-----------|
| **MGO Connect** | 1,190,754 | 34+ | ~1.5 GB |
| **Florida DEP** | 1,939,334 | 1 | 633 MB |
| **Tennessee TDEC** | 114,354 | 6 | 124 MB |
| **Delaware Open Data** | 129,948 | 1 | 84 MB |
| **Vermont DEC** | 80,156 | 1 | 21 MB |
| **EnerGov** | 33,222 | 5 | 84 MB |
| **Williamson Properties** | 100,369 | 25+ | 3.2 GB |
| **eBridge FL** | 5,089 | 7 | 12 MB |
| **TOTAL** | **~3,593,226** | **80+** | **~5.7 GB** |

---

*Report generated: January 21, 2026*
