import { test, expect } from "@playwright/test";

/**
 * Diagnostic test to check what data the permits API returns
 * This will help understand what linked-data indicators we can show
 */
test.describe("Permits API Diagnostic", () => {
  test("inspect permits search API response", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.fill('input[type="email"], input[name="email"]', "will@macseptic.com");
    await page.fill('input[type="password"], input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|permits|customers)?$/, { timeout: 15000 });

    // Intercept the permits search API call
    let apiResponse: any = null;
    page.on("response", async (response) => {
      if (response.url().includes("/permits/search") || response.url().includes("/permits?")) {
        try {
          apiResponse = await response.json();
        } catch (e) {
          console.log("Could not parse response:", response.url());
        }
      }
    });

    // Navigate to permits page
    await page.goto("/permits");
    await page.waitForLoadState("networkidle");

    // Wait for table to load
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });

    // Wait a bit more for API to complete
    await page.waitForTimeout(2000);

    // Log the API response structure
    if (apiResponse) {
      console.log("\n=== PERMITS API RESPONSE STRUCTURE ===");
      console.log("Total results:", apiResponse.total);
      console.log("Results count:", apiResponse.results?.length);

      if (apiResponse.results && apiResponse.results.length > 0) {
        const firstResult = apiResponse.results[0];
        console.log("\n=== FIRST RESULT STRUCTURE ===");
        console.log("Keys:", Object.keys(firstResult));

        if (firstResult.permit) {
          console.log("\n=== PERMIT OBJECT FIELDS ===");
          console.log("Permit keys:", Object.keys(firstResult.permit));
          console.log("has_property:", firstResult.permit.has_property);
          console.log("property_id:", firstResult.permit.property_id);
          console.log("pdf_url:", firstResult.permit.pdf_url ? "EXISTS" : "NULL");
          console.log("permit_url:", firstResult.permit.permit_url ? "EXISTS" : "NULL");
          console.log("expiration_date:", firstResult.permit.expiration_date);
          console.log("data_quality_score:", firstResult.permit.data_quality_score);
        }

        // Count permits with various indicators
        let hasPropertyCount = 0;
        let hasPdfCount = 0;
        let hasExpirationCount = 0;

        for (const result of apiResponse.results) {
          if (result.permit.has_property) hasPropertyCount++;
          if (result.permit.pdf_url) hasPdfCount++;
          if (result.permit.expiration_date) hasExpirationCount++;
        }

        console.log("\n=== INDICATOR COUNTS (first page) ===");
        console.log(`has_property: ${hasPropertyCount}/${apiResponse.results.length}`);
        console.log(`has_pdf_url: ${hasPdfCount}/${apiResponse.results.length}`);
        console.log(`has_expiration_date: ${hasExpirationCount}/${apiResponse.results.length}`);
      }
    } else {
      console.log("No API response captured!");
    }
  });
});
