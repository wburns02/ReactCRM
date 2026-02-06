#!/usr/bin/env python3
"""
GovQA Playwright Extractor

Uses Playwright browser automation to log in to GovQA portals and extract data.
Bypasses the buggy GovQA-Py library by doing direct browser automation.
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

try:
    from playwright.async_api import async_playwright, Page, Browser
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("Warning: Playwright not installed. Run: pip install playwright && playwright install chromium")


# Texas GovQA portals
TEXAS_GOVQA_PORTALS = {
    "harris": {
        "name": "Harris County Engineering",
        "domain": "https://hctxeng.govqa.us",
        "tenant": "hctxeng",
    },
    "bexar": {
        "name": "Bexar County",
        "domain": "https://bexarcountytx.govqa.us",
        "tenant": "bexarcountytx",
    },
    "bexar_county": {
        "name": "Bexar County (Alt)",
        "domain": "https://county-bexarcountytx.govqa.us",
        "tenant": "county-bexarcountytx",
    },
    "hays": {
        "name": "Hays County",
        "domain": "https://hayscountytx.govqa.us",
        "tenant": "hayscountytx",
    }
}


class GovQAPlaywrightExtractor:
    """
    Playwright-based extractor for GovQA portals.
    """

    def __init__(
        self,
        username: str,
        password: str,
        output_dir: str = "scrapers/output",
        headless: bool = True
    ):
        self.username = username
        self.password = password
        self.output_dir = Path(output_dir)
        self.headless = headless
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None

    async def __aenter__(self):
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=self.headless)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

    async def login_to_portal(self, portal_key: str) -> Dict[str, Any]:
        """
        Log in to a GovQA portal using browser automation.
        """
        if portal_key not in TEXAS_GOVQA_PORTALS:
            return {"status": "error", "message": f"Unknown portal: {portal_key}"}

        portal = TEXAS_GOVQA_PORTALS[portal_key]
        result = {
            "portal": portal["name"],
            "domain": portal["domain"],
            "status": "unknown",
            "requests": [],
            "error": None,
            "timestamp": datetime.now().isoformat()
        }

        print(f"\n{'='*60}")
        print(f"Testing: {portal['name']}")
        print(f"Domain: {portal['domain']}")
        print(f"{'='*60}")

        try:
            # Create new page/context for this portal
            context = await self.browser.new_context()
            page = await context.new_page()

            # Navigate to login page
            login_url = f"{portal['domain']}/WEBAPP/_rs/Login.aspx"
            print(f"  Navigating to: {login_url}")
            await page.goto(login_url, wait_until="networkidle", timeout=30000)

            # Take screenshot
            screenshot_path = self.output_dir / f"{portal['tenant']}_login_page.png"
            screenshot_path.parent.mkdir(parents=True, exist_ok=True)
            await page.screenshot(path=str(screenshot_path))
            print(f"  Screenshot saved: {screenshot_path}")

            # Find login form elements
            print(f"  Looking for login form...")

            # Try different possible selectors for username field
            # GovQA uses DevExpress controls with specific ID patterns
            username_selectors = [
                '#ASPxFormLayout1_txtUsername_I',  # GovQA DevExpress pattern
                'input[id*="txtUsername"]',
                'input[name*="txtUsername"]',
                'input[name*="UserName"]',
                'input[name*="username"]',
                'input[name*="Email"]',
                'input[name*="email"]',
                'input[id*="UserName"]',
                'input[id*="txtEmail"]',
                'input[type="email"]',
                '#txtUserName',
                '#txtEmail'
            ]

            password_selectors = [
                '#ASPxFormLayout1_txtPassword_I',  # GovQA DevExpress pattern
                'input[id*="txtPassword"]',
                'input[name*="txtPassword"]',
                'input[name*="Password"]',
                'input[name*="password"]',
                'input[type="password"]',
                '#txtPassword'
            ]

            submit_selectors = [
                '#ASPxFormLayout1_btnLogin',  # GovQA DevExpress pattern
                'div[id*="btnLogin"]',
                'input[type="submit"]',
                'button[type="submit"]',
                '#btnLogin',
                'input[value="Login"]',
                'input[value="Sign In"]'
            ]

            username_input = None
            for selector in username_selectors:
                try:
                    elem = await page.query_selector(selector)
                    if elem:
                        username_input = elem
                        print(f"    Found username field: {selector}")
                        break
                except:
                    pass

            password_input = None
            for selector in password_selectors:
                try:
                    elem = await page.query_selector(selector)
                    if elem:
                        password_input = elem
                        print(f"    Found password field: {selector}")
                        break
                except:
                    pass

            submit_button = None
            for selector in submit_selectors:
                try:
                    elem = await page.query_selector(selector)
                    if elem:
                        submit_button = elem
                        print(f"    Found submit button: {selector}")
                        break
                except:
                    pass

            if not username_input or not password_input:
                # Save page HTML for debugging
                html = await page.content()
                html_path = self.output_dir / f"{portal['tenant']}_login_debug.html"
                with open(html_path, 'w', encoding='utf-8') as f:
                    f.write(html)
                print(f"  Page HTML saved to: {html_path}")
                result["status"] = "login_form_not_found"
                result["error"] = "Could not find login form elements"
                await context.close()
                return result

            # Fill in credentials
            print(f"  Filling in credentials...")
            await username_input.fill(self.username)
            await password_input.fill(self.password)

            # Submit form
            if submit_button:
                # DevExpress buttons are divs, need to click them
                await submit_button.click()
                await asyncio.sleep(1)  # Wait for any JS processing
            else:
                await password_input.press("Enter")

            # Wait for navigation
            print(f"  Waiting for login response...")
            await page.wait_for_load_state("networkidle", timeout=30000)

            # Check if login succeeded
            current_url = page.url

            # Take post-login screenshot
            screenshot_path = self.output_dir / f"{portal['tenant']}_after_login.png"
            await page.screenshot(path=str(screenshot_path))
            print(f"  Post-login screenshot: {screenshot_path}")

            # Check for error messages
            error_selectors = [
                '.error',
                '.alert-danger',
                '#lblError',
                '.validation-summary-errors',
                '[class*="error"]'
            ]

            has_error = False
            for selector in error_selectors:
                try:
                    elem = await page.query_selector(selector)
                    if elem:
                        text = await elem.inner_text()
                        if text.strip():
                            print(f"    Error found: {text.strip()}")
                            result["error"] = text.strip()
                            has_error = True
                            break
                except:
                    pass

            if has_error or "Login" in current_url:
                result["status"] = "auth_failed"
                if not result["error"]:
                    result["error"] = "Login failed - still on login page"
                await context.close()
                return result

            # Login succeeded - navigate to requests page
            print(f"  Login successful! Navigating to requests...")
            result["status"] = "logged_in"

            # Try to find requests page
            requests_url = f"{portal['domain']}/WEBAPP/_rs/CustomerIssues.aspx"
            await page.goto(requests_url, wait_until="networkidle", timeout=30000)

            # Take screenshot of requests page
            screenshot_path = self.output_dir / f"{portal['tenant']}_requests_page.png"
            await page.screenshot(path=str(screenshot_path))
            print(f"  Requests page screenshot: {screenshot_path}")

            # Try to extract request data
            requests_data = await self.extract_requests_from_page(page)
            result["requests"] = requests_data
            result["request_count"] = len(requests_data)
            result["status"] = "success"

            print(f"  Found {len(requests_data)} request(s)")

            # Save full page HTML
            html = await page.content()
            html_path = self.output_dir / f"{portal['tenant']}_requests_page.html"
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html)

            await context.close()
            return result

        except Exception as e:
            result["status"] = "error"
            result["error"] = str(e)
            print(f"  [FAIL] Error: {e}")
            return result

    async def extract_requests_from_page(self, page: Page) -> List[Dict]:
        """
        Extract request data from the CustomerIssues page.
        """
        requests = []

        try:
            # Look for request links/rows
            # GovQA typically shows requests in a table or list

            # Try to find request references
            ref_elements = await page.query_selector_all('a[id*="reference"]')
            if not ref_elements:
                ref_elements = await page.query_selector_all('a[href*="RequestEdit"]')
            if not ref_elements:
                ref_elements = await page.query_selector_all('a[href*="rid="]')

            for elem in ref_elements:
                try:
                    text = await elem.inner_text()
                    href = await elem.get_attribute('href')
                    requests.append({
                        "reference_number": text.strip() if text else None,
                        "url": href
                    })
                except:
                    pass

            # Also try to find status elements
            status_elements = await page.query_selector_all('[class*="status"]')
            for i, elem in enumerate(status_elements):
                try:
                    text = await elem.inner_text()
                    if i < len(requests):
                        requests[i]["status"] = text.strip()
                except:
                    pass

        except Exception as e:
            print(f"    Error extracting requests: {e}")

        return requests

    async def test_all_portals(self) -> Dict[str, Any]:
        """
        Test all configured GovQA portals.
        """
        results = {
            "timestamp": datetime.now().isoformat(),
            "username": self.username,
            "portals": {}
        }

        for portal_key in TEXAS_GOVQA_PORTALS:
            results["portals"][portal_key] = await self.login_to_portal(portal_key)
            await asyncio.sleep(2)  # Rate limit

        # Save results
        output_file = self.output_dir / "govqa_playwright_results.json"
        output_file.parent.mkdir(parents=True, exist_ok=True)

        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)

        print(f"\n{'='*60}")
        print("SUMMARY")
        print(f"{'='*60}")

        for portal_key, result in results["portals"].items():
            status_icon = "[OK]" if result["status"] == "success" else "[FAIL]"
            request_count = result.get("request_count", 0)
            print(f"  {status_icon} {result['portal']}: {result['status']} ({request_count} requests)")
            if result.get("error"):
                print(f"       Error: {result['error']}")

        print(f"\nResults saved to: {output_file}")

        return results


async def main():
    """Main entry point."""
    print("="*60)
    print("Texas GovQA Playwright Extractor")
    print("="*60)

    if not PLAYWRIGHT_AVAILABLE:
        print("\nPlaywright not installed. Install with:")
        print("  pip install playwright")
        print("  playwright install chromium")
        return

    # Credentials
    username = "willwalterburns@gmail.com"
    password = "#Espn2025"

    async with GovQAPlaywrightExtractor(
        username=username,
        password=password,
        output_dir="scrapers/output/govqa_texas",
        headless=True
    ) as extractor:
        results = await extractor.test_all_portals()

    # Summary of what was found
    print("\n--- Results Summary ---\n")

    total_requests = 0
    for portal_key, result in results["portals"].items():
        if result["status"] == "success":
            count = result.get("request_count", 0)
            total_requests += count
            if count > 0:
                print(f"\n{result['portal']}:")
                for req in result.get("requests", []):
                    print(f"  - {req.get('reference_number', 'N/A')}")

    print(f"\nTotal requests found: {total_requests}")


if __name__ == "__main__":
    asyncio.run(main())
