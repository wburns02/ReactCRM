# NationalSepticOCR Expansion Plan

> **Version:** 1.0
> **Created:** 2026-01-18
> **Purpose:** Scraper development strategy for nationwide septic permit coverage

---

## Architecture Overview

```
scrapers/
├── base_scraper.py              # Abstract base class for all scrapers
├── config.py                    # Configuration and constants
├── utils/
│   ├── __init__.py
│   ├── browser.py               # Playwright browser utilities
│   ├── pdf_downloader.py        # PDF handling utilities
│   └── geocoding.py             # Address/parcel lookups
├── platforms/
│   ├── __init__.py
│   ├── accela_scraper.py        # Accela Citizen Access
│   ├── energov_scraper.py       # Tyler EnerGov CSS
│   ├── ascent_scraper.py        # Ascent Land Records
│   ├── opengov_scraper.py       # OpenGov portals
│   ├── mgo_scraper.py           # MyGovernmentOnline
│   └── custom_state_scraper.py  # Generic state portal handler
├── states/
│   ├── florida_ostds_scraper.py
│   ├── maine_septic_scraper.py
│   ├── oregon_deq_scraper.py
│   ├── rhode_island_owts_scraper.py
│   ├── tennessee_tdec_scraper.py
│   ├── minnesota_ssts_scraper.py
│   ├── new_mexico_nmed_scraper.py
│   ├── vermont_dec_scraper.py
│   ├── new_hampshire_ssb_scraper.py
│   ├── delaware_dnrec_scraper.py
│   ├── alaska_edms_scraper.py
│   ├── south_carolina_dhec_scraper.py
│   ├── texas_tceq_scraper.py
│   ├── california_ciwqs_scraper.py
│   ├── maryland_mde_scraper.py
│   ├── nebraska_ndeq_scraper.py
│   └── oklahoma_deq_scraper.py
├── counties/
│   ├── az_maricopa_scraper.py
│   ├── az_pima_scraper.py
│   ├── co_jefferson_scraper.py
│   ├── co_larimer_scraper.py
│   ├── id_panhandle_scraper.py
│   ├── in_hamilton_scraper.py
│   ├── mi_washtenaw_scraper.py
│   ├── mt_gallatin_scraper.py
│   ├── nv_clark_scraper.py
│   ├── nc_henderson_scraper.py
│   ├── nc_iredell_scraper.py
│   ├── oh_clermont_scraper.py
│   ├── wa_thurston_scraper.py
│   ├── wa_whatcom_scraper.py
│   ├── wa_clallam_scraper.py
│   └── wa_king_scraper.py
├── test_samples/                # 15+ records per scraper
│   └── [scraper_name]/
│       ├── records.json
│       └── sample_pdfs/
├── test_all_portals.py          # Master test runner
├── ALL_US_PORTALS.md            # Portal catalog
├── EXPANSION_PLAN.md            # This file
└── SCRAPER_SUMMARY.md           # Results summary
```

---

## Platform-Grouped Development Strategy

### Group 1: Custom State Portals (Highest Priority)
**Estimated New Files:** 17 scrapers

These are state-managed databases with unique interfaces requiring individual scrapers.

| Priority | State | Portal | Difficulty | Est. Records |
|----------|-------|--------|------------|--------------|
| P1 | Florida | eBridge/OSTDS | Medium | 2M+ |
| P1 | Minnesota | MPCA SSTS | Medium | 600K+ |
| P1 | Tennessee | TDEC FileNet | Medium | 500K+ |
| P1 | Texas | TCEQ + Counties | High | 1M+ |
| P2 | Vermont | DEC WWDocs | Low | 300K+ |
| P2 | New Hampshire | SSB OneStop | Low | 140K+ |
| P2 | Delaware | DNREC Multi | Low | 100K+ |
| P2 | New Mexico | NMED Permit Finder | Low | 200K+ |
| P3 | Maine | Septic Plans | Low | 100K+ |
| P3 | Rhode Island | DEM OWTS | Low | 50K+ |
| P3 | Oregon | DEQ Records | Low | 30K+ |
| P3 | South Carolina | DHEC Tracker | Medium | 200K+ |
| P3 | California | CIWQS | High | 500K+ |
| P3 | Maryland | MDE Portal | Medium | 150K+ |
| P3 | Nebraska | NDEQ Search | Low | 50K+ |
| P3 | Oklahoma | DEQ Online | Low | 100K+ |
| P3 | Alaska | DEC EDMS | Medium | 50K+ |

