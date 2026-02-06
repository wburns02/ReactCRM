/**
 * Marketing Tasks Page Exploration Test
 *
 * Logs in with real credentials and documents the current state
 * of the Marketing Tasks page.
 */

import { test, expect } from "@playwright/test";

test.describe("Marketing Tasks Page - Current State Exploration", () => {
  test("Login and explore Marketing Tasks page", async ({ page }) => {
    // Set up console logging
    const consoleLogs: string[] = [];
    const networkErrors: { url: string; status: number }[] = [];

    page.on("console", (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on("response", (response) => {
      if (response.status() >= 400) {
        networkErrors.push({ url: response.url(), status: response.status() });
      }
    });

    // Step 1: Navigate to login page
    console.log("Step 1: Navigating to login page...");
    await page.goto("https://react.ecbtx.com/login");
    await page.waitForLoadState("networkidle");

    // Step 2: Login with credentials
    console.log("Step 2: Logging in with will@macseptic.com...");
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');

    // Wait for login to complete (redirect to dashboard)
    await page.waitForURL("**/dashboard**", { timeout: 15000 });
    console.log("Login successful - redirected to dashboard");

    // Step 3: Navigate to Marketing Tasks page
    console.log("Step 3: Navigating to Marketing Tasks page...");
    await page.goto("https://react.ecbtx.com/marketing/tasks");
    await page.waitForLoadState("networkidle");

    // Step 4: Wait for page to load and check for loading state
    console.log("Step 4: Waiting for page content...");
    await page.waitForTimeout(3000); // Allow time for data to load

    // Step 5: Capture metrics displayed on the page
    console.log("Step 5: Capturing metrics...");

    // Look for Score Gauges (Speed Score, SEO Score)
    const speedScoreElement = page.locator("text=Speed Score").first();
    const seoScoreElement = page.locator("text=SEO Score").first();
    const keywordsElement = page.locator("text=Keywords").first();
    const pagesElement = page.locator("text=Pages Found").first();
    const contentElement = page.locator("text=Content Made").first();

    // Check if we can find metrics
    const hasSpeedScore = await speedScoreElement.isVisible().catch(() => false);
    const hasSeoScore = await seoScoreElement.isVisible().catch(() => false);
    const hasKeywords = await keywordsElement.isVisible().catch(() => false);
    const hasPages = await pagesElement.isVisible().catch(() => false);
    const hasContent = await contentElement.isVisible().catch(() => false);

    console.log("Metrics visibility:");
    console.log(`  - Speed Score: ${hasSpeedScore}`);
    console.log(`  - SEO Score: ${hasSeoScore}`);
    console.log(`  - Keywords: ${hasKeywords}`);
    console.log(`  - Pages Found: ${hasPages}`);
    console.log(`  - Content Made: ${hasContent}`);

    // Try to extract actual values
    const pageContent = await page.content();

    // Look for demo data indicator
    const hasDemoDataIndicator = pageContent.includes("Demo data") ||
                                  pageContent.includes("demoMode") ||
                                  pageContent.includes("📊 Demo");

    console.log(`Has demo data indicator: ${hasDemoDataIndicator}`);

    // Check for specific demo values (92, 23, 147, 34, 88)
    const hasValue92 = pageContent.includes(">92<") || pageContent.includes(">92</");
    const hasValue23 = pageContent.includes(">23<") || pageContent.includes(">23</") || pageContent.includes("23 /");
    const hasValue147 = pageContent.includes(">147<") || pageContent.includes(">147</") || pageContent.includes("147 /");
    const hasValue34 = pageContent.includes(">34<") || pageContent.includes(">34</") || pageContent.includes("34 /");
    const hasValue88 = pageContent.includes(">88<") || pageContent.includes(">88</");

    console.log("Demo values check:");
    console.log(`  - Speed Score 92: ${hasValue92}`);
    console.log(`  - Keywords 23: ${hasValue23}`);
    console.log(`  - Pages 147: ${hasValue147}`);
    console.log(`  - Content 34: ${hasValue34}`);
    console.log(`  - SEO Score 88: ${hasValue88}`);

    // Step 6: Check "Check Now" button on SEO Monitor
    console.log("Step 6: Looking for Check Now button...");
    const checkNowButton = page.locator("button", { hasText: "Check Now" }).first();
    const hasCheckNow = await checkNowButton.isVisible().catch(() => false);
    console.log(`Check Now button visible: ${hasCheckNow}`);

    if (hasCheckNow) {
      console.log("Clicking Check Now button...");
      await checkNowButton.click();
      await page.waitForTimeout(2000);

      // Check if anything changed
      const newPageContent = await page.content();
      const contentChanged = newPageContent !== pageContent;
      console.log(`Content changed after Check Now: ${contentChanged}`);
    }

    // Step 7: Take a screenshot
    console.log("Step 7: Taking screenshot...");
    await page.screenshot({
      path: "/home/will/marketing-tasks-current-state.png",
      fullPage: true
    });
    console.log("Screenshot saved to /home/will/marketing-tasks-current-state.png");

    // Step 8: Check network requests
    console.log("Step 8: Network errors found:");
    networkErrors.forEach((err) => {
      console.log(`  - ${err.status}: ${err.url}`);
    });

    // Step 9: Check console for warnings/errors
    console.log("Step 9: Console messages:");
    consoleLogs.filter(log => log.includes("error") || log.includes("warning"))
      .forEach((log) => {
        console.log(`  - ${log}`);
      });

    // Summary
    console.log("\n=== SUMMARY ===");
    console.log(`Page loaded: YES`);
    console.log(`Demo values present: ${hasValue92 || hasValue23 || hasValue147 || hasValue34 || hasValue88}`);
    console.log(`Demo mode indicator: ${hasDemoDataIndicator}`);
    console.log(`Network errors: ${networkErrors.length}`);

    // This test documents the state - doesn't assert anything yet
  });
});
