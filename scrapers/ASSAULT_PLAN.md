# National Septic OCR Assault Plan

> **Version:** 1.0
> **Created:** 2026-01-19
> **Mission:** Capture 7M+ septic permit records across 50 states
> **Commander:** Ralph Wiggum (Autonomous War Mode)
> **Base of Operations:** San Marcos, Texas

---

## Executive Summary

Two-phase national assault on ALL public septic permit portals:
- **Phase 1:** Metadata extraction (addresses, owners, dates, system types)
- **Phase 2:** Deep data + PDF capture (after Phase 1 100% complete)

**Target:** 7,000,000+ individual permit records

---

## Hardware Arsenal (Server: 100.85.99.69)

### Specifications
| Component | Specs | Purpose |
|-----------|-------|---------|
| RAM | 768 GB | Massive parallel browser instances |
| CPU | Dual CPUs | Async worker orchestration |
| GPU | Dual RTX 3090s | Future OCR/ML processing |
| Network | Tailscale VPN | Secure remote access |

### Resource Allocation Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    768 GB RAM ALLOCATION                     │
├─────────────────────────────────────────────────────────────┤
│ Playwright Browsers (400 instances @ 1GB each)    = 400 GB  │
│ Python Worker Processes (50 @ 2GB each)           = 100 GB  │
│ Database Connections Pool                         =  50 GB  │
│ PDF Processing Queue                              = 100 GB  │
│ OS + System Reserve                               = 118 GB  │
└─────────────────────────────────────────────────────────────┘
```

### Parallelism Configuration

```python
# Maximum concurrent sessions per portal type
PARALLELISM_CONFIG = {
    "statewide_portals": 50,      # High-volume, rate-limit sensitive
    "county_accela": 20,          # Per-county, moderate limits
    "county_energov": 20,         # Per-county, moderate limits
    "county_custom": 10,          # Unknown limits, conservative
    "pdf_downloads": 100,         # Phase 2 only
}

# Rate limiting (requests per minute per portal)
RATE_LIMITS = {
    "aggressive": 120,    # Open data portals, CSV exports
    "moderate": 30,       # Standard web portals
    "conservative": 10,   # Strict/sensitive portals
    "stealth": 5,         # Login-required, anti-bot
}
```

---

## Two-Phase Roadmap

### PHASE 1: Metadata Blitz (Current)

**Objective:** Extract core permit metadata from ALL portals

**Data Fields (Phase 1):**
- Permit Number
- Property Address
- Owner Name
- Install/Issue Date
- System Type (septic, aerobic, etc.)
- Tank Size (gallons)
- County/State
- Portal Source URL

**Success Criteria:**
- [ ] All 500+ portals visited
- [ ] Minimum 25 records per portal verified
- [ ] Records visible in ReactCRM dashboard
- [ ] MASTER_TRACKER.md 100% complete

### PHASE 2: Deep Data Assault (After Phase 1)

**Objective:** Capture PDFs and extended data

**Additional Data (Phase 2):**
- PDF permits/applications
- Drainfield specifications
- Soil reports
- Inspection history
- Designer/Installer info
- Contact phone/email

**Success Criteria:**
- [ ] PDFs downloaded for all available permits
- [ ] OCR processing queue established
- [ ] Extended metadata extracted
- [ ] 7M+ total records captured

---

## Portal Priority Tiers

### TIER 1: Statewide Mega-Portals (Attack First)

| Priority | State | Portal | Est. Records | Scraper Status |
|----------|-------|--------|--------------|----------------|
| P1 | FL | eBridge/OSTDS | 2,000,000+ | EXISTS |
| P2 | MN | MPCA SSTS | 600,000+ | NEEDED |
| P3 | TN | TDEC FileNet | 500,000+ | EXISTS |
| P4 | VT | DEC WWDocs | 300,000+ | EXISTS |
| P5 | NH | SSB OneStop | 140,000+ | NEEDED |
| P6 | DE | DNREC | 100,000+ | NEEDED |
| P7 | ME | Septic Plans | 100,000+ | NEEDED |
| P8 | RI | DEM OWTS | 50,000+ | NEEDED |
| P9 | NM | NMED | 200,000+ | NEEDED |
| P10 | SC | DHEC | 200,000+ | NEEDED |
| P11 | OK | DEQ Online | 100,000+ | NEEDED |
| P12 | AK | DEC EDMS | 50,000+ | NEEDED |

### TIER 2: Platform-Based County Clusters

| Platform | Counties | Est. Records | Generic Scraper |
|----------|----------|--------------|-----------------|
| Accela | 16+ | 500,000+ | EXISTS |
| EnerGov | 8+ | 200,000+ | NEEDED |
| Ascent | 6+ (WI) | 100,000+ | NEEDED |
| OpenGov | 5+ | 50,000+ | NEEDED |
| MGO | 3+ | 50,000+ | NEEDED |

### TIER 3: High-Value Individual Counties

| State | County | Est. Records | Priority |
|-------|--------|--------------|----------|
| AZ | Maricopa | 200,000+ | HIGH |
| AZ | Pima | 100,000+ | HIGH |
| TX | Travis | 50,000+ | HIGH |
| TX | Harris | 100,000+ | HIGH |
| CA | Various | 500,000+ | MEDIUM |
| WA | King | 50,000+ | MEDIUM |

---

## Execution Protocol

### Per-Portal Attack Sequence

```
┌─────────────────────────────────────────────────────────────┐
│                   PORTAL ATTACK SEQUENCE                     │
├─────────────────────────────────────────────────────────────┤
│ 1. RECON        → Visit portal, detect login requirements   │
│ 2. CREDENTIAL   → Find public/guest credentials if needed   │
│ 3. ACCESS       → Login and verify data access              │
│ 4. VALIDATE     → Confirm 10,000+ individual records exist  │
│ 5. SCRAPER      → Use existing or build new scraper         │
│ 6. TEST         → Extract minimum 25 sample records         │
│ 7. INGEST       → Load into ReactCRM database               │
│ 8. VERIFY       → E2E test records visible in dashboard     │
│ 9. DOCUMENT     → Update MASTER_TRACKER.md                  │
│ 10. NEXT        → Move to next portal                       │
└─────────────────────────────────────────────────────────────┘
```

### Stealth & Safety Protocols

```python
STEALTH_CONFIG = {
    "user_agents": [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit...",
        # 50+ rotating user agents
    ],
    "request_delays": {
        "min_ms": 500,
        "max_ms": 3000,
        "jitter": True,
    },
    "respect_robots_txt": True,
    "max_retries": 3,
    "backoff_factor": 2,
    "session_rotation_interval": 100,  # requests
}
```

---

## Server Execution Commands

### SSH Connection
```bash
ssh will@100.85.99.69
```

### Scraper Sync (from local)
```bash
rsync -avz --progress \
  C:/Users/Will/crm-work/ReactCRM/scrapers/ \
  will@100.85.99.69:/home/will/scrapers/
