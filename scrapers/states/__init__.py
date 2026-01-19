"""State-specific septic permit scrapers."""

# Vermont DEC Wastewater Permit Database
from .vermont_dec_scraper import VermontDECScraper

# Florida eBridge OSTDS (county-by-county)
from .florida_ebridge_scraper import (
    FloridaEBridgeScraper,
    FLORIDA_EBRIDGE_COUNTIES,
    create_scraper_for_county as create_florida_scraper,
)

# Tennessee TDEC FileNet
from .tennessee_tdec_scraper import (
    TennesseeTDECScraper,
    CONTRACT_COUNTIES as TN_CONTRACT_COUNTIES,
)

__all__ = [
    "VermontDECScraper",
    "FloridaEBridgeScraper",
    "FLORIDA_EBRIDGE_COUNTIES",
    "create_florida_scraper",
    "TennesseeTDECScraper",
    "TN_CONTRACT_COUNTIES",
]
