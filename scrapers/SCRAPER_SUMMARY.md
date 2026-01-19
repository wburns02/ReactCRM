# National Septic OCR - Scraper Summary

> **Last Updated:** 2026-01-18
> **Status:** Phase 1-3 Complete - Infrastructure Built

---

## Overview

This project catalogs and scrapes public septic permit repositories across the United States to build the NationalSepticOCR database.

## Phase Completion Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Deep National Research | ✅ Complete |
| 2 | Platform Grouping & Planning | ✅ Complete |
| 3 | Base Infrastructure | ✅ Complete |
| 4 | Scraper Development | 🔄 In Progress |
| 5 | Testing & Validation | ⏳ Pending |

---

## Research Coverage

### States Researched: 50/50

| State | Portal Type | Online Search | Status |
|-------|-------------|---------------|--------|
| AL | County Health Depts | FOIA | Documented |
| AK | DEC EDMS | ✅ Yes | Documented |
| AZ | County (Maricopa, Pima) | ✅ Yes | Documented |
| AR | County Health Units | Contact | Documented |
| CA | CIWQS + Counties | ✅ Yes | Documented |
| CO | County Health | ✅ Partial | Documented |
| CT | Town Health Depts | Contact | Documented |
| DE | DNREC Multi-portal | ✅ Yes | Documented |
| FL | eBridge/OSTDS | ✅ Yes | Documented |
| GA | County Health Depts | Contact | Documented |
| HI | DOH e-Permitting | ✅ Yes | Documented |
| ID | Health Districts | ✅ Partial | Documented |
| IL | County Health Depts | ✅ Partial | Documented |
| IN | County Health | ✅ Partial | Documented |
| IA | County Health | ✅ Partial | Documented |
| KS | County Health/P&Z | Contact | Documented |
| KY | County Health Depts | FOIA | Documented |
| LA | Parish Health/LDEQ | ✅ Yes | Documented |
| ME | State Portal | ✅ Yes | Documented |
| MD | MDE Portal + Counties | ✅ Yes | Documented |
| MA | Town BOH | Contact | Documented |
| MI | County Health | ✅ Partial | Documented |
| MN | MPCA SSTS | ✅ Yes | Documented |
| MS | MSDH | ✅ Partial | Documented |
| MO | County/DHSS | Contact | Documented |
| MT | County Health | ✅ Partial | Documented |
| NE | NDEQ Search | ✅ Yes | Documented |
| NV | NDEP + Clark County | ✅ Yes | Documented |
| NH | SSB OneStop | ✅ Yes | Documented |
| NJ | County Health | Contact | Documented |
| NM | NMED Permit Finder | ✅ Yes | Documented |
| NY | County Health | ✅ Partial | Documented |
| NC | County Health | ✅ Partial | Documented |
| ND | Local Health Units | Contact | Documented |
| OH | County Health | ✅ Partial | Documented |
| OK | DEQ Online | ✅ Yes | Documented |
| OR | DEQ Records | ✅ Partial | Documented |
| PA | Local SEOs | Contact | Documented |
| RI | DEM OWTS | ✅ Yes | Documented |
| SC | DHEC Tracker | ✅ Yes | Documented |
| SD | County Planning | Contact | Documented |
| TN | TDEC FileNet | ✅ Yes | Documented |
| TX | TCEQ + Counties | ✅ Yes | Documented |
| UT | County Health | Contact | Documented |
| VT | DEC Wastewater | ✅ Yes | Documented |
| VA | Local Health/FOIA | Contact | Documented |
| WA | County Portals | ✅ Yes | Documented |
| WV | County Health/OEHS | ✅ Partial | Documented |
| WI | County Ascent | ✅ Yes | Documented |
| WY | DEQ + Counties | ✅ Partial | Documented |

---

## Portal Platform Distribution

| Platform | Count | Scrapability |
|----------|-------|--------------|
| Custom State | 15+ | Medium-High |
| Accela | 10+ | Medium |
| EnerGov | 8+ | Medium |
| Ascent | 6+ | Medium |
| OpenGov | 5+ | High |
| FileNet | 1 | Medium |
| Open Data Portals | 2+ | Very High |

---

## Infrastructure Built

### Files Created