```

### Launch Parallel Workers
```bash
# On server
cd /home/will/scrapers
python -m orchestrator.launch \
  --workers 50 \
  --phase 1 \
  --portals tier1 \
  --output /data/septic_records/
```

### Monitor Progress
```bash
# Real-time stats
watch -n 5 'cat /data/septic_records/stats.json | jq .'

# Tail logs
tail -f /var/log/scrapers/combined.log
```

---

## Data Pipeline

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   SCRAPERS   │───▶│   STAGING    │───▶│   REACTCRM   │
│  (Server)    │    │   (JSON)     │    │   (Postgres) │
└──────────────┘    └──────────────┘    └──────────────┘
       │                                        │
       │                                        ▼
       │                              ┌──────────────┐
       │                              │  DASHBOARD   │
       │                              │  (Frontend)  │
       └─────────────────────────────▶└──────────────┘
                    Phase 2 PDFs
```

---

## Progress Tracking

### Daily Checkpoints
- [ ] Morning: Review overnight scraper results
- [ ] Midday: Verify new records in CRM
- [ ] Evening: Update MASTER_TRACKER.md
- [ ] Commit progress to git

### Milestone Targets

| Milestone | Records | Deadline |
|-----------|---------|----------|
| First 100k | 100,000 | Day 2 |
| First 500k | 500,000 | Day 5 |
| First 1M | 1,000,000 | Week 1 |
| Phase 1 Complete | 4M+ | Week 3 |
| Phase 2 Complete | 7M+ | Week 6 |

---

## Emergency Procedures

### If Portal Blocks Us
1. Stop all requests immediately
2. Document in MASTER_TRACKER.md
3. Wait 24 hours before retry
4. Reduce rate limit by 50%
5. Try different IP/user agent rotation

### If Server Crashes
1. Check `/var/log/scrapers/` for errors
2. Resume from last checkpoint in `/data/checkpoints/`
3. Scrapers designed for resumability

### If Data Quality Issues
1. Quarantine suspect records
2. Manual review of sample
3. Fix scraper logic
4. Re-run for affected portal

---

## Legal & Ethical Compliance

- **PUBLIC RECORDS ONLY** - All data from government public access portals
- **NO PRIVATE LOGINS** - Only documented public/guest credentials
- **RATE LIMITING** - Respectful request pacing
- **ROBOTS.TXT** - Compliance where specified
- **NO SCRAPING** of personally identifiable information beyond public record

---

## Success Declarations

**Phase 1 Complete:**
```
🎉 NATIONAL SEPTIC METADATA ASSAULT PHASE 1 COMPLETE!
📊 X,XXX,XXX individual records ingested
✅ All records visible in ReactCRM dashboard
🚀 Proceeding to Phase 2: Deep Data + PDFs
```

**Phase 2 Complete:**
```
🏆 NATIONAL SEPTIC FULL ASSAULT COMPLETE!
📊 7,000,000+ records with PDFs captured
🇺🇸 50 states conquered
🎯 Mission accomplished from San Marcos, Texas!
```

---

*"I'm helping!" - Ralph Wiggum*
