#!/usr/bin/env python3
"""
GovQA Configuration

Contains jurisdiction configurations, known portals, and scraper settings.
"""

from dataclasses import dataclass, field
from typing import Optional
from pathlib import Path

# Output directories
OUTPUT_DIR = Path(__file__).parent.parent / "output" / "govqa"
CREDENTIALS_DIR = Path(__file__).parent / "credentials"

# Rate limiting settings
DELAYS = {
    "between_requests": 2.0,      # Seconds between API calls
    "between_pages": 2.5,         # Seconds between page navigations
    "after_error": 30.0,          # Cooldown after errors
    "session_refresh": 600.0,     # Refresh session every 10 min
}

# Proxy settings (Decodo)
PROXY_CONFIG = {
    "host": "dc.decodo.com",
    "ports": [10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009, 10010],
    "username": "OpusCLI",
    "password": "h+Mpb3hlLt1c5B1mpL"
}


@dataclass
class GovQAJurisdiction:
    """Configuration for a single GovQA jurisdiction."""
    name: str
    tenant: str
    domain: str
    jurisdiction_type: str  # city, county, state_agency
    state: str
    # Optional settings
    requires_captcha: bool = True
    max_id_range: int = 100000  # Maximum request ID to scan
    enabled: bool = True
    notes: str = ""


# Known GovQA jurisdictions discovered during research
JURISDICTIONS = [
    # Major Cities
    GovQAJurisdiction(
        name="Chicago, IL",
        tenant="chicagoil",
        domain="https://chicagoil.govqa.us",
        jurisdiction_type="city",
        state="IL",
        notes="High volume city - 16,000+ requests/year"
    ),
    GovQAJurisdiction(
        name="City of Phoenix, AZ",
        tenant="cityofphoenixaz",
        domain="https://cityofphoenixaz.govqa.us",
        jurisdiction_type="city",
        state="AZ"
    ),
    GovQAJurisdiction(
        name="City of Portland, OR",
        tenant="portlandor",
        domain="https://portlandor.govqa.us",
        jurisdiction_type="city",
        state="OR",
        enabled=False,  # Need to verify
        notes="Need to confirm exact tenant name"
    ),
    GovQAJurisdiction(
        name="City of San Francisco, CA",
        tenant="sanfrancisco",
        domain="https://sanfrancisco.govqa.us",
        jurisdiction_type="city",
        state="CA",
        enabled=False,
        notes="SFPD uses GovQA - need to verify tenant"
    ),

    # Counties
    GovQAJurisdiction(
        name="Pierce County, WA",
        tenant="piercecountywa",
        domain="https://piercecountywa.govqa.us",
        jurisdiction_type="county",
        state="WA",
        notes="Verified working"
    ),
    GovQAJurisdiction(
        name="Hillsborough County Sheriff, FL",
        tenant="hillsboroughsheriff",
        domain="https://hillsboroughsheriff.govqa.us",
        jurisdiction_type="county",
        state="FL",
        notes="From security disclosure"
    ),

    # State Agencies
    GovQAJurisdiction(
        name="California CDCR",
        tenant="californiacdcr",
        domain="https://californiacdcr.govqa.us",
        jurisdiction_type="state_agency",
        state="CA",
        notes="California Department of Corrections"
    ),
    GovQAJurisdiction(
        name="Texas Workforce Commission",
        tenant="twc",
        domain="https://twc.govqa.us",
        jurisdiction_type="state_agency",
        state="TX"
    ),
    GovQAJurisdiction(
        name="New York Governor's Office",
        tenant="governorny",
        domain="https://governorny.govqa.us",
        jurisdiction_type="state_agency",
        state="NY",
        notes="From GovQA-Py documentation"
    ),
]


def get_jurisdiction(tenant: str) -> Optional[GovQAJurisdiction]:
    """Get jurisdiction config by tenant name."""
    for j in JURISDICTIONS:
        if j.tenant == tenant:
            return j
    return None


def get_enabled_jurisdictions() -> list:
    """Get all enabled jurisdictions."""
    return [j for j in JURISDICTIONS if j.enabled]


def get_jurisdictions_by_state(state: str) -> list:
    """Get all jurisdictions in a state."""
    return [j for j in JURISDICTIONS if j.state == state and j.enabled]


def get_jurisdictions_by_type(jtype: str) -> list:
    """Get all jurisdictions of a type (city, county, state_agency)."""
    return [j for j in JURISDICTIONS if j.jurisdiction_type == jtype and j.enabled]


# API endpoint patterns discovered during research
API_ENDPOINTS = {
    "home": "supporthome.aspx",
    "login": "Login.aspx",
    "customer_issues": "CustomerIssues.aspx",  # List user's requests
    "request_edit": "RequestEdit.aspx",        # View/edit request (with rid param)
    "request_open": "RequestOpen.aspx",        # Public request view (with rid param)
    "request_open_ci": "RequestOpenCI.aspx",   # Request edit (vulnerable)
    "download_all": "RequestEdit.aspx/DownloadAll",  # JSON API for attachments
    "password_reset": "AnonymousCustomerResetPassword.aspx",  # With cid param
    "ajax_helper": "AjaxHelper.aspx",          # Session management
    "create_account": "CustomerDetails.aspx",  # Account creation
}

# CSS selectors for HTML parsing
SELECTORS = {
    "request_reference": "//a[contains(@id, 'referenceLnk')]",
    "request_status": "//div[starts-with(@class, 'list_status')]/text()",
    "request_type": "//span[@id='RequestEditFormLayout_roType']/text()",
    "contact_email": "//span[@id='RequestEditFormLayout_roContactEmail']/text()",
    "reference_number": "//span[@id='RequestEditFormLayout_roReferenceNo']/text()",
    "messages": "//table[contains(@id, 'rptMessageHistory')]",
    "attachments": "//div[@id='dvAttachments']/descendant::div[@class='qac_attachment']",
}


if __name__ == "__main__":
    # Print configuration summary
    print("GovQA Configuration Summary")
    print("=" * 50)
    print(f"\nTotal jurisdictions: {len(JURISDICTIONS)}")
    print(f"Enabled: {len(get_enabled_jurisdictions())}")
    print(f"\nBy type:")
    for jtype in ["city", "county", "state_agency"]:
        count = len(get_jurisdictions_by_type(jtype))
        print(f"  {jtype}: {count}")
    print(f"\nOutput directory: {OUTPUT_DIR}")
    print(f"Credentials directory: {CREDENTIALS_DIR}")
