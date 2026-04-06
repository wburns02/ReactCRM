# Live Transcription Map — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real-time map to the CRM that auto-detects caller location from transcript parsing, customer records, and area code mapping during active calls.

**Architecture:** Backend-driven location extraction runs inside the existing call transcript WebSocket pipeline. A `LocationExtractor` service parses each final transcript chunk for addresses/cities, geocodes via local lookup table + Nominatim, determines service zone via point-in-polygon, and broadcasts `location_detected` events over the same WS. Frontend renders a floating pop-over (any page) and an expanded side panel (phone page) using MapLibre GL.

**Tech Stack:** FastAPI + SQLAlchemy async (backend), React 19 + TypeScript + MapLibre GL + react-map-gl + Zustand (frontend), Nominatim (free geocoding), pure Python ray-casting (point-in-polygon), CartoDB free tiles.

**Spec:** `docs/superpowers/specs/2026-04-06-live-transcription-map-design.md`

---

## File Structure

### Backend (`/home/will/react-crm-api/`)

| File | Action | Responsibility |
|------|--------|---------------|
| `app/services/location_extractor.py` | Create | Core: text parsing, geocoding, zone check, drive time, dedup |
| `app/services/market_config.py` | Create | Market definitions: area codes, centers, polygons, city lookup |
| `app/services/call_transcript_manager.py` | Modify | Add `broadcast_event()` method for arbitrary JSON events |
| `app/api/v2/call_transcript_ws.py` | Modify | Hook LocationExtractor into transcript callback |
| `app/api/v2/service_markets.py` | Create | GET/PUT endpoints for market configs (admin) |
| `app/main.py` | Modify | Register service_markets router |
| `tests/test_location_extractor.py` | Create | Unit tests for extraction, geocoding, zone, dedup |
| `tests/test_market_config.py` | Create | Unit tests for market lookup, city table, point-in-polygon |

### Frontend (`/home/will/ReactCRM/`)

| File | Action | Responsibility |
|------|--------|---------------|
| `src/features/call-map/types.ts` | Create | TypeScript types for location events, zones, store |
| `src/features/call-map/callMapStore.ts` | Create | Zustand store: location, visibility, expansion state |
| `src/features/call-map/CallMapProvider.tsx` | Create | Wraps App, connects to call transcript WS, listens for location events |
| `src/features/call-map/CallMapFloater.tsx` | Create | Floating pop-over: mini map + zone badge + drive time |
| `src/features/call-map/CallMapPanel.tsx` | Create | Full side panel for SoftPhone with expanded map |
| `src/features/call-map/components/MiniMap.tsx` | Create | Compact MapLibre GL (~380×200px) for floater |
| `src/features/call-map/components/FullMap.tsx` | Create | Larger MapLibre GL with zone polygon overlays |
| `src/features/call-map/components/ZoneIndicator.tsx` | Create | Zone badge: Core (green) / Extended (amber) / Outside (red) |
| `src/features/call-map/components/ZoneLegend.tsx` | Create | Map legend for zone polygon colors |
| `src/features/call-map/components/DriveTimeChip.tsx` | Create | Drive time display chip |
| `src/features/call-map/components/LocationSource.tsx` | Create | Shows detection source text |
| `src/features/call-map/components/CustomerInfoCard.tsx` | Create | Matched customer name/address |
| `src/features/call-map/components/TranscriptHighlight.tsx` | Create | Quoted transcript text that triggered detection |
| `src/features/call-map/data/nashville-zones.json` | Create | GeoJSON polygons for Nashville core + extended |
| `src/App.tsx` | Modify | Add CallMapProvider to provider tree |
| `src/features/phone/SoftPhone.tsx` | Modify | Add CallMapPanel side panel |
| `e2e/features/call-map.spec.ts` | Create | Playwright E2E tests |

---

## Task 1: Backend — Market Config + City Lookup

**Files:**
- Create: `app/services/market_config.py`
- Create: `tests/test_market_config.py`

This task builds the static data layer: market definitions (area codes, centers, polygons) and the TN city lookup table with pre-stored lat/lng.

- [ ] **Step 1: Write failing tests for market config**

Create `tests/test_market_config.py`:

```python
import pytest
from app.services.market_config import (
    get_market_by_area_code,
    get_market_by_slug,
    lookup_city,
    point_in_polygon,
    get_zone,
    DEFAULT_MARKET_SLUG,
)


def test_area_code_615_returns_nashville():
    market = get_market_by_area_code("615")
    assert market is not None
    assert market["slug"] == "nashville"
    assert "615" in market["area_codes"]


def test_area_code_629_returns_nashville():
    market = get_market_by_area_code("629")
    assert market is not None
    assert market["slug"] == "nashville"


def test_area_code_931_returns_nashville():
    market = get_market_by_area_code("931")
    assert market is not None
    assert market["slug"] == "nashville"


def test_area_code_737_returns_san_marcos():
    market = get_market_by_area_code("737")
    assert market is not None
    assert market["slug"] == "san_marcos"


def test_area_code_512_returns_san_marcos():
    market = get_market_by_area_code("512")
    assert market is not None
    assert market["slug"] == "san_marcos"


def test_unknown_area_code_returns_default():
    market = get_market_by_area_code("212")
    assert market is not None
    assert market["slug"] == DEFAULT_MARKET_SLUG


def test_get_market_by_slug():
    market = get_market_by_slug("nashville")
    assert market is not None
    assert market["name"] == "Nashville / Middle TN"


def test_lookup_city_columbia():
    result = lookup_city("Columbia", "nashville")
    assert result is not None
    assert abs(result["lat"] - 35.6145) < 0.05
    assert abs(result["lng"] - (-87.0353)) < 0.05


def test_lookup_city_spring_hill():
    result = lookup_city("Spring Hill", "nashville")
    assert result is not None
    assert abs(result["lat"] - 35.7512) < 0.05


def test_lookup_city_case_insensitive():
    result = lookup_city("spring hill", "nashville")
    assert result is not None


def test_lookup_city_unknown():
    result = lookup_city("Nonexistent City", "nashville")
    assert result is None


def test_point_in_polygon_inside():
    polygon = [
        (0.0, 0.0),
        (0.0, 10.0),
        (10.0, 10.0),
        (10.0, 0.0),
    ]
    assert point_in_polygon(5.0, 5.0, polygon) is True


def test_point_in_polygon_outside():
    polygon = [
        (0.0, 0.0),
        (0.0, 10.0),
        (10.0, 10.0),
        (10.0, 0.0),
    ]
    assert point_in_polygon(15.0, 5.0, polygon) is False


def test_get_zone_columbia_is_core():
    zone = get_zone(35.6145, -87.0353, "nashville")
    assert zone == "core"


def test_get_zone_nashville_is_extended():
    zone = get_zone(36.16, -86.78, "nashville")
    assert zone == "extended"


def test_get_zone_far_away_is_outside():
    zone = get_zone(40.0, -80.0, "nashville")
    assert zone == "outside"


def test_get_zone_no_polygons():
    zone = get_zone(29.88, -97.94, "san_marcos")
    assert zone == "outside"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/will/react-crm-api && python -m pytest tests/test_market_config.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.market_config'`

- [ ] **Step 3: Implement market config service**

Create `app/services/market_config.py`:

