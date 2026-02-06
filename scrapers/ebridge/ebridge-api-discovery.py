#!/usr/bin/env python3
"""
eBridge API Discovery Script

Uses Playwright to intercept network traffic and discover backend APIs.
Run this in headed mode to manually interact with the portal while
capturing all network requests.

USAGE:
    python scrapers/ebridge/ebridge-api-discovery.py

REQUIREMENTS:
    pip install playwright
    playwright install chromium
"""

import json
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any
from playwright.async_api import async_playwright, Request, Response

# eBridge Configuration
EBRIDGE_URL = "https://s1.ebridge-solutions.com/ebridge/3.0/default.aspx"

# Test counties with known public credentials
TEST_COUNTIES = {
    "hillsborough": {
        "cabinet": "HCHD",
        "username": "public",
        "password": "publicuser"
    },
    "orange": {
        "cabinet": "ORANGECHD",
        "username": "public",
        "password": "public"
    },
    "osceola": {
        "cabinet": "OSCEOLACHD",
        "username": "public",
        "password": "oscguest"
    }
}

# Storage for captured requests
captured_requests: List[Dict[str, Any]] = []
captured_responses: List[Dict[str, Any]] = []


async def on_request(request: Request):
    """Capture all outgoing requests."""
    req_data = {
        "timestamp": datetime.now().isoformat(),
        "method": request.method,
        "url": request.url,
        "resource_type": request.resource_type,
        "headers": dict(request.headers),
        "post_data": None
    }

    # Capture POST data if present
    try:
        if request.method == "POST":
            req_data["post_data"] = request.post_data
    except:
        pass

    # Only log interesting requests (skip images, css, etc)
    if request.resource_type in ["xhr", "fetch", "document", "script"]:
        print(f"[REQUEST] {request.method} {request.url[:100]}...")
        captured_requests.append(req_data)


async def on_response(response: Response):
    """Capture all responses."""
    resp_data = {
        "timestamp": datetime.now().isoformat(),
        "url": response.url,
        "status": response.status,
        "headers": dict(response.headers),
        "body": None
    }

    # Capture response body for API calls
    try:
        content_type = response.headers.get("content-type", "")
        if "json" in content_type or "text" in content_type:
            body = await response.text()
            if len(body) < 50000:  # Don't store huge responses
                resp_data["body"] = body
    except:
        pass

    # Only log interesting responses
    if response.request.resource_type in ["xhr", "fetch", "document"]:
        print(f"[RESPONSE] {response.status} {response.url[:100]}...")
        captured_responses.append(resp_data)