### Group 2: Accela Citizen Access (10+ counties)
**Estimated New Files:** 1 generic + 10 county configs

```python
# platforms/accela_scraper.py
class AccelaScraper(BaseScraper):
    """Generic Accela Citizen Access scraper.

    Supports:
    - AZ: Maricopa, Pima
    - WA: Cowlitz
    - CO: Boulder
    - NV: Clark
    - OR: Clackamas
    - MD: Howard
    - CA: Contra Costa
    """

    def __init__(self, county_config: AccelaConfig):
        self.base_url = county_config.base_url
        self.permit_types = county_config.permit_types
```

### Group 3: EnerGov Citizen Self Service (8+ cities/counties)
**Estimated New Files:** 1 generic + 8 configs

```python
# platforms/energov_scraper.py
class EnerGovScraper(BaseScraper):
    """Generic EnerGov CSS scraper.

    Supports:
    - SC: Pickens, West Columbia
    - FL: Cape Coral
    - TX: Mesquite, Princeton
    """
```

### Group 4: Ascent Land Records (6+ WI counties)
**Estimated New Files:** 1 generic + 6 configs

```python
# platforms/ascent_scraper.py
class AscentScraper(BaseScraper):
    """Generic Ascent Land Records scraper for Wisconsin counties.

    Supports:
    - WI: Washington, St. Croix, Vilas, Marathon, Fond du Lac, Polk
    """
```

### Group 5: OpenGov Portals
**Estimated New Files:** 1 generic + 5 configs

```python
# platforms/opengov_scraper.py
class OpenGovScraper(BaseScraper):
    """Generic OpenGov permit portal scraper.

    Supports:
    - IA: Polk
    - MD: Talbot
    """
```

---

## Development Phases

### Phase 1: Foundation (Week 1)
- [ ] Create `base_scraper.py` with abstract methods
- [ ] Create `utils/browser.py` with Playwright setup
- [ ] Create `utils/pdf_downloader.py`
- [ ] Create `config.py` with test addresses/parcels
- [ ] Create `test_all_portals.py` framework

### Phase 2: State Portals (Weeks 2-3)
- [ ] florida_ostds_scraper.py
- [ ] minnesota_ssts_scraper.py
- [ ] tennessee_tdec_scraper.py
- [ ] vermont_dec_scraper.py
- [ ] new_hampshire_ssb_scraper.py
- [ ] delaware_dnrec_scraper.py
- [ ] new_mexico_nmed_scraper.py
- [ ] maine_septic_scraper.py
- [ ] rhode_island_owts_scraper.py
- [ ] south_carolina_dhec_scraper.py

### Phase 3: Platform Generics (Week 4)
- [ ] accela_scraper.py + county configs
- [ ] energov_scraper.py + configs
- [ ] ascent_scraper.py + WI county configs
- [ ] opengov_scraper.py + configs

### Phase 4: High-Volume Counties (Week 5)
- [ ] AZ: Maricopa, Pima
- [ ] WA: King, Thurston, Whatcom
- [ ] CO: Jefferson, Larimer
- [ ] ID: Panhandle HD
- [ ] NC: Henderson, Iredell

### Phase 5: Testing & Coverage (Week 6)
- [ ] Run all scrapers with test_all_portals.py
- [ ] Achieve 15+ records per scraper
- [ ] Generate SCRAPER_SUMMARY.md
- [ ] Generate NATIONAL_COVERAGE_MAP.md

