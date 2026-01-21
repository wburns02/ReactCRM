# Permit Data Sources - Where the Actual Records Are

## Summary

You already have **substantial actual permit/property records** - over **210,000+ records** from working scrapers. The OpenGov investigation revealed it's an application submission system (not a permit database), so pivot to expanding existing working sources.

---

## Working Data Sources with Actual Records

### 1. Florida DEP Septic Database (BEST SOURCE)
**Location:** `scrapers/output/florida/fl_septic_*.json`
**Records:** 1.9 million+ (663MB)
**Data Quality:** Excellent
**Source URL:** Florida Department of Environmental Protection GIS
```
Fields: OBJECTID, CO_NO, PARCELNO, PHY_ADD1, PHY_CITY, PHY_ZIPCD, WW, WW_SRC_NAM
```
**Status:** Complete extraction

---

### 2. eBridge Permit Portal (Florida Counties)
**Location:** `scrapers/output/ebridge/*.ndjson`
**Records:** 5,089 permits
**Counties:** Hernando, Hillsborough, Okeechobee, Osceola, Pasco, Pinellas, Walton (FL)
```
Fields: permit_number, address, county, state, owner_name, zipcode, doc_date, doc_type
```
**Status:** Partial extraction (1000 limit per county) - **expandable**

---

### 3. EnerGov/Tyler Permit Portals (Multi-state)
**Location:** `scrapers/output/energov/*.ndjson`
**Records:** 33,222 permits
**Jurisdictions:** Carson CA, New Smyrna Beach FL, Doral FL, Wake County NC, Albuquerque NM
```
Fields: permitNumber, address, city, state, zipCode, parcelNumber, ownerName, permitType, status, appliedDate, issuedDate
```
**Status:** Partial extraction - **highly expandable** (hundreds of Tyler EnerGov portals exist)

---

### 4. Williamson County TN (ArcGIS Property Data)
**Location:** `scrapers/output/williamson_county/*.json`
**Records:** 65,711 properties + 3,908 matched permits
**Data Quality:** Excellent (includes market value, owner info, parcel data)
```
Fields: address, owner_name, assessed_value, market_value, lot_size_acres, square_footage, parcel_id
```
**Status:** Complete extraction

---

### 5. MGO (Texas Permits)
**Location:** `scrapers/output/mgo/*.ndjson`
**Records:** 3,095 OSSF permits from Williamson County TX
**Status:** Working - needs expansion to more counties

---

### 6. Sonoma County CA Septic
**Location:** `scrapers/output/sonoma_county_ca_septic.json`
**Records:** 13MB file
**Status:** Complete

---

## Data Sources by State (Existing Files)

| State | Source | Records | Location |
|-------|--------|---------|----------|
| FL | DEP Septic | 1.9M | `florida/fl_septic_*.json` |
| FL | eBridge | 5,089 | `ebridge/*.ndjson` |
| FL | EnerGov | 14,235 | `energov/fl_*.ndjson` |
| CA | EnerGov | 9,178 | `energov/ca_*.ndjson` |
| CA | Sonoma | ~50K | `sonoma_county_ca_septic.json` |
| TN | Williamson ArcGIS | 65,711 | `williamson_county/*.json` |
| TX | MGO/OSSF | 3,095 | `mgo/*.ndjson` |
| NC | EnerGov | 4,839 | `energov/nc_*.ndjson` |
| NM | EnerGov | 4,970 | `energov/nm_*.ndjson` |

---

## Where to Find More Data

### High-Value Targets (Proven APIs)

1. **Tyler EnerGov Portals** - 200+ jurisdictions use this system
   - Scraper: `scrapers/energov/`
   - Public search API at `/Search/Search`
   - No auth required for public records

2. **eBridge Permit Manager** - Dozens of Florida counties
   - Scraper: `scrapers/ebridge/`
   - API endpoints discovered, just need to run on more counties

3. **State ArcGIS Servers** - Property + permit GIS layers
   - Multi-state scraper: `scrapers/multi_state_arcgis_scraper.py`
   - Tennessee, Texas, Florida all have ArcGIS services

### Medium-Value Targets

4. **Accela Civic Platform** - Major permit system (requires more discovery)
5. **CivicPlus/CityView** - Municipal permit portals
6. **County Assessor Databases** - Property records with permit history

---

## NOT a Permit Database (Dead Ends)

- **OpenGov** - Application submission system only, no historical permits
- **GovQA** - FOIA request portal, not permit records

---

## Recommended Next Steps

1. **Expand EnerGov** - Scrape 50+ more Tyler EnerGov jurisdictions
2. **Expand eBridge** - Remove 1000 record limit, scrape all FL counties
3. **Run multi-state ArcGIS** - Property data with permit indicators
4. **Target Texas MGO** - Travis, Harris, Bexar counties have MGO portals

---

## Total Current Records

| Source | Records |
|--------|---------|
| Florida DEP | 1,900,000 |
| Williamson TN | 65,711 |
| EnerGov | 33,222 |
| eBridge | 5,089 |
| MGO TX | 3,095 |
| **TOTAL** | **2,007,117+** |

You already have over 2 million property/permit records.
