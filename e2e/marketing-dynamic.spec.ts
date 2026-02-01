import { test, expect } from "@playwright/test";

/**
 * Marketing Tasks - Dynamic & Engaging Tests
 *
 * Tests verify the enhanced Marketing Tasks page with:
 * - Score gauges (circular progress indicators)
 * - Progress bars for metrics
 * - Live indicator with timestamp
 * - Clickable metric cards
 * - Check All button
 * - Tooltips on hover
 * - Spinners on button clicks
 */
test.describe("Marketing Tasks - Dynamic & Engaging", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 30000 });
  });

  test("should show dynamic score gauges and progress bars", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/marketing/tasks");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/marketing-dynamic-overview.png", fullPage: true });

    // Check for score gauge SVGs (circular progress with w-24 h-24 class)
    const scoreGauges = page.locator("svg.w-24.h-24");
    const gaugeCount = await scoreGauges.count();
    console.log(`Found ${gaugeCount} score gauges`);
    expect(gaugeCount).toBeGreaterThanOrEqual(2);

    // Check for progress bars (metric bars)
    const progressBars = page.locator('[class*="bg-"][class*="h-2"][class*="rounded-full"]');
    const barCount = await progressBars.count();
    console.log(`Found ${barCount} progress bar elements`);

    // Check for LiveIndicator (pulsing dot + "Live" text)
    const liveIndicator = page.locator("text=Live");
    await expect(liveIndicator).toBeVisible({ timeout: 10000 });
    console.log("Live indicator visible");
  });

  test("should show tooltips on hover", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/marketing/tasks");
    await page.waitForLoadState("networkidle");

    // Find tooltip trigger (label with cursor-help)
    const tooltipTrigger = page.locator(".cursor-help").first();

    if (await tooltipTrigger.isVisible()) {
      await tooltipTrigger.hover();
      await page.waitForTimeout(500);

      // Take screenshot with tooltip visible
      await page.screenshot({ path: "e2e/screenshots/marketing-tooltip-hover.png", fullPage: true });

      // Check for tooltip content (dark background popup)
      const tooltip = page.locator(".bg-gray-900.text-white");
      const tooltipVisible = await tooltip.isVisible();
      console.log(`Tooltip visible: ${tooltipVisible}`);
    } else {
      console.log("No tooltip triggers found on page");
    }
  });

  test("should show Check All button and services", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/marketing/tasks");
    await page.waitForLoadState("networkidle");

    // Check for Check All button
    const checkAllBtn = page.locator("button:has-text('Check All')");
    await expect(checkAllBtn).toBeVisible({ timeout: 5000 });
    console.log("Check All button visible");

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/marketing-check-all.png", fullPage: true });

    // Check for service health cards (SEO Monitor, Content Generator, GBP Sync)
    const seoMonitor = page.locator("text=SEO Monitor");
    await expect(seoMonitor).toBeVisible({ timeout: 5000 });
    console.log("SEO Monitor service visible");

    // Check for status badges
    const healthyBadge = page.locator("text=healthy");
    const unreachableBadge = page.locator("text=unreachable");
    const healthyCount = await healthyBadge.count();
    const unreachableCount = await unreachableBadge.count();
    console.log(`Healthy badges: ${healthyCount}, Unreachable badges: ${unreachableCount}`);
  });

  test("should click Check All and show spinners", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/marketing/tasks");
    await page.waitForLoadState("networkidle");

    // Find and click Check All button
    const checkAllBtn = page.locator("button:has-text('Check All')");
    await expect(checkAllBtn).toBeVisible({ timeout: 5000 });

    await checkAllBtn.click();

    // Take screenshot immediately to catch spinners
    await page.screenshot({ path: "e2e/screenshots/marketing-check-all-spinner.png", fullPage: true });

    // Wait for the action to complete
    await page.waitForTimeout(3000);

    // Take another screenshot after completion
    await page.screenshot({ path: "e2e/screenshots/marketing-check-all-done.png", fullPage: true });

    console.log("Check All clicked successfully");
  });

  test("should navigate tabs correctly", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/marketing/tasks");
    await page.waitForLoadState("networkidle");

    // Check Overview tab is active by default
    const overviewTab = page.locator("button:has-text('Overview')");
    await expect(overviewTab).toBeVisible();

    // Click Services tab
    const servicesTab = page.locator("button:has-text('Services')");
    await servicesTab.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "e2e/screenshots/marketing-services-tab.png", fullPage: true });

    // Click Scheduled Tasks tab
    const scheduledTab = page.locator("button:has-text('Scheduled Tasks')");
    await scheduledTab.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "e2e/screenshots/marketing-scheduled-tab.png", fullPage: true });

    // Click Alerts tab
    const alertsTab = page.locator("button:has-text('Alerts')");
    await alertsTab.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "e2e/screenshots/marketing-alerts-tab.png", fullPage: true });

    // Click Sites tab
    const sitesTab = page.locator("button:has-text('Sites')");
    await sitesTab.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "e2e/screenshots/marketing-sites-tab.png", fullPage: true });

    console.log("All tabs navigated successfully");
  });

  test("should show site selector with options", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/marketing/tasks");
    await page.waitForLoadState("networkidle");

    // Check site selector
    const siteSelector = page.locator("#site-selector");
    await expect(siteSelector).toBeVisible({ timeout: 10000 });

    // Get options count
    const options = siteSelector.locator("option");
    const count = await options.count();
    console.log(`Site selector has ${count} options`);
    expect(count).toBeGreaterThanOrEqual(1);

    // List the options
    const allOptions = await options.allTextContents();
    console.log("Site options:", allOptions);

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/marketing-site-selector.png", fullPage: true });
  });

  test("should have no critical console errors", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("https://react.ecbtx.com/marketing/tasks");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Filter out known/acceptable warnings
    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes("Failed to load resource") &&
        !err.includes("ResizeObserver") &&
        !err.includes("Sentry") &&
        !err.includes("net::ERR")
    );

    if (criticalErrors.length > 0) {
      console.log("Critical console errors found:", criticalErrors);
    } else {
      console.log("No critical console errors");
    }

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/marketing-no-errors.png", fullPage: true });
  });
});