```python
"""
Market configuration: area codes, centers, service area polygons, city lookup.

Static data — no database required. Markets are defined in MARKETS dict.
City lookup tables are pre-populated with lat/lng for instant geocoding.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

DEFAULT_MARKET_SLUG = "nashville"

# Nashville service area polygons (approximate from Google Earth KML)
# Core: Columbia / Spring Hill / Maury County area
NASHVILLE_CORE_POLYGON = [
    (35.76, -86.93),   # North (Spring Hill)
    (35.73, -86.76),   # Northeast
    (35.60, -86.70),   # East
    (35.46, -86.78),   # Southeast
    (35.42, -86.95),   # South
    (35.45, -87.12),   # Southwest
    (35.55, -87.20),   # West
    (35.68, -87.15),   # Northwest
    (35.76, -86.93),   # Close polygon
]

# Extended: Broader Nashville metro down through Columbia
NASHVILLE_EXTENDED_POLYGON = [
    (36.32, -86.80),   # North (Nashville)
    (36.28, -86.30),   # Northeast
    (36.05, -86.05),   # East (Murfreesboro)
    (35.78, -86.25),   # Southeast
    (35.40, -86.55),   # South-southeast
    (35.30, -87.00),   # South
    (35.35, -87.30),   # Southwest
    (35.55, -87.45),   # West
    (35.85, -87.45),   # West-northwest
    (36.15, -87.25),   # Northwest (Dickson)
    (36.32, -87.05),   # North-northwest
    (36.32, -86.80),   # Close polygon
]

MARKETS: dict[str, dict] = {
    "nashville": {
        "slug": "nashville",
        "name": "Nashville / Middle TN",
        "area_codes": ["615", "629", "931"],
        "center": {"lat": 35.6145, "lng": -87.0353},
        "polygons": {
            "core": NASHVILLE_CORE_POLYGON,
            "extended": NASHVILLE_EXTENDED_POLYGON,
        },
    },
    "san_marcos": {
        "slug": "san_marcos",
        "name": "San Marcos / Central TX",
        "area_codes": ["737", "512"],
        "center": {"lat": 29.8833, "lng": -97.9414},
        "polygons": None,
    },
}

# Area code -> market slug reverse lookup
_AREA_CODE_MAP: dict[str, str] = {}
for slug, market in MARKETS.items():
    for code in market["area_codes"]:
        _AREA_CODE_MAP[code] = slug

# City lookup tables per market: {normalized_name: {lat, lng, name}}
CITY_TABLES: dict[str, dict[str, dict]] = {
    "nashville": {
        "columbia": {"lat": 35.6145, "lng": -87.0353, "name": "Columbia"},
        "spring hill": {"lat": 35.7512, "lng": -86.9300, "name": "Spring Hill"},
        "franklin": {"lat": 35.9260, "lng": -86.8689, "name": "Franklin"},
        "brentwood": {"lat": 36.0331, "lng": -86.7828, "name": "Brentwood"},
        "nashville": {"lat": 36.1627, "lng": -86.7816, "name": "Nashville"},
        "murfreesboro": {"lat": 35.8456, "lng": -86.3903, "name": "Murfreesboro"},
        "mt pleasant": {"lat": 35.5342, "lng": -87.2067, "name": "Mt Pleasant"},
        "mount pleasant": {"lat": 35.5342, "lng": -87.2067, "name": "Mt Pleasant"},
        "lewisburg": {"lat": 35.4495, "lng": -86.7889, "name": "Lewisburg"},
        "shelbyville": {"lat": 35.4834, "lng": -86.4603, "name": "Shelbyville"},
        "pulaski": {"lat": 35.1998, "lng": -87.0306, "name": "Pulaski"},
        "lawrenceburg": {"lat": 35.2423, "lng": -87.3347, "name": "Lawrenceburg"},
        "centerville": {"lat": 35.7790, "lng": -87.4667, "name": "Centerville"},
        "dickson": {"lat": 36.0770, "lng": -87.3878, "name": "Dickson"},
        "fairview": {"lat": 35.9820, "lng": -87.1214, "name": "Fairview"},
        "nolensville": {"lat": 35.9523, "lng": -86.6694, "name": "Nolensville"},
        "smyrna": {"lat": 35.9828, "lng": -86.5186, "name": "Smyrna"},
        "la vergne": {"lat": 36.0156, "lng": -86.5819, "name": "La Vergne"},
        "gallatin": {"lat": 36.3884, "lng": -86.4467, "name": "Gallatin"},
        "hendersonville": {"lat": 36.3048, "lng": -86.6200, "name": "Hendersonville"},
        "lebanon": {"lat": 36.2081, "lng": -86.2911, "name": "Lebanon"},
        "cookeville": {"lat": 36.1628, "lng": -85.5016, "name": "Cookeville"},
        "clarksville": {"lat": 36.5298, "lng": -87.3595, "name": "Clarksville"},
        "thompson station": {"lat": 35.8012, "lng": -86.9111, "name": "Thompson Station"},
        "chapel hill": {"lat": 35.6267, "lng": -86.6928, "name": "Chapel Hill"},
        "eagleville": {"lat": 35.7434, "lng": -86.6478, "name": "Eagleville"},
        "lascassas": {"lat": 35.9350, "lng": -86.2850, "name": "Lascassas"},
        "college grove": {"lat": 35.7695, "lng": -86.7339, "name": "College Grove"},
        "arrington": {"lat": 35.8650, "lng": -86.6850, "name": "Arrington"},
        "bon aqua": {"lat": 35.9200, "lng": -87.2700, "name": "Bon Aqua"},
        "santa fe": {"lat": 35.7200, "lng": -87.0500, "name": "Santa Fe"},
        "culleoka": {"lat": 35.4650, "lng": -87.0200, "name": "Culleoka"},
        "lynnville": {"lat": 35.3900, "lng": -87.0100, "name": "Lynnville"},
        "cornersville": {"lat": 35.3617, "lng": -86.8400, "name": "Cornersville"},
        "unionville": {"lat": 35.6100, "lng": -86.5900, "name": "Unionville"},
        "bell buckle": {"lat": 35.5887, "lng": -86.3584, "name": "Bell Buckle"},
        "wartrace": {"lat": 35.5256, "lng": -86.3389, "name": "Wartrace"},
        "manchester": {"lat": 35.4817, "lng": -86.0886, "name": "Manchester"},
        "tullahoma": {"lat": 35.3620, "lng": -86.2094, "name": "Tullahoma"},
        "winchester": {"lat": 35.1859, "lng": -86.1122, "name": "Winchester"},
        "fayetteville": {"lat": 35.1520, "lng": -86.5706, "name": "Fayetteville"},
        "hohenwald": {"lat": 35.5487, "lng": -87.5514, "name": "Hohenwald"},
        "linden": {"lat": 35.6173, "lng": -87.8392, "name": "Linden"},
        "waverly": {"lat": 36.0839, "lng": -87.7947, "name": "Waverly"},
        "white bluff": {"lat": 36.1073, "lng": -87.2200, "name": "White Bluff"},
        "kingston springs": {"lat": 36.0998, "lng": -87.1150, "name": "Kingston Springs"},
        "bellevue": {"lat": 36.0759, "lng": -86.9075, "name": "Bellevue"},
        "goodlettsville": {"lat": 36.3234, "lng": -86.7133, "name": "Goodlettsville"},
        "springfield": {"lat": 36.5092, "lng": -86.8850, "name": "Springfield"},
        "portland": {"lat": 36.5817, "lng": -86.5164, "name": "Portland"},
        "white house": {"lat": 36.4712, "lng": -86.6514, "name": "White House"},
        "greenbrier": {"lat": 36.4284, "lng": -86.8042, "name": "Greenbrier"},
        "ashland city": {"lat": 36.2748, "lng": -87.0642, "name": "Ashland City"},
        "charlotte": {"lat": 36.1773, "lng": -87.3397, "name": "Charlotte"},
        "antioch": {"lat": 36.0601, "lng": -86.6722, "name": "Antioch"},
        "hermitage": {"lat": 36.1740, "lng": -86.6120, "name": "Hermitage"},
        "mount juliet": {"lat": 36.2001, "lng": -86.5186, "name": "Mount Juliet"},
        "mt juliet": {"lat": 36.2001, "lng": -86.5186, "name": "Mount Juliet"},
        "donelson": {"lat": 36.1387, "lng": -86.6564, "name": "Donelson"},
        "madison": {"lat": 36.2570, "lng": -86.7075, "name": "Madison"},
        "old hickory": {"lat": 36.2376, "lng": -86.6480, "name": "Old Hickory"},
    },
    "san_marcos": {
        "san marcos": {"lat": 29.8833, "lng": -97.9414, "name": "San Marcos"},
        "kyle": {"lat": 29.9888, "lng": -97.8772, "name": "Kyle"},
        "buda": {"lat": 30.0852, "lng": -97.8411, "name": "Buda"},
        "wimberley": {"lat": 29.9977, "lng": -98.0986, "name": "Wimberley"},
        "dripping springs": {"lat": 30.1902, "lng": -98.0867, "name": "Dripping Springs"},
        "new braunfels": {"lat": 29.7030, "lng": -98.1245, "name": "New Braunfels"},
        "seguin": {"lat": 29.5688, "lng": -97.9647, "name": "Seguin"},
        "lockhart": {"lat": 29.8849, "lng": -97.6700, "name": "Lockhart"},
        "luling": {"lat": 29.6808, "lng": -97.6475, "name": "Luling"},
        "austin": {"lat": 30.2672, "lng": -97.7431, "name": "Austin"},
    },
}


def get_market_by_area_code(area_code: str) -> dict:
    """Look up market by phone area code. Returns default market for unknown codes."""
    slug = _AREA_CODE_MAP.get(area_code, DEFAULT_MARKET_SLUG)
    return MARKETS[slug]


def get_market_by_slug(slug: str) -> Optional[dict]:
    """Look up market by slug."""
    return MARKETS.get(slug)


def lookup_city(city_name: str, market_slug: str) -> Optional[dict]:
    """Look up a city in the market's city table. Returns {lat, lng, name} or None."""
    table = CITY_TABLES.get(market_slug, {})
    return table.get(city_name.lower().strip())


def point_in_polygon(lat: float, lng: float, polygon: list[tuple[float, float]]) -> bool:
    """Ray-casting point-in-polygon test. Polygon is list of (lat, lng) tuples."""
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        yi, xi = polygon[i]
        yj, xj = polygon[j]
        if ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def get_zone(lat: float, lng: float, market_slug: str) -> str:
    """Determine which service zone a point falls in: 'core', 'extended', or 'outside'."""
    market = MARKETS.get(market_slug)
    if not market or not market.get("polygons"):
        return "outside"
    polygons = market["polygons"]
    if polygons.get("core") and point_in_polygon(lat, lng, polygons["core"]):
        return "core"
    if polygons.get("extended") and point_in_polygon(lat, lng, polygons["extended"]):
        return "extended"
    return "outside"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/will/react-crm-api && python -m pytest tests/test_market_config.py -v`