```
scrapers/
├── base_scraper.py           ✅ Complete
├── config.py                 ✅ Complete
├── test_all_portals.py       ✅ Complete
├── utils/
│   ├── __init__.py           ✅ Complete
│   ├── browser.py            ✅ Complete
│   └── pdf_downloader.py     ✅ Complete
├── states/
│   ├── __init__.py           ✅ Complete
│   └── vermont_dec_scraper.py ✅ Template Complete
├── platforms/
│   └── __init__.py           ✅ Complete
├── ALL_US_PORTALS.md         ✅ Complete
├── EXPANSION_PLAN.md         ✅ Complete
└── SCRAPER_SUMMARY.md        ✅ This file
```

### Key Classes & Methods

- `BaseScraper` - Abstract base class for all scrapers
- `SepticRecord` - Standard data structure for permit records
- `ScraperResult` - Result object with status and records
- `BrowserManager` - Playwright browser automation with stealth
- `download_pdf()` - PDF download utility
- `extract_pdf_text()` - PDF text extraction

---

## Estimated Coverage Potential

| Category | Count | Est. Records |
|----------|-------|--------------|
| Tier 1 Statewide Portals | 12 | 4M+ |
| Tier 2 Multi-County | 8 | 1M+ |
| Tier 3 County Portals | 50+ | 2M+ |
| **Total Potential** | **70+** | **7M+** |

---

## Scraper Implementation Status

### State Scrapers Completed

| State | Scraper | Portal | Coverage | Status |
|-------|---------|--------|----------|--------|
| VT | `VermontDECScraper` | DEC Wastewater | Statewide | ✅ Complete |
| FL | `FloridaEBridgeScraper` | eBridge OSTDS | 20+ counties | ✅ Complete |
| TN | `TennesseeTDECScraper` | TDEC FileNet | Statewide (86 counties) | ✅ Complete |

### Platform Scrapers Completed

| Platform | Scraper | Portals Configured | Status |
|----------|---------|-------------------|--------|
| Accela | `AccelaScraper` | 16 counties | ✅ Complete |

### Configured Accela Portals

- **Arizona:** Maricopa, Pima
- **California:** San Diego, Riverside, Sacramento
- **Colorado:** El Paso
- **Georgia:** Fulton, Gwinnett
- **North Carolina:** Wake, Mecklenburg
- **Texas:** Travis, Tarrant
- **Virginia:** Fairfax, Loudoun
- **Washington:** King, Pierce

### Configured Florida eBridge Counties

Hillsborough, Martin, Okeechobee, Osceola, Charlotte, Lee, Hernando,
Brevard, Volusia, Seminole, Orange, Polk, Pasco, Pinellas, Sarasota,
Manatee, Collier, Palm Beach, Broward, Miami-Dade

## Next Steps

1. **Additional State Scrapers**
   - [ ] Delaware DNREC
   - [ ] New Mexico NMED
   - [ ] South Carolina DHEC
   - [ ] Rhode Island DEM

2. **Additional Platform Scrapers**
   - [ ] EnerGov generic scraper
   - [ ] Ascent (Wisconsin) scraper
   - [ ] OpenGov platform scraper

3. **Testing Phase**
   - [ ] Run `test_all_portals.py`
   - [ ] Achieve 15+ records per scraper
   - [ ] Document blocked/login-required portals

4. **Coverage Mapping**
   - [ ] Generate state-by-state coverage map
   - [ ] Calculate total accessible records
   - [ ] Identify gaps requiring manual access

---

## Technical Notes

### Dependencies Required

```
pip install requests beautifulsoup4 playwright
playwright install chromium

# Optional for PDF processing
pip install PyPDF2 pdfplumber
```

### Rate Limiting

All scrapers implement:
- Configurable request delays (default 1s)
- Exponential backoff on errors
- Maximum retry limits
- Random jitter to appear human-like

### Data Storage

Records are stored in JSON format with:
- Standard `SepticRecord` schema
- ISO timestamp for scraped_at
- Raw data preservation
- PDF URLs for document retrieval

---

## Legal & Ethical Considerations

- **Public Records Only**: All data comes from publicly accessible government portals
- **No Private Logins**: No bypassing of authentication systems
- **Respectful Scraping**: Rate limiting and delays to avoid server overload
- **robots.txt Compliance**: Respect portal restrictions where specified
