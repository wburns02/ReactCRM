import { test, expect } from "@playwright/test";

/**
 * Check what data permits actually have
 */
test.describe("Check Permit Data Fields", () => {
  test("inspect permit data for parcel_number and coordinates", async ({ page }) => {
    // Login
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[type="email"], input[name="email"]', "will@macseptic.com");
    await page.fill('input[type="password"], input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|permits|customers)?$/, { timeout: 15000 });

    let fullApiResponse: any = null;

    page.on("response", async (response) => {
      if (response.url().includes("/permits/search") && response.status() === 200) {
        try {
          fullApiResponse = await response.json();
        } catch (e) {}
      }
    });

    // Navigate to permits
    await page.goto("https://react.ecbtx.com/permits");
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await page.waitForTimeout(2000);

    if (fullApiResponse?.results) {
      console.log("\n========== FULL PERMIT DATA ANALYSIS ==========");
      console.log(`Total permits: ${fullApiResponse.results.length}`);

      // Check first 5 permits for all fields
      for (let i = 0; i < Math.min(5, fullApiResponse.results.length); i++) {
        const p = fullApiResponse.results[i].permit;
        console.log(`\n--- Permit ${i + 1} ---`);
        console.log(`  ID: ${p.id}`);
        console.log(`  Address: ${p.address}`);
        console.log(`  has_property: ${p.has_property}`);
        console.log(`  All fields:`, JSON.stringify(p, null, 2));
      }

      // Count permits with various data
      let withParcel = 0;
      let withCoords = 0;
      let withProperty = 0;

      for (const r of fullApiResponse.results) {
        // Note: These fields may not be in PermitSummary - they might only be in full permit
        if (r.permit.has_property === true) withProperty++;
      }

      console.log(`\n========== SUMMARY ==========`);
      console.log(`Permits with has_property=true: ${withProperty}`);
      console.log(`========================================\n`);
    }

    expect(true).toBe(true);
  });
});
