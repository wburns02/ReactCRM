"""
Configuration for National Septic Permit Scrapers.

Contains test queries, portal configurations, and scraper settings.
"""

from typing import Dict, List, Any
from dataclasses import dataclass


# =============================================================================
# Test Addresses by State (for validation testing)
# =============================================================================

TEST_ADDRESSES: Dict[str, List[str]] = {
    # Florida - eBridge/OSTDS
    "FL": [
        "123 Main St, Orlando",
        "456 Oak Ave, Tampa",
        "789 Palm Dr, Miami",
        "321 Beach Rd, Jacksonville",
        "654 Pine St, Tallahassee",
    ],

    # Minnesota - MPCA SSTS
    "MN": [
        "100 Lake Rd, Minneapolis",
        "200 River St, St Paul",
        "300 Forest Ave, Duluth",
        "400 Prairie Dr, Rochester",
        "500 Valley Rd, Bloomington",
    ],

    # Vermont - DEC Wastewater
    "VT": [
        "10 Mountain Rd, Burlington",
        "20 Valley St, Montpelier",
        "30 River Rd, Rutland",
        "40 Lake Ave, Bennington",
        "50 Hill Dr, Brattleboro",
    ],

    # New Hampshire - SSB OneStop
    "NH": [
        "100 Main St, Concord",
        "200 Lake Rd, Manchester",
        "300 Mountain Ave, Nashua",
        "400 River St, Portsmouth",
        "500 Valley Dr, Keene",
    ],

    # Delaware - DNREC
    "DE": [
        "100 Beach Rd, Lewes",
        "200 Bay Dr, Rehoboth Beach",
        "300 Farm Rd, Dover",
        "400 Creek St, Wilmington",
        "500 Pond Ave, Newark",
    ],

    # Tennessee - TDEC
    "TN": [
        "100 Mountain Rd, Knoxville",
        "200 River Dr, Chattanooga",
        "300 Valley St, Clarksville",
        "400 Lake Ave, Murfreesboro",
        "500 Creek Rd, Jackson",
    ],

    # New Mexico - NMED
    "NM": [
        "100 Desert Rd, Albuquerque",
        "200 Mountain Ave, Santa Fe",
        "300 Mesa Dr, Las Cruces",
        "400 Canyon St, Rio Rancho",
        "500 Valley Rd, Roswell",
    ],

    # Maine - Septic Plans
    "ME": [
        "100 Coast Rd, Portland",
        "200 Lake Ave, Augusta",
        "300 Forest Dr, Bangor",
        "400 River St, Lewiston",
        "500 Bay Rd, Brunswick",
    ],

    # Rhode Island - OWTS
    "RI": [
        "100 Bay Rd, Providence",
        "200 Beach Ave, Warwick",
        "300 Ocean Dr, Cranston",
        "400 Shore St, Newport",
        "500 Hill Rd, Pawtucket",
    ],

    # Texas - Various counties
    "TX": [
        "100 Ranch Rd, Houston",
        "200 Prairie Dr, Dallas",
        "300 Hill Country Rd, Austin",
        "400 Desert Ave, San Antonio",
        "500 Gulf Dr, Corpus Christi",
    ],

    # California - Regional boards
    "CA": [
        "100 Valley Rd, Sacramento",
        "200 Coast Ave, San Diego",
        "300 Mountain Dr, Fresno",
        "400 Desert Rd, Palm Springs",
        "500 Forest Ave, Santa Rosa",
    ],
}


# =============================================================================
# Test Parcel Numbers by County
# =============================================================================

TEST_PARCELS: Dict[str, List[str]] = {
    # Arizona - Maricopa County
    "AZ_Maricopa": [
        "123-45-678",
        "234-56-789",
        "345-67-890",
    ],

    # Arizona - Pima County
    "AZ_Pima": [
        "111-22-3330",
        "222-33-4440",
        "333-44-5550",
    ],

    # Nevada - Clark County
    "NV_Clark": [
        "163-11-111-111",
        "174-22-222-222",
        "185-33-333-333",
    ],

    # California - Riverside County
    "CA_Riverside": [
        "123-456-001",
        "234-567-002",
        "345-678-003",
    ],

    # Washington - King County
    "WA_King": [
        "1234567890",
        "2345678901",
        "3456789012",
    ],

    # Oregon - Clackamas County
    "OR_Clackamas": [
        "12345678",
        "23456789",
        "34567890",
    ],
}


# =============================================================================
# Portal Configurations by Platform
# =============================================================================

@dataclass
class PortalConfig:
    """Configuration for a specific portal."""
    name: str
    state: str
    base_url: str
    platform: str
    search_methods: List[str]
    requires_playwright: bool = False
    requires_login: bool = False
    rate_limit_seconds: float = 1.0
    notes: str = ""