Expected: All 17 tests PASS

- [ ] **Step 5: Commit**

```bash
cd /home/will/react-crm-api
git add app/services/market_config.py tests/test_market_config.py
git commit -m "feat: add market config with city lookup and zone detection"
```

---

## Task 2: Backend — Location Extractor Service

**Files:**
- Create: `app/services/location_extractor.py`
- Create: `tests/test_location_extractor.py`

Core service: parses transcript text for addresses/cities, geocodes, checks zones, calculates drive time, deduplicates.

- [ ] **Step 1: Write failing tests for location extractor**

Create `tests/test_location_extractor.py`:

```python
import pytest
import math
from unittest.mock import AsyncMock, patch
from app.services.location_extractor import LocationExtractor


@pytest.fixture
def extractor():
    return LocationExtractor(call_sid="CA_test_123", market_slug="nashville")


def test_extract_city_from_text(extractor):
    """Detects city names in transcript text."""
    result = extractor.extract_location_from_text("Yeah we're in Spring Hill")
    assert result is not None
    assert result["source"] == "transcript"
    assert abs(result["lat"] - 35.7512) < 0.05
    assert result["address_text"] == "Spring Hill"


def test_extract_city_case_insensitive(extractor):
    result = extractor.extract_location_from_text("I'm over in columbia right now")
    assert result is not None
    assert result["address_text"] == "Columbia"


def test_extract_full_address(extractor):
    """Detects street address patterns."""
    result = extractor.extract_location_from_text("We're at 1205 Hampshire Pike in Columbia")
    assert result is not None
    assert "Hampshire Pike" in result["address_text"] or "Columbia" in result["address_text"]


def test_extract_street_mention(extractor):
    """Detects 'on [Street] Pike/Road/Drive' patterns."""
    result = extractor.extract_location_from_text("out on Bear Creek Pike")
    assert result is not None
    assert "Bear Creek Pike" in result["address_text"]


def test_no_location_in_text(extractor):
    result = extractor.extract_location_from_text("I need my septic pumped as soon as possible")
    assert result is None


def test_extract_do_you_service_pattern(extractor):
    """Detects 'do you service [City]?' pattern."""
    result = extractor.extract_location_from_text("Do you service Spring Hill?")
    assert result is not None
    assert result["address_text"] == "Spring Hill"


def test_zone_included_in_result(extractor):
    result = extractor.extract_location_from_text("I'm in Columbia")
    assert result is not None
    assert result["zone"] in ("core", "extended", "outside")


def test_drive_time_included(extractor):
    result = extractor.extract_location_from_text("I'm in Franklin")
    assert result is not None
    assert "drive_minutes" in result
    assert isinstance(result["drive_minutes"], (int, float))
    assert result["drive_minutes"] > 0


def test_confidence_city_name(extractor):
    result = extractor.extract_location_from_text("I'm in Spring Hill")
    assert result is not None
    assert result["confidence"] == 0.7


def test_confidence_address(extractor):
    result = extractor.extract_location_from_text("We're at 1205 Hampshire Pike in Columbia")
    assert result is not None
    assert result["confidence"] >= 0.8


def test_dedup_same_location(extractor):
    """Second mention of same city doesn't produce a new result."""
    result1 = extractor.extract_location_from_text("I'm in Columbia")
    assert result1 is not None
    result2 = extractor.extract_location_from_text("Yeah, Columbia, near the square")
    assert result2 is None  # Deduped


def test_dedup_different_location(extractor):
    """Different city produces a new result even after previous detection."""
    result1 = extractor.extract_location_from_text("I'm in Columbia")
    assert result1 is not None
    result2 = extractor.extract_location_from_text("Actually closer to Spring Hill")
    assert result2 is not None  # Different location


def test_dedup_higher_confidence_replaces(extractor):
    """Higher confidence for same area replaces lower confidence."""
    result1 = extractor.extract_location_from_text("I'm in Columbia")
    assert result1 is not None
    assert result1["confidence"] == 0.7
    result2 = extractor.extract_location_from_text("1205 Hampshire Pike in Columbia")
    assert result2 is not None  # Higher confidence replaces
    assert result2["confidence"] >= 0.8


def test_haversine_distance():
    from app.services.location_extractor import haversine_distance
    # Columbia to Nashville ~ 45 miles
    dist = haversine_distance(35.6145, -87.0353, 36.1627, -86.7816)
    assert 38 < dist < 52


def test_drive_time_estimate():
    from app.services.location_extractor import estimate_drive_minutes
    # 35 miles at 35 mph = 60 minutes
    minutes = estimate_drive_minutes(35.0)
    assert abs(minutes - 60) < 1
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/will/react-crm-api && python -m pytest tests/test_location_extractor.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement location extractor**

Create `app/services/location_extractor.py`:

```python
"""
Location extraction from call transcripts.

Parses transcript text for addresses, city names, and street references.
Geocodes via local city lookup (instant) or Nominatim (free, OSM).
Determines service zone and estimates drive time.
Deduplicates to avoid flooding the frontend with repeated events.
"""

import re
import math
import logging
import httpx
from typing import Optional

from app.services.market_config import (
    lookup_city,
    get_zone,
    get_market_by_slug,
)

logger = logging.getLogger(__name__)

# Columbia, TN base coordinates
BASE_LAT = 35.6145
BASE_LNG = -87.0353

# Dedup threshold: must be >0.5 miles apart to count as a new location
DEDUP_DISTANCE_MILES = 0.5

# Nominatim base URL (free, OSM-based geocoding)
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_HEADERS = {"User-Agent": "MacServicePlatform/1.0"}

# Regex patterns
ADDRESS_PATTERN = re.compile(
    r"(\d{1,5})\s+"                              # house number
    r"([\w\s]{2,30})"                             # street name
    r"\b(pike|road|rd|drive|dr|lane|ln|street|st|avenue|ave|boulevard|blvd|way|court|ct|circle|cir|highway|hwy)\b",
    re.IGNORECASE,
)

STREET_MENTION_PATTERN = re.compile(
    r"\bon\s+"                                    # "on"
    r"([\w\s]{2,30})"                             # street name
    r"\b(pike|road|rd|drive|dr|lane|ln|street|st|avenue|ave|boulevard|blvd|highway|hwy)\b",
    re.IGNORECASE,
)

