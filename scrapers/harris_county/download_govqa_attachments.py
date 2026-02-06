#!/usr/bin/env python3
"""
Download GovQA Attachments

Downloads all attachments from completed GovQA FOIA requests.
Uses Playwright to navigate to each request and download files.
"""

import asyncio
import json
import os
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse

from playwright.async_api import async_playwright, Page, Download


# Configuration
PORTALS = {
    "harris": {
        "name": "Harris County Engineering",
        "domain": "https://hctxeng.govqa.us",
    },
    "bexar": {
        "name": "Bexar County",
        "domain": "https://bexarcountytx.govqa.us",
    },
    "hays": {
        "name": "Hays County",
        "domain": "https://hayscountytx.govqa.us",
    }
}


async def download_request_attachments(
    portal_key: str,
    username: str,
    password: str,
    output_dir: str = "scrapers/output/govqa_texas",
    headless: bool = True
):
    """
    Log in to GovQA portal and download all attachments from all requests.
    """
    portal = PORTALS[portal_key]
    output_path = Path(output_dir) / portal_key
    output_path.mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"Downloading from: {portal['name']}")
    print(f"{'='*60}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context(accept_downloads=True)
        page = await context.new_page()

        # Login
        login_url = f"{portal['domain']}/WEBAPP/_rs/Login.aspx"
        print(f"  Navigating to: {login_url}")
        await page.goto(login_url, wait_until="networkidle")

        # Fill login form
        await page.fill('#ASPxFormLayout1_txtUsername_I', username)
        await page.fill('#ASPxFormLayout1_txtPassword_I', password)
        await page.click('#ASPxFormLayout1_btnLogin')
        await asyncio.sleep(2)
        await page.wait_for_load_state("networkidle")

        print(f"  Logged in successfully")

        # Go to requests page
        requests_url = f"{portal['domain']}/WEBAPP/_rs/CustomerIssues.aspx"
        await page.goto(requests_url, wait_until="networkidle")

        # Find all request links
        request_links = await page.query_selector_all('a[href*="RequestEdit.aspx"]')
        print(f"  Found {len(request_links)} request(s)")

        all_downloads = []

        for link in request_links:
            href = await link.get_attribute('href')
            ref_text = await link.inner_text()
            ref_text = ref_text.strip()

            # Extract request ID from URL
            rid_match = re.search(r'rid=(\d+)', href)
            rid = rid_match.group(1) if rid_match else "unknown"

            print(f"\n  Processing: {ref_text} (rid={rid})")

            # Navigate to request page
            full_url = urljoin(portal['domain'], href)
            await page.goto(full_url, wait_until="networkidle")
            await asyncio.sleep(1)

            # Create directory for this request
            request_dir = output_path / f"request_{rid}_{ref_text.replace('-', '_')}"
            request_dir.mkdir(parents=True, exist_ok=True)

            # Save page screenshot
            await page.screenshot(path=str(request_dir / "request_page.png"))

            # Save page HTML for reference
            html = await page.content()
            with open(request_dir / "request_page.html", 'w', encoding='utf-8') as f:
                f.write(html)

            # Look for attachment links
            # GovQA typically has attachments in a specific section
            attachment_selectors = [
                'a[href*="download"]',
                'a[href*="attachment"]',
                'a[href*="file"]',
                'a.qac_attachment',
                'div.qac_attachment a',
                '#dvAttachments a',
                'a[onclick*="download"]',
                'a[onclick*="Download"]',
            ]

            attachment_links = []
            for selector in attachment_selectors:
                links = await page.query_selector_all(selector)
                for link in links:
                    href = await link.get_attribute('href') or ""
                    onclick = await link.get_attribute('onclick') or ""
                    text = await link.inner_text()

                    # Skip navigation links
                    if any(skip in href.lower() for skip in ['login', 'logout', 'home', 'javascript:void']):
                        continue

                    # Check if it looks like an attachment
                    if href or onclick:
                        attachment_links.append({
                            'href': href,
                            'onclick': onclick,
                            'text': text.strip(),
                            'selector': selector
                        })

            print(f"    Found {len(attachment_links)} potential attachment link(s)")

            # Also look for the "Download All" button
            download_all_btn = await page.query_selector('input[value*="Download"]')
            if download_all_btn:
                print(f"    Found Download All button")
                attachment_links.append({
                    'href': '',
                    'onclick': 'download_all',
                    'text': 'Download All',
                    'element': download_all_btn
                })

            # Try to download each attachment
            for i, att in enumerate(attachment_links):
                try:
                    print(f"    Downloading: {att['text'][:50]}...")

                    # Set up download handler
                    async with page.expect_download(timeout=60000) as download_info:
                        if att.get('element'):
                            await att['element'].click()
                        elif att.get('onclick') and 'download' in att['onclick'].lower():
                            # Execute onclick
                            elem = await page.query_selector(f'{att["selector"]}:has-text("{att["text"]}")')
                            if elem:
                                await elem.click()
                        elif att.get('href') and att['href'] != '#':
                            # Navigate to href
                            elem = await page.query_selector(f'a[href="{att["href"]}"]')
                            if elem:
                                await elem.click()

                    download = await download_info.value

                    # Get filename
                    filename = download.suggested_filename
                    if not filename:
                        filename = f"attachment_{i}.bin"

                    # Save file
                    filepath = request_dir / filename
                    await download.save_as(str(filepath))
                    print(f"      Saved: {filename}")

                    all_downloads.append({
                        'portal': portal_key,
                        'request_ref': ref_text,
                        'request_id': rid,
                        'filename': filename,
                        'filepath': str(filepath)
                    })

                except Exception as e:
                    print(f"      Error: {e}")

            # Return to requests list
            await page.goto(requests_url, wait_until="networkidle")

        await browser.close()

        # Save download summary
        summary_file = output_path / "download_summary.json"
        with open(summary_file, 'w') as f:
            json.dump({
                'portal': portal['name'],
                'timestamp': datetime.now().isoformat(),
                'downloads': all_downloads
            }, f, indent=2)

        print(f"\n  Summary saved to: {summary_file}")
        print(f"  Total files downloaded: {len(all_downloads)}")

        return all_downloads


async def main():
    """Main entry point."""
    print("="*60)
    print("GovQA Attachment Downloader")
    print("="*60)

    # Credentials
    username = "willwalterburns@gmail.com"
    password = "#Espn2025"

    # Download from Harris County first (the one with septic data)
    results = await download_request_attachments(
        portal_key="harris",
        username=username,
        password=password,
        headless=True
    )

    print(f"\n{'='*60}")
    print("COMPLETE")
    print(f"{'='*60}")
    print(f"Downloaded {len(results)} file(s) from Harris County")


if __name__ == "__main__":
    asyncio.run(main())
