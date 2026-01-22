import { test, expect } from "@playwright/test";

/**
 * Diagnostic test to understand linked-data state
 */
test.describe("Linked Data Diagnosis", () => {
  test("analyze permits API response for has_property values", async ({ page }) => {
    // Login
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[type="email"], input[name="email"]', "will@macseptic.com");
    await page.fill('input[type="password"], input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|permits|customers)?$/, { timeout: 15000 });

    // Capture API response
    let apiResponse: any = null;
    let trueCount = 0;
    let falseCount = 0;

    page.on("response", async (response) => {
      if (response.url().includes("/permits/search") && response.status() === 200) {
        try {
          const data = await response.json();
          apiResponse = data;
          if (data.results) {
            for (const r of data.results) {
              if (r.permit.has_property === true) {
                trueCount++;
                console.log("FOUND TRUE:", r.permit.address, r.permit.permit_number);
              } else {
                falseCount++;
              }
            }
          }
        } catch (e) {
          console.log("Parse error");
        }
      }
    });

    // Navigate to permits
    await page.goto("https://react.ecbtx.com/permits");
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await page.waitForTimeout(2000);

    console.log("\n========== DIAGNOSIS RESULTS ==========");
    console.log(`Total permits checked: ${trueCount + falseCount}`);
    console.log(`has_property=TRUE: ${trueCount}`);
    console.log(`has_property=FALSE: ${falseCount}`);

    if (apiResponse?.results) {
      console.log(`\nFirst 3 permits:`);
      for (let i = 0; i < Math.min(3, apiResponse.results.length); i++) {
        const p = apiResponse.results[i].permit;
        console.log(`  ${i + 1}. ${p.address || 'No address'} - has_property: ${p.has_property}`);
      }
    }
    console.log("========================================\n");

    // Check if frontend shows linked icons
    const linkedIcons = await page.locator('[data-testid="linked-property-icon"]').count();
    const unlinkedIcons = await page.locator('[data-testid="unlinked-property-icon"]').count();

    console.log(`Frontend linked icons: ${linkedIcons}`);
    console.log(`Frontend unlinked icons: ${unlinkedIcons}`);

    // Check for any visible badge indicators
    const badges = await page.locator('[data-testid*="badge"], [class*="badge"]').count();
    console.log(`Badge elements found: ${badges}`);

    // Take screenshot for manual inspection
    await page.screenshot({ path: "e2e/screenshots/permits-diagnosis.png", fullPage: false });
    console.log("Screenshot saved to e2e/screenshots/permits-diagnosis.png");

    // Always pass - this is diagnostic
    expect(true).toBe(true);
  });

  test("check if PermitResults component renders linked icons", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[type="email"], input[name="email"]', "will@macseptic.com");
    await page.fill('input[type="password"], input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|permits|customers)?$/, { timeout: 15000 });

    await page.goto("https://react.ecbtx.com/permits");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // Wait for table
    const table = page.locator('[data-testid="permits-table"]');
    const tableVisible = await table.isVisible().catch(() => false);
    console.log("Table with data-testid='permits-table' visible:", tableVisible);

    // Check for the skeleton/loading table
    const skeleton = page.locator('[data-testid="permits-table-skeleton"]');
    const skeletonVisible = await skeleton.isVisible().catch(() => false);
    console.log("Skeleton table visible:", skeletonVisible);

    // Find ANY table
    const anyTable = page.locator("table").first();
    const anyTableVisible = await anyTable.isVisible().catch(() => false);
    console.log("Any table visible:", anyTableVisible);

    // Count rows in the visible table
    const rows = await page.locator("table tbody tr").count();
    console.log("Table rows count:", rows);

    // Look for specific icons by class or content
    const greenIcons = await page.locator('svg.text-green-600, svg[class*="green"]').count();
    const grayIcons = await page.locator('svg.text-gray-300, svg[class*="gray-3"]').count();
    console.log("Green icons:", greenIcons);
    console.log("Gray icons:", grayIcons);

    // Check if icons exist by looking for house/home SVG paths
    const houseIcons = await page.locator('svg path[d*="M3 12l2-2m0"]').count();
    console.log("House icon SVG paths:", houseIcons);

    expect(true).toBe(true);
  });
});
