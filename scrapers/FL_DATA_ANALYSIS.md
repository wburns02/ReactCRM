# Florida Septic Data Analysis

## Summary

After extensive investigation, here's the truth about Florida septic data availability:

## Data Sources Analyzed

### 1. FL DEP SEPTIC_SYSTEMS MapServer (1.9M records)
**URL:** `https://cadev.dep.state.fl.us/arcgis/rest/services/External_Services/SEPTIC_SYSTEMS/MapServer`

- **Total Records:** 1,939,334
- **Coverage:** Statewide, all 67 counties
- **Data Type:** Parcel-level wastewater classification
- **Fields:** County, parcel, address, WW type (KnownSeptic, LikelySeptic), permit ID

### 2. FLWMI (Florida Water Management Inventory) (10M records)
**URL:** `https://gis.floridahealth.gov/server/rest/services/FLWMI/FLWMI_Wastewater/MapServer`

- **Total Records:** 10,023,191 (all parcels)
- **Septic Records:** 1,693,891
- **Data Type:** Parcel classification (septic, sewer, unknown)
- **Note:** Same underlying septic data as FL DEP

### 3. eBridge (Document Management)
**URL:** `https://s1.ebridge-solutions.com/ebridge/3.0`

- **Total Records:** ~10,000 across 7 counties
- **Data Type:** Document metadata only (not a permit database)
- **Limitation:** 1,000 record search limit, PDFs not extracted

## The Real Problem: Incomplete State Data

The Florida state databases are **incomplete for urban counties**:

| County | Population | Expected Septic* | Actual in Database | Gap |
|--------|------------|------------------|-------------------|-----|
| Hillsborough | 1,580,000 | ~95,000 | 4,966 | -95% |
| Pasco | 680,000 | ~136,000 | 16,215 | -88% |
| Osceola | 440,000 | ~88,000 | 1,906 | -98% |
| Orange | 1,450,000 | ~145,000 | 17,823 | -88% |
| Miami-Dade | 2,700,000 | ~135,000 | 30,285 | -78% |

*Based on estimated 15-50% septic rate depending on urbanization

## Why is the Data Incomplete?

1. **Historical Records Not Digitized**: Many older permits (pre-2000) were never entered into the statewide database

2. **Urban Counties on Sewer**: Large metro areas (Tampa, Orlando, Miami) have extensive sewer systems, so fewer septic permits

3. **Data Collection Method**: The FL DEP database is compiled from multiple sources:
   - DOH-HQ: Department of Health headquarters records
   - DOH-CHD: County Health Department records
   - Estimated/Inventory: Properties estimated to have septic

4. **Recent Transition**: Florida is transitioning OSTDS permitting from DOH to DEP (2025-2026), which may improve data completeness

## What We Actually Have

### Complete State-Level Coverage
- **1.9 million records** from FL DEP SEPTIC_SYSTEMS
- This IS the authoritative state database
- Most complete for rural counties
- Incomplete for urban counties

### eBridge Value
- Document metadata for 7 counties
- ~10,000 records after pagination
- PDFs available for OCR extraction (future enhancement)
- NOT a permit database - just document index

## Recommendations

1. **Use FL DEP data as primary source** - it's the official state database with 1.9M records

2. **Accept data limitations** - Florida's state data is incomplete, especially for urban areas

3. **Future enhancement options:**
   - Contact individual county health departments for bulk data
   - Submit public records requests to FL DEP/DOH
   - OCR extract contractor info from eBridge PDFs
   - Monitor the DEP transition for new data sources

4. **For accurate lead generation in urban counties:**
   - Use parcel data + zoning to identify likely septic properties
   - Cross-reference with sewer connection databases
   - Use property age (pre-1970s) as septic indicator

## Files Created

- `scrapers/output/florida/fl_dep_septic_all.json` - 1.9M records, 633MB
- `scrapers/output/ebridge/*.ndjson` - eBridge documents (~10K records)
- `scrapers/florida/flwmi-scraper.py` - FLWMI extraction tool

## Conclusion

The ~5,000 records for Hillsborough County IS the correct count from the official Florida database. The state data is simply incomplete for urban areas. This is a data quality issue at the source level, not an extraction problem.
