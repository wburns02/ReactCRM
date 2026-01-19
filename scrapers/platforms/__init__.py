"""Platform-specific scrapers for common government portal systems."""

# Accela Citizen Access - widely used government permitting platform
from .accela_scraper import (
    AccelaScraper,
    AccelaPortalConfig,
    ACCELA_PORTALS,
    create_accela_scraper,
)

# Placeholder for future implementations
# from .energov_scraper import EnerGovScraper
# from .ascent_scraper import AscentScraper

__all__ = [
    "AccelaScraper",
    "AccelaPortalConfig",
    "ACCELA_PORTALS",
    "create_accela_scraper",
]