PORTAL_CONFIGS: Dict[str, PortalConfig] = {
    # =================================
    # Custom State Portals (Tier 1)
    # =================================

    "florida_ebridge": PortalConfig(
        name="Florida eBridge/OSTDS",
        state="FL",
        base_url="https://www.floridahealth.gov/environmental-health/onsite-sewage/index.html",
        platform="custom",
        search_methods=["address", "parcel", "permit"],
        requires_playwright=True,
        notes="Transitioning to DEP 2025-2026"
    ),

    "minnesota_ssts": PortalConfig(
        name="Minnesota MPCA SSTS",
        state="MN",
        base_url="https://webapp.pca.state.mn.us/ssts/",
        platform="custom",
        search_methods=["address", "parcel"],
        requires_playwright=True,
    ),

    "vermont_dec": PortalConfig(
        name="Vermont DEC Wastewater",
        state="VT",
        base_url="https://anrweb.vt.gov/DEC/WWDocs/Default.aspx",
        platform="custom",
        search_methods=["permit", "town", "owner", "address"],
        requires_playwright=False,
    ),

    "new_hampshire_ssb": PortalConfig(
        name="New Hampshire SSB OneStop",
        state="NH",
        base_url="https://www4.des.state.nh.us/SSBOneStop/mainmenu.aspx",
        platform="custom",
        search_methods=["address", "owner", "designer", "permit"],
        requires_playwright=False,
    ),

    "delaware_dnrec": PortalConfig(
        name="Delaware DNREC",
        state="DE",
        base_url="https://dnrec.delaware.gov/water/digital-resources/septic-system-applications/",
        platform="custom",
        search_methods=["address", "parcel", "owner", "permit"],
        requires_playwright=False,
    ),

    "tennessee_tdec": PortalConfig(
        name="Tennessee TDEC FileNet",
        state="TN",
        base_url="https://tdec.tn.gov/filenetsearch",
        platform="filenet",
        search_methods=["address", "permit"],
        requires_playwright=True,
        notes="Excludes 9 metro counties"
    ),

    "new_mexico_nmed": PortalConfig(
        name="New Mexico NMED Permit Finder",
        state="NM",
        base_url="https://lwop.waste.web.env.nm.gov/wwtspf/",
        platform="custom",
        search_methods=["address", "name"],
        requires_playwright=False,
    ),

    "maine_septic": PortalConfig(
        name="Maine Septic Plans",
        state="ME",
        base_url="https://apps.web.maine.gov/cgi-bin/online/mecdc/septicplans/index.pl",
        platform="custom",
        search_methods=["address"],
        requires_playwright=False,
    ),

    "rhode_island_owts": PortalConfig(
        name="Rhode Island DEM OWTS",
        state="RI",
        base_url="https://www.ri.gov/dem/owts",
        platform="custom",
        search_methods=["address", "owner"],
        requires_playwright=False,
    ),

    "south_carolina_dhec": PortalConfig(
        name="South Carolina DHEC Tracker",
        state="SC",
        base_url="https://apps.dhec.sc.gov/Environment/EnvironmentalApplicationTracker/Search.aspx",
        platform="custom",
        search_methods=["county", "applicant"],
        requires_playwright=False,
    ),

    "alaska_edms": PortalConfig(
        name="Alaska DEC EDMS",
        state="AK",
        base_url="https://dec.alaska.gov/water/edms",
        platform="custom",
        search_methods=["address", "parcel"],
        requires_playwright=True,
    ),

    # =================================
    # Accela Portals (Tier 2)
    # =================================

    "az_maricopa_accela": PortalConfig(
        name="Maricopa County AZ - Accela",
        state="AZ",
        base_url="https://accela.maricopa.gov/CitizenAccessMCESD/",
        platform="accela",
        search_methods=["address", "parcel", "permit"],
        requires_playwright=True,
    ),

    "nv_clark_accela": PortalConfig(
        name="Clark County NV - Accela",
        state="NV",
        base_url="https://aca-prod.accela.com/clarkco/",
        platform="accela",
        search_methods=["address", "parcel"],
        requires_playwright=True,
    ),

    "ny_suffolk_accela": PortalConfig(
        name="Suffolk County NY - Accela",
        state="NY",
        base_url="https://aca-prod.accela.com/SUFFOLKCO/Welcome.aspx",
        platform="accela",
        search_methods=["address", "parcel"],
        requires_playwright=True,
    ),

    "or_clackamas_accela": PortalConfig(
        name="Clackamas County OR - Accela",
        state="OR",
        base_url="https://aca-prod.accela.com/CLACKAMAS",
        platform="accela",
        search_methods=["address", "parcel"],
        requires_playwright=True,
    ),

    # =================================
    # EnerGov Portals (Tier 2)
    # =================================

    "ca_riverside_energov": PortalConfig(
        name="Riverside County CA - EnerGov",
        state="CA",
        base_url="https://rivcoplus.org/EnerGov_Prod/SelfService",
        platform="energov",
        search_methods=["address", "parcel"],
        requires_playwright=True,
    ),

    "sc_pickens_energov": PortalConfig(
        name="Pickens County SC - EnerGov",
        state="SC",
        base_url="https://energovweb.pickenscountysc.us/EnerGovProd/SelfService",
        platform="energov",
        search_methods=["address", "parcel"],
        requires_playwright=True,
    ),
}


# =============================================================================
# Scraper Settings
# =============================================================================

SCRAPER_SETTINGS = {
    "default_timeout": 30,
    "max_retries": 3,
    "base_delay_seconds": 1.0,
    "max_delay_seconds": 5.0,
    "min_records_for_test": 15,
    "headless_mode": True,
    "screenshot_on_error": True,
    "save_raw_html": False,
}


# =============================================================================
# Output Paths
# =============================================================================

OUTPUT_PATHS = {
    "test_samples": "scrapers/test_samples",
    "logs": "scrapers/logs",
    "screenshots": "scrapers/screenshots",
    "cache": "scrapers/cache",
}
