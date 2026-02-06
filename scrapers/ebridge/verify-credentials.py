#!/usr/bin/env python3
"""
Quick credential verification for all eBridge counties.
Tests login only - doesn't extract data.
"""

import asyncio
from playwright.async_api import async_playwright

EBRIDGE_URL = "https://s1.ebridge-solutions.com/ebridge/3.0/default.aspx"

# All counties to test
COUNTIES = {
    # VERIFIED WORKING
    "hillsborough": {"cabinet": "HCHD", "user": "public", "pass": "publicuser"},
    "osceola": {"cabinet": "OSCEOLACHD", "user": "public", "pass": "oscguest"},
    "okeechobee": {"cabinet": "okeechobeechd", "user": "public", "pass": "password"},
    "martin": {"cabinet": "Martin County", "user": "Public", "pass": "public"},
    # UNVERIFIED - test these
    "orange": {"cabinet": "ORANGECHD", "user": "public", "pass": "public"},
    "brevard": {"cabinet": "BREVARDCHD", "user": "public", "pass": "public"},
    "seminole": {"cabinet": "SEMINOLECHD", "user": "public", "pass": "public"},
    "polk": {"cabinet": "POLKCHD", "user": "public", "pass": "public"},
    "pasco": {"cabinet": "PASCOCHD", "user": "public", "pass": "public"},
    "pinellas": {"cabinet": "PINELLASCHD", "user": "public", "pass": "public"},
    "volusia": {"cabinet": "VOLUSIACHD", "user": "public", "pass": "public"},
    "lee": {"cabinet": "LEECHD", "user": "public", "pass": "public"},
    "collier": {"cabinet": "COLLIERCHD", "user": "public", "pass": "public"},
    "sarasota": {"cabinet": "SARASOTACHD", "user": "public", "pass": "public"},
    "manatee": {"cabinet": "MANATEECHD", "user": "public", "pass": "public"},
    "charlotte": {"cabinet": "CHARLOTTECHD", "user": "public", "pass": "public"},
    "palm_beach": {"cabinet": "PBCHD", "user": "public", "pass": "public"},
    "broward": {"cabinet": "BROWARDCHD", "user": "public", "pass": "public"},
    "miami_dade": {"cabinet": "MDCHD", "user": "public", "pass": "public"},
    "hernando": {"cabinet": "HERNANDOCHD", "user": "public", "pass": "public"},
    # Additional Florida counties
    "alachua": {"cabinet": "ALACHUACHD", "user": "public", "pass": "public"},
    "bay": {"cabinet": "BAYCHD", "user": "public", "pass": "public"},
    "citrus": {"cabinet": "CITRUSCHD", "user": "public", "pass": "public"},
    "clay": {"cabinet": "CLAYCHD", "user": "public", "pass": "public"},
    "duval": {"cabinet": "DUVALCHD", "user": "public", "pass": "public"},
    "escambia": {"cabinet": "ESCAMBIACHD", "user": "public", "pass": "public"},
    "flagler": {"cabinet": "FLAGLERCHD", "user": "public", "pass": "public"},
    "indian_river": {"cabinet": "INDIANRIVERCHD", "user": "public", "pass": "public"},
    "lake": {"cabinet": "LAKECHD", "user": "public", "pass": "public"},
    "leon": {"cabinet": "LEONCHD", "user": "public", "pass": "public"},
    "marion": {"cabinet": "MARIONCHD", "user": "public", "pass": "public"},
    "nassau": {"cabinet": "NASSAUCHD", "user": "public", "pass": "public"},
    "okaloosa": {"cabinet": "OKALOOSACHD", "user": "public", "pass": "public"},
    "santa_rosa": {"cabinet": "SANTAROSACHD", "user": "public", "pass": "public"},
    "st_johns": {"cabinet": "STJOHNSCHD", "user": "public", "pass": "public"},
    "st_lucie": {"cabinet": "STLUCIECHD", "user": "public", "pass": "public"},
    "sumter": {"cabinet": "SUMTERCHD", "user": "public", "pass": "public"},
    # Texas
    "potter_tx": {"cabinet": "AmarilloHD", "user": "public", "pass": "public"},
    "randall_tx": {"cabinet": "AmarilloHD", "user": "public", "pass": "public"},
}


async def test_login(county: str, config: dict) -> tuple:
    """Test login for a single county. Returns (county, success, error_msg)"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        try:
            await page.goto(EBRIDGE_URL, wait_until="domcontentloaded")
            await page.wait_for_timeout(2000)
            await page.wait_for_selector("#tbUserName", timeout=10000)

            await page.fill("#tbUserName", config["user"])
            await page.fill("#tbPassword", config["pass"])
            await page.fill("#tbFileCabinet", config["cabinet"])
            await page.click("#btnLogin")
            await page.wait_for_timeout(3000)
            await page.wait_for_load_state("networkidle")

            if "main.aspx" in page.url:
                return (county, True, None)
            else:
                # Check for error
                error_elem = await page.query_selector(".error, .error-message, #lblError")
                if error_elem:
                    error_text = await error_elem.inner_text()
                    return (county, False, error_text[:100])
                return (county, False, "Not on main page")

        except Exception as e:
            return (county, False, str(e)[:100])
        finally:
            await browser.close()


async def main():
    print("=" * 70)
    print("eBridge Credential Verification")
    print("=" * 70)

    working = []
    failed = []

    for county, config in COUNTIES.items():
        print(f"\nTesting {county.upper()}... ", end="", flush=True)
        county_name, success, error = await test_login(county, config)

        if success:
            print("OK")
            working.append(county)
        else:
            print(f"FAILED: {error}")
            failed.append((county, error))

    print("\n" + "=" * 70)
    print("RESULTS")
    print("=" * 70)

    print(f"\nWORKING ({len(working)}):")
    for c in working:
        config = COUNTIES[c]
        print(f"  {c}: {config['cabinet']} / {config['user']} / {config['pass']}")

    print(f"\nFAILED ({len(failed)}):")
    for c, err in failed:
        print(f"  {c}: {err}")


if __name__ == "__main__":
    asyncio.run(main())
