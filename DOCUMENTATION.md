# Tennessee Septic CRM Integration - Project Documentation

> **Last Updated:** January 20, 2026
> **Status:** Data Collection Phase (32% complete)
> **Target:** 850,000+ Tennessee septic/permit records

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Current Status](#current-status)
3. [Architecture](#architecture)
4. [Data Sources](#data-sources)
5. [Scraper Infrastructure](#scraper-infrastructure)
6. [Data Schema](#data-schema)
7. [CRM Integration Plan](#crm-integration-plan)
8. [Deployment](#deployment)
9. [Known Issues & Workarounds](#known-issues--workarounds)
10. [Credentials & Configuration](#credentials--configuration)

---

## Project Overview

### Goal
Collect comprehensive Tennessee septic system permit data and integrate it into the ECBTX CRM system for business development and service tracking.

### Scope
- **Primary Source:** TN TDEC FileNet (86 counties)
- **Contract Counties:** 9 counties with separate portals (not in TDEC FileNet)
- **Target Records:** 850,000+ permits
- **Date Range:** Historical data back to system inception

### Contract Counties (Separate from TDEC FileNet)
| County | Portal | Status |
|--------|--------|--------|
| Williamson | IDT Plans | Complete (13,141 records) |
| Knox | EPW Permit Submit | Requires login |
| Blount | TBD | Not started |
| Davidson | TBD | Not started |
| Hamilton | TBD | Not started |
| Jefferson | TBD | Not started |
| Madison | TBD | Not started |
| Sevier | TBD | Not started |
| Shelby | TBD | Not started |

---

## Current Status

### TN TDEC Scraper (Main)
| Metric | Value |
|--------|-------|
| Status | **RUNNING** on server |
| Counties Completed | 28 of 87 (32%) |
| Total Records | 226,691+ |
| Server | 100.85.99.69 (Tailscale) |
| Process | nohup background process |

### Checkpoint Files on Server
```
~/scrapers/output/tennessee/
├── tn_recursive_checkpoint_15.json (114,354 records)
├── tn_recursive_checkpoint_18.json (144,670 records)
├── tn_recursive_checkpoint_21.json (174,660 records)
├── tn_recursive_checkpoint_24.json (208,708 records)
├── tn_recursive_checkpoint_27.json (226,691 records)
└── tn_tdec_recursive_all.json (final output when complete)
```

### Williamson County
| Metric | Value |
|--------|-------|
| Status | **COMPLETE** |
| Records | 13,141 |
| Date Range | 2016-2026 (system implemented 2016) |
| Source | IDT Plans API |
| Output | `scrapers/output/williamson_county/williamson_projects_all.json` |

### Knox County
| Metric | Value |
|--------|-------|
| Status | Requires account registration |
| Portal | https://epw-permitsubmit.knoxcountytn.gov |
| Notes | Login form with username/password fields |

---

## Architecture

### Folder Structure

```
ReactCRM/                           # Frontend React application
├── src/
│   ├── features/
│   │   ├── customers/              # Customer management
│   │   ├── technicians/            # Technician management
│   │   └── call-intelligence/      # Call analytics
│   ├── components/
│   └── context/
├── scrapers/                       # Data collection scripts
│   ├── states/
│   │   └── tennessee/
│   │       └── tdec_recursive_scraper.py  # Main TN scraper
│   ├── decodo/
│   │   ├── williamson_idt_scraper.py      # Williamson County
│   │   └── decodo_proxy_playwright.py     # Knox County (proxy)
│   └── output/
│       ├── tennessee/              # TN TDEC data
│       ├── williamson_county/      # Williamson data
│       └── knox_county/            # Knox exploration results
├── e2e/                            # Playwright E2E tests
├── claude-docs/                    # Claude Code documentation
└── CLAUDE.md                       # Project rules for Claude

react-crm-api/                      # Backend FastAPI application
├── app/
│   ├── api/v2/endpoints/           # API routes
│   ├── models/                     # SQLAlchemy models
│   ├── schemas/                    # Pydantic schemas
│   ├── services/                   # Business logic
│   └── core/                       # Config, auth, etc.
├── alembic/                        # Database migrations
└── scripts/                        # Utility scripts
```

### Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  TN TDEC Portal │────>│ Recursive Scraper│────>│ JSON Checkpoint │
│  (86 counties)  │     │ (Playwright)     │     │ Files           │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
┌─────────────────┐     ┌──────────────────┐              │
│ Williamson IDT  │────>│ API Scraper      │──────────────┤
│ Plans Portal    │     │ (aiohttp)        │              │
└─────────────────┘     └──────────────────┘              │
                                                          ▼
                                                ┌─────────────────┐
                                                │ Migration Script│
                                                │ (JSON → DB)     │
                                                └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React Frontend │<────│ FastAPI Backend  │<────│ PostgreSQL DB   │
│  (CRM UI)       │     │ (REST API)       │     │ (Railway)       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

---

## Data Sources

### 1. TN TDEC FileNet
- **URL:** https://eenrs.tnecd.tn.gov/Content/Search.aspx
- **Method:** Playwright browser automation
- **Strategy:** Recursive A-Z, 0-9 search patterns
- **Rate Limit:** 1.5s delay between requests
- **Checkpoints:** Every 3 counties

### 2. Williamson County IDT Plans
- **URL:** https://williamson.idtplans.com
- **API Endpoint:** `/secure/?action=search.suggest&step=project&fullsearch=1`
- **Method:** Direct API calls (aiohttp)
- **Search Patterns:** Address numbers, street names, years, permit types
- **Note:** System implemented in 2016, no earlier data exists

### 3. Knox County EPW Permit Submit
- **URL:** https://epw-permitsubmit.knoxcountytn.gov
- **Status:** Requires account registration
- **Method:** Playwright (login form automation pending)
- **Blocked:** Datacenter proxy IPs rejected, must use residential IP

---

## Scraper Infrastructure

### Decodo Proxy Configuration

Two credential sets available for rotating datacenter IPs:

**User 1 (Primary):**
```
Host: dc.decodo.com
Ports: 10001-10010
Username: OpusCLI
Password: h+Mpb3hlLt1c5B1mpL
```

**User 2 (Backup):**
```
Host: gate.decodo.com
Port: 7000
Username: sp8b4zyxfs
Password: 0lc1bmjJ49laKet_BL
```

**Usage in aiohttp:**
```python
proxy_url = f"http://{username}:{password}@dc.decodo.com:10001"
async with session.get(url, proxy=proxy_url) as response:
    ...
```

**Usage in Playwright:**
```python
browser = await p.chromium.launch(
    proxy={
        'server': 'http://dc.decodo.com:10001',
        'username': 'OpusCLI',
        'password': 'h+Mpb3hlLt1c5B1mpL'
    }
)
```

### Server Setup (100.85.99.69)

```bash
# SSH access via Tailscale
ssh will@100.85.99.69

# Scraper locations
~/scrapers/states/tennessee/tdec_recursive_scraper.py
~/scrapers/output/tennessee/

# Running scraper (nohup, no screen available)
nohup python states/tennessee/tdec_recursive_scraper.py > logs/tn_recursive.log 2>&1 &

# Monitor progress
tail -100 ~/scrapers/logs/tn_recursive.log
ls -la ~/scrapers/output/tennessee/
```

---

## Data Schema

### TN TDEC Record Structure
```json
{
  "permit_id": "string",
  "county": "string",
  "owner_name": "string",
  "address": "string",
  "city": "string",
  "zip": "string",
  "permit_type": "string",
  "permit_date": "YYYY-MM-DD",
  "status": "string",
  "parcel_id": "string",
  "system_type": "string",
  "installer": "string",
  "pdf_url": "string (optional)"
}
```

### Williamson County Record Structure
```json
{
  "id": "string",
  "label": "string (display name)",
  "value": "string (project ID)",
  "project_number": "string",
  "address": "string",
  "status": "string",
  "type": "string"
}
```

### CRM Target Schema (Permits Table)
```sql
CREATE TABLE permits (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(100) UNIQUE,
    source VARCHAR(50),           -- 'TDEC', 'WILLIAMSON', 'KNOX', etc.
    county VARCHAR(50),
    owner_name VARCHAR(200),
    address VARCHAR(300),
    city VARCHAR(100),
    state VARCHAR(2) DEFAULT 'TN',
    zip VARCHAR(10),
    parcel_id VARCHAR(50),
    permit_type VARCHAR(100),
    permit_date DATE,
    status VARCHAR(50),
    system_type VARCHAR(100),
    installer VARCHAR(200),
    pdf_url VARCHAR(500),
    pdf_downloaded_at TIMESTAMP,
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_permits_county ON permits(county);
CREATE INDEX idx_permits_source ON permits(source);
CREATE INDEX idx_permits_permit_date ON permits(permit_date);
CREATE INDEX idx_permits_address ON permits(address);
```

---

## CRM Integration Plan

### Phase 1: Documentation (Current)
- [x] Create DOCUMENTATION.md
- [ ] Create QUICK_START.md
- [ ] Document all existing scripts

### Phase 2: Code Consolidation
- [ ] Audit existing migration scripts
- [ ] Remove dead/experimental files
- [ ] Organize into `/scripts/migration/`, `/scripts/validation/`

### Phase 3: Deep Analysis
- [ ] Analyze frontend components (permits, search, PDF viewer)
- [ ] Analyze backend (models, controllers, existing permit endpoints)
- [ ] Map scraped fields to CRM schema
- [ ] Identify gaps and transformations needed

### Phase 4: Migration Execution
- [ ] Wait for TN scraper completion (~59 counties remaining)
- [ ] Sync final data from server
- [ ] Write chunked migration script (avoid memory issues)
- [ ] Execute upsert migration
- [ ] Validate record counts

### Phase 5: Playwright Testing
- [ ] Write E2E tests for TN permit display
- [ ] Test search/filter functionality
- [ ] Test pagination
- [ ] Test detail views
- [ ] Verify zero console errors

### Phase 6: PDF Integration
- [ ] Add `pdf_url` column to permits table
- [ ] Create backend endpoint: `GET /api/v2/permits/:id/pdf`
- [ ] Add frontend PDF viewer component
- [ ] Design storage strategy (local vs S3)

---

## Deployment

### Frontend (React)
- **URL:** https://react.ecbtx.com
- **Platform:** Railway
- **Deploy:** `git push` triggers auto-deploy
- **Build:** Vite

### Backend (FastAPI)
- **URL:** https://react-crm-api-production.up.railway.app/api/v2
- **Platform:** Railway
- **Database:** PostgreSQL (Railway managed)

### Deployment Commands
```bash
# Never use railway up - always git push
git add .
git commit -m "feat: description"
git push origin master
# Railway auto-deploys on push
```

---

## Known Issues & Workarounds

### 1. Knox County Proxy Blocking
**Issue:** Datacenter proxy IPs rejected by Knox portal
**Workaround:** Use direct connection from residential IP

### 2. Williamson API Content-Type
**Issue:** API returns `application/x-javascript` instead of `application/json`
**Workaround:** Use `response.text()` then `json.loads()` instead of `response.json()`

### 3. TN TDEC Pagination Limits
**Issue:** Portal limits search results
**Workaround:** Recursive A-Z, 0-9 search patterns to get all records

### 4. Large JSON Checkpoint Files
**Issue:** Checkpoint files can exceed 100MB
**Workaround:** Stream processing in migration script, chunked inserts

### 5. Server SSH Username
**Issue:** SSH fails with capitalized username
**Fix:** Use lowercase `will@100.85.99.69`

---

## Credentials & Configuration

### Environment Variables (Backend)
```env
DATABASE_URL=postgresql://...
SECRET_KEY=...
JWT_SECRET=...
```

### Environment Variables (Frontend)
```env
VITE_API_URL=https://react-crm-api-production.up.railway.app/api/v2
```

### Proxy Credentials
See [Decodo Proxy Configuration](#decodo-proxy-configuration) above.

### Server Access
```
Host: 100.85.99.69 (Tailscale)
User: will
Auth: SSH key
```

---

## Quick Commands Reference

```bash
# Check TN scraper status on server
ssh will@100.85.99.69 "tail -50 ~/scrapers/logs/tn_recursive.log"

# Check record count
ssh will@100.85.99.69 "ls -la ~/scrapers/output/tennessee/"

# Sync data from server
scp will@100.85.99.69:~/scrapers/output/tennessee/*.json scrapers/output/tennessee/

# Run Williamson scraper locally
python scrapers/decodo/williamson_idt_scraper.py

# Run Knox explorer locally
python scrapers/decodo/knox_county_scraper.py
```

---

## Appendix: File Inventory

### Active Scrapers
| File | Purpose | Status |
|------|---------|--------|
| `scrapers/states/tennessee/tdec_recursive_scraper.py` | Main TN TDEC scraper | Running on server |
| `scrapers/decodo/williamson_idt_scraper.py` | Williamson County API | Complete |
| `scrapers/decodo/decodo_proxy_playwright.py` | Knox County with proxy | Ready |

### Output Data
| File | Records | Status |
|------|---------|--------|
| `output/tennessee/tn_recursive_checkpoint_*.json` | 226,691+ | Growing |
| `output/williamson_county/williamson_projects_all.json` | 13,141 | Complete |
| `output/knox_county/exploration_results.json` | 0 | Exploration only |

### Documentation
| File | Purpose |
|------|---------|
| `DOCUMENTATION.md` | This file |
| `QUICK_START.md` | Quick setup guide |
| `scrapers/DECODO_PROXY_GUIDE.md` | Proxy configuration |
| `claude-docs/` | Claude Code rules |

---

*Document maintained as part of Tennessee Septic CRM Integration project.*