async def run_discovery():
    """Run interactive discovery session."""
    print("=" * 60)
    print("eBridge API Discovery Tool")
    print("=" * 60)
    print("\nThis will open a browser window. Please:")
    print("1. Log into eBridge with the provided credentials")
    print("2. Perform searches (by address, permit #, etc.)")
    print("3. Navigate through results and pagination")
    print("4. Close the browser when done")
    print("\nAll network requests will be captured and saved.")
    print("=" * 60)

    async with async_playwright() as p:
        # Launch browser in headed mode for manual interaction
        browser = await p.chromium.launch(
            headless=False,
            slow_mo=100  # Slow down for visibility
        )

        context = await browser.new_context(
            viewport={"width": 1400, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )

        page = await context.new_page()

        # Set up request/response interception
        page.on("request", on_request)
        page.on("response", on_response)

        # Navigate to eBridge
        print(f"\nNavigating to: {EBRIDGE_URL}")
        await page.goto(EBRIDGE_URL)

        # Display login credentials
        print("\n" + "=" * 60)
        print("TEST CREDENTIALS (copy these):")
        print("=" * 60)
        for county, creds in TEST_COUNTIES.items():
            print(f"\n{county.upper()}:")
            print(f"  File Cabinet: {creds['cabinet']}")
            print(f"  Username: {creds['username']}")
            print(f"  Password: {creds['password']}")
        print("\n" + "=" * 60)
        print("Interact with the portal. Close browser when done.")
        print("=" * 60)

        # Wait for browser to close
        try:
            await page.wait_for_event("close", timeout=0)
        except:
            pass

        await browser.close()

    # Save captured data
    output_dir = Path("scrapers/output/ebridge")
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Save requests
    requests_file = output_dir / f"api_discovery_requests_{timestamp}.json"
    with open(requests_file, "w") as f:
        json.dump(captured_requests, f, indent=2)
    print(f"\nSaved {len(captured_requests)} requests to: {requests_file}")

    # Save responses
    responses_file = output_dir / f"api_discovery_responses_{timestamp}.json"
    with open(responses_file, "w") as f:
        json.dump(captured_responses, f, indent=2)
    print(f"Saved {len(captured_responses)} responses to: {responses_file}")

    # Analyze and summarize
    analyze_captured_data()


def analyze_captured_data():
    """Analyze captured requests to identify API patterns."""
    print("\n" + "=" * 60)
    print("API ANALYSIS")
    print("=" * 60)

    # Find unique endpoints
    endpoints = {}
    for req in captured_requests:
        url = req["url"]
        method = req["method"]
        key = f"{method} {url.split('?')[0]}"  # Remove query params

        if key not in endpoints:
            endpoints[key] = {
                "count": 0,
                "methods": set(),
                "has_post_data": False,
                "sample_url": url
            }

        endpoints[key]["count"] += 1
        endpoints[key]["methods"].add(method)
        if req.get("post_data"):
            endpoints[key]["has_post_data"] = True

    # Print summary
    print("\nDiscovered Endpoints:")
    print("-" * 60)

    for endpoint, data in sorted(endpoints.items(), key=lambda x: -x[1]["count"]):
        methods = ", ".join(data["methods"])
        post_marker = " [HAS POST DATA]" if data["has_post_data"] else ""
        print(f"\n{endpoint}")
        print(f"  Methods: {methods}")
        print(f"  Count: {data['count']}{post_marker}")

    # Find POST requests with form data (likely the search/login endpoints)
    print("\n" + "-" * 60)
    print("POST Requests with Data (potential API endpoints):")
    print("-" * 60)

    for req in captured_requests:
        if req["method"] == "POST" and req.get("post_data"):
            print(f"\n{req['url']}")
            post_data = req["post_data"]
            if len(post_data) < 2000:
                # Try to parse as form data
                if "=" in post_data:
                    print("  Form fields:")
                    for field in post_data.split("&")[:20]:  # First 20 fields
                        if "=" in field:
                            key = field.split("=")[0]
                            print(f"    - {key}")
            else:
                print(f"  [POST data: {len(post_data)} bytes]")


async def auto_login_test():
    """Automated login test to capture auth flow."""
    print("=" * 60)
    print("Automated Login Test - Hillsborough County")
    print("=" * 60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        # Set up interception
        page.on("request", on_request)
        page.on("response", on_response)

        # Navigate to login
        await page.goto(EBRIDGE_URL)
        await page.wait_for_load_state("networkidle")

        # Take screenshot of login page
        await page.screenshot(path="scrapers/output/ebridge/login_page.png")
        print("Saved login page screenshot")

        # Try to fill login form
        creds = TEST_COUNTIES["hillsborough"]

        try:
            # Look for form fields
            print("\nLooking for form fields...")

            # Username field
            username_selectors = [
                'input[name="txtUserName"]',
                'input[id*="UserName"]',
                'input[type="text"][name*="user"]',
                '#txtUserName'
            ]
            for sel in username_selectors:
                elem = await page.query_selector(sel)
                if elem:
                    await elem.fill(creds["username"])
                    print(f"  Filled username with selector: {sel}")
                    break

            # Password field
            password_selectors = [
                'input[name="txtPassword"]',
                'input[id*="Password"]',
                'input[type="password"]',
                '#txtPassword'
            ]
            for sel in password_selectors:
                elem = await page.query_selector(sel)
                if elem:
                    await elem.fill(creds["password"])
                    print(f"  Filled password with selector: {sel}")
                    break

            # File cabinet dropdown
            cabinet_selectors = [
                'select[name="ddlFileCabinets"]',
                'select[id*="FileCabinet"]',
                '#ddlFileCabinets'
            ]
            for sel in cabinet_selectors:
                elem = await page.query_selector(sel)
                if elem:
                    await elem.select_option(label=creds["cabinet"])
                    print(f"  Selected cabinet with selector: {sel}")
                    break

            # Login button
            login_selectors = [
                'input[name="btnLogin"]',
                'input[type="submit"][value*="Login"]',
                '#btnLogin',
                'button:has-text("Login")'
            ]
            for sel in login_selectors:
                elem = await page.query_selector(sel)
                if elem:
                    await elem.click()
                    print(f"  Clicked login with selector: {sel}")
                    break

            # Wait for navigation
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(2)

            # Take screenshot after login
            await page.screenshot(path="scrapers/output/ebridge/after_login.png")
            print("Saved after-login screenshot")

            # Check page content
            content = await page.content()
            if "search" in content.lower() or "Search" in content:
                print("\n✓ Login appears successful - search interface detected")
            else:
                print("\n⚠ Login may have failed - check screenshot")

        except Exception as e:
            print(f"Error during login: {e}")

        # Keep browser open for manual inspection
        print("\nBrowser open for inspection. Close to continue...")
        try:
            await page.wait_for_event("close", timeout=0)
        except:
            pass

        await browser.close()

    # Save captured data
    analyze_captured_data()


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--auto":
        asyncio.run(auto_login_test())
    else:
        asyncio.run(run_discovery())
