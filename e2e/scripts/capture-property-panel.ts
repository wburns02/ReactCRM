import { chromium } from "@playwright/test";
import * as fs from "fs";

async function main() {
  // Read stored auth - it's in .auth/user.json in project root
  const authPath = ".auth/user.json";
  if (!fs.existsSync(authPath)) {
    console.log("No auth file found at", authPath, ". Running auth setup first...");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: authPath });
  const page = await context.newPage();

  // Navigate directly to a specific permit page
  // First get a permit ID from the permits list
  await page.goto("https://react.ecbtx.com/permits");
  await page.waitForLoadState("networkidle");

  // Search for Williamson
  const searchInput = page.locator('input[placeholder*="Search"]');
  if (await searchInput.isVisible()) {
    await searchInput.fill("Williamson");
    await searchInput.press("Enter");
    await page.waitForLoadState("networkidle");
  }

  // Wait for table and click first permit
  await page.waitForSelector("table tbody tr", { timeout: 10000 });
  const permitLink = page.locator("table tbody tr td a").first();

  if (await permitLink.isVisible()) {
    await permitLink.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Find the main content container and scroll it
    const mainContent = page.locator('main, [class*="content"], [class*="max-w"]').first();

    // Scroll the page down several times to load everything
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, 500);
      });
      await page.waitForTimeout(200);
    }

    // Look for the Linked Property section
    const linkedProperty = page.locator('h2:has-text("Linked Property")');
    const found = await linkedProperty.isVisible();
    console.log("Linked Property h2 found:", found);

    if (found) {
      // Scroll it into view
      await linkedProperty.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      // Take screenshot of the panel
      const box = await linkedProperty.boundingBox();
      if (box) {
        // Capture a region starting from the panel header
        await page.screenshot({
          path: "e2e/screenshots/property-panel-focused.png",
          clip: {
            x: 0,
            y: Math.max(0, box.y - 50),
            width: 1280,
            height: 800,
          },
        });
        console.log("Captured property panel screenshot");
      }
    }

    // Also get the full page HTML for the property section
    const pageContent = await page.content();
    const hasPropertyOverview = pageContent.includes("Property Overview");
    const hasNoPropertyLinked = pageContent.includes("No property data linked");

    console.log("Page contains 'Property Overview':", hasPropertyOverview);
    console.log("Page contains 'No property data linked':", hasNoPropertyLinked);

    // Take viewport screenshot after scrolling
    await page.screenshot({
      path: "e2e/screenshots/permit-scrolled-view.png",
    });
  }

  await browser.close();
}

main().catch(console.error);
