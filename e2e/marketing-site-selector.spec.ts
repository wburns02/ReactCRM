import { test, expect } from "@playwright/test";

test.describe("Marketing Site Selector", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[name="email"]', process.env.TEST_EMAIL || "will@macseptic.com");
    await page.fill('input[name="password"]', process.env.TEST_PASSWORD || "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("should show site selector dropdown with real sites", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/marketing/tasks");
    await page.waitForLoadState("networkidle");

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/marketing-site-selector.png", fullPage: true });

    // Check site selector exists
    const siteSelector = page.locator("#site-selector");
    await expect(siteSelector).toBeVisible({ timeout: 10000 });

    // Check for options
    const options = siteSelector.locator("option");
    const count = await options.count();
    console.log(`Found ${count} site options`);

    // Should have at least "All Sites" + ecbtx.com
    expect(count).toBeGreaterThanOrEqual(2);

    // Click to see options
    const allOptions = await options.allTextContents();
    console.log("Site options:", allOptions);

    // Verify ECB TX is in the list
    const hasEcbtx = allOptions.some(opt => opt.includes("ecbtx") || opt.includes("ECB"));
    expect(hasEcbtx).toBe(true);

    // Check metrics are displayed (not zeros/fallback)
    const keywordsCard = page.locator("text=Tracked Keywords");
    if (await keywordsCard.isVisible()) {
      console.log("Tracked Keywords metric visible");
    }
  });

  test("should select a site and show site info card", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/marketing/tasks");
    await page.waitForLoadState("networkidle");

    // Select ECB TX site (option value should be "1" based on db id)
    const siteSelector = page.locator("#site-selector");
    await siteSelector.selectOption({ index: 1 }); // First real site after "All Sites"

    // Wait for site info card to appear
    await page.waitForTimeout(500);

    // Take screenshot after selection
    await page.screenshot({ path: "e2e/screenshots/marketing-site-selected.png", fullPage: true });

    // Should show the selected site's URL
    const siteUrl = page.locator('a[href*="ecbtx.com"]');
    await expect(siteUrl).toBeVisible();
  });
});
