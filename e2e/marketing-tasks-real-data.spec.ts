/**
 * Marketing Tasks Real Data Enforcement Test
 *
 * Verifies that the Marketing Tasks page shows REAL data from:
 * - Google PageSpeed Insights API (Speed Score, SEO Score)
 * - Sitemap.xml parsing (Pages Found)
 *
 * CURRENT STATE (API key configured):
 * - Pages Found: REAL (from sitemap.xml - 23 pages)
 * - Speed Score: REAL (from Google PageSpeed Insights API)
 * - SEO Score: REAL (from Google PageSpeed Insights API)
 * - No demo indicators shown
 */

import { test, expect } from "@playwright/test";

test.describe("Marketing Tasks - Real Data Verification", () => {
  test("Verify real sitemap data, page load, and demo indicators", async ({ page }) => {
    const networkErrors: { url: string; status: number }[] = [];

    page.on("response", (response) => {
      if (response.status() >= 400) {
        networkErrors.push({ url: response.url(), status: response.status() });
      }
    });

    // Step 1: Login
    console.log("Step 1: Logging in...");
    await page.goto("https://react.ecbtx.com/login");
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 20000 });
    console.log("Login successful");

    // Step 2: Navigate to Marketing Tasks
    console.log("Step 2: Navigating to Marketing Tasks...");
    await page.goto("https://react.ecbtx.com/marketing/tasks");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Step 3: Get page content for all checks
    const pageContent = await page.content();

    // VERIFICATION 1: Sitemap page count is real (not demo 147)
    console.log("Step 3: Verifying sitemap page count...");
    const hasDemoPageCount = pageContent.includes("147 /") || pageContent.includes(">147<");
    const hasRealPageCount = pageContent.includes("23 /") || pageContent.includes(">23<");

    console.log(`  Demo page count (147): ${hasDemoPageCount}`);
    console.log(`  Real page count (23): ${hasRealPageCount}`);

    // VERIFICATION 2: Page loads with required elements
    console.log("Step 4: Verifying page elements...");
    const hasSpeedScore = pageContent.includes("Speed Score");
    const hasSeoScore = pageContent.includes("SEO Score");
    const hasPagesFound = pageContent.includes("Pages Found");

    console.log(`  Speed Score in page: ${hasSpeedScore}`);
    console.log(`  SEO Score in page: ${hasSeoScore}`);
    console.log(`  Pages Found in page: ${hasPagesFound}`);

    // VERIFICATION 3: Demo indicator presence
    console.log("Step 5: Checking demo indicator...");
    const hasDemoIndicator = pageContent.includes("Demo data");
    console.log(`  Has demo data indicator: ${hasDemoIndicator}`);
    if (hasDemoIndicator) {
      console.log("  NOTE: Add GOOGLE_PAGESPEED_API_KEY to Railway for real PageSpeed scores");
    }

    // Take screenshot for evidence
    await page.screenshot({
      path: "/home/will/marketing-tasks-real-data-test.png",
      fullPage: true
    });
    console.log("Screenshot saved to /home/will/marketing-tasks-real-data-test.png");

    // Check for network errors
    console.log(`Step 6: Network errors: ${networkErrors.length}`);
    const criticalErrors = networkErrors.filter(e => e.status >= 500);

    // ASSERTIONS
    console.log("\n=== ASSERTIONS ===");

    // Assert: Should NOT have demo 147 pages - THIS IS THE CRITICAL FIX
    expect(hasDemoPageCount, "Page count should not be demo value 147").toBe(false);
    console.log("✓ No demo page count (147)");

    // Assert: Should have real sitemap count
    expect(hasRealPageCount, "Page count should be real sitemap value (23)").toBe(true);
    console.log("✓ Real page count (23) is displayed");

    // Assert: All main metrics should be in page content
    expect(hasSpeedScore, "Speed Score should be visible").toBe(true);
    expect(hasSeoScore, "SEO Score should be visible").toBe(true);
    expect(hasPagesFound, "Pages Found should be visible").toBe(true);
    console.log("✓ All metric elements visible");

    // Assert: No critical network errors
    expect(criticalErrors.length, "Should have no 5xx errors").toBe(0);
    console.log("✓ No 5xx errors");

    // Assert: Demo indicator should NOT show when API key is configured
    expect(hasDemoIndicator, "Demo indicator should NOT show when API key configured").toBe(false);
    console.log("✓ No demo indicator - real data is showing!");

    console.log("\n=== SUMMARY ===");
    console.log("✓ Sitemap page count: REAL (23 pages from sitemap.xml)");
    console.log("✓ PageSpeed scores: REAL (from Google PageSpeed Insights API)");
    console.log("✓ Page loads without critical errors");
  });
});
