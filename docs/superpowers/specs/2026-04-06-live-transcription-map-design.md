# Live Transcription Map — Design Spec

**Date:** 2026-04-06
**Status:** Approved
**Project:** Mac Service Platform (React CRM)

## Overview

A real-time map that automatically shows caller location during active calls. Location is determined from multiple signals — existing customer records, inbound phone number area codes, and live transcript parsing. The map displays service area zones (core/extended) and estimated drive time from the Columbia, TN base.

## UI Architecture

### Two Display Modes

**1. Floating Pop-Over (`CallMapFloater`)**
- Auto-appears in bottom-right corner of any CRM page when a `location_detected` WebSocket event fires during an active call
- Compact: ~380px wide, mini MapLibre GL map (~200px tall), zone badge, drive time chip, source text
- Dismissible via X button
- "Open Full View" link navigates to `/phone` with the map panel expanded
- Auto-hides 5 seconds after call ends

**2. Side Panel (`CallMapPanel`)**
- Embedded in the SoftPhone/call screen as the right half (55% width)
- Transcript on the left, map on the right
- Larger MapLibre GL map with full zone polygon overlays and legend
- Shows: customer info card (if matched), transcript highlight (quoted text that triggered detection), zone legend, drive time

### Component Structure

```
features/call-map/
├── CallMapProvider.tsx        # Wraps App, listens for location_detected WS events
├── CallMapFloater.tsx         # Floating pop-over (renders at root level)
├── CallMapPanel.tsx           # Full side panel for SoftPhone
├── components/
│   ├── MiniMap.tsx            # Compact MapLibre GL (~380×200px)
│   ├── FullMap.tsx            # Larger MapLibre GL with zone polygons
│   ├── ZoneIndicator.tsx      # "✓ Core" / "⚠ Extended" / "✗ Outside"
│   ├── ZoneLegend.tsx         # Core (red) + Extended (amber dashed) legend
│   ├── DriveTimeChip.tsx      # "🚗 ~12 min from base"
│   ├── LocationSource.tsx     # Shows detection source text
│   ├── CustomerInfoCard.tsx   # Matched customer details
│   └── TranscriptHighlight.tsx # Quoted transcript text that triggered detection
├── callMapStore.ts            # Zustand store
├── types.ts                   # TypeScript types
└── data/
    └── tn-cities.json         # Optional client-side city list for highlighting
```

### State Management

Zustand `callMapStore`:
```typescript
interface CallMapState {
  location: {
    lat: number;
    lng: number;
    source: "customer_record" | "transcript" | "area_code";
    address_text: string;
    zone: "core" | "extended" | "outside";
    drive_minutes: number;
    customer_id: string | null;
    confidence: number;
  } | null;
  isVisible: boolean;       // floater shown
  isExpanded: boolean;      // full panel mode
  activeCallSid: string | null;
}
```

### Key Behaviors

- New location replaces old pin with smooth fly-to animation
- Higher confidence location replaces lower confidence
- Floater auto-hides 5 seconds after call ends
- "Open Full View" navigates to /phone with map panel open
- Map is purely additive — no degradation to existing call functionality if anything fails

## Backend Architecture

### Location Detection Pipeline

Signal priority (highest to lowest):

1. **Existing customer match** — look up caller phone number in customers table. If match found and address/lat-lng exists, use immediately. Confidence: 0.95.
2. **Live transcript parsing** — each transcript chunk runs through `LocationExtractor`:
   - Regex for full addresses ("1205 Hampshire Pike"). Confidence: 0.9.
   - City dictionary lookup ("Spring Hill", "Franklin"). Confidence: 0.7.
   - Street name recognition for known market streets. Confidence: 0.8.
3. **Inbound number area code** — maps to market center. Confidence: 0.3. Used as default map center, not as a pin.

### Geocoding Strategy (layered, cheapest first)

1. **Local city lookup table** — ~200 cities/towns in middle TN with pre-stored lat/lng. Instant, no API call.
2. **Nominatim** (free, OpenStreetMap-based) — for street addresses and anything not in the local table. Rate limit: 1 req/sec (sufficient for transcript chunk frequency).
3. No paid geocoding API required.

