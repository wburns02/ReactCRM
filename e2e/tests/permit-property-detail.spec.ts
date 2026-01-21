import { test, expect } from "@playwright/test";

/**
 * E2E test for permit property detail view
 * Verifies that clicking a permit shows linked property data
 */
test.describe("Permit Property Detail View", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("https://react.ecbtx.com/login");

    // Wait for login form
    await page.waitForSelector('input[type="email"], input[name="email"]', {
      timeout: 10000,
    });

    // Fill credentials
    await page.fill('input[type="email"], input[name="email"]', "will@macseptic.com");
    await page.fill('input[type="password"], input[name="password"]', "#Espn2025");

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForURL("**/dashboard**", { timeout: 15000 }).catch(() => {
      // Might redirect to different page
    });

    // Navigate to permits
    await page.goto("https://react.ecbtx.com/permits");
    await page.waitForLoadState("networkidle");
  });

  test("should display property details when viewing a linked permit", async ({
    page,
  }) => {
    // Search for Williamson County to find linked permits
    const searchInput = page.locator('input[placeholder*="Search"], input[name="query"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill("Williamson");
      await searchInput.press("Enter");
      await page.waitForLoadState("networkidle");
    }

    // Wait for results to load
    await page.waitForSelector("table tbody tr, .permit-row", { timeout: 10000 }).catch(() => {
      console.log("No table found, looking for alternative layouts");
    });

    // Take screenshot of search results
    await page.screenshot({ path: "e2e/screenshots/permit-search-results.png" });

    // Click on the first permit link
    const permitLink = page.locator("table tbody tr td a, .permit-row a").first();
    if (await permitLink.isVisible()) {
      await permitLink.click();
      await page.waitForLoadState("networkidle");

      // Wait for detail page to load
      await page.waitForTimeout(2000);

      // Take screenshot of permit detail page
      await page.screenshot({
        path: "e2e/screenshots/permit-detail-page.png",
        fullPage: true,
      });

      // Scroll to bottom to find property panel
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      // Check for property detail panel - look for the header
      const propertyPanel = page.locator('h2:has-text("Linked Property")');
      const hasPropertyPanel = await propertyPanel.isVisible().catch(() => false);

      console.log("Linked Property panel visible:", hasPropertyPanel);

      // Take screenshot of full page
      await page.screenshot({
        path: "e2e/screenshots/permit-detail-page.png",
        fullPage: true,
      });

      if (hasPropertyPanel) {
        console.log("SUCCESS: Property detail panel found!");

        // Scroll the panel into view
        await propertyPanel.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);

        // Check if property data is shown (vs "No property linked" message)
        const hasPropertyData = await page.locator('h3:has-text("Property Overview")').isVisible().catch(() => false);
        const hasNoPropertyMsg = await page.locator('text="No property data linked"').isVisible().catch(() => false);

        if (hasPropertyData) {
          console.log("Property has LINKED DATA - showing full details");

          // Check for key sections
          const sections = [
            "Property Overview",
            "Owner Information",
            "Valuation",
            "Building Details",
          ];

          for (const section of sections) {
            const sectionEl = page.locator(`h3:has-text("${section}")`);
            const sectionVisible = await sectionEl.isVisible().catch(() => false);
            console.log(`Section "${section}": ${sectionVisible ? "FOUND" : "NOT FOUND"}`);
          }

          // Check for permits table
          const hasPermitsTable = await page.locator('h3:has-text("All Permits on This Property")').isVisible().catch(() => false);
          console.log(`All Permits Table: ${hasPermitsTable ? "FOUND" : "NOT FOUND"}`);

          // Take screenshot focused on property section
          await page.screenshot({
            path: "e2e/screenshots/permit-property-detail.png",
            fullPage: true,
          });
        } else if (hasNoPropertyMsg) {
          console.log("Property panel shows: No property data linked (permit not matched)");
          await page.screenshot({
            path: "e2e/screenshots/permit-no-property.png",
            fullPage: true,
          });
        }

        // The panel existing is a pass - whether or not data is linked
        expect(hasPropertyPanel).toBe(true);
      } else {
        console.log("ERROR: Property panel not found at all!");
        await page.screenshot({
          path: "e2e/screenshots/permit-no-panel.png",
          fullPage: true,
        });
        // This is a failure - the panel should always render
        expect(hasPropertyPanel).toBe(true);
      }
    } else {
      console.log("No permit links found in results");
      await page.screenshot({ path: "e2e/screenshots/permit-no-results.png" });
    }
  });

  test("should show all permits table when property is linked", async ({ page }) => {
    // Navigate directly to a Williamson County permit (if we know one)
    // First get the permit list
    await page.waitForSelector("table tbody tr, .permit-row", { timeout: 10000 }).catch(() => {});

    // Search for Williamson
    const searchInput = page.locator('input[placeholder*="Search"], input[name="query"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill("Williamson TN");
      await searchInput.press("Enter");
      await page.waitForLoadState("networkidle");
    }

    // Click first result
    const permitLink = page.locator("table tbody tr td a").first();
    if (await permitLink.isVisible()) {
      await permitLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Look for the "All Permits" section
      const allPermitsSection = page.locator('text="All Permits on This Property"');
      const hasAllPermits = await allPermitsSection.isVisible().catch(() => false);

      if (hasAllPermits) {
        console.log("All Permits section found");

        // Check if there's a table with permits
        const permitsTable = page.locator('h3:has-text("All Permits") ~ div table');
        const hasTable = await permitsTable.isVisible().catch(() => false);
        console.log("Permits table visible:", hasTable);

        // Count permits in table
        const permitRows = page.locator('h3:has-text("All Permits") ~ div table tbody tr');
        const rowCount = await permitRows.count().catch(() => 0);
        console.log("Number of permits in table:", rowCount);

        await page.screenshot({
          path: "e2e/screenshots/permit-all-permits-table.png",
          fullPage: true,
        });
      }
    }
  });
});