---

## Base Scraper Interface

```python
# scrapers/base_scraper.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime

@dataclass
class SepticRecord:
    """Standard septic record data structure."""
    permit_number: str
    address: str
    parcel_number: Optional[str] = None
    owner_name: Optional[str] = None
    install_date: Optional[datetime] = None
    system_type: Optional[str] = None
    tank_size: Optional[int] = None
    drainfield_size: Optional[int] = None
    county: Optional[str] = None
    state: str = ""
    pdf_url: Optional[str] = None
    raw_data: dict = None

class BaseScraper(ABC):
    """Abstract base class for all septic permit scrapers."""

    def __init__(self, use_playwright: bool = False):
        self.use_playwright = use_playwright
        self.browser = None
        self.results: List[SepticRecord] = []

    @abstractmethod
    def search_by_address(self, address: str) -> List[SepticRecord]:
        """Search for permits by address."""
        pass

    @abstractmethod
    def search_by_parcel(self, parcel: str) -> List[SepticRecord]:
        """Search for permits by parcel number."""
        pass

    def search_by_permit(self, permit_number: str) -> List[SepticRecord]:
        """Search for permits by permit number (optional)."""
        raise NotImplementedError

    def download_pdf(self, record: SepticRecord, output_dir: str) -> str:
        """Download PDF for a record if available."""
        pass

    def run_test(self, test_queries: List[str], min_records: int = 15) -> dict:
        """Run test suite with sample queries."""
        pass
```

---

## Test Configuration

```python
# scrapers/config.py

TEST_ADDRESSES = {
    "FL": [
        "123 Main St, Orlando, FL",
        "456 Oak Ave, Tampa, FL",
        # ... more addresses
    ],
    "MN": [
        "100 Lake Rd, Minneapolis, MN",
        # ...
    ],
    # ... all states
}

TEST_PARCELS = {
    "AZ_Maricopa": [
        "123-45-678",
        # ...
    ],
    # ... all counties
}

PLATFORM_CONFIGS = {
    "accela": {
        "maricopa": {
            "base_url": "https://accela.maricopa.gov/CitizenAccessMCESD/",
            "permit_module": "Environmental",
        },
        # ...
    },
    # ...
}
```

---

## Scraper Difficulty Assessment

| Difficulty | Characteristics | Examples |
|------------|----------------|----------|
| **Low** | Simple HTML, no JS, direct URLs | Maine, Vermont, NH |
| **Medium** | Requires Playwright, form submission | Florida, TN, SC |
| **High** | Anti-bot, CAPTCHA, complex navigation | CA CIWQS, some Accela |
| **Very High** | Login required, heavy JS, rate limits | Some county systems |

---

## Success Metrics

For each scraper:
- [ ] Successfully retrieves 15+ unique records
- [ ] Extracts: permit #, address, date, system type
- [ ] Downloads PDFs when available
- [ ] Handles errors gracefully
- [ ] Rate limiting/retry logic works
- [ ] Results saved to JSON

---

## Estimated File Count

| Category | Files |
|----------|-------|
| Base/Utils | 5 |
| Platform Scrapers | 5 |
| State Scrapers | 17 |
| County Scrapers | 16 |
| Tests/Config | 3 |
| Documentation | 3 |
| **Total** | **49** |

---

## Risk Mitigation

1. **Anti-bot Detection**
   - Use Playwright stealth mode
   - Rotate user agents
   - Implement random delays
   - Respect robots.txt where applicable

2. **CAPTCHA Encounters**
   - Document in scraper output
   - Implement manual bypass option
   - Consider CAPTCHA solving services for high-value portals

3. **Portal Changes**
   - Version scrapers with dates
   - Implement health checks
   - Alert on scraper failures

4. **Rate Limiting**
   - Conservative default delays
   - Exponential backoff
   - Per-portal rate limit configs
