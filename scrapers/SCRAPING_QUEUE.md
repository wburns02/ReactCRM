# National Septic OCR - Scraping Queue

> **Last Updated:** 2026-01-19
> **Phase:** 1 - Metadata Collection
> **Current Total:** 210,104 records

---

## CAPTURED (Phase 1 Complete)

| Priority | State | Portal | Records | Status | Notes |
|----------|-------|--------|---------|--------|-------|
| **P1** | VT | Vermont DEC Wastewater | **80,156** | CAPTURED | 54 search terms, vt_full_extraction.json |
| **P2** | DE | Delaware Open Data | **129,948** | CAPTURED | Socrata API download, de_permits_full.json |

**Subtotal: 210,104 records**

---

## READY TO SCRAPE (Scrapers Exist)

| Priority | State | Portal | Est. Records | Scraper | Blocker | Action Needed |
|----------|-------|--------|--------------|---------|---------|---------------|
| **P3** | FL | eBridge (20 counties) | 2,000,000+ | `florida_ebridge_scraper.py` | Login credentials | Verify public credentials per county |
| **P4** | NH | DES OneStop SSB | 140,000+ | `new_hampshire_ssb_scraper.py` | Parser tuning | Fix result parsing |
| **P5** | ME | CDC Septic Plans | 100,000+ | `maine_septic_scraper.py` | Portal analysis | Map search form fields |
| **P6** | - | Accela Counties (16+) | 500,000+ | `accela_scraper.py` | Config per county | Add county configs |

---

## NEEDS SCRAPER DEVELOPMENT

### Tier 1: Statewide Portals (High Volume)

| Priority | State | Portal | URL | Est. Records | Platform | Notes |
|----------|-------|--------|-----|--------------|----------|-------|
| **P7** | TN | TDEC FileNet | `tdec.tn.gov/document-viewer/search/stp` | 500,000+ | FileNet | 403 blocked - try alt URL |
| **P8** | MN | MPCA SSTS | County-level | 600,000+ | County GIS | State portal is for businesses only |
| **P9** | RI | DEM OWTS | `ri.gov/dem/owts` | 50,000+ | Custom | Since 1968 |
| **P10** | NM | NMED Liquid Waste | `lwop.waste.web.env.nm.gov/wwtspf/` | 200,000+ | Custom | Except Bernalillo |
| **P11** | SC | DHEC Env Tracker | `apps.dhec.sc.gov/Environment/...` | 200,000+ | Custom | 2yr history, multi-county |
| **P12** | OK | DEQ Sewage | `applications.deq.ok.gov/sewagepermit/` | 100,000+ | Custom | DEQ statewide |
| **P13** | AK | DEC EDMS | `dec.alaska.gov/water/edms` | 50,000+ | EDMS | |
| **P14** | MD | MDE Wastewater | `mes-mde.mde.state.md.us/WastewaterPermitPortal/` | 150,000+ | Custom | |
| **P15** | HI | DOH ePermit | `eha-cloud.doh.hawaii.gov/epermit/` | 50,000+ | Custom | TMK search |
| **P16** | NE | NDEQ Search | `deq-iis.ne.gov/zs/permit/main_search.php` | 50,000+ | Custom | |

### Tier 2: High-Volume County Clusters

| Priority | State | County/Area | Portal | Est. Records | Platform |
|----------|-------|-------------|--------|--------------|----------|
| **P17** | AZ | Maricopa | Accela | 200,000+ | Accela |
| **P18** | AZ | Pima | Custom | 100,000+ | Custom |
| **P19** | TX | Harris | ePermits | 100,000+ | Custom |
| **P20** | TX | Travis | MGO | 50,000+ | MGO |
| **P21** | CA | San Diego | DocLibrary | 100,000+ | Custom |
| **P22** | CA | LA County | DPH | 200,000+ | Custom |
| **P23** | NV | Clark | Accela | 100,000+ | Accela |
| **P24** | WA | King | DPH | 50,000+ | Custom |

### Tier 3: Platform-Based Clusters

| Platform | Counties | Est. Records | Generic Scraper |
|----------|----------|--------------|-----------------|
| **Accela** | AZ Maricopa, NV Clark, CA Contra Costa, CO Boulder, MD Howard, OR Clackamas | 500,000+ | `accela_scraper.py` (needs configs) |
| **EnerGov** | FL Cape Coral, TX Mesquite, MI Oakland, SC Pickens | 100,000+ | NEEDS DEVELOPMENT |
| **MGO** | TX Travis, TX Bell, TX Collin, TX Hays | 100,000+ | NEEDS DEVELOPMENT |
| **Ascent** | WI (6 counties) | 100,000+ | NEEDS DEVELOPMENT |
| **BS&A** | MI Grand Traverse + others | 50,000+ | NEEDS DEVELOPMENT |

---

## BLOCKED / LOW PRIORITY

| State | Portal | Reason | Alternative |
|-------|--------|--------|-------------|
| TN | TDEC FileNet | 403 Forbidden | Try county-level access |
| MN | MPCA SSTS | Business portal only | County GIS systems |
| CA | Los Angeles | Phone request only | (562) 345-3404 |
| CA | Orange | Phone request only | (714) 433-6000 |

---

## ESTIMATED TOTAL ACCESSIBLE

| Category | Portals | Est. Records |
|----------|---------|--------------|
| **CAPTURED** | 2 | 210,104 |
| **Ready (blocked)** | 4 | 2,740,000+ |
| **Needs Scraper** | 20+ | 2,500,000+ |
| **Platform Clusters** | 30+ | 850,000+ |
| **TOTAL ACCESSIBLE** | **56+** | **6,300,000+** |

---

## NEXT ACTIONS

### Immediate (Today)

1. [ ] Fix Florida eBridge credentials - huge volume (2M+)
2. [ ] Fix New Hampshire parser - known scraper, parsing issue
3. [ ] Analyze Maine portal structure - scraper exists
4. [ ] Try Tennessee alternate URLs

### This Week

1. [ ] Build EnerGov generic scraper
2. [ ] Build MGO generic scraper
3. [ ] Add Accela county configs (AZ, NV, CA, CO, MD, OR)
4. [ ] Research Minnesota county GIS systems

### Long Term

1. [ ] California county outreach (phone/FOIA)
2. [ ] Wisconsin Ascent platform scraper
3. [ ] Michigan BS&A platform scraper

---

## INGESTION PIPELINE

**Server:** `100.85.99.69` (88 cores, 755GB RAM)

**Data Location:**
```
~/scrapers/output/
├── vermont/vt_full_extraction.json (80,156 records)
├── delaware/de_permits_full.json (129,948 records)
└── [new_state]/[portal]_extraction.json
```

**Ingestion Endpoint:**
```bash
POST /api/v2/permits/ingest
Content-Type: application/json
{
  "source_portal_code": "VT_DEC",
  "permits": [...]
}
```

---

*Updated by Ralph Wiggum Assault System*