### Zone Detection

- **Point-in-polygon** using Shapely on the backend
- GeoJSON polygons exported from the Google Earth KML (two zones for Nashville)
- Results: `"core"` | `"extended"` | `"outside"`

### Drive Time Calculation

- Haversine distance from Columbia, TN base (35.6145, -87.0353) to detected point
- 35 mph average estimate (already exists in route optimization code)
- Returns estimated minutes

### Deduplication

- Track last detected location per call
- Only push new `location_detected` events when location meaningfully changes (>0.5 mile delta or zone change)
- Prevent flooding from repeated city mentions in transcript

### WebSocket Event

Pushed over the existing call transcript WebSocket:

```json
{
  "type": "location_detected",
  "call_sid": "CA...",
  "data": {
    "lat": 35.6145,
    "lng": -87.0353,
    "source": "transcript",
    "address_text": "Bear Creek Pike, Columbia, TN",
    "zone": "core",
    "drive_minutes": 12,
    "customer_id": null,
    "confidence": 0.8,
    "transcript_excerpt": "out on Bear Creek Pike in Columbia"
  }
}
```

### New Backend Files

| File | Purpose |
|------|---------|
| `app/services/location_extractor.py` | Transcript parsing, geocoding, zone check, drive time |
| `app/api/v2/service_markets.py` | CRUD endpoints for market configs (admin only) |
| `app/models/service_market.py` | DB model for markets, area codes, polygons |

### Market Configuration

Stored in a `service_markets` table:

```python
{
  "nashville": {
    "name": "Nashville / Middle TN",
    "area_codes": ["615", "629", "931"],
    "center": { "lat": 35.6145, "lng": -87.0353 },
    "polygons": {
      "core": { "type": "Polygon", "coordinates": [[...]] },
      "extended": { "type": "Polygon", "coordinates": [[...]] }
    }
  },
  "san_marcos": {
    "name": "San Marcos / Central TX",
    "area_codes": ["737", "512"],
    "center": { "lat": 29.8833, "lng": -97.9414 },
    "polygons": null
  }
}
```

Nashville polygon coordinates to be extracted from the existing Google Earth KML file.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No location detected during call | Map stays centered on market default. Floater never appears. |
| Ambiguous city name ("Springfield") | Scoped to current market from area code. 615 + "Springfield" = Springfield, TN. |
| Multiple locations mentioned | Pin updates to most recent/specific. Higher confidence replaces lower. |
| Customer record has address but no lat/lng | Geocode stored address on the fly, cache result back to customer record. |
| Nominatim down or slow | Fall back to local city table only. Log failure. City-level precision still works. |
| Unknown area code | Default to Nashville/Columbia market. |
| WebSocket disconnected | Floater doesn't appear. No degradation to existing call functionality. |

## Existing Infrastructure Leveraged

- **MapLibre GL** + **react-map-gl** — already in use on Fleet page
- **CartoDB free tiles** — already configured
- **Call transcript WebSocket** (`call_transcript_ws.py`) — existing real-time transcript streaming
- **Haversine + 35mph drive estimate** — exists in route optimization
- **Zustand** — existing state management pattern
- **Customer lat/lng fields** — already in customers table

## Testing Strategy

- **Unit tests:** `LocationExtractor` — feed transcript chunks, verify correct locations extracted
- **Unit tests:** Point-in-polygon zone detection with known coordinates inside/outside each zone
- **Unit tests:** Deduplication logic — repeated mentions don't fire multiple events
- **Playwright E2E:** Simulate a call with mock transcript, verify floater appears, pin drops in correct zone, drive time displays correctly
- **Playwright E2E:** Verify "Open Full View" navigates to phone page with expanded map panel
- **Playwright E2E:** Verify floater auto-hides after call ends

## Out of Scope

- Turn-by-turn routing / real directions (haversine estimate is sufficient)
- Paid geocoding APIs
- Service area polygon editing UI (admin can update via API or direct DB for now)
- Markets beyond Nashville and San Marcos
- Offline/cached map tiles