SERVICE_QUESTION_PATTERN = re.compile(
    r"(?:do you|can you|you guys)\s+(?:service|cover|come to|go to|work in)\s+(.+?)(?:\?|$)",
    re.IGNORECASE,
)


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in miles."""
    R = 3959  # Earth radius in miles
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def estimate_drive_minutes(distance_miles: float) -> int:
    """Estimate drive time at 35 mph average."""
    return round(distance_miles / 35.0 * 60)


class LocationExtractor:
    """
    Extracts location from transcript text for a single call session.

    Usage:
        extractor = LocationExtractor(call_sid="CA123", market_slug="nashville")
        result = extractor.extract_location_from_text("I'm in Spring Hill")
        if result:
            # broadcast to frontend
    """

    def __init__(self, call_sid: str, market_slug: str):
        self.call_sid = call_sid
        self.market_slug = market_slug
        self.market = get_market_by_slug(market_slug)
        self.last_location: Optional[dict] = None

    def extract_location_from_text(self, text: str) -> Optional[dict]:
        """
        Parse transcript text for location signals. Returns location dict or None.

        Tries in order: full address, street mention, "do you service" pattern, city name.
        Returns None if no location found or if deduped.
        """
        result = None

        # 1. Full address ("1205 Hampshire Pike")
        addr_match = ADDRESS_PATTERN.search(text)
        if addr_match:
            number = addr_match.group(1)
            street = addr_match.group(2).strip()
            suffix = addr_match.group(3)
            address_text = f"{number} {street} {suffix}".title()
            # Try to find city context in the same text
            city_result = self._find_city_in_text(text)
            if city_result:
                result = {
                    **city_result,
                    "address_text": f"{address_text}, {city_result['address_text']}",
                    "confidence": 0.9,
                    "source": "transcript",
                }
            else:
                # Address without city — try geocoding the street in market context
                result = self._geocode_address(address_text)
                if result:
                    result["confidence"] = 0.8
            if result:
                return self._dedup_and_enrich(result, text)

        # 2. Street mention ("on Bear Creek Pike")
        street_match = STREET_MENTION_PATTERN.search(text)
        if street_match:
            street = street_match.group(1).strip()
            suffix = street_match.group(2)
            address_text = f"{street} {suffix}".title()
            result = self._geocode_address(address_text)
            if result:
                result["confidence"] = 0.8
                return self._dedup_and_enrich(result, text)

        # 3. "Do you service [City]?" pattern
        svc_match = SERVICE_QUESTION_PATTERN.search(text)
        if svc_match:
            candidate = svc_match.group(1).strip().rstrip("?.,!")
            city_result = lookup_city(candidate, self.market_slug)
            if city_result:
                result = {
                    "lat": city_result["lat"],
                    "lng": city_result["lng"],
                    "address_text": city_result["name"],
                    "confidence": 0.7,
                    "source": "transcript",
                }
                return self._dedup_and_enrich(result, text)

        # 4. City name anywhere in text
        city_result = self._find_city_in_text(text)
        if city_result:
            result = {
                **city_result,
                "confidence": 0.7,
                "source": "transcript",
            }
            return self._dedup_and_enrich(result, text)

        return None

    def _find_city_in_text(self, text: str) -> Optional[dict]:
        """Scan text for known city names in this market."""
        from app.services.market_config import CITY_TABLES

        table = CITY_TABLES.get(self.market_slug, {})
        text_lower = text.lower()
        best_match = None
        best_len = 0

        for city_key, city_data in table.items():
            if city_key in text_lower and len(city_key) > best_len:
                best_match = city_data
                best_len = len(city_key)

        if best_match:
            return {
                "lat": best_match["lat"],
                "lng": best_match["lng"],
                "address_text": best_match["name"],
                "source": "transcript",
            }
        return None

    def _geocode_address(self, address_text: str) -> Optional[dict]:
        """Geocode an address via Nominatim. Synchronous fallback for transcript parsing."""
        if not self.market:
            return None
        center = self.market["center"]
        try:
            with httpx.Client(timeout=3.0) as client:
                resp = client.get(
                    NOMINATIM_URL,
                    params={
                        "q": f"{address_text}, {self.market['name']}",
                        "format": "json",
                        "limit": 1,
                        "viewbox": f"{center['lng']-1},{center['lat']+1},{center['lng']+1},{center['lat']-1}",
                        "bounded": 1,
                    },
                    headers=NOMINATIM_HEADERS,
                )
                if resp.status_code == 200 and resp.json():
                    data = resp.json()[0]
                    return {
                        "lat": float(data["lat"]),
                        "lng": float(data["lon"]),
                        "address_text": address_text,
                        "source": "transcript",
                    }
        except Exception as e:
            logger.warning("Nominatim geocode failed for '%s': %s", address_text, e)
        return None

    def _dedup_and_enrich(self, result: dict, transcript_text: str) -> Optional[dict]:
        """Check dedup, add zone + drive time, update last_location."""
        lat, lng = result["lat"], result["lng"]
        confidence = result.get("confidence", 0.5)

        if self.last_location:
            dist = haversine_distance(
                self.last_location["lat"],
                self.last_location["lng"],
                lat,
                lng,
            )
            if dist < DEDUP_DISTANCE_MILES and confidence <= self.last_location.get("confidence", 0):
                return None  # Same place, same or lower confidence

        zone = get_zone(lat, lng, self.market_slug)
        base = self.market["center"] if self.market else {"lat": BASE_LAT, "lng": BASE_LNG}
        distance = haversine_distance(base["lat"], base["lng"], lat, lng)
        drive_minutes = estimate_drive_minutes(distance)

        enriched = {
            "lat": lat,
            "lng": lng,
            "source": result.get("source", "transcript"),
            "address_text": result["address_text"],
            "zone": zone,
            "drive_minutes": drive_minutes,
            "customer_id": result.get("customer_id"),
            "confidence": confidence,
            "transcript_excerpt": transcript_text.strip()[:120],
        }
        self.last_location = enriched
        return enriched
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/will/react-crm-api && python -m pytest tests/test_location_extractor.py -v`
Expected: All 16 tests PASS

- [ ] **Step 5: Commit**

```bash
cd /home/will/react-crm-api
git add app/services/location_extractor.py tests/test_location_extractor.py
git commit -m "feat: add location extractor for transcript parsing"
```

---

## Task 3: Backend — Integrate into Call Transcript WebSocket

**Files:**
- Modify: `app/services/call_transcript_manager.py` (add `broadcast_event` method)
- Modify: `app/api/v2/call_transcript_ws.py` (hook location extractor into transcript callback)

- [ ] **Step 1: Read current transcript manager**

Read `app/services/call_transcript_manager.py` to see exact `broadcast_transcript` implementation.

- [ ] **Step 2: Add `broadcast_event` method to TranscriptWSManager**

In `app/services/call_transcript_manager.py`, add after the existing `broadcast_transcript` method:

```python
async def broadcast_event(self, call_sid: str, event_type: str, data: dict) -> None:
    """Broadcast an arbitrary JSON event to all listeners for a call."""
    async with self._lock:
        connections = self._connections.get(call_sid, set())
    message = json.dumps({"type": event_type, "data": data})
    disconnected = set()
    for ws in connections:
        try:
            await ws.send_text(message)
        except Exception:
            disconnected.add(ws)
    if disconnected:
        async with self._lock:
            for ws in disconnected:
                self._connections.get(call_sid, set()).discard(ws)
```

Add `import json` at the top if not already present.

- [ ] **Step 3: Read current call_transcript_ws.py**

Read `app/api/v2/call_transcript_ws.py` to see exact `ws_twilio_media` handler.

- [ ] **Step 4: Hook LocationExtractor into Twilio media stream handler**

In `app/api/v2/call_transcript_ws.py`, modify the `ws_twilio_media` function:

Add imports at top of file:

```python
from app.services.location_extractor import LocationExtractor
from app.services.market_config import get_market_by_area_code, DEFAULT_MARKET_SLUG
from app.database import async_session_maker
from app.models.customer import Customer
from sqlalchemy import select, func
```

Inside `ws_twilio_media`, after the `call_sid` is known and the STT streamer is set up, add location extraction:

```python
# --- Location extraction setup ---
# Determine market from called number area code
called_number = ""  # Will be populated from start event
location_extractor = None

# In the event=="start" handler, after parsing tracks:
# Extract called number from Twilio stream start metadata
stream_start = data.get("start", {})
custom_params = stream_start.get("customParameters", {})
called_number = custom_params.get("called_number", "")
caller_number = custom_params.get("caller_number", "")

# Determine market from area code
area_code = ""
if called_number and len(called_number) >= 4:
    # Strip +1 prefix if present
    digits = called_number.lstrip("+").lstrip("1") if called_number.startswith(("+1", "1")) else called_number
    if len(digits) >= 10:
        area_code = digits[:3]

market = get_market_by_area_code(area_code) if area_code else get_market_by_area_code("")
location_extractor = LocationExtractor(
    call_sid=call_sid,
    market_slug=market["slug"],
)

# Customer phone lookup — immediate location if found
if caller_number:
    try:
        async with async_session_maker() as db:
            # Normalize phone: strip to last 10 digits
            digits_only = re.sub(r"\D", "", caller_number)
            if len(digits_only) > 10:
                digits_only = digits_only[-10:]
            result = await db.execute(
                select(Customer).where(
                    func.right(func.regexp_replace(Customer.phone, r"\D", "", "g"), 10) == digits_only,
                    Customer.is_active == True,
                ).limit(1)
            )
            customer = result.scalar_one_or_none()
            if customer and customer.latitude and customer.longitude:
                from app.services.market_config import get_zone
                from app.services.location_extractor import haversine_distance, estimate_drive_minutes

                lat = float(customer.latitude)
                lng = float(customer.longitude)
                zone = get_zone(lat, lng, market["slug"])
                center = market["center"]
                dist = haversine_distance(center["lat"], center["lng"], lat, lng)
                drive_min = estimate_drive_minutes(dist)

                location_data = {
                    "lat": lat,
                    "lng": lng,
                    "source": "customer_record",
                    "address_text": f"{customer.address_line1 or ''}, {customer.city or ''}, {customer.state or ''}".strip(", "),
                    "zone": zone,
                    "drive_minutes": drive_min,
                    "customer_id": str(customer.id),
                    "confidence": 0.95,
                    "transcript_excerpt": "",
                }
                location_extractor.last_location = location_data
                await transcript_manager.broadcast_event(call_sid, "location_detected", location_data)
    except Exception as e:
        logger.warning("Customer lookup failed for call %s: %s", call_sid, e)
```

Then modify the `on_transcript` callback inside `ws_twilio_media`:

```python
# Original callback:
async def on_transcript(text: str, is_final: bool):
    await transcript_manager.broadcast_transcript(call_sid, text, is_final, speaker="customer")

# Updated callback:
async def on_transcript(text: str, is_final: bool):
    await transcript_manager.broadcast_transcript(call_sid, text, is_final, speaker="customer")
    # Location extraction on final transcript chunks only
    if is_final and location_extractor:
        try:
            location = location_extractor.extract_location_from_text(text)
            if location:
                await transcript_manager.broadcast_event(
                    call_sid, "location_detected", location
                )
        except Exception as e:
            logger.warning("Location extraction failed: %s", e)
```

- [ ] **Step 5: Pass called/caller numbers through Twilio TwiML**

In `app/api/v2/twilio.py`, in the `twilio_voice_webhook` function, add custom parameters to the media stream so the WS handler can read them:

Find where `start.stream(url=stream_url, ...)` is called. Add custom parameters:

```python
# Before:
start.stream(url=stream_url, track="outbound_track")

# After:
caller_number = form.get("From", "")
called_number = form.get("To", "")
start.stream(url=stream_url, track="outbound_track")
# Add parameter elements for the media stream
start.parameter(name="caller_number", value=caller_number)
start.parameter(name="called_number", value=called_number)
```

- [ ] **Step 6: Commit**

```bash
cd /home/will/react-crm-api
git add app/services/call_transcript_manager.py app/api/v2/call_transcript_ws.py app/api/v2/twilio.py
git commit -m "feat: integrate location extraction into call transcript pipeline"
```

---

## Task 4: Backend — Service Markets REST API

**Files:**
- Create: `app/api/v2/service_markets.py`
- Modify: `app/main.py` (register router)

- [ ] **Step 1: Create service markets API**

Create `app/api/v2/service_markets.py`:

```python
"""
Service Markets API — read-only for now, admin can view market configs.
"""

from fastapi import APIRouter, Depends
from app.api.deps import CurrentUser
from app.services.market_config import MARKETS, CITY_TABLES

router = APIRouter(prefix="/service-markets", tags=["service-markets"])


@router.get("")
async def list_markets(current_user: CurrentUser):
    """List all configured service markets."""
    result = []
    for slug, market in MARKETS.items():
        result.append({
            "slug": market["slug"],
            "name": market["name"],
            "area_codes": market["area_codes"],
            "center": market["center"],
            "has_polygons": market.get("polygons") is not None,
            "city_count": len(CITY_TABLES.get(slug, {})),
        })
    return result


@router.get("/{slug}")
async def get_market(slug: str, current_user: CurrentUser):
    """Get full market config including polygons."""
    market = MARKETS.get(slug)
    if not market:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Market '{slug}' not found")
    return {
        **market,
        "cities": list(CITY_TABLES.get(slug, {}).values()),
    }


@router.get("/{slug}/zone-check")
async def check_zone(slug: str, lat: float, lng: float, current_user: CurrentUser):
    """Check which zone a coordinate falls in for a given market."""
    from app.services.market_config import get_zone
    from app.services.location_extractor import haversine_distance, estimate_drive_minutes

    market = MARKETS.get(slug)
    if not market:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Market '{slug}' not found")

    zone = get_zone(lat, lng, slug)
    center = market["center"]
    distance = haversine_distance(center["lat"], center["lng"], lat, lng)
    drive_minutes = estimate_drive_minutes(distance)

    return {
        "zone": zone,
        "drive_minutes": drive_minutes,
        "distance_miles": round(distance, 1),
        "market": market["name"],
    }
```

- [ ] **Step 2: Register router in main.py**

In `app/main.py`, add import and registration.

Add import near other router imports (around line 34):

```python
from app.api.v2.service_markets import router as service_markets_router
```

Add registration near other `api_router.include_router` calls:

```python
api_router.include_router(service_markets_router)
```

- [ ] **Step 3: Commit**

```bash
cd /home/will/react-crm-api
git add app/api/v2/service_markets.py app/main.py
git commit -m "feat: add service markets REST API"
```

- [ ] **Step 4: Push backend to GitHub**

```bash
cd /home/will/react-crm-api && git push
```

---

## Task 5: Frontend — Types + Zustand Store + Shared Components

**Files:**
- Create: `src/features/call-map/types.ts`
- Create: `src/features/call-map/callMapStore.ts`
- Create: `src/features/call-map/components/ZoneIndicator.tsx`
- Create: `src/features/call-map/components/DriveTimeChip.tsx`
- Create: `src/features/call-map/components/LocationSource.tsx`
- Create: `src/features/call-map/components/CustomerInfoCard.tsx`
- Create: `src/features/call-map/components/TranscriptHighlight.tsx`
- Create: `src/features/call-map/components/ZoneLegend.tsx`

- [ ] **Step 1: Create types**

Create `src/features/call-map/types.ts`:

```typescript
export type LocationSource = "customer_record" | "transcript" | "area_code";
export type ServiceZone = "core" | "extended" | "outside";

export interface DetectedLocation {
  lat: number;
  lng: number;
  source: LocationSource;
  address_text: string;
  zone: ServiceZone;
  drive_minutes: number;
  customer_id: string | null;
  confidence: number;
  transcript_excerpt: string;
}

export interface LocationDetectedEvent {
  type: "location_detected";
  data: DetectedLocation;
}

export interface CallMapState {
  location: DetectedLocation | null;
  isVisible: boolean;
  isExpanded: boolean;
  activeCallSid: string | null;

  setLocation: (location: DetectedLocation) => void;
  clearLocation: () => void;
  setVisible: (visible: boolean) => void;
  setExpanded: (expanded: boolean) => void;
  setActiveCallSid: (callSid: string | null) => void;
  reset: () => void;
}
```

- [ ] **Step 2: Create Zustand store**

Create `src/features/call-map/callMapStore.ts`:

```typescript
import { create } from "zustand";
import type { CallMapState, DetectedLocation } from "./types";

export const useCallMapStore = create<CallMapState>((set, get) => ({
  location: null,
  isVisible: false,
  isExpanded: false,
  activeCallSid: null,

  setLocation: (location: DetectedLocation) => {
    const current = get().location;
    // Only update if new location has higher confidence or is a different place
    if (current && location.confidence <= current.confidence) {
      const latDiff = Math.abs(location.lat - current.lat);
      const lngDiff = Math.abs(location.lng - current.lng);
      if (latDiff < 0.008 && lngDiff < 0.008) {
        return; // Same place, same or lower confidence — skip
      }
    }
    set({ location, isVisible: true });
  },

  clearLocation: () => set({ location: null }),

  setVisible: (isVisible: boolean) => set({ isVisible }),

  setExpanded: (isExpanded: boolean) => set({ isExpanded }),

  setActiveCallSid: (activeCallSid: string | null) => set({ activeCallSid }),

  reset: () =>
    set({
      location: null,
      isVisible: false,
      isExpanded: false,
      activeCallSid: null,
    }),
}));
```

- [ ] **Step 3: Create ZoneIndicator component**

Create `src/features/call-map/components/ZoneIndicator.tsx`:

```typescript
import type { ServiceZone } from "../types";

const ZONE_CONFIG: Record<ServiceZone, { label: string; icon: string; className: string }> = {
  core: {
    label: "Core Service Area",
    icon: "✓",
    className: "text-green-600 bg-green-50 border-green-200",
  },
  extended: {
    label: "Extended Service Area",
    icon: "⚠",
    className: "text-amber-600 bg-amber-50 border-amber-200",
  },
  outside: {
    label: "Outside Service Area",
    icon: "✗",
    className: "text-red-600 bg-red-50 border-red-200",
  },
};

interface ZoneIndicatorProps {
  zone: ServiceZone;
  compact?: boolean;
}

export function ZoneIndicator({ zone, compact = false }: ZoneIndicatorProps) {
  const config = ZONE_CONFIG[zone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${config.className}`}
    >
      <span>{config.icon}</span>
      {!compact && <span>{config.label}</span>}
    </span>
  );
}
```

- [ ] **Step 4: Create DriveTimeChip component**

Create `src/features/call-map/components/DriveTimeChip.tsx`:

```typescript
interface DriveTimeChipProps {
  minutes: number;
}

export function DriveTimeChip({ minutes }: DriveTimeChipProps) {
  const display =
    minutes < 60
      ? `~${minutes} min`
      : `~${Math.round(minutes / 60 * 10) / 10} hr`;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <span>🚗</span>
      <span>{display} from base</span>
    </span>
  );
}
```

- [ ] **Step 5: Create LocationSource component**

Create `src/features/call-map/components/LocationSource.tsx`:

```typescript
import type { LocationSource as LocationSourceType } from "../types";

const SOURCE_LABELS: Record<LocationSourceType, string> = {
  customer_record: "Customer record",
  transcript: "Live transcript",
  area_code: "Area code",
};

interface LocationSourceProps {
  source: LocationSourceType;
  excerpt?: string;
}

export function LocationSource({ source, excerpt }: LocationSourceProps) {
  return (
    <div className="text-xs text-muted-foreground">
      <span>Source: {SOURCE_LABELS[source]}</span>
      {excerpt && (
        <span className="italic"> — "{excerpt}"</span>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create CustomerInfoCard component**

Create `src/features/call-map/components/CustomerInfoCard.tsx`:

```typescript
interface CustomerInfoCardProps {
  customerId: string;
  addressText: string;
}

export function CustomerInfoCard({ customerId, addressText }: CustomerInfoCardProps) {
  return (
    <div className="rounded-md border border-indigo-200 bg-indigo-50 p-2">
      <div className="text-xs font-medium text-indigo-700">Existing Customer</div>
      <div className="text-sm text-indigo-900">{addressText}</div>
      <a
        href={`/customers/${customerId}`}
        className="text-xs text-indigo-600 underline hover:text-indigo-800"
      >
        View profile →
      </a>
    </div>
  );
}
```

- [ ] **Step 7: Create TranscriptHighlight component**

Create `src/features/call-map/components/TranscriptHighlight.tsx`:

```typescript
interface TranscriptHighlightProps {
  text: string;
}

export function TranscriptHighlight({ text }: TranscriptHighlightProps) {
  if (!text) return null;
  return (
    <div className="rounded-md bg-muted/50 px-2 py-1.5 text-xs italic text-muted-foreground">
      "{text}"
    </div>
  );
}
```

- [ ] **Step 8: Create ZoneLegend component**

Create `src/features/call-map/components/ZoneLegend.tsx`:

```typescript
export function ZoneLegend() {
  return (
    <div className="rounded-lg bg-white/90 p-2 text-xs shadow-sm backdrop-blur">
      <div className="mb-1 flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-full border-2 border-red-500 bg-red-500/10" />
        <span className="text-foreground">Core Service Area</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-full border-2 border-dashed border-amber-500 bg-amber-500/10" />
        <span className="text-foreground">Extended Service Area</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Commit**

```bash
cd /home/will/ReactCRM
git add src/features/call-map/
git commit -m "feat: add call-map types, store, and shared components"
```

---

## Task 6: Frontend — Map Components (MiniMap + FullMap)

**Files:**
- Create: `src/features/call-map/data/nashville-zones.json`
- Create: `src/features/call-map/components/MiniMap.tsx`
- Create: `src/features/call-map/components/FullMap.tsx`

- [ ] **Step 1: Create Nashville zone GeoJSON data**

Create `src/features/call-map/data/nashville-zones.json`:

```json
{
  "core": {
    "type": "Feature",
    "properties": { "zone": "core", "name": "Nashville Core Service Area" },
    "geometry": {
      "type": "Polygon",
      "coordinates": [[
        [-86.93, 35.76],
        [-86.76, 35.73],
        [-86.70, 35.60],
        [-86.78, 35.46],
        [-86.95, 35.42],
        [-87.12, 35.45],
        [-87.20, 35.55],
        [-87.15, 35.68],
        [-86.93, 35.76]
      ]]
    }
  },
  "extended": {
    "type": "Feature",
    "properties": { "zone": "extended", "name": "Nashville Extended Service Area" },
    "geometry": {
      "type": "Polygon",
      "coordinates": [[
        [-86.80, 36.32],
        [-86.30, 36.28],
        [-86.05, 36.05],
        [-86.25, 35.78],
        [-86.55, 35.40],
        [-87.00, 35.30],
        [-87.30, 35.35],
        [-87.45, 35.55],
        [-87.45, 35.85],
        [-87.25, 36.15],
        [-87.05, 36.32],
        [-86.80, 36.32]
      ]]
    }
  }
}
```

- [ ] **Step 2: Create MiniMap component**

Create `src/features/call-map/components/MiniMap.tsx`:

```typescript
import { useRef, useEffect } from "react";
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

interface MiniMapProps {
  lat: number;
  lng: number;
  zoom?: number;
}

export function MiniMap({ lat, lng, zoom = 11 }: MiniMapProps) {
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1200 });
  }, [lat, lng, zoom]);

  return (
    <div className="h-[200px] w-full overflow-hidden rounded-md">
      <Map
        ref={mapRef}
        mapStyle={MAP_STYLE}
        initialViewState={{ longitude: lng, latitude: lat, zoom }}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        interactive={false}
      >
        <Marker longitude={lng} latitude={lat} anchor="bottom">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 shadow-lg ring-2 ring-white">
            <div className="h-2 w-2 rounded-full bg-white" />
          </div>
        </Marker>
      </Map>
    </div>
  );
}
```

- [ ] **Step 3: Create FullMap component**

Create `src/features/call-map/components/FullMap.tsx`:

```typescript
import { useRef, useEffect, useCallback } from "react";
import Map, {
  Marker,
  NavigationControl,
  ScaleControl,
  Source,
  Layer,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import nashvilleZones from "../data/nashville-zones.json";
import { ZoneLegend } from "./ZoneLegend";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

interface FullMapProps {
  lat: number;
  lng: number;
  marketSlug?: string;
}

export function FullMap({ lat, lng, marketSlug = "nashville" }: FullMapProps) {
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 11, duration: 1200 });
  }, [lat, lng]);

  const showZones = marketSlug === "nashville";

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        mapStyle={MAP_STYLE}
        initialViewState={{ longitude: lng, latitude: lat, zoom: 10 }}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" />

        {showZones && (
          <>
            <Source id="zone-extended" type="geojson" data={nashvilleZones.extended}>
              <Layer
                id="zone-extended-fill"
                type="fill"
                paint={{ "fill-color": "#f59e0b", "fill-opacity": 0.06 }}
              />
              <Layer
                id="zone-extended-line"
                type="line"
                paint={{
                  "line-color": "#f59e0b",
                  "line-width": 2,
                  "line-dasharray": [4, 3],
                  "line-opacity": 0.7,
                }}
              />
            </Source>
            <Source id="zone-core" type="geojson" data={nashvilleZones.core}>
              <Layer
                id="zone-core-fill"
                type="fill"
                paint={{ "fill-color": "#ef4444", "fill-opacity": 0.08 }}
              />
              <Layer
                id="zone-core-line"
                type="line"
                paint={{ "line-color": "#ef4444", "line-width": 2, "line-opacity": 0.7 }}
              />
            </Source>
          </>
        )}

        <Marker longitude={lng} latitude={lat} anchor="bottom">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 shadow-lg ring-3 ring-white">
            <div className="h-3 w-3 rounded-full bg-white" />
          </div>
        </Marker>
      </Map>

      {showZones && (
        <div className="absolute bottom-3 left-3">
          <ZoneLegend />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd /home/will/ReactCRM
git add src/features/call-map/data/ src/features/call-map/components/MiniMap.tsx src/features/call-map/components/FullMap.tsx
git commit -m "feat: add MiniMap and FullMap with zone polygon overlays"
```

---

## Task 7: Frontend — CallMapFloater

**Files:**
- Create: `src/features/call-map/CallMapFloater.tsx`

- [ ] **Step 1: Create the floating pop-over component**

Create `src/features/call-map/CallMapFloater.tsx`:

```typescript
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, Maximize2 } from "lucide-react";
import { useCallMapStore } from "./callMapStore";
import { MiniMap } from "./components/MiniMap";
import { ZoneIndicator } from "./components/ZoneIndicator";
import { DriveTimeChip } from "./components/DriveTimeChip";
import { LocationSource } from "./components/LocationSource";
import { CustomerInfoCard } from "./components/CustomerInfoCard";

export function CallMapFloater() {
  const navigate = useNavigate();
  const { location, isVisible, isExpanded, activeCallSid, setVisible, setExpanded } =
    useCallMapStore();
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hide 5s after call ends
  useEffect(() => {
    if (!activeCallSid && isVisible && location) {
      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, 5000);
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [activeCallSid, isVisible, location, setVisible]);

  // Don't show if expanded (panel is showing instead) or not visible or no location
  if (!location || !isVisible || isExpanded) return null;

  const handleOpenFullView = () => {
    setExpanded(true);
    setVisible(false);
    navigate("/phone");
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[380px] overflow-hidden rounded-xl border border-border bg-bg-card shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-2 bg-[#1a1a2e] px-3 py-2 text-white">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        <span className="text-sm font-semibold">📍 Location Detected</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={handleOpenFullView}
            className="rounded p-1 hover:bg-white/10"
            title="Open full view"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setVisible(false)}
            className="rounded p-1 hover:bg-white/10"
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Mini map */}
      <MiniMap lat={location.lat} lng={location.lng} />

      {/* Info section */}
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between">
          <ZoneIndicator zone={location.zone} />
          <DriveTimeChip minutes={location.drive_minutes} />
        </div>

        <div className="text-sm font-medium text-foreground">
          📍 {location.address_text}
        </div>

        {location.customer_id && (
          <CustomerInfoCard
            customerId={location.customer_id}
            addressText={location.address_text}
          />
        )}

        <LocationSource
          source={location.source}
          excerpt={location.transcript_excerpt}
        />

        <button
          onClick={handleOpenFullView}
          className="w-full text-center text-xs font-medium text-indigo-600 hover:text-indigo-800"
        >
          Open Full View →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/will/ReactCRM
git add src/features/call-map/CallMapFloater.tsx
git commit -m "feat: add CallMapFloater pop-over component"
```

---

## Task 8: Frontend — CallMapPanel + SoftPhone Integration

**Files:**
- Create: `src/features/call-map/CallMapPanel.tsx`
- Modify: `src/features/phone/SoftPhone.tsx`

- [ ] **Step 1: Create CallMapPanel component**

Create `src/features/call-map/CallMapPanel.tsx`:

```typescript
import { useCallMapStore } from "./callMapStore";
import { FullMap } from "./components/FullMap";
import { ZoneIndicator } from "./components/ZoneIndicator";
import { DriveTimeChip } from "./components/DriveTimeChip";
import { LocationSource } from "./components/LocationSource";
import { CustomerInfoCard } from "./components/CustomerInfoCard";
import { TranscriptHighlight } from "./components/TranscriptHighlight";
import { X } from "lucide-react";

export function CallMapPanel() {
  const { location, isExpanded, setExpanded } = useCallMapStore();

  if (!isExpanded || !location) return null;

  return (
    <div className="flex h-full w-full flex-col border-l border-border bg-bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h3 className="text-sm font-semibold text-foreground">Caller Location</h3>
        <button
          onClick={() => setExpanded(false)}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Map */}
      <div className="min-h-[300px] flex-1">
        <FullMap lat={location.lat} lng={location.lng} />
      </div>

      {/* Info panel */}
      <div className="space-y-3 border-t border-border p-4">
        <div className="flex items-center justify-between">
          <ZoneIndicator zone={location.zone} />
          <DriveTimeChip minutes={location.drive_minutes} />
        </div>

        <div className="text-sm font-medium text-foreground">
          📍 {location.address_text}
        </div>

        {location.customer_id && (
          <CustomerInfoCard
            customerId={location.customer_id}
            addressText={location.address_text}
          />
        )}

        {location.transcript_excerpt && (
          <TranscriptHighlight text={location.transcript_excerpt} />
        )}

        <LocationSource
          source={location.source}
          excerpt={location.source === "transcript" ? undefined : location.transcript_excerpt}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Read current SoftPhone.tsx**

Read `src/features/phone/SoftPhone.tsx` to understand the current layout before modifying.

- [ ] **Step 3: Integrate CallMapPanel into SoftPhone**

In `src/features/phone/SoftPhone.tsx`, add the map panel alongside the phone controls. The exact integration depends on the current layout, but the approach is:

Add import at top:

```typescript
import { CallMapPanel } from "@/features/call-map/CallMapPanel";
import { useCallMapStore } from "@/features/call-map/callMapStore";
```

In the component body, read expansion state:

```typescript
const isMapExpanded = useCallMapStore((s) => s.isExpanded);
```

Wrap the existing SoftPhone content and the CallMapPanel in a flex container. When `isMapExpanded` is true, the phone controls take 45% width and the map takes 55%:

```typescript
// If map is expanded, show side-by-side layout
if (isMapExpanded) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex h-[500px] w-[700px] overflow-hidden rounded-xl border border-border bg-bg-card shadow-2xl">
      <div className="w-[45%] overflow-y-auto">
        {/* Existing SoftPhone content */}
      </div>
      <div className="w-[55%]">
        <CallMapPanel />
      </div>
    </div>
  );
}

// Otherwise render normal SoftPhone
return (
  // ... existing SoftPhone JSX unchanged
);
```

- [ ] **Step 4: Commit**

```bash
cd /home/will/ReactCRM
git add src/features/call-map/CallMapPanel.tsx src/features/phone/SoftPhone.tsx
git commit -m "feat: add CallMapPanel and integrate into SoftPhone"
```

---

## Task 9: Frontend — CallMapProvider + App.tsx Wiring

**Files:**
- Create: `src/features/call-map/CallMapProvider.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Read App.tsx**

Read `src/App.tsx` to see exact provider nesting order.

- [ ] **Step 2: Create CallMapProvider**

Create `src/features/call-map/CallMapProvider.tsx`:

```typescript
import { useEffect, useRef, type ReactNode } from "react";
import { useCallMapStore } from "./callMapStore";
import { CallMapFloater } from "./CallMapFloater";
import type { DetectedLocation } from "./types";

interface CallMapProviderProps {
  children: ReactNode;
}

/**
 * Listens for active calls and connects to the call transcript WebSocket
 * to receive location_detected events. Renders the CallMapFloater globally.
 */
export function CallMapProvider({ children }: CallMapProviderProps) {
  const { setLocation, setActiveCallSid, reset } = useCallMapStore();
  const wsRef = useRef<WebSocket | null>(null);
  const activeCallSid = useCallMapStore((s) => s.activeCallSid);

  // Connect to call transcript WS when a call is active
  useEffect(() => {
    if (!activeCallSid) {
      // No active call — close WS if open
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const apiBase = import.meta.env.VITE_API_URL || "";
    // WS endpoint is at root, not /api/v2
    const wsBase = apiBase
      .replace(/\/api\/v2$/, "")
      .replace(/^https:/, "wss:")
      .replace(/^http:/, "ws:");
    const wsUrl = `${wsBase}/ws/call-transcript/${activeCallSid}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "location_detected" && msg.data) {
          const loc: DetectedLocation = msg.data;
          setLocation(loc);
        }
        // Ignore transcript messages — other components handle those
      } catch {
        // Not JSON or malformed — ignore
      }
    };

    ws.onerror = () => {
      // Silent failure — map is purely additive
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [activeCallSid, setLocation]);

  return (
    <>
      {children}
      <CallMapFloater />
    </>
  );
}
```

- [ ] **Step 3: Create a hook to bridge phone context → callMapStore**

The CallMapProvider needs to know the active call SID. The phone context (`useSharedWebPhone`) provides `activeCall`, but it's only available inside the `WebPhoneProvider`. We need a bridge component.

Create `src/features/call-map/useCallMapBridge.ts`:

```typescript
import { useEffect } from "react";
import { useCallMapStore } from "./callMapStore";

/**
 * Bridge hook: connects phone state to callMapStore.
 * Call this inside a component that has access to useSharedWebPhone.
 *
 * Usage: place <CallMapBridge /> inside the provider tree where
 * useSharedWebPhone is available.
 */
export function useCallMapBridge(activeCall: { session?: any } | null) {
  const { setActiveCallSid, reset } = useCallMapStore();

  useEffect(() => {
    if (activeCall?.session) {
      // Twilio Voice SDK: call.parameters.CallSid
      // RingCentral: session.id
      const callSid =
        activeCall.session?.parameters?.CallSid ||
        activeCall.session?.callId ||
        activeCall.session?.id ||
        null;
      if (callSid) {
        setActiveCallSid(callSid);
      }
    } else {
      // Call ended — trigger auto-hide timer (store still has location)
      setActiveCallSid(null);
    }
  }, [activeCall, setActiveCallSid, reset]);
}
```

Then create a small bridge component that can sit inside the provider tree:

Create `src/features/call-map/CallMapBridge.tsx`:

```typescript
import { useSharedWebPhone } from "@/context/WebPhoneContext";
import { useCallMapBridge } from "./useCallMapBridge";

/**
 * Silent bridge component — no UI, just connects phone state to call map store.
 * Must be rendered inside WebPhoneProvider.
 */
export function CallMapBridge() {
  const { activeCall } = useSharedWebPhone();
  useCallMapBridge(activeCall);
  return null;
}
```

- [ ] **Step 4: Wire into App.tsx**

In `src/App.tsx`, add the CallMapProvider and CallMapBridge:

Add imports:

```typescript
import { CallMapProvider } from "@/features/call-map/CallMapProvider";
import { CallMapBridge } from "@/features/call-map/CallMapBridge";
```

Wrap the provider tree. Add `CallMapProvider` just inside `WebSocketProvider` (so it has access to WS infrastructure), and add `CallMapBridge` inside `BrowserRouter` (so it has access to WebPhoneProvider):

```typescript
<WebSocketProvider autoConnect>
  <CallMapProvider>
    <SessionTimeoutProvider>
      <BrowserRouter basename="/">
        <EntityProvider>
          <RoleProvider>
            <PWAProvider>
              <CallMapBridge />
              <OfflineIndicator />
              <AppRoutes />
            </PWAProvider>
          </RoleProvider>
        </EntityProvider>
      </BrowserRouter>
    </SessionTimeoutProvider>
  </CallMapProvider>
</WebSocketProvider>
```

Note: If `useSharedWebPhone` is not available at the `PWAProvider` level (it may be nested differently), move `CallMapBridge` to wherever `WebPhoneProvider` wraps. Read the actual nesting in `App.tsx` to place it correctly.

- [ ] **Step 5: Commit**

```bash
cd /home/will/ReactCRM
git add src/features/call-map/CallMapProvider.tsx src/features/call-map/useCallMapBridge.ts src/features/call-map/CallMapBridge.tsx src/App.tsx
git commit -m "feat: add CallMapProvider and wire into App"
```

---

## Task 10: Build, Deploy, and Playwright E2E Tests

**Files:**
- Create: `e2e/features/call-map.spec.ts`

- [ ] **Step 1: Build frontend**

```bash
cd /home/will/ReactCRM && npm run build
```

Expected: Build succeeds with no errors. If it fails, fix TypeScript/import errors and retry.

- [ ] **Step 2: Push frontend + backend**

```bash
cd /home/will/ReactCRM && git push
cd /home/will/react-crm-api && git push
```

- [ ] **Step 3: Wait for Railway deploy (~2 min), verify health**

```bash
curl -s https://react-crm-api-production.up.railway.app/health | head -20
```

- [ ] **Step 4: Verify service-markets API endpoint**

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  https://react-crm-api-production.up.railway.app/api/v2/service-markets | python3 -m json.tool
```

Expected: Returns list of markets (nashville, san_marcos).

- [ ] **Step 5: Verify zone-check endpoint**

```bash
# Columbia, TN — should be "core"
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://react-crm-api-production.up.railway.app/api/v2/service-markets/nashville/zone-check?lat=35.6145&lng=-87.0353" \
  | python3 -m json.tool

# Nashville — should be "extended"
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://react-crm-api-production.up.railway.app/api/v2/service-markets/nashville/zone-check?lat=36.16&lng=-86.78" \
  | python3 -m json.tool
```

- [ ] **Step 6: Create Playwright E2E test**

Create `e2e/features/call-map.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

const BASE = "https://react.ecbtx.com";
const API = "https://react-crm-api-production.up.railway.app/api/v2";

test.describe("Call Map Feature", () => {
  test("service-markets API returns Nashville market", async ({ request }) => {
    // Login first to get token
    const loginResp = await request.post(`${API}/auth/login`, {
      data: { email: "will@macseptic.com", password: "test" },
    });
    const { access_token } = await loginResp.json();

    const resp = await request.get(`${API}/service-markets`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(resp.ok()).toBeTruthy();
    const markets = await resp.json();
    expect(markets.length).toBeGreaterThanOrEqual(2);
    const nashville = markets.find((m: any) => m.slug === "nashville");
    expect(nashville).toBeTruthy();
    expect(nashville.has_polygons).toBe(true);
  });

  test("zone-check returns core for Columbia, TN", async ({ request }) => {
    const loginResp = await request.post(`${API}/auth/login`, {
      data: { email: "will@macseptic.com", password: "test" },
    });
    const { access_token } = await loginResp.json();

    const resp = await request.get(
      `${API}/service-markets/nashville/zone-check?lat=35.6145&lng=-87.0353`,
      { headers: { Authorization: `Bearer ${access_token}` } },
    );
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    expect(data.zone).toBe("core");
    expect(data.drive_minutes).toBeLessThan(5);
  });

  test("zone-check returns extended for Nashville", async ({ request }) => {
    const loginResp = await request.post(`${API}/auth/login`, {
      data: { email: "will@macseptic.com", password: "test" },
    });
    const { access_token } = await loginResp.json();

    const resp = await request.get(
      `${API}/service-markets/nashville/zone-check?lat=36.16&lng=-86.78`,
      { headers: { Authorization: `Bearer ${access_token}` } },
    );
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    expect(data.zone).toBe("extended");
  });

  test("zone-check returns outside for far away location", async ({ request }) => {
    const loginResp = await request.post(`${API}/auth/login`, {
      data: { email: "will@macseptic.com", password: "test" },
    });
    const { access_token } = await loginResp.json();

    const resp = await request.get(
      `${API}/service-markets/nashville/zone-check?lat=40.0&lng=-80.0`,
      { headers: { Authorization: `Bearer ${access_token}` } },
    );
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    expect(data.zone).toBe("outside");
  });

  test("phone page loads without errors", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "test");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 10000 });

    await page.goto(`${BASE}/phone`);
    await page.waitForLoadState("networkidle");

    // Page should load without console errors
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.waitForTimeout(2000);

    // Filter out known non-blocking errors (401 from optional endpoints, etc.)
    const blockingErrors = errors.filter(
      (e) => !e.includes("401") && !e.includes("403") && !e.includes("WebSocket"),
    );
    expect(blockingErrors).toHaveLength(0);
  });

  test("call-map floater not visible when no active call", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "test");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 10000 });

    // Floater should not be visible when there's no active call
    const floater = page.locator("text=Location Detected");
    await expect(floater).not.toBeVisible();
  });
});
```

- [ ] **Step 7: Run Playwright tests**

```bash
cd /home/will/ReactCRM && npx playwright test e2e/features/call-map.spec.ts --reporter=list
```

Expected: All tests PASS. If any fail, diagnose and fix.

- [ ] **Step 8: Final commit and push**

```bash
cd /home/will/ReactCRM
git add e2e/features/call-map.spec.ts
git commit -m "test: add Playwright E2E tests for call map feature"
git push
```

---

## Implementation Notes

### Nashville Polygon Coordinates
The polygon coordinates in `market_config.py` and `nashville-zones.json` are **approximations** from the Google Earth screenshot. After implementation, the user should:
1. Export exact coordinates from the Google Earth KML file
2. Update both `NASHVILLE_CORE_POLYGON` and `NASHVILLE_EXTENDED_POLYGON` in `market_config.py`
3. Update `src/features/call-map/data/nashville-zones.json` to match

### WebSocket Production Status
The general CRM WebSocket (`/api/v2/ws`) is currently disabled in production (403). The call transcript WebSocket (`/ws/call-transcript/{call_sid}`) is a **separate endpoint** mounted at the app root and should work independently. If it also returns 403, the map feature degrades gracefully — no floater appears, no errors, existing call functionality unaffected.

### Package Dependencies
- **Backend**: No new pip packages required (pure Python point-in-polygon, httpx already installed for Nominatim)
- **Frontend**: No new npm packages required (maplibre-gl, react-map-gl, zustand, lucide-react all already installed)

### Build Config
Per CLAUDE.md: `vite.config.ts`, `tsconfig.json`, `package.json`, and `tailwind.config.ts` are **PROTECTED** and must not be modified.
